import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { searchTranscriptStudyByReference } from '@/lib/db';

type ExportFormat = 'pdf' | 'docx';

function normalizeFormat(value: string | null): ExportFormat {
  return value === 'docx' ? 'docx' : 'pdf';
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
}

function buildPdfBuffer(options: {
  reference: string;
  year?: number;
  doctrines: string[];
  generatedAt: string;
  items: Awaited<ReturnType<typeof searchTranscriptStudyByReference>>['items'];
}): Uint8Array {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 14;
  const contentWidth = 182;
  let y = 18;

  const addBlock = (text: string, fontSize = 10, color: [number, number, number] = [55, 55, 55], spacingAfter = 5, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      if (y > 276) {
        doc.addPage();
        y = 18;
      }
      doc.text(line, margin, y);
      y += fontSize <= 9 ? 4.5 : 5.2;
    }
    y += spacingAfter;
  };

  addBlock(`Bill Search Export — ${options.reference}`, 16, [30, 30, 30], 2, true);
  addBlock(`Generated ${options.generatedAt}`, 9, [110, 110, 110], 1);
  addBlock(
    `Filters: ${options.year ? `Year ${options.year}` : 'All years'} • ${options.doctrines.length > 0 ? options.doctrines.join(', ') : 'All doctrines'}`,
    9,
    [110, 110, 110],
    6
  );

  if (options.items.length === 0) {
    addBlock('No matching transcript entries for this filter set.', 10, [120, 120, 120], 0);
  } else {
    for (const item of options.items) {
      addBlock(item.title, 12, [32, 32, 32], 1, true);
      addBlock(
        `${item.date_preached ? new Date(item.date_preached).toLocaleDateString('en-US') : 'Date unknown'} • Primary: ${item.primary_reference || 'Not available'}`,
        8,
        [124, 124, 124],
        3
      );

      for (const occ of item.occurrences) {
        addBlock(`Paragraph: ${occ.paragraph}`, 9, [60, 60, 60], 1);
        addBlock(`Matched Reference: ${occ.matched_reference}`, 8, [166, 115, 16], 1, true);
        addBlock(`How It Was Used: ${occ.usage_context || 'No usage summary available.'}`, 8, [95, 95, 95], 3);
      }
      y += 2;
    }
  }

  return new Uint8Array(doc.output('arraybuffer'));
}

async function buildDocxBuffer(options: {
  reference: string;
  year?: number;
  doctrines: string[];
  generatedAt: string;
  items: Awaited<ReturnType<typeof searchTranscriptStudyByReference>>['items'];
}): Promise<Uint8Array> {
  const children: Paragraph[] = [
    new Paragraph({
      text: `Bill Search Export — ${options.reference}`,
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Generated ${options.generatedAt}`, color: '7A7A7A' }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Filters: ${options.year ? `Year ${options.year}` : 'All years'} • ${options.doctrines.length > 0 ? options.doctrines.join(', ') : 'All doctrines'}`,
          color: '7A7A7A',
        }),
      ],
      spacing: { after: 280 },
    }),
  ];

  if (options.items.length === 0) {
    children.push(new Paragraph({ text: 'No matching transcript entries for this filter set.' }));
  } else {
    for (const item of options.items) {
      children.push(
        new Paragraph({
          text: item.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `${item.date_preached ? new Date(item.date_preached).toLocaleDateString('en-US') : 'Date unknown'} • Primary: ${item.primary_reference || 'Not available'}`,
              color: '7A7A7A',
            }),
          ],
          spacing: { after: 160 },
        })
      );

      for (const occ of item.occurrences) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `Paragraph: ${occ.paragraph}` })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Matched Reference: ${occ.matched_reference}`, bold: true, color: 'A67310' })],
            spacing: { after: 80 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `How It Was Used: ${occ.usage_context || 'No usage summary available.'}`, color: '5F5F5F' })],
            spacing: { after: 180 },
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const book = searchParams.get('book');
  const chapter = Number(searchParams.get('chapter'));
  const verse = Number(searchParams.get('verse'));
  const yearValue = searchParams.get('year');
  const year = yearValue ? Number(yearValue) : undefined;
  const doctrines = searchParams.getAll('doctrine').filter((item) => item.trim().length > 0);
  const format = normalizeFormat(searchParams.get('format'));

  if (!book || Number.isNaN(chapter) || Number.isNaN(verse)) {
    return NextResponse.json({ error: 'book, chapter, and verse are required.' }, { status: 400 });
  }

  const reference = `${book} ${chapter}:${verse}`;
  const generatedAt = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const result = await searchTranscriptStudyByReference({
    book,
    chapter,
    verse,
    selectedDoctrines: doctrines,
    year,
    limit: 2000,
    offset: 0,
  });

  if (format === 'docx') {
    const bytes = await buildDocxBuffer({
      reference,
      year,
      doctrines,
      generatedAt,
      items: result.items,
    });

    const filename = sanitizeFilename(`${reference}-bill-search`);
    return new NextResponse(toArrayBuffer(bytes), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}.docx"`,
      },
    });
  }

  const pdfBytes = buildPdfBuffer({
    reference,
    year,
    doctrines,
    generatedAt,
    items: result.items,
  });
  const filename = sanitizeFilename(`${reference}-bill-search`);

  return new NextResponse(toArrayBuffer(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}.pdf"`,
    },
  });
}

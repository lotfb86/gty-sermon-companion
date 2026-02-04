import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import {
  searchTranscriptStudyByReference,
  searchTranscriptStudyByText,
  type TranscriptStudyMode,
  type TranscriptStudySearchResult,
  type TranscriptStudyTextMatchMode,
} from '@/lib/db';

type ExportFormat = 'pdf' | 'docx';
const EXPORT_MAX_ITEMS = 100;

function normalizeFormat(value: string | null): ExportFormat {
  return value === 'docx' ? 'docx' : 'pdf';
}

function normalizeMode(value: string | null): TranscriptStudyMode {
  return value === 'text' ? 'text' : 'scripture';
}

function normalizeTextMatchMode(value: string | null): TranscriptStudyTextMatchMode {
  return value === 'all_words' ? 'all_words' : 'exact';
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
}

function buildPdfBuffer(options: {
  queryLabel: string;
  mode: TranscriptStudyMode;
  textMatchMode?: TranscriptStudyTextMatchMode;
  years: number[];
  doctrines: string[];
  generatedAt: string;
  items: TranscriptStudySearchResult['items'];
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

  addBlock(`Bill Search Export — ${options.queryLabel}`, 16, [30, 30, 30], 2, true);
  addBlock(`Generated ${options.generatedAt}`, 9, [110, 110, 110], 1);
  addBlock(
    `Filters: ${options.years.length > 0 ? `Years ${options.years.join(', ')}` : 'All years'} • ${options.doctrines.length > 0 ? options.doctrines.join(', ') : 'All doctrines'}`,
    9,
    [110, 110, 110],
    1
  );
  if (options.mode === 'text') {
    const matchLabel = options.textMatchMode === 'all_words' ? 'All words' : 'Exact phrase';
    addBlock(`Match mode: ${matchLabel} • Export limited to top ${EXPORT_MAX_ITEMS} results`, 9, [110, 110, 110], 6);
  } else {
    addBlock(`Export limited to top ${EXPORT_MAX_ITEMS} results`, 9, [110, 110, 110], 6);
  }

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
        if (options.mode === 'scripture') {
          addBlock(`Matched Reference: ${occ.matched_reference}`, 8, [166, 115, 16], 1, true);
          addBlock(`How It Was Used: ${occ.usage_context || 'No usage summary available.'}`, 8, [95, 95, 95], 3);
        } else {
          addBlock(`Match Hits: ${occ.match_count || 1}`, 8, [166, 115, 16], 3, true);
        }
      }
      y += 2;
    }
  }

  return new Uint8Array(doc.output('arraybuffer'));
}

async function buildDocxBuffer(options: {
  queryLabel: string;
  mode: TranscriptStudyMode;
  textMatchMode?: TranscriptStudyTextMatchMode;
  years: number[];
  doctrines: string[];
  generatedAt: string;
  items: TranscriptStudySearchResult['items'];
}): Promise<Uint8Array> {
  const children: Paragraph[] = [
    new Paragraph({
      text: `Bill Search Export — ${options.queryLabel}`,
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
          text: `Filters: ${options.years.length > 0 ? `Years ${options.years.join(', ')}` : 'All years'} • ${options.doctrines.length > 0 ? options.doctrines.join(', ') : 'All doctrines'}`,
          color: '7A7A7A',
        }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: options.mode === 'text'
            ? `Match mode: ${options.textMatchMode === 'all_words' ? 'All words' : 'Exact phrase'} • Export limited to top ${EXPORT_MAX_ITEMS} results`
            : `Export limited to top ${EXPORT_MAX_ITEMS} results`,
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
        children.push(new Paragraph({
          children: [new TextRun({ text: `Paragraph: ${occ.paragraph}` })],
          spacing: { after: 100 },
        }));

        if (options.mode === 'scripture') {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `Matched Reference: ${occ.matched_reference}`, bold: true, color: 'A67310' })],
              spacing: { after: 80 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `How It Was Used: ${occ.usage_context || 'No usage summary available.'}`, color: '5F5F5F' })],
              spacing: { after: 180 },
            })
          );
        } else {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `Match Hits: ${occ.match_count || 1}`, bold: true, color: 'A67310' })],
              spacing: { after: 180 },
            })
          );
        }
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

  const mode = normalizeMode(searchParams.get('mode'));
  const book = searchParams.get('book');
  const chapter = Number(searchParams.get('chapter'));
  const verse = Number(searchParams.get('verse'));
  const textQuery = (searchParams.get('q') || '').trim();
  const textMatchMode = normalizeTextMatchMode(searchParams.get('match'));
  const selectedYears = searchParams
    .getAll('year')
    .map((value) => parseInt(value, 10))
    .filter((value) => !Number.isNaN(value));
  const doctrines = searchParams.getAll('doctrine').filter((item) => item.trim().length > 0);
  const format = normalizeFormat(searchParams.get('format'));
  const reference = mode === 'text' ? textQuery : `${book} ${chapter}:${verse}`;
  const generatedAt = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  let result: TranscriptStudySearchResult;
  if (mode === 'text') {
    if (!textQuery) {
      return NextResponse.json({ error: 'q is required when mode=text.' }, { status: 400 });
    }

    result = await searchTranscriptStudyByText({
      query: textQuery,
      matchMode: textMatchMode,
      selectedDoctrines: doctrines,
      selectedYears,
      limit: EXPORT_MAX_ITEMS,
      offset: 0,
    });
  } else {
    if (!book || Number.isNaN(chapter) || Number.isNaN(verse)) {
      return NextResponse.json({ error: 'book, chapter, and verse are required.' }, { status: 400 });
    }

    result = await searchTranscriptStudyByReference({
      book,
      chapter,
      verse,
      selectedDoctrines: doctrines,
      selectedYears,
      limit: EXPORT_MAX_ITEMS,
      offset: 0,
    });
  }

  if (format === 'docx') {
    const bytes = await buildDocxBuffer({
      queryLabel: reference,
      mode,
      textMatchMode,
      years: selectedYears,
      doctrines,
      generatedAt,
      items: result.items,
    });

    const filename = sanitizeFilename(`${reference}-bill-search-export`);
    return new NextResponse(toArrayBuffer(bytes), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}.docx"`,
      },
    });
  }

  const pdfBytes = buildPdfBuffer({
    queryLabel: reference,
    mode,
    textMatchMode,
    years: selectedYears,
    doctrines,
    generatedAt,
    items: result.items,
  });
  const filename = sanitizeFilename(`${reference}-bill-search-export`);

  return new NextResponse(toArrayBuffer(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}.pdf"`,
    },
  });
}

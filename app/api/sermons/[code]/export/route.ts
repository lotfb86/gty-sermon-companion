import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { getSermonByCode } from '@/lib/db';
import { cleanTranscriptText, extractTranscriptParagraphs } from '@/lib/transcript-export';

type ExportFormat = 'pdf' | 'docx';
type ExportScope = 'full' | 'highlights';

function normalizeFormat(value: string | null): ExportFormat {
  return value === 'docx' ? 'docx' : 'pdf';
}

function normalizeScope(value: string | null): ExportScope {
  return value === 'highlights' ? 'highlights' : 'full';
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function paragraphToRuns(paragraph: string, terms: string[]): TextRun[] {
  if (terms.length === 0) {
    return [new TextRun(paragraph)];
  }

  const sortedTerms = [...terms].sort((a, b) => b.length - a.length);
  const regex = new RegExp(`(${sortedTerms.map(escapeRegex).join('|')})`, 'gi');
  const runs: TextRun[] = [];

  let lastIndex = 0;
  let match = regex.exec(paragraph);
  while (match) {
    if (match.index > lastIndex) {
      runs.push(new TextRun(paragraph.slice(lastIndex, match.index)));
    }
    runs.push(
      new TextRun({
        text: match[0],
        bold: true,
        color: 'A67310',
      })
    );
    lastIndex = match.index + match[0].length;
    match = regex.exec(paragraph);
  }

  if (lastIndex < paragraph.length) {
    runs.push(new TextRun(paragraph.slice(lastIndex)));
  }

  return runs.length > 0 ? runs : [new TextRun(paragraph)];
}

function renderPdfLineWithHighlights(
  doc: jsPDF,
  line: string,
  x: number,
  y: number,
  terms: string[]
): void {
  if (terms.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 55, 55);
    doc.text(line, x, y);
    return;
  }

  const sortedTerms = [...terms].sort((a, b) => b.length - a.length);
  const regex = new RegExp(`(${sortedTerms.map(escapeRegex).join('|')})`, 'gi');
  let lastIndex = 0;
  let cursorX = x;
  let match = regex.exec(line);

  while (match) {
    if (match.index > lastIndex) {
      const plainText = line.slice(lastIndex, match.index);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 55, 55);
      doc.text(plainText, cursorX, y);
      cursorX += doc.getTextWidth(plainText);
    }

    const highlighted = match[0];
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(166, 115, 16);
    doc.text(highlighted, cursorX, y);
    cursorX += doc.getTextWidth(highlighted);

    lastIndex = match.index + highlighted.length;
    match = regex.exec(line);
  }

  if (lastIndex < line.length) {
    const tail = line.slice(lastIndex);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 55, 55);
    doc.text(tail, cursorX, y);
  }
}

function buildPdfBuffer(options: {
  title: string;
  subtitle: string;
  paragraphs: string[];
  terms: string[];
  isHighlighted: boolean;
}): Uint8Array {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 15;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  const titleLines = doc.splitTextToSize(options.title, contentWidth);
  for (const line of titleLines) {
    doc.text(line, margin, y);
    y += 8;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  const subtitleLines = doc.splitTextToSize(options.subtitle, contentWidth);
  for (const line of subtitleLines) {
    doc.text(line, margin, y);
    y += 5;
  }
  y += 2;

  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  if (options.paragraphs.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text('No matching transcript paragraphs were found for this search term.', margin, y);
  } else {
    doc.setFontSize(10);
    for (const paragraph of options.paragraphs) {
      const lines = doc.splitTextToSize(paragraph, contentWidth);
      for (const line of lines) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        renderPdfLineWithHighlights(doc, line, margin, y, options.isHighlighted ? options.terms : []);
        y += 5;
      }
      y += 3;
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(170, 170, 170);
    const footerLeft = options.isHighlighted
      ? `GTY Sermon Companion — Highlighted Transcript Export (${options.terms.join(', ')})`
      : 'GTY Sermon Companion — Transcript Export';
    doc.text(footerLeft, margin, 287);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, 287);
  }

  return new Uint8Array(doc.output('arraybuffer'));
}

async function buildDocxBuffer(options: {
  title: string;
  subtitle: string;
  paragraphs: string[];
  terms: string[];
}): Promise<Uint8Array> {
  const children: Paragraph[] = [
    new Paragraph({
      text: options.title,
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [new TextRun({ text: options.subtitle, color: '6F6F6F' })],
      spacing: { after: 240 },
    }),
  ];

  if (options.paragraphs.length === 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'No matching transcript paragraphs were found for this search term.', italics: true })],
      })
    );
  } else {
    for (const paragraph of options.paragraphs) {
      children.push(
        new Paragraph({
          children: paragraphToRuns(paragraph, options.terms),
          spacing: { after: 220 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const sermon = await getSermonByCode(code);

  if (!sermon) {
    return NextResponse.json({ error: 'Sermon not found' }, { status: 404 });
  }

  const format = normalizeFormat(request.nextUrl.searchParams.get('format'));
  const scope = normalizeScope(request.nextUrl.searchParams.get('scope'));
  const query = (request.nextUrl.searchParams.get('q') || '').trim();

  if (scope === 'highlights' && !query) {
    return NextResponse.json(
      { error: 'A search query is required for highlighted paragraph exports.' },
      { status: 400 }
    );
  }

  const cleaned = cleanTranscriptText(sermon.transcript_text || '');
  const extracted = extractTranscriptParagraphs(cleaned, scope === 'highlights' ? query : undefined);
  const dateText = sermon.date_preached
    ? new Date(sermon.date_preached).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';
  const subtitle = [
    sermon.sermon_code ? `Code: ${sermon.sermon_code}` : null,
    sermon.verse || null,
    dateText || null,
    scope === 'highlights' ? `Highlights for: "${query}"` : 'Full Transcript',
  ]
    .filter(Boolean)
    .join('  |  ');

  const baseFilename = sanitizeFilename(`${sermon.title}-${scope === 'highlights' ? 'highlighted-transcript' : 'full-transcript'}`);
  const extension = format === 'docx' ? 'docx' : 'pdf';
  const filename = `${baseFilename}.${extension}`;

  if (format === 'pdf') {
    const buffer = buildPdfBuffer({
      title: sermon.title,
      subtitle,
      paragraphs: extracted.paragraphs,
      terms: extracted.terms,
      isHighlighted: scope === 'highlights',
    });

    return new NextResponse(new Blob([toArrayBuffer(buffer)]), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  const buffer = await buildDocxBuffer({
    title: sermon.title,
    subtitle,
    paragraphs: extracted.paragraphs,
    terms: extracted.terms,
  });

  return new NextResponse(new Blob([toArrayBuffer(buffer)]), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

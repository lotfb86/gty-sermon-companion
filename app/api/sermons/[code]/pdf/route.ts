import { NextResponse } from 'next/server';
import { getSermonByCode } from '@/lib/db';
import jsPDF from 'jspdf';

// Helper: wrap text to fit within a width and return lines
function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

// Helper: add text with page break handling
function addText(
  doc: jsPDF,
  text: string | string[],
  x: number,
  y: number,
  options: { maxWidth?: number; fontSize?: number; fontStyle?: string; color?: [number, number, number] } = {}
): number {
  const { fontSize = 10, fontStyle = 'normal', color = [51, 51, 51] } = options;
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', fontStyle);
  doc.setTextColor(...color);

  const lines = Array.isArray(text) ? text : [text];
  const lineHeight = fontSize * 0.5;
  let currentY = y;

  for (const line of lines) {
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }
    doc.text(line, x, currentY);
    currentY += lineHeight;
  }

  return currentY;
}

// Helper: add a section header
function addSectionHeader(doc: jsPDF, title: string, y: number): number {
  if (y > 250) {
    doc.addPage();
    y = 20;
  }
  y += 4;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(15, y, 195, y);
  y += 6;
  y = addText(doc, title.toUpperCase(), 15, y, { fontSize: 11, fontStyle: 'bold', color: [50, 50, 50] });
  y += 2;
  return y;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const sermon = await getSermonByCode(code);

  if (!sermon) {
    return NextResponse.json({ error: 'Sermon not found' }, { status: 404 });
  }

  let metadata: any = null;
  try {
    metadata = sermon.llm_metadata ? JSON.parse(sermon.llm_metadata) : null;
  } catch (e) {
    // ignore
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 15;

  // ===== TITLE SECTION =====
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  const titleLines = wrapText(doc, sermon.title, contentWidth);
  for (const line of titleLines) {
    doc.text(line, margin, y);
    y += 8;
  }

  // Scripture reference
  if (sermon.verse) {
    y += 1;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 120, 40);
    doc.text(sermon.verse, margin, y);
    y += 6;
  }

  // Date and sermon code
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  const metaLine = [
    sermon.date_preached ? new Date(sermon.date_preached).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null,
    sermon.sermon_code ? `Code: ${sermon.sermon_code}` : null,
    metadata?.summary?.sermon_type || null,
  ].filter(Boolean).join('  |  ');
  doc.text(metaLine, margin, y);
  y += 4;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ===== MAIN THEME =====
  if (metadata?.summary?.main_theme) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 80, 30);
    const themeLines = wrapText(doc, metadata.summary.main_theme, contentWidth);
    y = addText(doc, themeLines, margin, y, { fontSize: 11, fontStyle: 'italic', color: [100, 80, 30] });
    y += 3;
  }

  // ===== SUMMARY =====
  const summaryText = typeof metadata?.summary === 'string'
    ? metadata.summary
    : metadata?.summary?.detailed || metadata?.summary?.brief || sermon.description;

  if (summaryText) {
    y = addSectionHeader(doc, 'Summary', y);
    const summaryLines = wrapText(doc, summaryText, contentWidth);
    y = addText(doc, summaryLines, margin, y);
    y += 3;
  }

  // ===== SERMON OUTLINE =====
  if (metadata?.structure?.main_points && metadata.structure.main_points.length > 0) {
    y = addSectionHeader(doc, 'Sermon Outline', y);

    for (const point of metadata.structure.main_points) {
      if (y > 260) { doc.addPage(); y = 20; }

      // Point number and title
      const pointTitle = `${point.number}. ${point.title}`;
      const pointTitleLines = wrapText(doc, pointTitle, contentWidth - 5);
      y = addText(doc, pointTitleLines, margin, y, { fontSize: 10, fontStyle: 'bold', color: [30, 30, 30] });

      // Verses
      if (point.verses && point.verses.length > 0) {
        const versesStr = point.verses.join(', ');
        y = addText(doc, versesStr, margin + 5, y, { fontSize: 8, fontStyle: 'italic', color: [150, 120, 40] });
      }

      // Description
      if (point.description) {
        const descLines = wrapText(doc, point.description, contentWidth - 10);
        y = addText(doc, descLines, margin + 5, y, { fontSize: 9, color: [80, 80, 80] });
      }

      y += 2;
    }
  }

  // ===== SCRIPTURE REFERENCES =====
  if (metadata?.scripture?.all_references && metadata.scripture.all_references.length > 0) {
    y = addSectionHeader(doc, 'Scripture References', y);

    if (metadata.scripture.primary_passage?.reference) {
      y = addText(doc, `Primary Passage: ${metadata.scripture.primary_passage.reference}`, margin, y, {
        fontSize: 10, fontStyle: 'bold', color: [100, 80, 30]
      });
      y += 2;
    }

    for (const ref of metadata.scripture.all_references) {
      if (y > 265) { doc.addPage(); y = 20; }
      let refLine = `• ${ref.reference}`;
      if (ref.context) refLine += ` — ${ref.context}`;
      const refLines = wrapText(doc, refLine, contentWidth - 5);
      y = addText(doc, refLines, margin + 3, y, { fontSize: 9, color: [60, 60, 60] });
    }
    y += 2;
  }

  // ===== NOTABLE QUOTES =====
  if (metadata?.notable_quotes && metadata.notable_quotes.length > 0) {
    y = addSectionHeader(doc, 'Notable Quotes', y);

    for (const q of metadata.notable_quotes) {
      if (y > 255) { doc.addPage(); y = 20; }

      // Gold left bar
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(1);
      doc.line(margin, y - 1, margin, y + 6);

      const quoteText = `"${q.quote}"`;
      const quoteLines = wrapText(doc, quoteText, contentWidth - 10);
      y = addText(doc, quoteLines, margin + 5, y, { fontSize: 9, fontStyle: 'italic', color: [40, 40, 40] });

      if (q.context) {
        y = addText(doc, `— ${q.context}`, margin + 5, y, { fontSize: 8, color: [120, 120, 120] });
      }
      y += 3;
    }
  }

  // ===== PRACTICAL APPLICATIONS =====
  if (metadata?.practical?.life_applications && metadata.practical.life_applications.length > 0) {
    y = addSectionHeader(doc, 'Life Applications', y);

    for (const app of metadata.practical.life_applications) {
      if (y > 265) { doc.addPage(); y = 20; }
      const appLines = wrapText(doc, `✓ ${app}`, contentWidth - 5);
      y = addText(doc, appLines, margin + 3, y, { fontSize: 9, color: [50, 50, 50] });
    }
    y += 2;
  }

  // ===== DISCUSSION QUESTIONS =====
  if (metadata?.practical?.questions_addressed && metadata.practical.questions_addressed.length > 0) {
    y = addSectionHeader(doc, 'Discussion Questions', y);

    for (let i = 0; i < metadata.practical.questions_addressed.length; i++) {
      if (y > 265) { doc.addPage(); y = 20; }
      const qLines = wrapText(doc, `${i + 1}. ${metadata.practical.questions_addressed[i]}`, contentWidth - 5);
      y = addText(doc, qLines, margin + 3, y, { fontSize: 9, color: [50, 50, 50] });
    }
    y += 2;
  }

  // ===== DOCTRINE =====
  if (metadata?.doctrine?.key_doctrines_defended && metadata.doctrine.key_doctrines_defended.length > 0) {
    y = addSectionHeader(doc, 'Key Doctrines', y);

    for (const doctrine of metadata.doctrine.key_doctrines_defended) {
      if (y > 265) { doc.addPage(); y = 20; }
      const dLines = wrapText(doc, `• ${doctrine}`, contentWidth - 5);
      y = addText(doc, dLines, margin + 3, y, { fontSize: 9, color: [50, 50, 50] });
    }
    y += 2;
  }

  // ===== EXTERNAL REFERENCES =====
  const hasAuthors = metadata?.external_references?.authors_quoted?.length > 0;
  const hasBooks = metadata?.external_references?.books_referenced?.length > 0;

  if (hasAuthors || hasBooks) {
    y = addSectionHeader(doc, 'References & Sources', y);

    if (hasAuthors) {
      for (const author of metadata.external_references.authors_quoted) {
        if (y > 260) { doc.addPage(); y = 20; }
        let authorLine = `• ${author.name}`;
        if (author.work) authorLine += ` — ${author.work}`;
        const authorLines = wrapText(doc, authorLine, contentWidth - 5);
        y = addText(doc, authorLines, margin + 3, y, { fontSize: 9, fontStyle: 'bold', color: [50, 50, 50] });

        if (author.quote) {
          const ql = wrapText(doc, `"${author.quote}"`, contentWidth - 15);
          y = addText(doc, ql, margin + 8, y, { fontSize: 8, fontStyle: 'italic', color: [80, 80, 80] });
        }
        y += 1;
      }
    }

    if (hasBooks) {
      y = addText(doc, 'Books Referenced:', margin, y, { fontSize: 9, fontStyle: 'bold', color: [80, 80, 80] });
      for (const book of metadata.external_references.books_referenced) {
        if (y > 265) { doc.addPage(); y = 20; }
        let bookLine = `• ${book.title}`;
        if (book.author) bookLine += ` by ${book.author}`;
        y = addText(doc, bookLine, margin + 3, y, { fontSize: 9, fontStyle: 'italic', color: [60, 60, 60] });
      }
    }
    y += 2;
  }

  // ===== TRANSCRIPT =====
  if (sermon.transcript_text) {
    y = addSectionHeader(doc, 'Full Transcript', y);

    // Clean the transcript (same logic as the page)
    let text = sermon.transcript_text;
    const junkPatterns = [
      /^.*?(VIDEO SERMON|AUDIO SERMON).*$/gim,
      /^(WATCH NOW|ADD TO WATCHLIST|SHARE|DOWNLOAD|TRANSCRIPT|PRINT|SERMONS ARCHIVE|RESET|CD|DVD|MP3|MP4)\s*$/gim,
      /^[A-Z]\s*$/gm,
    ];
    for (const pattern of junkPatterns) {
      text = text.replace(pattern, '');
    }
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    let startIdx = 0;
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const line = lines[i].trim();
      if (line.length > 60 && /[a-z]/.test(line) && /[.,:;]/.test(line)) {
        startIdx = i;
        break;
      }
    }
    text = lines.slice(startIdx).join('\n').replace(/\n{3,}/g, '\n\n').trim();

    // Split into paragraphs and render
    const paragraphs = text.split('\n\n');
    for (const para of paragraphs) {
      if (y > 265) { doc.addPage(); y = 20; }
      const paraLines = wrapText(doc, para.replace(/\n/g, ' '), contentWidth);
      y = addText(doc, paraLines, margin, y, { fontSize: 9, color: [60, 60, 60] });
      y += 2;
    }
  }

  // ===== FOOTER ON EACH PAGE =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(170, 170, 170);
    doc.text(`GTY Sermon Companion — Study Guide`, margin, 287);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, 287);
  }

  // Generate PDF buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  const safeTitle = sermon.title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeTitle}-Study-Guide.pdf"`,
    },
  });
}

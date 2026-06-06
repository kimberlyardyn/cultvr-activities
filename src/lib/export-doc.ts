/**
 * Export a simple structured document (title + sections of heading/body text)
 * as either a PDF (jsPDF) or a Word .docx (docx). Both trigger a download.
 *
 * Body text is plain text; newlines become separate paragraphs/lines so the
 * user's edits in the preview carry through verbatim.
 */
import { jsPDF } from "jspdf";

export type DocSection = { heading: string; body: string };

const PAGE_W = 595; // A4 pt
const PAGE_H = 842;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeName(name: string) {
  return name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

export function exportAsPdf(title: string, sections: DocSection[], filename: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = MARGIN;

  const writeLine = (
    text: string,
    opts: { size: number; bold?: boolean; gapAfter?: number; color?: [number, number, number] },
  ) => {
    const { size, bold = false, gapAfter = 0, color = [31, 36, 51] } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
    const lh = size * 1.4;
    for (const line of lines) {
      if (y + lh > PAGE_H - MARGIN) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(line, MARGIN, y);
      y += lh;
    }
    y += gapAfter;
  };

  writeLine(title, { size: 20, bold: true, gapAfter: 10 });

  for (const section of sections) {
    if (section.heading) writeLine(section.heading, { size: 13, bold: true, gapAfter: 2 });
    for (const para of section.body.split(/\n/)) {
      if (para.trim() === "") {
        y += 6;
      } else {
        writeLine(para, { size: 10.5 });
      }
    }
    y += 12;
  }

  doc.save(`${safeName(filename)}.pdf`);
}

export async function exportAsDocx(
  title: string,
  sections: DocSection[],
  filename: string,
) {
  // Dynamic import keeps the (sizable) docx lib out of the initial bundle.
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: title, bold: true, size: 40 })],
    }),
    new Paragraph({ text: "" }),
  ];

  for (const section of sections) {
    if (section.heading) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: section.heading, bold: true })],
        }),
      );
    }
    for (const para of section.body.split(/\n/)) {
      children.push(new Paragraph({ children: [new TextRun({ text: para })] }));
    }
    children.push(new Paragraph({ text: "" }));
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${safeName(filename)}.docx`);
}

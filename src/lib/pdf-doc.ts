/**
 * Lightweight text-based PDF builder using jsPDF.
 *
 * We deliberately do NOT screenshot the DOM (html2canvas can't parse Tailwind
 * v4's oklch() colors). Instead we render structured text directly, which makes
 * a clean, selectable, multi-page PDF and triggers a real file download — no
 * browser print dialog.
 */
import { jsPDF } from "jspdf";

const MARGIN = 48; // pt
const PAGE_W = 595; // A4 width in pt
const PAGE_H = 842; // A4 height in pt
const CONTENT_W = PAGE_W - MARGIN * 2;
const LINE = 15;

type Block =
  | { type: "title"; text: string }
  | { type: "subtitle"; text: string }
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  | { type: "body"; text: string }
  | { type: "muted"; text: string }
  | { type: "bullet"; text: string }
  | { type: "rule" }
  | { type: "space"; size?: number };

export class PdfDoc {
  private doc: jsPDF;
  private y: number;

  constructor() {
    this.doc = new jsPDF({ unit: "pt", format: "a4" });
    this.y = MARGIN;
  }

  private ensureSpace(needed: number) {
    if (this.y + needed > PAGE_H - MARGIN) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  private write(
    text: string,
    opts: { size: number; style?: "normal" | "bold" | "italic"; color?: [number, number, number]; indent?: number },
  ) {
    const { size, style = "normal", color = [31, 36, 51], indent = 0 } = opts;
    this.doc.setFont("helvetica", style);
    this.doc.setFontSize(size);
    this.doc.setTextColor(color[0], color[1], color[2]);
    const lines = this.doc.splitTextToSize(text, CONTENT_W - indent) as string[];
    const lineHeight = size * 1.35;
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.doc.text(line, MARGIN + indent, this.y);
      this.y += lineHeight;
    }
  }

  add(block: Block): this {
    switch (block.type) {
      case "title":
        this.write(block.text, { size: 22, style: "bold" });
        this.y += 4;
        break;
      case "subtitle":
        this.write(block.text, { size: 10, color: [120, 128, 145] });
        this.y += 6;
        break;
      case "heading":
        this.y += 10;
        this.write(block.text, { size: 15, style: "bold" });
        this.y += 2;
        break;
      case "subheading":
        this.y += 4;
        this.write(block.text, { size: 12, style: "bold", color: [63, 74, 102] });
        break;
      case "body":
        this.write(block.text, { size: 10.5 });
        break;
      case "muted":
        this.write(block.text, { size: 9.5, color: [120, 128, 145] });
        break;
      case "bullet":
        this.write(`•  ${block.text}`, { size: 10.5, indent: 8 });
        break;
      case "rule":
        this.ensureSpace(LINE);
        this.doc.setDrawColor(220, 220, 224);
        this.doc.line(MARGIN, this.y, PAGE_W - MARGIN, this.y);
        this.y += 8;
        break;
      case "space":
        this.y += block.size ?? LINE;
        break;
    }
    return this;
  }

  save(filename: string) {
    this.doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  }
}

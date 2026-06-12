/**
 * docxExporter — konversi report object ({ title, intro, sections[] }) ke file .docx
 * menggunakan npm package 'docx'.
 *
 * Usage:
 *   import { reportToDocx, downloadDocx } from '../lib/docxExporter'
 *   const blob = await reportToDocx(report)
 *   downloadDocx(blob, 'Bab4-Hasil-Penelitian.docx')
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, HeadingLevel, TableLayoutType
} from 'docx'

const FONT = 'Times New Roman'
const SIZE_BODY = 24  // half-points → 12pt
const SIZE_H1 = 28     // 14pt
const SIZE_H2 = 26     // 13pt
const SIZE_CAPTION = 22 // 11pt
const SIZE_TABLE = 22   // 11pt

/** Border style konsisten untuk tabel */
const thinBorder = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: '000000',
}

const cellBorders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
}

/**
 * Build a single justified paragraph with optional first-line indent.
 */
function para(text, { indent = true, bold = false, size = SIZE_BODY, spacing = 150 } = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: indent ? { firstLine: 720 } : undefined, // ~1.27cm = 720 twips
    spacing: { after: spacing },
    children: [
      new TextRun({
        text,
        font: FONT,
        size,
        bold,
      }),
    ],
  })
}

/**
 * Build heading paragraph.
 */
function heading(text, level = HeadingLevel.HEADING_2) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: level === HeadingLevel.HEADING_1 ? SIZE_H1 : SIZE_H2,
        bold: true,
      }),
    ],
  })
}

/**
 * Build table caption paragraph (centered, italic feel via smaller size).
 */
function caption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: SIZE_CAPTION,
        bold: true,
      }),
    ],
  })
}

/**
 * Build a docx Table from { headers, rows }.
 */
function buildTable({ headers, rows }) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h =>
      new TableCell({
        borders: cellBorders,
        width: { size: Math.max(1500, 9000 / headers.length), type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: h, font: FONT, size: SIZE_TABLE, bold: true })],
          }),
        ],
      })
    ),
  })

  const dataRows = rows.map(row =>
    new TableRow({
      children: row.map((cell, ci) =>
        new TableCell({
          borders: cellBorders,
          children: [
            new Paragraph({
              alignment: ci === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
              children: [new TextRun({ text: String(cell), font: FONT, size: SIZE_TABLE })],
            }),
          ],
        })
      ),
    })
  )

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.AUTOFIT,
  })
}

/**
 * Convert report object to docx blob.
 * @param {{ title: string, intro: string, sections: Array<{ title: string, paragraphs: string[], tables: Array<{ caption: string, headers: string[], rows: string[][] }> }> }} report
 * @returns {Promise<Blob>}
 */
export async function reportToDocx(report) {
  const children = []

  // Title page heading
  children.push(heading(report.title, HeadingLevel.HEADING_1))

  // Intro paragraph
  if (report.intro) {
    children.push(para(report.intro))
  }

  // Sections
  report.sections.forEach((sec, secIdx) => {
    children.push(heading(sec.title, HeadingLevel.HEADING_2))

    sec.paragraphs.forEach(p => {
      children.push(para(p))
    })

    sec.tables.forEach(t => {
      children.push(caption(t.caption))
      children.push(buildTable(t))
      // white space after table
      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }))
    })
  })

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE_BODY },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 720, bottom: 720, left: 1080, right: 1080 }, // twips: ~2.54cm left+right, ~2.54cm top+bottom
        },
      },
      children,
    }],
  })

  return await Packer.toBlob(doc)
}

/**
 * Trigger browser download of a blob as a file.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadDocx(blob, filename = 'Bab4-Hasil-Penelitian.docx') {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

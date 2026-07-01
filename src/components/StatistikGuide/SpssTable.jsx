import { useMemo } from 'react'
import { fmt } from './spssTableData'
import styles from './StatistikGuide.module.css'

// ============================================================
// SpssTable — render mockup tabel output SPSS dari struktur data.
//
// Struktur data (lihat spssTableData.js):
//   { title, headerRows: 1-2 rows, rows: [[...]], notes: [...] }
//
// Header 2-row (grouped): row 1 = group labels (colSpan), row 2 = column labels.
// Header 1-row (simple): row 1 = column labels.
//
// Numeric columns di-deteksi otomatis dari data (column is numeric if
// ANY cell is a number) — angka right-aligned + tabular-nums, teks left.
// Empty string di kolom numeric ikut right-align (match SPSS).
//
// Visual: horizontal rules only (no vertical borders), header shaded,
// title bold left, footnotes italic. Warna theme tokens — scholarly ivory.
// ============================================================
export default function SpssTable({ data }) {
  const { title, headerRows = [], rows = [], notes = [] } = data

  // Detect numeric columns: scan data, a column is numeric if any cell is a number.
  const numericCols = useMemo(() => {
    if (!rows.length) return []
    const cols = rows[0].length
    return Array.from({ length: cols }, (_, c) =>
      rows.some(row => typeof row[c] === 'number')
    )
  }, [rows])

  const colCount = rows[0]?.length || headerRows[headerRows.length - 1]?.length || 0

  return (
    <div className={styles.spssTableWrap}>
      <table className={styles.spssTable}>
        <caption className={styles.spssTableTitle}>{title}</caption>
        <thead>
          {headerRows.map((hRow, ri) => (
            <tr key={ri} className={ri === headerRows.length - 1 ? styles.spssTableColHead : styles.spssTableGroupHead}>
              {hRow.map((cell, ci) => (
                <th
                  key={ci}
                  colSpan={cell.colSpan}
                  className={numericCols[ci] != null && ri === headerRows.length - 1 && numericCols[ci] ? styles.spssThNum : styles.spssTh}
                >
                  {cell.label}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={numericCols[ci] ? styles.spssTdNum : styles.spssTd}
                >
                  {fmt(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {notes.length > 0 && (
        <div className={styles.spssTableNotes}>
          {notes.map((n, i) => <div key={i}>{n}</div>)}
        </div>
      )}
    </div>
  )
}

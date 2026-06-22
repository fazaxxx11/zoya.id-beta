// messyDataPreprocessor.js
// Pre-processing pipeline untuk data messy khas mahasiswa Indonesia:
// merged cells, multi-level headers, summary rows, missing codes,
// Indonesian number format, non-data columns, trailing notes.
//
// Semua fungsi pure — tidak ada side effect. Output bisa diapply
// ke data sebelum masuk ke DataCleanerModal.

// =====================================================================
// 1. MISSING VALUE CODE NORMALIZATION
// =====================================================================
const MISSING_CODES = new Set([
  '-', '—', '–', '−',
  'NA', 'N/A', 'na', 'n/a', 'N.A',
  'NULL', 'null', 'Null',
  'NONE', 'none', 'None',
  '.', '..', '...',
  'kosong', 'KOSONG',
  'tidak ada', 'TIDAK ADA',
  '', ' ',
])

export function isMissingCode(val) {
  if (val === null || val === undefined || val === '') return true
  const s = String(val).trim()
  return MISSING_CODES.has(s)
}

export function normalizeMissing(values) {
  return values.map(v => isMissingCode(v) ? null : v)
}

// =====================================================================
// 2. INDONESIAN NUMBER FORMAT PARSING
// =====================================================================
// "1.234,56" → 1234.56
// "1,234.56" → 1234.56 (English format juga didetect)
export function parseNumber(val) {
  if (val === null || val === undefined) return null
  if (typeof val === 'number' && isFinite(val)) return val

  const s = String(val).trim()
  if (s === '') return null

  // Already a clean number
  const n = Number(s)
  if (!isNaN(n)) return n

  // Try Indonesian format: dots as thousands, comma as decimal
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s)) {
    return Number(s.replace(/\./g, '').replace(',', '.'))
  }

  // Try English format: commas as thousands, dot as decimal
  if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(s)) {
    return Number(s.replace(/,/g, ''))
  }

  // Try single comma as decimal
  if (/^\d+,\d+$/.test(s)) {
    return Number(s.replace(',', '.'))
  }

  // Remove any non-numeric except dots and commas, then try
  const cleaned = s.replace(/[^\d.,\-]/g, '')
  if (cleaned === '') return null
  const n2 = Number(cleaned.replace(',', '.'))
  return isNaN(n2) ? null : n2
}

// =====================================================================
// 3. NON-DATA COLUMN DETECTION
// =====================================================================
const NON_DATA_PATTERNS = [
  /^no$/i, /^no\.?$/i, /^nomor$/i, /^number$/i,
  /^nama$/i, /^name$/i, /^responden$/i, /^subjek$/i,
  /^id$/i, /^kode$/i, /^inisial$/i,
  /^kelas$/i, /^sekolah$/i, /^jurusan$/i,
  /^tanggal$/i, /^waktu$/i, /^timestamp$/i,
]

export function detectNonDataColumns(columns) {
  const nonData = []
  const data = []
  for (const col of columns) {
    const clean = col.trim()
    if (NON_DATA_PATTERNS.some(p => p.test(clean))) {
      nonData.push(clean)
    } else {
      data.push(clean)
    }
  }
  return { nonData, data }
}

// =====================================================================
// 4. HEADER ROW DETECTION
// =====================================================================
// Multi-level Excel headers → auto-detect baris header yang valid.
// Strategy: scan row 0-5, cari baris dengan density string/kata tertinggi.
export function detectHeaderRow(rows) {
  if (!rows || rows.length < 2) return 0

  const candidates = []
  const maxRows = Math.min(rows.length, 6) // scan first 6 rows max

  for (let i = 0; i < maxRows; i++) {
    const row = rows[i]
    if (!Array.isArray(row)) continue
    const valid = row.filter(c => {
      if (c === null || c === undefined || c === '') return false
      const s = String(c).trim()
      // Header cells typically contain words, not just numbers
      return s.length >= 2 && isNaN(Number(s))
    })
    candidates.push({ idx: i, count: valid.length, cells: row })
  }

  // Pick the row with the most non-numeric, non-empty cells
  candidates.sort((a, b) => b.count - a.count)
  return candidates[0]?.idx ?? 0
}

// =====================================================================
// 5. SUMMARY ROW DETECTION
// =====================================================================
const SUMMARY_PATTERNS = [
  /^total$/i, /^jumlah$/i, /^rata-r?ata$/i, /^rata$/i,
  /^sum$/i, /^average$/i, /^mean$/i, /^rerata$/i,
  /^kesimpulan$/i, /^simpulan$/i,
]

export function detectSummaryRows(rows, headerIdx) {
  const summaryIdx = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!Array.isArray(row)) continue
    // Check first cell for summary keywords
    const first = String(row[0] ?? '').trim().toLowerCase()
    if (SUMMARY_PATTERNS.some(p => p.test(first))) {
      summaryIdx.push(i)
    }
  }
  return summaryIdx
}

// =====================================================================
// 6. TRAILING NOTES DETECTION
// =====================================================================
// Baris setelah data biasanya pendek dan banyak kata (catatan kaki).
export function detectTrailingNotes(rows, dataEndIdx) {
  if (dataEndIdx >= rows.length - 1) return []
  const notes = []
  for (let i = dataEndIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!Array.isArray(row)) { notes.push(i); continue }
    // Trailing rows typically have few columns filled
    const filled = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '')
    if (filled.length <= 1) {
      notes.push(i)
    }
  }
  return notes
}

// =====================================================================
// 7. MULTI-LEVEL HEADER: CONCAT
// =====================================================================
// Jika ada 2+ baris sebelum header utama yang berisi kategori (merged cells),
// concat jadi "Pre-test_Q1" format.
export function concatMultiLevelHeaders(rows, headerIdx) {
  if (headerIdx < 1) return null

  const mainHeaders = rows[headerIdx].map(c => String(c ?? '').trim())
  const parentRows = rows.slice(0, headerIdx)

  // For each cell in each parent row, find which main header it spans
  // Simple approach: concat non-empty parent cells with main headers
  const combined = mainHeaders.map((main, colIdx) => {
    const parts = []
    for (const pRow of parentRows) {
      const pCell = String(pRow[colIdx] ?? '').trim()
      if (pCell && pCell !== main && pCell.length >= 2) {
        parts.push(pCell)
      }
    }
    if (parts.length === 0) return main
    return [...parts, main].join('_')
  })

  return combined
}

// =====================================================================
// 8. MASTER PRE-PROCESSOR
// =====================================================================
// Takes raw 2D array (from Excel parse), returns cleaned column-oriented data
// + diagnostic report.
export function preprocessMessyData(rawRows, fileName = '') {
  if (!rawRows || rawRows.length < 2) {
    return { error: 'Data terlalu sedikit (minimal 2 baris: 1 header + 1 data)' }
  }

  const report = { issues: [], actions: [], fixed: 0 }

  // ---- Step A: Detect header row ----
  const headerIdx = detectHeaderRow(rawRows)
  if (headerIdx > 0) {
    report.issues.push(`Terdeteksi ${headerIdx} baris di atas header (merged/title)`)
    report.actions.push(`Baris 0-${headerIdx - 1} dilewati, header diambil dari baris ${headerIdx}`)
  }

  // ---- Step B: Multi-level header concat ----
  let headerRow = rawRows[headerIdx].map(c => String(c ?? '').trim())
  const concatHeaders = concatMultiLevelHeaders(rawRows, headerIdx)
  if (concatHeaders && concatHeaders.join('_') !== headerRow.join('_')) {
    report.issues.push('Terdeteksi multi-level header')
    report.actions.push(`Header digabung: ${headerRow.slice(0, 3).join(', ')}... → ${concatHeaders.slice(0, 3).join(', ')}...`)
    report.fixed++
    headerRow = concatHeaders
  }

  // Clean empty/unnamed headers
  const cleanHeaders = headerRow.map((h, i) => {
    if (!h || h === 'undefined' || h.startsWith('Unnamed:')) {
      return `Kolom_${i + 1}`
    }
    return h
  })

  // ---- Step C: Detect non-data columns ----
  const { nonData, data: dataCols } = detectNonDataColumns(cleanHeaders)
  if (nonData.length > 0) {
    report.issues.push(`Kolom non-data terdeteksi: ${nonData.join(', ')}`)
    report.actions.push(`${nonData.length} kolom metadata akan diexclude dari analisis`)
  }

  // ---- Step D: Extract data rows ----
  const dataRows = rawRows.slice(headerIdx + 1)

  // ---- Step E: Detect summary rows ----
  const summaryIdx = detectSummaryRows(rawRows, headerIdx)
  if (summaryIdx.length > 0) {
    report.issues.push(`${summaryIdx.length} baris summary terdeteksi (Total, Rata-rata, dll)`)
    report.actions.push(`Baris summary dihapus`)
    report.fixed += summaryIdx.length
  }

  // ---- Step F: Detect trailing notes ----
  const lastDataIdx = dataRows.length - 1
  const relativeTrailing = detectTrailingNotes(rawRows, headerIdx + 1 + lastDataIdx)
  if (relativeTrailing.length > 0) {
    report.issues.push(`${relativeTrailing.length} baris catatan kaki terdeteksi`)
    report.actions.push('Baris catatan dihapus')
    report.fixed += relativeTrailing.length
  }

  // Build summary-adjusted index set
  const summarySet = new Set(summaryIdx.map(i => i - headerIdx - 1))
  const trailingSet = new Set(relativeTrailing.map(i => i - headerIdx - 1))
  const validRowIdx = []
  for (let i = 0; i < dataRows.length; i++) {
    if (!summarySet.has(i) && !trailingSet.has(i)) {
      validRowIdx.push(i)
    }
  }

  // ---- Step G: Build column-oriented data ----
  const result = {}
  const resultColumns = []

  for (let ci = 0; ci < cleanHeaders.length; ci++) {
    const colName = cleanHeaders[ci]
    if (nonData.includes(colName)) continue // skip non-data columns

    resultColumns.push(colName)
    const columnValues = []

    for (const ri of validRowIdx) {
      const raw = dataRows[ri]?.[ci]
      const v = isMissingCode(raw) ? null : parseNumber(raw)
      columnValues.push(v)
    }

    result[colName] = columnValues
  }

  // ---- Step H: Drop fully-null rows ----
  const nRows = resultColumns[0] ? (result[resultColumns[0]]?.length || 0) : 0
  const keepIdx = []
  for (let i = 0; i < nRows; i++) {
    if (!resultColumns.every(c => result[c]?.[i] === null)) {
      keepIdx.push(i)
    }
  }

  const cleaned = {}
  for (const c of resultColumns) {
    cleaned[c] = keepIdx.map(i => result[c][i])
  }
  const droppedNullRows = nRows - keepIdx.length
  if (droppedNullRows > 0) {
    report.actions.push(`${droppedNullRows} baris kosong dihapus`)
    report.fixed += droppedNullRows
  }

  report.rowsAfter = keepIdx.length
  report.columnsAfter = resultColumns.length
  report.skippedRows = {
    header: headerIdx,
    summary: summaryIdx.length,
    trailing: relativeTrailing.length,
    nullRows: droppedNullRows,
  }
  report.totalFixed = report.fixed
  report.hasIssues = report.issues.length > 0

  return {
    data: cleaned,
    columns: resultColumns,
    report,
    headerRow: cleanHeaders,
    nonDataColumns: nonData,
  }
}

// =====================================================================
// QUICK DIAGNOSTIC (no changes applied — just scan)
// =====================================================================
export function quickDiagnose(rawRows) {
  const headerIdx = detectHeaderRow(rawRows)
  const issues = []
  
  if (headerIdx > 0) issues.push(`Multi-level header: ${headerIdx} baris di atas data`)
  
  const summaryIdx = detectSummaryRows(rawRows, headerIdx)
  if (summaryIdx.length > 0) issues.push(`Summary rows: ${summaryIdx.length} baris (Total/Rata)`)
  
  // Check missing codes
  let missingCount = 0
  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i]
    if (!Array.isArray(row)) continue
    for (const cell of row) {
      if (isMissingCode(cell)) missingCount++
    }
  }
  if (missingCount > 0) issues.push(`Missing value codes: ${missingCount} sel (-, NA, dll)`)
  
  // Check number formats
  let idFormatCount = 0
  for (let i = headerIdx + 1; i < Math.min(rawRows.length, headerIdx + 20); i++) {
    const row = rawRows[i]
    if (!Array.isArray(row)) continue
    for (const cell of row) {
      const s = String(cell ?? '')
      if (/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) idFormatCount++
    }
  }
  if (idFormatCount > 0) issues.push(`Format angka Indonesia: ${idFormatCount} sel (titik ribuan, koma desimal)`)
  
  return {
    hasIssues: issues.length > 0,
    issues,
    headerIdx,
    summaryRows: summaryIdx.length,
    missingCodes: missingCount,
    indonesianNumbers: idFormatCount,
  }
}

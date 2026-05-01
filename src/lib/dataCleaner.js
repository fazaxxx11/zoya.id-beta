// Mass dataset cleaner — analyze missing/outliers/duplicates dan apply operations.
// Data shape: { [columnName]: [v1, v2, ...] } (column-oriented).

// =====================================================================
// Type inference
// =====================================================================
export function inferType(values) {
  let nNum = 0, nStr = 0, nNull = 0
  for (const v of values) {
    if (v === null || v === undefined || v === '') { nNull++; continue }
    if (typeof v === 'number' && isFinite(v)) nNum++
    else nStr++
  }
  const nNonNull = nNum + nStr
  if (nNonNull === 0) return 'empty'
  if (nNum / nNonNull >= 0.8) return 'numeric'
  // Cek apakah categorical (sedikit unique value) atau text bebas
  const uniques = new Set(values.filter(v => v !== null && v !== undefined && v !== '').map(String))
  if (uniques.size <= Math.max(10, nNonNull * 0.05)) return 'categorical'
  return 'text'
}

// =====================================================================
// Analyze every column
// =====================================================================
export function analyzeColumns(data, columns) {
  const out = {}
  for (const col of columns) {
    const values = data[col] || []
    const n = values.length
    const missingIdx = []
    const numericValues = []
    values.forEach((v, i) => {
      if (v === null || v === undefined || v === '') missingIdx.push(i)
      else if (typeof v === 'number' && isFinite(v)) numericValues.push(v)
    })
    const type = inferType(values)
    const uniques = new Set(values.filter(v => v !== null && v !== undefined && v !== '').map(String))

    let stats = null
    let outlierIdx = []
    if (type === 'numeric' && numericValues.length >= 4) {
      const sorted = [...numericValues].sort((a, b) => a - b)
      const q = (p) => {
        const idx = (sorted.length - 1) * p
        const lo = Math.floor(idx), hi = Math.ceil(idx)
        return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
      }
      const q1 = q(0.25), q3 = q(0.75), iqr = q3 - q1
      const lo = q1 - 1.5 * iqr
      const hi = q3 + 1.5 * iqr
      const sum = numericValues.reduce((s, v) => s + v, 0)
      const mean = sum / numericValues.length
      const median = q(0.5)

      values.forEach((v, i) => {
        if (typeof v === 'number' && (v < lo || v > hi)) outlierIdx.push(i)
      })

      stats = {
        mean, median, q1, q3, iqr,
        min: sorted[0], max: sorted[sorted.length - 1],
        outlierBoundLow: lo,
        outlierBoundHigh: hi,
      }
    }

    out[col] = {
      type,
      n,
      nonNullCount: n - missingIdx.length,
      missing: missingIdx.length,
      missingPct: n ? (missingIdx.length / n) * 100 : 0,
      missingIdx,
      uniqueCount: uniques.size,
      outlierCount: outlierIdx.length,
      outlierIdx,
      stats,
    }
  }
  return out
}

// =====================================================================
// Detect duplicate rows (full row match across all columns)
// =====================================================================
export function findDuplicateRows(data, columns) {
  if (!columns.length) return []
  const n = data[columns[0]]?.length || 0
  const seen = new Map()
  const dupes = []
  for (let i = 0; i < n; i++) {
    const key = columns.map(c => String(data[c]?.[i])).join('\u0001')
    if (seen.has(key)) {
      dupes.push(i)
    } else {
      seen.set(key, i)
    }
  }
  return dupes
}

// =====================================================================
// Apply operations
// =====================================================================
/**
 * @param {object} data - column-oriented data
 * @param {string[]} columns
 * @param {object} ops - {
 *   columnOps: { [col]: { missing: 'keep'|'drop'|'mean'|'median'|'mode'|'value', missingValue?: any,
 *                        outliers: 'keep'|'drop'|'clip' } },
 *   dropDuplicates: boolean,
 * }
 * @returns {{data, columns, report}}
 */
export function applyCleaning(data, columns, ops) {
  const colOps = ops.columnOps || {}
  const n = data[columns[0]]?.length || 0
  const report = {
    rowsBefore: n,
    rowsAfter: 0,
    actions: [],
    dropped: 0,
    filled: 0,
    clipped: 0,
    duplicatesRemoved: 0,
  }

  // Step 1: build cleaned column values (no row drop yet — track row-drop indices)
  const out = {}
  const analysis = analyzeColumns(data, columns)
  const rowsToDrop = new Set()

  for (const col of columns) {
    const op = colOps[col] || { missing: 'keep', outliers: 'keep' }
    const info = analysis[col]
    const arr = [...(data[col] || [])]

    // ── Missing handling ────────────────────────────────────
    if (info.missing > 0 && op.missing && op.missing !== 'keep') {
      if (op.missing === 'drop') {
        info.missingIdx.forEach(i => rowsToDrop.add(i))
        report.actions.push(`${col}: drop ${info.missing} baris karena missing`)
      } else if (op.missing === 'mean' && info.stats) {
        info.missingIdx.forEach(i => { arr[i] = info.stats.mean })
        report.filled += info.missing
        report.actions.push(`${col}: isi ${info.missing} missing dengan mean (${info.stats.mean.toFixed(3)})`)
      } else if (op.missing === 'median' && info.stats) {
        info.missingIdx.forEach(i => { arr[i] = info.stats.median })
        report.filled += info.missing
        report.actions.push(`${col}: isi ${info.missing} missing dengan median (${info.stats.median.toFixed(3)})`)
      } else if (op.missing === 'mode') {
        const mode = computeMode(arr)
        if (mode != null) {
          info.missingIdx.forEach(i => { arr[i] = mode })
          report.filled += info.missing
          report.actions.push(`${col}: isi ${info.missing} missing dengan mode ("${mode}")`)
        }
      } else if (op.missing === 'value') {
        const v = op.missingValue ?? ''
        info.missingIdx.forEach(i => { arr[i] = v })
        report.filled += info.missing
        report.actions.push(`${col}: isi ${info.missing} missing dengan "${v}"`)
      }
    }

    // ── Outlier handling (numeric only) ────────────────────
    if (info.type === 'numeric' && info.outlierCount > 0 && op.outliers && op.outliers !== 'keep' && info.stats) {
      if (op.outliers === 'drop') {
        info.outlierIdx.forEach(i => rowsToDrop.add(i))
        report.actions.push(`${col}: drop ${info.outlierCount} baris outlier`)
      } else if (op.outliers === 'clip') {
        const { outlierBoundLow: lo, outlierBoundHigh: hi } = info.stats
        info.outlierIdx.forEach(i => {
          const v = arr[i]
          if (typeof v === 'number') {
            arr[i] = v < lo ? lo : v > hi ? hi : v
            report.clipped++
          }
        })
        report.actions.push(`${col}: clip ${info.outlierCount} outlier ke [${lo.toFixed(2)}, ${hi.toFixed(2)}]`)
      }
    }

    out[col] = arr
  }

  // Step 2: handle duplicates
  if (ops.dropDuplicates) {
    const dupeIdx = findDuplicateRows(data, columns)
    dupeIdx.forEach(i => rowsToDrop.add(i))
    report.duplicatesRemoved = dupeIdx.length
    if (dupeIdx.length > 0) report.actions.push(`Drop ${dupeIdx.length} baris duplikat`)
  }

  // Step 3: drop rows
  if (rowsToDrop.size > 0) {
    const keep = []
    for (let i = 0; i < n; i++) if (!rowsToDrop.has(i)) keep.push(i)
    for (const col of columns) {
      out[col] = keep.map(i => out[col][i])
    }
    report.dropped = rowsToDrop.size
    report.rowsAfter = keep.length
  } else {
    report.rowsAfter = n
  }

  return { data: out, columns, report }
}

// =====================================================================
// Helper
// =====================================================================
function computeMode(values) {
  const counts = new Map()
  for (const v of values) {
    if (v === null || v === undefined || v === '') continue
    counts.set(v, (counts.get(v) || 0) + 1)
  }
  let best = null, bestCount = 0
  for (const [v, c] of counts) {
    if (c > bestCount) { best = v; bestCount = c }
  }
  return best
}

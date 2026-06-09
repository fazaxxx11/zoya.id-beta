// src/lib/export/excelExport.js
// Excel export utility — dynamic import xlsx (lazy-loaded, ~427KB)

export function flatten(obj, prefix = '') {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key))
    } else if (Array.isArray(v)) {
      out[key] = JSON.stringify(v)
    } else {
      out[key] = v
    }
  }
  return out
}

export async function exportToExcel(result) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  let ws

  if (result.type === 'descriptive') {
    ws = XLSX.utils.json_to_sheet(result.stats.map(s => ({
      Variabel: s.column, N: s.n, Mean: s.mean, Median: s.median,
      Modus: s.mode, SD: s.stdDev, Variance: s.variance,
      Min: s.min, Max: s.max, Skewness: s.skewness, Kurtosis: s.kurtosis,
    })))
  } else {
    const flat = flatten(result)
    ws = XLSX.utils.json_to_sheet([flat])
  }

  XLSX.utils.book_append_sheet(wb, ws, result.toolName?.slice(0, 30) || 'Hasil')
  XLSX.writeFile(wb, `${result.tool}_${Date.now()}.xlsx`)
}

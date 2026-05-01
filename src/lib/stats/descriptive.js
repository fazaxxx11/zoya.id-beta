// Statistik Deskriptif — pakai sample formula (bagi n-1) untuk inferensial.
// Semua fungsi return number atau struktur object yg consistent.

import * as ss from 'simple-statistics'

/**
 * Hitung deskriptif lengkap untuk satu kolom data numerik.
 * @param {number[]} values
 * @returns {{
 *   n: number, mean: number, median: number, mode: number[],
 *   stdDev: number, variance: number, min: number, max: number,
 *   range: number, q1: number, q3: number, iqr: number,
 *   skewness: number, kurtosis: number, sem: number
 * }}
 */
export function describe(values) {
  const clean = values.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v))
  const n = clean.length
  if (n === 0) {
    return null
  }

  const sorted = [...clean].sort((a, b) => a - b)
  const sum = clean.reduce((a, b) => a + b, 0)
  const mean = sum / n

  // Sample variance (n-1) — untuk inferensial
  const variance = n > 1
    ? clean.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
    : 0
  const stdDev = Math.sqrt(variance)

  // Median
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)]

  // Mode (bisa multimodal)
  const freq = {}
  clean.forEach(v => { freq[v] = (freq[v] || 0) + 1 })
  const maxFreq = Math.max(...Object.values(freq))
  const modes = maxFreq > 1
    ? Object.entries(freq).filter(([, f]) => f === maxFreq).map(([v]) => Number(v))
    : []

  // Quartiles (using simple-statistics for consistency with R/SPSS)
  const q1 = ss.quantileSorted(sorted, 0.25)
  const q3 = ss.quantileSorted(sorted, 0.75)
  const iqr = q3 - q1

  // Skewness & kurtosis (sample, Fisher-Pearson)
  const skewness = n > 2 ? ss.sampleSkewness(clean) : 0
  const kurtosis = n > 3 ? ss.sampleKurtosis(clean) : 0

  // Standard error of mean
  const sem = stdDev / Math.sqrt(n)

  return {
    n,
    mean,
    median,
    mode: modes,         // empty array jika tidak ada mode (semua unique)
    stdDev,
    variance,
    min: sorted[0],
    max: sorted[n - 1],
    range: sorted[n - 1] - sorted[0],
    q1, q3, iqr,
    skewness,
    kurtosis,
    sem,
    sum,
  }
}

/** Format hasil describe untuk display (rounded). */
export function formatDescriptive(d, digits = 3) {
  if (!d) return null
  const r = (n) => typeof n === 'number' ? Number(n.toFixed(digits)) : n
  return {
    ...d,
    mean: r(d.mean),
    median: r(d.median),
    mode: d.mode.length ? d.mode.map(r).join(', ') : '—',
    stdDev: r(d.stdDev),
    variance: r(d.variance),
    min: r(d.min),
    max: r(d.max),
    range: r(d.range),
    q1: r(d.q1), q3: r(d.q3), iqr: r(d.iqr),
    skewness: r(d.skewness),
    kurtosis: r(d.kurtosis),
    sem: r(d.sem),
  }
}

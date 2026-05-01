// Chi-square tests:
// - Test of Independence (kontingensi RxC) — paling umum di skripsi
// - Goodness of Fit (cocokkan distribusi observed dengan expected)

import jstat from 'jstat'
import { cramersV_CI } from './effectSize'

/**
 * Chi-square test of independence dari 2 kolom kategorik.
 * @param {Array<string|number>} col1 - variabel kategorik 1 (rows)
 * @param {Array<string|number>} col2 - variabel kategorik 2 (cols)
 * @param {number} alpha
 */
export function chiSquareIndependence(col1, col2, alpha = 0.05) {
  if (col1.length !== col2.length) {
    return { error: `Panjang kolom harus sama (${col1.length} vs ${col2.length})` }
  }

  // Pasangkan, drop missing
  const pairs = []
  for (let i = 0; i < col1.length; i++) {
    const a = col1[i], b = col2[i]
    if (a === null || a === undefined || a === '' ||
        b === null || b === undefined || b === '') continue
    pairs.push([String(a), String(b)])
  }
  if (pairs.length < 5) return { error: `Sampel terlalu kecil setelah remove missing (${pairs.length})` }

  // Build categories
  const rowLabels = Array.from(new Set(pairs.map(p => p[0]))).sort()
  const colLabels = Array.from(new Set(pairs.map(p => p[1]))).sort()
  const r = rowLabels.length
  const c = colLabels.length

  if (r < 2 || c < 2) {
    return { error: `Butuh minimal 2 kategori per variabel (rows=${r}, cols=${c})` }
  }

  const rowIdx = Object.fromEntries(rowLabels.map((l, i) => [l, i]))
  const colIdx = Object.fromEntries(colLabels.map((l, i) => [l, i]))

  // Observed frequencies
  const observed = Array.from({ length: r }, () => new Array(c).fill(0))
  for (const [a, b] of pairs) observed[rowIdx[a]][colIdx[b]]++

  // Marginals
  const rowTotals = observed.map(row => row.reduce((s, v) => s + v, 0))
  const colTotals = new Array(c).fill(0)
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) colTotals[j] += observed[i][j]
  const N = pairs.length

  // Expected
  const expected = Array.from({ length: r }, (_, i) =>
    Array.from({ length: c }, (_, j) => (rowTotals[i] * colTotals[j]) / N)
  )

  // Chi-square statistic
  let chi2 = 0
  let cellsLow = 0 // cells dengan expected < 5 (warning)
  for (let i = 0; i < r; i++) {
    for (let j = 0; j < c; j++) {
      const e = expected[i][j]
      if (e < 5) cellsLow++
      if (e > 0) chi2 += ((observed[i][j] - e) ** 2) / e
    }
  }

  const df = (r - 1) * (c - 1)
  const pValue = 1 - jstat.chisquare.cdf(chi2, df)

  // Effect size: Cramer's V + 95% CI (Bonett 2006 approximation)
  const minDim = Math.min(r - 1, c - 1)
  const cramersV = Math.sqrt(chi2 / (N * minDim))
  const cramersV_CI95 = cramersV_CI(cramersV, chi2, N, df, alpha)
  // Phi (untuk 2x2 saja)
  const phi = (r === 2 && c === 2) ? Math.sqrt(chi2 / N) : null

  const totalCells = r * c
  const lowExpectedPercent = (cellsLow / totalCells) * 100
  const assumptionWarning = lowExpectedPercent > 20
    ? `⚠️ ${cellsLow} dari ${totalCells} sel (${lowExpectedPercent.toFixed(0)}%) memiliki expected < 5. Asumsi chi-square tidak terpenuhi (>20% sel <5). Pertimbangkan Fisher's Exact Test untuk tabel 2x2 atau gabungkan kategori.`
    : null

  return {
    chi2,
    df,
    pValue,
    N,
    rowLabels,
    colLabels,
    observed,
    expected,
    rowTotals,
    colTotals,
    cramersV,
    cramersV_CI: cramersV_CI95,
    phi,
    cellsLowExpected: cellsLow,
    lowExpectedPercent,
    assumptionWarning,
    effectSizeLabel: cramersVLabel(cramersV, minDim),
    isSignificant: pValue < alpha,
    alpha,
    interpretation: buildChi2Interpretation(chi2, df, pValue, alpha, cramersV, cramersV_CI95, minDim),
  }
}

function cramersVLabel(v, df) {
  // Cohen's effect size benchmarks (untuk df=1: small=0.1, medium=0.3, large=0.5;
  // untuk df>1, dibagi sqrt(df))
  const norm = v // gunakan langsung
  if (norm < 0.1) return 'Sangat kecil'
  if (norm < 0.3) return 'Kecil'
  if (norm < 0.5) return 'Sedang'
  return 'Besar'
}

function buildChi2Interpretation(chi2, df, p, alpha, v, vCI, minDim) {
  const ciStr = vCI ? ` 95% CI [${vCI[0].toFixed(3)}, ${vCI[1].toFixed(3)}]` : ''
  if (p < alpha) {
    return `Terdapat hubungan signifikan antara dua variabel kategorik (χ²(${df}) = ${chi2.toFixed(3)}, p = ${p.toFixed(4)} < α = ${alpha}). Cramer's V = ${v.toFixed(3)}${ciStr} (${cramersVLabel(v, minDim).toLowerCase()}) menunjukkan kekuatan hubungan.`
  }
  return `Tidak ada hubungan signifikan antara dua variabel kategorik (χ²(${df}) = ${chi2.toFixed(3)}, p = ${p.toFixed(4)} > α = ${alpha}). H₀ (independen) tidak ditolak.`
}

/**
 * Chi-square Goodness of Fit.
 * @param {number[]} observed - observed counts per kategori
 * @param {number[]} [expected] - expected counts; jika tidak diberi, asumsikan uniform.
 */
export function chiSquareGoodnessOfFit(observed, expected = null, alpha = 0.05) {
  const obs = observed.filter(v => typeof v === 'number' && v >= 0)
  const k = obs.length
  if (k < 2) return { error: 'Butuh minimal 2 kategori' }

  const N = obs.reduce((s, v) => s + v, 0)
  const exp = expected ?? new Array(k).fill(N / k)
  if (exp.length !== k) return { error: 'Panjang observed dan expected harus sama' }

  let chi2 = 0
  for (let i = 0; i < k; i++) {
    if (exp[i] > 0) chi2 += ((obs[i] - exp[i]) ** 2) / exp[i]
  }
  const df = k - 1
  const pValue = 1 - jstat.chisquare.cdf(chi2, df)

  return {
    chi2, df, pValue, N, k,
    observed: obs, expected: exp,
    isSignificant: pValue < alpha,
    alpha,
    interpretation: pValue < alpha
      ? `Distribusi observed berbeda signifikan dari expected (χ²(${df}) = ${chi2.toFixed(3)}, p = ${pValue.toFixed(4)} < α = ${alpha}).`
      : `Distribusi observed sesuai dengan expected (χ²(${df}) = ${chi2.toFixed(3)}, p = ${pValue.toFixed(4)} > α = ${alpha}).`,
  }
}

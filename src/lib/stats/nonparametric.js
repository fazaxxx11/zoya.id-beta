// Non-parametric tests:
// - Mann-Whitney U (alternatif untuk independent t-test)
// - Wilcoxon signed-rank (alternatif untuk paired t-test)
// - Kruskal-Wallis (alternatif untuk one-way ANOVA)
//
// Semua pakai normal approximation untuk p-value (valid n ≥ 5-8 per group).
// Menerapkan tie correction.

import jstat from 'jstat'

// ============================================================
// Helper: rank values (average rank untuk ties)
// ============================================================
function rankValues(values) {
  const indexed = values.map((v, i) => ({ v, i }))
  indexed.sort((a, b) => a.v - b.v)
  const ranks = new Array(values.length)
  let i = 0
  const tieCounts = [] // sizes of tie groups (untuk tie correction)
  while (i < indexed.length) {
    let j = i
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++
    // ranks i..j semuanya = average rank (i+1 + j+1)/2
    const avgRank = (i + 1 + j + 1) / 2
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = avgRank
    if (j > i) tieCounts.push(j - i + 1)
    i = j + 1
  }
  return { ranks, tieCounts }
}

function cleanNumeric(arr) {
  return arr.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v))
}

// ============================================================
// Mann-Whitney U test (independent samples)
// ============================================================
/**
 * @param {number[]} group1
 * @param {number[]} group2
 * @returns {Object}
 */
export function mannWhitneyU(group1, group2, alpha = 0.05) {
  const g1 = cleanNumeric(group1)
  const g2 = cleanNumeric(group2)
  const n1 = g1.length
  const n2 = g2.length

  if (n1 < 3 || n2 < 3) {
    return { error: `Setiap grup butuh minimal 3 observasi (n1=${n1}, n2=${n2})` }
  }

  // Combine and rank
  const combined = [...g1, ...g2]
  const { ranks, tieCounts } = rankValues(combined)
  const ranksG1 = ranks.slice(0, n1)
  const ranksG2 = ranks.slice(n1)
  const R1 = ranksG1.reduce((s, r) => s + r, 0)
  const R2 = ranksG2.reduce((s, r) => s + r, 0)

  const U1 = R1 - n1 * (n1 + 1) / 2
  const U2 = R2 - n2 * (n2 + 1) / 2
  const U = Math.min(U1, U2)

  const N = n1 + n2
  const meanU = (n1 * n2) / 2

  // Tie correction
  let tieAdj = 0
  for (const t of tieCounts) tieAdj += (t ** 3 - t)
  const sigmaU2 = (n1 * n2 / 12) * ((N + 1) - tieAdj / (N * (N - 1)))
  const sigmaU = Math.sqrt(Math.max(sigmaU2, 1e-12))

  // z dengan koreksi kontinuitas 0.5
  const z = (U - meanU + 0.5 * Math.sign(meanU - U)) / sigmaU
  const pValue = 2 * (1 - jstat.normal.cdf(Math.abs(z), 0, 1))
  const r = Math.abs(z) / Math.sqrt(N) // effect size

  const meanRank1 = R1 / n1
  const meanRank2 = R2 / n2

  return {
    U, U1, U2,
    R1, R2,
    meanRank1, meanRank2,
    n1, n2, N,
    z,
    pValue,
    isSignificant: pValue < alpha,
    effectSize: r,
    effectSizeLabel: effectSizeLabelR(r),
    alpha,
    interpretation: buildInterpretationMW(pValue, alpha, meanRank1, meanRank2, r),
  }
}

function effectSizeLabelR(r) {
  const a = Math.abs(r)
  if (a < 0.1) return 'Sangat kecil'
  if (a < 0.3) return 'Kecil'
  if (a < 0.5) return 'Sedang'
  return 'Besar'
}

function buildInterpretationMW(p, alpha, m1, m2, r) {
  const sig = p < alpha
  if (!sig) {
    return `Tidak ada perbedaan signifikan antara dua grup (p = ${p.toFixed(4)} > α = ${alpha}). H₀ tidak ditolak.`
  }
  const arrow = m1 > m2 ? 'lebih tinggi' : 'lebih rendah'
  return `Terdapat perbedaan signifikan antara dua grup (p = ${p.toFixed(4)} < α = ${alpha}). Median grup 1 ${arrow} dari grup 2. Effect size r = ${r.toFixed(3)} (${effectSizeLabelR(r).toLowerCase()}).`
}

// ============================================================
// Wilcoxon Signed-Rank Test (paired samples)
// ============================================================
/**
 * @param {number[]} before
 * @param {number[]} after
 */
export function wilcoxonSignedRank(before, after, alpha = 0.05) {
  if (before.length !== after.length) {
    return { error: `Panjang data harus sama (sebelum=${before.length}, sesudah=${after.length})` }
  }
  // Pasangkan, drop pasangan yang ada NaN, lalu drop diferensi = 0
  const diffs = []
  for (let i = 0; i < before.length; i++) {
    const a = before[i], b = after[i]
    if (typeof a !== 'number' || typeof b !== 'number' || isNaN(a) || isNaN(b)) continue
    const d = b - a
    if (d !== 0) diffs.push(d) // skip ties
  }
  const n = diffs.length
  if (n < 5) return { error: `Butuh minimal 5 pasangan dengan diferensi ≠ 0 (sekarang ${n})` }

  // Rank |d|
  const absDiffs = diffs.map(d => Math.abs(d))
  const { ranks, tieCounts } = rankValues(absDiffs)

  let Wpos = 0, Wneg = 0
  for (let i = 0; i < n; i++) {
    if (diffs[i] > 0) Wpos += ranks[i]
    else Wneg += ranks[i]
  }
  const W = Math.min(Wpos, Wneg)

  const meanW = n * (n + 1) / 4
  let tieAdj = 0
  for (const t of tieCounts) tieAdj += (t ** 3 - t) / 48
  const sigmaW = Math.sqrt(Math.max(n * (n + 1) * (2 * n + 1) / 24 - tieAdj, 1e-12))

  const z = (W - meanW + 0.5 * Math.sign(meanW - W)) / sigmaW
  const pValue = 2 * (1 - jstat.normal.cdf(Math.abs(z), 0, 1))
  const r = Math.abs(z) / Math.sqrt(n)

  const meanDiff = diffs.reduce((s, d) => s + d, 0) / n

  return {
    W, Wpos, Wneg,
    n,
    z,
    pValue,
    meanDiff,
    isSignificant: pValue < alpha,
    effectSize: r,
    effectSizeLabel: effectSizeLabelR(r),
    alpha,
    interpretation: pValue < alpha
      ? `Terdapat perbedaan signifikan antara sebelum & sesudah (p = ${pValue.toFixed(4)} < α = ${alpha}). Median diferensi ${meanDiff > 0 ? 'positif' : 'negatif'}. Effect size r = ${r.toFixed(3)} (${effectSizeLabelR(r).toLowerCase()}).`
      : `Tidak ada perbedaan signifikan (p = ${pValue.toFixed(4)} > α = ${alpha}). H₀ tidak ditolak.`,
  }
}

// ============================================================
// Kruskal-Wallis Test (≥3 independent groups)
// ============================================================
/**
 * @param {number[][]} groups - array of arrays
 * @param {string[]} groupNames - optional
 */
export function kruskalWallis(groups, groupNames = null, alpha = 0.05) {
  const cleaned = groups.map(g => cleanNumeric(g))
  const k = cleaned.length
  if (k < 2) return { error: 'Butuh minimal 2 grup' }
  for (const g of cleaned) {
    if (g.length < 2) return { error: `Setiap grup butuh minimal 2 observasi (ada grup dengan n=${g.length})` }
  }
  const names = groupNames || cleaned.map((_, i) => `Grup ${i + 1}`)

  // Combined ranks
  const flat = []
  const groupIdx = []
  cleaned.forEach((g, gi) => {
    g.forEach(v => { flat.push(v); groupIdx.push(gi) })
  })
  const N = flat.length
  const { ranks, tieCounts } = rankValues(flat)

  // Sum of ranks per group
  const Ri = new Array(k).fill(0)
  const ni = cleaned.map(g => g.length)
  ranks.forEach((r, idx) => { Ri[groupIdx[idx]] += r })

  let H = 0
  for (let i = 0; i < k; i++) H += (Ri[i] ** 2) / ni[i]
  H = (12 / (N * (N + 1))) * H - 3 * (N + 1)

  // Tie correction
  let C = 1
  if (tieCounts.length > 0) {
    let sumT = 0
    for (const t of tieCounts) sumT += (t ** 3 - t)
    C = 1 - sumT / (N ** 3 - N)
    if (C > 0) H = H / C
  }

  const df = k - 1
  const pValue = 1 - jstat.chisquare.cdf(H, df)
  // Effect size ε² (epsilon-squared) = H / (N - 1)
  // Reference: Kelley (1935), lebih konservatif dari η²
  const epsilonSq = H / (N - 1)
  const epsilonSqClamped = Math.max(0, epsilonSq)

  const groupStats = cleaned.map((g, i) => ({
    name: names[i],
    n: g.length,
    meanRank: Ri[i] / g.length,
    median: median(g),
    sumRank: Ri[i],
  }))

  return {
    H,
    df,
    pValue,
    N, k,
    groupStats,
    isSignificant: pValue < alpha,
    epsilonSquared: epsilonSqClamped,
    etaSquared: epsilonSqClamped,  // alias for backward compat
    effectSizeLabel: epsilonSquaredLabel(epsilonSqClamped),
    alpha,
    interpretation: pValue < alpha
      ? `Terdapat perbedaan signifikan antar ${k} grup (H(${df}) = ${H.toFixed(3)}, p = ${pValue.toFixed(4)} < α = ${alpha}). ε² = ${epsilonSqClamped.toFixed(3)} (${epsilonSquaredLabel(epsilonSqClamped).toLowerCase()}). Lakukan post-hoc untuk identifikasi pair berbeda.`
      : `Tidak ada perbedaan signifikan antar ${k} grup (H(${df}) = ${H.toFixed(3)}, p = ${pValue.toFixed(4)} > α = ${alpha}).`,
  }
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  const n = s.length
  return n % 2 === 0 ? (s[n / 2 - 1] + s[n / 2]) / 2 : s[Math.floor(n / 2)]
}

function epsilonSquaredLabel(e) {
  if (e < 0.01) return 'Sangat kecil'
  if (e < 0.06) return 'Kecil'
  if (e < 0.14) return 'Sedang'
  return 'Besar'
}

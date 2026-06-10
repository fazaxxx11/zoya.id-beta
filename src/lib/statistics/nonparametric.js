/**
 * Non-parametric tests — zero-dependency, SPSS-style.
 *
 * Mann-Whitney U (independent samples)
 * Wilcoxon Signed-Rank (paired samples)
 * Kruskal-Wallis (≥2 independent groups)
 *
 * All use normal approximation for p-values (valid n ≥ 5-8 per group).
 * Tie correction applied. Exact p-values not yet implemented.
 *
 * Missing values: blank/null/undefined/NaN/Infinity excluded, never converted to 0.
 * Two-array paired tests: listwise pair deletion.
 * Independent/group tests: clean per group, preserve group labels.
 */

import { cleanNumeric, listwisePair } from './data.js'
import { chi2PValue, normalCDF } from './distributions.js'

// ── Helpers ────────────────────────────────────────────────────────

function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  const n = s.length
  if (n === 0) return NaN
  return n % 2 === 0 ? (s[n / 2 - 1] + s[n / 2]) / 2 : s[Math.floor(n / 2)]
}

/**
 * Rank values with average-rank tie handling.
 * @param {number[]} values
 * @returns {{ ranks: number[], tieCounts: number[] }}
 */
export function averageRank(values) {
  const indexed = values.map((v, i) => ({ v, i }))
  indexed.sort((a, b) => a.v - b.v)
  const ranks = new Array(values.length)
  const tieCounts = []
  let i = 0
  while (i < indexed.length) {
    let j = i
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++
    const avgRank = (i + 1 + j + 1) / 2
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = avgRank
    if (j > i) tieCounts.push(j - i + 1)
    i = j + 1
  }
  return { ranks, tieCounts }
}

function effectSizeLabelR(r) {
  const a = Math.abs(r)
  if (a < 0.1) return 'Sangat kecil'
  if (a < 0.3) return 'Kecil'
  if (a < 0.5) return 'Sedang'
  return 'Besar'
}

// ── Mann-Whitney U ─────────────────────────────────────────────────

/**
 * Mann-Whitney U test (independent samples).
 * @param {number[]} group1
 * @param {number[]} group2
 * @param {number} alpha
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

  const combined = [...g1, ...g2]
  const { ranks, tieCounts } = averageRank(combined)
  const ranksG1 = ranks.slice(0, n1)
  const ranksG2 = ranks.slice(n1)
  const R1 = ranksG1.reduce((s, r) => s + r, 0)
  const R2 = ranksG2.reduce((s, r) => s + r, 0)

  const U1 = R1 - n1 * (n1 + 1) / 2
  const U2 = R2 - n2 * (n2 + 1) / 2
  const U = Math.min(U1, U2)

  const N = n1 + n2
  const meanU = (n1 * n2) / 2

  let tieAdj = 0
  for (const t of tieCounts) tieAdj += (t ** 3 - t)
  const sigmaU2 = (n1 * n2 / 12) * ((N + 1) - tieAdj / (N * (N - 1)))
  const sigmaU = Math.sqrt(Math.max(sigmaU2, 1e-12))

  const z = (U - meanU + 0.5 * Math.sign(meanU - U)) / sigmaU
  const pValue = 2 * (1 - normalCDF(Math.abs(z)))
  const r = Math.abs(z) / Math.sqrt(N)

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
    interpretation: pValue < alpha
      ? `Terdapat perbedaan signifikan antara dua grup (p = ${pValue.toFixed(4)} < α = ${alpha}). Median grup 1 ${meanRank1 > meanRank2 ? 'lebih tinggi' : 'lebih rendah'} dari grup 2. Effect size r = ${r.toFixed(3)} (${effectSizeLabelR(r).toLowerCase()}).`
      : `Tidak ada perbedaan signifikan antara dua grup (p = ${pValue.toFixed(4)} > α = ${alpha}). H₀ tidak ditolak.`,
  }
}

// ── Wilcoxon Signed-Rank ───────────────────────────────────────────

/**
 * Wilcoxon Signed-Rank test (paired samples).
 * @param {number[]} before
 * @param {number[]} post
 * @param {number} alpha
 * @returns {Object}
 */
export function wilcoxonSignedRank(before, post, alpha = 0.05) {
  if (before.length !== post.length) {
    return { error: `Panjang data harus sama (sebelum=${before.length}, sesudah=${post.length})` }
  }

  const cleaned = listwisePair(before, post)
  if (cleaned.excluded > 0 && cleaned.nClean < before.length) {
    // Some pairs excluded — use cleaned arrays
  }
  const xArr = cleaned.x
  const yArr = cleaned.y
  const diffs = []
  for (let i = 0; i < xArr.length; i++) {
    const d = yArr[i] - xArr[i]
    if (d !== 0) diffs.push(d)
  }
  const n = diffs.length

  if (n < 5) {
    return { error: `Butuh minimal 5 pasangan dengan diferensi ≠ 0 (sekarang ${n})` }
  }

  const absDiffs = diffs.map(d => Math.abs(d))
  const { ranks, tieCounts } = averageRank(absDiffs)

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
  const pValue = 2 * (1 - normalCDF(Math.abs(z)))
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

// ── Kruskal-Wallis ─────────────────────────────────────────────────

function etaSquaredLabel(e) {
  if (e < 0.01) return 'Sangat kecil'
  if (e < 0.06) return 'Kecil'
  if (e < 0.14) return 'Sedang'
  return 'Besar'
}

/**
 * Kruskal-Wallis test (≥2 independent groups).
 * @param {number[][]} groups - array of arrays
 * @param {string[]|null} groupNames
 * @param {number} alpha
 * @returns {Object}
 */
export function kruskalWallis(groups, groupNames = null, alpha = 0.05) {
  const cleaned = groups.map(g => cleanNumeric(g))
  const k = cleaned.length
  if (k < 2) return { error: 'Butuh minimal 2 grup' }
  for (const g of cleaned) {
    if (g.length < 2) return { error: `Setiap grup butuh minimal 2 observasi (ada grup dengan n=${g.length})` }
  }
  const names = groupNames || cleaned.map((_, i) => `Grup ${i + 1}`)

  const flat = []
  const groupIdx = []
  cleaned.forEach((g, gi) => {
    g.forEach(v => { flat.push(v); groupIdx.push(gi) })
  })
  const N = flat.length
  const { ranks, tieCounts } = averageRank(flat)

  const Ri = new Array(k).fill(0)
  const ni = cleaned.map(g => g.length)
  ranks.forEach((r, idx) => { Ri[groupIdx[idx]] += r })

  let H = 0
  for (let i = 0; i < k; i++) H += (Ri[i] ** 2) / ni[i]
  H = (12 / (N * (N + 1))) * H - 3 * (N + 1)

  let C = 1
  if (tieCounts.length > 0) {
    let sumT = 0
    for (const t of tieCounts) sumT += (t ** 3 - t)
    C = 1 - sumT / (N ** 3 - N)
    if (C > 0) H = H / C
  }

  const df = k - 1
  const pValue = chi2PValue(H, df)
  const etaSq = Math.max(0, (H - k + 1) / (N - k))

  const groupStats = cleaned.map((g, i) => ({
    name: names[i],
    n: g.length,
    median: median(g),
    meanRank: Ri[i] / g.length,
    sumRank: Ri[i],
  }))

  return {
    H,
    df,
    pValue,
    N, k,
    groupStats,
    isSignificant: pValue < alpha,
    etaSquared: etaSq,
    effectSizeLabel: etaSquaredLabel(etaSq),
    alpha,
    interpretation: pValue < alpha
      ? `Terdapat perbedaan signifikan antar ${k} grup (H(${df}) = ${H.toFixed(3)}, p = ${pValue.toFixed(4)} < α = ${alpha}). η² = ${etaSq.toFixed(3)} (${etaSquaredLabel(etaSq).toLowerCase()}). Lakukan post-hoc untuk identifikasi pair berbeda.`
      : `Tidak ada perbedaan signifikan antar ${k} grup (H(${df}) = ${H.toFixed(3)}, p = ${pValue.toFixed(4)} > α = ${alpha}).`,
  }
}

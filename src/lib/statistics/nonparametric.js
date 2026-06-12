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

// ── Dunn's Post-hoc Test ──────────────────────────────────────────

/**
 * Dunn's (1964) post-hoc pairwise comparisons after Kruskal-Wallis.
 * Compares each pair with Bonferroni-adjusted z-test.
 *
 * @param {number[][]} groups - array of arrays (raw values)
 * @param {string[]|null} groupNames
 * @param {number} alpha
 * @returns {Object}
 */
export function dunnTest(groups, groupNames = null, alpha = 0.05) {
  const cleaned = groups.map(g => cleanNumeric(g))
  const k = cleaned.length
  if (k < 2) return { error: 'Butuh minimal 2 grup' }

  const names = groupNames || cleaned.map((_, i) => `Grup ${i + 1}`)
  const ni = cleaned.map(g => g.length)
  const N = ni.reduce((s, n) => s + n, 0)

  // Rank all data
  const flat = []
  cleaned.forEach(g => g.forEach(v => flat.push(v)))
  const { ranks, tieCounts } = averageRank(flat)

  // Compute mean ranks per group
  let pos = 0, meanRanks = []
  for (let i = 0; i < k; i++) {
    const sumR = ranks.slice(pos, pos + ni[i]).reduce((s, r) => s + r, 0)
    meanRanks.push(sumR / ni[i])
    pos += ni[i]
  }

  // Tie correction
  let tieCorr = 1
  if (tieCounts.length > 0) {
    let sumT = 0
    for (const t of tieCounts) sumT += (t ** 3 - t)
    tieCorr = 1 - sumT / (N ** 3 - N)
    if (tieCorr <= 0) tieCorr = 1
  }

  // Denominator constant: sqrt((N(N+1)/12) * (1/ni + 1/nj))
  const comparisons = []
  const numPairs = k * (k - 1) / 2

  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const diff = meanRanks[i] - meanRanks[j]
      const se = Math.sqrt((N * (N + 1) / 12) * (1 / ni[i] + 1 / ni[j]) / tieCorr)
      const z = diff / se
      const pRaw = 2 * (1 - normalCDF(Math.abs(z)))
      const pAdj = Math.min(pRaw * numPairs, 1) // Bonferroni

      // Effect size: r = z / sqrt(N)
      const r = Math.abs(z) / Math.sqrt(N)

      comparisons.push({
        group1: names[i],
        group2: names[j],
        idx1: i,
        idx2: j,
        meanRank1: meanRanks[i],
        meanRank2: meanRanks[j],
        z,
        pRaw,
        pBonferroni: pAdj,
        significant: pAdj < alpha,
        effectSize: r,
        effectSizeLabel: effectSizeLabelR(r),
      })
    }
  }

  const significantPairs = comparisons.filter(c => c.significant)
  return {
    test: 'Dunn post-hoc',
    N,
    k,
    numPairs,
    tieCorrection: tieCorr < 1 ? tieCorr : null,
    alpha,
    correction: 'Bonferroni',
    meanRanks: names.map((n, i) => ({ group: n, n: ni[i], meanRank: meanRanks[i] })),
    comparisons,
    significantPairs,
    interpretation: significantPairs.length > 0
      ? `Post-hoc Dunn (Bonferroni) mengidentifikasi ${significantPairs.length} pasangan signifikan: ${significantPairs.map(p => `${p.group1} vs ${p.group2} (p = ${p.pBonferroni.toFixed(4)})`).join('; ')}.`
      : `Post-hoc Dunn (Bonferroni) tidak menemukan pasangan yang berbeda signifikan setelah koreksi (α = ${alpha}).`,
  }
}

// ── Friedman Test ─────────────────────────────────────────────────

/**
 * Friedman test — non-parametric repeated measures (k related samples).
 * Each row = one block/subject; columns = k conditions.
 *
 * @param {number[][]} data - matrix [n_blocks][k_conditions]
 * @param {string[]|null} conditionNames
 * @param {number} alpha
 * @returns {Object}
 */
export function friedmanTest(data, conditionNames = null, alpha = 0.05) {
  const n = data.length
  if (n < 3) return { error: `Butuh minimal 3 blok/subjek (n=${n})` }
  const k = data[0]?.length || 0
  if (k < 2) return { error: `Butuh minimal 2 kondisi (k=${k})` }

  // Verify all rows have same length
  for (let i = 0; i < n; i++) {
    if (!data[i] || data[i].length !== k) {
      return { error: `Baris ${i + 1} tidak memiliki ${k} kolom (punya ${data[i]?.length || 0})` }
    }
  }

  const names = conditionNames || Array.from({ length: k }, (_, i) => `Kondisi ${i + 1}`)

  // Rank within each block
  const blockRanks = []
  for (let i = 0; i < n; i++) {
    const { ranks } = averageRank(data[i])
    blockRanks.push(ranks)
  }

  // Sum ranks per condition
  const Rj = new Array(k).fill(0)
  for (let j = 0; j < k; j++) {
    for (let i = 0; i < n; i++) {
      Rj[j] += blockRanks[i][j]
    }
  }

  // Friedman test statistic
  const meanR = n * (k + 1) / 2
  let sumSqDev = 0
  for (let j = 0; j < k; j++) {
    sumSqDev += (Rj[j] - meanR) ** 2
  }
  const chi2 = (12 / (n * k * (k + 1))) * sumSqDev

  // Tie correction
  let chi2Adj = chi2
  let tieCorr = null
  let totalTies = 0
  for (let i = 0; i < n; i++) {
    const { tieCounts } = averageRank(data[i])
    for (const t of tieCounts) {
      totalTies += (t ** 3 - t)
    }
  }
  if (totalTies > 0) {
    tieCorr = 1 - totalTies / (n * k * (k ** 2 - 1))
    if (tieCorr > 0) chi2Adj = chi2 / tieCorr
  }

  const df = k - 1
  const pValue = chi2PValue(chi2Adj, df)

  // Kendall's W (coefficient of concordance)
  const W = totalTies > 0
    ? chi2Adj / (n * (k - 1))
    : chi2 / (n * (k - 1))

  // Effect size labels for W
  const wLabel = W < 0.1 ? 'Sangat kecil' : W < 0.3 ? 'Kecil' : W < 0.5 ? 'Sedang' : 'Besar'

  const conditionStats = names.map((name, j) => ({
    name,
    sumRank: Rj[j],
    meanRank: Rj[j] / n,
    median: median(data.map(row => row[j])),
  }))

  return {
    test: 'Friedman',
    chi2: chi2Adj,
    df,
    pValue,
    n,
    k,
    W,
    WLabel: wLabel,
    tieCorrection: tieCorr,
    conditionStats,
    isSignificant: pValue < alpha,
    alpha,
    interpretation: pValue < alpha
      ? `Terdapat perbedaan signifikan antar ${k} kondisi (χ²(${df}) = ${chi2Adj.toFixed(3)}, p = ${pValue.toFixed(4)} < α = ${alpha}). Kendall's W = ${W.toFixed(3)} (${wLabel.toLowerCase()}), menunjukkan keselarasan peringkat antar blok.`
      : `Tidak ada perbedaan signifikan antar ${k} kondisi (χ²(${df}) = ${chi2Adj.toFixed(3)}, p = ${pValue.toFixed(4)} > α = ${alpha}). Kendall's W = ${W.toFixed(3)} (${wLabel.toLowerCase()}).`,
  }
}

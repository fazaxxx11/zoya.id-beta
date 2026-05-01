// Two-Way ANOVA (Factorial Design)
// =================================
// Menghitung pengaruh dua faktor kategorik (A & B) terhadap satu outcome
// numerik, plus interaksi A×B. Cocok untuk desain faktorial 2x2, 2x3, 3x4 dst.
//
// Model: Y_ijk = μ + α_i + β_j + (αβ)_ij + ε_ijk
//
// CATATAN:
// - Untuk desain balanced (n_ij sama tiap sel), hasil F-test setara Type I/II/III.
// - Untuk desain unbalanced, kita pakai pendekatan cell-means (mendekati Type III
//   tapi tidak persis). Kalau butuh inference yang ketat, gunakan R/SPSS.
// - Minimal 2 observasi per sel disarankan (untuk df_within > 0).

import jstat from 'jstat'

/**
 * Two-Way ANOVA.
 *
 * @param {object} args
 * @param {number[]} args.y           - outcome numerik
 * @param {(string|number)[]} args.a  - level faktor A
 * @param {(string|number)[]} args.b  - level faktor B
 * @param {string} [args.nameA='A']
 * @param {string} [args.nameB='B']
 * @param {number} [args.alpha=0.05]
 * @returns {object}
 */
export function twoWayANOVA({ y, a, b, nameA = 'A', nameB = 'B', alpha = 0.05 }) {
  if (!Array.isArray(y) || !Array.isArray(a) || !Array.isArray(b)) {
    return { error: 'y, a, dan b harus array' }
  }
  if (y.length !== a.length || y.length !== b.length) {
    return { error: `Panjang array tidak sama (y=${y.length}, a=${a.length}, b=${b.length})` }
  }

  // Filter pasangan valid
  const rows = []
  for (let i = 0; i < y.length; i++) {
    const yi = y[i], ai = a[i], bi = b[i]
    if (
      typeof yi === 'number' && isFinite(yi) &&
      ai !== null && ai !== undefined && ai !== '' &&
      bi !== null && bi !== undefined && bi !== ''
    ) {
      rows.push({ y: yi, a: String(ai), b: String(bi) })
    }
  }

  const N = rows.length
  if (N < 4) return { error: `Hanya ${N} baris valid — butuh minimal 4` }

  // === Levels & cell groupings ===
  const levelsA = [...new Set(rows.map(r => r.a))].sort()
  const levelsB = [...new Set(rows.map(r => r.b))].sort()
  const aN = levelsA.length
  const bN = levelsB.length
  if (aN < 2) return { error: `Faktor "${nameA}" hanya punya 1 level — butuh ≥ 2` }
  if (bN < 2) return { error: `Faktor "${nameB}" hanya punya 1 level — butuh ≥ 2` }

  // Cell map: {a}|{b} → values[]
  const cells = {}
  rows.forEach(r => {
    const key = `${r.a}\x1f${r.b}`
    if (!cells[key]) cells[key] = []
    cells[key].push(r.y)
  })

  // Cek minimum 1 obs per cell (untuk df > 0 perlu lebih)
  const allCellKeys = []
  for (const la of levelsA) for (const lb of levelsB) allCellKeys.push(`${la}\x1f${lb}`)
  const emptyCells = allCellKeys.filter(k => !cells[k] || cells[k].length === 0)
  if (emptyCells.length > 0) {
    return { error: `Ada ${emptyCells.length} sel kosong (kombinasi level tanpa data). Two-way ANOVA butuh data di setiap sel.` }
  }

  // df_within = N - a*b. Butuh > 0 supaya bisa hitung F.
  const dfWithin = N - aN * bN
  if (dfWithin < 1) {
    return { error: `df residual = ${dfWithin} (butuh ≥ 1). Tambahkan replikasi per sel atau kurangi level faktor.` }
  }

  // === Means ===
  const grandSum = rows.reduce((s, r) => s + r.y, 0)
  const grandMean = grandSum / N

  // Mean per level A & per level B
  const meanA = {}
  const nA = {}
  for (const la of levelsA) {
    const sub = rows.filter(r => r.a === la)
    nA[la] = sub.length
    meanA[la] = sub.reduce((s, r) => s + r.y, 0) / sub.length
  }
  const meanB = {}
  const nB = {}
  for (const lb of levelsB) {
    const sub = rows.filter(r => r.b === lb)
    nB[lb] = sub.length
    meanB[lb] = sub.reduce((s, r) => s + r.y, 0) / sub.length
  }

  // Cell means
  const cellMean = {}
  const cellN = {}
  for (const key of Object.keys(cells)) {
    const vals = cells[key]
    cellN[key] = vals.length
    cellMean[key] = vals.reduce((s, v) => s + v, 0) / vals.length
  }

  // === Sum of Squares ===
  // SS_total = Σ (y - grandMean)²
  const SS_total = rows.reduce((s, r) => s + (r.y - grandMean) ** 2, 0)

  // SS_A = Σ_i n_i (meanA_i - grandMean)²
  const SS_A = levelsA.reduce(
    (s, la) => s + nA[la] * (meanA[la] - grandMean) ** 2, 0
  )

  // SS_B = Σ_j n_j (meanB_j - grandMean)²
  const SS_B = levelsB.reduce(
    (s, lb) => s + nB[lb] * (meanB[lb] - grandMean) ** 2, 0
  )

  // SS_cells = Σ_ij n_ij (cellMean_ij - grandMean)²  (between-cells)
  const SS_cells = Object.keys(cellMean).reduce(
    (s, k) => s + cellN[k] * (cellMean[k] - grandMean) ** 2, 0
  )

  // SS_within = Σ Σ (y_ijk - cellMean_ij)²
  const SS_within = rows.reduce((s, r) => {
    const k = `${r.a}\x1f${r.b}`
    return s + (r.y - cellMean[k]) ** 2
  }, 0)

  // SS_AB = SS_cells - SS_A - SS_B
  // (Untuk balanced design ini eksak; untuk unbalanced ini approx Type III)
  const SS_AB = Math.max(0, SS_cells - SS_A - SS_B)

  // === Degrees of freedom ===
  const df_A = aN - 1
  const df_B = bN - 1
  const df_AB = (aN - 1) * (bN - 1)
  const df_total = N - 1

  // === Mean squares ===
  const MS_A = SS_A / df_A
  const MS_B = SS_B / df_B
  const MS_AB = SS_AB / df_AB
  const MS_within = SS_within / dfWithin

  // === F statistics & p-values ===
  const F_A = MS_A / MS_within
  const F_B = MS_B / MS_within
  const F_AB = MS_AB / MS_within

  const safeP = (F, df1, df2) => {
    if (!isFinite(F) || F < 0) return 1
    return Math.max(0, Math.min(1, 1 - jstat.centralF.cdf(F, df1, df2)))
  }
  const p_A = safeP(F_A, df_A, dfWithin)
  const p_B = safeP(F_B, df_B, dfWithin)
  const p_AB = safeP(F_AB, df_AB, dfWithin)

  // === Effect sizes (eta², partial eta²) ===
  const etaSq_A  = SS_A  / SS_total
  const etaSq_B  = SS_B  / SS_total
  const etaSq_AB = SS_AB / SS_total

  const partialEtaSq_A  = SS_A  / (SS_A  + SS_within)
  const partialEtaSq_B  = SS_B  / (SS_B  + SS_within)
  const partialEtaSq_AB = SS_AB / (SS_AB + SS_within)

  const interpretEta = (e) => {
    const a = Math.abs(e)
    if (a < 0.01) return 'kecil sekali'
    if (a < 0.06) return 'kecil'
    if (a < 0.14) return 'sedang'
    return 'besar'
  }

  // === Cell descriptive table (untuk display) ===
  const cellTable = []
  for (const la of levelsA) {
    for (const lb of levelsB) {
      const k = `${la}\x1f${lb}`
      const vals = cells[k] || []
      const mean = cellMean[k]
      const sd = vals.length > 1
        ? Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1))
        : 0
      cellTable.push({
        levelA: la,
        levelB: lb,
        n: vals.length,
        mean: Number(mean.toFixed(4)),
        sd: Number(sd.toFixed(4)),
      })
    }
  }

  // Marginal means table
  const marginalA = levelsA.map(la => ({
    level: la, n: nA[la], mean: Number(meanA[la].toFixed(4)),
  }))
  const marginalB = levelsB.map(lb => ({
    level: lb, n: nB[lb], mean: Number(meanB[lb].toFixed(4)),
  }))

  // === Build full ANOVA table ===
  const anovaTable = [
    {
      source: nameA,
      SS: SS_A, df: df_A, MS: MS_A, F: F_A, pValue: p_A,
      etaSquared: etaSq_A, partialEtaSquared: partialEtaSq_A,
      effectSize: interpretEta(partialEtaSq_A),
      significant: p_A < alpha,
    },
    {
      source: nameB,
      SS: SS_B, df: df_B, MS: MS_B, F: F_B, pValue: p_B,
      etaSquared: etaSq_B, partialEtaSquared: partialEtaSq_B,
      effectSize: interpretEta(partialEtaSq_B),
      significant: p_B < alpha,
    },
    {
      source: `${nameA} × ${nameB}`,
      SS: SS_AB, df: df_AB, MS: MS_AB, F: F_AB, pValue: p_AB,
      etaSquared: etaSq_AB, partialEtaSquared: partialEtaSq_AB,
      effectSize: interpretEta(partialEtaSq_AB),
      significant: p_AB < alpha,
    },
    {
      source: 'Residual',
      SS: SS_within, df: dfWithin, MS: MS_within,
      F: null, pValue: null, etaSquared: null, partialEtaSquared: null,
      effectSize: null, significant: null,
    },
    {
      source: 'Total',
      SS: SS_total, df: df_total, MS: null,
      F: null, pValue: null, etaSquared: null, partialEtaSquared: null,
      effectSize: null, significant: null,
    },
  ]

  // === Detect imbalance ===
  const cellSizes = Object.values(cellN)
  const isBalanced = new Set(cellSizes).size === 1

  return {
    error: null,
    test: 'Two-Way ANOVA',
    nameA, nameB,
    N,
    alpha,
    isBalanced,
    cellSizesRange: { min: Math.min(...cellSizes), max: Math.max(...cellSizes) },
    levelsA, levelsB,
    grandMean: Number(grandMean.toFixed(4)),

    // Main effects & interaction
    factorA:       anovaTable[0],
    factorB:       anovaTable[1],
    interaction:   anovaTable[2],
    residual:      anovaTable[3],
    total:         anovaTable[4],
    anovaTable,

    // Descriptives
    cellTable,
    marginalA,
    marginalB,

    // Verdicts (booleans for easy UI)
    significantA:           p_A < alpha,
    significantB:           p_B < alpha,
    significantInteraction: p_AB < alpha,
  }
}

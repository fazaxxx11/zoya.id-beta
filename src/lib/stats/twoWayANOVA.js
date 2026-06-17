// Two-Way ANOVA (Factorial Design)
// =================================
// Menghitung pengaruh dua faktor kategorik (A & B) terhadap satu outcome
// numerik, plus interaksi A×B. Cocok untuk desain faktorial 2x2, 2x3, 3x4 dst.
//
// Model: Y_ijk = μ + α_i + β_j + (αβ)_ij + ε_ijk
//
// Uses Type II Sum of Squares (same as R default, statsmodels typ=2).
// Each main effect is adjusted for the other main effect (but not interaction).
// Interaction is adjusted for both main effects.

import jstat from 'jstat'

// === Simple matrix operations for OLS ===
function matTranspose(A) {
  const rows = A.length, cols = A[0].length
  const AT = Array.from({ length: cols }, () => new Float64Array(rows))
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      AT[j][i] = A[i][j]
  return AT
}

function matMul(A, B) {
  const m = A.length, n = B[0].length, k = B.length
  const C = Array.from({ length: m }, () => new Float64Array(n))
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++) {
      let s = 0
      for (let l = 0; l < k; l++) s += A[i][l] * B[l][j]
      C[i][j] = s
    }
  return C
}

function matVecMul(A, v) {
  const m = A.length, n = v.length
  const result = new Float64Array(m)
  for (let i = 0; i < m; i++) {
    let s = 0
    for (let j = 0; j < n; j++) s += A[i][j] * v[j]
    result[i] = s
  }
  return result
}

function vecSub(a, b) {
  const r = new Float64Array(a.length)
  for (let i = 0; i < a.length; i++) r[i] = a[i] - b[i]
  return r
}

function vecNormSq(v) {
  let s = 0
  for (let i = 0; i < v.length; i++) s += v[i] * v[i]
  return s
}

// Solve Ax = b via Gauss-Jordan with partial pivoting
function solveLinearSystem(A, b) {
  const n = A.length
  // Augmented matrix [A | b]
  const M = A.map((row, i) => {
    const augmented = new Float64Array(n + 1)
    for (let j = 0; j < n; j++) augmented[j] = row[j]
    augmented[n] = b[i]
    return augmented
  })

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxVal = Math.abs(M[col][col])
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > maxVal) {
        maxVal = Math.abs(M[row][col])
        maxRow = row
      }
    }
    if (maxVal < 1e-12) continue // near-singular
    if (maxRow !== col) { const tmp = M[col]; M[col] = M[maxRow]; M[maxRow] = tmp }

    // Eliminate below
    const pivot = M[col][col]
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / pivot
      for (let j = col; j <= n; j++) M[row][j] -= factor * M[col][j]
    }
  }

  // Back substitution
  const x = new Float64Array(n)
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n]
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]
    x[i] = M[i][i] !== 0 ? s / M[i][i] : 0
  }
  return x
}

function olsRSS(X, y) {
  // RSS = ||y - Xβ̂||² where β̂ = (X'X)⁻¹X'y
  const XT = matTranspose(X)
  const XTX = matMul(XT, X)
  const XTy = matVecMul(XT, y)
  const beta = solveLinearSystem(XTX, XTy)
  const yhat = matVecMul(X, beta)
  const resid = vecSub(y, yhat)
  return vecNormSq(resid)
}

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

  // Cell map: {a}\x1f{b} → values[]
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
  const SS_total = rows.reduce((s, r) => s + (r.y - grandMean) ** 2, 0)

  // SS_within (residual) = Σ (y - cellMean)² — same for all SS types
  const SS_within = rows.reduce((s, r) => {
    const k = `${r.a}\x1f${r.b}`
    return s + (r.y - cellMean[k]) ** 2
  }, 0)

  // === Type II Sum of Squares via OLS regression ===
  const yVec = Float64Array.from(rows.map(r => r.y))

  // Reference level = last level alphabetically (same as R/Python treatment coding)
  const refA = levelsA[aN - 1]
  const refB = levelsB[bN - 1]
  const nonRefA = levelsA.slice(0, -1)
  const nonRefB = levelsB.slice(0, -1)

  // Build design matrices (all include intercept column)
  // X_A: intercept + A dummies (for RSS_A model)
  // X_B: intercept + B dummies (for RSS_B model)
  // X_AB: intercept + A dummies + B dummies (for RSS_additive model)
  // X_full: intercept + A dummies + B dummies + AB interactions (for RSS_full model)

  const buildXA = () => {
    const X = Array.from({ length: N }, () => new Float64Array(1 + nonRefA.length))
    for (let i = 0; i < N; i++) {
      X[i][0] = 1 // intercept
      for (let j = 0; j < nonRefA.length; j++) {
        X[i][1 + j] = rows[i].a === nonRefA[j] ? 1 : 0
      }
    }
    return X
  }

  const buildXB = () => {
    const X = Array.from({ length: N }, () => new Float64Array(1 + nonRefB.length))
    for (let i = 0; i < N; i++) {
      X[i][0] = 1
      for (let j = 0; j < nonRefB.length; j++) {
        X[i][1 + j] = rows[i].b === nonRefB[j] ? 1 : 0
      }
    }
    return X
  }

  const buildXAB = () => {
    const nCols = 1 + nonRefA.length + nonRefB.length
    const X = Array.from({ length: N }, () => new Float64Array(nCols))
    for (let i = 0; i < N; i++) {
      X[i][0] = 1
      for (let j = 0; j < nonRefA.length; j++) {
        X[i][1 + j] = rows[i].a === nonRefA[j] ? 1 : 0
      }
      for (let j = 0; j < nonRefB.length; j++) {
        X[i][1 + nonRefA.length + j] = rows[i].b === nonRefB[j] ? 1 : 0
      }
    }
    return X
  }

  const buildXFull = () => {
    const nCols = 1 + nonRefA.length + nonRefB.length + nonRefA.length * nonRefB.length
    const X = Array.from({ length: N }, () => new Float64Array(nCols))
    for (let i = 0; i < N; i++) {
      X[i][0] = 1
      let col = 1
      for (let j = 0; j < nonRefA.length; j++) {
        X[i][col++] = rows[i].a === nonRefA[j] ? 1 : 0
      }
      for (let j = 0; j < nonRefB.length; j++) {
        X[i][col++] = rows[i].b === nonRefB[j] ? 1 : 0
      }
      for (let ja = 0; ja < nonRefA.length; ja++) {
        for (let jb = 0; jb < nonRefB.length; jb++) {
          X[i][col++] = (rows[i].a === nonRefA[ja] && rows[i].b === nonRefB[jb]) ? 1 : 0
        }
      }
    }
    return X
  }

  // Compute RSS for each model
  const RSS_A = olsRSS(buildXA(), yVec)      // Y ~ A
  const RSS_B = olsRSS(buildXB(), yVec)      // Y ~ B
  const RSS_AB = olsRSS(buildXAB(), yVec)    // Y ~ A + B (additive)
  const RSS_full = olsRSS(buildXFull(), yVec) // Y ~ A + B + A:B

  // Type II SS
  const SS_A = RSS_B - RSS_AB        // R(A|B)
  const SS_B = RSS_A - RSS_AB        // R(B|A)
  const SS_AB = Math.max(0, RSS_AB - RSS_full) // R(AB|A,B)

  // SS_cells for display
  const SS_cells = SS_total - SS_within

  // === Degrees of freedom ===
  const df_A = aN - 1
  const df_B = bN - 1
  const df_AB = (aN - 1) * (bN - 1)
  const df_total = N - 1

  // === Mean squares ===
  const MS_A = SS_A / df_A
  const MS_B = SS_B / df_B
  const MS_AB = SS_AB / df_AB
  const MS_within = RSS_full / dfWithin

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

  const partialEtaSq_A  = SS_A  / (SS_A  + RSS_full)
  const partialEtaSq_B  = SS_B  / (SS_B  + RSS_full)
  const partialEtaSq_AB = SS_AB / (SS_AB + RSS_full)

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
      SS: RSS_full, df: dfWithin, MS: MS_within,
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

// Regresi Linear: Sederhana & Berganda
// Menggunakan OLS (Ordinary Least Squares).
// Assumption checks: Durbin-Watson (autocorrelation), Breusch-Pagan (heteroscedasticity),
// VIF (multikolinearitas, multiple only), residual normality (Shapiro-Wilk).

import jstat from 'jstat'
import { durbinWatson, breuschPagan } from './assumptions'
import { testNormality } from './normality'

/**
 * Regresi linear sederhana (1 predictor).
 * @param {number[]} x - predictor
 * @param {number[]} y - outcome
 */
export function simpleLinearRegression(x, y, alpha = 0.05) {
  const pairs = x.map((v, i) => [v, y[i]])
                 .filter(([a, b]) => typeof a === 'number' && typeof b === 'number'
                                     && !isNaN(a) && !isNaN(b))
  const n = pairs.length
  if (n < 3) return { error: 'Sampel minimal 3' }

  const xs = pairs.map(p => p[0])
  const ys = pairs.map(p => p[1])
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n

  let sxx = 0, sxy = 0, syy = 0
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2
    sxy += (xs[i] - mx) * (ys[i] - my)
    syy += (ys[i] - my) ** 2
  }

  if (sxx === 0) return { error: 'Variansi predictor = 0' }

  const b1 = sxy / sxx        // slope
  const b0 = my - b1 * mx     // intercept

  // Predicted & residuals
  const yPred = xs.map(xi => b0 + b1 * xi)
  const residuals = ys.map((yi, i) => yi - yPred[i])
  const ssRes = residuals.reduce((s, r) => s + r * r, 0)
  const ssTot = syy
  const rSquared = 1 - ssRes / ssTot
  const adjR2 = 1 - ((1 - rSquared) * (n - 1)) / (n - 2)

  // Standard errors
  const mse = ssRes / (n - 2)         // Mean Square Error
  const seB1 = Math.sqrt(mse / sxx)
  const seB0 = Math.sqrt(mse * (1 / n + (mx ** 2) / sxx))
  const seEst = Math.sqrt(mse)         // Standard error of estimate

  // t-statistics & p-values
  const tB1 = b1 / seB1
  const tB0 = b0 / seB0
  const df = n - 2
  const pB1 = 2 * (1 - jstat.studentt.cdf(Math.abs(tB1), df))
  const pB0 = 2 * (1 - jstat.studentt.cdf(Math.abs(tB0), df))

  // F-test (overall)
  const ssReg = ssTot - ssRes
  const F = (ssReg / 1) / (ssRes / df)
  const pF = 1 - jstat.centralF.cdf(F, 1, df)

  // 95% CI
  const tCrit = jstat.studentt.inv(1 - alpha / 2, df)
  const ciB1 = [b1 - tCrit * seB1, b1 + tCrit * seB1]
  const ciB0 = [b0 - tCrit * seB0, b0 + tCrit * seB0]

  // Standardized coefficient (Beta)
  const sx = Math.sqrt(sxx / (n - 1))
  const sy = Math.sqrt(syy / (n - 1))
  const beta = b1 * (sx / sy)

  // Assumption checks on residuals
  const dw = durbinWatson(residuals)
  const bp = breuschPagan(residuals, [xs])
  const residualNormality = testNormality(residuals, alpha)

  return {
    test: 'Regresi Linier Sederhana',
    n, df,
    intercept: b0,
    slope: b1,
    standardizedBeta: beta,
    rSquared,
    adjustedR2: adjR2,
    standardErrorOfEstimate: seEst,
    F, pF,
    intercept_t: tB0, intercept_p: pB0, intercept_se: seB0, intercept_ci: ciB0,
    slope_t: tB1, slope_p: pB1, slope_se: seB1, slope_ci: ciB1,
    equation: `Y = ${b0.toFixed(3)} + ${b1.toFixed(3)} × X`,
    residuals,
    yPred,
    significant: pF < alpha,
    // Assumption diagnostics (APA 7 / classical OLS)
    assumptions: {
      durbinWatson: dw,
      breuschPagan: bp,
      residualNormality,
    },
    interpretation: buildSimpleRegressionInterpretation(b0, b1, beta, rSquared, F, df, pF, n, alpha, dw, bp, residualNormality),
  }
}

/**
 * Regresi linear berganda (multiple predictors).
 * Pakai OLS via matrix algebra: β = (XᵀX)⁻¹ Xᵀy
 *
 * @param {Array<Array<number>>} X - matrix [n][p] predictors
 * @param {number[]} y - outcome
 * @param {string[]} predictorNames - nama predictor
 */
export function multipleLinearRegression(X, y, predictorNames = null, alpha = 0.05) {
  // Validate & filter NA pairwise
  const valid = []
  for (let i = 0; i < y.length; i++) {
    const row = X.map(col => col[i])
    if (row.every(v => typeof v === 'number' && !isNaN(v))
        && typeof y[i] === 'number' && !isNaN(y[i])) {
      valid.push({ x: row, y: y[i] })
    }
  }
  const n = valid.length
  const p = X.length // jumlah predictor
  if (n < p + 2) return { error: `Sampel terlalu kecil (n=${n}, butuh minimal ${p + 2})` }

  const names = predictorNames || X.map((_, i) => `X${i + 1}`)

  // Add intercept column
  const Xmat = valid.map(r => [1, ...r.x])
  const yVec = valid.map(r => r.y)

  // β = (XᵀX)⁻¹ Xᵀy
  const Xt = transpose(Xmat)
  const XtX = matMul(Xt, Xmat)
  const XtX_inv = invert(XtX)
  if (!XtX_inv) return { error: 'Matrix tidak dapat diinversi (multikolinearitas berat?)' }
  const Xty = matVecMul(Xt, yVec)
  const beta = matVecMul(XtX_inv, Xty) // [intercept, b1, b2, ...]

  // Predicted & residuals
  const yPred = Xmat.map(row => row.reduce((s, v, i) => s + v * beta[i], 0))
  const residuals = yVec.map((y, i) => y - yPred[i])
  const ssRes = residuals.reduce((s, r) => s + r * r, 0)
  const meanY = yVec.reduce((a, b) => a + b, 0) / n
  const ssTot = yVec.reduce((s, y) => s + (y - meanY) ** 2, 0)
  const ssReg = ssTot - ssRes
  const rSquared = 1 - ssRes / ssTot
  const adjR2 = 1 - ((1 - rSquared) * (n - 1)) / (n - p - 1)

  const mse = ssRes / (n - p - 1)
  const seBeta = XtX_inv.map((row, i) => Math.sqrt(row[i] * mse))

  const tStat = beta.map((b, i) => b / seBeta[i])
  const dfRes = n - p - 1
  const pVal = tStat.map(t => 2 * (1 - jstat.studentt.cdf(Math.abs(t), dfRes)))

  // Overall F-test
  const F = (ssReg / p) / mse
  const pF = 1 - jstat.centralF.cdf(F, p, dfRes)

  // Coefficients table
  const coeffs = [
    { name: '(Intercept)', b: beta[0], se: seBeta[0], t: tStat[0], p: pVal[0] },
    ...names.map((nm, i) => ({
      name: nm,
      b: beta[i + 1],
      se: seBeta[i + 1],
      t: tStat[i + 1],
      p: pVal[i + 1],
    })),
  ]

  // VIF (Variance Inflation Factor) untuk multikolinearitas
  const vifs = []
  if (p >= 2) {
    for (let j = 0; j < p; j++) {
      const Xj = X[j].filter((_, i) => valid[i] !== undefined)
      const others = X.filter((_, k) => k !== j)
      const otherCols = valid.map(r => r.x.filter((_, k) => k !== j))
      try {
        const subResult = multipleLinearRegression(
          transpose(otherCols),
          Xj.slice(0, n),
          null,
          alpha
        )
        if (!subResult.error) {
          vifs.push({ predictor: names[j], vif: 1 / (1 - subResult.rSquared) })
        } else {
          vifs.push({ predictor: names[j], vif: NaN })
        }
      } catch {
        vifs.push({ predictor: names[j], vif: NaN })
      }
    }
  }

  // Assumption checks on residuals
  const dw = durbinWatson(residuals)
  const validIdx = []
  for (let i = 0; i < y.length; i++) {
    const row = X.map(col => col[i])
    if (row.every(v => typeof v === 'number' && !isNaN(v))
        && typeof y[i] === 'number' && !isNaN(y[i])) {
      validIdx.push(i)
    }
  }
  const Xclean = X.map(col => validIdx.map(i => col[i]))
  const bp = breuschPagan(residuals, Xclean)
  const residualNormality = testNormality(residuals, alpha)

  return {
    test: 'Regresi Linier Berganda',
    n, p, dfRes,
    coefficients: coeffs,
    rSquared,
    adjustedR2: adjR2,
    standardErrorOfEstimate: Math.sqrt(mse),
    F, pF,
    ssReg, ssRes, ssTot,
    significant: pF < alpha,
    vifs,
    multicollinearity: vifs.some(v => v.vif > 10) ? 'TERDETEKSI (VIF > 10)' : 'Tidak terdeteksi',
    equation: 'Y = ' + coeffs.map((c, i) => i === 0 ? c.b.toFixed(3) : `${c.b >= 0 ? '+ ' : '- '}${Math.abs(c.b).toFixed(3)} × ${c.name}`).join(' '),
    residuals,
    // Assumption diagnostics (APA 7 / classical OLS)
    assumptions: {
      durbinWatson: dw,
      breuschPagan: bp,
      residualNormality,
    },
    interpretation: buildMultipleRegressionInterpretation(coeffs, rSquared, adjR2, F, p, dfRes, pF, n, alpha, vifs, dw, bp, residualNormality),
  }
}

// ===== Matrix utilities =====
function transpose(M) {
  const rows = M.length, cols = M[0].length
  const T = Array.from({ length: cols }, () => new Array(rows))
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) T[j][i] = M[i][j]
  return T
}
function matMul(A, B) {
  const rows = A.length, cols = B[0].length, inner = B.length
  const C = Array.from({ length: rows }, () => new Array(cols).fill(0))
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      for (let k = 0; k < inner; k++)
        C[i][j] += A[i][k] * B[k][j]
  return C
}
function matVecMul(A, v) {
  return A.map(row => row.reduce((s, a, i) => s + a * v[i], 0))
}
/** Invert n×n matrix via Gauss-Jordan. Return null if singular. */
function invert(M) {
  const n = M.length
  const A = M.map((row, i) => [...row, ...row.map((_, j) => i === j ? 1 : 0)])
  for (let i = 0; i < n; i++) {
    // Pivot
    let maxRow = i
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]]
    if (Math.abs(A[i][i]) < 1e-12) return null
    // Normalize row
    const pv = A[i][i]
    for (let j = 0; j < 2 * n; j++) A[i][j] /= pv
    // Eliminate
    for (let k = 0; k < n; k++) {
      if (k === i) continue
      const factor = A[k][i]
      for (let j = 0; j < 2 * n; j++) A[k][j] -= factor * A[i][j]
    }
  }
  return A.map(row => row.slice(n))
}

function buildSimpleRegressionInterpretation(b0, b1, beta, r2, F, df, pF, n, alpha, dw, bp, residualNormality) {
  const sig = pF < alpha
  let txt = `Model regresi sederhana ${sig ? 'SIGNIFIKAN' : 'TIDAK SIGNIFIKAN'} `
       + `[F(1, ${df}) = ${F.toFixed(3)}, p = ${pF.toFixed(4)}]. `
       + `R² = ${r2.toFixed(3)} (${(r2 * 100).toFixed(1)}% varians Y dijelaskan). `
       + `Persamaan: Y = ${b0.toFixed(3)} + ${b1.toFixed(3)}X. `
       + `n = ${n}. `
  txt += buildAssumptionsBlurb(dw, bp, residualNormality)
  return txt
}

function buildMultipleRegressionInterpretation(coeffs, r2, adjR2, F, p, df, pF, n, alpha, vifs, dw, bp, residualNormality) {
  const sig = pF < alpha
  const sigPredictors = coeffs.slice(1).filter(c => c.p < alpha)
  let txt = `Model regresi berganda ${sig ? 'SIGNIFIKAN' : 'TIDAK SIGNIFIKAN'} `
       + `[F(${p}, ${df}) = ${F.toFixed(3)}, p = ${pF.toFixed(4)}]. `
       + `R² = ${r2.toFixed(3)}, Adj. R² = ${adjR2.toFixed(3)} `
       + `(${(adjR2 * 100).toFixed(1)}% varians dijelaskan). `
       + `Predictor signifikan: ${sigPredictors.length === 0 ? 'tidak ada' : sigPredictors.map(c => c.name).join(', ')}. `
       + `n = ${n}. `
  if (vifs && vifs.length) {
    const maxVif = Math.max(...vifs.map(v => v.vif).filter(v => isFinite(v)))
    txt += `VIF max = ${maxVif.toFixed(2)} ${maxVif > 10 ? '(MULTIKOLINEARITAS!)' : '(OK)'}. `
  }
  txt += buildAssumptionsBlurb(dw, bp, residualNormality)
  return txt
}

function buildAssumptionsBlurb(dw, bp, residualNormality) {
  const parts = []
  if (dw && !dw.error) {
    parts.push(`Durbin-Watson = ${dw.DW.toFixed(3)} (${dw.DW >= 1.5 && dw.DW <= 2.5 ? 'OK' : 'autokorelasi!'})`)
  }
  if (bp && !bp.error) {
    parts.push(`Breusch-Pagan p = ${bp.pValue.toFixed(4)} (${bp.homoscedastic ? 'homoscedastic' : 'heteroscedastic!'})`)
  }
  if (residualNormality && !residualNormality.error) {
    parts.push(`Normalitas residual: ${residualNormality.method} p = ${residualNormality.pValue.toFixed(4)} (${residualNormality.isNormal ? 'normal' : 'tidak normal!'})`)
  }
  return parts.length > 0 ? `Diagnostik asumsi: ${parts.join('; ')}.` : ''
}

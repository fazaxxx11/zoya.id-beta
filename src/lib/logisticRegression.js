// ============================================================
// Binary Logistic Regression
// ============================================================
// Implementasi sederhana logistic regression untuk outcome biner (0/1).
// Algoritma: Newton-Raphson / Iteratively Reweighted Least Squares (IRLS).
//
// Output:
//   - Koefisien β + SE + Wald z + p-value
//   - Odds Ratios + 95% CI
//   - Pseudo R² (McFadden, Cox-Snell, Nagelkerke)
//   - Log-likelihood, deviance
//   - Hosmer-Lemeshow goodness-of-fit
//   - Classification table (sensitivity, specificity, accuracy)
//   - ROC curve + AUC
//
// Cocok untuk: prediksi lulus/tidak, beli/tidak, sehat/sakit, dst.

import jstat from 'jstat'

// ============================================================
// Sigmoid + helpers
// ============================================================
function sigmoid(z) {
  if (z >= 0) {
    const ez = Math.exp(-z)
    return 1 / (1 + ez)
  } else {
    const ez = Math.exp(z)
    return ez / (1 + ez)
  }
}

function transpose(m) { return m[0].map((_, j) => m.map(r => r[j])) }
function matMul(a, b) {
  const out = Array.from({ length: a.length }, () => new Array(b[0].length).fill(0))
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b[0].length; j++) {
      let s = 0
      for (let k = 0; k < b.length; k++) s += a[i][k] * b[k][j]
      out[i][j] = s
    }
  return out
}
function matVec(m, v) {
  return m.map(row => row.reduce((s, x, i) => s + x * v[i], 0))
}
function invert(m) {
  const n = m.length
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)])
  for (let i = 0; i < n; i++) {
    let piv = a[i][i]
    if (Math.abs(piv) < 1e-12) {
      let swapped = false
      for (let r = i + 1; r < n; r++) if (Math.abs(a[r][i]) > 1e-12) { [a[i], a[r]] = [a[r], a[i]]; piv = a[i][i]; swapped = true; break }
      if (!swapped) return null
    }
    for (let j = 0; j < 2 * n; j++) a[i][j] /= piv
    for (let r = 0; r < n; r++) if (r !== i) {
      const f = a[r][i]
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[i][j]
    }
  }
  return a.map(row => row.slice(n))
}

// ============================================================
// Fit binary logistic regression via IRLS / Newton-Raphson
// ============================================================
/**
 * Fit binary logistic regression.
 *
 * @param {number[][]} X  - n × p matrix (without intercept; auto-added)
 * @param {number[]}   y  - n length, values 0 or 1
 * @param {object} [opts]
 * @param {string[]} [opts.predictorNames] - nama variabel
 * @param {number} [opts.maxIter=50]
 * @param {number} [opts.tol=1e-6]
 * @param {number} [opts.alpha=0.05] - untuk CI odds ratio
 * @returns {object}
 */
export function fitLogistic(X, y, opts = {}) {
  const { maxIter = 50, tol = 1e-6, alpha = 0.05, predictorNames = null } = opts

  // Validate inputs
  if (!Array.isArray(X) || !Array.isArray(y)) throw new Error('X dan y harus array')
  if (X.length !== y.length) throw new Error(`Panjang X (${X.length}) ≠ y (${y.length})`)

  // Validate y values: must be 0 or 1 (or NaN for missing — those filtered)
  for (let i = 0; i < y.length; i++) {
    const yi = y[i]
    if (yi === 0 || yi === 1) continue
    if (typeof yi === 'number' && isNaN(yi)) continue
    if (yi === null || yi === undefined) continue
    throw new Error(`y[${i}] = ${yi} bukan 0 atau 1. Logistic regression butuh outcome biner.`)
  }

  // Filter rows with NaN/missing
  const valid = []
  for (let i = 0; i < y.length; i++) {
    const row = X[i]
    if (!Array.isArray(row)) continue
    if (row.every(v => typeof v === 'number' && isFinite(v))
        && (y[i] === 0 || y[i] === 1)) {
      valid.push({ x: row, y: y[i] })
    }
  }
  const n = valid.length
  if (n === 0) throw new Error('Tidak ada data valid (cek y harus 0 atau 1)')

  const p = valid[0].x.length
  if (n < p + 2) throw new Error(`Sampel terlalu kecil (n=${n}, butuh >= ${p + 2})`)

  // Check class balance
  const nPos = valid.filter(v => v.y === 1).length
  const nNeg = n - nPos
  if (nPos === 0 || nNeg === 0) throw new Error('y harus mengandung nilai 0 dan 1')

  const names = predictorNames || X[0].map((_, i) => `X${i + 1}`)

  // Add intercept column
  const Xmat = valid.map(v => [1, ...v.x])
  const yVec = valid.map(v => v.y)
  const k = p + 1  // total parameters including intercept

  // Initialize β to 0
  let beta = new Array(k).fill(0)

  // IRLS iterations
  let iter = 0
  let logLik = -Infinity
  let converged = false
  let lastVcov = null

  for (iter = 0; iter < maxIter; iter++) {
    // Compute predictions and weights
    const eta = Xmat.map(row => row.reduce((s, v, i) => s + v * beta[i], 0))
    const probs = eta.map(sigmoid)
    const weights = probs.map(pi => pi * (1 - pi))

    // Hessian = -X' W X; we want vcov = (X' W X)^-1
    // Score = X' (y - p)
    const XtWX = Array.from({ length: k }, () => new Array(k).fill(0))
    for (let i = 0; i < n; i++) {
      const w = weights[i]
      for (let a = 0; a < k; a++) {
        for (let bIdx = 0; bIdx < k; bIdx++) {
          XtWX[a][bIdx] += w * Xmat[i][a] * Xmat[i][bIdx]
        }
      }
    }
    const score = new Array(k).fill(0)
    for (let i = 0; i < n; i++) {
      const diff = yVec[i] - probs[i]
      for (let a = 0; a < k; a++) score[a] += Xmat[i][a] * diff
    }

    const XtWXinv = invert(XtWX)
    if (!XtWXinv) throw new Error('Matrix Fisher singular — coba kurangi predictor atau periksa multikolinearitas')

    // Newton step: β_new = β + H^-1 score
    const step = matVec(XtWXinv, score)
    const newBeta = beta.map((b, i) => b + step[i])

    // Compute new log-likelihood
    const newEta = Xmat.map(row => row.reduce((s, v, i) => s + v * newBeta[i], 0))
    const newLogLik = newEta.reduce((s, e, i) => {
      // log(p^y * (1-p)^(1-y)) — numerically stable
      const yi = yVec[i]
      // log(sigmoid(e)) = -log(1+exp(-e)) for e>=0, = e - log(1+exp(e)) for e<0
      const logP = e >= 0 ? -Math.log(1 + Math.exp(-e)) : e - Math.log(1 + Math.exp(e))
      const log1mP = e >= 0 ? -e - Math.log(1 + Math.exp(-e)) : -Math.log(1 + Math.exp(e))
      return s + (yi === 1 ? logP : log1mP)
    }, 0)

    // Convergence check
    const maxStep = Math.max(...step.map(Math.abs))
    beta = newBeta
    logLik = newLogLik
    lastVcov = XtWXinv

    if (maxStep < tol) { converged = true; break }
  }

  if (!lastVcov) throw new Error('Fit gagal — tidak ada iterasi tercapai')

  // Standard errors, Wald z, p-values
  const se = lastVcov.map((row, i) => Math.sqrt(row[i]))
  const z = beta.map((b, i) => b / se[i])
  const pVal = z.map(zv => 2 * (1 - jstat.normal.cdf(Math.abs(zv), 0, 1)))

  // Odds ratios + CI
  const zCrit = jstat.normal.inv(1 - alpha / 2, 0, 1)
  const odds = beta.map(b => Math.exp(b))
  const oddsLo = beta.map((b, i) => Math.exp(b - zCrit * se[i]))
  const oddsHi = beta.map((b, i) => Math.exp(b + zCrit * se[i]))

  // Null model log-likelihood (intercept only)
  const yMean = nPos / n
  const logLikNull = nPos * Math.log(yMean) + nNeg * Math.log(1 - yMean)

  // Pseudo R²
  const llr = -2 * (logLikNull - logLik)        // likelihood ratio chi-square
  const llrDf = p
  const llrP = 1 - jstat.chisquare.cdf(llr, llrDf)
  const mcfadden = 1 - logLik / logLikNull
  const coxSnell = 1 - Math.exp((2 / n) * (logLikNull - logLik))
  const maxCoxSnell = 1 - Math.exp((2 / n) * logLikNull)
  const nagelkerke = maxCoxSnell > 0 ? coxSnell / maxCoxSnell : 0
  const deviance = -2 * logLik
  const aic = deviance + 2 * k
  const bic = deviance + k * Math.log(n)

  // Coefficients table
  const coefs = [
    {
      name: '(Intercept)', b: beta[0], se: se[0], z: z[0], p: pVal[0],
      odds: odds[0], oddsLow: oddsLo[0], oddsHigh: oddsHi[0],
    },
    ...names.map((nm, i) => ({
      name: nm, b: beta[i + 1], se: se[i + 1], z: z[i + 1], p: pVal[i + 1],
      odds: odds[i + 1], oddsLow: oddsLo[i + 1], oddsHigh: oddsHi[i + 1],
    })),
  ]

  // Predicted probabilities (for downstream metrics)
  const predicted = Xmat.map(row => sigmoid(row.reduce((s, v, i) => s + v * beta[i], 0)))

  return {
    type: 'logistic',
    toolName: 'Regresi Logistik Biner',
    beta,
    coefficients: coefs,
    n, nPos, nNeg,
    iterations: iter + 1,
    converged,
    logLikelihood: logLik,
    logLikelihoodNull: logLikNull,
    deviance,
    aic, bic,
    likelihoodRatio: { chi2: llr, df: llrDf, p: llrP },
    pseudoR2: { mcfadden, coxSnell, nagelkerke },
    predicted,
    yObserved: yVec,
    alpha,
  }
}

// ============================================================
// Classification table at threshold
// ============================================================
/**
 * Build confusion matrix + classification metrics at given threshold.
 *
 * @param {number[]} yTrue       - 0/1
 * @param {number[]} yProb       - predicted probabilities
 * @param {number} [threshold=0.5]
 */
export function classificationTable(yTrue, yProb, threshold = 0.5) {
  if (yTrue.length !== yProb.length) throw new Error('Length mismatch')
  let tp = 0, tn = 0, fp = 0, fn = 0
  for (let i = 0; i < yTrue.length; i++) {
    const predicted = yProb[i] >= threshold ? 1 : 0
    if (predicted === 1 && yTrue[i] === 1) tp++
    else if (predicted === 0 && yTrue[i] === 0) tn++
    else if (predicted === 1 && yTrue[i] === 0) fp++
    else if (predicted === 0 && yTrue[i] === 1) fn++
  }
  const n = yTrue.length
  const accuracy = (tp + tn) / n
  const sensitivity = tp + fn === 0 ? 0 : tp / (tp + fn)  // recall
  const specificity = tn + fp === 0 ? 0 : tn / (tn + fp)
  const precision   = tp + fp === 0 ? 0 : tp / (tp + fp)
  const f1 = (precision + sensitivity === 0) ? 0 : 2 * precision * sensitivity / (precision + sensitivity)

  return {
    threshold, n, tp, tn, fp, fn,
    accuracy, sensitivity, specificity, precision, f1,
  }
}

// ============================================================
// ROC curve + AUC (Mann-Whitney U formula)
// ============================================================
/**
 * Compute ROC curve points and AUC.
 *
 * @returns {{ auc: number, points: Array<{fpr, tpr, threshold}> }}
 */
export function rocAUC(yTrue, yProb) {
  if (yTrue.length !== yProb.length) throw new Error('Length mismatch')
  const n = yTrue.length

  // Sort by descending probability
  const sorted = yTrue.map((t, i) => ({ t, p: yProb[i] }))
                      .sort((a, b) => b.p - a.p)

  const nPos = sorted.filter(s => s.t === 1).length
  const nNeg = n - nPos
  if (nPos === 0 || nNeg === 0) {
    return { auc: 0.5, points: [{ fpr: 0, tpr: 0, threshold: 1 }, { fpr: 1, tpr: 1, threshold: 0 }] }
  }

  // AUC via Mann-Whitney U
  // Sum ranks of positives (after sorting ascending by prob; here we sorted desc, so use position from end)
  // Easier: compute pairs concordance.
  let concordant = 0, ties = 0, total = 0
  for (let i = 0; i < n; i++) {
    if (sorted[i].t !== 1) continue
    for (let j = 0; j < n; j++) {
      if (sorted[j].t !== 0) continue
      total++
      if (sorted[i].p > sorted[j].p) concordant++
      else if (sorted[i].p === sorted[j].p) ties++
    }
  }
  const auc = (concordant + 0.5 * ties) / total

  // ROC points: sweep through sorted thresholds
  const points = [{ fpr: 0, tpr: 0, threshold: 1.0 }]
  let tp = 0, fp = 0
  let lastP = null
  for (let i = 0; i < sorted.length; i++) {
    if (lastP !== null && sorted[i].p !== lastP) {
      points.push({ fpr: fp / nNeg, tpr: tp / nPos, threshold: lastP })
    }
    if (sorted[i].t === 1) tp++; else fp++
    lastP = sorted[i].p
  }
  points.push({ fpr: 1, tpr: 1, threshold: 0 })

  return { auc, points }
}

// ============================================================
// Hosmer-Lemeshow Goodness-of-Fit test
// ============================================================
/**
 * Hosmer-Lemeshow test: bin predictions into g groups, compare observed vs expected.
 * H0: model fits well. p > 0.05 → good fit.
 *
 * @param {number[]} yTrue
 * @param {number[]} yProb
 * @param {number} [g=10] - jumlah grup (default 10)
 */
export function hosmerLemeshow(yTrue, yProb, g = 10) {
  if (yTrue.length !== yProb.length) throw new Error('Length mismatch')
  const n = yTrue.length
  if (n < g * 2) g = Math.max(2, Math.floor(n / 5))

  // Sort by probability ascending
  const sorted = yTrue.map((t, i) => ({ t, p: yProb[i] }))
                      .sort((a, b) => a.p - b.p)

  const groupSize = Math.floor(n / g)
  let chi2 = 0
  const groups = []
  for (let gi = 0; gi < g; gi++) {
    const start = gi * groupSize
    const end = (gi === g - 1) ? n : (gi + 1) * groupSize
    const slice = sorted.slice(start, end)
    const ng = slice.length
    if (ng === 0) continue
    const observed1 = slice.filter(s => s.t === 1).length
    const observed0 = ng - observed1
    const expected1 = slice.reduce((s, x) => s + x.p, 0)
    const expected0 = ng - expected1

    // Avoid division by zero
    if (expected1 > 0 && expected0 > 0) {
      chi2 += (observed1 - expected1) ** 2 / expected1
            + (observed0 - expected0) ** 2 / expected0
    }
    groups.push({ group: gi + 1, n: ng, observed1, expected1, observed0, expected0 })
  }
  const df = Math.max(1, g - 2)
  const p = 1 - jstat.chisquare.cdf(chi2, df)
  return { chi2, df, p, g, groups, fit: p > 0.05 ? 'good' : 'poor' }
}

// ============================================================
// Predict on new data
// ============================================================
/**
 * Predict probabilities for new X (without intercept; auto-added).
 */
export function predictLogistic(beta, X) {
  return X.map(row => {
    const eta = beta[0] + row.reduce((s, v, i) => s + v * beta[i + 1], 0)
    return sigmoid(eta)
  })
}

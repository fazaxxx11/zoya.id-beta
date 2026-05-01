// ============================================================
// Mediation & Moderation Analysis (PROCESS-style)
// ============================================================
// Implementasi sederhana dari Hayes' PROCESS macro untuk:
//   - Model 4: Simple Mediation (X → M → Y)
//   - Model 1: Simple Moderation (X·W → Y)
//
// Termasuk:
//   - Bootstrap percentile CI untuk indirect effect (a·b)
//   - Sobel test
//   - Conditional effects pada beberapa nilai moderator
//   - Pick-a-point analysis (Aiken & West: -1SD, mean, +1SD)
//
// Referensi:
//   Hayes, A. F. (2018). Introduction to mediation, moderation, and
//   conditional process analysis (2nd ed.). Guilford Press.

import jstat from 'jstat'

// ============================================================
// Internal: OLS regression with full vcov matrix
// ============================================================
/**
 * Run multiple linear regression. Returns coefficients + vcov matrix.
 *
 * @param {number[][]} X - matrix [n × p] without intercept
 * @param {number[]}   y - vector length n
 * @returns {{
 *   beta: number[],            // [intercept, b1, b2, ...]
 *   se: number[],              // standard errors
 *   t: number[],               // t-statistics
 *   p: number[],               // p-values
 *   rSquared: number,
 *   vcov: number[][],          // covariance matrix of beta
 *   n: number,
 *   df: number,
 *   residuals: number[],
 *   fitted: number[],
 * }}
 */
function ols(X, y) {
  const n = y.length
  const p = X[0].length
  // Add intercept
  const Xmat = X.map(row => [1, ...row])
  const Xt = transpose(Xmat)
  const XtX = matMul(Xt, Xmat)
  const XtXinv = invert(XtX)
  if (!XtXinv) throw new Error('Matriks singular (multikolinearitas berat)')
  const Xty = matVecMul(Xt, y)
  const beta = matVecMul(XtXinv, Xty)

  const fitted = Xmat.map(row => row.reduce((s, v, i) => s + v * beta[i], 0))
  const residuals = y.map((yi, i) => yi - fitted[i])
  const ssRes = residuals.reduce((s, r) => s + r * r, 0)
  const meanY = y.reduce((a, b) => a + b, 0) / n
  const ssTot = y.reduce((s, yi) => s + (yi - meanY) ** 2, 0)
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  const df = n - p - 1
  const mse = ssRes / df
  const vcov = XtXinv.map(row => row.map(v => v * mse))
  const se = vcov.map((row, i) => Math.sqrt(row[i]))
  const t = beta.map((b, i) => b / se[i])
  const pVals = t.map(tv => 2 * (1 - jstat.studentt.cdf(Math.abs(tv), df)))

  return { beta, se, t, p: pVals, rSquared, vcov, n, df, residuals, fitted }
}

// ============================================================
// MEDIATION (Hayes Model 4)
// ============================================================
/**
 * Simple mediation: X → M → Y.
 *
 * Estimasi 3 jalur:
 *   a  : X → M
 *   b  : M → Y (controlling X)
 *   c  : X → Y (total effect)
 *   c' : X → Y (direct, controlling M)
 *   ab : indirect effect = a · b
 *
 * Bootstrap percentile CI untuk ab (default 5000 resamples).
 * Sobel test sebagai pelengkap.
 *
 * @param {number[]} X
 * @param {number[]} M
 * @param {number[]} Y
 * @param {object} [opts]
 * @param {number} [opts.bootstrap=5000]
 * @param {number} [opts.alpha=0.05]
 * @param {number} [opts.seed]
 */
export function simpleMediation(X, M, Y, opts = {}) {
  const { bootstrap = 5000, alpha = 0.05, seed } = opts

  // Filter NA
  const data = []
  for (let i = 0; i < X.length; i++) {
    if (isFinite(X[i]) && isFinite(M[i]) && isFinite(Y[i])) {
      data.push({ x: X[i], m: M[i], y: Y[i] })
    }
  }
  const n = data.length
  if (n < 5) throw new Error(`Sampel terlalu kecil (n=${n}, butuh minimal 5)`)

  const xs = data.map(d => d.x)
  const ms = data.map(d => d.m)
  const ys = data.map(d => d.y)

  // Path a: M = a₀ + a·X
  const regA = ols(xs.map(v => [v]), ms)
  const a = regA.beta[1]
  const seA = regA.se[1]

  // Path c: Y = c₀ + c·X (total effect)
  const regC = ols(xs.map(v => [v]), ys)
  const c = regC.beta[1]
  const seC = regC.se[1]

  // Path c' & b: Y = c'₀ + c'·X + b·M
  const regCp = ols(xs.map((v, i) => [v, ms[i]]), ys)
  const cp = regCp.beta[1]
  const b  = regCp.beta[2]
  const seCp = regCp.se[1]
  const seB  = regCp.se[2]

  // Indirect effect
  const ab = a * b

  // Sobel test
  const sobelSE = Math.sqrt(b * b * seA * seA + a * a * seB * seB)
  const sobelZ = ab / sobelSE
  const sobelP = 2 * (1 - jstat.normal.cdf(Math.abs(sobelZ), 0, 1))

  // Bootstrap CI for ab
  const rng = seed !== undefined ? mulberry32(seed) : Math.random
  const bootAB = []
  for (let b_iter = 0; b_iter < bootstrap; b_iter++) {
    const sample = []
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(rng() * n)
      sample.push(data[idx])
    }
    try {
      const sx = sample.map(d => d.x)
      const sm = sample.map(d => d.m)
      const sy = sample.map(d => d.y)
      const ra = ols(sx.map(v => [v]), sm)
      const rcp = ols(sx.map((v, i) => [v, sm[i]]), sy)
      bootAB.push(ra.beta[1] * rcp.beta[2])
    } catch {
      // Skip degenerate samples
    }
  }
  bootAB.sort((p, q) => p - q)
  const lo = bootAB[Math.floor((alpha / 2) * bootAB.length)]
  const hi = bootAB[Math.floor((1 - alpha / 2) * bootAB.length)]

  // Effect size: kappa-squared, completely standardized indirect effect
  const sdX = Math.sqrt(variance(xs))
  const sdY = Math.sqrt(variance(ys))
  const standardizedAB = sdY === 0 ? null : (ab * sdX) / sdY

  // Type of mediation
  let mediationType = 'tidak ada'
  const cSig  = regC.p[1]  < alpha
  const bootSig = (lo > 0 && hi > 0) || (lo < 0 && hi < 0)
  const cpSig = regCp.p[1] < alpha
  if (bootSig) {
    if (!cpSig) mediationType = 'mediasi penuh (full mediation)'
    else if (Math.sign(ab) === Math.sign(cp)) mediationType = 'mediasi parsial (partial mediation)'
    else mediationType = 'inconsistent mediation (suppression)'
  } else if (cSig && !cpSig) {
    mediationType = 'kemungkinan mediasi (perlu uji bootstrap lebih ketat)'
  }

  return {
    type: 'mediation',
    toolName: 'Mediasi (Hayes Model 4)',
    n,
    paths: {
      a:  { coef: a,  se: seA, t: regA.t[1],  p: regA.p[1] },
      b:  { coef: b,  se: seB, t: regCp.t[2], p: regCp.p[2] },
      c:  { coef: c,  se: seC, t: regC.t[1],  p: regC.p[1] },
      cp: { coef: cp, se: seCp, t: regCp.t[1], p: regCp.p[1] },
    },
    indirect: {
      ab,
      standardized: standardizedAB,
      sobel: { z: sobelZ, p: sobelP, se: sobelSE },
      bootstrap: {
        n: bootAB.length,
        ciLow: lo,
        ciHigh: hi,
        significant: bootSig,
        alpha,
      },
    },
    rSquaredM: regA.rSquared,
    rSquaredYTotal: regC.rSquared,
    rSquaredYDirect: regCp.rSquared,
    mediationType,
  }
}

// ============================================================
// MODERATION (Hayes Model 1)
// ============================================================
/**
 * Simple moderation: Y = b₀ + b₁·X + b₂·W + b₃·(X·W).
 *
 * Otomatis mean-center X dan W untuk interpretasi yang lebih intuitif
 * (b₁ jadi efek X saat W = mean, dst.).
 *
 * Conditional effects dihitung pada -1SD, Mean, +1SD (Aiken & West).
 *
 * @param {number[]} X - prediktor
 * @param {number[]} W - moderator
 * @param {number[]} Y - outcome
 * @param {object} [opts]
 * @param {number} [opts.alpha=0.05]
 * @param {boolean} [opts.center=true]
 */
export function simpleModeration(X, W, Y, opts = {}) {
  const { alpha = 0.05, center = true } = opts

  // Filter NA
  const data = []
  for (let i = 0; i < X.length; i++) {
    if (isFinite(X[i]) && isFinite(W[i]) && isFinite(Y[i])) {
      data.push({ x: X[i], w: W[i], y: Y[i] })
    }
  }
  const n = data.length
  if (n < 6) throw new Error(`Sampel terlalu kecil (n=${n}, butuh minimal 6)`)

  let xs = data.map(d => d.x)
  let ws = data.map(d => d.w)
  const ys = data.map(d => d.y)

  // Mean-center
  const meanX = xs.reduce((s, v) => s + v, 0) / n
  const meanW = ws.reduce((s, v) => s + v, 0) / n
  if (center) {
    xs = xs.map(v => v - meanX)
    ws = ws.map(v => v - meanW)
  }

  const sdW = Math.sqrt(variance(data.map(d => d.w)))
  const sdX = Math.sqrt(variance(data.map(d => d.x)))
  const minX = Math.min(...data.map(d => d.x))
  const maxX = Math.max(...data.map(d => d.x))

  // Predictors: X, W, X·W
  const Xmat = xs.map((x, i) => [x, ws[i], x * ws[i]])
  const reg = ols(Xmat, ys)

  // beta indices: 0=intercept, 1=X, 2=W, 3=X·W
  const b = {
    intercept: { coef: reg.beta[0], se: reg.se[0], t: reg.t[0], p: reg.p[0] },
    X:         { coef: reg.beta[1], se: reg.se[1], t: reg.t[1], p: reg.p[1] },
    W:         { coef: reg.beta[2], se: reg.se[2], t: reg.t[2], p: reg.p[2] },
    XW:        { coef: reg.beta[3], se: reg.se[3], t: reg.t[3], p: reg.p[3] },
  }

  // Conditional effect of X at W = w*:
  //   theta_X|W=w = b1 + b3 · (w - meanW)   (if centered, just b1 + b3·w)
  // SE: sqrt(Var(b1) + w²·Var(b3) + 2w·Cov(b1, b3))
  // (using w in centered scale)
  const v11 = reg.vcov[1][1]   // Var(b1)
  const v33 = reg.vcov[3][3]   // Var(b3)
  const v13 = reg.vcov[1][3]   // Cov(b1, b3)

  const conditionalEffect = (wRawValue) => {
    const wCentered = center ? (wRawValue - meanW) : wRawValue
    const eff = b.X.coef + b.XW.coef * wCentered
    const seEff = Math.sqrt(v11 + wCentered * wCentered * v33 + 2 * wCentered * v13)
    const tEff = eff / seEff
    const pEff = 2 * (1 - jstat.studentt.cdf(Math.abs(tEff), reg.df))
    return { wValue: wRawValue, effect: eff, se: seEff, t: tEff, p: pEff }
  }

  const condLow  = conditionalEffect(meanW - sdW)
  const condMean = conditionalEffect(meanW)
  const condHigh = conditionalEffect(meanW + sdW)

  // Johnson-Neyman approximation: cari w di mana p = alpha
  // |b1 + b3·w| / SE(w) = t_crit  →  solve quadratic
  const tCrit = jstat.studentt.inv(1 - alpha / 2, reg.df)
  const jn = solveJohnsonNeyman(b.X.coef, b.XW.coef, v11, v33, v13, tCrit)
  // Convert centered → raw
  const jnRaw = jn.map(w => center ? w + meanW : w)

  return {
    type: 'moderation',
    toolName: 'Moderasi (Hayes Model 1)',
    n,
    centered: center,
    means: { X: meanX, W: meanW },
    sdX,
    sdW,
    rangeX: { min: minX, max: maxX },
    coefficients: b,
    rSquared: reg.rSquared,
    df: reg.df,
    interactionSignificant: b.XW.p < alpha,
    conditionalEffects: {
      atLow:  condLow,
      atMean: condMean,
      atHigh: condHigh,
    },
    johnsonNeyman: {
      regions: jnRaw,
      note: jnRaw.length === 0
        ? 'Tidak ada titik transisi signifikansi dalam range data.'
        : `Efek X signifikan saat W ${jnRaw.length === 1 ? '> ' + jnRaw[0].toFixed(3) : 'di luar [' + jnRaw[0].toFixed(3) + ', ' + jnRaw[1].toFixed(3) + ']'}.`,
    },
  }
}

// Solve |b1 + b3·w|² = t² · (v11 + w²·v33 + 2w·v13)
// Quadratic in w: (b3² - t²·v33)·w² + (2·b1·b3 - 2·t²·v13)·w + (b1² - t²·v11) = 0
function solveJohnsonNeyman(b1, b3, v11, v33, v13, tCrit) {
  const A = b3 * b3 - tCrit * tCrit * v33
  const B = 2 * b1 * b3 - 2 * tCrit * tCrit * v13
  const C = b1 * b1 - tCrit * tCrit * v11
  if (Math.abs(A) < 1e-12) return []  // nearly linear, no transition
  const disc = B * B - 4 * A * C
  if (disc < 0) return []
  const sq = Math.sqrt(disc)
  const r1 = (-B - sq) / (2 * A)
  const r2 = (-B + sq) / (2 * A)
  if (r1 === r2) return [r1]
  return r1 < r2 ? [r1, r2] : [r2, r1]
}

// ============================================================
// Helpers: mat ops
// ============================================================
function transpose(m) {
  return m[0].map((_, j) => m.map(row => row[j]))
}
function matMul(a, b) {
  const result = Array.from({ length: a.length }, () => new Array(b[0].length).fill(0))
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b[0].length; j++) {
      let s = 0
      for (let k = 0; k < b.length; k++) s += a[i][k] * b[k][j]
      result[i][j] = s
    }
  }
  return result
}
function matVecMul(m, v) {
  return m.map(row => row.reduce((s, x, i) => s + x * v[i], 0))
}
function invert(m) {
  // Gauss-Jordan inversion
  const n = m.length
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)])
  for (let i = 0; i < n; i++) {
    // Pivot
    let piv = a[i][i]
    if (Math.abs(piv) < 1e-12) {
      // swap
      let swapped = false
      for (let r = i + 1; r < n; r++) {
        if (Math.abs(a[r][i]) > 1e-12) {
          ;[a[i], a[r]] = [a[r], a[i]]
          piv = a[i][i]
          swapped = true
          break
        }
      }
      if (!swapped) return null
    }
    for (let j = 0; j < 2 * n; j++) a[i][j] /= piv
    for (let r = 0; r < n; r++) {
      if (r !== i) {
        const factor = a[r][i]
        for (let j = 0; j < 2 * n; j++) a[r][j] -= factor * a[i][j]
      }
    }
  }
  return a.map(row => row.slice(n))
}

function variance(arr) {
  const n = arr.length
  if (n < 2) return 0
  const m = arr.reduce((s, v) => s + v, 0) / n
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1)
}

// Mulberry32 PRNG (consistent with sampling.js)
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

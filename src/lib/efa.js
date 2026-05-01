// ============================================================
// Exploratory Factor Analysis (EFA)
// ============================================================
// Untuk validasi konstruk kuesioner — uji apakah item-item kuesioner
// mengukur faktor laten yang terstruktur.
//
// Output:
//   - Correlation matrix
//   - KMO (Kaiser-Meyer-Olkin) — sampling adequacy
//   - Bartlett's Test of Sphericity
//   - Eigenvalues + variance explained + scree plot data
//   - Factor extraction (Principal Component Analysis)
//   - Varimax rotation
//   - Factor loadings (rotated & unrotated)
//   - Communalities (h²)
//
// Pedoman umum:
//   - KMO ≥ 0.6 → adequate, ≥ 0.8 → meritorious
//   - Bartlett p < 0.05 → matriks korelasi bukan identity (bagus)
//   - Eigenvalue > 1 (Kaiser criterion) → faktor dipertahankan
//   - Loading ≥ 0.4 → item masuk ke faktor tersebut
//
// Referensi: Hair, Black, Babin, Anderson — Multivariate Data Analysis.

import jstat from 'jstat'

// ============================================================
// Matrix utilities (real symmetric eigendecomposition via Jacobi)
// ============================================================
function copyMatrix(M) { return M.map(row => [...row]) }

function transpose(M) { return M[0].map((_, j) => M.map(r => r[j])) }

function matMul(A, B) {
  const m = A.length, n = B[0].length, p = B.length
  const out = Array.from({ length: m }, () => new Array(n).fill(0))
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++) {
      let s = 0
      for (let k = 0; k < p; k++) s += A[i][k] * B[k][j]
      out[i][j] = s
    }
  return out
}

function invertSymmetric(M) {
  // Gauss-Jordan
  const n = M.length
  const a = M.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)])
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

/**
 * Jacobi eigendecomposition for real symmetric matrices.
 * Returns sorted descending by eigenvalue.
 *
 * @param {number[][]} A - n×n symmetric
 * @param {number} [maxIter=500]
 * @param {number} [tol=1e-10]
 * @returns {{ eigenvalues: number[], eigenvectors: number[][] }}
 *          eigenvectors[:, i] is i-th eigenvector (column)
 */
function jacobiEigen(A, maxIter = 500, tol = 1e-10) {
  const n = A.length
  const M = copyMatrix(A)
  // V = identity (will become eigenvectors as columns)
  const V = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => i === j ? 1 : 0))

  for (let iter = 0; iter < maxIter; iter++) {
    // Find largest off-diagonal
    let p = 0, q = 1, maxOff = 0
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(M[i][j]) > maxOff) {
          maxOff = Math.abs(M[i][j])
          p = i; q = j
        }
      }
    }
    if (maxOff < tol) break

    // Compute rotation angle
    const app = M[p][p], aqq = M[q][q], apq = M[p][q]
    let theta
    if (Math.abs(app - aqq) < 1e-30) {
      theta = Math.PI / 4
    } else {
      theta = 0.5 * Math.atan2(2 * apq, app - aqq)
    }
    const c = Math.cos(theta), s = Math.sin(theta)

    // Update M and V
    for (let i = 0; i < n; i++) {
      const mip = M[i][p], miq = M[i][q]
      M[i][p] = c * mip + s * miq
      M[i][q] = -s * mip + c * miq
    }
    for (let j = 0; j < n; j++) {
      const mpj = M[p][j], mqj = M[q][j]
      M[p][j] = c * mpj + s * mqj
      M[q][j] = -s * mpj + c * mqj
    }
    for (let i = 0; i < n; i++) {
      const vip = V[i][p], viq = V[i][q]
      V[i][p] = c * vip + s * viq
      V[i][q] = -s * vip + c * viq
    }
  }

  // Extract eigenvalues (diagonal) and sort descending
  const idx = Array.from({ length: n }, (_, i) => i)
  idx.sort((a, b) => M[b][b] - M[a][a])
  const eigenvalues = idx.map(i => M[i][i])
  const eigenvectors = Array.from({ length: n }, (_, row) =>
    idx.map(col => V[row][col]))
  return { eigenvalues, eigenvectors }
}

// ============================================================
// Correlation matrix
// ============================================================
/**
 * Compute correlation matrix from data matrix [n × p].
 * @param {number[][]} X - rows are observations, columns are variables
 * @returns {number[][]} p × p correlation matrix
 */
export function correlationMatrix(X) {
  const n = X.length
  const p = X[0].length

  const means = new Array(p).fill(0)
  for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) means[j] += X[i][j]
  for (let j = 0; j < p; j++) means[j] /= n

  const sds = new Array(p).fill(0)
  for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) sds[j] += (X[i][j] - means[j]) ** 2
  for (let j = 0; j < p; j++) sds[j] = Math.sqrt(sds[j] / (n - 1))

  const R = Array.from({ length: p }, () => new Array(p).fill(0))
  for (let a = 0; a < p; a++) {
    for (let b = a; b < p; b++) {
      let s = 0
      for (let i = 0; i < n; i++) s += (X[i][a] - means[a]) * (X[i][b] - means[b])
      const r = (sds[a] === 0 || sds[b] === 0) ? 0 : s / ((n - 1) * sds[a] * sds[b])
      R[a][b] = r
      R[b][a] = r
    }
  }
  return R
}

// ============================================================
// KMO (Kaiser-Meyer-Olkin) — Sampling Adequacy
// ============================================================
/**
 * KMO measure of sampling adequacy.
 *   KMO = Σr²ᵢⱼ / (Σr²ᵢⱼ + Σa²ᵢⱼ)
 * where aᵢⱼ are partial correlations from inverse of correlation matrix.
 *
 * Pedoman:
 *   ≥ 0.9  marvelous
 *   ≥ 0.8  meritorious
 *   ≥ 0.7  middling
 *   ≥ 0.6  mediocre (acceptable for EFA)
 *   ≥ 0.5  miserable
 *   < 0.5  unacceptable
 */
export function kmo(R) {
  const p = R.length
  const Rinv = invertSymmetric(R)
  if (!Rinv) throw new Error('Matriks korelasi tidak invertable (mungkin singular).')

  // Partial correlation: -Q[i,j] / sqrt(Q[i,i] * Q[j,j])
  // where Q = R^-1
  const partial = Array.from({ length: p }, () => new Array(p).fill(0))
  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      if (i === j) partial[i][j] = 1
      else partial[i][j] = -Rinv[i][j] / Math.sqrt(Math.abs(Rinv[i][i] * Rinv[j][j]))
    }
  }

  // Overall KMO
  let sumR2 = 0, sumA2 = 0
  for (let i = 0; i < p; i++)
    for (let j = 0; j < p; j++)
      if (i !== j) {
        sumR2 += R[i][j] ** 2
        sumA2 += partial[i][j] ** 2
      }
  const overall = sumR2 / (sumR2 + sumA2)

  // Per-variable KMO (MSA — Measure of Sampling Adequacy)
  const perVariable = []
  for (let i = 0; i < p; i++) {
    let r2 = 0, a2 = 0
    for (let j = 0; j < p; j++) if (i !== j) {
      r2 += R[i][j] ** 2
      a2 += partial[i][j] ** 2
    }
    perVariable.push(r2 / (r2 + a2))
  }

  return { overall, perVariable, interpretation: kmoInterpretation(overall) }
}

export function kmoInterpretation(k) {
  if (k >= 0.9) return 'marvelous'
  if (k >= 0.8) return 'meritorious'
  if (k >= 0.7) return 'middling'
  if (k >= 0.6) return 'mediocre'
  if (k >= 0.5) return 'miserable'
  return 'unacceptable'
}

// ============================================================
// Bartlett's Test of Sphericity
// ============================================================
/**
 * H0: matriks korelasi = matriks identitas (tidak ada korelasi antar variabel)
 * Tolak H0 (p < 0.05) berarti EFA bisa dilanjutkan.
 *
 *   χ² = -[(n-1) - (2p+5)/6] · ln|R|
 *   df = p(p-1)/2
 */
export function bartlettSphericity(R, n) {
  const p = R.length
  const det = matrixDeterminant(R)
  if (det <= 0) {
    return { chi2: NaN, df: NaN, p: NaN, error: 'Determinan ≤ 0 — matriks korelasi singular' }
  }
  const chi2 = -((n - 1) - (2 * p + 5) / 6) * Math.log(det)
  const df = (p * (p - 1)) / 2
  const pVal = 1 - jstat.chisquare.cdf(chi2, df)
  return { chi2, df, p: pVal, determinant: det }
}

function matrixDeterminant(M) {
  // LU decomposition for determinant
  const n = M.length
  const A = copyMatrix(M)
  let det = 1
  for (let i = 0; i < n; i++) {
    let piv = A[i][i]
    if (Math.abs(piv) < 1e-12) {
      // Try row swap
      let swapped = false
      for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > 1e-12) {
        [A[i], A[r]] = [A[r], A[i]]
        det *= -1
        piv = A[i][i]
        swapped = true
        break
      }
      if (!swapped) return 0
    }
    det *= piv
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / piv
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]
    }
  }
  return det
}

// ============================================================
// Factor extraction via Principal Component Analysis (PCA)
// ============================================================
/**
 * Extract initial factor loadings from correlation matrix using PCA.
 * Loading[i,k] = sqrt(λ_k) · v_k[i]
 *
 * @param {number[][]} R - correlation matrix
 * @param {number} [nFactors] - jumlah faktor (default: Kaiser criterion = jumlah eigenvalue ≥ 1)
 */
export function extractPCA(R, nFactors = null) {
  const p = R.length
  const { eigenvalues, eigenvectors } = jacobiEigen(R)

  // Fix sign for non-negative eigenvalues (numerical noise)
  const eigVals = eigenvalues.map(v => Math.max(v, 0))

  // Determine number of factors (Kaiser if not specified)
  let nF
  if (nFactors !== null) nF = Math.max(1, Math.min(p, Math.floor(nFactors)))
  else nF = Math.max(1, eigVals.filter(v => v >= 1).length)

  // Loading matrix [p × nF]: column k = sqrt(λ_k) · v_k
  const loadings = Array.from({ length: p }, () => new Array(nF).fill(0))
  for (let k = 0; k < nF; k++) {
    const sl = Math.sqrt(eigVals[k])
    for (let i = 0; i < p; i++) {
      loadings[i][k] = sl * eigenvectors[i][k]
    }
  }

  // Communalities: sum of squared loadings per variable
  const communalities = loadings.map(row => row.reduce((s, v) => s + v * v, 0))

  // Variance explained per factor
  const totalVar = eigVals.reduce((s, v) => s + v, 0)
  const varExplained = eigVals.slice(0, nF).map(v => ({
    eigenvalue: v,
    varianceProp: v / p,         // proportion of total variance (always p for correlation matrix)
    cumulativeProp: 0,
  }))
  let cum = 0
  for (let k = 0; k < nF; k++) {
    cum += varExplained[k].varianceProp
    varExplained[k].cumulativeProp = cum
  }

  return {
    eigenvalues: eigVals,
    nFactors: nF,
    loadings,
    communalities,
    varianceExplained: varExplained,
    totalVariance: p,
  }
}

// ============================================================
// Varimax rotation
// ============================================================
/**
 * Varimax rotation maximizes variance of squared loadings within each factor.
 * Pairwise rotation, iterating until convergence.
 *
 * @param {number[][]} L - p × k loadings matrix
 * @param {number} [maxIter=100]
 * @param {number} [tol=1e-7]
 */
export function varimaxRotation(L, maxIter = 100, tol = 1e-7) {
  const p = L.length
  const k = L[0].length
  if (k < 2) return { rotated: copyMatrix(L), iterations: 0 }

  const rotated = copyMatrix(L)

  // Kaiser normalization: weight rows by communality
  const h = rotated.map(row => Math.sqrt(row.reduce((s, v) => s + v * v, 0)))
  for (let i = 0; i < p; i++) if (h[i] > 0) {
    for (let j = 0; j < k; j++) rotated[i][j] /= h[i]
  }

  let iter = 0
  let prevVar = -1
  for (iter = 0; iter < maxIter; iter++) {
    let totalVar = 0
    for (let a = 0; a < k - 1; a++) {
      for (let b = a + 1; b < k; b++) {
        // Compute u = L_a^2 - L_b^2 and v = 2 L_a L_b
        let A = 0, B = 0, C = 0, D = 0
        for (let i = 0; i < p; i++) {
          const u = rotated[i][a] * rotated[i][a] - rotated[i][b] * rotated[i][b]
          const v = 2 * rotated[i][a] * rotated[i][b]
          A += u
          B += v
          C += u * u - v * v
          D += 2 * u * v
        }
        const num = D - 2 * A * B / p
        const den = C - (A * A - B * B) / p
        if (Math.abs(num) < 1e-15 && Math.abs(den) < 1e-15) continue
        const angle = 0.25 * Math.atan2(num, den)
        const c = Math.cos(angle), s = Math.sin(angle)
        // Rotate columns a, b
        for (let i = 0; i < p; i++) {
          const la = rotated[i][a], lb = rotated[i][b]
          rotated[i][a] = c * la + s * lb
          rotated[i][b] = -s * la + c * lb
        }
      }
    }
    // Compute total variance (variance of squared loadings)
    for (let j = 0; j < k; j++) {
      const colSq = rotated.map(r => r[j] ** 2)
      const meanSq = colSq.reduce((s, v) => s + v, 0) / p
      totalVar += colSq.reduce((s, v) => s + (v - meanSq) ** 2, 0) / p
    }
    if (Math.abs(totalVar - prevVar) < tol) break
    prevVar = totalVar
  }

  // De-normalize
  for (let i = 0; i < p; i++) if (h[i] > 0) {
    for (let j = 0; j < k; j++) rotated[i][j] *= h[i]
  }

  return { rotated, iterations: iter + 1 }
}

// ============================================================
// Full EFA pipeline
// ============================================================
/**
 * Complete EFA workflow.
 *
 * @param {number[][]} X - data matrix [n × p]
 * @param {object} [opts]
 * @param {string[]} [opts.itemNames] - nama item
 * @param {number} [opts.nFactors] - jumlah faktor (default: Kaiser)
 * @param {boolean} [opts.rotate=true] - apply varimax rotation
 */
export function efa(X, opts = {}) {
  const { itemNames = null, nFactors = null, rotate = true } = opts

  // Validate
  if (!Array.isArray(X) || X.length === 0) throw new Error('Data X kosong')
  const n = X.length
  const p = X[0].length
  if (p < 3) throw new Error('Butuh minimal 3 variabel untuk EFA')
  if (n < p) throw new Error(`Sampel terlalu kecil (n=${n}, butuh >= ${p})`)

  const names = itemNames || X[0].map((_, i) => `Item${i + 1}`)

  // Filter rows with NaN
  const valid = X.filter(row =>
    Array.isArray(row) && row.length === p && row.every(v => typeof v === 'number' && isFinite(v))
  )
  if (valid.length < p) throw new Error(`Setelah filter NaN, n=${valid.length} < p=${p}`)

  // 1. Correlation matrix
  const R = correlationMatrix(valid)

  // 2. KMO
  let kmoResult
  try { kmoResult = kmo(R) } catch (e) { kmoResult = { error: e.message } }

  // 3. Bartlett
  const bartlett = bartlettSphericity(R, valid.length)

  // 4. Eigenvalues + Scree
  const { eigenvalues } = jacobiEigen(R)
  const eigPos = eigenvalues.map(v => Math.max(v, 0))

  // 5. Factor extraction (PCA)
  const extraction = extractPCA(R, nFactors)

  // 6. Optional rotation
  let rotation = null
  if (rotate && extraction.nFactors >= 2) {
    rotation = varimaxRotation(extraction.loadings)
  }

  // Build labeled tables
  const factorTable = names.map((name, i) => ({
    name,
    communality: extraction.communalities[i],
    loadingsUnrotated: extraction.loadings[i],
    loadingsRotated: rotation ? rotation.rotated[i] : extraction.loadings[i],
    primaryFactor: argmaxAbs(rotation ? rotation.rotated[i] : extraction.loadings[i]) + 1,
  }))

  return {
    type: 'efa',
    toolName: 'Exploratory Factor Analysis',
    n: valid.length,
    p,
    itemNames: names,
    correlationMatrix: R,
    kmo: kmoResult,
    bartlett,
    eigenvalues: eigPos,
    nFactors: extraction.nFactors,
    varianceExplained: extraction.varianceExplained,
    loadingsUnrotated: extraction.loadings,
    loadingsRotated: rotation ? rotation.rotated : null,
    rotationApplied: rotate && extraction.nFactors >= 2,
    rotationIterations: rotation?.iterations || 0,
    communalities: extraction.communalities,
    factorTable,
    fitOk: (kmoResult.overall || 0) >= 0.6 && bartlett.p < 0.05,
  }
}

function argmaxAbs(arr) {
  let bestI = 0, bestV = -1
  for (let i = 0; i < arr.length; i++) {
    if (Math.abs(arr[i]) > bestV) { bestV = Math.abs(arr[i]); bestI = i }
  }
  return bestI
}

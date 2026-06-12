/**
 * Correlation — Pearson & Spearman.
 * SPSS-compatible: pairwise deletion default, two-tailed p-values.
 */

import { listwisePair } from './data.js';
import { tCDF, tPValue } from './distributions.js';

/**
 * Pearson product-moment correlation.
 * @param {number[]} x
 * @param {number[]} y
 * @returns {Object} { method, r, r2, t, df, pValue, n, ci95, strength, direction, missing }
 */
export function pearson(x, y) {
  const pair = listwisePair(x, y);
  const n = pair.nClean;
  if (n < 3) return { method: 'pearson', error: 'n < 3', n };

  const mx = pair.x.reduce((a, b) => a + b, 0) / n;
  const my = pair.y.reduce((a, b) => a + b, 0) / n;
  const ssxx = pair.x.reduce((s, v) => s + (v - mx) ** 2, 0);
  const ssyy = pair.y.reduce((s, v) => s + (v - my) ** 2, 0);
  const ssxy = pair.x.reduce((s, v, i) => s + (v - mx) * (pair.y[i] - my), 0);

  if (ssxx === 0 || ssyy === 0) {
    return { method: 'pearson', error: 'Konstan (variance = 0)', n };
  }

  const r = ssxy / Math.sqrt(ssxx * ssyy);
  const r2 = r * r;
  const df = n - 2;

  // t-test for significance
  const rClamped = Math.max(-0.999999, Math.min(0.999999, r));
  const t = rClamped * Math.sqrt(df / (1 - rClamped * rClamped));
  const pValue = tPValue(t, df);

  // Fisher z-transformation for CI
  const z = 0.5 * Math.log((1 + rClamped) / (1 - rClamped));
  const se = 1 / Math.sqrt(n - 3);
  const zLower = z - 1.96 * se;
  const zUpper = z + 1.96 * se;
  const ci95 = [
    Math.tanh(zLower),
    Math.tanh(zUpper),
  ];

  const absR = Math.abs(r);
  const strength = absR >= 0.7 ? 'kuat' : absR >= 0.4 ? 'sedang' : 'lemah';
  const direction = r > 0 ? 'positif' : 'negatif';

  return {
    method: 'pearson',
    r,
    r2,
    t,
    df,
    pValue,
    n,
    ci95,
    strength,
    direction,
    missing: pair.excluded,
    notes: 'Pairwise deletion. Two-tailed p-value. CI via Fisher z-transformation.',
  };
}

/**
 * Spearman rank-order correlation.
 * @param {number[]} x
 * @param {number[]} y
 * @returns {Object} { method, rho, t, df, pValue, n, missing }
 */
export function spearman(x, y) {
  const pair = listwisePair(x, y);
  const n = pair.nClean;
  if (n < 3) return { method: 'spearman', error: 'n < 3', n };

  const rankX = rank(pair.x);
  const rankY = rank(pair.y);

  // Pearson on ranks
  const mx = rankX.reduce((a, b) => a + b, 0) / n;
  const my = rankY.reduce((a, b) => a + b, 0) / n;
  const ssxx = rankX.reduce((s, v) => s + (v - mx) ** 2, 0);
  const ssyy = rankY.reduce((s, v) => s + (v - my) ** 2, 0);
  const ssxy = rankX.reduce((s, v, i) => s + (v - mx) * (rankY[i] - my), 0);

  if (ssxx === 0 || ssyy === 0) {
    return { method: 'spearman', error: 'Konstan (variance = 0)', n };
  }

  const rho = ssxy / Math.sqrt(ssxx * ssyy);
  const df = n - 2;
  const rhoClamped = Math.max(-0.999999, Math.min(0.999999, rho));
  const t = rhoClamped * Math.sqrt(df / (1 - rhoClamped * rhoClamped));
  const pValue = tPValue(t, df);

  return {
    method: 'spearman',
    rho,
    t,
    df,
    pValue,
    n,
    missing: pair.excluded,
    notes: 'Pairwise deletion. Two-tailed p-value. Tie-corrected ranks.',
  };
}

/**
 * Rank values (average rank for ties).
 * @param {number[]} arr
 * @returns {number[]}
 */
function rank(arr) {
  const indexed = arr.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array(arr.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length && indexed[j].v === indexed[i].v) j++;
    const avgRank = (i + j + 1) / 2; // 1-based average rank
    for (let k = i; k < j; k++) {
      ranks[indexed[k].i] = avgRank;
    }
    i = j;
  }
  return ranks;
}

// ── Partial Correlation ───────────────────────────────────────────

/**
 * Compute pairwise Pearson correlation matrix.
 * Uses listwise deletion per pair.
 * @param {number[][]} matrix - columns [n_obs][n_vars]
 * @returns {{ r: number[][], n: number[][] }}
 */
function pearsonMatrix(matrix) {
  const nVars = matrix.length
  const r = Array.from({ length: nVars }, () => new Array(nVars).fill(1))
  const nObs = Array.from({ length: nVars }, () => new Array(nVars).fill(0))

  for (let i = 0; i < nVars; i++) {
    for (let j = i; j < nVars; j++) {
      if (i === j) {
        r[i][j] = 1
        nObs[i][j] = matrix[i].length
        continue
      }
      const result = pearson(matrix[i], matrix[j])
      if (result.error) {
        r[i][j] = r[j][i] = 0
      } else {
        r[i][j] = r[j][i] = result.r
        nObs[i][j] = nObs[j][i] = result.n
      }
    }
  }
  return { r, n: nObs }
}

/**
 * Partial correlation — zero-order through first-order implemented.
 * Controls for one or more variables using recursive formula.
 *
 * r_xy.z = (r_xy - r_xz * r_yz) / sqrt((1 - r_xz²) * (1 - r_yz²))
 *
 * @param {number[]} x - primary variable
 * @param {number[]} y - outcome variable
 * @param {number[][]} controls - array of control variable arrays
 * @returns {Object}
 */
export function partialCorrelation(x, y, controls = []) {
  if (controls.length === 0) {
    // Fall back to ordinary Pearson
    const p = pearson(x, y)
    if (p.error) return p
    return {
      method: 'partial',
      order: 0,
      rPartial: p.r,
      r2: p.r2,
      t: p.t,
      df: p.df,
      pValue: p.pValue,
      n: p.n,
      controlVars: [],
      zeroOrder: p.r,
      strength: p.strength,
      direction: p.direction,
    }
  }

  // Build correlation matrix for all variables
  const vars = [x, y, ...controls]
  const { r: R } = pearsonMatrix(vars)

  // Manually compute using repeated first-order formula
  // This is valid for any number of control variables via recursion
  const order = controls.length

  // For first-order: direct formula
  if (order === 1) {
    const r_xy = R[0][1]
    const r_xz = R[0][2]
    const r_yz = R[1][2]

    const denom = Math.sqrt(Math.max((1 - r_xz * r_xz) * (1 - r_yz * r_yz), 1e-12))
    const rPartial = (r_xy - r_xz * r_yz) / denom
    const rClamped = Math.max(-0.999999, Math.min(0.999999, rPartial))
    const n = pearson(x, y).n
    const df = n - 2 - order
    const t = rClamped * Math.sqrt(df / (1 - rClamped * rClamped))
    const pValue = tPValue(t, df)

    const absR = Math.abs(rClamped)
    const strength = absR >= 0.7 ? 'kuat' : absR >= 0.4 ? 'sedang' : absR >= 0.2 ? 'lemah' : 'sangat lemah'
    const direction = rClamped > 0 ? 'positif' : 'negatif'

    return {
      method: 'partial',
      order: 1,
      rPartial: rClamped,
      r2: rClamped * rClamped,
      t, df, pValue, n,
      controlVars: [1],
      r_xy,
      r_xz,
      r_yz,
      zeroOrder: r_xy,
      strength,
      direction,
    }
  }

  // For order > 1: use repeated recursion via matrix inversion
  // (formula from Anderson 2003)
  // Build submatrix for [y, x, controls] → partial from precision matrix
  const nVars = 2 + order
  // Get the precision matrix (inverse of correlation matrix)
  const P = invertMatrix(R)
  if (!P) return { error: 'Matriks korelasi singular — partial correlation tidak dapat dihitung' }

  // Partial r: -p_xy / sqrt(p_xx * p_yy)
  // Index 0=x, 1=y in original R → 0=x, 1=y in P
  const p_xy = P[0][1]
  const p_xx = P[0][0]
  const p_yy = P[1][1]

  const denom = Math.sqrt(Math.max(p_xx * p_yy, 1e-12))
  const rPartial = -p_xy / denom
  const rClamped = Math.max(-0.999999, Math.min(0.999999, rPartial))

  const n = pearson(x, y).n
  const df = n - 2 - order
  const t = rClamped * Math.sqrt(df / (1 - rClamped * rClamped))
  const pValue = tPValue(t, df)

  const absR = Math.abs(rClamped)
  const strength = absR >= 0.7 ? 'kuat' : absR >= 0.4 ? 'sedang' : absR >= 0.2 ? 'lemah' : 'sangat lemah'
  const direction = rClamped > 0 ? 'positif' : 'negatif'

  return {
    method: 'partial',
    order,
    rPartial: rClamped,
    r2: rClamped * rClamped,
    t, df, pValue, n,
    controlVars: Array.from({ length: order }, (_, i) => i),
    zeroOrder: R[0][1],
    strength,
    direction,
  }
}

/**
 * Simple matrix inversion for small correlation matrices (Gauss-Jordan).
 * @param {number[][]} M
 * @returns {number[][]|null}
 */
function invertMatrix(M) {
  const n = M.length
  // Augmented matrix [M | I]
  const aug = M.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))])

  for (let col = 0; col < n; col++) {
    // Pivot
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]]

    if (Math.abs(aug[col][col]) < 1e-12) return null // Singular

    const pivot = aug[col][col]
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot

    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = aug[row][col]
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j]
    }
  }

  return aug.map(row => row.slice(n))
}

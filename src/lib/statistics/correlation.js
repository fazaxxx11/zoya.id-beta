/**
 * Correlation — Pearson & Spearman.
 * SPSS-compatible: pairwise deletion default, two-tailed p-values.
 */

import { listwisePair } from './data.js';
import { tCDF, tPValue, normalCDF } from './distributions.js';

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

// ── Kendall's Tau-b ─────────────────────────────────────────────────

/**
 * Compute tie groups: for each unique value, count its frequency.
 * @param {number[]} arr
 * @returns {number[]} frequencies > 1
 */
function tieGroups(arr) {
  const freq = new Map();
  for (const v of arr) {
    freq.set(v, (freq.get(v) || 0) + 1);
  }
  return [...freq.values()].filter(t => t > 1);
}

/**
 * Kendall's Tau-b correlation (rank correlation, handles tied ranks).
 * SPSS-compatible: pairwise deletion, two-tailed z-test.
 *
 * τb = (C - D) / sqrt((n0 - n1)(n0 - n2))
 *   C = concordant, D = discordant
 *   n0 = n(n-1)/2
 *   n1 = Σ ti(ti-1)/2  (ties in x)
 *   n2 = Σ uj(uj-1)/2  (ties in y)
 *
 * Significance via Var(S) with tie correction (Kendall & Gibbons, 1975).
 *
 * @param {number[]} x
 * @param {number[]} y
 * @param {number} [alpha=0.05]
 * @returns {Object}
 */
export function kendallTau(x, y, alpha = 0.05) {
  const pair = listwisePair(x, y);
  const n = pair.nClean;
  if (n < 3) return { method: 'kendall_tau', error: 'n < 3', n };

  const a = pair.x;
  const b = pair.y;

  let C = 0;
  let D = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = a[i] - a[j];
      const dy = b[i] - b[j];
      if (dx === 0 && dy === 0) {
        // tied on both — neutral
      } else if (dx * dy > 0) {
        C++;
      } else if (dx * dy < 0) {
        D++;
      }
    }
  }

  const S = C - D;
  const tiedPairs = n * (n - 1) / 2 - C - D;

  const tX = tieGroups(a);
  const tY = tieGroups(b);

  const n0 = n * (n - 1) / 2;
  const n1 = tX.reduce((s, t) => s + t * (t - 1) / 2, 0);
  const n2 = tY.reduce((s, t) => s + t * (t - 1) / 2, 0);

  const denom = Math.sqrt(Math.max((n0 - n1) * (n0 - n2), 1e-12));
  const tau = denom > 0 ? S / denom : 0;

  // Variance of S with tie correction (Kendall, 1975)
  const v0 = n * (n - 1) * (2 * n + 5);
  const v1 = tX.reduce((s, t) => s + t * (t - 1) * (2 * t + 5), 0);
  const v2 = tY.reduce((s, t) => s + t * (t - 1) * (2 * t + 5), 0);

  let varS = (v0 - v1 - v2) / 18;

  const sumT1_X = tX.reduce((s, t) => s + t * (t - 1), 0);
  const sumT1_Y = tY.reduce((s, t) => s + t * (t - 1), 0);
  const sumT2_X = tX.filter(t => t >= 3).reduce((s, t) => s + t * (t - 1) * (t - 2), 0);
  const sumT2_Y = tY.filter(t => t >= 3).reduce((s, t) => s + t * (t - 1) * (t - 2), 0);

  if (n > 2) varS += (sumT1_X * sumT1_Y) / (2 * n * (n - 1));
  if (n > 3) varS += (sumT2_X * sumT2_Y) / (9 * n * (n - 1) * (n - 2));

  varS = Math.max(varS, 1e-12);

  const z = S / Math.sqrt(varS);
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  const absTau = Math.abs(tau);
  const strength = absTau >= 0.5 ? 'kuat' : absTau >= 0.3 ? 'sedang' : 'lemah';
  const direction = tau > 0 ? 'positif' : tau < 0 ? 'negatif' : 'tidak ada';

  const significant = pValue < alpha;
  const conclusion = significant
    ? `Korelasi Kendall's Tau ${direction} yang signifikan (τb = ${tau.toFixed(4)}, z = ${z.toFixed(3)}, p = ${pValue.toFixed(4)}).`
    : `Tidak terdapat korelasi yang signifikan (τb = ${tau.toFixed(4)}, z = ${z.toFixed(3)}, p = ${pValue.toFixed(4)}).`;

  return {
    method: 'kendall_tau',
    tau: Number(tau.toFixed(6)),
    z: Number(z.toFixed(4)),
    pValue: Number(pValue.toFixed(6)),
    n,
    concordant: C,
    discordant: D,
    tied: tiedPairs,
    strength,
    direction,
    significant,
    alpha,
    missing: pair.excluded,
    conclusion,
    notes: 'Kendall Tau-b. Pairwise deletion. Two-tailed z-test. Tie correction via Kendall & Gibbons (1975).',
  };
}

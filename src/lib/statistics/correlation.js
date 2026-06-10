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

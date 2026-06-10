/**
 * Item Validity — Corrected item-total correlation (Pearson).
 * Pure implementation: NO jstat, NO external libs.
 *
 * For each item: correlates item scores with total-minus-that-item,
 * then tests significance via t-test on r.
 * Output matches legacy itemValidity() shape exactly.
 */

import { tCDF } from './distributions.js';
import { pearson } from './correlation.js';

/**
 * Compute t-critical value (two-tailed) via bisection on tCDF.
 * Copied from ttest.js tCriticalTwoTailed.
 * @param {number} alpha
 * @param {number} df
 * @returns {number}
 */
function tCriticalTwoTailed(alpha, df) {
  const target = 1 - alpha / 2;
  let lo = 0;
  let hi = 1;

  while (tCDF(hi, df) < target && hi < 1e6) hi *= 2;

  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (tCDF(mid, df) < target) lo = mid;
    else hi = mid;
  }

  return hi;
}

/**
 * Validitas instrumen — corrected item-total correlation.
 * Pure function, no external dependencies.
 *
 * @param {number[][]} items - [n_respondents][n_items]
 * @returns {Object} { n, k, rCritical, df, items: [...], summary }
 */
export function itemValidity(items) {
  const k = items[0]?.length || 0;
  if (k < 2) return { error: 'Minimal 2 item' };

  // Listwise deletion: keep only rows where all values are finite numbers
  const valid = items.filter(row =>
    row.length === k && row.every(v => typeof v === 'number' && isFinite(v) && !isNaN(v))
  );
  const n = valid.length;
  if (n < 3) return { error: 'Minimal 3 responden' };

  const dfPath = n - 2;

  // r-critical via bisection on tCDF (alpha = 0.05, two-tailed)
  const tCrit = tCriticalTwoTailed(0.05, dfPath);
  const rCritical = tCrit / Math.sqrt(tCrit ** 2 + dfPath);

  // Total scores per respondent
  const totals = valid.map(row => row.reduce((a, b) => a + b, 0));

  const results = [];
  for (let j = 0; j < k; j++) {
    const itemVals = valid.map(row => row[j]);
    const correctedTotals = valid.map((row, ri) => totals[ri] - row[j]);
    const corr = pearson(itemVals, correctedTotals);

    const rVal = corr.r;
    const pVal = corr.pValue;
    const isValid = rVal >= rCritical && pVal < 0.05;

    results.push({
      item: j + 1,
      r: rVal,
      pValue: pVal,
      n,
      isValid,
      verdict: isValid ? 'VALID' : 'TIDAK VALID',
    });
  }

  const validCount = results.filter(r => r.isValid).length;
  const invalidCount = results.filter(r => !r.isValid).length;

  return {
    n,
    k,
    rCritical,
    df: dfPath,
    items: results,
    summary: `Dari ${k} item, ${validCount} item VALID, `
           + `${invalidCount} item TIDAK VALID `
           + `(kriteria: r ≥ ${rCritical.toFixed(3)} dan p < 0.05).`,
  };
}

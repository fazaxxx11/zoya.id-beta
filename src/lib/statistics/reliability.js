/**
 * Reliability analysis — Cronbach's Alpha.
 * SPSS-compatible: listwise deletion, sample variance (n-1).
 */

/**
 * Cronbach's Alpha for internal consistency.
 * @param {number[][]} items - [n_respondents][n_items]
 * @returns {Object} { method, alpha, k, n, itemVariances, totalVariance, interpretation, missing }
 */
export function cronbachAlpha(items) {
  if (!items || items.length < 2 || !items[0] || items[0].length < 2) {
    return { method: 'cronbach_alpha', alpha: NaN, error: 'Minimal 2 responden × 2 item' };
  }

  const k = items[0].length; // number of items

  // Listwise: only keep respondents with all items numeric
  const valid = items.filter(row =>
    row.length === k && row.every(v => typeof v === 'number' && isFinite(v) && !isNaN(v))
  );
  const n = valid.length;

  if (n < 2) return { method: 'cronbach_alpha', alpha: NaN, n, error: 'Responden valid < 2' };

  // Item variances (sample, n-1)
  const itemVariances = [];
  for (let j = 0; j < k; j++) {
    const col = valid.map(row => row[j]);
    const m = col.reduce((a, b) => a + b, 0) / n;
    const v = col.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1);
    itemVariances.push(v);
  }

  // Total scores
  const totals = valid.map(row => row.reduce((a, b) => a + b, 0));
  const totalMean = totals.reduce((a, b) => a + b, 0) / n;
  const totalVariance = totals.reduce((s, x) => s + (x - totalMean) ** 2, 0) / (n - 1);

  const sumItemVar = itemVariances.reduce((a, b) => a + b, 0);

  // Cronbach's Alpha
  const alpha = totalVariance > 0
    ? (k / (k - 1)) * (1 - sumItemVar / totalVariance)
    : NaN;

  let interpretation;
  if (alpha >= 0.9) interpretation = 'Sangat baik';
  else if (alpha >= 0.8) interpretation = 'Baik';
  else if (alpha >= 0.7) interpretation = 'Cukup';
  else if (alpha >= 0.6) interpretation = 'Sedikit kurang';
  else interpretation = 'Rendah';

  return {
    method: 'cronbach_alpha',
    alpha,
    k,
    n,
    itemVariances,
    totalVariance,
    sumItemVariances: sumItemVar,
    interpretation,
    missing: items.length - n,
    notes: 'Sample variance (n-1). Listwise deletion. Interpretasi: ≥0.9 sangat baik, ≥0.8 baik, ≥0.7 cukup.',
  };
}

/**
 * T-tests — Independent (Student & Welch), Paired.
 * SPSS-compatible: two-tailed, alpha=0.05 default, Cohen's d effect size.
 */

import { cleanNumeric } from './data.js';
import { tCDF, tPValue } from './distributions.js';

/**
 * One-sample t-test.
 * @param {number[]} values
 * @param {number} mu0 - hypothesized population mean
 * @param {number} alpha
 * @returns {Object}
 */
export function oneSampleTTest(values, mu0 = 0, alpha = 0.05) {
  const x = cleanNumeric(values);
  const n = x.length;
  if (n < 2) return { method: 'one_sample_t', error: 'n < 2' };

  const mean = x.reduce((a, b) => a + b, 0) / n;
  const variance = x.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  const sd = Math.sqrt(variance);
  const sem = sd / Math.sqrt(n);
  const t = sem > 0 ? (mean - mu0) / sem : 0;
  const df = n - 1;
  const pValue = tPValue(t, df);

  // Effect size: Cohen's d
  const d = sd > 0 ? (mean - mu0) / sd : 0;
  const se_d = Math.sqrt((1 + d * d / 2) / n); // approximate SE for d
  const ci95d = [d - 1.96 * se_d, d + 1.96 * se_d];

  const critical = tCriticalTwoTailed(alpha, df);
  const ci95 = [mean - critical * sem, mean + critical * sem];

  return {
    method: 'one_sample_t',
    test: 'One-sample t-test',
    n,
    mean,
    sd,
    sem,
    mu0,
    t,
    df,
    pValue,
    alpha,
    cohensD: d,
    cohensD_CI: ci95d,
    ci95,
    significant: pValue < alpha,
    missing: values.length - n,
    notes: 'Two-tailed. Effect size: Cohen d. Mean CI uses t critical value.',
  };
}

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
 * Independent samples t-test (both Student and Welch).
 * @param {number[]} group1
 * @param {number[]} group2
 * @param {number} alpha
 * @returns {Object}
 */
export function independentTTest(group1, group2, alpha = 0.05) {
  const a = cleanNumeric(group1);
  const b = cleanNumeric(group2);
  const nA = a.length, nB = b.length;
  if (nA < 2 || nB < 2) return { method: 'independent_t', error: 'n per group < 2' };

  const mA = a.reduce((s, v) => s + v, 0) / nA;
  const mB = b.reduce((s, v) => s + v, 0) / nB;
  const vA = a.reduce((s, v) => s + (v - mA) ** 2, 0) / (nA - 1);
  const vB = b.reduce((s, v) => s + (v - mB) ** 2, 0) / (nB - 1);
  const sdA = Math.sqrt(vA), sdB = Math.sqrt(vB);

  // Student's t (pooled variance)
  const sp2 = ((nA - 1) * vA + (nB - 1) * vB) / (nA + nB - 2);
  const sePooled = Math.sqrt(sp2 * (1 / nA + 1 / nB));
  const tStudent = (mA - mB) / sePooled;
  const dfStudent = nA + nB - 2;
  const pStudent = tPValue(tStudent, dfStudent);

  // Welch's t
  const seWelch = Math.sqrt(vA / nA + vB / nB);
  const tWelch = seWelch > 0 ? (mA - mB) / seWelch : 0;
  const dfWelchNum = (vA / nA + vB / nB) ** 2;
  const dfWelchDen = (vA / nA) ** 2 / (nA - 1) + (vB / nB) ** 2 / (nB - 1);
  const dfWelch = dfWelchDen > 0 ? dfWelchNum / dfWelchDen : 1;
  const pWelch = tPValue(tWelch, dfWelch);

  // Effect size: Cohen's d
  const pooledSD = Math.sqrt(sp2);
  const d = pooledSD > 0 ? (mA - mB) / pooledSD : 0;

  const ciDiff = 1.96 * sePooled;

  return {
    method: 'independent_t',
    student: { t: tStudent, df: dfStudent, pValue: pStudent },
    welch: { t: tWelch, df: dfWelch, pValue: pWelch },
    meanDiff: mA - mB,
    ci95: [(mA - mB) - ciDiff, (mA - mB) + ciDiff],
    cohensD: d,
    group1: { n: nA, mean: mA, variance: vA, stdDev: sdA },
    group2: { n: nB, mean: mB, variance: vB, stdDev: sdB },
    alpha,
    significant: pStudent < alpha,
    missing: (group1.length + group2.length) - (nA + nB),
    notes: 'Student t: pooled variance. Welch t: unequal variance. Two-tailed. Effect size: Cohen d.',
  };
}

/**
 * Paired samples t-test.
 * @param {number[]} pre
 * @param {number[]} post
 * @param {number} alpha
 * @returns {Object}
 */
export function pairedTTest(pre, post, alpha = 0.05) {
  const nOrig = pre.length;
  const diffs = [];
  for (let i = 0; i < pre.length; i++) {
    const a = pre[i], b = post[i];
    if (typeof a === 'number' && isFinite(a) && !isNaN(a) &&
        typeof b === 'number' && isFinite(b) && !isNaN(b)) {
      diffs.push(b - a);
    }
  }
  const n = diffs.length;
  if (n < 2) return { method: 'paired_t', error: 'n < 2' };

  const meanDiff = diffs.reduce((a, b) => a + b, 0) / n;
  const varDiff = diffs.reduce((s, v) => s + (v - meanDiff) ** 2, 0) / (n - 1);
  const sdDiff = Math.sqrt(varDiff);
  const se = sdDiff / Math.sqrt(n);
  const t = se > 0 ? meanDiff / se : 0;
  const df = n - 1;
  const pValue = tPValue(t, df);

  // Effect size
  const d = sdDiff > 0 ? meanDiff / sdDiff : 0;
  const ciDiff = 1.96 * se;

  return {
    method: 'paired_t',
    t,
    df,
    pValue,
    meanDiff,
    sdDiff,
    se,
    ci95: [meanDiff - ciDiff, meanDiff + ciDiff],
    cohensD: d,
    n,
    alpha,
    significant: pValue < alpha,
    missing: nOrig - n,
    notes: 'Differences = post - pre. Two-tailed. Effect size: Cohen d.',
  };
}

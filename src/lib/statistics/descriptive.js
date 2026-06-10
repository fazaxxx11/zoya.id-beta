/**
 * Descriptive statistics — SPSS-compatible.
 * Sample variance/SD uses n-1 (Bessel's correction).
 * Missing values (null/NaN/Infinity) excluded listwise.
 */

import { cleanNumeric } from './data.js';

/**
 * Full descriptive statistics for a numeric array.
 * @param {number[]} values
 * @returns {Object|null} { method, n, mean, median, mode, variance, stdDev, min, max, range, q1, q3, iqr, skewness, kurtosis, sem, missing }
 */
export function describe(values) {
  const clean = cleanNumeric(values);
  const n = clean.length;
  const missing = (values?.length || 0) - n;

  if (n === 0) return null;

  const sorted = [...clean].sort((a, b) => a - b);
  const sum = clean.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  // Sample variance (n-1)
  const variance = n > 1
    ? clean.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
    : 0;
  const stdDev = Math.sqrt(variance);
  const sem = n > 1 ? stdDev / Math.sqrt(n) : 0;

  // Median
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  // Mode
  const freq = new Map();
  clean.forEach(v => freq.set(v, (freq.get(v) || 0) + 1));
  const maxFreq = Math.max(...freq.values());
  const mode = [...freq.entries()].filter(([, f]) => f === maxFreq).map(([v]) => v);

  // Quartiles (SPSS method: inclusive median)
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;

  // Skewness (Fisher's, adjusted)
  let skewness = 0;
  if (n > 2 && stdDev > 0) {
    const m3 = clean.reduce((s, v) => s + ((v - mean) / stdDev) ** 3, 0) / n;
    skewness = (n * (n + 1)) / ((n - 1) * (n - 2)) * m3;
  }

  // Kurtosis (excess, Fisher's)
  let kurtosis = 0;
  if (n > 3 && stdDev > 0) {
    const m4 = clean.reduce((s, v) => s + ((v - mean) / stdDev) ** 4, 0) / n;
    kurtosis = ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * m4 - 3 * (n - 1)) + 3;
  }

  return {
    method: 'descriptive',
    n,
    mean,
    median,
    mode,
    variance,
    stdDev,
    sem,
    min: sorted[0],
    max: sorted[n - 1],
    range: sorted[n - 1] - sorted[0],
    q1,
    q3,
    iqr,
    skewness,
    kurtosis,
    missing,
    notes: 'Sample variance/SD uses n-1 (Bessel). Skewness/kurtosis: Fisher adjusted.',
  };
}

/**
 * Percentile using linear interpolation (SPSS PERCENTILS=5).
 * @param {number[]} sorted - sorted array
 * @param {number} p - percentile (0-100)
 * @returns {number}
 */
export function percentile(sorted, p) {
  const n = sorted.length;
  if (n === 0) return NaN;
  if (n === 1) return sorted[0];
  const rank = (p / 100) * (n - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
}

/**
 * Normality tests — Shapiro-Wilk & Kolmogorov-Smirnov.
 * SPSS-compatible: two-tailed, alpha=0.05 default.
 *
 * Shapiro-Wilk: Royston (1992) approximation, valid n=3..5000.
 * Reference: Royston, P. (1992). "Approximating the Shapiro-Wilk W-test for non-normality"
 *
 * KS: Lilliefors-corrected (not classic KS which assumes known distribution).
 */

import { normalCDF } from './distributions.js';
import { cleanNumeric } from './data.js';

/**
 * Shapiro-Wilk test for normality.
 * @param {number[]} values
 * @param {number} alpha
 * @returns {Object} { method, W, pValue, n, isNormal, alpha, note }
 */
export function shapiroWilk(values, alpha = 0.05) {
  const x = cleanNumeric(values).sort((a, b) => a - b);
  const n = x.length;

  if (n < 3) {
    return { method: 'shapiro_wilk', W: NaN, pValue: NaN, n, isNormal: null, alpha, note: 'n < 3' };
  }
  if (n > 5000) {
    return { method: 'shapiro_wilk', W: NaN, pValue: NaN, n, isNormal: null, alpha, note: 'n > 5000; use KS or Q-Q plot' };
  }

  const mean = x.reduce((a, b) => a + b, 0) / n;
  const ssq = x.reduce((s, v) => s + (v - mean) ** 2, 0);

  if (ssq === 0) {
    return { method: 'shapiro_wilk', W: NaN, pValue: NaN, n, isNormal: null, alpha, note: 'Constant data (variance = 0)' };
  }

  // Normal quantiles m_i = Φ⁻¹((i - 3/8) / (n + 1/4))
  const m = [];
  for (let i = 1; i <= n; i++) {
    m.push(inverseNormal((i - 3 / 8) / (n + 1 / 4)));
  }
  const m2 = m.reduce((s, v) => s + v * v, 0);

  // Royston a-coefficients
  const u = 1 / Math.sqrt(n);
  const a = new Array(n).fill(0);

  let an = -2.706056 * u ** 5 + 4.434685 * u ** 4 - 2.071190 * u ** 3
           - 0.147981 * u ** 2 + 0.221157 * u + m[n - 1] / Math.sqrt(m2);
  let an1 = -3.582633 * u ** 5 + 5.682633 * u ** 4 - 1.752460 * u ** 3
            - 0.293762 * u ** 2 + 0.042981 * u + m[n - 2] / Math.sqrt(m2);

  a[n - 1] = an;
  a[n - 2] = an1;
  a[0] = -an;
  a[1] = -an1;

  if (n === 3) {
    a[0] = Math.sqrt(0.5);
    a[1] = 0;
    a[2] = -Math.sqrt(0.5);
  } else {
    const eps = (m2 - 2 * m[n - 1] ** 2 - 2 * m[n - 2] ** 2)
              / (1 - 2 * a[n - 1] ** 2 - 2 * a[n - 2] ** 2);
    for (let i = 2; i < n - 2; i++) {
      a[i] = m[i] / Math.sqrt(eps);
    }
  }

  // W statistic
  const numerator = a.reduce((s, ai, i) => s + ai * x[i], 0) ** 2;
  const W = numerator / ssq;

  // p-value approximation
  const pValue = shapiroPValue(W, n);

  return {
    method: 'shapiro_wilk',
    W,
    pValue,
    n,
    isNormal: pValue >= alpha,
    alpha,
    note: 'Royston (1992) approximation. Valid n=3..5000.',
  };
}

/**
 * Kolmogorov-Smirnov test for normality (Lilliefors-corrected).
 * @param {number[]} values
 * @param {number} alpha
 * @returns {Object} { method, D, pValue, n, isNormal, alpha }
 */
export function kolmogorovSmirnov(values, alpha = 0.05) {
  const clean = cleanNumeric(values);
  const n = clean.length;
  if (n < 5) {
    return { method: 'kolmogorov_smirnov', D: NaN, pValue: NaN, n, isNormal: null, alpha, note: 'n < 5' };
  }

  const sorted = [...clean].sort((a, b) => a - b);
  const mean = clean.reduce((a, b) => a + b, 0) / n;
  const variance = clean.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  const sd = Math.sqrt(variance);

  if (sd === 0) {
    return { method: 'kolmogorov_smirnov', D: NaN, pValue: NaN, n, isNormal: null, alpha, note: 'Constant data' };
  }

  // Standardize and compute KS statistic
  let D = 0;
  for (let i = 0; i < n; i++) {
    const z = (sorted[i] - mean) / sd;
    const ecdf = (i + 1) / n;
    const cdf = normalCDF(z);
    D = Math.max(D, Math.abs(ecdf - cdf), Math.abs(cdf - (i / n)));
  }

  // Lilliefors approximation for p-value
  const pValue = lillieforsPValue(D, n);

  return {
    method: 'kolmogorov_smirnov',
    D,
    pValue,
    n,
    isNormal: pValue >= alpha,
    alpha,
    note: 'Lilliefors-corrected. For n ≥ 5.',
  };
}

/**
 * Run both normality tests.
 * @param {number[]} values
 * @param {number} alpha
 * @returns {Object} { method, shapiroWilk, kolmogorovSmirnov, isNormal }
 */
export function testNormality(values, alpha = 0.05) {
  const sw = shapiroWilk(values, alpha);
  const ks = kolmogorovSmirnov(values, alpha);

  // Both agree? Use Shapiro-Wilk as primary (more powerful for small n)
  const isNormal = sw.isNormal !== null ? sw.isNormal : ks.isNormal;

  return {
    method: 'normality_test',
    shapiroWilk: sw,
    kolmogorovSmirnov: ks,
    isNormal,
    alpha,
    interpretation: isNormal
      ? 'Data berdistribusi normal (tidak tolak H₀).'
      : 'Data TIDAK berdistribusi normal (tolak H₀).',
  };
}

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Inverse normal CDF (probit) via rational approximation.
 * Abramowitz & Stegun formula 26.2.23. Accurate to ~4.5e-4.
 */
function inverseNormal(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const t = p < 0.5 ? Math.sqrt(-2 * Math.log(p)) : Math.sqrt(-2 * Math.log(1 - p));
  const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
  const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;

  let x = t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
  return p < 0.5 ? -x : x;
}

/**
 * Shapiro-Wilk p-value approximation.
 * For n ≤ 11: polynomial approach.
 * For n ≥ 12: Royston normal transformation.
 */
function shapiroPValue(W, n) {
  if (W >= 1) return 1;
  if (W <= 0) return 0;

  if (n <= 11) {
    // Polynomial approximation for small n
    const gamma = -2.273 + 0.459 * n;
    const mu = 0.5440 - 0.39978 * n + 0.025054 * n ** 2 - 0.0006714 * n ** 3;
    const sigma = Math.exp(1.3822 - 0.77857 * n + 0.062767 * n ** 2 - 0.0020322 * n ** 3);
    const w = -Math.log(gamma - Math.log(1 - W));
    const z = (w - mu) / sigma;
    return 1 - normalCDF(z);
  }

  // Royston transformation for n >= 12
  const mu = 0.0038915 * Math.log(n) ** 3 - 0.083751 * Math.log(n) ** 2 - 0.31082 * Math.log(n) - 1.5861;
  const sigma = Math.exp(0.0030302 * Math.log(n) ** 2 - 0.082676 * Math.log(n) - 0.4803);
  const z = (Math.log(1 - W) - mu) / sigma;
  return 1 - normalCDF(z);
}

/**
 * Lilliefors p-value approximation for KS test.
 */
function lillieforsPValue(D, n) {
  // Approximation based on D * sqrt(n)
  const dn = D * Math.sqrt(n);
  // Simple approximation: use asymptotic formula
  const lambda = (dn - 0.01 + 0.85 / Math.sqrt(n)) * (1 + 0.3 / Math.sqrt(n));
  if (lambda <= 0) return 1;
  return 2 * Math.exp(-2 * lambda * lambda);
}

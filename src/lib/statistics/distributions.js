/**
 * Statistical distribution functions (pure, no dependencies).
 * SPSS-compatible: two-tailed p-values, full precision.
 *
 * Implementations use well-known series/continued-fraction approximations.
 * Accurate to ~1e-6 for typical use cases.
 */

// ── Gamma function (Lanczos approximation) ────────────────────────
function gammaLn(z) {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - gammaLn(1 - z);
  }
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function gamma(z) {
  return Math.exp(gammaLn(z));
}

// ── Regularized incomplete beta function ───────────────────────────
// I_x(a,b) via continued fraction (Lentz's method)
function betaIncomplete(x, a, b, depth = 0) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  if (depth > 200) return 0; // safety guard
  if (x <= (a + 1) / (a + b + 2)) {
    return betaCF(x, a, b) * Math.exp(
      a * Math.log(x) + b * Math.log(1 - x) - Math.log(a) - gammaLn(a) - gammaLn(b) + gammaLn(a + b)
    );
  }
  return 1 - betaIncomplete(1 - x, b, a, depth + 1);
}

function betaCF(x, a, b) {
  const maxIter = 200;
  const eps = 1e-14;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
}

// ── Normal CDF (error function approximation) ─────────────────────
function erf(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

export function normalCDF(x) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

export function normalPDF(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// ── t-distribution CDF ────────────────────────────────────────────
export function tCDF(t, df) {
  if (df <= 0) return NaN;
  if (df === 1) return 0.5 + Math.atan(t) / Math.PI;
  const x = df / (df + t * t);
  const ibeta = betaIncomplete(x, df / 2, 0.5);
  return t >= 0 ? 1 - 0.5 * ibeta : 0.5 * ibeta;
}

export function tPDF(t, df) {
  return gamma((df + 1) / 2) / (Math.sqrt(df * Math.PI) * gamma(df / 2)) *
    Math.pow(1 + t * t / df, -(df + 1) / 2);
}

// ── F-distribution CDF ────────────────────────────────────────────
export function fCDF(f, df1, df2) {
  if (f <= 0) return 0;
  if (df1 <= 0 || df2 <= 0) return NaN;
  const x = df1 * f / (df1 * f + df2);
  return betaIncomplete(x, df1 / 2, df2 / 2);
}

// ── Chi-squared CDF ───────────────────────────────────────────────
export function chi2CDF(x, df) {
  if (x <= 0) return 0;
  if (df <= 0) return NaN;
  return gammaIncomplete(df / 2, x / 2);
}

function gammaIncomplete(a, x) {
  if (x <= 0) return 0;
  if (x < a + 1) {
    return gammaSeries(a, x);
  }
  return 1 - gammaCF(a, x);
}

function gammaSeries(a, x) {
  const maxIter = 200;
  const eps = 1e-14;
  let sum = 1 / a;
  let term = 1 / a;
  for (let n = 1; n < maxIter; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < eps * Math.abs(sum)) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - gammaLn(a));
}

function gammaCF(a, x) {
  const maxIter = 200;
  const eps = 1e-14;
  let b = x + 1 - a;
  let c = 1e30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= maxIter; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h * Math.exp(-x + a * Math.log(x) - gammaLn(a));
}

// ── Two-tailed p-value helpers ────────────────────────────────────
export function tPValue(t, df) {
  return 2 * (1 - tCDF(Math.abs(t), df));
}

export function fPValue(f, df1, df2) {
  return 1 - fCDF(f, df1, df2);
}

export function chi2PValue(x, df) {
  return 1 - chi2CDF(x, df);
}

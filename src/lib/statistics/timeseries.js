/**
 * Time Series Analysis — ADF, Granger Causality, Engle-Granger Cointegration.
 * Pure JavaScript, no external dependencies.
 *
 * MacKinnon (1996) response surface for ADF p-values.
 * MacKinnon (1990) critical values for Engle-Granger.
 */

import { matMul, matVecMul, invertMatrix, transpose } from './regression.js';
import { fPValue } from './distributions.js';

// ═══════════════════════════════════════════════════════════════════
// MacKinnon (1996) Response Surface Coefficients for ADF p-values
// ═══════════════════════════════════════════════════════════════════
// p-value = Φ(γ_inf + γ_1/T + γ_2/T² + γ_3/T³)
// where Φ is standard normal CDF and τ is the ADF statistic.

const MACKINNON_1996 = {
  // No constant (case 1)
  none: {
    gamma_inf: [-2.570, -1.940, -1.620, -1.340, -1.040, -0.740, -0.430, -0.120, 0.190, 0.500, 0.810],
    gamma_1: [-2.230, -1.610, -1.330, -1.070, -0.800, -0.530, -0.250, 0.030, 0.310, 0.600, 0.890],
    gamma_2: [-3.630, -2.950, -2.600, -2.300, -2.000, -1.690, -1.380, -1.070, -0.760, -0.450, -0.140],
    gamma_3: [-8.190, -7.200, -6.720, -6.310, -5.910, -5.510, -5.110, -4.710, -4.310, -3.910, -3.510],
    pValues: [0.01, 0.025, 0.05, 0.075, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40],
  },
  // Constant (case 2)
  constant: {
    gamma_inf: [-3.430, -2.860, -2.570, -2.380, -2.230, -2.000, -1.800, -1.630, -1.480, -1.340, -1.210],
    gamma_1: [-6.560, -5.780, -5.380, -5.100, -4.880, -4.540, -4.250, -3.990, -3.760, -3.550, -3.360],
    gamma_2: [-16.880, -14.450, -13.250, -12.450, -11.820, -10.880, -10.110, -9.460, -8.890, -8.380, -7.920],
    gamma_3: [-30.180, -25.360, -23.000, -21.460, -20.280, -18.450, -16.940, -15.650, -14.520, -13.510, -12.600],
    pValues: [0.01, 0.025, 0.05, 0.075, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40],
  },
  // Constant + trend (case 3)
  trend: {
    gamma_inf: [-3.960, -3.410, -3.130, -2.940, -2.790, -2.570, -2.380, -2.220, -2.080, -1.950, -1.830],
    gamma_1: [-9.050, -8.170, -7.720, -7.410, -7.170, -6.790, -6.470, -6.190, -5.950, -5.730, -5.530],
    gamma_2: [-22.590, -19.840, -18.470, -17.550, -16.840, -15.730, -14.810, -14.020, -13.330, -12.710, -12.150],
    gamma_3: [-37.280, -31.870, -29.120, -27.330, -25.970, -23.890, -22.180, -20.720, -19.440, -18.300, -17.270],
    pValues: [0.01, 0.025, 0.05, 0.075, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40],
  },
};

// Critical values (for direct lookup)
const ADF_CRITICAL_VALUES = {
  none: { pct1: -2.58, pct5: -1.95, pct10: -1.62 },
  constant: { pct1: -3.43, pct5: -2.86, pct10: -2.57 },
  trend: { pct1: -3.96, pct5: -3.41, pct10: -3.13 },
};

// ═══════════════════════════════════════════════════════════════════
// Engle-Granger Critical Values (MacKinnon 1990)
// ═══════════════════════════════════════════════════════════════════
// k = number of regressors (excluding constant in cointegrating equation)

const EG_CRITICAL_VALUES = {
  // k=1 (bivariate)
  1: {
    pct1: { alpha_inf: -4.07, alpha_1: -3.65, alpha_2: -6.11 },
    pct5: { alpha_inf: -3.37, alpha_1: -2.92, alpha_2: -4.63 },
    pct10: { alpha_inf: -3.03, alpha_1: -2.60, alpha_2: -3.95 },
  },
  // k=2 (trivariate)
  2: {
    pct1: { alpha_inf: -4.44, alpha_1: -4.06, alpha_2: -8.98 },
    pct5: { alpha_inf: -3.77, alpha_1: -3.37, alpha_2: -7.16 },
    pct10: { alpha_inf: -3.46, alpha_1: -3.07, alpha_2: -6.33 },
  },
};

// ═══════════════════════════════════════════════════════════════════
// Standard Normal CDF
// ═══════════════════════════════════════════════════════════════════

function normalCDF(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

// ═══════════════════════════════════════════════════════════════════
// MacKinnon p-value interpolation
// ═══════════════════════════════════════════════════════════════════

function macKinnonPValue(tau, nobs, deterministic) {
  const table = MACKINNON_1996[deterministic];
  if (!table) return NaN;

  const T = nobs;
  const pvs = table.pValues;
  const n = pvs.length;

  // Compute response surface value for each p-value
  // γ(τ) = γ_inf + γ_1/T + γ_2/T² + γ_3/T³
  // Find where tau falls between computed values
  const gammas = [];
  for (let i = 0; i < n; i++) {
    const g = table.gamma_inf[i] + table.gamma_1[i] / T + table.gamma_2[i] / (T * T) + table.gamma_3[i] / (T * T * T);
    gammas.push(g);
  }

  // tau is usually negative. gammas are also negative (sorted descending in absolute value).
  // gammas[0] is most negative (1% quantile), gammas[n-1] is least negative (40% quantile).
  // If tau < gammas[0], p < 0.01; if tau > gammas[n-1], p > 0.40

  if (tau <= gammas[0]) return 0.01; // cap at 1%
  if (tau >= gammas[n - 1]) return 0.40; // cap at 40%

  // Linear interpolation between adjacent gammas
  for (let i = 0; i < n - 1; i++) {
    if (tau >= gammas[i] && tau <= gammas[i + 1]) {
      const frac = (tau - gammas[i]) / (gammas[i + 1] - gammas[i]);
      return pvs[i] + frac * (pvs[i + 1] - pvs[i]);
    }
  }

  // Fallback: use normal approximation
  return normalCDF(tau);
}

// ═══════════════════════════════════════════════════════════════════
// Engle-Granger critical value correction
// ═══════════════════════════════════════════════════════════════════

function egCriticalValue(T, k, pct) {
  const kv = Math.min(k, 2); // only k=1 and k=2 tables available
  const cv = EG_CRITICAL_VALUES[kv]?.[pct];
  if (!cv) return NaN;
  // Finite-sample correction: cv(T) = alpha_inf + alpha_1/T + alpha_2/T²
  return cv.alpha_inf + cv.alpha_1 / T + cv.alpha_2 / (T * T);
}

// ═══════════════════════════════════════════════════════════════════
// AIC/BIC Lag Selection
// ═══════════════════════════════════════════════════════════════════

function computeIC(residuals, nParams, method) {
  const n = residuals.length;
  const RSS = residuals.reduce((s, r) => s + r * r, 0);
  const sigma2 = RSS / n;
  if (method === 'BIC') {
    return n * Math.log(sigma2) + nParams * Math.log(n);
  }
  // AIC
  return n * Math.log(sigma2) + 2 * nParams;
}

function selectLag(series, maxLags, method = 'AIC') {
  const T = series.length;
  const pMax = typeof maxLags === 'number'
    ? maxLags
    : Math.min(Math.floor(12 * Math.pow(T / 100, 0.25)), Math.floor((T - 2) / 3));

  let bestLag = 0;
  let bestIC = Infinity;

  for (let p = 0; p <= pMax; p++) {
    // Build regression: Δy_t = α + γ y_{t-1} + Σ δ_i Δy_{t-i}
    // For lag selection, use simplified: Δy_t = α + Σ δ_i Δy_{t-i} (no unit root term)
    const dy = [];
    for (let t = 1; t < T; t++) dy.push(series[t] - series[t - 1]);

    const nUsable = dy.length - p;
    if (nUsable < p + 2) break;

    const y = [];
    const X = [];
    for (let t = p; t < dy.length; t++) {
      y.push(dy[t]);
      const row = [1]; // constant
      for (let i = 1; i <= p; i++) row.push(dy[t - i]);
      X.push(row);
    }

    const n = y.length;
    const k = X[0]?.length || 0;
    if (n <= k) break;

    const Xt = transpose(X);
    const XtX = matMul(Xt, X);
    const XtXinv = invertMatrix(XtX);
    if (!XtXinv) break;

    const Xty = matVecMul(Xt, y);
    const beta = matVecMul(XtXinv, Xty);
    const fitted = matVecMul(X, beta);
    const residuals = y.map((yi, i) => yi - fitted[i]);

    const ic = computeIC(residuals, k, method);
    if (ic < bestIC) {
      bestIC = ic;
      bestLag = p;
    }
  }

  return bestLag;
}

// ═══════════════════════════════════════════════════════════════════
// ADF Test
// ═══════════════════════════════════════════════════════════════════

export function adfTest(series, options = {}) {
  const { deterministic = 'constant', maxLags = 'auto', method = 'AIC' } = options;
  const T = series.length;

  if (T < 5) return { statistic: NaN, pValue: NaN, lags: 0, criticalValues: {}, isStationary: false, deterministic, modelType: 'adfTest', error: 'Series too short' };

  // Select lag
  const p = maxLags === 'auto' ? selectLag(series, 'auto', method) : maxLags;

  // Build ADF regression: Δy_t = α + βt + γ y_{t-1} + Σ δ_i Δy_{t-i}
  const dy = [];
  for (let t = 1; t < T; t++) dy.push(series[t] - series[t - 1]);

  const start = p + 1; // first usable index in original series
  const nUsable = T - start;
  if (nUsable < 3) return { statistic: NaN, pValue: NaN, lags: p, criticalValues: {}, isStationary: false, deterministic, modelType: 'adfTest', error: 'Too few observations after lagging' };

  const y = [];
  const X = [];
  for (let t = start; t < T; t++) {
    y.push(series[t] - series[t - 1]); // Δy_t
    const row = [];
    if (deterministic === 'constant' || deterministic === 'trend') row.push(1); // constant
    if (deterministic === 'trend') row.push(t); // trend
    row.push(series[t - 1]); // y_{t-1}
    for (let i = 1; i <= p; i++) row.push(series[t - i] - series[t - i - 1]); // Δy_{t-i}
    X.push(row);
  }

  const n = y.length;
  const k = X[0]?.length || 0;
  if (n <= k) return { statistic: NaN, pValue: NaN, lags: p, criticalValues: {}, isStationary: false, deterministic, modelType: 'adfTest', error: 'Insufficient observations' };

  // OLS
  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  const XtXinv = invertMatrix(XtX);
  if (!XtXinv) return { statistic: NaN, pValue: NaN, lags: p, criticalValues: {}, isStationary: false, deterministic, modelType: 'adfTest', error: 'Singular matrix' };

  const Xty = matVecMul(Xt, y);
  const beta = matVecMul(XtXinv, Xty);
  const fitted = matVecMul(X, beta);
  const residuals = y.map((yi, i) => yi - fitted[i]);

  const RSS = residuals.reduce((s, r) => s + r * r, 0);
  const sigma2 = RSS / (n - k);

  // γ coefficient index: depends on deterministic terms
  let gammaIdx;
  if (deterministic === 'none') gammaIdx = 0;
  else if (deterministic === 'constant') gammaIdx = 1;
  else gammaIdx = 2; // trend

  const seGamma = Math.sqrt(sigma2 * XtXinv[gammaIdx][gammaIdx]);
  const gamma = beta[gammaIdx];
  const tStat = seGamma > 0 ? gamma / seGamma : 0;

  // MacKinnon p-value (NOT Student-t!)
  const pValue = macKinnonPValue(tStat, n, deterministic);
  const criticalValues = {
    pct1: egCriticalValue(n, 0, 'pct1') || ADF_CRITICAL_VALUES[deterministic]?.pct1,
    pct5: egCriticalValue(n, 0, 'pct5') || ADF_CRITICAL_VALUES[deterministic]?.pct5,
    pct10: egCriticalValue(n, 0, 'pct10') || ADF_CRITICAL_VALUES[deterministic]?.pct10,
  };

  return {
    statistic: tStat,
    pValue,
    lags: p,
    criticalValues: ADF_CRITICAL_VALUES[deterministic] || {},
    isStationary: pValue < 0.05,
    deterministic,
    nobs: n,
    modelType: 'adfTest',
  };
}

// ═══════════════════════════════════════════════════════════════════
// Granger Causality
// ═══════════════════════════════════════════════════════════════════

export function grangerCausality(y, x, options = {}) {
  const { maxLags = 'auto', method = 'AIC' } = options;
  const T = y.length;

  if (T !== x.length) return { error: 'y and x must have same length' };

  // Select lag
  const p = maxLags === 'auto' ? selectLag(y, 'auto', method) : maxLags;
  const start = p;
  const nUsable = T - start;
  if (nUsable < p * 2 + 2) return { statistic: NaN, df1: NaN, df2: NaN, pValue: NaN, isSignificant: false, lags: p, modelType: 'grangerCausality', error: 'Too few observations' };

  // Unrestricted: y_t = α + Σ a_i y_{t-i} + Σ b_j x_{t-j}
  const yU = [];
  const XU = [];
  for (let t = start; t < T; t++) {
    yU.push(y[t]);
    const row = [1];
    for (let i = 1; i <= p; i++) row.push(y[t - i]);
    for (let j = 1; j <= p; j++) row.push(x[t - j]);
    XU.push(row);
  }

  const nU = yU.length;
  const kU = XU[0]?.length || 0;
  if (nU <= kU) return { statistic: NaN, df1: NaN, df2: NaN, pValue: NaN, isSignificant: false, lags: p, modelType: 'grangerCausality', error: 'Insufficient observations' };

  const XtU = transpose(XU);
  const XtXU = matMul(XtU, XU);
  const XtXUinv = invertMatrix(XtXU);
  if (!XtXUinv) return { statistic: NaN, df1: p, df2: nU - kU, pValue: NaN, isSignificant: false, lags: p, modelType: 'grangerCausality', error: 'Singular matrix (unrestricted)' };

  const XtyU = matVecMul(XtU, yU);
  const betaU = matVecMul(XtXUinv, XtyU);
  const fittedU = matVecMul(XU, betaU);
  const SSR_u = yU.reduce((s, yi, i) => s + (yi - fittedU[i]) ** 2, 0);

  // Restricted: y_t = α + Σ a_i y_{t-i}
  const yR = yU;
  const XR = XU.map(row => row.slice(0, 1 + p)); // intercept + y lags only

  const nR = yR.length;
  const kR = XR[0]?.length || 0;
  const XtR = transpose(XR);
  const XtXR = matMul(XtR, XR);
  const XtXRinv = invertMatrix(XtXR);
  if (!XtXRinv) return { statistic: NaN, df1: p, df2: nU - kU, pValue: NaN, isSignificant: false, lags: p, modelType: 'grangerCausality', error: 'Singular matrix (restricted)' };

  const XtyR = matVecMul(XtR, yR);
  const betaR = matVecMul(XtXRinv, XtyR);
  const fittedR = matVecMul(XR, betaR);
  const SSR_r = yR.reduce((s, yi, i) => s + (yi - fittedR[i]) ** 2, 0);

  // F-statistic
  const m = p; // number of excluded coefficients
  const df1 = m;
  const df2 = nU - kU;
  const F = df2 > 0 ? ((SSR_r - SSR_u) / m) / (SSR_u / df2) : 0;
  const pValue = fPValue(Math.max(0, F), df1, df2);

  return {
    statistic: F,
    df1,
    df2,
    pValue,
    isSignificant: pValue < 0.05,
    lags: p,
    direction: 'x→y',
    modelType: 'grangerCausality',
  };
}

// ═══════════════════════════════════════════════════════════════════
// Engle-Granger Cointegration
// ═══════════════════════════════════════════════════════════════════

export function engleGrangerCointegration(y, x, options = {}) {
  const T = y.length;
  if (T !== x.length) return { error: 'y and x must have same length' };
  if (T < 10) return { error: 'Series too short for cointegration test' };

  // Step 1: OLS y ~ x + constant
  const Xmat = x.map(v => [1, v]);
  const n = y.length;
  const k = 2;

  const Xt = transpose(Xmat);
  const XtX = matMul(Xt, Xmat);
  const XtXinv = invertMatrix(XtX);
  if (!XtXinv) return { error: 'Singular matrix in cointegrating regression' };

  const Xty = matVecMul(Xt, y);
  const beta = matVecMul(XtXinv, Xty);
  const fitted = matVecMul(Xmat, beta);
  const residuals = y.map((yi, i) => yi - fitted[i]);

  // Step 2: ADF test on residuals with Engle-Granger CV
  const adfResult = adfTest(residuals, { deterministic: 'none', maxLags: 'auto' });

  // Step 3: Use Engle-Granger critical values (NOT standard ADF)
  const egCV = {
    pct1: egCriticalValue(n, 1, 'pct1'),
    pct5: egCriticalValue(n, 1, 'pct5'),
    pct10: egCriticalValue(n, 1, 'pct10'),
  };

  return {
    adfStatistic: adfResult.statistic,
    pValue: adfResult.pValue,
    criticalValues: egCV,
    isCointegrated: adfResult.statistic < egCV.pct5,
    beta,
    residuals,
    nobs: n,
    modelType: 'engleGranger',
  };
}

/**
 * Simple linear regression — SPSS-compatible.
 * OLS, listwise deletion, full diagnostics.
 */

import { listwisePair } from './data.js';
import { tPValue, fPValue, tCriticalTwoTailed } from './distributions.js';

/**
 * Simple linear regression: y = b0 + b1*x
 * @param {number[]} x - independent variable
 * @param {number[]} y - dependent variable
 * @param {number} alpha
 * @returns {Object}
 */
export function simpleRegression(x, y, alpha = 0.05) {
  const pair = listwisePair(x, y);
  const n = pair.nClean;

  if (n < 3) {
    return { method: 'simple_regression', error: 'n < 3', n };
  }

  const mx = pair.x.reduce((a, b) => a + b, 0) / n;
  const my = pair.y.reduce((a, b) => a + b, 0) / n;

  // Sums of squares
  const ssxx = pair.x.reduce((s, v) => s + (v - mx) ** 2, 0);
  const ssyy = pair.y.reduce((s, v) => s + (v - my) ** 2, 0);
  const ssxy = pair.x.reduce((s, v, i) => s + (v - mx) * (pair.y[i] - my), 0);

  if (ssxx === 0) {
    return { method: 'simple_regression', error: 'x konstan (variance = 0)', n };
  }

  // Coefficients
  const b1 = ssxy / ssxx;
  const b0 = my - b1 * mx;

  // Predictions and residuals
  const yPred = pair.x.map(v => b0 + b1 * v);
  const residuals = pair.y.map((v, i) => v - yPred[i]);
  const ssRes = residuals.reduce((s, v) => s + v ** 2, 0);
  const ssTot = ssyy;

  // Model fit
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const r = ssxy > 0
    ? Math.sqrt(r2)
    : ssxy < 0 ? -Math.sqrt(r2) : 0;

  // Standard errors
  const mse = ssRes / (n - 2);
  const se_b1 = Math.sqrt(mse / ssxx);
  const se_b0 = Math.sqrt(mse * (1 / n + mx * mx / ssxx));

  // t-tests for coefficients
  const t_b1 = se_b1 > 0 ? b1 / se_b1 : 0;
  const t_b0 = se_b0 > 0 ? b0 / se_b0 : 0;
  const p_b1 = tPValue(t_b1, n - 2);
  const p_b0 = tPValue(t_b0, n - 2);

  // F-test (overall model significance)
  const msReg = ssTot - ssRes; // same as ssBetween for simple regression
  const F = msReg > 0 ? (msReg / 1) / (ssRes / (n - 2)) : 0;
  const pF = fPValue(F, 1, n - 2);

  // Confidence intervals
  const tCrit = tCriticalTwoTailed(alpha, n - 2);
  const ci_b1 = [b1 - tCrit * se_b1, b1 + tCrit * se_b1];
  const ci_b0 = [b0 - tCrit * se_b0, b0 + tCrit * se_b0];

  // Durbin-Watson statistic (autocorrelation check)
  let dw = 0;
  let ssResLag = 0;
  for (let i = 1; i < n; i++) {
    dw += (residuals[i] - residuals[i - 1]) ** 2;
    ssResLag += residuals[i - 1] ** 2;
  }
  dw = ssResLag > 0 ? dw / ssResLag : 0;

  // Standardized coefficients (beta)
  const sdX = Math.sqrt(ssxx / (n - 1));
  const sdY = Math.sqrt(ssTot / (n - 1));
  const beta = sdX > 0 && sdY > 0 ? b1 * (sdX / sdY) : 0;

  return {
    method: 'simple_regression',
    n,
    b0,
    b1,
    se_b0,
    se_b1,
    t_b0,
    t_b1,
    p_b0,
    p_b1,
    beta,
    r,
    r2,
    r2Adjusted: n > 2 ? 1 - (1 - r2) * (n - 1) / (n - 2) : 0,
    F,
    pF,
    mse,
    rmse: Math.sqrt(mse),
    ssRes,
    ssReg: ssTot - ssRes,
    ssTot,
    durbinWatson: dw,
    ci_b0,
    ci_b1,
    meanX: mx,
    meanY: my,
    residuals,
    significant: p_b1 < alpha,
    alpha,
    missing: pair.excluded,
    notes: 'OLS. Listwise deletion. Standardized beta = b1*(sdX/sdY). Durbin-Watson for residual autocorrelation.',
  };
}

// ── Matrix utilities ──────────────────────────────────────────────

export function transpose(M) {
  const rows = M.length, cols = M[0].length;
  const T = Array.from({ length: cols }, () => new Array(rows));
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) T[j][i] = M[i][j];
  return T;
}

export function matMul(A, B) {
  const rows = A.length, cols = B[0].length, inner = B.length;
  const C = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      for (let k = 0; k < inner; k++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}

export function matVecMul(A, v) {
  return A.map(row => row.reduce((s, a, i) => s + a * v[i], 0));
}

/** Invert n×n matrix via Gauss-Jordan. Return null if singular. */
export function invertMatrix(M) {
  const n = M.length;
  const A = M.map((row, i) => [...row, ...row.map((_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    if (Math.abs(A[i][i]) < 1e-12) return null;
    const pv = A[i][i];
    for (let j = 0; j < 2 * n; j++) A[i][j] /= pv;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = A[k][i];
      for (let j = 0; j < 2 * n; j++) A[k][j] -= factor * A[i][j];
    }
  }
  return A.map(row => row.slice(n));
}

// ── Multiple Linear Regression ────────────────────────────────────

function effectSizeLabelR(r) {
  const a = Math.abs(r);
  if (a < 0.1) return 'Sangat kecil';
  if (a < 0.3) return 'Kecil';
  if (a < 0.5) return 'Sedang';
  return 'Besar';
}

/**
 * Multiple linear regression: y = b0 + b1*x1 + b2*x2 + ...
 * OLS via matrix algebra, listwise deletion.
 *
 * @param {Array<number[]>} X - array of predictor columns [p][n]
 * @param {number[]} y - outcome
 * @param {string[]|null} predictorNames
 * @param {number} alpha
 * @returns {Object}
 */
export function multipleLinearRegression(X, y, predictorNames = null, alpha = 0.05) {
  // Validate & filter NA pairwise (listwise)
  const valid = [];
  for (let i = 0; i < y.length; i++) {
    const row = X.map(col => col[i]);
    if (
      row.every(v => typeof v === 'number' && isFinite(v) && !isNaN(v)) &&
      typeof y[i] === 'number' && isFinite(y[i]) && !isNaN(y[i])
    ) {
      valid.push({ x: row, y: y[i] });
    }
  }
  const n = valid.length;
  const p = X.length;
  if (n < p + 2) {
    return { error: `Sampel terlalu kecil (n=${n}, butuh minimal ${p + 2})` };
  }

  const names = predictorNames || X.map((_, i) => `X${i + 1}`);

  // Add intercept column
  const Xmat = valid.map(r => [1, ...r.x]);
  const yVec = valid.map(r => r.y);

  // β = (XᵀX)⁻¹ Xᵀy
  const Xt = transpose(Xmat);
  const XtX = matMul(Xt, Xmat);
  const XtX_inv = invertMatrix(XtX);
  if (!XtX_inv) return { error: 'Matrix tidak dapat diinversi (multikolinearitas berat?)' };
  const Xty = matVecMul(Xt, yVec);
  const beta = matVecMul(XtX_inv, Xty);

  // Predicted & residuals
  const yPred = Xmat.map(row => row.reduce((s, v, i) => s + v * beta[i], 0));
  const residuals = yVec.map((y, i) => y - yPred[i]);
  const ssRes = residuals.reduce((s, r) => s + r * r, 0);
  const meanY = yVec.reduce((a, b) => a + b, 0) / n;
  const ssTot = yVec.reduce((s, y) => s + (y - meanY) ** 2, 0);
  const ssReg = ssTot - ssRes;
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const adjR2 = n > p + 1 ? 1 - ((1 - rSquared) * (n - 1)) / (n - p - 1) : 0;

  const dfRes = n - p - 1;
  const mse = dfRes > 0 ? ssRes / dfRes : 0;
  const seBeta = XtX_inv.map((row, i) => Math.sqrt(Math.max(0, row[i] * mse)));

  const tStat = beta.map((b, i) => seBeta[i] > 0 ? b / seBeta[i] : 0);
  const pVal = tStat.map(t => tPValue(t, dfRes));

  // Overall F-test
  const F = p > 0 && mse > 0 ? (ssReg / p) / mse : 0;
  const pF = fPValue(F, p, dfRes);

  // Coefficients table
  const coeffs = [
    { name: '(Intercept)', b: beta[0], se: seBeta[0], t: tStat[0], p: pVal[0] },
    ...names.map((nm, i) => ({
      name: nm, b: beta[i + 1], se: seBeta[i + 1], t: tStat[i + 1], p: pVal[i + 1],
    })),
  ];

  // VIF (Variance Inflation Factor)
  const vifs = [];
  if (p >= 2) {
    for (let j = 0; j < p; j++) {
      const Xj = valid.map(r => r.x[j]);
      const otherColsByRow = valid.map(r => r.x.filter((_, k) => k !== j));
      const otherColsByCol = transpose(otherColsByRow);
      try {
        const subResult = multipleLinearRegression(otherColsByCol, Xj, null, alpha);
        if (!subResult.error && isFinite(subResult.rSquared) && subResult.rSquared < 1) {
          vifs.push({ predictor: names[j], vif: 1 / (1 - subResult.rSquared) });
        } else {
          vifs.push({ predictor: names[j], vif: NaN });
        }
      } catch {
        vifs.push({ predictor: names[j], vif: NaN });
      }
    }
  }

  // Durbin-Watson
  let dw = 0;
  let ssResLag = 0;
  for (let i = 1; i < n; i++) {
    dw += (residuals[i] - residuals[i - 1]) ** 2;
    ssResLag += residuals[i - 1] ** 2;
  }
  dw = ssResLag > 0 ? dw / ssResLag : 0;

  const multicollinearity = vifs.some(v => v.vif > 10)
    ? 'TERDETEKSI (VIF > 10)' : 'Tidak terdeteksi';

  const equation = 'Y = ' + coeffs.map((c, i) =>
    i === 0 ? c.b.toFixed(3) : `${c.b >= 0 ? '+ ' : '- '}${Math.abs(c.b).toFixed(3)} × ${c.name}`
  ).join(' ');

  return {
    test: 'Regresi Linier Berganda',
    n, p, dfRes,
    coefficients: coeffs,
    rSquared,
    adjustedR2: adjR2,
    standardErrorOfEstimate: Math.sqrt(mse),
    F, pF,
    ssReg, ssRes, ssTot,
    significant: pF < alpha,
    vifs,
    multicollinearity,
    equation,
    durbinWatson: dw,
    residuals,
    alpha,
    missing: y.length - n,
    notes: 'OLS via matrix algebra. Listwise deletion. VIF for multicollinearity. Durbin-Watson for autocorrelation.',
  };
}

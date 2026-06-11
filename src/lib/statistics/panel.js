/**
 * Panel data analysis functions.
 * Pure JavaScript, no dependencies.
 */

import { matMul, matVecMul, invertMatrix, transpose } from './regression.js';
import { tPValue, fPValue, chi2PValue } from './distributions.js';

// ── Panel data validation ─────────────────────────────────────────

/**
 * Validate panel data structure.
 * Expects array of objects sorted by id then time.
 * Checks for duplicates (id,time) and balancedness.
 *
 * @param {Array<Object>} data - panel data rows
 * @param {string} idCol - column name for entity identifier (default 'id')
 * @param {string} timeCol - column name for time period (default 'time')
 * @returns {Object} validation result
 */
export function validatePanel(data, idCol = 'id', timeCol = 'time') {
  if (!Array.isArray(data) || data.length === 0) {
    return {
      valid: false,
      nEntities: 0,
      nPeriods: 0,
      balanced: false,
      warnings: ['Data must be a non‑empty array'],
    };
  }

  const ids = new Set();
  const periods = new Set();
  const seen = new Set();
  let prevId = null;
  let prevTime = null;
  const warnings = [];

  // Check sorting and collect unique values
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const id = row[idCol];
    const time = row[timeCol];

    if (id === undefined || time === undefined) {
      warnings.push(`Row ${i} missing id or time column`);
      continue;
    }

    // Check duplicate (id,time)
    const key = `${id}|${time}`;
    if (seen.has(key)) {
      warnings.push(`Duplicate (${idCol}=${id}, ${timeCol}=${time}) at row ${i}`);
    }
    seen.add(key);

    // Check sorting (ascending id, then ascending time)
    if (prevId !== null) {
      if (id < prevId) {
        warnings.push(`Data not sorted by ${idCol} at row ${i}`);
      } else if (id === prevId && time < prevTime) {
        warnings.push(`Data not sorted by ${timeCol} within ${idCol}=${id} at row ${i}`);
      }
    }
    prevId = id;
    prevTime = time;

    ids.add(id);
    periods.add(time);
  }

  const nEntities = ids.size;
  const nPeriods = periods.size;
  const expectedRows = nEntities * nPeriods;
  const balanced = data.length === expectedRows;

  if (!balanced) {
    warnings.push(`Panel is unbalanced: ${data.length} rows, expected ${expectedRows} for ${nEntities}×${nPeriods}`);
  }

  return {
    valid: warnings.length === 0,
    nEntities,
    nPeriods,
    balanced,
    warnings,
  };
}

// ── Within‑group demeaning ────────────────────────────────────────

/**
 * Demean columns within each group.
 * For each group defined by groupCol, subtract the group mean from each column.
 *
 * @param {Array<Object>} data - panel data
 * @param {string[]} cols - column names to demean
 * @param {string} groupCol - grouping column (usually 'id')
 * @returns {Array<Object>} new data with demeaned columns added as `_demeaned_${col}`
 */
export function demean(data, cols, groupCol = 'id') {
  if (!Array.isArray(data) || data.length === 0) return [];

  // Compute group means
  const groupSums = new Map(); // group → {col → sum}
  const groupCounts = new Map(); // group → {col → count}

  for (const row of data) {
    const group = row[groupCol];
    if (group === undefined) continue;

    let sums = groupSums.get(group);
    let counts = groupCounts.get(group);

    if (!sums) {
      sums = Object.fromEntries(cols.map(c => [c, 0]));
      counts = Object.fromEntries(cols.map(c => [c, 0]));
      groupSums.set(group, sums);
      groupCounts.set(group, counts);
    }

    for (const col of cols) {
      const val = row[col];
      if (typeof val === 'number' && isFinite(val)) {
        sums[col] += val;
        counts[col] += 1;
      }
    }
  }

  // Compute means
  const groupMeans = new Map();
  for (const [group, sums] of groupSums) {
    const counts = groupCounts.get(group);
    const means = {};
    for (const col of cols) {
      means[col] = counts[col] > 0 ? sums[col] / counts[col] : NaN;
    }
    groupMeans.set(group, means);
  }

  // Create demeaned data
  const result = [];
  for (const row of data) {
    const group = row[groupCol];
    const newRow = { ...row };
    const means = groupMeans.get(group);
    if (means) {
      for (const col of cols) {
        const val = row[col];
        if (typeof val === 'number' && isFinite(val)) {
          newRow[`_demeaned_${col}`] = val - means[col];
        } else {
          newRow[`_demeaned_${col}`] = NaN;
        }
      }
    } else {
      for (const col of cols) {
        newRow[`_demeaned_${col}`] = NaN;
      }
    }
    result.push(newRow);
  }

  return result;
}

// ── Time‑invariant detection ──────────────────────────────────────

/**
 * Detect if a column is time‑invariant within each entity.
 * Returns true if within‑entity variance is zero after demeaning.
 *
 * @param {Array<Object>} data - panel data
 * @param {string} col - column to test
 * @param {string} entityCol - entity identifier column (default 'id')
 * @returns {boolean}
 */
export function detectTimeInvariant(data, col, entityCol = 'id') {
  if (!Array.isArray(data) || data.length === 0) return false;

  const groupVariances = new Map(); // entity → {sum, sumSq, count}

  for (const row of data) {
    const entity = row[entityCol];
    const val = row[col];
    if (entity === undefined || typeof val !== 'number' || !isFinite(val)) continue;

    let stats = groupVariances.get(entity);
    if (!stats) {
      stats = { sum: 0, sumSq: 0, count: 0 };
      groupVariances.set(entity, stats);
    }
    stats.sum += val;
    stats.sumSq += val * val;
    stats.count += 1;
  }

  // Check each entity's within variance
  for (const [entity, stats] of groupVariances) {
    if (stats.count <= 1) continue;
    const mean = stats.sum / stats.count;
    const variance = (stats.sumSq - stats.sum * mean) / (stats.count - 1);
    if (Math.abs(variance) > 1e-12) {
      return false; // at least one entity has variation
    }
  }

  return true; // all entities have zero within variance
}

// ── Durbin‑Watson statistic ──────────────────────────────────────

function durbinWatson(residuals) {
  let num = 0;
  for (let i = 1; i < residuals.length; i++) {
    const diff = residuals[i] - residuals[i - 1];
    num += diff * diff;
  }
  const den = residuals.reduce((s, r) => s + r * r, 0);
  return den === 0 ? 2 : num / den;
}

// ── Pooled OLS ────────────────────────────────────────────────────

/**
 * Pooled OLS ignoring panel structure.
 * Listwise deletion on missing values.
 *
 * @param {Array<Object>} data
 * @param {string} yCol
 * @param {string[]} xCols
 * @param {Object} options
 * @param {number} options.alpha - significance level (default 0.05)
 * @param {boolean} options.addConstant - add intercept (default true)
 * @returns {Object} regression results
 */
export function pooledOLS(data, yCol, xCols, options = {}) {
  const {
    alpha = 0.05,
    addConstant = true,
  } = options;

  // Filter rows with complete data
  const complete = [];
  for (const row of data) {
    const y = row[yCol];
    if (typeof y !== 'number' || !isFinite(y)) continue;
    let ok = true;
    for (const x of xCols) {
      const val = row[x];
      if (typeof val !== 'number' || !isFinite(val)) {
        ok = false;
        break;
      }
    }
    if (ok) complete.push(row);
  }

  const n = complete.length;
  const k = xCols.length + (addConstant ? 1 : 0);
  if (n <= k) {
    throw new Error(`Insufficient observations: n=${n}, k=${k}`);
  }

  // Build X matrix and y vector
  const X = [];
  const y = [];
  for (const row of complete) {
    const xRow = [];
    if (addConstant) xRow.push(1);
    for (const col of xCols) {
      xRow.push(row[col]);
    }
    X.push(xRow);
    y.push(row[yCol]);
  }

  // OLS: (X'X)^-1 X'y
  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  const XtXinv = invertMatrix(XtX);
  if (!XtXinv) {
    throw new Error('X′X is singular (collinearity)');
  }
  const Xty = matVecMul(Xt, y);
  const beta = matVecMul(XtXinv, Xty);

  // Residuals, fitted values
  const fitted = matVecMul(X, beta);
  const residuals = y.map((yi, i) => yi - fitted[i]);

  // Residual sum of squares
  const RSS = residuals.reduce((s, r) => s + r * r, 0);
  const TSS = y.reduce((s, yi) => {
    const ym = y.reduce((a, b) => a + b, 0) / n;
    return s + (yi - ym) * (yi - ym);
  }, 0);
  const r2 = TSS === 0 ? 0 : 1 - RSS / TSS;
  const adjR2 = 1 - (1 - r2) * (n - 1) / (n - k);

  // Standard errors
  const sigma2 = RSS / (n - k);
  const se = XtXinv.map((row, i) => Math.sqrt(sigma2 * row[i]));

  // t‑statistics and p‑values
  const tValues = beta.map((b, i) => b / se[i]);
  const pValues = tValues.map(t => tPValue(t, n - k));

  // F‑statistic (overall model significance)
  const ESS = TSS - RSS;
  const fStat = (ESS / (k - (addConstant ? 1 : 0))) / (RSS / (n - k));
  const fPValueResult = fPValue(fStat, k - (addConstant ? 1 : 0), n - k);

  // Coefficient names
  const coefNames = [];
  if (addConstant) coefNames.push('(Intercept)');
  coefNames.push(...xCols);

  return {
    beta,
    se,
    tValues,
    pValues,
    cov: XtXinv.map(row => row.map(v => v * sigma2)),
    residuals,
    fitted,
    r2,
    adjR2,
    fStat,
    fPValue: fPValueResult,
    df: n - k,
    nobs: n,
    coefNames,
    modelType: 'pooledOLS',
    durbinWatson: durbinWatson(residuals),
    significant: pValues.map(p => p < alpha),
    alpha,
    missing: data.length - n,
    notes: 'Pooled OLS ignoring panel structure. Listwise deletion.',
  };
}

// ── Fixed Effects (Within estimator) ──────────────────────────────

/**
 * Entity fixed‑effects regression (within estimator).
 * Demeans y and all xCols by entity, then runs OLS.
 *
 * @param {Array<Object>} data
 * @param {string} yCol
 * @param {string[]} xCols
 * @param {Object} options
 * @param {number} options.alpha - significance level (default 0.05)
 * @param {string} options.entityCol - entity identifier (default 'id')
 * @returns {Object} regression results
 */
export function fixedEffects(data, yCol, xCols, options = {}) {
  const {
    alpha = 0.05,
    entityCol = 'id',
  } = options;

  // Check for time‑invariant regressors
  const timeInvariant = [];
  for (const col of xCols) {
    if (detectTimeInvariant(data, col, entityCol)) {
      timeInvariant.push(col);
    }
  }
  if (timeInvariant.length > 0) {
    console.warn(`Warning: time‑invariant regressors detected: ${timeInvariant.join(', ')}. They will be eliminated by demeaning.`);
  }

  // Demean y and X columns
  const colsToDemean = [yCol, ...xCols];
  const demeaned = demean(data, colsToDemean, entityCol);

  // Build X matrix and y vector from demeaned data
  const X = [];
  const y = [];
  const entityMeans = new Map();
  const entityCounts = new Map();

  // First pass: compute entity means for original y (for overall R²)
  for (const row of data) {
    const entity = row[entityCol];
    const yVal = row[yCol];
    if (typeof yVal !== 'number' || !isFinite(yVal)) continue;
    if (!entityMeans.has(entity)) {
      entityMeans.set(entity, { sum: 0, count: 0 });
    }
    const stats = entityMeans.get(entity);
    stats.sum += yVal;
    stats.count += 1;
  }
  for (const [entity, stats] of entityMeans) {
    entityMeans.set(entity, stats.sum / stats.count);
  }

  // Second pass: collect demeaned observations
  for (const row of demeaned) {
    const yDemeaned = row[`_demeaned_${yCol}`];
    if (typeof yDemeaned !== 'number' || !isFinite(yDemeaned)) continue;
    const xRow = [];
    let ok = true;
    for (const col of xCols) {
      const val = row[`_demeaned_${col}`];
      if (typeof val !== 'number' || !isFinite(val)) {
        ok = false;
        break;
      }
      xRow.push(val);
    }
    if (ok) {
      X.push(xRow);
      y.push(yDemeaned);
    }
  }

  const n = X.length;
  const k = xCols.length;
  if (n <= k) {
    throw new Error(`Insufficient observations after demeaning: n=${n}, k=${k}`);
  }

  // OLS on demeaned data (no constant)
  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  const XtXinv = invertMatrix(XtX);
  if (!XtXinv) {
    throw new Error('X′X is singular after demeaning (collinearity)');
  }
  const Xty = matVecMul(Xt, y);
  const beta = matVecMul(XtXinv, Xty);

  // Residuals, fitted values (in demeaned space)
  const fitted = matVecMul(X, beta);
  const residuals = y.map((yi, i) => yi - fitted[i]);

  // Within R² (demeaned y)
  const RSS = residuals.reduce((s, r) => s + r * r, 0);
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const TSS_within = y.reduce((s, yi) => s + (yi - yMean) * (yi - yMean), 0);
  const r2_within = TSS_within === 0 ? 0 : 1 - RSS / TSS_within;

  // Overall R² (original y)
  const overallFitted = [];
  const overallResiduals = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const entity = row[entityCol];
    const entityMean = entityMeans.get(entity) || 0;
    let pred = entityMean;
    for (let j = 0; j < xCols.length; j++) {
      const xVal = row[xCols[j]];
      if (typeof xVal !== 'number' || !isFinite(xVal)) {
        pred = NaN;
        break;
      }
      pred += beta[j] * (xVal - (entityMeans.get(entity) || 0));
    }
    if (isFinite(pred)) {
      overallFitted.push(pred);
      overallResiduals.push(row[yCol] - pred);
    }
  }
  const overallY = overallFitted.map((_, i) => data[i][yCol]);
  const overallTSS = overallY.reduce((s, yi) => {
    const ym = overallY.reduce((a, b) => a + b, 0) / overallY.length;
    return s + (yi - ym) * (yi - ym);
  }, 0);
  const overallRSS = overallResiduals.reduce((s, r) => s + r * r, 0);
  const r2_overall = overallTSS === 0 ? 0 : 1 - overallRSS / overallTSS;

  // Standard errors
  const sigma2 = RSS / (n - k);
  const se = XtXinv.map((row, i) => Math.sqrt(sigma2 * row[i]));

  // t‑statistics and p‑values
  const tValues = beta.map((b, i) => b / se[i]);
  const pValues = tValues.map(t => tPValue(t, n - k));

  // F‑statistic
  const ESS_within = TSS_within - RSS;
  const fStat = (ESS_within / k) / (RSS / (n - k));
  const fPValueResult = fPValue(fStat, k, n - k);

  // Entity means (original y)
  const entityMeanMap = {};
  for (const [entity, mean] of entityMeans) {
    entityMeanMap[entity] = mean;
  }

  return {
    beta,
    se,
    tValues,
    pValues,
    cov: XtXinv.map(row => row.map(v => v * sigma2)),
    residuals,
    fitted,
    r2: r2_within,
    adjR2: 1 - (1 - r2_within) * (n - 1) / (n - k),
    r2_overall,
    fStat,
    fPValue: fPValueResult,
    df: n - k,
    nobs: n,
    coefNames: xCols,
    modelType: 'fixedEffects',
    effectType: 'entity',
    entityMeans: entityMeanMap,
    durbinWatson: durbinWatson(residuals),
    significant: pValues.map(p => p < alpha),
    alpha,
    missing: data.length - n,
    timeInvariant,
    notes: 'Entity fixed‑effects (within estimator). Demeaning eliminates time‑invariant regressors.',
  };
}

// fCDF removed — using fPValue from distributions.js
// ── Matrix helpers for Hausman test ──────────────────────────────

/**
 * Eigenvalue decomposition of symmetric matrix via Jacobi rotation.
 * Returns { eigenvalues, eigenvectors }.
 */
function jacobiEig(A, maxIter = 200, tol = 1e-12) {
  const n = A.length;
  let V = A.map((row, i) => row.map((_, j) => (i === j ? 1 : 0))); // identity
  let S = A.map(row => [...row]); // copy

  for (let iter = 0; iter < maxIter; iter++) {
    // Find largest off-diagonal element
    let maxVal = 0, p = 0, q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(S[i][j]) > maxVal) {
          maxVal = Math.abs(S[i][j]);
          p = i; q = j;
        }
      }
    }
    if (maxVal < tol) break;

    // Compute rotation angle
    const theta = S[p][p] === S[q][q]
      ? Math.PI / 4
      : 0.5 * Math.atan2(2 * S[p][q], S[p][p] - S[q][q]);
    const c = Math.cos(theta), s = Math.sin(theta);

    // Apply rotation: S' = G' * S * G
    const Sp = S[p], Sq = S[q];
    const Spq = Sp[q];
    S[p][p] = c * c * Sp[p] + 2 * s * c * Spq + s * s * Sq[q];
    S[q][q] = s * s * Sp[p] - 2 * s * c * Spq + c * c * Sq[q];
    S[p][q] = 0;
    S[q][p] = 0;
    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const Sip = S[i][p], Siq = S[i][q];
        S[i][p] = c * Sip + s * Siq;
        S[p][i] = S[i][p];
        S[i][q] = -s * Sip + c * Siq;
        S[q][i] = S[i][q];
      }
    }

    // Update eigenvectors
    for (let i = 0; i < n; i++) {
      const Vip = V[i][p], Viq = V[i][q];
      V[i][p] = c * Vip + s * Viq;
      V[i][q] = -s * Vip + c * Viq;
    }
  }

  const eigenvalues = Array.from({ length: n }, (_, i) => S[i][i]);
  return { eigenvalues, eigenvectors: V };
}

/**
 * Moore-Penrose pseudo-inverse via eigendecomposition (symmetric matrix).
 */
function generalizedInverse(A, tol = 1e-10) {
  const n = A.length;
  const { eigenvalues, eigenvectors: V } = jacobiEig(A);
  const maxEig = Math.max(...eigenvalues.map(Math.abs));
  const threshold = tol * maxEig;

  // D+ = diag(1/λᵢ) for significant eigenvalues
  const Dplus = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    if (Math.abs(eigenvalues[i]) > threshold) {
      Dplus[i][i] = 1 / eigenvalues[i];
    }
  }

  // A+ = V * D+ * V'
  const Vt = transpose(V);
  return matMul(matMul(V, Dplus), Vt);
}

/**
 * Matrix rank via eigenvalue decomposition.
 */
function matrixRank(A, tol = 1e-10) {
  const { eigenvalues } = jacobiEig(A);
  const maxEig = Math.max(...eigenvalues.map(Math.abs));
  return eigenvalues.filter(e => Math.abs(e) > tol * maxEig).length;
}

// ── Random Effects (GLS estimator) ───────────────────────────────

export function randomEffects(data, yCol, xCols, options = {}) {
  const { alpha = 0.05, entityCol = 'id' } = options;

  // Step 1: Run pooled OLS and FE
  const pooled = pooledOLS(data, yCol, xCols, options);
  const fe = fixedEffects(data, yCol, xCols, options);

  // Step 2: Variance components
  const n = pooled.nobs;
  const nEntities = Object.keys(fe.entityMeans).length;
  const Tbar = n / nEntities;

  const sigma2_e = fe.df > 0
    ? fe.residuals.reduce((s, r) => s + r * r, 0) / fe.df
    : 0;

  // σ²_u from pooled - FE: (σ²_pooled - σ²_e) / T̄
  const sigma2_pooled = pooled.df > 0
    ? pooled.residuals.reduce((s, r) => s + r * r, 0) / pooled.df
    : 0;
  let sigma2_u = (sigma2_pooled - sigma2_e) / Tbar;
  if (sigma2_u < 0) sigma2_u = 0;

  // If σ²_u = 0, RE collapses to pooledOLS
  if (sigma2_u === 0) {
    return {
      ...pooled,
      modelType: 'randomEffects',
      varianceComponents: { sigma2_u: 0, sigma2_e },
      theta: null,
      notes: 'σ²_u clamped to 0 — RE collapsed to pooledOLS.',
    };
  }

  // Step 3: θ per entity
  const entityCounts = new Map();
  for (const row of data) {
    const e = row[entityCol];
    if (e === undefined) continue;
    entityCounts.set(e, (entityCounts.get(e) || 0) + 1);
  }

  const theta = {};
  for (const [entity, Ti] of entityCounts) {
    theta[entity] = 1 - Math.sqrt(sigma2_e / (sigma2_e + Ti * sigma2_u));
  }

  // Step 4: Quasi-demean and run OLS
  const transformed = data.map(row => {
    const entity = row[entityCol];
    const th = theta[entity] || 0;
    const newRow = { ...row };
    // Transform y
    if (typeof row[yCol] === 'number' && isFinite(row[yCol])) {
      newRow[`_re_${yCol}`] = row[yCol] - th * (fe.entityMeans[entity] || 0);
    }
    // Transform x (use entity mean from FE if available, else compute)
    for (const col of xCols) {
      if (typeof row[col] === 'number' && isFinite(row[col])) {
        // Compute entity mean for this column
        const entityRows = data.filter(r => r[entityCol] === entity);
        const entityMean = entityRows.reduce((s, r) => s + (r[col] || 0), 0) / entityRows.length;
        newRow[`_re_${col}`] = row[col] - th * entityMean;
      }
    }
    return newRow;
  });

  const reResult = pooledOLS(transformed, `_re_${yCol}`, xCols.map(c => `_re_${c}`), { alpha });

  return {
    ...reResult,
    modelType: 'randomEffects',
    varianceComponents: { sigma2_u, sigma2_e },
    theta,
    notes: 'Random effects (GLS). Quasi-demeaned. σ²_u clamped to 0 if negative.',
  };
}

// ── Hausman Test ─────────────────────────────────────────────────

export function hausmanTest(feResult, reResult) {
  // Shared coefficients (exclude intercept)
  const feNames = feResult.coefNames || [];
  const reNames = reResult.coefNames || [];
  const shared = feNames.filter(n => n !== '(Intercept)' && reNames.includes(n));

  if (shared.length === 0) {
    return { statistic: 0, df: 0, pValue: 1, isSignificant: false, recommendation: 'RE', modelType: 'hausmanTest', warning: 'No shared coefficients' };
  }

  const feIdx = shared.map(n => feNames.indexOf(n));
  const reIdx = shared.map(n => reNames.indexOf(n));

  const d = feIdx.map((fi, i) => feResult.beta[fi] - reResult.beta[reIdx[i]]);

  // V = covFE - covRE (shared subset)
  const k = shared.length;
  const V = Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => {
      const vij = (feResult.cov?.[feIdx[i]]?.[feIdx[j]] || 0) - (reResult.cov?.[reIdx[i]]?.[reIdx[j]] || 0);
      return vij;
    })
  );

  // Check positive definiteness via eigenvalues
  let Vinv, df, warning = null;
  const { eigenvalues } = jacobiEig(V);
  const allPositive = eigenvalues.every(e => e > 1e-12);

  if (allPositive) {
    Vinv = invertMatrix(V);
    df = k;
  } else {
    // Use generalized inverse
    Vinv = generalizedInverse(V);
    df = matrixRank(V);
    warning = 'V not positive definite — using generalized inverse (pseudo-inverse). df = rank(V).';
  }

  if (!Vinv) {
    return { statistic: 0, df: 0, pValue: 1, isSignificant: false, recommendation: 'RE', modelType: 'hausmanTest', warning: 'Cannot invert V' };
  }

  // H = d' * V⁻¹ * d
  const Vinv_d = matVecMul(Vinv, d);
  const H = d.reduce((s, di, i) => s + di * Vinv_d[i], 0);
  const pValue = chi2PValue(Math.max(0, H), df);

  return {
    statistic: H,
    df,
    pValue,
    isSignificant: pValue < 0.05,
    recommendation: pValue < 0.05 ? 'FE' : 'RE',
    warning,
    modelType: 'hausmanTest',
  };
}

// ── Breusch-Pagan LM ────────────────────────────────────────────

export function breuschPaganLM(pooledResult, data, entityCol = 'id') {
  const residuals = pooledResult.residuals;
  const n = residuals.length;

  // Group residuals by entity
  const entityResiduals = new Map();
  for (let i = 0; i < n; i++) {
    const entity = data[i]?.[entityCol];
    if (entity === undefined) continue;
    if (!entityResiduals.has(entity)) entityResiduals.set(entity, []);
    entityResiduals.get(entity).push(residuals[i]);
  }

  const N = entityResiduals.size;
  const Tbar = n / N;

  // S1 = ΣᵢΣₜ eᵢₜ²
  const S1 = residuals.reduce((s, e) => s + e * e, 0);

  // S2 = Σᵢ (Σₜ eᵢₜ)²
  let S2 = 0;
  for (const [, resids] of entityResiduals) {
    const sum = resids.reduce((s, e) => s + e, 0);
    S2 += sum * sum;
  }

  // LM = N*T̄ / (2*(T̄-1)) * (S2/S1 - 1)²
  const LM = (N * Tbar) / (2 * (Tbar - 1)) * Math.pow(S2 / S1 - 1, 2);
  const pValue = chi2PValue(Math.max(0, LM), 1);

  return {
    statistic: LM,
    df: 1,
    pValue,
    isSignificant: pValue < 0.05,
    modelType: 'breuschPaganLM',
  };
}

// ═══════════════════════════════════════════════════════════════════
// Phase 4C — Heteroscedasticity & Serial Correlation Tests
// ═══════════════════════════════════════════════════════════════════

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Lightweight OLS for auxiliary regressions.
 * y: array of length n, X: array of arrays [n][k]
 * Returns { beta, residuals, r2, fitted }
 */
function olsAuxiliary(y, X) {
  const n = y.length;
  const k = X[0]?.length || 0;
  if (n <= k) return null;

  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  const XtXinv = invertMatrix(XtX);
  if (!XtXinv) return null;

  const Xty = matVecMul(Xt, y);
  const beta = matVecMul(XtXinv, Xty);
  const fitted = matVecMul(X, beta);
  const residuals = y.map((yi, i) => yi - fitted[i]);

  const RSS = residuals.reduce((s, r) => s + r * r, 0);
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const TSS = y.reduce((s, yi) => s + (yi - yMean) * (yi - yMean), 0);
  const r2 = TSS === 0 ? 0 : 1 - RSS / TSS;

  return { beta, residuals, r2, fitted, n, k, XtXinv, RSS };
}

/**
 * Cluster-robust (sandwich) covariance matrix.
 * residuals: array, X: [n][k], clusterVar: array of cluster ids (length n)
 * V = (X'X)^-1 * Σ_g (X_g'e_g)(X_g'e_g)' * (X'X)^-1
 */
function clusterRobustSE(residuals, X, clusterVar) {
  const n = residuals.length;
  const k = X[0]?.length || 0;

  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  const XtXinv = invertMatrix(XtX);
  if (!XtXinv) return null;

  // Group by cluster
  const clusters = new Map();
  for (let i = 0; i < n; i++) {
    const g = clusterVar[i];
    if (!clusters.has(g)) clusters.set(g, []);
    clusters.get(g).push(i);
  }

  // Meat: Σ_g s_g * s_g' where s_g = Σᵢ∈g Xᵢ * eᵢ
  const meat = Array.from({ length: k }, () => new Array(k).fill(0));
  for (const [, indices] of clusters) {
    const s = new Array(k).fill(0);
    for (const i of indices) {
      for (let j = 0; j < k; j++) {
        s[j] += X[i][j] * residuals[i];
      }
    }
    for (let a = 0; a < k; a++) {
      for (let b = 0; b < k; b++) {
        meat[a][b] += s[a] * s[b];
      }
    }
  }

  // V = (X'X)^-1 * meat * (X'X)^-1
  const bread = XtXinv;
  const temp = matMul(bread, meat);
  return matMul(temp, bread);
}

/**
 * Generate White test terms: squares + cross-products of non-intercept columns.
 * X: [n][k] where column 0 is intercept.
 * Returns: { terms: [n][df], df: number of new columns }
 */
function generateWhiteTerms(X) {
  const n = X.length;
  const k = X[0]?.length || 0;
  if (k <= 1) return { terms: [], df: 0 };

  // Non-intercept columns (indices 1..k-1)
  const nonConst = [];
  for (let j = 1; j < k; j++) {
    // Check if column is constant
    const vals = X.map(row => row[j]);
    const first = vals[0];
    const isConst = vals.every(v => v === first);
    if (!isConst) nonConst.push(j);
  }

  const p = nonConst.length;
  // df = p(p+3)/2 (squares + cross-products)
  const terms = [];
  const colNames = [];

  // Squares
  for (const j of nonConst) {
    terms.push(X.map(row => row[j] * row[j]));
    colNames.push(`x${j}²`);
  }

  // Cross-products
  for (let a = 0; a < nonConst.length; a++) {
    for (let b = a + 1; b < nonConst.length; b++) {
      terms.push(X.map((row, i) => row[nonConst[a]] * row[nonConst[b]]));
      colNames.push(`x${nonConst[a]}*x${nonConst[b]}`);
    }
  }

  // Build term matrix [n][terms.length]
  const termMatrix = Array.from({ length: n }, (_, i) =>
    terms.map(t => t[i])
  );

  return { terms: termMatrix, df: terms.length, colNames };
}

/**
 * First-difference within entity. Skips gaps in time.
 * Returns array of { entity, time, Δcols... }
 */
function firstDifference(data, cols, entityCol, timeCol) {
  // Sort by entity, time
  const sorted = [...data].sort((a, b) => {
    const ea = a[entityCol], eb = b[entityCol];
    if (ea !== eb) return ea < eb ? -1 : 1;
    return (a[timeCol] || 0) - (b[timeCol] || 0);
  });

  // Group by entity
  const groups = new Map();
  for (const row of sorted) {
    const e = row[entityCol];
    if (!groups.has(e)) groups.set(e, []);
    groups.get(e).push(row);
  }

  const result = [];
  for (const [entity, rows] of groups) {
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1], curr = rows[i];
      // Skip if gap in time (not consecutive)
      const prevTime = prev[timeCol], currTime = curr[timeCol];
      if (typeof prevTime === 'number' && typeof currTime === 'number' && currTime - prevTime !== 1) continue;

      const diff = { entity, time: currTime };
      for (const col of cols) {
        const pv = prev[col], cv = curr[col];
        if (typeof pv === 'number' && isFinite(pv) && typeof cv === 'number' && isFinite(cv)) {
          diff[`Δ${col}`] = cv - pv;
        } else {
          diff[`Δ${col}`] = NaN;
        }
      }
      result.push(diff);
    }
  }
  return result;
}

// ── Breusch-Pagan Test ───────────────────────────────────────────

export function breuschPagan(modelResult, data, xCols, options = {}) {
  const { variant = 'BP' } = options; // 'BP' or 'Koenker'
  const residuals = modelResult.residuals;
  const n = residuals.length;

  // Build X matrix with intercept
  const X = data.map(row => {
    const xRow = [1];
    for (const col of xCols) {
      xRow.push(typeof row[col] === 'number' && isFinite(row[col]) ? row[col] : 0);
    }
    return xRow;
  });

  // Dependent variable: e² (BP) or studentized e² (Koenker)
  let yAux;
  if (variant === 'Koenker') {
    // Studentized: e² / mean(e²)
    const meanE2 = residuals.reduce((s, e) => s + e * e, 0) / n;
    yAux = residuals.map(e => (e * e) / meanE2);
  } else {
    yAux = residuals.map(e => e * e);
  }

  // Auxiliary OLS: e² ~ 1 + X
  const aux = olsAuxiliary(yAux, X);
  if (!aux) return { statistic: NaN, df: NaN, pValue: NaN, isSignificant: false, variant, modelType: 'breuschPagan', error: 'Auxiliary regression failed' };

  // LM = n * R² ~ χ²(k)
  const k = xCols.length; // excludes intercept
  const LM = n * aux.r2;
  const pValue = chi2PValue(Math.max(0, LM), k);

  return {
    statistic: LM,
    df: k,
    pValue,
    isSignificant: pValue < 0.05,
    variant,
    modelType: 'breuschPagan',
  };
}

// ── White Test ───────────────────────────────────────────────────

export function whiteTest(modelResult, data, xCols) {
  const residuals = modelResult.residuals;
  const n = residuals.length;

  // Build X matrix with intercept
  const X = data.map(row => {
    const xRow = [1];
    for (const col of xCols) {
      xRow.push(typeof row[col] === 'number' && isFinite(row[col]) ? row[col] : 0);
    }
    return xRow;
  });

  // Generate White terms (squares + cross-products)
  const { terms, df: rawDf } = generateWhiteTerms(X);
  if (rawDf === 0) return { statistic: 0, df: 0, pValue: 1, isSignificant: false, nTerms: 0, nTermsAfterRank: 0, modelType: 'whiteTest' };

  // Build augmented X: [1, X, White terms]
  const Xaug = X.map((row, i) => [1, ...row.slice(1), ...terms[i]]);

  // Check rank and drop collinear columns
  const kAug = Xaug[0].length;
  const keep = [];
  for (let j = 0; j < kAug; j++) {
    // Check if this column adds rank
    const testCols = [...keep, j].filter((v, i, a) => a.indexOf(v) === i);
    const Xtest = Xaug.map(row => testCols.map(c => row[c]));
    const Xt = transpose(Xtest);
    const XtX = matMul(Xt, Xtest);
    const XtXinv = invertMatrix(XtX);
    if (XtXinv) keep.push(j);
  }

  // Reduced X
  const Xred = Xaug.map(row => keep.map(j => row[j]));
  const dfAfter = keep.length - 1; // minus intercept

  // Auxiliary OLS: e² ~ reduced X
  const e2 = residuals.map(e => e * e);
  const aux = olsAuxiliary(e2, Xred);
  if (!aux) return { statistic: NaN, df: dfAfter, pValue: NaN, isSignificant: false, nTerms: rawDf, nTermsAfterRank: dfAfter, modelType: 'whiteTest', error: 'Auxiliary regression failed' };

  const LM = n * aux.r2;
  const pValue = chi2PValue(Math.max(0, LM), dfAfter);

  return {
    statistic: LM,
    df: dfAfter,
    pValue,
    isSignificant: pValue < 0.05,
    nTerms: rawDf,
    nTermsAfterRank: dfAfter,
    modelType: 'whiteTest',
  };
}

// ── Wooldridge First-Difference Test ─────────────────────────────

export function wooldridgeTest(data, yCol, xCols, entityCol = 'id', timeCol = 'time') {
  // Step 1: First-difference
  const diffData = firstDifference(data, [yCol, ...xCols], entityCol, timeCol);

  // Group diffs by entity
  const entityDiffs = new Map();
  for (const row of diffData) {
    const e = row.entity;
    if (!entityDiffs.has(e)) entityDiffs.set(e, []);
    entityDiffs.get(e).push(row);
  }

  // Filter entities with ≥2 diffs (need lag)
  const validEntities = [];
  for (const [entity, rows] of entityDiffs) {
    if (rows.length >= 2) validEntities.push(entity);
  }

  if (validEntities.length === 0) {
    return { statistic: NaN, pValue: NaN, rho: NaN, isSignificant: false, nEntities: 0, modelType: 'wooldridgeTest', error: 'No entities with ≥3 consecutive observations' };
  }

  // Step 2: OLS Δy ~ ΔX (no intercept)
  const dyCol = `Δ${yCol}`;
  const dxCols = xCols.map(c => `Δ${c}`);
  const validDiffs = diffData.filter(row => validEntities.includes(row.entity));

  const yDiffs = [];
  const XDiffs = [];
  for (const row of validDiffs) {
    const dy = row[dyCol];
    if (typeof dy !== 'number' || !isFinite(dy)) continue;
    const dxRow = dxCols.map(c => {
      const v = row[c];
      return typeof v === 'number' && isFinite(v) ? v : 0;
    });
    yDiffs.push(dy);
    XDiffs.push(dxRow);
  }

  const olsDiff = olsAuxiliary(yDiffs, XDiffs);
  if (!olsDiff) return { statistic: NaN, pValue: NaN, rho: NaN, isSignificant: false, nEntities: validEntities.length, modelType: 'wooldridgeTest', error: 'First-difference OLS failed' };

  // Step 3: Get residuals v_it and build lag pairs
  const vPairs = []; // [v_it, v_i,t-1]
  let idx = 0;
  for (const entity of validEntities) {
    const rows = entityDiffs.get(entity).filter(r => validDiffs.includes(r));
    for (let i = 1; i < rows.length; i++) {
      const vCurr = olsDiff.residuals[idx + i];
      const vPrev = olsDiff.residuals[idx + i - 1];
      if (typeof vCurr === 'number' && isFinite(vCurr) && typeof vPrev === 'number' && isFinite(vPrev)) {
        vPairs.push([vCurr, vPrev]);
      }
    }
    idx += rows.length;
  }

  if (vPairs.length < 3) {
    return { statistic: NaN, pValue: NaN, rho: NaN, isSignificant: false, nEntities: validEntities.length, modelType: 'wooldridgeTest', error: 'Too few lag pairs' };
  }

  // Step 4: Regress v_it on v_i,t-1 with intercept
  const yLag = vPairs.map(p => p[0]);
  const XLag = vPairs.map(p => [1, p[1]]);
  const lagOls = olsAuxiliary(yLag, XLag);
  if (!lagOls) return { statistic: NaN, pValue: NaN, rho: NaN, isSignificant: false, nEntities: validEntities.length, modelType: 'wooldridgeTest', error: 'Lag regression failed' };

  const rho = lagOls.beta[1];

  // Step 5: Cluster-robust SE by entity for H₀: ρ = -0.5
  // Build cluster variable for vPairs
  const clusterIds = [];
  let cidx = 0;
  for (const entity of validEntities) {
    const rows = entityDiffs.get(entity).filter(r => validDiffs.includes(r));
    for (let i = 1; i < rows.length; i++) {
      clusterIds.push(entity);
    }
  }

  const covCluster = clusterRobustSE(lagOls.residuals, XLag, clusterIds);
  const seRho = covCluster ? Math.sqrt(Math.max(0, covCluster[1][1])) : Math.sqrt(Math.max(0, (lagOls.XtXinv?.[1]?.[1] || 0) * (lagOls.RSS / (lagOls.n - lagOls.k))));
  const tStat = seRho > 0 ? (rho - (-0.5)) / seRho : 0;
  // Use normal approximation for large n
  const pValue = 2 * (1 - normalCDF(Math.abs(tStat)));

  return {
    statistic: tStat,
    pValue,
    rho,
    isSignificant: pValue < 0.05,
    nEntities: validEntities.length,
    modelType: 'wooldridgeTest',
  };
}

// Normal CDF helper (import if not already available, else inline)
function normalCDF(x) {
  // Abramowitz & Stegun approximation
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

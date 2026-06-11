/**
 * Panel data analysis functions.
 * Pure JavaScript, no dependencies.
 */

import { matMul, matVecMul, invertMatrix, transpose } from './regression.js';
import { tPValue, fPValue } from './distributions.js';

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
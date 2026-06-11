/**
 * UI Adapters — bridge new statistics engine to existing Statistik UI.
 *
 * Each adapter:
 * 1. Calls the new engine function
 * 2. Maps output to the shape the UI components expect
 * 3. Preserves raw precision (formatting stays in display layer)
 *
 * Rules:
 * - Missing values excluded, never treated as 0
 * - t-test, ANOVA, regression: listwise deletion (handled by engine)
 * - correlation: pairwise deletion (handled by engine)
 * - All p-values two-tailed (engine default)
 * - SPSS-style defaults; not SPSS-verified until golden SPSS outputs exist
 */

import { describe as engineDescribe } from './descriptive.js';
import { pearson, spearman } from './correlation.js';
import { cronbachAlpha as engineCronbach } from './reliability.js';
import { oneSampleTTest as engineOneSampleT, independentTTest as engineIndepT, pairedTTest as enginePairedT } from './ttest.js';
import { oneWayANOVA as engineAnova, twoWayANOVA as engineTwoWay } from './anova.js';
import { simpleRegression as engineRegression, multipleLinearRegression as engineMLR } from './regression.js';
import { testNormality as engineNormality, shapiroWilk as engineShapiro, kolmogorovSmirnov as engineKS } from './normality.js';

// ── Descriptive ───────────────────────────────────────────────────

/**
 * Format descriptive results for UI consumption.
 * Matches old formatDescriptive() output shape.
 */
export function formatDescriptive(d) {
  if (!d) return null;
  return {
    n: d.n,
    mean: d.mean,
    median: d.median,
    mode: d.mode,
    stdDev: d.stdDev,
    variance: d.variance,
    min: d.min,
    max: d.max,
    range: d.range,
    q1: d.q1,
    q3: d.q3,
    iqr: d.iqr,
    skewness: d.skewness,
    kurtosis: d.kurtosis,
    sem: d.sem,
  };
}

/**
 * Adapter for deskriptif tool.
 * Input: values array
 * Output: { n, mean, median, mode, stdDev, variance, min, max, range, q1, q3, iqr, skewness, kurtosis, sem }
 */
export function describeAdapter(values) {
  const result = engineDescribe(values);
  return result ? formatDescriptive(result) : null;
}

// ── Correlation ───────────────────────────────────────────────────

/**
 * Adapter for Pearson correlation.
 * Matches old pearsonCorrelation() output shape.
 */
export function pearsonAdapter(x, y) {
  const result = pearson(x, y);
  if (result.error) return { r: NaN, pValue: NaN, n: result.n, error: result.error };
  return {
    r: result.r,
    pValue: result.pValue,
    n: result.n,
    df: result.df,
    t: result.t,
    ci95: result.ci95,
    strength: result.strength,
    direction: result.direction,
    interpretation: buildInterpretation(result.r, result.pValue, result.n, 'Pearson', result.ci95),
  };
}

/**
 * Adapter for Spearman correlation.
 * Matches old spearmanCorrelation() output shape.
 */
export function spearmanAdapter(x, y) {
  const result = spearman(x, y);
  if (result.error) return { rho: NaN, pValue: NaN, n: result.n, error: result.error };
  return {
    rho: result.rho,
    pValue: result.pValue,
    n: result.n,
    df: result.df,
    t: result.t,
    strength: interpretStrength(result.rho),
    direction: result.rho > 0 ? 'positif' : result.rho < 0 ? 'negatif' : 'tidak ada',
    interpretation: buildInterpretation(result.rho, result.pValue, result.n, 'Spearman'),
  };
}

// ── Reliability ───────────────────────────────────────────────────

/**
 * Adapter for Cronbach's Alpha.
 * Matches old cronbachAlpha() output shape.
 */
export function cronbachAdapter(items) {
  const result = engineCronbach(items);
  if (result.error) return result;
  return {
    alpha: result.alpha,
    k: result.k,
    n: result.n,
    itemVariances: result.itemVariances,
    totalVariance: result.totalVariance,
    interpretation: result.interpretation,
  };
}

// ── T-Test ────────────────────────────────────────────────────────

/**
 * Adapter for independent t-test.
 * Matches old independentTTest() output shape.
 * Input: two arrays (group1, group2)
 */
export function independentTTestAdapter(group1, group2) {
  const result = engineIndepT(group1, group2);
  if (result.error) return { error: result.error };
  return {
    mean1: result.group1.mean,
    mean2: result.group2.mean,
    n1: result.group1.n,
    n2: result.group2.n,
    sd1: result.group1.stdDev,
    sd2: result.group2.stdDev,
    meanDiff: result.meanDiff,
    t: result.student.t,
    df: result.student.df,
    pValue: result.student.pValue,
    cohensD: result.cohensD,
    ci95: result.ci95,
    significant: result.significant,
    // Welch
    welch: {
      t: result.welch.t,
      df: result.welch.df,
      pValue: result.welch.pValue,
    },
  };
}

/**
 * Adapter for paired t-test.
 * Matches old pairedTTest() output shape.
 */
export function pairedTTestAdapter(pre, post) {
  const result = enginePairedT(pre, post);
  if (result.error) return { error: result.error };
  return {
    meanDiff: result.meanDiff,
    sdDiff: result.sdDiff,
    n: result.n,
    t: result.t,
    df: result.df,
    pValue: result.pValue,
    cohensD: result.cohensD,
    ci95: result.ci95,
    significant: result.significant,
  };
}

// ── ANOVA ─────────────────────────────────────────────────────────

/**
 * Adapter for one-way ANOVA.
 * Input: array of group arrays + labels (old API shape)
 * Output: matches old oneWayANOVA() shape.
 */
export function oneWayANOVAAdapter(groups, groupLabels) {
  const labels = groupLabels || groups.map((_, i) => `Group ${i + 1}`);
  // Flatten groups + create group mapping for new engine
  const values = [];
  const groupCol = [];
  groups.forEach((g, i) => {
    g.forEach(v => {
      values.push(v);
      groupCol.push(labels[i]);
    });
  });

  const result = engineAnova(values, groupCol);
  if (result.error) return { error: result.error };

  return {
    k: result.k,
    N: result.N,
    F: result.F,
    dfBetween: result.dfBetween,
    dfWithin: result.dfWithin,
    pValue: result.pValue,
    ssBetween: result.ssBetween,
    ssWithin: result.ssWithin,
    etaSquared: result.etaSquared,
    omegaSquared: result.omegaSquared,
    groupMeans: result.groupMeans.map(g => ({ mean: g.mean, n: g.n, label: g.group })),
    significant: result.significant,
    postHoc: result.postHoc,
  };
}

// ── Regression ────────────────────────────────────────────────────

/**
 * Adapter for simple linear regression.
 * Matches old simpleLinearRegression() output shape.
 */
export function simpleRegressionAdapter(x, y) {
  const result = engineRegression(x, y);
  if (result.error) return { error: result.error };
  return {
    b0: result.b0,
    b1: result.b1,
    r: result.r,
    r2: result.r2,
    r2Adj: result.r2Adjusted,
    se_b1: result.se_b1,
    t_b1: result.t_b1,
    p_b1: result.p_b1,
    significant: result.significant,
    n: result.n,
    rmse: result.rmse,
    durbinWatson: result.durbinWatson,
    residuals: result.residuals,
    meanX: result.meanX,
    meanY: result.meanY,
  };
}

// ── Normality ─────────────────────────────────────────────────────

/**
 * Adapter for normality tests.
 * Matches old testNormality() output shape.
 */
export function normalityAdapter(values, alpha = 0.05) {
  const clean = values.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
  const n = clean.length;
  // Match old behavior: Shapiro-Wilk for n≤50, KS for n>50
  if (n <= 50) {
    const result = engineShapiro(values, alpha);
    return { ...result, method: 'Shapiro-Wilk' };
  } else {
    const result = engineKS(values, alpha);
    return { ...result, method: 'Kolmogorov-Smirnov' };
  }
}

// ── One-sample T-Test ────────────────────────────────────────────

/**
 * Adapter for one-sample t-test.
 * Matches old oneSampleTTest() output shape.
 */
export function oneSampleTTestAdapter(values, mu0 = 0, alpha = 0.05) {
  const result = engineOneSampleT(values, mu0, alpha);
  if (result.error) return { error: result.error };
  return {
    test: result.test,
    n: result.n,
    mean: result.mean,
    sd: result.sd,
    sem: result.sem,
    mu0: result.mu0,
    t: result.t,
    df: result.df,
    pValue: result.pValue,
    alpha: result.alpha,
    cohensD: result.cohensD,
    cohensD_CI: result.cohensD_CI,
    ci95: result.ci95,
    significant: result.significant,
  };
}

// ── Non-parametric tests ─────────────────────────────────────────

import { mannWhitneyU as engineMWU, wilcoxonSignedRank as engineWilcoxon, kruskalWallis as engineKW } from './nonparametric.js';
import { itemValidity as engineItemValidity } from './itemValidity.js';
import { calcNGain, categorizeNGain, analyzeNGain } from './ngain.js';
import { chiSquareIndependence, chiSquareGoodnessOfFit } from './chisquare.js';
import { pooledOLS as enginePooledOLS, fixedEffects as engineFE, randomEffects as engineRE, hausmanTest as engineHausman, breuschPaganLM as engineBP, breuschPagan as engineBP2, whiteTest as engineWhite, wooldridgeTest as engineWooldridge } from './panel.js';

/**
 * Adapter for Mann-Whitney U.
 * Matches old mannWhitneyU() output shape.
 */
export function mannWhitneyAdapter(group1, group2, alpha = 0.05) {
  return engineMWU(group1, group2, alpha);
}

/**
 * Adapter for Wilcoxon Signed-Rank.
 * Matches old wilcoxonSignedRank() output shape.
 */
export function wilcoxonAdapter(before, post, alpha = 0.05) {
  return engineWilcoxon(before, post, alpha);
}

/**
 * Adapter for Kruskal-Wallis.
 * Matches old kruskalWallis() output shape.
 */
export function kruskalWallisAdapter(groups, groupNames = null, alpha = 0.05) {
  return engineKW(groups, groupNames, alpha);
}

// ── Item Validity ─────────────────────────────────────────────────

/**
 * Adapter for item validity (corrected item-total correlation).
 * Matches old itemValidity() output shape.
 * Input: items matrix [n_respondents][n_items]
 */
export function itemValidityAdapter(items) {
  return engineItemValidity(items);
}

// ── N-Gain ───────────────────────────────────────────────────────

/**
 * Adapter for N-gain analysis (Hake, 1998).
 * Matches old analyzeNGain() output shape.
 * Input: { pre, post, maxScore?, names? }
 */
export function analyzeNGainAdapter(data) {
  return analyzeNGain(data);
}

// ── Multiple Linear Regression ──────────────────────────────────

/**
 * Adapter for multiple linear regression.
 * Matches old multipleLinearRegression() output shape.
 */
export function multipleLinearRegressionAdapter(X, y, predictorNames, alpha = 0.05) {
  return engineMLR(X, y, predictorNames, alpha);
}

// ── Two-Way ANOVA ───────────────────────────────────────────────

/**
 * Adapter for two-way ANOVA.
 * Matches old twoWayANOVA() output shape.
 */
export function twoWayANOVAAdapter(args) {
  return engineTwoWay(args);
}

// ── Chi-Square ──────────────────────────────────────────────────────

/**
 * Adapter for chi-square test of independence.
 * Matches old chiSquareIndependence() output shape.
 */
export function chiSquareIndependenceAdapter(col1, col2, alpha = 0.05) {
  return chiSquareIndependence(col1, col2, alpha);
}

/**
 * Adapter for chi-square goodness of fit.
 * Matches old chiSquareGoodnessOfFit() output shape.
 */
export function chiSquareGoodnessOfFitAdapter(observed, expected = null, alpha = 0.05) {
  return chiSquareGoodnessOfFit(observed, expected, alpha);
}

// ── Panel data ────────────────────────────────────────────────────

export function pooledOLSAdapter(data, yCol, xCols, options = {}) {
  return enginePooledOLS(data, yCol, xCols, options);
}

export function fixedEffectsAdapter(data, yCol, xCols, options = {}) {
  return engineFE(data, yCol, xCols, options);
}

export function randomEffectsAdapter(data, yCol, xCols, options = {}) {
  return engineRE(data, yCol, xCols, options);
}

export function hausmanTestAdapter(feResult, reResult) {
  return engineHausman(feResult, reResult);
}

export function breuschPaganLMAdapter(pooledResult, data, entityCol = 'id') {
  return engineBP(pooledResult, data, entityCol);
}

export function breuschPaganAdapter(modelResult, data, xCols, options = {}) {
  return engineBP2(modelResult, data, xCols, options);
}

export function whiteTestAdapter(modelResult, data, xCols) {
  return engineWhite(modelResult, data, xCols);
}

export function wooldridgeTestAdapter(data, yCol, xCols, entityCol = 'id', timeCol = 'time') {
  return engineWooldridge(data, yCol, xCols, entityCol, timeCol);
}

// ── Helper functions ──────────────────────────────────────────────

function interpretStrength(r) {
  const abs = Math.abs(r);
  if (abs >= 0.7) return 'kuat';
  if (abs >= 0.4) return 'sedang';
  if (abs >= 0.2) return 'lemah';
  return 'sangat lemah';
}

function buildInterpretation(r, pValue, n, method, ci95) {
  const strength = interpretStrength(r);
  const dir = r > 0 ? 'positif' : r < 0 ? 'negatif' : 'tidak ada';
  const sig = pValue < 0.05 ? 'signifikan' : 'tidak signifikan';
  let interp = `Terdapat korelasi ${strength} ${dir} antara kedua variabel (r = ${r?.toFixed(4)}, p = ${pValue?.toFixed(4)}). `;
  interp += `Korelasi ${method} ${sig} pada taraf 0.05 (n = ${n}). `;
  if (ci95 && isFinite(ci95[0])) {
    interp += `95% CI: [${ci95[0]?.toFixed(4)}, ${ci95[1]?.toFixed(4)}]. `;
  }
  return interp;
}

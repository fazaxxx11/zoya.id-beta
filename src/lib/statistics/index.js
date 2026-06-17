/**
 * Azezmen Statistics Engine — clean, testable, SPSS-compatible.
 *
 * All functions are pure: input data → output result object.
 * No side effects, no DOM access, no API calls.
 *
 * Conventions:
 * - Sample variance/SD uses n-1 (Bessel's correction)
 * - Two-tailed p-values by default
 * - Alpha = 0.05 default
 * - Listwise deletion for all analyses (documented per function)
 * - Raw results keep full precision; display formatting is separate
 * - Missing values (null/NaN/Infinity) excluded, never treated as 0
 */

export { describe, percentile } from './descriptive.js';
export { pearson, spearman } from './correlation.js';
export { cronbachAlpha } from './reliability.js';
export { independentTTest, oneSampleTTest, pairedTTest } from './ttest.js';
export { oneWayANOVA, twoWayANOVA } from './anova.js';
export { simpleRegression, multipleLinearRegression } from './regression.js';

// Standalone Cohen's d function
export function cohensD(group1, group2) {
  const n1 = group1.length;
  const n2 = group2.length;
  const mean1 = group1.reduce((a, b) => a + b, 0) / n1;
  const mean2 = group2.reduce((a, b) => a + b, 0) / n2;
  const var1 = group1.reduce((a, b) => a + (b - mean1) ** 2, 0) / (n1 - 1);
  const var2 = group2.reduce((a, b) => a + (b - mean2) ** 2, 0) / (n2 - 1);
  const pooledStd = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2));
  const d = (mean1 - mean2) / pooledStd;
  return { d, n1, n2, mean1, mean2, pooledStd };
}
export { cleanNumeric, listwisePair, groupBy, parseCSV, column } from './data.js';
export {
  normalCDF, normalPDF,
  tCDF, tPDF, tPValue,
  fCDF, fPValue,
  chi2CDF, chi2PValue,
} from './distributions.js';

// UI Adapters — bridge new engine to existing UI shape
export {
  describeAdapter, formatDescriptive,
  pearsonAdapter, spearmanAdapter,
  cronbachAdapter,
  oneSampleTTestAdapter, independentTTestAdapter, pairedTTestAdapter,
  oneWayANOVAAdapter,
  twoWayANOVAAdapter,
  simpleRegressionAdapter,
  multipleLinearRegressionAdapter,
  normalityAdapter,
  mannWhitneyAdapter, wilcoxonAdapter, kruskalWallisAdapter,
  itemValidityAdapter, analyzeNGainAdapter,
  chiSquareIndependenceAdapter, chiSquareGoodnessOfFitAdapter,
  pooledOLSAdapter, fixedEffectsAdapter, randomEffectsAdapter, hausmanTestAdapter, breuschPaganLMAdapter,
  breuschPaganAdapter, whiteTestAdapter, wooldridgeTestAdapter,
  adfTestAdapter, grangerCausalityAdapter, engleGrangerCointegrationAdapter,
} from './uiAdapters.js';

export { shapiroWilk, kolmogorovSmirnov, testNormality } from './normality.js';
export { mannWhitneyU, wilcoxonSignedRank, kruskalWallis, averageRank } from './nonparametric.js';
export { itemValidity } from './itemValidity.js';
export { calcNGain, categorizeNGain, analyzeNGain } from './ngain.js';

// Legacy re-exports
export { chiSquareIndependence, chiSquareGoodnessOfFit } from './chisquare.js';
export { pooledOLS, fixedEffects, randomEffects, hausmanTest, breuschPaganLM, breuschPagan, whiteTest, wooldridgeTest, validatePanel } from './panel.js';
export { adfTest, grangerCausality, engleGrangerCointegration } from './timeseries.js';

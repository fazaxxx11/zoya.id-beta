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

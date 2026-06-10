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
export { independentTTest, pairedTTest } from './ttest.js';
export { oneWayANOVA } from './anova.js';
export { simpleRegression } from './regression.js';
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
  independentTTestAdapter, pairedTTestAdapter,
  oneWayANOVAAdapter,
  simpleRegressionAdapter,
} from './uiAdapters.js';

// Re-export functions not yet ported to new engine (from old lib/stats)
// These will be gradually migrated in future phases
export { testNormality } from '../stats/normality.js';
export { itemValidity } from '../stats/reliability.js';
export { oneSampleTTest } from '../stats/ttest.js';
export { twoWayANOVA } from '../stats/twoWayANOVA.js';
export { multipleLinearRegression } from '../stats/regression.js';
export { mannWhitneyU, wilcoxonSignedRank, kruskalWallis } from '../stats/nonparametric.js';
export { analyzeNGain } from '../stats/ngain.js';
export { chiSquareIndependence } from '../stats/chisquare.js';

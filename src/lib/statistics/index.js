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
  simpleRegressionAdapter,
  normalityAdapter,
  mannWhitneyAdapter, wilcoxonAdapter, kruskalWallisAdapter,
} from './uiAdapters.js';

export { shapiroWilk, kolmogorovSmirnov, testNormality } from './normality.js';
export { mannWhitneyU, wilcoxonSignedRank, kruskalWallis, averageRank } from './nonparametric.js';
// These will be gradually migrated in future phases
export { itemValidity } from '../stats/reliability.js';
export { analyzeNGain } from '../stats/ngain.js';
export { chiSquareIndependence } from '../stats/chisquare.js';

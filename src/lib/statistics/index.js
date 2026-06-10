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

# Statistics Engine — UI Integration

**Date:** 2026-06-11
**Status:** Phase 2 — Engine wired to UI

## Overview

The new statistics engine (`src/lib/statistics/`) is now connected to the Statistik UI via an adapter layer (`src/lib/statistics/uiAdapters.js`). This document describes the integration status.

## Architecture

```
src/lib/statistics/          ← New tested engine (pure functions)
  ├── descriptive.js
  ├── correlation.js
  ├── reliability.js
  ├── ttest.js
  ├── anova.js
  ├── regression.js
  ├── distributions.js
  ├── data.js
  ├── uiAdapters.js          ← Bridges engine output to UI shape
  └── index.js               ← Barrel export + re-exports from old lib

src/pages/Statistik.jsx      ← Main UI (imports from statistics/)
src/pages/StatistikBatch.jsx ← Batch mode (imports from statistics/)
```

## Migrated Tools

| Tool | Old Source | New Source | Adapter | Notes |
|------|-----------|-----------|---------|-------|
| Deskriptif | `lib/stats/descriptive.js` | `statistics/descriptive.js` | `describeAdapter` | Same API, different internal |
| Normalitas | `lib/stats/normality.js` | `statistics/normality.js` | `normalityAdapter` | ✅ Full migration |
| Korelasi Pearson | `lib/stats/correlation.js` | `statistics/correlation.js` | `pearsonAdapter` | Full migration |
| Korelasi Spearman | `lib/stats/correlation.js` | `statistics/correlation.js` | `spearmanAdapter` | Full migration |
| Validitas & Reliabilitas | `lib/stats/reliability.js` | `statistics/reliability.js` | `cronbachAdapter` | Alpha migrated, item validity still old |
| T-Test Independent | `lib/stats/ttest.js` | `statistics/ttest.js` | `independentTTestAdapter` | Full migration |
| T-Test Paired | `lib/stats/ttest.js` | `statistics/ttest.js` | `pairedTTestAdapter` | Full migration |
| T-Test One-sample | `lib/stats/ttest.js` | `statistics/ttest.js` | `oneSampleTTestAdapter` | ✅ Full migration |
| Mann-Whitney U | `lib/stats/nonparametric.js` | `statistics/nonparametric.js` | `mannWhitneyAdapter` | ✅ Full migration |
| Wilcoxon Signed-Rank | `lib/stats/nonparametric.js` | `statistics/nonparametric.js` | `wilcoxonAdapter` | ✅ Full migration |
| Kruskal-Wallis | `lib/stats/nonparametric.js` | `statistics/nonparametric.js` | `kruskalWallisAdapter` | ✅ Full migration |
| Multiple Regression | `lib/stats/regression.js` | `statistics/regression.js` | `multipleLinearRegressionAdapter` | ✅ Full migration |
| Two-Way ANOVA | `lib/stats/twoWayANOVA.js` | `statistics/anova.js` | `twoWayANOVAAdapter` | ✅ Full migration |
| One-way ANOVA | `lib/stats/anova.js` | `statistics/anova.js` | `oneWayANOVAAdapter` | Signature changed: flat arrays |
| Two-way ANOVA | `lib/stats/twoWayANOVA.js` | `lib/stats/twoWayANOVA.js` | none | Not yet ported |
| Regresi Sederhana | `lib/stats/regression.js` | `statistics/regression.js` | `simpleRegressionAdapter` | Full migration |
| Regresi Berganda | `lib/stats/regression.js` | `lib/stats/regression.js` | none | Not yet ported |
| Mann-Whitney U | `lib/stats/nonparametric.js` | `lib/stats/nonparametric.js` | none | Not yet ported |
| Wilcoxon | `lib/stats/nonparametric.js` | `lib/stats/nonparametric.js` | none | Not yet ported |
| Kruskal-Wallis | `lib/stats/nonparametric.js` | `lib/stats/nonparametric.js` | none | Not yet ported |
| N-Gain | `lib/stats/ngain.js` | `lib/stats/ngain.js` | none | Not yet ported |
| Chi-Square | `lib/stats/chisquare.js` | `lib/stats/chisquare.js` | none | Not yet ported |

## Deletion Rules

| Analysis | Method | Documented |
|----------|--------|-----------|
| Descriptive | Listwise (cleanNumeric) | ✅ |
| Correlation | Listwise (listwisePair) | ✅ |
| Cronbach Alpha | Listwise (row filter) | ✅ |
| Independent t-test | Listwise (cleanNumeric per group) | ✅ |
| Paired t-test | Listwise (cleanNumeric) | ✅ |
| One-way ANOVA | Listwise (groupBy) | ✅ |
| Simple regression | Listwise (listwisePair) | ✅ |

## Missing Value Rules

- `null`, `undefined`, `NaN`, `Infinity` are excluded
- Never treated as 0
- Engine functions handle exclusion internally
- Adapter layer preserves original array length for UI display

## Normality Tests — Limitations

- **Shapiro-Wilk**: Royston (1992) approximation, valid n=3..5000.
  For n ≤ 11: polynomial approximation (less accurate).
  For n ≥ 12: Royston normal transformation.
  Not exact — SPSS uses exact algorithm with pre-computed coefficients.
- **Kolmogorov-Smirnov**: Lilliefors-corrected (not classic KS).
  Approximation-based p-value.
- **Not SPSS-verified** until golden SPSS outputs exist.
- Shapiro-Wilk used for n ≤ 50, KS for n > 50 (matches old behavior).

## One-Sample T-Test — Notes

- Two-tailed by default.
- Effect size: Cohen's d with approximate CI.
- CI via normal approximation (accurate for n > 30).
- Matches old oneSampleTTest() output shape.

## Non-parametric Tests — Limitations

- **Mann-Whitney U**: Normal approximation with tie correction. Exact p-value not implemented (valid for n ≥ 5-8 per group). Includes continuity correction (0.5). Effect size r = |z|/√N.
- **Wilcoxon Signed-Rank**: Normal approximation with tie correction. Exact p-value not implemented (valid for n ≥ 5 non-zero differences). Includes continuity correction (0.5). Effect size r = |z|/√n.
- **Kruskal-Wallis**: Chi-square approximation with tie correction. Effect size η²_H = (H-k+1)/(N-k) clamped ≥ 0.
- `averageRank()` helper exported for custom use.
- All three match old function output shapes via adapters.

## Multiple Linear Regression — Limitations

- OLS via matrix algebra (β = (XᵀX)⁻¹ Xᵀy).
- Listwise deletion for missing values.
- VIF computed recursively (calls itself for sub-regressions).
- Durbin-Watson included for residual autocorrelation.
- Breusch-Pagan not included (uses old assumptions module if needed).
- Singular matrix returns clear error message.
- Matches old multipleLinearRegression() output shape.

## Two-Way ANOVA — Limitations

- Cell-means approach: exact for balanced designs, approximates Type III for unbalanced.
- Empty cells detected and rejected.
- Factor A × B interaction computed.
- Effect sizes: η² and partial η² per source.
- Cell table with n, mean, SD per cell combination.
- Marginal means per factor level.
- Matches old twoWayANOVA() output shape.

- ✅ Sample variance/SD uses n-1 (Bessel's correction)
- ✅ Two-tailed p-values by default
- ✅ Alpha = 0.05 default
- ✅ Full precision in raw results
- ⚠️ **Not SPSS-verified** until golden SPSS outputs exist
- Reference values in tests use engine output (which matches R/scipy)

## Legacy/TODO

Functions still using old `lib/stats/` (not yet ported):
- `itemValidity`
- `analyzeNGain`
- `chiSquareIndependence`

These will be ported in future phases. They still work correctly via the old library.

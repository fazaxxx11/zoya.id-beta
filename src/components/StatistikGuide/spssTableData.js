// ============================================================
// Data mockup tabel output SPSS — 6 tabel (2 per tab StatistikGuide).
// Static hardcoded, angka realistis (n=30), tujuan edukatif: nunjukin
// bentuk output SPSS beneran supaya student recognize saat lihat aslinya.
//
// Pure helper `fmt` di-test node-env (tests/unit/spssTableData.test.js).
// ============================================================

/**
 * Format angka untuk tampilan tabel SPSS.
 * - null/undefined/NaN → "—"
 * - number → toFixed(decimals); integer trim trailing zeros
 * - string → apa adanya (sudah pre-formatted pemanggil)
 */
export function fmt(value, decimals = 3) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value
  if (typeof value !== 'number' || !isFinite(value)) return String(value)
  // Integer (mis. df, N) → tanpa desimal
  if (Number.isInteger(value)) return String(value)
  const s = value.toFixed(decimals)
  // Trim trailing zeros: 0.970 → 0.97, 0.500 → 0.5, 1.000 → 1
  return s.replace(/\.?0+$/, '') || '0'
}

// ── DESKRIPTIF ──────────────────────────────────────────────

export const DESCRIPTIVE_STATS = {
  title: 'Descriptive Statistics',
  headerRows: [
    [
      { label: '' },
      { label: 'N' },
      { label: 'Minimum' },
      { label: 'Maximum' },
      { label: 'Mean' },
      { label: 'Std. Deviation' },
      { label: 'Variance' },
    ],
  ],
  rows: [
    ['Skor_Pre', 30, 42, 85, 64.50, 10.821, 117.094],
    ['Skor_Post', 30, 55, 95, 76.73, 9.452, 89.340],
    ['Selisih', 30, 5, 32, 12.23, 6.108, 37.308],
    ['Valid N (listwise)', 30, '', '', '', '', ''],
  ],
  notes: ['a. Listwise N=30'],
}

export const TESTS_OF_NORMALITY = {
  title: 'Tests of Normality',
  headerRows: [
    [
      { label: '', colSpan: 1 },
      { label: 'Kolmogorov-Smirnovᵃ', colSpan: 3 },
      { label: 'Shapiro-Wilk', colSpan: 3 },
    ],
    [
      { label: '' },
      { label: 'Statistic' },
      { label: 'df' },
      { label: 'Sig.' },
      { label: 'Statistic' },
      { label: 'df' },
      { label: 'Sig.' },
    ],
  ],
  rows: [
    ['Skor_Pre', 0.124, 30, 0.200, 0.965, 30, 0.387],
    ['Skor_Post', 0.098, 30, 0.200, 0.971, 30, 0.521],
    ['Selisih', 0.156, 30, 0.072, 0.948, 30, 0.171],
  ],
  notes: ['a. Lilliefors Significance Correction'],
}

// ── INFERENSIAL ─────────────────────────────────────────────

export const INDEPENDENT_SAMPLES_TEST = {
  title: 'Independent Samples Test',
  headerRows: [
    [
      { label: '' },
      { label: "Levene's Test for Equality of Variances", colSpan: 2 },
      { label: 't-test for Equality of Means', colSpan: 5 },
    ],
    [
      { label: '' },
      { label: 'F' },
      { label: 'Sig.' },
      { label: 't' },
      { label: 'df' },
      { label: 'Sig. (2-tailed)' },
      { label: 'Mean Difference' },
    ],
  ],
  rows: [
    ['Skor_Post  Equal variances assumed', 2.841, 0.099, 4.312, 58, 0.000, 12.230],
    ['Equal variances not assumed', '', '', 4.312, 55.4, 0.000, 12.230],
  ],
  notes: [],
}

export const ANOVA_TABLE = {
  title: 'ANOVA — Skor_Post by Kelompok',
  headerRows: [
    [
      { label: '' },
      { label: 'Sum of Squares' },
      { label: 'df' },
      { label: 'Mean Square' },
      { label: 'F' },
      { label: 'Sig.' },
    ],
  ],
  rows: [
    ['Between Groups', 1845.20, 2, 922.60, 9.842, 0.000],
    ['Within Groups', 5352.07, 57, 93.72, '', ''],
    ['Total', 7197.27, 59, '', '', ''],
  ],
  notes: ['a. Kelompok = A, B, C (n=20 per grup)'],
}

// ── REGRESI ─────────────────────────────────────────────────

export const MODEL_SUMMARY = {
  title: 'Model Summary',
  headerRows: [
    [
      { label: 'Model' },
      { label: 'R' },
      { label: 'R Square' },
      { label: 'Adjusted R Square' },
      { label: 'Std. Error of the Estimate' },
    ],
  ],
  rows: [
    ['1', 0.847, 0.717, 0.707, 5.234],
  ],
  notes: ['a. Predictors: (Constant), Skor_Pre'],
}

export const COEFFICIENTS = {
  title: 'Coefficientsᵃ',
  headerRows: [
    [
      { label: '' },
      { label: 'Unstandardized Coefficients', colSpan: 2 },
      { label: 'Standardized Coefficients', colSpan: 1 },
      { label: '', colSpan: 1 },
      { label: '', colSpan: 1 },
    ],
    [
      { label: 'Model' },
      { label: 'B' },
      { label: 'Std. Error' },
      { label: 'Beta' },
      { label: 't' },
      { label: 'Sig.' },
    ],
  ],
  rows: [
    ['(Constant)', 18.243, 5.812, '', 3.139, 0.004],
    ['Skor_Pre', 0.907, 0.089, 0.847, 10.235, 0.000],
  ],
  notes: ['a. Dependent Variable: Skor_Post'],
}

// Registry — dipakai tab untuk lookup by key
export const SPSS_TABLES = {
  descriptive_stats: DESCRIPTIVE_STATS,
  tests_of_normality: TESTS_OF_NORMALITY,
  independent_samples_test: INDEPENDENT_SAMPLES_TEST,
  anova_table: ANOVA_TABLE,
  model_summary: MODEL_SUMMARY,
  coefficients: COEFFICIENTS,
}

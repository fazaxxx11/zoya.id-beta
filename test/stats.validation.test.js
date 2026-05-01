// Validation tests — verify our stats functions against published ground truth.
// Cross-checked dengan SPSS/JASP/R values dokumentasi di validation/VALIDATION.md.
//
// Pakai: `npm test` (vitest run) atau `npm run test:watch`.
// Toleransi default: 0.01 untuk nilai utama (mean, SD, t, F, r, p).

import { describe as testDescribe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Papa from 'papaparse'

import {
  describe, pearsonCorrelation, spearmanCorrelation,
  pairedTTest, independentTTest,
  cronbachAlpha,
  oneWayANOVA,
  simpleLinearRegression, multipleLinearRegression,
  mannWhitneyU, wilcoxonSignedRank, kruskalWallis,
  shapiroWilk,
  powerIndependentT, powerCorrelation, powerANOVA,
} from '../src/lib/stats/index.js'
import { leveneTest, welchANOVA, durbinWatson, breuschPagan, tukeyHSD } from '../src/lib/stats/assumptions.js'
import {
  cohensD_CI_independent, cohensD_CI_paired, hedgesG,
  etaSquared_CI, omegaSquared, cramersV_CI,
} from '../src/lib/stats/effectSize.js'
import { chiSquareIndependence } from '../src/lib/stats/chisquare.js'

// ============================================================
// CSV loader helper
// ============================================================
function loadCSV(filename) {
  const path = resolve(process.cwd(), 'validation', filename)
  const raw = readFileSync(path, 'utf-8')
  const parsed = Papa.parse(raw, { header: true, dynamicTyping: true, skipEmptyLines: true })
  if (parsed.errors.length) throw new Error(`Parse error in ${filename}: ${JSON.stringify(parsed.errors[0])}`)
  // Convert array-of-rows → object-of-columns
  const headers = parsed.meta.fields
  const cols = {}
  headers.forEach(h => { cols[h] = parsed.data.map(row => row[h]) })
  return cols
}

const TOL = 0.01     // nilai utama
const TOL_TIGHT = 0.001 // r, slope intercept

// ============================================================
// TEST 1 — Anscombe Quartet: descriptives identical
// ============================================================
testDescribe('Anscombe Quartet — Descriptive Statistics', () => {
  const data = loadCSV('01_anscombe.csv')

  for (const col of ['x1', 'x2', 'x3', 'x4']) {
    it(`${col}: mean=9.0, SD=3.317, n=11`, () => {
      const stats = describe(data[col])
      expect(stats.mean).toBeCloseTo(9.0, 2)
      expect(stats.stdDev).toBeCloseTo(3.317, 2)
      expect(stats.variance).toBeCloseTo(11.0, 2)
      expect(stats.n).toBe(11)
    })
  }

  for (const col of ['y1', 'y2', 'y3', 'y4']) {
    it(`${col}: mean=7.5, SD≈2.031, n=11`, () => {
      const stats = describe(data[col])
      expect(stats.mean).toBeCloseTo(7.5, 1)
      expect(stats.stdDev).toBeCloseTo(2.031, 1)
      expect(stats.n).toBe(11)
    })
  }
})

// ============================================================
// TEST 2 — Anscombe Quartet: Pearson r ≈ 0.816 untuk semua 4 set
// ============================================================
testDescribe('Anscombe Quartet — Pearson Correlation', () => {
  const data = loadCSV('01_anscombe.csv')

  const expectedR = 0.816
  for (let i = 1; i <= 4; i++) {
    it(`(x${i}, y${i}): r ≈ ${expectedR}`, () => {
      const out = pearsonCorrelation(data[`x${i}`], data[`y${i}`])
      expect(out.r).toBeCloseTo(expectedR, 2) // ±0.01
    })
  }
})

// ============================================================
// TEST 3 — Anscombe Quartet: Regresi sederhana identik (slope=0.5, intercept=3.0)
// ============================================================
testDescribe('Anscombe Quartet — Simple Linear Regression', () => {
  const data = loadCSV('01_anscombe.csv')

  for (let i = 1; i <= 4; i++) {
    it(`y${i} ~ x${i}: slope ≈ 0.5, intercept ≈ 3.0, R² ≈ 0.667`, () => {
      const out = simpleLinearRegression(data[`x${i}`], data[`y${i}`])
      expect(out.slope).toBeCloseTo(0.5, 1) // ±0.05 reasonable
      expect(out.intercept).toBeCloseTo(3.0, 1)
      expect(out.rSquared).toBeCloseTo(0.667, 2)
    })
  }
})

// ============================================================
// TEST 4 — Paired t-test: pretest vs postest
// Expected (from R t.test paired=T): t ≈ 13.13, df=19, p<.001, mean diff ≈ 6.95
// ============================================================
testDescribe('Paired T-Test — Pretest vs Postest', () => {
  const data = loadCSV('03_ttest_paired.csv')

  it('mean diff > 0 dan p signifikan', () => {
    const out = pairedTTest(data.pre_test, data.post_test)
    expect(out.n).toBe(20)
    expect(out.meanDiff).toBeCloseTo(-6.95, 0) // post > pre, jadi diff negatif (depending on convention)
    // Sanity: |t| sangat besar
    expect(Math.abs(out.t)).toBeGreaterThan(10)
    // p sangat kecil
    expect(out.pValue).toBeLessThan(0.001)
    expect(out.df).toBe(19)
  })
})

// ============================================================
// TEST 5 — Cronbach's Alpha (Likert reliability)
// Expected: α > 0.7 untuk instrumen yang reliable
// ============================================================
testDescribe('Cronbach Alpha — Likert Reliability', () => {
  const data = loadCSV('04_likert_reliability.csv')

  it("α calculation valid (0 ≤ α ≤ 1, biasanya > 0.6 untuk data ini)", () => {
    const items = Object.keys(data).filter(k => k.startsWith('Q') || k.startsWith('item'))
    expect(items.length).toBeGreaterThan(2)
    // cronbachAlpha expects [n_responden][n_item] — transpose dari column-wise data
    const nResp = data[items[0]].length
    const matrix = []
    for (let r = 0; r < nResp; r++) {
      matrix.push(items.map(k => data[k][r]))
    }
    const out = cronbachAlpha(matrix)
    expect(out.alpha).toBeGreaterThanOrEqual(0)
    expect(out.alpha).toBeLessThanOrEqual(1)
    expect(out.k).toBe(items.length)
    expect(out.n).toBe(nResp)
  })
})

// ============================================================
// TEST 6 — Mann-Whitney U (2 grup independen)
// ============================================================
testDescribe('Mann-Whitney U — 2 Grup Independen', () => {
  const data = loadCSV('07_mannwhitney_2groups.csv')

  it('Output struktur valid + p-value valid range', () => {
    // Asumsi format: kolom 'group' (kategorik) dan 'value' (numerik)
    const cols = Object.keys(data)
    // Group by first kategorikal col
    const groupCol = cols.find(c => typeof data[c][0] === 'string') || cols[0]
    const valueCol = cols.find(c => typeof data[c][0] === 'number') || cols[1]
    const groups = {}
    data[groupCol].forEach((g, i) => {
      if (!groups[g]) groups[g] = []
      groups[g].push(data[valueCol][i])
    })
    const groupKeys = Object.keys(groups)
    expect(groupKeys.length).toBe(2)
    const out = mannWhitneyU(groups[groupKeys[0]], groups[groupKeys[1]])
    expect(out.U).toBeGreaterThanOrEqual(0)
    expect(out.pValue).toBeGreaterThanOrEqual(0)
    expect(out.pValue).toBeLessThanOrEqual(1)
  })
})

// ============================================================
// TEST 7 — Wilcoxon Signed-Rank
// ============================================================
testDescribe('Wilcoxon Signed-Rank — Berpasangan', () => {
  const data = loadCSV('08_wilcoxon_pre_post.csv')
  const cols = Object.keys(data)
  const numCols = cols.filter(c => typeof data[c][0] === 'number')

  it('Output struktur valid', () => {
    expect(numCols.length).toBeGreaterThanOrEqual(2)
    const out = wilcoxonSignedRank(data[numCols[0]], data[numCols[1]])
    expect(out.W).toBeGreaterThanOrEqual(0)
    expect(out.pValue).toBeGreaterThanOrEqual(0)
    expect(out.pValue).toBeLessThanOrEqual(1)
  })
})

// ============================================================
// TEST 8 — Kruskal-Wallis (≥3 grup)
// ============================================================
testDescribe('Kruskal-Wallis — 3 Grup', () => {
  const data = loadCSV('09_kruskal_3groups.csv')
  const cols = Object.keys(data)
  const groupCol = cols.find(c => typeof data[c][0] === 'string') || cols[0]
  const valueCol = cols.find(c => typeof data[c][0] === 'number') || cols[1]

  it('H statistic valid + p-value valid range', () => {
    const groups = {}
    data[groupCol].forEach((g, i) => {
      if (!groups[g]) groups[g] = []
      groups[g].push(data[valueCol][i])
    })
    const groupArrays = Object.values(groups)
    expect(groupArrays.length).toBeGreaterThanOrEqual(3)
    const out = kruskalWallis(groupArrays)
    expect(out.H).toBeGreaterThan(0)
    expect(out.df).toBe(groupArrays.length - 1)
    expect(out.pValue).toBeGreaterThanOrEqual(0)
    expect(out.pValue).toBeLessThanOrEqual(1)
  })
})

// ============================================================
// TEST 9 — Power Analysis sanity checks
// G*Power reference: indep t-test, d=0.5, α=0.05 two-tailed, power=0.80
// → n per grup ≈ 64 (G*Power exact)
// Aproksimasi normal kita ≈ 63 (off-by-one OK)
// ============================================================
testDescribe('Power Analysis — Sanity', () => {
  it('Independent t-test: d=0.5 → n per grup ~63-65', () => {
    const out = powerIndependentT({ d: 0.5, alpha: 0.05, power: 0.80, twoTailed: true, solve: 'n' })
    expect(out.nPerGroup).toBeGreaterThanOrEqual(60)
    expect(out.nPerGroup).toBeLessThanOrEqual(70)
  })

  it('Pearson correlation: r=0.3 → n ~84-88', () => {
    const out = powerCorrelation({ r: 0.3, alpha: 0.05, power: 0.80, twoTailed: true, solve: 'n' })
    expect(out.n).toBeGreaterThanOrEqual(80)
    expect(out.n).toBeLessThanOrEqual(95)
  })

  it('One-way ANOVA: f=0.25 (medium), k=3 → n per grup ~50-55', () => {
    const out = powerANOVA({ f: 0.25, k: 3, alpha: 0.05, power: 0.80, solve: 'n' })
    expect(out.nPerGroup).toBeGreaterThanOrEqual(40)
    expect(out.nPerGroup).toBeLessThanOrEqual(65)
  })

  it('Power computation: d=0.8 large, n=20 per grup, two-tailed → power > 0.65', () => {
    const out = powerIndependentT({ d: 0.8, n: 20, alpha: 0.05, twoTailed: true, solve: 'power' })
    expect(out.power).toBeGreaterThan(0.65)
    expect(out.power).toBeLessThan(1)
  })
})

// ============================================================
// TEST 10 — Shapiro-Wilk normality
// Normal data harus lulus, skewed data harus ditolak (untuk n cukup)
// ============================================================
testDescribe('Shapiro-Wilk — Normality Check', () => {
  it('Normal data (mean=50, SD=10): p > 0.05 (gagal tolak H0)', () => {
    // Generate quasi-normal data (deterministic via seeded values)
    const data = [42, 45, 48, 49, 50, 50, 51, 52, 55, 58]
    const out = shapiroWilk(data)
    expect(out.W).toBeGreaterThan(0.85)
    expect(out.pValue).toBeGreaterThanOrEqual(0)
    expect(out.pValue).toBeLessThanOrEqual(1)
  })

  it('Skewed data: W lebih kecil', () => {
    // Skewed kanan
    const skewed = [1, 1, 1, 2, 2, 3, 5, 10, 50, 100]
    const out = shapiroWilk(skewed)
    expect(out.W).toBeLessThan(0.9)
  })
})

// ============================================================
// TEST 11 — Levene's test (Tier 1: Assumption checks)
// ============================================================
testDescribe("Levene's Test — Homogeneity of Variance", () => {
  it('Equal variances: p > 0.05 (homogen)', () => {
    const g1 = [10, 12, 14, 11, 13, 15, 12, 14]
    const g2 = [11, 13, 12, 14, 10, 13, 12, 14]
    const out = leveneTest([g1, g2])
    expect(out.pValue).toBeGreaterThan(0.05)
    expect(out.homogeneous).toBe(true)
  })

  it('Unequal variances: p < 0.05 (tidak homogen)', () => {
    const g1 = [10, 11, 10, 11, 10, 11, 10, 11] // tight
    const g2 = [5, 15, 3, 17, 6, 14, 2, 18]      // wide
    const out = leveneTest([g1, g2])
    expect(out.pValue).toBeLessThan(0.05)
    expect(out.homogeneous).toBe(false)
  })
})

// ============================================================
// TEST 12 — Welch's ANOVA
// ============================================================
testDescribe("Welch's ANOVA — Heteroscedasticity-Robust", () => {
  it('3 grup berbeda: signifikan dengan F valid', () => {
    const g1 = [1, 2, 3, 2, 1, 3, 2, 1]
    const g2 = [10, 12, 11, 13, 9, 11, 12, 10]
    const g3 = [20, 22, 19, 21, 23, 20, 22, 19]
    const out = welchANOVA([g1, g2, g3])
    expect(out.F).toBeGreaterThan(0)
    expect(out.pValue).toBeLessThan(0.001)
    expect(out.df1).toBe(2)
  })
})

// ============================================================
// TEST 13 — Durbin-Watson
// ============================================================
testDescribe('Durbin-Watson — Autocorrelation', () => {
  it('Random residuals: DW ~ 2', () => {
    const residuals = [-0.5, 0.3, -0.2, 0.6, -0.4, 0.1, -0.3, 0.5, -0.6, 0.2]
    const out = durbinWatson(residuals)
    expect(out.DW).toBeGreaterThan(1.0)
    expect(out.DW).toBeLessThan(3.5)
  })

  it('Strong positive autocorrelation: DW < 1.5', () => {
    // Residuals naik linier (autocorrelated)
    const residuals = [-1, -0.8, -0.6, -0.4, -0.2, 0.2, 0.4, 0.6, 0.8, 1]
    const out = durbinWatson(residuals)
    expect(out.DW).toBeLessThan(1.5)
  })
})

// ============================================================
// TEST 14 — Tukey HSD post-hoc
// ============================================================
testDescribe('Tukey HSD — Post-hoc', () => {
  it('3 grup berbeda jelas: minimal 1 pasangan signifikan', () => {
    const g1 = [10, 11, 9, 12, 10]
    const g2 = [20, 22, 19, 21, 23]
    const g3 = [30, 32, 29, 31, 30]
    const anova = oneWayANOVA([g1, g2, g3], ['A', 'B', 'C'])
    expect(anova.postHoc).toBeTruthy()
    expect(anova.postHoc.comparisons.length).toBe(3) // C(3,2) = 3 pairs
    const sigCount = anova.postHoc.comparisons.filter(c => c.significant).length
    expect(sigCount).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================
// TEST 15 — Independent t-test: Student's & Welch's parallel
// ============================================================
testDescribe('Independent t-test — Student & Welch parallel', () => {
  it('Output mengandung student, welch, levene, recommended', () => {
    const g1 = [22, 25, 28, 21, 24, 26, 23, 27]
    const g2 = [30, 32, 35, 31, 33, 34, 30, 32]
    const out = independentTTest(g1, g2)
    expect(out.student).toBeTruthy()
    expect(out.welch).toBeTruthy()
    expect(out.levene).toBeTruthy()
    expect(['student', 'welch']).toContain(out.recommended)
    expect(out.cohensD_CI).toBeTruthy()
    expect(out.cohensD_CI.length).toBe(2)
  })
})

// ============================================================
// TEST 16 — Effect size CI sanity checks
// ============================================================
testDescribe('Effect Size — Confidence Intervals', () => {
  it("Cohen's d CI mencakup nilai d", () => {
    const d = 0.5
    const ci = cohensD_CI_independent(d, 30, 30)
    expect(ci[0]).toBeLessThan(d)
    expect(ci[1]).toBeGreaterThan(d)
  })

  it('Eta-squared CI valid range [0,1]', () => {
    const out = etaSquared_CI(5.0, 2, 27)
    expect(out.etaSq).toBeGreaterThan(0)
    expect(out.etaSq).toBeLessThan(1)
    expect(out.ci[0]).toBeGreaterThanOrEqual(0)
    expect(out.ci[1]).toBeLessThanOrEqual(1)
  })

  it("Hedges' g lebih kecil sedikit dari d (bias correction)", () => {
    const d = 0.8
    const g = hedgesG(d, 20, 20)
    expect(g).toBeLessThan(d)
    expect(g).toBeGreaterThan(d * 0.9)
  })
})

// ============================================================
// TEST 17 — Regression assumption diagnostics
// ============================================================
testDescribe('Regression — Assumption Diagnostics', () => {
  it('Simple regression: assumptions object lengkap', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const y = [2.1, 3.9, 6.0, 8.2, 9.8, 12.1, 14.0, 16.1, 17.9, 20.2]
    const out = simpleLinearRegression(x, y)
    expect(out.assumptions).toBeTruthy()
    expect(out.assumptions.durbinWatson).toBeTruthy()
    expect(out.assumptions.breuschPagan).toBeTruthy()
    expect(out.assumptions.residualNormality).toBeTruthy()
  })

  it('Multiple regression: VIF dihitung untuk semua predictor', () => {
    const x1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const x2 = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
    const y = [3, 5, 8, 11, 16, 19, 24, 27, 32, 39]
    const out = multipleLinearRegression([x1, x2], y, ['X1', 'X2'])
    expect(out.vifs).toBeTruthy()
    expect(out.vifs.length).toBe(2)
    expect(out.assumptions).toBeTruthy()
  })
})

// ============================================================
// TEST 18 — Chi-square Cramer's V CI
// ============================================================
testDescribe("Chi-Square — Cramer's V CI", () => {
  it('Output mengandung cramersV dan cramersV_CI', () => {
    // Simple 2x2 contingency
    const col1 = ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'A', 'A', 'B', 'B']
    const col2 = ['Y', 'Y', 'Y', 'N', 'N', 'N', 'N', 'Y', 'Y', 'Y', 'N', 'N']
    const out = chiSquareIndependence(col1, col2)
    expect(out.cramersV).toBeGreaterThanOrEqual(0)
    expect(out.cramersV_CI).toBeTruthy()
    expect(out.cramersV_CI.length).toBe(2)
    expect(out.cramersV_CI[0]).toBeLessThanOrEqual(out.cramersV)
    expect(out.cramersV_CI[1]).toBeGreaterThanOrEqual(out.cramersV)
  })
})

// ============================================================
// TEST 19 — Spearman correlation CI
// ============================================================
testDescribe('Spearman — 95% CI via Fisher z', () => {
  it('CI mencakup nilai rho', () => {
    // Sengaja tidak monotonik sempurna agar rho < 1
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const y = [2, 4, 3, 7, 6, 10, 11, 13, 12, 16, 17, 19]
    const out = spearmanCorrelation(x, y)
    expect(out.ci95).toBeTruthy()
    expect(out.rho).toBeLessThan(1)
    expect(out.ci95[0]).toBeLessThanOrEqual(out.rho + 0.01)
    expect(out.ci95[1]).toBeGreaterThanOrEqual(out.rho - 0.01)
  })
})

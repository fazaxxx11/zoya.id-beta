import { describe, it, expect } from 'vitest'

import {
  normalizeWilcoxon, normalizeMannWhitney, normalizeKruskal, normalizeNGain,
  normalizePearson, normalizeSpearman,
  normalizeOneSampleT, normalizePairedT, normalizeIndependentT,
  normalizeNormality, normalizeAnova, normalizeTwoWayAnova,
  normalizeChiSquare, normalizeValidity, normalizeReliability,
  normalizeRegression, normalizeRegressionMultiple,
} from '../../src/lib/stats/normalizeScipy.js'

// Every normalizer uses a *merge* strategy: the JS adapter supplies the UI
// shape, scipy supplies the authoritative inferential numbers. These tests
// feed hand-built scipy-shaped fixtures (distinctive values like 2.345) plus
// real raw data, then assert (a) scipy values land in the right fields,
// (b) the adapter shape is preserved, (c) backend === 'scipy', and (d) scipy's
// ci95 `{low,high}` becomes a `[lo,hi]` array.

describe('normalizeScipy — merge strategy', () => {
  // ── T-Tests ──────────────────────────────────────────────────────
  describe('independent t-test', () => {
    const g1 = [5, 6, 7, 8, 9]
    const g2 = [1, 2, 3, 4, 5]
    const scipy = {
      t: 2.345, df: 8, pValue: 0.0444, meanDiff: 3,
      ci95: { low: 0.1, high: 5.9 }, significant: true,
      effectSize: 1.5, effectSizeLabel: 'Besar', alpha: 0.05, interpretation: 'scipy',
    }
    it('overrides inferential fields with scipy values', () => {
      const r = normalizeIndependentT(scipy, g1, g2)
      expect(r.backend).toBe('scipy')
      expect(r.t).toBe(2.345)
      expect(r.df).toBe(8)
      expect(r.pValue).toBe(0.0444)
      expect(r.cohensD).toBe(1.5)
      expect(r.meanDiff).toBe(3)
      expect(r.significant).toBe(true)
      expect(r.interpretation).toBe('scipy')
    })
    it('converts scipy ci95 object to a [lo, hi] array', () => {
      const r = normalizeIndependentT(scipy, g1, g2)
      expect(Array.isArray(r.ci95)).toBe(true)
      expect(r.ci95).toEqual([0.1, 5.9])
    })
    it('preserves adapter-only shape fields (means, sds, welch)', () => {
      const r = normalizeIndependentT(scipy, g1, g2)
      expect(r.mean1).toBeCloseTo(7, 6)
      expect(r.mean2).toBeCloseTo(3, 6)
      expect(r.n1).toBe(5)
      expect(r.n2).toBe(5)
      expect(r.sd1).toBeGreaterThan(0)
      expect(r.welch).toBeDefined()
      expect(r.welch.t).toBeTypeOf('number')
    })
  })

  describe('paired t-test', () => {
    const before = [1, 2, 3, 4, 5]
    const after = [3, 3, 5, 5, 7] // diffs = [2,1,2,1,2] → sdDiff > 0
    const scipy = { t: 1.234, df: 4, pValue: 0.055, meanDiff: 1.6, ci95: { low: -0.1, high: 2.1 }, significant: false, effectSize: 0.45, effectSizeLabel: 'Sedang', alpha: 0.05, interpretation: 'scipy-paired' }
    it('overrides and keeps adapter shape', () => {
      const r = normalizePairedT(scipy, before, after)
      expect(r.backend).toBe('scipy')
      expect(r.t).toBe(1.234)
      expect(r.cohensD).toBe(0.45)
      expect(r.ci95).toEqual([-0.1, 2.1])
      expect(r.sdDiff).toBeGreaterThan(0)
      expect(r.n).toBe(5)
    })
  })

  describe('one-sample t-test', () => {
    const values = [1, 2, 3, 4, 5]
    const scipy = { t: 0.0, df: 4, pValue: 1.0, meanDiff: 0, ci95: { low: -2, high: 2 }, significant: false, effectSize: 0.0, effectSizeLabel: 'Kecil', alpha: 0.05, interpretation: 'scipy-1sample' }
    it('keeps the adapter `test` field and converts ci95', () => {
      const r = normalizeOneSampleT(scipy, values, 3)
      expect(r.backend).toBe('scipy')
      expect(r.test).toBeDefined()      // adapter-only field
      expect(r.mean).toBeCloseTo(3, 6)  // adapter-only field
      expect(r.sem).toBeGreaterThan(0)  // adapter-only field
      expect(r.cohensD).toBe(0)
      expect(r.ci95).toEqual([-2, 2])
    })
  })

  // ── Correlation ──────────────────────────────────────────────────
  describe('pearson correlation', () => {
    const x = [1, 2, 3, 4, 5, 6]
    const y = [2, 4, 5, 4, 5, 6]
    const scipy = { r: 0.8, pValue: 0.05, n: 6, df: 4, significant: true, effectSize: 0.8, effectSizeLabel: 'Besar', method: 'Pearson', interpretation: 'scipy-pearson' }
    it('overrides r/p and derives t/strength/direction from scipy r', () => {
      const r = normalizePearson(scipy, x, y)
      expect(r.backend).toBe('scipy')
      expect(r.r).toBe(0.8)
      expect(r.pValue).toBe(0.05)
      // t = r * sqrt(df / (1 - r^2)) = 0.8 * sqrt(4 / 0.36) ≈ 2.6667
      expect(r.t).toBeCloseTo(2.6667, 3)
      expect(r.strength).toBe('kuat')
      expect(r.direction).toBe('positif')
      expect(r.ci95).toBeDefined() // adapter keeps Fisher-z CI
    })
  })

  describe('spearman correlation', () => {
    const x = [1, 2, 3, 4, 5, 6]
    const y = [1, 3, 2, 5, 4, 6]
    const scipy = { r: 0.7714, pValue: 0.07, n: 6, df: 4, significant: false, effectSize: 0.7714, effectSizeLabel: 'Besar', method: 'Spearman', interpretation: 'scipy-spearman' }
    it('maps scipy r → adapter rho', () => {
      const r = normalizeSpearman(scipy, x, y)
      expect(r.backend).toBe('scipy')
      expect(r.rho).toBeCloseTo(0.7714, 4)
      expect(r.pValue).toBe(0.07)
      expect(r.strength).toBe('kuat')
    })
  })

  // ── Normality ────────────────────────────────────────────────────
  describe('normality (Shapiro-Wilk)', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8]
    const scipy = { W: 0.95, pValue: 0.55, isNormal: true, n: 8, alpha: 0.05, interpretation: 'normal' }
    it('forces Shapiro-Wilk shape even when adapter would pick Shapiro (n≤50)', () => {
      const r = normalizeNormality(scipy, values)
      expect(r.backend).toBe('scipy')
      expect(r.method).toBe('Shapiro-Wilk')
      expect(r.W).toBe(0.95)
      expect(r.pValue).toBe(0.55)
      expect(r.isNormal).toBe(true)
      expect(r.D).toBeUndefined()
    })
    it('normalizes the n>50 KS branch to Shapiro-Wilk too', () => {
      const big = Array.from({ length: 60 }, (_, i) => (i * 7) % 13 + i * 0.01)
      const r = normalizeNormality({ W: 0.97, pValue: 0.2, isNormal: true, n: 60, alpha: 0.05, interpretation: 'ok' }, big)
      expect(r.method).toBe('Shapiro-Wilk')
      expect(r.W).toBe(0.97)
      expect(r.D).toBeUndefined() // KS statistic dropped
      expect(r.pValue).toBe(0.2)
    })
  })

  // ── ANOVA ────────────────────────────────────────────────────────
  describe('one-way ANOVA', () => {
    const groups = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
    const names = ['A', 'B', 'C']
    const scipy = { F: 27, dfBetween: 2, dfWithin: 6, pValue: 0.001, significant: true, etaSquared: 0.9, effectSizeLabel: 'Besar', alpha: 0.05, groupStats: [], postHoc: [], interpretation: 'scipy-anova' }
    it('overrides omnibus stats, keeps adapter SS/omega/postHoc shape', () => {
      const r = normalizeAnova(scipy, groups, names)
      expect(r.backend).toBe('scipy')
      expect(r.F).toBe(27)
      expect(r.etaSquared).toBe(0.9)
      expect(r.pValue).toBe(0.001)
      expect(r.ssBetween).toBeGreaterThan(0) // adapter-only
      expect(r.omegaSquared).toBeTypeOf('number') // adapter-only
      expect(Array.isArray(r.groupMeans)).toBe(true) // adapter shape (not scipy groupStats)
      expect(Array.isArray(r.postHoc)).toBe(true) // adapter keeps its postHoc
    })
  })

  describe('two-way ANOVA', () => {
    const y = [10, 12, 20, 22, 14, 16, 24, 26]
    const a = ['m1', 'm1', 'm1', 'm1', 'm2', 'm2', 'm2', 'm2']
    const b = ['g1', 'g1', 'g2', 'g2', 'g1', 'g1', 'g2', 'g2']
    const scipy = {
      effects: [
        { name: 'A', F: 5, df: 1, pValue: 0.05, significant: true, etaSquared: 0.3 },
        { name: 'B', F: 2, df: 1, pValue: 0.2, significant: false, etaSquared: 0.1 },
        { name: 'A × B', F: 0.5, df: 1, pValue: 0.5, significant: false, etaSquared: 0.02 },
      ],
      residuals: { df: 4, ss: 10, ms: 2.5 },
      alpha: 0.05,
      interpretation: 'scipy-2way',
    }
    it('overlays scipy effects onto the adapter anovaTable', () => {
      const r = normalizeTwoWayAnova(scipy, y, a, b, 'Method', 'Gender')
      expect(r.backend).toBe('scipy')
      expect(r.factorA).toBe(r.anovaTable[0]) // same reference
      expect(r.anovaTable[0].F).toBe(5)
      expect(r.anovaTable[1].F).toBe(2)
      expect(r.anovaTable[2].F).toBe(0.5)
      expect(r.significantA).toBe(true)
      expect(r.significantB).toBe(false)
      expect(r.significantInteraction).toBe(false)
      // adapter-only structural fields preserved
      expect(Array.isArray(r.cellTable)).toBe(true)
      expect(Array.isArray(r.marginalA)).toBe(true)
      expect(r.levelsA).toBeDefined()
      expect(r.interpretation).toBe('scipy-2way')
    })
  })

  // ── Chi-Square ───────────────────────────────────────────────────
  describe('chi-square independence', () => {
    const var1 = ['Y', 'N', 'Y', 'N', 'Y', 'N', 'Y', 'N', 'Y', 'N']
    const var2 = ['Y', 'Y', 'N', 'N', 'Y', 'Y', 'N', 'N', 'Y', 'Y']
    const scipy = {
      chi2: 5.0, df: 1, pValue: 0.025, cramersV: 0.4, significant: true,
      effectSizeLabel: 'Sedang', alpha: 0.05,
      contingencyTable: { rows: ['N', 'Y'], columns: ['N', 'Y'], observed: [[1, 4], [4, 1]], expected: [[2.5, 2.5], [2.5, 2.5]] },
      n: 10, interpretation: 'scipy-chi',
    }
    it('overrides stats + table, keeps adapter CI/warning fields', () => {
      const r = normalizeChiSquare(scipy, var1, var2)
      expect(r.backend).toBe('scipy')
      expect(r.chi2).toBe(5.0)
      expect(r.N).toBe(10)
      expect(r.isSignificant).toBe(true)
      expect(r.observed).toEqual([[1, 4], [4, 1]])
      expect(r.rowLabels).toEqual(['N', 'Y'])
      expect(r.cramersV_CI).toBeDefined() // adapter-only
      expect(r.assumptionWarning).toBeDefined() // adapter-only
    })
  })

  // ── Validity & Reliability ───────────────────────────────────────
  describe('item validity', () => {
    const matrix = [[3, 4, 5], [4, 5, 4], [5, 3, 4], [3, 5, 5], [4, 4, 3]]
    const scipy = {
      items: [
        { item: 1, r: 0.8, pValue: 0.1, rSimple: 0.9, pSimple: 0.05, isValid: true, verdict: 'Valid' },
        { item: 2, r: 0.2, pValue: 0.7, rSimple: 0.3, pSimple: 0.6, isValid: false, verdict: 'Tidak Valid' },
        { item: 3, r: 0.7, pValue: 0.2, rSimple: 0.8, pSimple: 0.1, isValid: true, verdict: 'Valid' },
      ],
      rCritical: 0.75, n: 5, k: 3, df: 3, validCount: 2, invalidCount: 1, summary: 'scipy-validity',
    }
    it('merges per-item scipy r/verdict and adds rSimple/pSimple', () => {
      const r = normalizeValidity(scipy, matrix)
      expect(r.backend).toBe('scipy')
      expect(r.rCritical).toBe(0.75)
      expect(r.validCount).toBe(2)
      expect(r.items[0].r).toBe(0.8)
      expect(r.items[0].rSimple).toBe(0.9)
      expect(r.items[1].isValid).toBe(false)
      expect(r.summary).toBe('scipy-validity')
    })
  })

  describe('reliability (Cronbach α)', () => {
    const matrix = [[3, 4, 5], [4, 5, 4], [5, 3, 4], [3, 5, 5], [4, 4, 3]]
    const scipy = { alpha: 0.85, k: 3, n: 5, interpretation: 'α = 0.8500 — Baik', category: 'Baik', itemStats: [] }
    it('overrides alpha, keeps adapter variance fields', () => {
      const r = normalizeReliability(scipy, matrix)
      expect(r.backend).toBe('scipy')
      expect(r.alpha).toBe(0.85)
      expect(r.k).toBe(3)
      expect(r.itemVariances).toBeDefined() // adapter-only
      expect(r.totalVariance).toBeTypeOf('number') // adapter-only
    })
  })

  // ── Non-parametric ───────────────────────────────────────────────
  describe('Wilcoxon signed-rank', () => {
    const before = [1, 2, 3, 4, 5, 6]
    const after = [2, 3, 4, 5, 6, 7]
    const scipy = { W: 0, Wpos: 21, Wneg: 0, n: 6, pValue: 0.03, isSignificant: true, z: 2.2, effectSize: 0.9, effectSizeLabel: 'Besar', meanDiff: 1, alpha: 0.05, interpretation: 'scipy-wilcoxon' }
    it('overrides W/p/z/effect, keeps adapter shape', () => {
      const r = normalizeWilcoxon(scipy, before, after)
      expect(r.backend).toBe('scipy')
      expect(r.W).toBe(0)
      expect(r.Wpos).toBe(21)
      expect(r.pValue).toBe(0.03)
      expect(r.isSignificant).toBe(true)
      expect(r.meanDiff).toBe(1)
    })
  })

  describe('Mann-Whitney U', () => {
    const g1 = [1, 2, 3, 4, 5]
    const g2 = [6, 7, 8, 9, 10]
    const scipy = { U: 0, n1: 5, n2: 5, N: 10, R1: 15, R2: 40, meanRank1: 3, meanRank2: 8, pValue: 0.007, isSignificant: true, z: 2.8, effectSize: 0.88, effectSizeLabel: 'Besar', alpha: 0.05, interpretation: 'scipy-mwu' }
    it('overrides U/ranks/p, keeps adapter U1/U2', () => {
      const r = normalizeMannWhitney(scipy, g1, g2)
      expect(r.backend).toBe('scipy')
      expect(r.U).toBe(0)
      expect(r.meanRank1).toBe(3)
      expect(r.N).toBe(10)
      expect(r.U1).toBeDefined() // adapter-only
    })
  })

  describe('Kruskal-Wallis', () => {
    const groups = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
    const names = ['A', 'B', 'C']
    const scipy = {
      H: 7.2, df: 2, pValue: 0.027, significant: true, epsilonSquared: 0.4, effectSizeLabel: 'Besar', alpha: 0.05,
      groupStats: [
        { name: 'A', n: 3, meanRank: 2, median: 2, mean: 2, sd: 1, min: 1, max: 3 },
        { name: 'B', n: 3, meanRank: 5, median: 5, mean: 5, sd: 1, min: 4, max: 6 },
        { name: 'C', n: 3, meanRank: 8, median: 8, mean: 8, sd: 1, min: 7, max: 9 },
      ],
      interpretation: 'scipy-kruskal',
    }
    it('maps scipy epsilonSquared → adapter etaSquared', () => {
      const r = normalizeKruskal(scipy, groups, names)
      expect(r.backend).toBe('scipy')
      expect(r.H).toBe(7.2)
      expect(r.etaSquared).toBe(0.4) // renamed from epsilonSquared
      expect(r.isSignificant).toBe(true)
      expect(r.groupStats[0].meanRank).toBe(2)
      expect(r.groupStats[0].sumRank).toBeDefined() // adapter-only field kept
      expect(r.N).toBe(9) // adapter-only
    })
  })

  // ── N-Gain ───────────────────────────────────────────────────────
  describe('N-gain', () => {
    const data = { pre: [50, 60, 70], post: [80, 85, 90], maxScore: 100, names: [] }
    const scipy = {
      n: 3, maxScore: 100, nGainMean: 0.7, nGainSD: 0.1, nGainMin: 0.6, nGainMax: 0.8,
      kategoriKelas: 'Tinggi', efektivitasPersen: 70, tafsiranEfektivitas: 'Cukup Efektif',
      distribusi: { Tinggi: 2, Sedang: 1, Rendah: 0 },
      distribusiPersen: { Tinggi: 66.67, Sedang: 33.33, Rendah: 0 },
      signifTest: { t: 5, pValue: 0.04, significant: true },
      preStats: { mean: 60, sd: 10, min: 50, max: 70 },
      postStats: { mean: 85, sd: 5, min: 80, max: 90 },
    }
    it('overrides aggregates + signifTest.t/p, keeps adapter pairs/df/ci95', () => {
      const r = normalizeNGain(scipy, data)
      expect(r.backend).toBe('scipy')
      expect(r.nGainMean).toBe(0.7)
      expect(r.distribusi).toEqual({ Tinggi: 2, Sedang: 1, Rendah: 0 })
      expect(r.signifTest.t).toBe(5)
      expect(r.signifTest.pValue).toBe(0.04)
      expect(r.signifTest.df).toBeDefined() // adapter-only
      expect(Array.isArray(r.pairs)).toBe(true) // adapter-only
    })
  })

  // ── Regression ───────────────────────────────────────────────────
  describe('simple regression', () => {
    const x = [1, 2, 3, 4, 5, 6]
    const y = [2, 4, 5, 4, 5, 6]
    const scipy = { slope: 0.8, intercept: 1.5, r: 0.9, rSquared: 0.81, pValue: 0.01, se: 0.2, n: 6, equation: 'y = 0.8000x + 1.5000', significant: true, rSquaredLabel: 'Kuat', alpha: 0.05, interpretation: 'scipy-reg' }
    it('maps scipy slope/intercept/r² → adapter b1/b0/r2 and derives t', () => {
      const r = normalizeRegression(scipy, x, y)
      expect(r.backend).toBe('scipy')
      expect(r.b1).toBe(0.8)
      expect(r.b0).toBe(1.5)
      expect(r.r2).toBe(0.81)
      expect(r.t_b1).toBeCloseTo(4, 6) // slope/se = 0.8/0.2
      expect(r.p_b1).toBe(0.01)
      expect(r.r2Adj).toBeDefined() // adapter-only
      expect(r.durbinWatson).toBeDefined() // adapter-only
    })
  })

  describe('multiple regression', () => {
    // X is predictor-COLUMNS: [[x1 across 5 obs], [x2 across 5 obs]]
    const X = [[1, 2, 3, 4, 5], [2, 1, 4, 3, 5]]
    const y = [4, 5, 8, 9, 12]
    const predictors = ['x1', 'x2']
    const scipy = {
      coefficients: [
        { name: 'Intercept', coef: 1, se: 0.1, t: 10, pValue: 0.001 },
        { name: 'x1', coef: 0.5, se: 0.2, t: 2.5, pValue: 0.05 },
        { name: 'x2', coef: 0.3, se: 0.1, t: 3, pValue: 0.04 },
      ],
      rSquared: 0.99, adjRSquared: 0.98, F: 100, pValue: 0.001, n: 5, k: 2, significant: true, alpha: 0.05, interpretation: 'scipy-mlr',
    }
    it('merges per-coefficient b/se/t/p, keeps adapter vifs/multicollinearity', () => {
      const r = normalizeRegressionMultiple(scipy, X, y, predictors)
      expect(r.backend).toBe('scipy')
      expect(r.rSquared).toBe(0.99)
      expect(r.adjustedR2).toBe(0.98)
      expect(r.pF).toBe(0.001)
      expect(r.coefficients[1].b).toBe(0.5)
      expect(r.coefficients[1].p).toBe(0.05)
      expect(r.coefficients[1].name).toBe('x1') // adapter keeps its name field
      expect(Array.isArray(r.vifs)).toBe(true) // adapter-only
      expect(r.multicollinearity).toBeDefined() // adapter-only
    })
  })

  // ── Error passthrough ────────────────────────────────────────────
  describe('adapter error passthrough', () => {
    it('returns {error, backend:scipy} when the adapter cannot compute', () => {
      // n < 2 per group → adapter errors; scipy result is irrelevant
      const r = normalizeIndependentT({ t: 9 }, [1], [2])
      expect(r.error).toBeTruthy()
      expect(r.backend).toBe('scipy')
    })
  })
})

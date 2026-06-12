import { describe, it, expect } from 'vitest'
import { mannWhitneyU, wilcoxonSignedRank, kruskalWallis, averageRank, dunnTest, friedmanTest } from '../../src/lib/statistics/nonparametric.js'

describe('averageRank', () => {
  it('ranks without ties', () => {
    const { ranks } = averageRank([3, 1, 4, 2])
    expect(ranks).toEqual([3, 1, 4, 2])
  })

  it('handles ties with average rank', () => {
    const { ranks, tieCounts } = averageRank([5, 3, 5, 1])
    // Sorted: 1(1), 3(2), 5(3.5), 5(3.5)
    expect(ranks[0]).toBe(3.5) // value 5 at index 0
    expect(ranks[1]).toBe(2)   // value 3 at index 1
    expect(ranks[2]).toBe(3.5) // value 5 at index 2
    expect(ranks[3]).toBe(1)   // value 1 at index 3
    expect(tieCounts).toEqual([2])
  })

  it('handles multiple tie groups', () => {
    const { tieCounts } = averageRank([1, 1, 3, 3, 5])
    expect(tieCounts).toEqual([2, 2])
  })
})

describe('mannWhitneyU', () => {
  it('returns correct shape', () => {
    const g1 = [23, 41, 54, 66, 32]
    const g2 = [67, 55, 43, 29, 18]
    const r = mannWhitneyU(g1, g2)
    expect(r.error).toBeUndefined()
    expect(r.U).toBeDefined()
    expect(r.U1).toBeDefined()
    expect(r.U2).toBeDefined()
    expect(r.R1).toBeDefined()
    expect(r.R2).toBeDefined()
    expect(r.z).toBeDefined()
    expect(r.pValue).toBeDefined()
    expect(r.isSignificant).toBeDefined()
    expect(r.effectSize).toBeDefined()
    expect(r.n1).toBe(5)
    expect(r.n2).toBe(5)
    expect(r.N).toBe(10)
  })

  it('reports significant difference for clearly separated groups', () => {
    const g1 = [1, 2, 3, 4, 5]
    const g2 = [10, 11, 12, 13, 14]
    const r = mannWhitneyU(g1, g2)
    expect(r.pValue).toBeLessThan(0.05)
    expect(r.isSignificant).toBe(true)
  })

  it('handles missing values', () => {
    const g1 = [10, null, 20, NaN, 30]
    const g2 = [40, 50, Infinity, 60]
    const r = mannWhitneyU(g1, g2)
    expect(r.error).toBeUndefined()
    expect(r.n1).toBe(3) // 10, 20, 30
    expect(r.n2).toBe(3) // 40, 50, 60
  })

  it('returns error for insufficient n', () => {
    const r = mannWhitneyU([1, 2], [3, 4])
    expect(r.error).toContain('minimal 3 observasi')
  })

  it('U1 + U2 = n1*n2', () => {
    const g1 = [23, 41, 54, 66, 32]
    const g2 = [67, 55, 43, 29, 18]
    const r = mannWhitneyU(g1, g2)
    expect(r.U1 + r.U2).toBe(r.n1 * r.n2)
  })

  it('handles ties in data', () => {
    const g1 = [5, 5, 5, 8, 9]
    const g2 = [5, 5, 10, 11, 12]
    const r = mannWhitneyU(g1, g2)
    expect(r.error).toBeUndefined()
    expect(r.pValue).toBeGreaterThan(0)
    expect(r.pValue).toBeLessThan(1)
  })
})

describe('wilcoxonSignedRank', () => {
  it('returns correct shape', () => {
    const before = [85, 90, 78, 92, 88, 76, 95, 82, 89, 80]
    const after = [90, 95, 80, 88, 92, 82, 91, 85, 93, 86]
    const r = wilcoxonSignedRank(before, after)
    expect(r.error).toBeUndefined()
    expect(r.W).toBeDefined()
    expect(r.Wpos).toBeDefined()
    expect(r.Wneg).toBeDefined()
    expect(r.z).toBeDefined()
    expect(r.pValue).toBeDefined()
    expect(r.meanDiff).toBeDefined()
    expect(r.n).toBeDefined()
  })

  it('ignores zero differences', () => {
    const before = [10, 20, 30, 40, 50, 60, 70, 80]
    const after = [10, 22, 30, 45, 55, 65, 72, 85]
    // pairs 1 and 3 have diff=0 (excluded)
    const r = wilcoxonSignedRank(before, after)
    expect(r.n).toBe(6) // 6 non-zero diffs
  })

  it('handles missing values via listwise pair deletion', () => {
    const before = [85, null, 78, 92, 88, 76, 95, 82, 89, 80]
    const after = [90, 95, NaN, 88, 92, 82, 91, 85, 93, 86]
    const r = wilcoxonSignedRank(before, after)
    expect(r.error).toBeUndefined()
    expect(r.n).toBeLessThanOrEqual(8) // some pairs excluded
  })

  it('returns error for mismatched lengths', () => {
    const r = wilcoxonSignedRank([1, 2, 3], [4, 5])
    expect(r.error).toContain('sama')
  })

  it('returns error for insufficient non-zero pairs', () => {
    const before = [10, 20, 30, 40, 50]
    const after = [10, 20, 30, 40, 50] // all diffs = 0
    const r = wilcoxonSignedRank(before, after)
    expect(r.error).toContain('minimal 5')
  })

  it('W + Wpos + Wneg = n(n+1)/2 when no ties', () => {
    const before = [1, 2, 3, 4, 5, 6, 7, 8]
    const after = [3, 5, 1, 7, 2, 8, 4, 6]
    const r = wilcoxonSignedRank(before, after)
    expect(r.Wpos + r.Wneg).toBe(r.n * (r.n + 1) / 2)
  })
})

describe('kruskalWallis', () => {
  it('returns correct shape', () => {
    const g1 = [23, 41, 54, 66, 32]
    const g2 = [67, 55, 43, 29, 18]
    const g3 = [80, 72, 91, 65, 88]
    const r = kruskalWallis([g1, g2, g3], ['Grup A', 'Grup B', 'Grup C'])
    expect(r.error).toBeUndefined()
    expect(r.H).toBeDefined()
    expect(r.df).toBe(2)
    expect(r.pValue).toBeDefined()
    expect(r.N).toBe(15)
    expect(r.k).toBe(3)
    expect(r.groupStats).toHaveLength(3)
    expect(r.isSignificant).toBeDefined()
    expect(r.etaSquared).toBeDefined()
  })

  it('detects significant difference between separated groups', () => {
    const g1 = [1, 2, 3, 4, 5]
    const g2 = [10, 11, 12, 13, 14]
    const g3 = [20, 21, 22, 23, 24]
    const r = kruskalWallis([g1, g2, g3])
    expect(r.pValue).toBeLessThan(0.05)
    expect(r.isSignificant).toBe(true)
  })

  it('groupStats include name, n, median, meanRank, sumRank', () => {
    const g1 = [10, 20, 30]
    const g2 = [15, 25, 35]
    const r = kruskalWallis([g1, g2], ['A', 'B'])
    expect(r.groupStats[0]).toHaveProperty('name', 'A')
    expect(r.groupStats[0]).toHaveProperty('n', 3)
    expect(r.groupStats[0]).toHaveProperty('median')
    expect(r.groupStats[0]).toHaveProperty('meanRank')
    expect(r.groupStats[0]).toHaveProperty('sumRank')
  })

  it('handles ties', () => {
    const g1 = [5, 5, 5, 8]
    const g2 = [5, 5, 10, 12]
    const r = kruskalWallis([g1, g2])
    expect(r.error).toBeUndefined()
    expect(r.pValue).toBeGreaterThan(0)
    expect(r.pValue).toBeLessThan(1)
  })

  it('returns error for less than 2 groups', () => {
    const r = kruskalWallis([[1, 2, 3]])
    expect(r.error).toContain('minimal 2 grup')
  })

  it('returns error for group with n < 2', () => {
    const r = kruskalWallis([[1], [2, 3, 4]])
    expect(r.error).toContain('minimal 2 observasi')
  })

  it('handles missing values per group', () => {
    const g1 = [10, null, 30, NaN, 50]
    const g2 = [20, 40, Infinity, 60]
    const r = kruskalWallis([g1, g2])
    expect(r.error).toBeUndefined()
    expect(r.groupStats[0].n).toBe(3) // 10, 30, 50
    expect(r.groupStats[1].n).toBe(3) // 20, 40, 60
  })

  it('eta-squared is clamped >= 0', () => {
    const g1 = [10, 20, 30]
    const g2 = [11, 21, 31]
    const r = kruskalWallis([g1, g2])
    expect(r.etaSquared).toBeGreaterThanOrEqual(0)
  })
})

// ── Dunn Post-hoc ─────────────────────────────────────────────────

describe('dunnTest', () => {
  it('identifies post-hoc pairs after Kruskal-Wallis', () => {
    const g1 = [10, 11, 12, 13, 14]
    const g2 = [20, 21, 22, 23, 24]
    const g3 = [15, 16, 17, 18, 19]
    const r = dunnTest([g1, g2, g3])
    expect(r.error).toBeUndefined()
    expect(r.test).toBe('Dunn post-hoc')
    expect(r.k).toBe(3)
    expect(r.numPairs).toBe(3)
    expect(r.N).toBe(15)
    expect(r.comparisons).toHaveLength(3)
    expect(r.comparisons[0].z).toBeDefined()
    expect(r.comparisons[0].pBonferroni).toBeGreaterThanOrEqual(0)
    expect(r.comparisons[0].pBonferroni).toBeLessThanOrEqual(1)
  })

  it('returns error for < 2 groups', () => {
    const r = dunnTest([[1, 2, 3]])
    expect(r.error).toBe('Butuh minimal 2 grup')
  })

  it('Bonferroni correction inflates p-value', () => {
    const g1 = [1, 2, 3, 4, 5]
    const g2 = [2, 3, 4, 5, 6]
    const g3 = [3, 4, 5, 6, 7]
    const g4 = [100, 101, 102, 103, 104]
    const r = dunnTest([g1, g2, g3, g4])
    expect(r.numPairs).toBe(6)
    for (const c of r.comparisons) {
      expect(c.pBonferroni).toBeGreaterThanOrEqual(c.pRaw - 1e-12)
    }
  })

  it('mean ranks reflect group values', () => {
    const low = [1, 2, 3]
    const high = [100, 101, 102]
    const r = dunnTest([low, high])
    expect(r.meanRanks[0].meanRank).toBeLessThan(r.meanRanks[1].meanRank)
  })

  it('interpretation is non-empty', () => {
    const r = dunnTest([[1,2,3], [4,5,6], [7,8,9]])
    expect(r.interpretation).toBeTypeOf('string')
    expect(r.interpretation.length).toBeGreaterThan(0)
  })
})

// ── Friedman ──────────────────────────────────────────────────────

describe('friedmanTest', () => {
  it('computes Friedman with 3 conditions × 5 blocks', () => {
    const data = [
      [7, 8, 9],
      [6, 7, 8],
      [8, 9, 7],
      [5, 6, 7],
      [9, 8, 8],
    ]
    const r = friedmanTest(data)
    expect(r.error).toBeUndefined()
    expect(r.test).toBe('Friedman')
    expect(r.n).toBe(5)
    expect(r.k).toBe(3)
    expect(r.df).toBe(2)
    expect(r.chi2).toBeGreaterThan(0)
    expect(r.pValue).toBeGreaterThan(0)
    expect(r.pValue).toBeLessThan(1)
    expect(r.W).toBeGreaterThanOrEqual(0)
    expect(r.W).toBeLessThanOrEqual(1)
    expect(r.conditionStats).toHaveLength(3)
    expect(r.isSignificant).toBeTypeOf('boolean')
    expect(r.interpretation).toBeTypeOf('string')
  })

  it('returns error if < 3 blocks', () => {
    const r = friedmanTest([[1, 2], [3, 4]])
    expect(r.error).toContain('Butuh minimal 3 blok')
  })

  it('returns error if < 2 conditions', () => {
    const r = friedmanTest([[1], [2], [3], [4]])
    expect(r.error).toContain('Butuh minimal 2 kondisi')
  })

  it('returns error for uneven columns', () => {
    const r = friedmanTest([[1, 2], [3, 4], [5, 6, 7]])
    expect(r.error).toContain('tidak memiliki')
  })

  it('ties do not break computation', () => {
    const data = [
      [3, 3, 5],
      [2, 2, 4],
      [5, 5, 3],
      [4, 4, 5],
    ]
    const r = friedmanTest(data)
    expect(r.error).toBeUndefined()
    expect(r.chi2).toBeGreaterThan(0)
  })

  it('Kendall W close to 1 with perfect agreement', () => {
    const data = [
      [1, 2, 3],
      [1, 2, 3],
      [1, 2, 3],
      [1, 2, 3],
    ]
    const r = friedmanTest(data)
    expect(r.W).toBeCloseTo(1, 3)
    expect(r.WLabel).toBe('Besar')
  })

  it('conditionStats contain correct structure', () => {
    const data = [
      [10, 20, 30],
      [12, 22, 32],
      [11, 21, 31],
    ]
    const r = friedmanTest(data, ['Pre', 'Post', 'FollowUp'])
    expect(r.conditionStats[0].name).toBe('Pre')
    expect(r.conditionStats[0]).toHaveProperty('sumRank')
    expect(r.conditionStats[0]).toHaveProperty('meanRank')
    expect(r.conditionStats[0]).toHaveProperty('median')
  })
})

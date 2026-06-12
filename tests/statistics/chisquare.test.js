import { describe, it, expect } from 'vitest'
import { chiSquareIndependence, chiSquareGoodnessOfFit, mcnemarTest } from '../../src/lib/statistics/chisquare.js'

describe('chiSquareIndependence', () => {
  it('2x2 independence with significant result', () => {
    // Example: gender vs preference (significant association)
    const gender = ['M', 'M', 'M', 'M', 'M', 'F', 'F', 'F', 'F', 'F']
    const preference = ['A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'A', 'A']
    const result = chiSquareIndependence(gender, preference, 0.05)
    
    expect(result.error).toBeUndefined()
    expect(result.chi2).toBeGreaterThan(0)
    expect(result.df).toBe(1)
    expect(result.N).toBe(10)
    expect(result.rowLabels).toEqual(['F', 'M'])
    expect(result.colLabels).toEqual(['A', 'B'])
    expect(result.observed).toHaveLength(2)
    expect(result.observed[0]).toHaveLength(2)
    expect(result.expected).toHaveLength(2)
    expect(result.expected[0]).toHaveLength(2)
    expect(result.cramersV).toBeGreaterThanOrEqual(0)
    expect(result.cramersV).toBeLessThanOrEqual(1)
    expect(result.cramersV_CI).toHaveLength(2)
    expect(result.cramersV_CI[0]).toBeGreaterThanOrEqual(0)
    expect(result.cramersV_CI[1]).toBeLessThanOrEqual(1)
    expect(result.phi).not.toBeNull()
    expect(result.isSignificant).toBeTypeOf('boolean')
    expect(result.interpretation).toBeTypeOf('string')
  })

  it('2x2 independence with non-significant result', () => {
    // Random data, no association expected
    const col1 = ['A', 'A', 'A', 'B', 'B', 'B', 'A', 'B', 'A', 'B']
    const col2 = ['X', 'Y', 'X', 'Y', 'X', 'Y', 'X', 'Y', 'X', 'Y']
    const result = chiSquareIndependence(col1, col2, 0.05)
    
    expect(result.error).toBeUndefined()
    expect(result.chi2).toBeGreaterThanOrEqual(0)
    expect(result.df).toBe(1)
    expect(result.N).toBe(10)
    expect(result.rowLabels).toEqual(['A', 'B'])
    expect(result.colLabels).toEqual(['X', 'Y'])
    expect(result.isSignificant).toBe(false) // likely not significant
  })

  it('3x3 independence test', () => {
    const row = ['Low', 'Low', 'Low', 'Medium', 'Medium', 'Medium', 'High', 'High', 'High']
    const col = ['Red', 'Green', 'Blue', 'Red', 'Green', 'Blue', 'Red', 'Green', 'Blue']
    const result = chiSquareIndependence(row, col, 0.05)
    
    expect(result.error).toBeUndefined()
    expect(result.chi2).toBeGreaterThanOrEqual(0)
    expect(result.df).toBe(4) // (3-1)*(3-1) = 4
    expect(result.N).toBe(9)
    expect(result.rowLabels).toEqual(['High', 'Low', 'Medium'])
    expect(result.colLabels).toEqual(['Blue', 'Green', 'Red'])
    expect(result.observed).toHaveLength(3)
    expect(result.observed[0]).toHaveLength(3)
    expect(result.cramersV).toBeGreaterThanOrEqual(0)
    expect(result.cramersV).toBeLessThanOrEqual(1)
    expect(result.phi).toBeNull() // phi only for 2x2
  })

  it('CramersV correctness (value between 0 and 1)', () => {
    const col1 = ['A', 'A', 'B', 'B', 'A', 'B', 'A', 'B']
    const col2 = ['X', 'Y', 'X', 'Y', 'X', 'Y', 'X', 'Y']
    const result = chiSquareIndependence(col1, col2, 0.05)
    
    expect(result.error).toBeUndefined()
    expect(result.cramersV).toBeGreaterThanOrEqual(0)
    expect(result.cramersV).toBeLessThanOrEqual(1)
  })

  it('CramersV CI bounds (both between 0 and 1)', () => {
    const col1 = ['A', 'A', 'B', 'B', 'A', 'B', 'A', 'B', 'A', 'B']
    const col2 = ['X', 'Y', 'X', 'Y', 'X', 'Y', 'X', 'Y', 'X', 'Y']
    const result = chiSquareIndependence(col1, col2, 0.05)
    
    expect(result.error).toBeUndefined()
    expect(result.cramersV_CI).toHaveLength(2)
    expect(result.cramersV_CI[0]).toBeGreaterThanOrEqual(0)
    expect(result.cramersV_CI[0]).toBeLessThanOrEqual(1)
    expect(result.cramersV_CI[1]).toBeGreaterThanOrEqual(0)
    expect(result.cramersV_CI[1]).toBeLessThanOrEqual(1)
    expect(result.cramersV_CI[0]).toBeLessThanOrEqual(result.cramersV_CI[1])
  })

  it('Assumption warning for sparse table (expected < 5 in >20% cells)', () => {
    // Small sample size with many categories -> many cells with low expected
    const col1 = ['A', 'B', 'C', 'D', 'E']
    const col2 = ['X', 'Y', 'Z', 'W', 'V']
    const result = chiSquareIndependence(col1, col2, 0.05)
    
    expect(result.error).toBeUndefined()
    expect(result.cellsLowExpected).toBeGreaterThan(0)
    expect(result.lowExpectedPercent).toBeGreaterThan(20)
    expect(result.assumptionWarning).toContain('⚠️')
    expect(result.assumptionWarning).toContain('expected < 5')
    expect(result.assumptionWarning).toContain('Fisher\'s Exact Test')
  })

  it('Edge case: all same category', () => {
    const col1 = ['A', 'A', 'A', 'A', 'A']
    const col2 = ['X', 'X', 'X', 'X', 'X']
    const result = chiSquareIndependence(col1, col2, 0.05)
    
    expect(result.error).toBe('Butuh minimal 2 kategori per variabel (rows=1, cols=1)')
  })

  it('Edge case: minimal sample (5 pairs)', () => {
    const col1 = ['A', 'B', 'A', 'B', 'A']
    const col2 = ['X', 'Y', 'Y', 'X', 'X']
    const result = chiSquareIndependence(col1, col2, 0.05)
    
    expect(result.error).toBeUndefined()
    expect(result.N).toBe(5)
    expect(result.chi2).toBeGreaterThanOrEqual(0)
    expect(result.df).toBe(1)
  })

  it('Edge case: mismatched lengths returns error', () => {
    const col1 = ['A', 'B', 'C']
    const col2 = ['X', 'Y']
    const result = chiSquareIndependence(col1, col2, 0.05)
    
    expect(result.error).toBe('Panjang kolom harus sama (3 vs 2)')
  })

  it('Output structure check (has chi2, df, pValue, N, etc.)', () => {
    const col1 = ['A', 'A', 'B', 'B', 'A']
    const col2 = ['X', 'Y', 'X', 'Y', 'X']
    const result = chiSquareIndependence(col1, col2, 0.05)
    
    expect(result).toHaveProperty('chi2')
    expect(result).toHaveProperty('df')
    expect(result).toHaveProperty('pValue')
    expect(result).toHaveProperty('N')
    expect(result).toHaveProperty('rowLabels')
    expect(result).toHaveProperty('colLabels')
    expect(result).toHaveProperty('observed')
    expect(result).toHaveProperty('expected')
    expect(result).toHaveProperty('rowTotals')
    expect(result).toHaveProperty('colTotals')
    expect(result).toHaveProperty('cramersV')
    expect(result).toHaveProperty('cramersV_CI')
    expect(result).toHaveProperty('phi')
    expect(result).toHaveProperty('cellsLowExpected')
    expect(result).toHaveProperty('lowExpectedPercent')
    expect(result).toHaveProperty('assumptionWarning')
    expect(result).toHaveProperty('effectSizeLabel')
    expect(result).toHaveProperty('isSignificant')
    expect(result).toHaveProperty('alpha')
    expect(result).toHaveProperty('interpretation')
  })
})

describe('chiSquareGoodnessOfFit', () => {
  it('GoodnessOfFit with uniform distribution', () => {
    const observed = [10, 10, 10, 10]
    const result = chiSquareGoodnessOfFit(observed, null, 0.05)
    
    expect(result.error).toBeUndefined()
    expect(result.chi2).toBe(0) // Perfect fit
    expect(result.df).toBe(3)
    expect(result.N).toBe(40)
    expect(result.k).toBe(4)
    expect(result.observed).toEqual([10, 10, 10, 10])
    expect(result.expected).toEqual([10, 10, 10, 10])
    expect(result.isSignificant).toBe(false)
    expect(result.interpretation).toContain('sesuai dengan expected')
  })

  it('GoodnessOfFit with custom expected', () => {
    const observed = [5, 10, 15]
    const expected = [10, 10, 10]
    const result = chiSquareGoodnessOfFit(observed, expected, 0.05)
    
    expect(result.error).toBeUndefined()
    expect(result.chi2).toBeGreaterThan(0)
    expect(result.df).toBe(2)
    expect(result.N).toBe(30)
    expect(result.k).toBe(3)
    expect(result.observed).toEqual([5, 10, 15])
    expect(result.expected).toEqual([10, 10, 10])
    expect(result.isSignificant).toBeTypeOf('boolean')
  })

  it('Edge case: all same category', () => {
    const observed = [20]
    const result = chiSquareGoodnessOfFit(observed, null, 0.05)
    
    expect(result.error).toBe('Butuh minimal 2 kategori')
  })

  it('Edge case: mismatched lengths returns error', () => {
    const observed = [10, 20, 30]
    const expected = [15, 15]
    const result = chiSquareGoodnessOfFit(observed, expected, 0.05)
    
    expect(result.error).toBe('Panjang observed dan expected harus sama')
  })
})

// ── McNemar ───────────────────────────────────────────────────────

describe('mcnemarTest', () => {
  it('computes McNemar with 2×2 array input', () => {
    // 30 subjects: a=12 (++, b=8 (+-), c=3 (-+), d=7 (--)
    const table = [[12, 8], [3, 7]]
    const r = mcnemarTest(table)
    expect(r.error).toBeUndefined()
    expect(r.test).toBe('McNemar')
    expect(r.a).toBe(12)
    expect(r.b).toBe(8)
    expect(r.c).toBe(3)
    expect(r.d).toBe(7)
    expect(r.N).toBe(30)
    expect(r.discordant).toBe(11)
    expect(r.df).toBe(1)
    expect(r.chi2).toBeGreaterThan(0)
    expect(r.pValue).toBeGreaterThan(0)
    expect(r.pValue).toBeLessThan(1)
    expect(r.isSignificant).toBeTypeOf('boolean')
    expect(r.interpretation).toBeTypeOf('string')
  })

  it('computes McNemar with object input', () => {
    const r = mcnemarTest({ a: 20, b: 5, c: 12, d: 3 })
    expect(r.error).toBeUndefined()
    expect(r.a).toBe(20)
    expect(r.b).toBe(5)
    expect(r.c).toBe(12)
  })

  it('returns error for non-2×2 array', () => {
    const r = mcnemarTest([[10, 20, 30], [5, 10, 15]])
    expect(r.error).toBe('Tabel harus 2x2')
  })

  it('returns error when b + c = 0', () => {
    const r = mcnemarTest([[10, 0], [0, 5]])
    expect(r.error).toContain('Diskordan (b + c) = 0')
  })

  it('continuity correction applied (b-c adjusted by 1)', () => {
    // Without correction: chi2 = (b-c)²/(b+c) = 1/11 = 0.0909
    // With correction: chi2 = (|b-c|-1)²/(b+c) = 0/11 = 0
    const r = mcnemarTest([[12, 8], [3, 7]])
    // |8-3| - 1 = 4, 4²/11 = 1.4545...
    expect(r.chi2).toBeCloseTo(16 / 11, 3)
  })

  it('significant result when discordant difference large', () => {
    // Large discordance: b=40, c=10 → clear change
    const r = mcnemarTest([[10, 40], [10, 10]])
    expect(r.isSignificant).toBe(true)
    expect(r.discordant).toBe(50)
  })

  it('odds ratio computed correctly', () => {
    const r = mcnemarTest([[10, 20], [5, 15]])
    // b/c = 20/5 = 4
    expect(r.oddsRatio).toBeCloseTo(4, 1)
  })

  it('binomial exact when b+c < 25', () => {
    const r = mcnemarTest([[5, 12], [1, 2]])
    // b + c = 13 < 25 → exactP computed
    expect(r.exactP).not.toBeNull()
    expect(r.exactP).toBeGreaterThan(0)
    expect(r.exactP).toBeLessThanOrEqual(1)
    expect(r.note).toContain('b + c < 25')
  })
})
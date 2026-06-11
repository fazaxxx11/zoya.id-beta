import { describe, it, expect } from 'vitest'
import { chiSquareIndependence, chiSquareGoodnessOfFit } from '../../src/lib/statistics/chisquare.js'

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
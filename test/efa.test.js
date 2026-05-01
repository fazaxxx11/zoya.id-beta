// EFA unit tests
// ==============
// Validates correlation matrix, KMO, Bartlett, eigendecomposition,
// PCA extraction, and Varimax rotation using simulated 2-factor data
// where we know the true structure.

import { describe, it, expect } from 'vitest'
import {
  correlationMatrix, kmo, bartlettSphericity,
  extractPCA, varimaxRotation, efa, kmoInterpretation,
} from '../src/lib/efa.js'

// Deterministic random
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function normal(rng) {
  const u1 = rng() || 1e-12
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

// Generate 2-factor data: 6 items, items 1-3 load on F1, items 4-6 load on F2
function gen2FactorData(n, seed) {
  const rng = mulberry32(seed)
  const X = []
  for (let i = 0; i < n; i++) {
    const f1 = normal(rng)
    const f2 = normal(rng)
    const noise = () => normal(rng) * 0.5
    X.push([
      0.8 * f1 + noise(),
      0.85 * f1 + noise(),
      0.75 * f1 + noise(),
      0.8 * f2 + noise(),
      0.85 * f2 + noise(),
      0.75 * f2 + noise(),
    ])
  }
  return X
}

// ============================================================
// correlationMatrix
// ============================================================
describe('correlationMatrix', () => {
  it('returns identity for uncorrelated standard normal', () => {
    const rng = mulberry32(1)
    const X = []
    for (let i = 0; i < 1000; i++) {
      X.push([normal(rng), normal(rng), normal(rng)])
    }
    const R = correlationMatrix(X)
    expect(R).toHaveLength(3)
    expect(R[0][0]).toBeCloseTo(1, 5)
    expect(R[1][1]).toBeCloseTo(1, 5)
    expect(R[2][2]).toBeCloseTo(1, 5)
    // Off-diagonals should be near 0 with large n
    expect(Math.abs(R[0][1])).toBeLessThan(0.1)
    expect(Math.abs(R[0][2])).toBeLessThan(0.1)
  })

  it('detects strong correlation', () => {
    const X = []
    for (let i = 0; i < 100; i++) {
      const a = i / 10
      X.push([a, a + 0.01 * Math.sin(i), a * -1])
    }
    const R = correlationMatrix(X)
    expect(R[0][1]).toBeCloseTo(1, 1)
    expect(R[0][2]).toBeCloseTo(-1, 1)
  })
})

// ============================================================
// KMO
// ============================================================
describe('kmo', () => {
  it('high KMO when items group into clear factors', () => {
    const X = gen2FactorData(500, 42)
    const R = correlationMatrix(X)
    const k = kmo(R)
    expect(k.overall).toBeGreaterThan(0.7)
    expect(k.perVariable).toHaveLength(6)
    expect(k.interpretation).toMatch(/middling|meritorious|marvelous/)
  })

  it('interpretation thresholds', () => {
    expect(kmoInterpretation(0.95)).toBe('marvelous')
    expect(kmoInterpretation(0.85)).toBe('meritorious')
    expect(kmoInterpretation(0.75)).toBe('middling')
    expect(kmoInterpretation(0.65)).toBe('mediocre')
    expect(kmoInterpretation(0.55)).toBe('miserable')
    expect(kmoInterpretation(0.45)).toBe('unacceptable')
  })
})

// ============================================================
// Bartlett's test
// ============================================================
describe('bartlettSphericity', () => {
  it('rejects identity null when items correlate', () => {
    const X = gen2FactorData(300, 7)
    const R = correlationMatrix(X)
    const b = bartlettSphericity(R, 300)
    expect(b.chi2).toBeGreaterThan(0)
    expect(b.df).toBe((6 * 5) / 2)  // 15
    expect(b.p).toBeLessThan(0.001)
  })

  it('chi2 grows with sample size', () => {
    const small = correlationMatrix(gen2FactorData(50, 1))
    const large = correlationMatrix(gen2FactorData(500, 1))
    const bSmall = bartlettSphericity(small, 50)
    const bLarge = bartlettSphericity(large, 500)
    expect(bLarge.chi2).toBeGreaterThan(bSmall.chi2)
  })
})

// ============================================================
// PCA extraction
// ============================================================
describe('extractPCA', () => {
  it('Kaiser criterion picks 2 factors for 2-factor data', () => {
    const R = correlationMatrix(gen2FactorData(500, 13))
    const e = extractPCA(R)
    expect(e.nFactors).toBe(2)
    expect(e.eigenvalues[0]).toBeGreaterThan(1)
    expect(e.eigenvalues[1]).toBeGreaterThan(1)
    expect(e.eigenvalues[2]).toBeLessThan(1)
  })

  it('loadings are p × nFactors', () => {
    const R = correlationMatrix(gen2FactorData(300, 4))
    const e = extractPCA(R, 2)
    expect(e.loadings).toHaveLength(6)
    expect(e.loadings[0]).toHaveLength(2)
  })

  it('communalities sum to nFactors total variance proportion', () => {
    const R = correlationMatrix(gen2FactorData(300, 8))
    const e = extractPCA(R, 2)
    const totalCom = e.communalities.reduce((s, v) => s + v, 0)
    // Total communality should equal sum of first 2 eigenvalues
    const eigSum = e.eigenvalues.slice(0, 2).reduce((s, v) => s + v, 0)
    expect(totalCom).toBeCloseTo(eigSum, 3)
  })

  it('cumulative variance proportion ≤ 1', () => {
    const R = correlationMatrix(gen2FactorData(300, 99))
    const e = extractPCA(R)
    const last = e.varianceExplained[e.varianceExplained.length - 1]
    expect(last.cumulativeProp).toBeLessThanOrEqual(1.0)
    expect(last.cumulativeProp).toBeGreaterThan(0)
  })
})

// ============================================================
// Varimax rotation
// ============================================================
describe('varimaxRotation', () => {
  it('rotation preserves communalities (sum of squared loadings per row)', () => {
    const R = correlationMatrix(gen2FactorData(300, 21))
    const e = extractPCA(R, 2)
    const rot = varimaxRotation(e.loadings)
    for (let i = 0; i < 6; i++) {
      const before = e.loadings[i].reduce((s, v) => s + v * v, 0)
      const after = rot.rotated[i].reduce((s, v) => s + v * v, 0)
      expect(after).toBeCloseTo(before, 3)
    }
  })

  it('rotated loadings show clearer structure (each item dominates one factor)', () => {
    const R = correlationMatrix(gen2FactorData(500, 33))
    const e = extractPCA(R, 2)
    const rot = varimaxRotation(e.loadings)
    // For each row, the difference between max-abs and second-max-abs should be large
    for (let i = 0; i < 6; i++) {
      const abs = rot.rotated[i].map(Math.abs).sort((a, b) => b - a)
      const ratio = abs[0] / Math.max(abs[1], 1e-9)
      expect(ratio).toBeGreaterThan(1.5)  // primary loading >> secondary
    }
  })

  it('returns unchanged matrix when k < 2', () => {
    const single = [[0.7], [0.8], [0.6]]
    const rot = varimaxRotation(single)
    expect(rot.rotated).toEqual(single)
  })
})

// ============================================================
// efa() pipeline
// ============================================================
describe('efa pipeline', () => {
  it('recovers 2-factor structure from simulated data', () => {
    const X = gen2FactorData(500, 100)
    const r = efa(X, { itemNames: ['I1', 'I2', 'I3', 'I4', 'I5', 'I6'] })

    expect(r.nFactors).toBe(2)
    expect(r.kmo.overall).toBeGreaterThan(0.7)
    expect(r.bartlett.p).toBeLessThan(0.001)
    expect(r.fitOk).toBe(true)

    // Each item should map to its true factor (1, 1, 1, 2, 2, 2 OR 2, 2, 2, 1, 1, 1)
    const primary = r.factorTable.map(t => t.primaryFactor)
    const itemsToF1 = primary.slice(0, 3)
    const itemsToF2 = primary.slice(3, 6)
    // All first 3 items should share the same primary factor
    expect(new Set(itemsToF1).size).toBe(1)
    expect(new Set(itemsToF2).size).toBe(1)
    // And they should differ from the second 3
    expect(itemsToF1[0]).not.toBe(itemsToF2[0])
  })

  it('throws on too few variables', () => {
    expect(() => efa([[1, 2], [3, 4], [5, 6]])).toThrow()
  })

  it('throws on too small sample', () => {
    expect(() => efa([[1, 2, 3, 4, 5]])).toThrow()
  })

  it('returns nF specified by user', () => {
    const X = gen2FactorData(300, 55)
    const r = efa(X, { nFactors: 3 })
    expect(r.nFactors).toBe(3)
  })

  it('skips rotation when only 1 factor', () => {
    // Generate single-factor data
    const rng = mulberry32(77)
    const X = []
    for (let i = 0; i < 200; i++) {
      const f = normal(rng)
      X.push([
        0.8 * f + normal(rng) * 0.3,
        0.85 * f + normal(rng) * 0.3,
        0.75 * f + normal(rng) * 0.3,
      ])
    }
    const r = efa(X, { nFactors: 1 })
    expect(r.nFactors).toBe(1)
    expect(r.rotationApplied).toBe(false)
  })

  it('handles NaN by filtering rows', () => {
    const X = gen2FactorData(300, 11)
    X[5][2] = NaN
    X[10][0] = NaN
    const r = efa(X)
    expect(r.n).toBe(298)
  })
})

// Sampling formulas unit tests
// =============================
// Verifies Slovin / Krejcie-Morgan / Cochran / Lemeshow,
// stratified allocation correctness (sums match), random sample reproducibility.

import { describe, it, expect } from 'vitest'
import {
  zForConfidence,
  slovinSize,
  krejcieMorganSize,
  cochranSize,
  lemeshowSize,
  stratifiedAllocation,
  randomSample,
  SAMPLING_FORMULAS,
} from '../src/lib/sampling.js'

describe('zForConfidence', () => {
  it('returns standard Z-values for common levels', () => {
    expect(zForConfidence(0.90)).toBeCloseTo(1.645, 3)
    expect(zForConfidence(0.95)).toBeCloseTo(1.960, 3)
    expect(zForConfidence(0.99)).toBeCloseTo(2.576, 3)
  })

  it('falls back to inverse-normal CDF for non-tabled levels', () => {
    // 0.97 confidence → α/2 = 0.015 → z ≈ 2.17
    const z = zForConfidence(0.97)
    expect(z).toBeGreaterThan(2.0)
    expect(z).toBeLessThan(2.4)
  })
})

describe('slovinSize', () => {
  it('classic textbook example: N=1000, e=0.05 → n=286', () => {
    // 1000 / (1 + 1000*0.0025) = 1000/3.5 = 285.71 → ceil 286
    const r = slovinSize(1000, 0.05)
    expect(r.n).toBe(286)
  })

  it('N=100, e=0.10 → n=50', () => {
    // 100/(1+100*0.01) = 100/2 = 50
    const r = slovinSize(100, 0.10)
    expect(r.n).toBe(50)
  })

  it('N=500, e=0.05 → n=222', () => {
    // 500/(1+500*0.0025) = 500/2.25 = 222.22 → 223
    const r = slovinSize(500, 0.05)
    expect(r.n).toBe(223)
  })

  it('throws on invalid input', () => {
    expect(() => slovinSize(0, 0.05)).toThrow()
    expect(() => slovinSize(100, 0)).toThrow()
    expect(() => slovinSize(100, 1.5)).toThrow()
  })
})

describe('krejcieMorganSize', () => {
  // Krejcie & Morgan original 1970 table values (Z=1.96, p=0.5, e=0.05)
  const TABLE = [
    [10, 10],
    [50, 44],
    [100, 80],
    [500, 217],
    [1000, 278],
    [5000, 357],
    [10000, 370],
    [100000, 383],
  ]

  TABLE.forEach(([N, expected]) => {
    it(`N=${N} → n≈${expected} (table tolerance ±1)`, () => {
      const r = krejcieMorganSize(N)
      expect(r.n).toBeGreaterThanOrEqual(expected - 1)
      expect(r.n).toBeLessThanOrEqual(expected + 1)
    })
  })

  it('uses Z=1.96 by default', () => {
    expect(krejcieMorganSize(1000).Z).toBeCloseTo(1.96, 2)
  })

  it('larger error → smaller n', () => {
    const a = krejcieMorganSize(1000, { e: 0.05 }).n
    const b = krejcieMorganSize(1000, { e: 0.10 }).n
    expect(b).toBeLessThan(a)
  })
})

describe('cochranSize', () => {
  it('infinite population: Z=1.96, p=0.5, e=0.05 → n0=385', () => {
    // (1.96² × 0.25) / 0.0025 = 384.16 → ceil 385
    const r = cochranSize({ confidence: 0.95, p: 0.5, e: 0.05 })
    expect(r.n0).toBe(385)
    expect(r.n).toBe(385)  // no FPC since N not given
  })

  it('finite population correction: N=1000 reduces n', () => {
    const noFPC = cochranSize({ p: 0.5, e: 0.05 }).n
    const withFPC = cochranSize({ p: 0.5, e: 0.05, N: 1000 }).n
    expect(withFPC).toBeLessThan(noFPC)
    // 385/(1+(384/1000)) = 385/1.384 ≈ 278
    expect(withFPC).toBeGreaterThanOrEqual(277)
    expect(withFPC).toBeLessThanOrEqual(279)
  })

  it('p=0.5 gives largest n (most conservative)', () => {
    const a = cochranSize({ p: 0.5, e: 0.05 }).n
    const b = cochranSize({ p: 0.3, e: 0.05 }).n
    const c = cochranSize({ p: 0.1, e: 0.05 }).n
    expect(a).toBeGreaterThanOrEqual(b)
    expect(b).toBeGreaterThanOrEqual(c)
  })
})

describe('lemeshowSize', () => {
  it('standard health survey: p=0.5, d=0.05, 95% CI → n=385', () => {
    expect(lemeshowSize({ p: 0.5, d: 0.05 }).n).toBe(385)
  })

  it('rare prevalence p=0.05 → smaller n', () => {
    // Z²·0.05·0.95/0.0025 = 3.8416 × 0.0475 / 0.0025 = 73.0 → 73
    const r = lemeshowSize({ p: 0.05, d: 0.05 })
    expect(r.n).toBeGreaterThanOrEqual(72)
    expect(r.n).toBeLessThanOrEqual(74)
  })
})

describe('stratifiedAllocation — proportional', () => {
  it('basic case: 3 strata, total n=100', () => {
    const strata = [
      { name: 'Kelas X',  N: 200 },
      { name: 'Kelas XI', N: 150 },
      { name: 'Kelas XII', N: 150 },
    ]
    const r = stratifiedAllocation(strata, 100, 'proportional')
    // Total population 500, n=100 → fraction 0.20
    expect(r[0].n).toBe(40) // 200×0.2
    expect(r[1].n).toBe(30) // 150×0.2
    expect(r[2].n).toBe(30)
    expect(r.reduce((s, x) => s + x.n, 0)).toBe(100)
  })

  it('largest-remainder fixes rounding so sum equals n', () => {
    const strata = [
      { name: 'A', N: 33 },
      { name: 'B', N: 33 },
      { name: 'C', N: 34 },
    ]
    const r = stratifiedAllocation(strata, 10, 'proportional')
    expect(r.reduce((s, x) => s + x.n, 0)).toBe(10)
  })

  it('preserves order of original strata', () => {
    const strata = [
      { name: 'Z', N: 10 },
      { name: 'A', N: 30 },
    ]
    const r = stratifiedAllocation(strata, 8, 'proportional')
    expect(r[0].name).toBe('Z')
    expect(r[1].name).toBe('A')
  })
})

describe('stratifiedAllocation — equal', () => {
  it('distributes equally with leftover going to first strata', () => {
    const strata = [
      { name: 'A', N: 100 }, { name: 'B', N: 100 }, { name: 'C', N: 100 },
    ]
    const r = stratifiedAllocation(strata, 10, 'equal')
    // 10/3 = 3 each, +1 leftover for first
    expect(r[0].n).toBe(4)
    expect(r[1].n).toBe(3)
    expect(r[2].n).toBe(3)
    expect(r.reduce((s, x) => s + x.n, 0)).toBe(10)
  })
})

describe('randomSample', () => {
  it('returns exactly k items', () => {
    const arr = Array.from({ length: 50 }, (_, i) => i)
    const s = randomSample(arr, 10)
    expect(s.length).toBe(10)
  })

  it('all items are from the original (no duplicates)', () => {
    const arr = ['a','b','c','d','e','f','g','h','i','j']
    const s = randomSample(arr, 5)
    expect(new Set(s).size).toBe(5)
    s.forEach(item => expect(arr).toContain(item))
  })

  it('reproducible with seed', () => {
    const arr = Array.from({ length: 100 }, (_, i) => i)
    const a = randomSample(arr, 10, 42)
    const b = randomSample(arr, 10, 42)
    expect(a).toEqual(b)
  })

  it('different seeds give different samples', () => {
    const arr = Array.from({ length: 100 }, (_, i) => i)
    const a = randomSample(arr, 10, 1)
    const b = randomSample(arr, 10, 2)
    expect(a).not.toEqual(b)
  })

  it('throws when k > items.length', () => {
    expect(() => randomSample([1, 2, 3], 5)).toThrow()
  })
})

describe('SAMPLING_FORMULAS metadata', () => {
  it('contains all 4 formulas with required fields', () => {
    const ids = SAMPLING_FORMULAS.map(f => f.id)
    expect(ids).toContain('slovin')
    expect(ids).toContain('krejcie_morgan')
    expect(ids).toContain('cochran')
    expect(ids).toContain('lemeshow')
    SAMPLING_FORMULAS.forEach(f => {
      expect(f.name).toBeTruthy()
      expect(f.desc).toBeTruthy()
      expect(Array.isArray(f.requires)).toBe(true)
    })
  })
})

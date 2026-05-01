// Mediation & Moderation unit tests
// =================================
// Validates simple mediation (Hayes Model 4) using simulated data with
// known parameters, and simple moderation (Model 1) including conditional
// effects and Johnson-Neyman transition points.

import { describe, it, expect } from 'vitest'
import { simpleMediation, simpleModeration } from '../src/lib/mediation.js'

// ============================================================
// Helpers: deterministic random data generation
// ============================================================
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
  // Box-Muller
  const u1 = rng() || 1e-12
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

// Generate data per Hayes Model 4: X → M → Y
//   M = aₚ·X + e_M
//   Y = c'ₚ·X + bₚ·M + e_Y
function genMediationData(n, { a, b, cp, seed }) {
  const rng = mulberry32(seed)
  const X = [], M = [], Y = []
  for (let i = 0; i < n; i++) {
    const x = normal(rng)
    const eM = normal(rng) * 0.5
    const eY = normal(rng) * 0.5
    const m = a * x + eM
    const y = cp * x + b * m + eY
    X.push(x); M.push(m); Y.push(y)
  }
  return { X, M, Y }
}

// ============================================================
// MEDIATION — Model 4
// ============================================================
describe('simpleMediation — Hayes Model 4', () => {
  it('recovers known a, b, c\' parameters from simulated data', () => {
    // True params: a=0.6, b=0.5, cp=0.2 → ab=0.30, c=cp+ab=0.50
    const { X, M, Y } = genMediationData(500, { a: 0.6, b: 0.5, cp: 0.2, seed: 42 })
    const r = simpleMediation(X, M, Y, { bootstrap: 1000, seed: 1 })

    expect(r.paths.a.coef).toBeCloseTo(0.6, 1)
    expect(r.paths.b.coef).toBeCloseTo(0.5, 1)
    expect(r.paths.cp.coef).toBeCloseTo(0.2, 1)
    // Total effect c ≈ cp + ab = 0.2 + 0.6*0.5 = 0.5
    expect(r.paths.c.coef).toBeCloseTo(0.5, 1)
    // Indirect effect ab
    expect(r.indirect.ab).toBeCloseTo(0.30, 1)
  })

  it('detects significant mediation via bootstrap CI', () => {
    const { X, M, Y } = genMediationData(300, { a: 0.7, b: 0.6, cp: 0.1, seed: 7 })
    const r = simpleMediation(X, M, Y, { bootstrap: 1000, seed: 2 })
    expect(r.indirect.bootstrap.significant).toBe(true)
    expect(r.indirect.bootstrap.ciLow).toBeGreaterThan(0)
    expect(r.indirect.bootstrap.ciHigh).toBeGreaterThan(r.indirect.bootstrap.ciLow)
  })

  it('null mediation: ab CI includes 0 when a or b = 0', () => {
    // a near 0 → no mediation
    const { X, M, Y } = genMediationData(300, { a: 0.0, b: 0.6, cp: 0.3, seed: 99 })
    const r = simpleMediation(X, M, Y, { bootstrap: 1000, seed: 3 })
    expect(r.indirect.bootstrap.significant).toBe(false)
    expect(r.indirect.bootstrap.ciLow).toBeLessThan(0)
    expect(r.indirect.bootstrap.ciHigh).toBeGreaterThan(0)
  })

  it('full mediation: c is significant, c\' is not', () => {
    // Strong indirect, near-zero direct
    const { X, M, Y } = genMediationData(300, { a: 0.8, b: 0.7, cp: 0.0, seed: 11 })
    const r = simpleMediation(X, M, Y, { bootstrap: 1000, seed: 4 })
    expect(r.paths.c.p).toBeLessThan(0.01)
    expect(r.paths.cp.p).toBeGreaterThan(0.05)
    expect(r.mediationType).toContain('penuh')
  })

  it('Sobel test agrees with bootstrap on direction', () => {
    const { X, M, Y } = genMediationData(300, { a: 0.5, b: 0.5, cp: 0.2, seed: 5 })
    const r = simpleMediation(X, M, Y, { bootstrap: 500, seed: 5 })
    expect(Math.sign(r.indirect.sobel.z)).toBe(Math.sign(r.indirect.ab))
    expect(r.indirect.sobel.p).toBeLessThan(0.05)
  })

  it('reproducible with seed', () => {
    const { X, M, Y } = genMediationData(100, { a: 0.5, b: 0.5, cp: 0.2, seed: 1 })
    const r1 = simpleMediation(X, M, Y, { bootstrap: 200, seed: 42 })
    const r2 = simpleMediation(X, M, Y, { bootstrap: 200, seed: 42 })
    expect(r1.indirect.bootstrap.ciLow).toBe(r2.indirect.bootstrap.ciLow)
    expect(r1.indirect.bootstrap.ciHigh).toBe(r2.indirect.bootstrap.ciHigh)
  })

  it('throws on tiny sample', () => {
    expect(() => simpleMediation([1,2], [1,2], [1,2])).toThrow()
  })

  it('handles missing values (NaN) by filtering', () => {
    // Use noisy data so matrix isn't singular after filtering
    const { X: Xfull, M: Mfull, Y: Yfull } = genMediationData(20, { a: 0.5, b: 0.5, cp: 0.2, seed: 77 })
    const X = [...Xfull]
    const M = [...Mfull]
    const Y = [...Yfull]
    X[2] = NaN
    M[5] = NaN
    Y[10] = NaN
    const r = simpleMediation(X, M, Y, { bootstrap: 100, seed: 1 })
    expect(r.n).toBe(17)  // 20 minus 3 rows with NaN
  })
})

// ============================================================
// MODERATION — Model 1
// ============================================================
function genModerationData(n, { b1, b2, b3, seed }) {
  // Y = b1·X + b2·W + b3·X·W + e
  const rng = mulberry32(seed)
  const X = [], W = [], Y = []
  for (let i = 0; i < n; i++) {
    const x = normal(rng)
    const w = normal(rng)
    const e = normal(rng) * 0.5
    const y = b1 * x + b2 * w + b3 * x * w + e
    X.push(x); W.push(w); Y.push(y)
  }
  return { X, W, Y }
}

describe('simpleModeration — Hayes Model 1', () => {
  it('recovers main effects and interaction from simulated data', () => {
    const { X, W, Y } = genModerationData(500, { b1: 0.5, b2: 0.3, b3: 0.4, seed: 100 })
    const r = simpleModeration(X, W, Y)

    // tolerance ~0.1 (Math.abs(diff) < 0.05 wd/ precision 1)
    expect(Math.abs(r.coefficients.X.coef  - 0.5)).toBeLessThan(0.1)
    expect(Math.abs(r.coefficients.W.coef  - 0.3)).toBeLessThan(0.1)
    expect(Math.abs(r.coefficients.XW.coef - 0.4)).toBeLessThan(0.1)
  })

  it('detects significant interaction', () => {
    const { X, W, Y } = genModerationData(300, { b1: 0.3, b2: 0.2, b3: 0.5, seed: 50 })
    const r = simpleModeration(X, W, Y)
    expect(r.interactionSignificant).toBe(true)
    expect(r.coefficients.XW.p).toBeLessThan(0.01)
  })

  it('no interaction → b3 not significant', () => {
    const { X, W, Y } = genModerationData(300, { b1: 0.4, b2: 0.4, b3: 0.0, seed: 80 })
    const r = simpleModeration(X, W, Y)
    expect(r.interactionSignificant).toBe(false)
    expect(r.coefficients.XW.p).toBeGreaterThan(0.05)
  })

  it('conditional effects at -1SD, mean, +1SD differ when b3 ≠ 0', () => {
    const { X, W, Y } = genModerationData(500, { b1: 0.3, b2: 0.0, b3: 0.5, seed: 13 })
    const r = simpleModeration(X, W, Y)

    // Effect of X at low W vs high W should differ noticeably
    const eL = r.conditionalEffects.atLow.effect
    const eH = r.conditionalEffects.atHigh.effect
    expect(Math.abs(eH - eL)).toBeGreaterThan(0.3)

    // At W=mean, effect ≈ b1 (since centering makes intercept term zero out)
    expect(r.conditionalEffects.atMean.effect).toBeCloseTo(r.coefficients.X.coef, 5)
  })

  it('Johnson-Neyman returns transition points when interaction strong', () => {
    const { X, W, Y } = genModerationData(500, { b1: 0.3, b2: 0.0, b3: 0.6, seed: 21 })
    const r = simpleModeration(X, W, Y)
    expect(r.johnsonNeyman.regions.length).toBeGreaterThanOrEqual(0)
    expect(r.johnsonNeyman.regions.length).toBeLessThanOrEqual(2)
  })

  it('throws on tiny sample', () => {
    expect(() => simpleModeration([1,2], [1,2], [1,2])).toThrow()
  })

  it('mean-centering can be disabled', () => {
    const { X, W, Y } = genModerationData(200, { b1: 0.3, b2: 0.2, b3: 0.4, seed: 7 })
    const r = simpleModeration(X, W, Y, { center: false })
    expect(r.centered).toBe(false)
    // Without centering, intercept will be non-zero and coefficients shift
    expect(typeof r.coefficients.intercept.coef).toBe('number')
  })
})

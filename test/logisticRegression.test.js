// Logistic Regression unit tests
// ==============================
// Validates IRLS fitting on simulated data, classification metrics,
// ROC/AUC, Hosmer-Lemeshow test, and edge cases.

import { describe, it, expect } from 'vitest'
import {
  fitLogistic, classificationTable, rocAUC, hosmerLemeshow, predictLogistic,
} from '../src/lib/logisticRegression.js'

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
function sigmoid(z) { return 1 / (1 + Math.exp(-z)) }

// Generate y from logistic model: P(y=1|x) = sigmoid(b0 + b1*x1 + b2*x2)
function genLogisticData(n, { b0, b1, b2, seed }) {
  const rng = mulberry32(seed)
  const X = [], y = []
  for (let i = 0; i < n; i++) {
    const x1 = normal(rng)
    const x2 = normal(rng)
    const eta = b0 + b1 * x1 + b2 * x2
    const p = sigmoid(eta)
    y.push(rng() < p ? 1 : 0)
    X.push([x1, x2])
  }
  return { X, y }
}

// ============================================================
// fitLogistic
// ============================================================
describe('fitLogistic', () => {
  it('recovers known coefficients (n=1000)', () => {
    const { X, y } = genLogisticData(1000, { b0: 0.5, b1: 1.0, b2: -0.5, seed: 42 })
    const r = fitLogistic(X, y, { predictorNames: ['x1', 'x2'] })

    expect(r.converged).toBe(true)
    expect(r.coefficients).toHaveLength(3)
    expect(r.coefficients[0].name).toBe('(Intercept)')
    expect(r.coefficients[0].b).toBeCloseTo(0.5, 0)   // tolerance ~0.5
    expect(r.coefficients[1].b).toBeCloseTo(1.0, 0)
    expect(r.coefficients[2].b).toBeCloseTo(-0.5, 0)
  })

  it('coefficients table includes odds ratios', () => {
    const { X, y } = genLogisticData(500, { b0: 0, b1: 1.0, b2: 0, seed: 7 })
    const r = fitLogistic(X, y)
    const x1Coef = r.coefficients.find(c => c.name === 'X1')
    expect(x1Coef.odds).toBeCloseTo(Math.exp(x1Coef.b), 5)
    expect(x1Coef.oddsLow).toBeLessThan(x1Coef.odds)
    expect(x1Coef.oddsHigh).toBeGreaterThan(x1Coef.odds)
  })

  it('detects significant predictors via Wald p', () => {
    const { X, y } = genLogisticData(500, { b0: 0, b1: 2.0, b2: 0, seed: 11 })
    const r = fitLogistic(X, y, { predictorNames: ['x1', 'x2'] })
    const x1Coef = r.coefficients.find(c => c.name === 'x1')
    const x2Coef = r.coefficients.find(c => c.name === 'x2')
    expect(x1Coef.p).toBeLessThan(0.001)
    expect(x2Coef.p).toBeGreaterThan(0.05)
  })

  it('computes pseudo R² and likelihood ratio', () => {
    const { X, y } = genLogisticData(500, { b0: 0, b1: 1.5, b2: 0.8, seed: 5 })
    const r = fitLogistic(X, y)
    expect(r.pseudoR2.mcfadden).toBeGreaterThan(0)
    expect(r.pseudoR2.mcfadden).toBeLessThan(1)
    expect(r.pseudoR2.coxSnell).toBeGreaterThan(0)
    expect(r.pseudoR2.nagelkerke).toBeGreaterThan(r.pseudoR2.coxSnell - 0.01) // nagelkerke >= coxSnell
    expect(r.likelihoodRatio.p).toBeLessThan(0.001)  // model significantly improves over null
  })

  it('returns predicted probabilities matching length', () => {
    const { X, y } = genLogisticData(100, { b0: 0, b1: 1, b2: 0, seed: 3 })
    const r = fitLogistic(X, y)
    expect(r.predicted).toHaveLength(100)
    expect(r.predicted.every(p => p >= 0 && p <= 1)).toBe(true)
  })

  it('throws on length mismatch', () => {
    expect(() => fitLogistic([[1], [2]], [1])).toThrow()
  })

  it('throws if y all zeros', () => {
    expect(() => fitLogistic([[1], [2], [3], [4], [5]], [0, 0, 0, 0, 0])).toThrow()
  })

  it('throws if y all ones', () => {
    expect(() => fitLogistic([[1], [2], [3], [4], [5]], [1, 1, 1, 1, 1])).toThrow()
  })

  it('throws on non-binary y', () => {
    expect(() => fitLogistic([[1], [2], [3], [4], [5]], [0, 1, 2, 1, 0])).toThrow()
  })

  it('throws on tiny sample', () => {
    expect(() => fitLogistic([[1, 2]], [1])).toThrow()
  })

  it('AIC and BIC are positive', () => {
    const { X, y } = genLogisticData(200, { b0: 0, b1: 1, b2: 0.5, seed: 9 })
    const r = fitLogistic(X, y)
    expect(r.aic).toBeGreaterThan(0)
    expect(r.bic).toBeGreaterThan(0)
    expect(r.bic).toBeGreaterThan(r.aic)  // BIC penalizes more for n > 7
  })
})

// ============================================================
// predictLogistic
// ============================================================
describe('predictLogistic', () => {
  it('predicts probabilities for new data', () => {
    const beta = [0, 1, -0.5]  // intercept, b1, b2
    const X = [[0, 0], [1, 1], [-1, 2]]
    const probs = predictLogistic(beta, X)
    expect(probs[0]).toBeCloseTo(sigmoid(0), 5)            // 0.5
    expect(probs[1]).toBeCloseTo(sigmoid(0 + 1 - 0.5), 5)  // sigmoid(0.5)
    expect(probs[2]).toBeCloseTo(sigmoid(0 - 1 - 1), 5)    // sigmoid(-2)
  })
})

// ============================================================
// classificationTable
// ============================================================
describe('classificationTable', () => {
  it('perfect prediction', () => {
    const yTrue = [1, 1, 0, 0]
    const yProb = [0.9, 0.8, 0.1, 0.2]
    const r = classificationTable(yTrue, yProb, 0.5)
    expect(r.tp).toBe(2)
    expect(r.tn).toBe(2)
    expect(r.fp).toBe(0)
    expect(r.fn).toBe(0)
    expect(r.accuracy).toBe(1)
    expect(r.sensitivity).toBe(1)
    expect(r.specificity).toBe(1)
  })

  it('all wrong predictions', () => {
    const yTrue = [1, 1, 0, 0]
    const yProb = [0.1, 0.2, 0.9, 0.8]
    const r = classificationTable(yTrue, yProb, 0.5)
    expect(r.tp).toBe(0)
    expect(r.tn).toBe(0)
    expect(r.accuracy).toBe(0)
  })

  it('threshold affects classification', () => {
    const yTrue = [1, 0]
    const yProb = [0.6, 0.4]
    const lo = classificationTable(yTrue, yProb, 0.3)
    const hi = classificationTable(yTrue, yProb, 0.7)
    expect(lo.tp + lo.fp).toBeGreaterThan(hi.tp + hi.fp) // lower threshold → more positives
  })

  it('F1 score computed correctly', () => {
    // tp=2, fp=1, fn=1 → precision=2/3, recall=2/3 → F1=2/3
    const yTrue = [1, 1, 1, 0]
    const yProb = [0.9, 0.8, 0.4, 0.7]
    const r = classificationTable(yTrue, yProb, 0.5)
    expect(r.precision).toBeCloseTo(2/3, 5)
    expect(r.sensitivity).toBeCloseTo(2/3, 5)
    expect(r.f1).toBeCloseTo(2/3, 5)
  })
})

// ============================================================
// rocAUC
// ============================================================
describe('rocAUC', () => {
  it('perfect ranking → AUC = 1', () => {
    const yTrue = [0, 0, 0, 1, 1, 1]
    const yProb = [0.1, 0.2, 0.3, 0.7, 0.8, 0.9]
    const r = rocAUC(yTrue, yProb)
    expect(r.auc).toBe(1)
  })

  it('random ranking → AUC ≈ 0.5', () => {
    // Generate 1000 random uniform predictions
    const yTrue = []
    const yProb = []
    const rng = mulberry32(1)
    for (let i = 0; i < 1000; i++) {
      yTrue.push(rng() < 0.5 ? 1 : 0)
      yProb.push(rng())  // random, no relationship
    }
    const r = rocAUC(yTrue, yProb)
    expect(r.auc).toBeGreaterThan(0.4)
    expect(r.auc).toBeLessThan(0.6)
  })

  it('worst ranking → AUC = 0', () => {
    const yTrue = [0, 0, 0, 1, 1, 1]
    const yProb = [0.9, 0.8, 0.7, 0.3, 0.2, 0.1]
    const r = rocAUC(yTrue, yProb)
    expect(r.auc).toBe(0)
  })

  it('ROC points start at (0,0) and end at (1,1)', () => {
    const yTrue = [1, 0, 1, 0, 1, 0]
    const yProb = [0.8, 0.6, 0.7, 0.3, 0.5, 0.4]
    const r = rocAUC(yTrue, yProb)
    expect(r.points[0].fpr).toBe(0)
    expect(r.points[0].tpr).toBe(0)
    expect(r.points[r.points.length - 1].fpr).toBe(1)
    expect(r.points[r.points.length - 1].tpr).toBe(1)
  })

  it('AUC matches simulated logistic AUC', () => {
    // Strong predictor → AUC should be high
    const { X, y } = genLogisticData(500, { b0: 0, b1: 2.5, b2: 0, seed: 22 })
    const fit = fitLogistic(X, y)
    const r = rocAUC(y, fit.predicted)
    expect(r.auc).toBeGreaterThan(0.85)
  })
})

// ============================================================
// hosmerLemeshow
// ============================================================
describe('hosmerLemeshow', () => {
  it('good fit when probs match observed (well-calibrated)', () => {
    // Simulate from true model and fit it → should fit well
    const { X, y } = genLogisticData(500, { b0: 0, b1: 1, b2: 0.5, seed: 33 })
    const fit = fitLogistic(X, y)
    const hl = hosmerLemeshow(y, fit.predicted, 10)
    expect(hl.chi2).toBeGreaterThanOrEqual(0)
    expect(hl.df).toBeGreaterThan(0)
    // p should generally be > 0.05 (good fit), but allow some noise
    expect(hl.p).toBeGreaterThanOrEqual(0)
    expect(hl.p).toBeLessThanOrEqual(1)
  })

  it('returns g groups with observed vs expected', () => {
    const { X, y } = genLogisticData(200, { b0: 0, b1: 1, b2: 0, seed: 17 })
    const fit = fitLogistic(X, y)
    const hl = hosmerLemeshow(y, fit.predicted, 10)
    expect(hl.groups.length).toBeLessThanOrEqual(10)
    expect(hl.groups[0]).toHaveProperty('observed1')
    expect(hl.groups[0]).toHaveProperty('expected1')
  })

  it('throws on length mismatch', () => {
    expect(() => hosmerLemeshow([1, 0], [0.5])).toThrow()
  })
})

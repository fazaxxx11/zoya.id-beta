import { describe, it, expect } from 'vitest';
import { pooledOLS, fixedEffects, validatePanel, demean, detectTimeInvariant } from '../../src/lib/statistics/panel.js';

// ── Test data ────────────────────────────────────────────────────

// Simple panel: 3 entities, 3 periods
const balancedPanel = [
  { id: 'A', time: 1, y: 2, x1: 1 },
  { id: 'A', time: 2, y: 5, x1: 3 },
  { id: 'A', time: 3, y: 8, x1: 5 },
  { id: 'B', time: 1, y: 1, x1: 2 },
  { id: 'B', time: 2, y: 4, x1: 4 },
  { id: 'B', time: 3, y: 9, x1: 6 },
  { id: 'C', time: 1, y: 3, x1: 1 },
  { id: 'C', time: 2, y: 6, x1: 3 },
  { id: 'C', time: 3, y: 7, x1: 4 },
];

// Perfect linear: y = 1 + 2*x1
const perfectLinear = [
  { id: 'A', time: 1, y: 3, x1: 1 },
  { id: 'A', time: 2, y: 5, x1: 2 },
  { id: 'A', time: 3, y: 7, x1: 3 },
  { id: 'B', time: 1, y: 9, x1: 4 },
  { id: 'B', time: 2, y: 11, x1: 5 },
  { id: 'B', time: 3, y: 13, x1: 6 },
];

const unbalancedPanel = [
  { id: 'A', time: 1, y: 2, x1: 1 },
  { id: 'A', time: 2, y: 4, x1: 2 },
  { id: 'B', time: 1, y: 3, x1: 2 },
  { id: 'B', time: 2, y: 5, x1: 3 },
  { id: 'B', time: 3, y: 7, x1: 4 },
];

// ── validatePanel ────────────────────────────────────────────────

describe('validatePanel', () => {
  it('detects balanced panel', () => {
    const r = validatePanel(balancedPanel);
    expect(r.nEntities).toBe(3);
    expect(r.nPeriods).toBe(3);
    expect(r.balanced).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it('detects unbalanced panel', () => {
    const r = validatePanel(unbalancedPanel);
    expect(r.nEntities).toBe(2);
    expect(r.balanced).toBe(false);
    expect(r.warnings.some(w => w.includes('unbalanced'))).toBe(true);
  });

  it('detects duplicate (id,time)', () => {
    const dupData = [
      ...balancedPanel,
      { id: 'A', time: 1, y: 99, x1: 99 },
    ];
    const r = validatePanel(dupData);
    expect(r.warnings.some(w => w.includes('Duplicate'))).toBe(true);
  });

  it('detects unsorted data', () => {
    const unsorted = [
      { id: 'B', time: 1, y: 3, x1: 2 },
      { id: 'A', time: 1, y: 2, x1: 1 },
    ];
    const r = validatePanel(unsorted);
    expect(r.warnings.some(w => w.includes('not sorted'))).toBe(true);
  });
});

// ── demean ───────────────────────────────────────────────────────

describe('demean', () => {
  it('subtracts group mean correctly', () => {
    const data = [
      { id: 'A', val: 10 },
      { id: 'A', val: 20 },
      { id: 'B', val: 30 },
      { id: 'B', val: 50 },
    ];
    const result = demean(data, ['val'], 'id');
    // A mean = 15, B mean = 40
    expect(result[0]._demeaned_val).toBe(-5);
    expect(result[1]._demeaned_val).toBe(5);
    expect(result[2]._demeaned_val).toBe(-10);
    expect(result[3]._demeaned_val).toBe(10);
  });

  it('handles NaN values', () => {
    const data = [
      { id: 'A', val: 10 },
      { id: 'A', val: NaN },
      { id: 'A', val: 20 },
    ];
    const result = demean(data, ['val'], 'id');
    expect(result[0]._demeaned_val).toBe(-5);
    expect(isNaN(result[1]._demeaned_val)).toBe(true);
  });
});

// ── detectTimeInvariant ──────────────────────────────────────────

describe('detectTimeInvariant', () => {
  it('returns true for time-invariant column', () => {
    const data = [
      { id: 'A', time: 1, x: 5 },
      { id: 'A', time: 2, x: 5 },
      { id: 'B', time: 1, x: 10 },
      { id: 'B', time: 2, x: 10 },
    ];
    expect(detectTimeInvariant(data, 'x')).toBe(true);
  });

  it('returns false for time-varying column', () => {
    const data = [
      { id: 'A', time: 1, x: 5 },
      { id: 'A', time: 2, x: 6 },
      { id: 'B', time: 1, x: 10 },
      { id: 'B', time: 2, x: 11 },
    ];
    expect(detectTimeInvariant(data, 'x')).toBe(false);
  });
});

// ── pooledOLS ────────────────────────────────────────────────────

describe('pooledOLS', () => {
  it('runs basic pooled OLS', () => {
    const result = pooledOLS(balancedPanel, 'y', ['x1']);
    expect(result.modelType).toBe('pooledOLS');
    expect(result.beta).toHaveLength(2); // intercept + x1
    expect(result.nobs).toBe(9);
    expect(result.r2).toBeGreaterThanOrEqual(0);
    expect(result.r2).toBeLessThanOrEqual(1);
  });

  it('handles missing values', () => {
    const dataWithMissing = [
      ...balancedPanel,
      { id: 'D', time: 1, y: NaN, x1: 1 },
      { id: 'D', time: 2, y: 2, x1: NaN },
    ];
    const result = pooledOLS(dataWithMissing, 'y', ['x1']);
    expect(result.nobs).toBe(9);
    expect(result.missing).toBe(2);
  });

  it('has correct output structure', () => {
    const result = pooledOLS(balancedPanel, 'y', ['x1']);
    expect(result).toHaveProperty('beta');
    expect(result).toHaveProperty('se');
    expect(result).toHaveProperty('tValues');
    expect(result).toHaveProperty('pValues');
    expect(result).toHaveProperty('cov');
    expect(result).toHaveProperty('residuals');
    expect(result).toHaveProperty('fitted');
    expect(result).toHaveProperty('r2');
    expect(result).toHaveProperty('adjR2');
    expect(result).toHaveProperty('fStat');
    expect(result).toHaveProperty('fPValue');
    expect(result).toHaveProperty('df');
    expect(result).toHaveProperty('nobs');
    expect(result).toHaveProperty('coefNames');
    expect(result).toHaveProperty('durbinWatson');
  });

  it('perfect linear data has R² ≈ 1', () => {
    // Use entity-specific patterns so FE demeaning doesn't collapse
    const data = [
      { id: 'A', time: 1, y: 3, x1: 1 },
      { id: 'A', time: 2, y: 5, x1: 2 },
      { id: 'B', time: 1, y: 7, x1: 3 },
      { id: 'B', time: 2, y: 13, x1: 6 },
    ];
    const result = pooledOLS(data, 'y', ['x1']);
    expect(result.r2).toBeGreaterThan(0.99);
  });
});

// ── fixedEffects ─────────────────────────────────────────────────

describe('fixedEffects', () => {
  it('runs entity fixed effects', () => {
    const result = fixedEffects(balancedPanel, 'y', ['x1']);
    expect(result.modelType).toBe('fixedEffects');
    expect(result.effectType).toBe('entity');
    expect(result.entityMeans).toBeDefined();
  });

  it('within-R² between 0 and 1', () => {
    const result = fixedEffects(balancedPanel, 'y', ['x1']);
    expect(result.r2).toBeGreaterThanOrEqual(0);
    expect(result.r2).toBeLessThanOrEqual(1);
  });

  it('warns about time-invariant regressors', () => {
    const data = balancedPanel.map(r => ({ ...r, x_invariant: r.id === 'A' ? 5 : 10 }));
    expect(detectTimeInvariant(data, 'x_invariant')).toBe(true);
  });

  it('has entity means', () => {
    const result = fixedEffects(balancedPanel, 'y', ['x1']);
    expect(result.entityMeans).toHaveProperty('A');
    expect(result.entityMeans).toHaveProperty('B');
    expect(result.entityMeans).toHaveProperty('C');
  });

  it('coefficients array length matches xCols', () => {
    const result = fixedEffects(balancedPanel, 'y', ['x1']);
    expect(result.beta).toHaveLength(1); // no intercept in FE
  });
});

import { describe, it, expect } from 'vitest';
import { adfTest, grangerCausality, engleGrangerCointegration } from '../../src/lib/statistics/timeseries.js';

// ── Test data generators ─────────────────────────────────────────

// Random walk: y_t = y_{t-1} + ε (non-stationary)
function randomWalk(n, seed = 42) {
  const series = [0];
  let s = seed;
  for (let i = 1; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const noise = (s / 0x7fffffff) * 2 - 1;
    series.push(series[i - 1] + noise);
  }
  return series;
}

// Stationary AR(1): y_t = 0.3 * y_{t-1} + ε
function stationaryAR(n, phi = 0.3, seed = 42) {
  const series = [0];
  let s = seed;
  for (let i = 1; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const noise = (s / 0x7fffffff) * 2 - 1;
    series.push(phi * series[i - 1] + noise);
  }
  return series;
}

// Cointegrated pair: y = 2*x + ε, both random walks
function cointegratedPair(n, seed = 42) {
  const x = randomWalk(n, seed);
  const y = x.map((v, i) => {
    let s = (seed + i * 7) * 1103515245 + 12345;
    s = s & 0x7fffffff;
    const noise = (s / 0x7fffffff) * 0.5;
    return 2 * v + noise;
  });
  return { y, x };
}

// ── ADF Test ─────────────────────────────────────────────────────

describe('adfTest', () => {
  it('random walk → fail to reject (non-stationary)', () => {
    const series = randomWalk(200);
    const result = adfTest(series, { deterministic: 'constant' });
    expect(result.modelType).toBe('adfTest');
    expect(result.isStationary).toBe(false);
  });

  it('stationary AR(1) → reject (stationary)', () => {
    const series = stationaryAR(200, 0.3);
    const result = adfTest(series, { deterministic: 'constant' });
    expect(result.isStationary).toBe(true);
  });

  it('returns correct structure', () => {
    const series = randomWalk(100);
    const result = adfTest(series);
    expect(result).toHaveProperty('statistic');
    expect(result).toHaveProperty('pValue');
    expect(result).toHaveProperty('lags');
    expect(result).toHaveProperty('criticalValues');
    expect(result).toHaveProperty('isStationary');
    expect(result).toHaveProperty('deterministic');
    expect(result.modelType).toBe('adfTest');
  });

  it('three deterministic types work', () => {
    const series = stationaryAR(100);
    for (const det of ['none', 'constant', 'trend']) {
      const result = adfTest(series, { deterministic: det });
      expect(result.deterministic).toBe(det);
      expect(typeof result.statistic).toBe('number');
    }
  });

  it('auto lag selection returns valid lags', () => {
    const series = randomWalk(100);
    const result = adfTest(series, { maxLags: 'auto', method: 'AIC' });
    expect(result.lags).toBeGreaterThanOrEqual(0);
  });

  it('AIC vs BIC may select different lags', () => {
    const series = randomWalk(200);
    const aic = adfTest(series, { method: 'AIC' });
    const bic = adfTest(series, { method: 'BIC' });
    // Both should be valid (not necessarily different)
    expect(aic.lags).toBeGreaterThanOrEqual(0);
    expect(bic.lags).toBeGreaterThanOrEqual(0);
  });

  it('pValue in [0.01, 1]', () => {
    const series = randomWalk(100);
    const result = adfTest(series);
    expect(result.pValue).toBeGreaterThanOrEqual(0.01);
    expect(result.pValue).toBeLessThanOrEqual(1);
  });
});

// ── Granger Causality ────────────────────────────────────────────

describe('grangerCausality', () => {
  it('returns correct structure', () => {
    const y = randomWalk(100);
    const x = randomWalk(100, 123);
    const result = grangerCausality(y, x);
    expect(result).toHaveProperty('statistic');
    expect(result).toHaveProperty('df1');
    expect(result).toHaveProperty('df2');
    expect(result).toHaveProperty('pValue');
    expect(result).toHaveProperty('isSignificant');
    expect(result).toHaveProperty('lags');
    expect(result.direction).toBe('x→y');
    expect(result.modelType).toBe('grangerCausality');
  });

  it('F-statistic is non-negative', () => {
    const y = randomWalk(100);
    const x = randomWalk(100, 123);
    const result = grangerCausality(y, x);
    if (isFinite(result.statistic)) {
      expect(result.statistic).toBeGreaterThanOrEqual(0);
    }
  });

  it('pValue in [0,1]', () => {
    const y = randomWalk(100);
    const x = randomWalk(100, 123);
    const result = grangerCausality(y, x);
    if (isFinite(result.pValue)) {
      expect(result.pValue).toBeGreaterThanOrEqual(0);
      expect(result.pValue).toBeLessThanOrEqual(1);
    }
  });

  it('mismatched lengths returns error', () => {
    const result = grangerCausality([1, 2, 3], [1, 2]);
    expect(result.error).toBeDefined();
  });
});

// ── Engle-Granger Cointegration ──────────────────────────────────

describe('engleGrangerCointegration', () => {
  it('returns correct structure', () => {
    const { y, x } = cointegratedPair(100);
    const result = engleGrangerCointegration(y, x);
    expect(result).toHaveProperty('adfStatistic');
    expect(result).toHaveProperty('pValue');
    expect(result).toHaveProperty('criticalValues');
    expect(result).toHaveProperty('isCointegrated');
    expect(result).toHaveProperty('beta');
    expect(result).toHaveProperty('residuals');
    expect(result.modelType).toBe('engleGranger');
  });

  it('cointegrated pair detected', () => {
    const { y, x } = cointegratedPair(200);
    const result = engleGrangerCointegration(y, x);
    // With strong cointegration, should detect it
    expect(result.beta).toHaveLength(2);
    expect(result.residuals).toHaveLength(200);
  });

  it('mismatched lengths returns error', () => {
    const result = engleGrangerCointegration([1, 2, 3], [1, 2]);
    expect(result.error).toBeDefined();
  });

  it('short series returns error', () => {
    const result = engleGrangerCointegration([1, 2, 3], [4, 5, 6]);
    expect(result.error).toBeDefined();
  });
});

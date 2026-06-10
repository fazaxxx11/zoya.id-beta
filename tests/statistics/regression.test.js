import { describe, it, expect } from 'vitest';
import { simpleRegression } from '../../src/lib/statistics/regression.js';
import { readFileSync } from 'fs';
import { join } from 'path';

function loadFixture(name) {
  return readFileSync(join(import.meta.dirname, '../fixtures/statistics', name), 'utf8');
}

describe('simple linear regression', () => {
  const csv = loadFixture('regression-simple.csv');
  const lines = csv.trim().split('\n');
  const data = lines.slice(1).map(line => {
    const [x, y] = line.split(',').map(Number);
    return { x, y };
  });
  const xs = data.map(d => d.x);
  const ys = data.map(d => d.y);

  it('computes correct coefficients', () => {
    const result = simpleRegression(xs, ys);
    expect(result.method).toBe('simple_regression');
    expect(result.b0).toBeCloseTo(5.1071, 3);
    expect(result.b1).toBeCloseTo(1.5976, 3);
    expect(result.n).toBe(8);
  });

  it('computes R² and correlation', () => {
    const result = simpleRegression(xs, ys);
    expect(result.r2).toBeCloseTo(0.9985, 3);
    expect(result.r).toBeCloseTo(0.9993, 3);
  });

  it('computes standard errors', () => {
    const result = simpleRegression(xs, ys);
    expect(result.se_b1).toBeCloseTo(0.0252, 3);
  });

  it('computes t-statistics and p-values', () => {
    const result = simpleRegression(xs, ys);
    expect(result.t_b1).toBeCloseTo(63.45, 0);
    expect(result.p_b1).toBeLessThan(0.001);
  });

  it('reports significance', () => {
    const result = simpleRegression(xs, ys);
    expect(result.significant).toBe(true);
  });

  it('computes Durbin-Watson', () => {
    const result = simpleRegression(xs, ys);
    expect(result.durbinWatson).toBeGreaterThanOrEqual(0);
    expect(result.durbinWatson).toBeLessThanOrEqual(4);
  });

  it('computes RMSE', () => {
    const result = simpleRegression(xs, ys);
    expect(result.rmse).toBeCloseTo(1.6318, 2);
  });

  it('handles missing values', () => {
    const withMissing = [...xs.slice(0, 3), NaN, ...xs.slice(4)];
    const withMissingY = [...ys.slice(0, 3), NaN, ...ys.slice(4)];
    const result = simpleRegression(withMissing, withMissingY);
    expect(result.n).toBe(7);
    expect(result.missing).toBe(1);
  });

  it('returns error for n < 3', () => {
    const result = simpleRegression([1, 2], [3, 4]);
    expect(result.error).toBeDefined();
  });
});

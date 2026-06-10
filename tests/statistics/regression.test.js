import { describe, it, expect } from 'vitest';
import { simpleRegression, multipleLinearRegression } from '../../src/lib/statistics/regression.js';
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

describe('multiple linear regression', () => {
  // Dataset: y = 1 + 2*x1 + 3*x2 + small noise
  const x1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const x2 = [2, 4, 1, 5, 3, 6, 2, 7, 4, 8];
  const y = x1.map((v, i) => 1 + 2 * v + 3 * x2[i]);

  it('computes correct coefficients', () => {
    const result = multipleLinearRegression([x1, x2], y);
    expect(result.error).toBeUndefined();
    expect(result.n).toBe(10);
    expect(result.p).toBe(2);
    expect(result.coefficients).toHaveLength(3); // intercept + 2 predictors
    expect(result.coefficients[0].name).toBe('(Intercept)');
    expect(result.coefficients[1].name).toBe('X1');
    expect(result.coefficients[2].name).toBe('X2');
    // Coefficients should be close to 1, 2, 3
    expect(result.coefficients[0].b).toBeCloseTo(1, 0);
    expect(result.coefficients[1].b).toBeCloseTo(2, 0);
    expect(result.coefficients[2].b).toBeCloseTo(3, 0);
  });

  it('computes R² close to 1 for noiseless data', () => {
    const result = multipleLinearRegression([x1, x2], y);
    expect(result.rSquared).toBeCloseTo(1, 2);
  });

  it('computes F-test and p-value', () => {
    const result = multipleLinearRegression([x1, x2], y);
    expect(result.F).toBeGreaterThan(0);
    expect(result.pF).toBeLessThan(0.05);
    expect(result.significant).toBe(true);
  });

  it('computes VIF for multicollinearity', () => {
    const result = multipleLinearRegression([x1, x2], y);
    expect(result.vifs).toHaveLength(2);
    expect(result.vifs[0].predictor).toBe('X1');
    expect(result.vifs[1].predictor).toBe('X2');
    // x1 and x2 are not highly correlated, VIF should be moderate
    expect(result.vifs[0].vif).toBeGreaterThanOrEqual(1);
  });

  it('handles missing values via listwise deletion', () => {
    const x1m = [...x1]; x1m[3] = NaN;
    const ym = [...y]; ym[3] = NaN;
    const result = multipleLinearRegression([x1m, x2], ym);
    expect(result.n).toBe(9);
    expect(result.missing).toBe(1);
  });

  it('returns error for insufficient n', () => {
    const result = multipleLinearRegression([[1, 2], [3, 4]], [5, 6]);
    expect(result.error).toContain('Sampel terlalu kecil');
  });

  it('returns error for singular matrix', () => {
    // Duplicate predictor — perfectly collinear
    const dup = [...x1];
    const result = multipleLinearRegression([x1, dup], y);
    expect(result.error).toBeDefined();
  });

  it('computes Durbin-Watson', () => {
    const result = multipleLinearRegression([x1, x2], y);
    expect(result.durbinWatson).toBeGreaterThanOrEqual(0);
    expect(result.durbinWatson).toBeLessThanOrEqual(4);
  });

  it('uses custom predictor names', () => {
    const result = multipleLinearRegression([x1, x2], y, ['Hours', 'Experience']);
    expect(result.coefficients[1].name).toBe('Hours');
    expect(result.coefficients[2].name).toBe('Experience');
  });
});

import { describe, it, expect } from 'vitest';
import { simpleRegression, multipleLinearRegression, stepwiseRegression } from '../../src/lib/statistics/regression.js';
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

// ── Stepwise Regression ────────────────────────────────────────────

describe('stepwise regression', () => {
  // Simulate: Y = 10 + 3*X1 + 0*X2 + 5*X3 + 0*X4 + 0*X5 + error
  // X1 and X3 are true predictors; X2, X4, X5 are noise
  const n = 30;
  const noiseX = () => {
    const arr = [];
    for (let i = 0; i < n; i++) arr.push(Math.random() * 10 + 5);
    return arr;
  };

  // Use seeded-like deterministic data for reproducibility
  const seed = (s) => {
    let state = s;
    return () => ((state = (state * 16807) % 2147483647) / 2147483647);
  };
  const rand = seed(42);
  const gen = (scale = 1) => {
    const arr = [];
    for (let i = 0; i < n; i++) arr.push(rand() * 10 * scale + 5);
    return arr;
  };

  const X1 = gen();
  const X2 = gen(0.5);  // noise (small coefficient)
  const X3 = gen(1.2);
  const X4 = gen(0.3);  // noise
  const X5 = gen(0.7);  // noise

  // Y = 2 + 3*X1 + 5*X3 + N(0, 2)
  const rand2 = seed(99);
  const y = [];
  for (let i = 0; i < n; i++) {
    const noise = (rand2() - 0.5) * 4; // ~N(0,2) approx
    y.push(2 + 3 * X1[i] + 5 * X3[i] + noise);
  }

  const X = [X1, X2, X3, X4, X5];

  it('forward selection finds true predictors', () => {
    const result = stepwiseRegression(X, y, {
      method: 'forward',
      criterion: 'aic',
      columnNames: ['Motivasi', 'Gender', 'Nilai', 'Usia', 'Absensi'],
    });
    expect(result.method).toBe('forward');
    expect(result.criterion).toBe('aic');
    expect(result.selectedVariables.length).toBeGreaterThanOrEqual(1);
    expect(result.selectedVariables.length).toBeLessThanOrEqual(4);
    // At least one of X1 or X3 should be selected
    expect(result.selectedVariables).toContain(0); // X1
    expect(result.selectedVariables).toContain(2); // X3
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.rSquared).toBeGreaterThan(0.5);
    expect(result.aic).toBeLessThan(Infinity);
    expect(result.bic).toBeLessThan(Infinity);
    expect(result.selectedNames).toEqual(
      result.selectedVariables.map(i => ['Motivasi', 'Gender', 'Nilai', 'Usia', 'Absensi'][i])
    );
    expect(result.equation).toContain('Y =');
    expect(result.summary).toContain('R² =');
  });

  it('backward elimination finds true predictors', () => {
    const result = stepwiseRegression(X, y, {
      method: 'backward',
      criterion: 'bic',
      alpha_remove: 0.15,
      columnNames: ['Motivasi', 'Gender', 'Nilai', 'Usia', 'Absensi'],
    });
    expect(result.method).toBe('backward');
    expect(result.criterion).toBe('bic');
    expect(result.selectedVariables.length).toBeGreaterThanOrEqual(1);
    // Should keep at least the strong predictors
    expect(result.selectedVariables).toContain(0); // X1
    expect(result.selectedVariables).toContain(2); // X3
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.rSquared).toBeGreaterThan(0.5);
  });

  it('forward with BIC selects fewer or equal variables than AIC', () => {
    const resultAIC = stepwiseRegression(X, y, { method: 'forward', criterion: 'aic' });
    const resultBIC = stepwiseRegression(X, y, { method: 'forward', criterion: 'bic' });
    // BIC penalizes more → should not select more variables than AIC
    expect(resultBIC.selectedVariables.length).toBeLessThanOrEqual(
      resultAIC.selectedVariables.length
    );
  });

  it('returns valid coefficients for selected model', () => {
    const result = stepwiseRegression(X, y, { method: 'forward', criterion: 'aic' });
    expect(result.coefficients).toBeTruthy();
    expect(result.coefficients.length).toBe(result.selectedVariables.length + 1);
    // First coeff is always intercept
    expect(result.coefficients[0].name).toBe('(Intercept)');
    expect(typeof result.coefficients[0].b).toBe('number');
    // All coefficients have valid fields
    result.coefficients.forEach(c => {
      expect(typeof c.b).toBe('number');
      expect(typeof c.se).toBe('number');
      expect(typeof c.t).toBe('number');
      expect(typeof c.p).toBe('number');
    });
  });

  it('steps array records selection history', () => {
    const result = stepwiseRegression(X, y, {
      method: 'forward',
      criterion: 'aic',
      columnNames: ['A', 'B', 'C', 'D', 'E'],
    });
    // First step is always 'start'
    expect(result.steps[0].action).toBe('start');
    expect(result.steps[0].selected).toEqual([]);
    // After start, each step either adds or stops
    for (let i = 1; i < result.steps.length; i++) {
      expect(['added', 'stop']).toContain(result.steps[i].action);
    }
    // Last step should be 'stop'
    const lastStep = result.steps[result.steps.length - 1];
    expect(lastStep.action).toBe('stop');
  });

  it('backward elimination steps record removal history', () => {
    const result = stepwiseRegression(X, y, {
      method: 'backward',
      criterion: 'aic',
      alpha_remove: 0.15,
    });
    // First step is 'start' with all predictors
    expect(result.steps[0].action).toBe('start');
    expect(result.steps[0].selected.length).toBe(5);
    // Verify removed steps have pValue
    const removedSteps = result.steps.filter(s => s.action === 'removed');
    removedSteps.forEach(s => {
      expect(s.pValue).toBeGreaterThan(0);
      expect(s.predictor).toBeTruthy();
    });
    // Last step is 'stop'
    expect(result.steps[result.steps.length - 1].action).toBe('stop');
  });

  it('AIC and BIC values are computed correctly', () => {
    const result = stepwiseRegression(X, y, { method: 'forward', criterion: 'aic' });
    expect(result.aic).toBeGreaterThan(0);
    expect(result.aic).toBeLessThan(500);
    expect(result.bic).toBeGreaterThan(0);
    expect(result.bic).toBeGreaterThan(result.aic); // BIC always > AIC for k>0
  });

  it('summary contains model description', () => {
    const result = stepwiseRegression(X, y, { method: 'forward', criterion: 'aic' });
    expect(result.summary).toContain('Model terbaik');
    expect(result.summary).toContain('forward');
    expect(result.summary).toContain('R²');
    expect(result.summary).toContain('AIC');
  });
});

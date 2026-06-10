import { describe, it, expect } from 'vitest';
import { describe as descriptive, percentile } from '../../src/lib/statistics/descriptive.js';
import { readFileSync } from 'fs';
import { join } from 'path';

function loadFixture(name) {
  return readFileSync(join(import.meta.dirname, '../fixtures/statistics', name), 'utf8');
}

describe('descriptive statistics', () => {
  const csv = loadFixture('descriptive-basic.csv');
  const rows = csv.trim().split('\n').slice(1).map(Number);

  it('computes correct n, mean, variance, SD', () => {
    const result = descriptive(rows);
    expect(result.method).toBe('descriptive');
    expect(result.n).toBe(10);
    expect(result.mean).toBeCloseTo(85.5, 6);
    expect(result.variance).toBeCloseTo(40.0556, 2);
    expect(result.stdDev).toBeCloseTo(6.3289, 3);
  });

  it('computes correct median', () => {
    const result = descriptive(rows);
    expect(result.median).toBeCloseTo(86.5, 6);
  });

  it('computes correct min/max/range', () => {
    const result = descriptive(rows);
    expect(result.min).toBe(76);
    expect(result.max).toBe(95);
    expect(result.range).toBe(19);
  });

  it('computes SEM correctly', () => {
    const result = descriptive(rows);
    expect(result.sem).toBeCloseTo(2.0014, 3);
  });

  it('handles missing values', () => {
    const withMissing = [...rows, null, NaN, undefined];
    const result = descriptive(withMissing);
    expect(result.n).toBe(10);
    expect(result.missing).toBe(3);
  });

  it('returns null for empty input', () => {
    expect(descriptive([])).toBeNull();
    expect(descriptive(null)).toBeNull();
  });

  it('percentile works correctly', () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(sorted, 50)).toBeCloseTo(5.5, 6);
    expect(percentile(sorted, 25)).toBeCloseTo(3.25, 6);
    expect(percentile(sorted, 75)).toBeCloseTo(7.75, 6);
  });

  it('skewness is near 0 for symmetric data', () => {
    const symmetric = [40, 41, 42, 43, 44, 46, 47, 48, 49, 50];
    const result = descriptive(symmetric);
    expect(Math.abs(result.skewness)).toBeLessThan(0.5);
  });
});

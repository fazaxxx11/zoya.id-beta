import { describe, it, expect } from 'vitest';
import { cronbachAlpha } from '../../src/lib/statistics/reliability.js';
import { readFileSync } from 'fs';
import { join } from 'path';

function loadFixture(name) {
  return readFileSync(join(import.meta.dirname, '../fixtures/statistics', name), 'utf8');
}

describe('cronbach alpha', () => {
  const csv = loadFixture('cronbach-basic.csv');
  const lines = csv.trim().split('\n');
  const items = lines.slice(1).map(line => line.split(',').map(Number));

  it('computes correct alpha', () => {
    const result = cronbachAlpha(items);
    expect(result.method).toBe('cronbach_alpha');
    expect(result.alpha).toBeCloseTo(0.9468, 3);
    expect(result.k).toBe(4);
    expect(result.n).toBe(10);
  });

  it('reports interpretation', () => {
    const result = cronbachAlpha(items);
    expect(result.interpretation).toBe('Sangat baik');
  });

  it('handles missing values (listwise)', () => {
    const withMissing = [...items.slice(0, 5), [5, null, 5, 4], ...items.slice(6)];
    const result = cronbachAlpha(withMissing);
    expect(result.n).toBeLessThanOrEqual(10);
    expect(result.missing).toBeGreaterThanOrEqual(0);
  });

  it('returns error for insufficient data', () => {
    const result = cronbachAlpha([[1, 2]]);
    expect(result.error).toBeDefined();
  });

  it('item variances are computed', () => {
    const result = cronbachAlpha(items);
    expect(result.itemVariances).toHaveLength(4);
    result.itemVariances.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
    });
  });
});

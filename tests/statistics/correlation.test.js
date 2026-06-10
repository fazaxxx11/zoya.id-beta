import { describe, it, expect } from 'vitest';
import { pearson, spearman } from '../../src/lib/statistics/correlation.js';
import { readFileSync } from 'fs';
import { join } from 'path';

function loadFixture(name) {
  return readFileSync(join(import.meta.dirname, '../fixtures/statistics', name), 'utf8');
}

describe('correlation', () => {
  const csv = loadFixture('correlation-basic.csv');
  const rows = csv.trim().split('\n').slice(1).map(line => {
    const [x, y] = line.split(',').map(Number);
    return { x, y };
  });
  const xs = rows.map(r => r.x);
  const ys = rows.map(r => r.y);

  describe('pearson', () => {
    it('computes correct r and p-value', () => {
      const result = pearson(xs, ys);
      expect(result.method).toBe('pearson');
      expect(result.r).toBeCloseTo(0.9954, 3);
      expect(result.r2).toBeCloseTo(0.9908, 3);
      expect(result.n).toBe(9);
    });

    it('reports significance', () => {
      const result = pearson(xs, ys);
      expect(result.pValue).toBeLessThan(0.001);
    });

    it('reports strength and direction', () => {
      const result = pearson(xs, ys);
      expect(result.strength).toBe('kuat');
      expect(result.direction).toBe('positif');
    });

    it('handles missing values', () => {
      const withMissing = [...xs.slice(0, 3), NaN, ...xs.slice(4)];
      const withMissingY = [...ys.slice(0, 3), NaN, ...ys.slice(4)];
      const result = pearson(withMissing, withMissingY);
      expect(result.n).toBe(8);
      expect(result.missing).toBe(1);
    });

    it('handles perfect negative correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [5, 4, 3, 2, 1];
      const result = pearson(x, y);
      expect(result.r).toBeCloseTo(-1, 6);
      expect(result.direction).toBe('negatif');
    });
  });

  describe('spearman', () => {
    it('computes correct rho', () => {
      const result = spearman(xs, ys);
      expect(result.method).toBe('spearman');
      expect(result.rho).toBeCloseTo(1, 4);
      expect(result.n).toBe(9);
    });

    it('handles ties correctly', () => {
      const x = [1, 2, 2, 3, 4];
      const y = [10, 20, 20, 30, 40];
      const result = spearman(x, y);
      expect(result.rho).toBeCloseTo(1, 4);
    });
  });
});

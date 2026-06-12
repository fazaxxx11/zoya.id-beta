import { describe, it, expect } from 'vitest';
import { pearson, spearman, partialCorrelation, kendallTau } from '../../src/lib/statistics/correlation.js';
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

// ── Partial Correlation ───────────────────────────────────────────

describe('partialCorrelation', () => {
  it('order-0 falls back to Pearson', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    const y = [2, 4, 6, 8, 10, 12, 14, 16, 18]
    const r = partialCorrelation(x, y)
    expect(r.error).toBeUndefined()
    expect(r.order).toBe(0)
    expect(r.rPartial).toBeCloseTo(1, 4)
    expect(r.controlVars).toEqual([])
  })

  it('first-order partial removes control effect', () => {
    // x, y highly correlated because both correlated with z
    const z = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    const x = [2, 4, 6, 8, 10, 12, 14, 16, 18]  // = 2*z
    const y = [3, 6, 9, 12, 15, 18, 21, 24, 27]  // = 3*z
    // x and y are perfectly correlated via z, so partial r ≈ 0
    const r = partialCorrelation(x, y, [z])
    expect(r.order).toBe(1)
    // After controlling z, correlation should be near 0
    expect(Math.abs(r.rPartial)).toBeLessThan(0.001)
  })

  it('preserves genuine correlation when control unrelated', () => {
    const x = [1, 2, 3, 4, 5]
    const y = [2, 4, 6, 8, 10]  // = 2*x
    const z = [7, 1, 3, 9, 5]    // random, unrelated
    const r = partialCorrelation(x, y, [z])
    // Genuine r≈1 stays high after controlling random z
    expect(Math.abs(r.rPartial)).toBeGreaterThan(0.9)
  })

  it('returns correct structure for first-order', () => {
    // Non-collinear data
    const x = [10, 20, 15, 30, 25]
    const y = [12, 18, 14, 35, 30]
    const z = [5, 10, 8, 20, 15]
    const r = partialCorrelation(x, y, [z])
    expect(r.method).toBe('partial')
    expect(r.order).toBe(1)
    expect(r.rPartial).toBeGreaterThan(-1)
    expect(r.rPartial).toBeLessThan(1)
    expect(r.r2).toBeGreaterThanOrEqual(0)
    expect(r.r2).toBeLessThanOrEqual(1)
    expect(r.t).toBeDefined()
    expect(r.df).toBe(5 - 2 - 1) // n - 2 - order
    expect(r.pValue).toBeGreaterThan(0)
    expect(r.pValue).toBeLessThan(1)
    expect(r.n).toBeGreaterThan(0)
    expect(r.zeroOrder).toBeDefined()
    expect(r.r_xy).toBeDefined()
    expect(r.r_xz).toBeDefined()
    expect(r.r_yz).toBeDefined()
  })

  it('higher-order partial with 2 controls', () => {
    // Non-collinear data with 3 variables
    const x = [1, 3, 2, 5, 4, 7, 6, 8, 10, 9]
    const y = [2, 5, 3, 8, 7, 10, 9, 12, 15, 13]
    const z1 = [3, 1, 5, 2, 7, 4, 9, 6, 8, 10]
    const z2 = [5, 6, 2, 9, 1, 8, 4, 10, 7, 3]
    const r = partialCorrelation(x, y, [z1, z2])
    expect(r.error).toBeUndefined()
    expect(r.order).toBe(2)
    expect(r.rPartial).toBeGreaterThan(-1)
    expect(r.rPartial).toBeLessThan(1)
    expect(r.df).toBe(10 - 2 - 2) // n - 2 - order
  })

  it('strength and direction labels present', () => {
    const x = [1, 2, 3, 4, 5]
    const y = [5, 4, 3, 2, 1]
    const z = [3, 1, 4, 2, 5]
    const r = partialCorrelation(x, y, [z])
    expect(r.strength).toBeTypeOf('string')
    expect(r.direction).toBeTypeOf('string')
  })

  it('clamps r to [-0.999999, 0.999999]', () => {
    // Perfect multicollinearity in higher-order may produce r > 1
    const x = [1, 2, 3, 4, 5]
    const y = [2, 4, 6, 8, 10]
    const z = [3, 6, 9, 12, 15]
    const r = partialCorrelation(x, y, [z])
    expect(r.rPartial).toBeGreaterThanOrEqual(-1)
    expect(r.rPartial).toBeLessThanOrEqual(1)
  })
})

// ── Kendall's Tau-b ─────────────────────────────────────────────

describe('kendallTau', () => {
  it('perfect positive (no ties)', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    const r = kendallTau(x, y);
    expect(r.method).toBe('kendall_tau');
    expect(r.tau).toBeCloseTo(1, 5);
    expect(r.concordant).toBe(10);
    expect(r.discordant).toBe(0);
    expect(r.direction).toBe('positif');
    expect(r.significant).toBe(true);
  });

  it('perfect negative (no ties)', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [10, 9, 8, 7, 6];
    const r = kendallTau(x, y);
    expect(r.tau).toBeCloseTo(-1, 5);
    expect(r.concordant).toBe(0);
    expect(r.discordant).toBe(10);
    expect(r.direction).toBe('negatif');
    expect(r.significant).toBe(true);
  });

  it('no correlation (random)', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const y = [5, 1, 9, 3, 8, 2, 7, 4, 10, 6];
    const r = kendallTau(x, y);
    expect(Math.abs(r.tau)).toBeLessThan(0.5);
  });

  it('handles tied ranks correctly', () => {
    // Likert-style data with ties
    const x = [1, 2, 2, 3, 3, 3, 4, 4, 5];
    const y = [1, 2, 2, 3, 3, 3, 4, 4, 5];
    const r = kendallTau(x, y);
    expect(r.tau).toBeCloseTo(1, 5);
    expect(r.tied).toBeGreaterThan(0);
  });

  it('tau < 1 with discordant or different tie patterns', () => {
    // Different tie patterns between x and y reduce tau-b
    const x = [1, 1, 2, 3, 3];
    const y = [1, 2, 2, 3, 3];
    const r = kendallTau(x, y);
    expect(r.tau).toBeLessThan(1);
    expect(r.tau).toBeGreaterThan(0);
    expect(r.concordant).toBeGreaterThan(r.discordant);
  });

  it('reports z-statistic and p-value', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const y = [2, 1, 4, 3, 6, 5, 8, 7, 10, 9];
    const r = kendallTau(x, y);
    expect(r.z).toBeDefined();
    expect(r.pValue).toBeGreaterThan(0);
    expect(r.pValue).toBeLessThan(1);
    expect(typeof r.conclusion).toBe('string');
    expect(r.conclusion).toContain('Kendall');
  });

  it('handles missing values', () => {
    const x = [1, 2, NaN, 4, 5, 6, 7, 8, 9, 10];
    const y = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
    const r = kendallTau(x, y);
    expect(r.n).toBe(9);
    expect(r.missing).toBe(1);
  });

  it('returns error for n < 3', () => {
    const r = kendallTau([1, 2], [3, 4]);
    expect(r.error).toBeDefined();
  });

  it('ordinal Likert data with moderate correlation', () => {
    // Realistic Likert 1-5 dataset
    const x = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 3, 3, 4, 4, 2];
    const y = [2, 3, 3, 4, 5, 1, 2, 4, 4, 5, 3, 2, 5, 4, 3];
    const r = kendallTau(x, y);
    expect(r.tau).toBeGreaterThan(0);
    expect(r.tau).toBeLessThan(1);
    expect(r.pValue).toBeGreaterThan(0);
    expect(r.n).toBe(15);
  });
});

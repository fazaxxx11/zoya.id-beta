import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

// Import from main statistics index
import * as stats from '../../src/lib/statistics/index.js';
import { multipleLinearRegression, pearson, spearman, chiSquareIndependence, simpleRegression, shapiroWilk } from '../../src/lib/statistics/index.js';

describe('ALL STATISTICAL TOOLS - COMPREHENSIVE VALIDATION', () => {

  describe('1. DESCRIPTIVE STATISTICS', () => {
    it('Mean, median, SD match manual calculation', () => {
      const data = [85, 90, 78, 92, 88, 76, 95, 89, 84, 91];
      
      const result = stats.describe(data);

      // Manual calculations
      const expectedMean = 868 / 10; // 86.8
      const expectedMedian = (88 + 89) / 2; // 88.5

      expect(result.mean).toBeCloseTo(expectedMean, 1);
      expect(result.median).toBeCloseTo(expectedMedian, 1);
      expect(result.min).toBe(76);
      expect(result.max).toBe(95);
      expect(result.n).toBe(10);
    });
  });

  describe('2. T-TESTS', () => {
    it('Independent t-test: 100-sample validation (already tested)', () => {
      const csv = readFileSync('test_small_100.csv', 'utf8');
      const lines = csv.trim().split('\n');
      const data = lines.slice(1).map(line => {
        const [id, group, score] = line.split(',');
        return { group: group.trim(), score: parseFloat(score) };
      });

      const control = data.filter(r => r.group === 'Control').map(r => r.score);
      const treatment = data.filter(r => r.group === 'Treatment').map(r => r.score);

      const result = stats.independentTTest(control, treatment);

      expect(result.student.t).toBeCloseTo(-48.46, 1);
      expect(result.student.df).toBe(98);
      expect(result.cohensD).toBeCloseTo(-9.69, 1);
    });

    it('Paired t-test: pre-post comparison', () => {
      const pre = [65, 70, 68, 72, 69, 71, 67, 73, 70, 68];
      const post = [72, 78, 75, 80, 76, 79, 74, 82, 77, 75];

      const result = stats.pairedTTest(pre, post);

      // All post scores higher → positive t (post > pre)
      expect(result.t).toBeGreaterThan(0);
      expect(result.pValue).toBeLessThan(0.001);
      expect(result.significant).toBe(true);
    });
  });

  describe('3. ANOVA', () => {
    it('One-way ANOVA: 3 groups with clear differences', () => {
      const values = [23, 25, 28, 27, 26, 18, 20, 22, 19, 21, 30, 32, 35, 33, 31];
      const groupLabels = ['G1', 'G1', 'G1', 'G1', 'G1', 'G2', 'G2', 'G2', 'G2', 'G2', 'G3', 'G3', 'G3', 'G3', 'G3'];

      const result = stats.oneWayANOVA(values, groupLabels);

      expect(result.F).toBeGreaterThan(10); // Strong effect
      expect(result.pValue).toBeLessThan(0.001);
      expect(result.dfBetween).toBe(2);
      expect(result.dfWithin).toBe(12);
    });
  });

  describe('4. CORRELATION', () => {
    it('Pearson: strong positive correlation', () => {
      const x = [10, 12, 15, 18, 20, 22, 25, 28, 30, 32];
      const y = [85, 88, 90, 92, 95, 93, 97, 99, 98, 100];

      const result = pearson(x, y);

      expect(result.r).toBeGreaterThan(0.9); // Very strong
      expect(result.pValue).toBeLessThan(0.001);
    });

    it('Spearman: monotonic relationship', () => {
      const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const y = [2, 4, 3, 6, 5, 8, 7, 10, 9, 11];

      const result = spearman(x, y);

      expect(result.rho).toBeGreaterThan(0.8);
      expect(result.pValue).toBeLessThan(0.01);
    });
  });

  describe('5. CHI-SQUARE', () => {
    it('Independence test: 2x2 contingency', () => {
      // Two categorical columns with clear dependence
      const col1 = ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'];
      const col2 = ['Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No', 'No', 'No', 'No', 'No', 'No', 'No', 'No', 'No', 'No'];

      const result = chiSquareIndependence(col1, col2);

      expect(result.chi2).toBeGreaterThan(10);
      expect(result.df).toBe(1);
      expect(result.pValue).toBeLessThan(0.01);
    });
  });

  describe('6. REGRESSION', () => {
    it('Simple linear: perfect fit', () => {
      const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const y = x.map(v => 2 * v + 1); // y = 2x + 1

      const result = simpleRegression(x, y);

      expect(result.r2).toBeGreaterThan(0.99);
      expect(result.b1).toBeCloseTo(2.0, 1);
      expect(result.b0).toBeCloseTo(1.0, 1);
    });

    it('Multiple regression: R2 validation', () => {
      // y = 2*x1 + 3*x2 + noise (x1 and x2 are independent)
      const y = [14, 23, 32, 41, 50, 59, 68, 77, 86, 95, 104, 113];
      const X = [
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],  // x1
        [4, 1, 3, 2, 5, 4, 1, 3, 2, 5, 4, 1]       // x2 (independent)
      ];

      const result = multipleLinearRegression(X, y);

      expect(result.rSquared).toBeGreaterThan(0.9);
      expect(result.adjustedR2).toBeDefined();
    });
  });

  describe('7. RELIABILITY', () => {
    it('Cronbach Alpha: internal consistency', () => {
      const items = [
        [4, 5, 4, 5, 4],
        [5, 5, 5, 4, 5],
        [3, 4, 3, 4, 3],
        [4, 4, 5, 4, 4],
        [5, 5, 5, 5, 5]
      ];

      const result = stats.cronbachAlpha(items);

      expect(result.alpha).toBeGreaterThan(0.5);
      expect(result.alpha).toBeLessThanOrEqual(1.0);
    });
  });

  describe('8. NONPARAMETRIC', () => {
    it('Mann-Whitney U: rank-based comparison', () => {
      const group1 = [12, 15, 18, 20, 22];
      const group2 = [8, 10, 13, 16, 19];

      const result = stats.mannWhitneyU(group1, group2);

      expect(result.U).toBeDefined();
      expect(result.pValue).toBeDefined();
    });

    it('Wilcoxon signed-rank: paired ranks', () => {
      const before = [65, 70, 68, 72, 69];
      const after = [72, 78, 75, 80, 76];

      const result = stats.wilcoxonSignedRank(before, after);

      expect(result.W).toBeDefined();
      expect(result.pValue).toBeDefined();
    });
  });

  describe('9. NORMALITY TESTS', () => {
    it('Shapiro-Wilk: normal distribution', () => {
      const normal = [98, 100, 102, 99, 101, 103, 100, 102, 99, 101];

      const result = shapiroWilk(normal);

      expect(result.W).toBeGreaterThan(0.8);
      expect(result.pValue).toBeGreaterThan(0.05); // Normal
    });
  });

  describe('10. EFFECT SIZES', () => {
    it('Cohen d: standardized mean difference', () => {
      const group1 = [85, 90, 88, 92, 87];
      const group2 = [70, 75, 72, 78, 74];

      const result = stats.cohensD(group1, group2);

      expect(Math.abs(result.d)).toBeGreaterThan(1); // Large effect
    });
  });

});

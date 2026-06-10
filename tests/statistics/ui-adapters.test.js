import { describe, it, expect } from 'vitest';
import {
  describeAdapter,
  formatDescriptive,
  pearsonAdapter,
  spearmanAdapter,
  cronbachAdapter,
  independentTTestAdapter,
  pairedTTestAdapter,
  oneWayANOVAAdapter,
  simpleRegressionAdapter,
  normalityAdapter,
  oneSampleTTestAdapter,
  mannWhitneyAdapter,
  wilcoxonAdapter,
  kruskalWallisAdapter,
} from '../../src/lib/statistics/uiAdapters.js';

describe('UI adapters', () => {
  describe('descriptive adapter', () => {
    it('returns correct shape matching old formatDescriptive', () => {
      const data = [85, 90, 78, 92, 88, 76, 95, 82, 89, 80];
      const result = describeAdapter(data);
      expect(result.n).toBe(10);
      expect(result.mean).toBeCloseTo(85.5, 4);
      expect(result.stdDev).toBeCloseTo(6.3289, 3);
      expect(result.variance).toBeCloseTo(40.0556, 2);
      expect(result.median).toBeCloseTo(86.5, 4);
      expect(result.min).toBe(76);
      expect(result.max).toBe(95);
      expect(result.sem).toBeCloseTo(2.0014, 3);
    });

    it('returns null for empty input', () => {
      expect(describeAdapter([])).toBeNull();
      expect(describeAdapter(null)).toBeNull();
    });

    it('formatDescriptive matches engine describe output', () => {
      const data = [1, 2, 3, 4, 5];
      const result = describeAdapter(data);
      const formatted = formatDescriptive(result);
      expect(formatted.n).toBe(result.n);
      expect(formatted.mean).toBe(result.mean);
    });
  });

  describe('pearson adapter', () => {
    it('returns correct shape matching old pearsonCorrelation', () => {
      const x = [10, 20, 30, 40, 50, 60, 70, 80, 90];
      const y = [20, 35, 40, 55, 60, 75, 80, 95, 100];
      const result = pearsonAdapter(x, y);
      expect(result.r).toBeCloseTo(0.9954, 3);
      expect(result.pValue).toBeLessThan(0.001);
      expect(result.n).toBe(9);
      expect(result.strength).toBe('kuat');
      expect(result.direction).toBe('positif');
      expect(result.interpretation).toContain('Pearson');
    });

    it('handles missing values (pairwise)', () => {
      const x = [10, 20, NaN, 40, 50];
      const y = [20, 35, 40, NaN, 60];
      const result = pearsonAdapter(x, y);
      expect(result.n).toBe(3);
    });
  });

  describe('spearman adapter', () => {
    it('returns correct shape', () => {
      const x = [10, 20, 30, 40, 50];
      const y = [20, 40, 60, 80, 100];
      const result = spearmanAdapter(x, y);
      expect(result.rho).toBeCloseTo(1, 4);
      expect(result.n).toBe(5);
      expect(result.direction).toBe('positif');
    });
  });

  describe('cronbach adapter', () => {
    it('returns correct shape matching old cronbachAlpha', () => {
      const items = [
        [5, 4, 5, 4], [4, 3, 4, 3], [5, 5, 5, 4],
        [3, 3, 3, 2], [4, 4, 4, 3], [5, 4, 4, 5],
        [3, 2, 3, 2], [4, 4, 4, 3], [5, 5, 5, 4], [4, 3, 4, 3],
      ];
      const result = cronbachAdapter(items);
      expect(result.alpha).toBeCloseTo(0.9468, 3);
      expect(result.k).toBe(4);
      expect(result.n).toBe(10);
      expect(result.interpretation).toBe('Sangat baik');
    });

    it('handles missing values (listwise)', () => {
      const items = [
        [5, 4, 5, 4], [4, 3, 4, 3], [null, 3, 3, 2],
      ];
      const result = cronbachAdapter(items);
      expect(result.n).toBe(2);
    });
  });

  describe('independent t-test adapter', () => {
    it('returns correct shape matching old independentTTest', () => {
      const g1 = [85, 90, 78, 92, 88, 80, 85, 90];
      const g2 = [75, 70, 80, 72, 78, 68, 74, 76];
      const result = independentTTestAdapter(g1, g2);
      expect(result.mean1).toBeCloseTo(86, 2);
      expect(result.mean2).toBeCloseTo(74.125, 2);
      expect(result.t).toBeCloseTo(5.2466, 1);
      expect(result.df).toBe(14);
      expect(result.pValue).toBeLessThan(0.01);
      expect(result.cohensD).toBeCloseTo(2.6233, 1);
      expect(result.significant).toBe(true);
      expect(result.welch).toBeDefined();
    });

    it('handles missing values (listwise)', () => {
      const g1 = [85, 90, NaN, 92];
      const g2 = [75, 70, 80, 72];
      const result = independentTTestAdapter(g1, g2);
      expect(result.n1).toBe(3);
      expect(result.n2).toBe(4);
    });
  });

  describe('paired t-test adapter', () => {
    it('returns correct shape matching old pairedTTest', () => {
      const pre = [85, 78, 90, 72, 88, 76, 82, 70, 95, 80];
      const post = [90, 82, 88, 80, 92, 85, 86, 78, 98, 84];
      const result = pairedTTestAdapter(pre, post);
      expect(result.meanDiff).toBeCloseTo(4.7, 2);
      expect(result.t).toBeCloseTo(4.6974, 1);
      expect(result.df).toBe(9);
      expect(result.pValue).toBeLessThan(0.01);
      expect(result.significant).toBe(true);
    });
  });

  describe('one-way ANOVA adapter', () => {
    it('returns correct shape matching old oneWayANOVA', () => {
      const groups = [
        [85, 90, 78, 92, 88],
        [75, 70, 80, 72, 78],
        [65, 70, 60, 68, 72],
      ];
      const result = oneWayANOVAAdapter(groups, ['A', 'B', 'C']);
      expect(result.F).toBeCloseTo(21.1744, 1);
      expect(result.dfBetween).toBe(2);
      expect(result.dfWithin).toBe(12);
      expect(result.pValue).toBeLessThan(0.001);
      expect(result.etaSquared).toBeCloseTo(0.7792, 2);
      expect(result.significant).toBe(true);
      expect(result.groupMeans).toHaveLength(3);
    });

    it('handles missing values', () => {
      const groups = [
        [85, 90, NaN, 92],
        [75, 70, 80, 72],
      ];
      const result = oneWayANOVAAdapter(groups);
      expect(result.N).toBeLessThanOrEqual(8);
    });
  });

  describe('normality adapter', () => {
    it('returns Shapiro-Wilk for small n', () => {
      const data = [85, 90, 78, 92, 88, 76, 95, 82, 89, 80];
      const result = normalityAdapter(data);
      expect(result.method).toBe('Shapiro-Wilk');
      expect(result.W).toBeDefined();
      expect(result.pValue).toBeDefined();
      expect(result.isNormal).toBeDefined();
    });

    it('handles missing values', () => {
      const data = [85, 90, null, 92, NaN];
      const result = normalityAdapter(data);
      expect(result.n).toBe(3);
    });
  });

  describe('one-sample t-test adapter', () => {
    it('returns correct shape matching old oneSampleTTest', () => {
      const data = [85, 90, 78, 92, 88, 76, 95, 82, 89, 80];
      const result = oneSampleTTestAdapter(data, 80);
      expect(result.test).toBe('One-sample t-test');
      expect(result.mu0).toBe(80);
      expect(result.t).toBeDefined();
      expect(result.df).toBe(9);
      expect(result.pValue).toBeDefined();
      expect(result.significant).toBeDefined();
    });

    it('handles missing values', () => {
      const data = [85, 90, NaN, 92];
      const result = oneSampleTTestAdapter(data, 80);
      expect(result.n).toBe(3);
    });
  });

  describe('mann-whitney adapter', () => {
    it('returns correct shape matching old mannWhitneyU', () => {
      const g1 = [23, 41, 54, 66, 32];
      const g2 = [67, 55, 43, 29, 18];
      const result = mannWhitneyAdapter(g1, g2);
      expect(result.U).toBeDefined();
      expect(result.z).toBeDefined();
      expect(result.pValue).toBeDefined();
      expect(result.isSignificant).toBeDefined();
      expect(result.n1).toBe(5);
      expect(result.n2).toBe(5);
    });

    it('returns error for insufficient data', () => {
      const result = mannWhitneyAdapter([1, 2], [3, 4]);
      expect(result.error).toBeDefined();
    });
  });

  describe('wilcoxon adapter', () => {
    it('returns correct shape matching old wilcoxonSignedRank', () => {
      const before = [85, 90, 78, 92, 88, 76, 95, 82, 89, 80];
      const after = [90, 95, 80, 88, 92, 82, 91, 85, 93, 86];
      const result = wilcoxonAdapter(before, after);
      expect(result.W).toBeDefined();
      expect(result.Wpos).toBeDefined();
      expect(result.Wneg).toBeDefined();
      expect(result.z).toBeDefined();
      expect(result.pValue).toBeDefined();
      expect(result.isSignificant).toBeDefined();
    });
  });

  describe('kruskal-wallis adapter', () => {
    it('returns correct shape matching old kruskalWallis', () => {
      const g1 = [23, 41, 54, 66, 32];
      const g2 = [67, 55, 43, 29, 18];
      const g3 = [80, 72, 91, 65, 88];
      const result = kruskalWallisAdapter([g1, g2, g3], ['A', 'B', 'C']);
      expect(result.H).toBeDefined();
      expect(result.df).toBe(2);
      expect(result.pValue).toBeDefined();
      expect(result.groupStats).toHaveLength(3);
      expect(result.isSignificant).toBeDefined();
    });
  });

  describe('simple regression adapter', () => {
    it('returns correct shape matching old simpleLinearRegression', () => {
      const x = [10, 20, 30, 40, 50, 60, 70, 80];
      const y = [20, 38, 55, 68, 85, 100, 115, 135];
      const result = simpleRegressionAdapter(x, y);
      expect(result.b0).toBeCloseTo(5.1071, 2);
      expect(result.b1).toBeCloseTo(1.5976, 2);
      expect(result.r2).toBeCloseTo(0.9985, 3);
      expect(result.t_b1).toBeCloseTo(63.45, 0);
      expect(result.p_b1).toBeLessThan(0.001);
      expect(result.significant).toBe(true);
      expect(result.n).toBe(8);
    });

    it('handles missing values (listwise)', () => {
      const x = [10, 20, NaN, 40, 50];
      const y = [20, 38, 55, 68, 85];
      const result = simpleRegressionAdapter(x, y);
      expect(result.n).toBe(4);
    });
  });
});

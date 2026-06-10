import { describe, it, expect } from 'vitest';
import { independentTTest, pairedTTest } from '../../src/lib/statistics/ttest.js';
import { readFileSync } from 'fs';
import { join } from 'path';

function loadFixture(name) {
  return readFileSync(join(import.meta.dirname, '../fixtures/statistics', name), 'utf8');
}

function parseCSV(path) {
  const csv = loadFixture(path);
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => {
      const num = Number(vals[i]);
      obj[h] = isNaN(num) ? vals[i] : num;
    });
    return obj;
  });
}

describe('t-tests', () => {
  describe('independent t-test', () => {
    const data = parseCSV('ttest-independent.csv');
    const groupA = data.filter(r => r.group === 'A').map(r => r.score);
    const groupB = data.filter(r => r.group === 'B').map(r => r.score);

    it('computes correct means and t-statistic', () => {
      const result = independentTTest(groupA, groupB);
      expect(result.method).toBe('independent_t');
      expect(result.group1.mean).toBeCloseTo(86, 4);
      expect(result.group2.mean).toBeCloseTo(74.125, 2);
      expect(result.student.t).toBeCloseTo(5.2466, 2);
      expect(result.student.df).toBe(14);
    });

    it('reports significance', () => {
      const result = independentTTest(groupA, groupB);
      expect(result.student.pValue).toBeLessThan(0.01);
      expect(result.significant).toBe(true);
    });

    it('computes Cohen d effect size', () => {
      const result = independentTTest(groupA, groupB);
      expect(result.cohensD).toBeCloseTo(2.6233, 2);
    });

    it('handles Welch unequal variance', () => {
      const result = independentTTest(groupA, groupB);
      expect(result.welch).toBeDefined();
      expect(result.welch.t).toBeCloseTo(5.2466, 1);
      expect(result.welch.df).toBeGreaterThan(0);
    });

    it('handles missing values', () => {
      const withMissing = [...groupA.slice(0, 3), NaN, ...groupA.slice(4)];
      const result = independentTTest(withMissing, groupB);
      expect(result.missing).toBeGreaterThanOrEqual(0);
    });
  });

  describe('paired t-test', () => {
    const data = parseCSV('ttest-paired.csv');
    const pre = data.map(r => r.pre);
    const post = data.map(r => r.post);

    it('computes correct mean difference and t', () => {
      const result = pairedTTest(pre, post);
      expect(result.method).toBe('paired_t');
      expect(result.meanDiff).toBeCloseTo(4.7, 4);
      expect(result.t).toBeCloseTo(4.6974, 2);
      expect(result.df).toBe(9);
    });

    it('reports significance', () => {
      const result = pairedTTest(pre, post);
      expect(result.pValue).toBeLessThan(0.01);
      expect(result.significant).toBe(true);
    });

    it('computes Cohen d', () => {
      const result = pairedTTest(pre, post);
      expect(result.cohensD).toBeCloseTo(1.4854, 2);
    });

    it('reports CI for mean difference', () => {
      const result = pairedTTest(pre, post);
      expect(result.ci95).toHaveLength(2);
      expect(result.ci95[0]).toBeLessThan(result.meanDiff);
      expect(result.ci95[1]).toBeGreaterThan(result.meanDiff);
    });
  });
});

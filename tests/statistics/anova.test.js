import { describe, it, expect } from 'vitest';
import { oneWayANOVA } from '../../src/lib/statistics/anova.js';
import { readFileSync } from 'fs';
import { join } from 'path';

function loadFixture(name) {
  return readFileSync(join(import.meta.dirname, '../fixtures/statistics', name), 'utf8');
}

describe('one-way ANOVA', () => {
  const csv = loadFixture('anova-oneway.csv');
  const lines = csv.trim().split('\n');
  const data = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim());
    return { group: vals[0], score: Number(vals[1]) };
  });
  const values = data.map(d => d.score);
  const groups = data.map(d => d.group);

  it('computes correct F-statistic', () => {
    const result = oneWayANOVA(values, groups);
    expect(result.method).toBe('one_way_anova');
    expect(result.k).toBe(3);
    expect(result.N).toBe(15);
    expect(result.F).toBeCloseTo(21.1744, 1);
    expect(result.dfBetween).toBe(2);
    expect(result.dfWithin).toBe(12);
  });

  it('reports significance', () => {
    const result = oneWayANOVA(values, groups);
    expect(result.pValue).toBeLessThan(0.001);
    expect(result.significant).toBe(true);
  });

  it('computes SS between and within', () => {
    const result = oneWayANOVA(values, groups);
    expect(result.ssBetween).toBeCloseTo(971.2, 0);
    expect(result.ssWithin).toBeCloseTo(275.2, 0);
  });

  it('computes eta-squared', () => {
    const result = oneWayANOVA(values, groups);
    expect(result.etaSquared).toBeCloseTo(0.7792, 2);
  });

  it('computes group means', () => {
    const result = oneWayANOVA(values, groups);
    expect(result.groupMeans).toHaveLength(3);
    const groupA = result.groupMeans.find(g => g.group === 'A');
    expect(groupA.mean).toBeCloseTo(86.6, 1);
  });

  it('handles missing values', () => {
    const withMissing = [...values.slice(0, 5), NaN, ...values.slice(6)];
    const withMissingGroups = [...groups.slice(0, 5), 'A', ...groups.slice(6)];
    const result = oneWayANOVA(withMissing, withMissingGroups);
    expect(result.N).toBeLessThanOrEqual(15);
  });

  it('returns error for single group', () => {
    const result = oneWayANOVA([1, 2, 3], ['A', 'A', 'A']);
    expect(result.error).toBeDefined();
  });
});

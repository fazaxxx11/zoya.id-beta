import { describe, it, expect } from 'vitest';
import { oneWayANOVA, twoWayANOVA } from '../../src/lib/statistics/anova.js';
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

describe('two-way ANOVA', () => {
  // 2x2 factorial: Factor A (Low/High) x Factor B (Control/Treatment)
  const y = [5, 6, 7, 8, 9, 10, 11, 12, 6, 7, 8, 9, 10, 11, 12, 13];
  const a = ['Low','Low','Low','Low','High','High','High','High',
             'Low','Low','Low','Low','High','High','High','High'];
  const b = ['Control','Control','Control','Control','Control','Control','Control','Control',
             'Treat','Treat','Treat','Treat','Treat','Treat','Treat','Treat'];

  it('returns correct shape', () => {
    const result = twoWayANOVA({ y, a, b, nameA: 'Dose', nameB: 'Drug' });
    expect(result.error).toBeNull();
    expect(result.test).toBe('Two-Way ANOVA');
    expect(result.N).toBe(16);
    expect(result.levelsA).toEqual(['High', 'Low']);
    expect(result.levelsB).toEqual(['Control', 'Treat']);
    expect(result.anovaTable).toHaveLength(5);
  });

  it('detects main effect of factor A', () => {
    const result = twoWayANOVA({ y, a, b });
    expect(result.factorA.F).toBeGreaterThan(0);
    expect(result.factorA.pValue).toBeDefined();
  });

  it('detects main effect of factor B', () => {
    const result = twoWayANOVA({ y, a, b });
    expect(result.factorB.F).toBeGreaterThan(0);
    expect(result.factorB.pValue).toBeDefined();
  });

  it('computes interaction effect', () => {
    const result = twoWayANOVA({ y, a, b });
    expect(result.interaction.F).toBeDefined();
    expect(result.interaction.pValue).toBeDefined();
    expect(result.interaction.SS).toBeDefined();
  });

  it('computes effect sizes', () => {
    const result = twoWayANOVA({ y, a, b });
    expect(result.factorA.etaSquared).toBeDefined();
    expect(result.factorA.partialEtaSquared).toBeDefined();
    expect(result.factorA.effectSize).toBeDefined();
  });

  it('computes cell table', () => {
    const result = twoWayANOVA({ y, a, b });
    expect(result.cellTable).toHaveLength(4); // 2x2
    expect(result.cellTable[0]).toHaveProperty('levelA');
    expect(result.cellTable[0]).toHaveProperty('levelB');
    expect(result.cellTable[0]).toHaveProperty('n');
    expect(result.cellTable[0]).toHaveProperty('mean');
    expect(result.cellTable[0]).toHaveProperty('sd');
  });

  it('computes marginal means', () => {
    const result = twoWayANOVA({ y, a, b });
    expect(result.marginalA).toHaveLength(2);
    expect(result.marginalB).toHaveLength(2);
  });

  it('detects balanced design', () => {
    const result = twoWayANOVA({ y, a, b });
    expect(result.isBalanced).toBe(true);
    expect(result.cellSizesRange.min).toBe(result.cellSizesRange.max);
  });

  it('handles missing values', () => {
    const ym = [...y]; ym[0] = NaN;
    const am = [...a];
    const bm = [...b];
    const result = twoWayANOVA({ y: ym, a: am, b: bm });
    expect(result.N).toBe(15);
  });

  it('returns error for mismatched lengths', () => {
    const result = twoWayANOVA({ y: [1, 2], a: ['A'], b: ['B'] });
    expect(result.error).toContain('sama');
  });

  it('returns error for single level factor', () => {
    const result = twoWayANOVA({
      y: [1, 2, 3, 4],
      a: ['A', 'A', 'A', 'A'],
      b: ['X', 'X', 'Y', 'Y'],
    });
    expect(result.error).toContain('1 level');
  });

  it('returns error for empty cells', () => {
    const result = twoWayANOVA({
      y: [1, 2, 3],
      a: ['A', 'A', 'B'],
      b: ['X', 'X', 'Y'],
    });
    // Missing A-Y cell
    expect(result.error).toBeDefined();
  });
});

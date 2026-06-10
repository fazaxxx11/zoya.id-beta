import { describe, it, expect } from 'vitest';
import { itemValidity } from '../../src/lib/statistics/itemValidity.js';

describe('itemValidity', () => {
  const data = [
    [3, 4, 5, 2, 4],
    [4, 5, 4, 3, 5],
    [2, 3, 4, 2, 3],
    [5, 4, 5, 4, 5],
    [3, 3, 3, 3, 3],
    [4, 5, 4, 3, 4],
    [2, 2, 3, 2, 2],
    [5, 5, 5, 4, 5],
    [3, 4, 4, 3, 4],
    [4, 4, 4, 3, 4],
    [3, 3, 4, 2, 3],
    [4, 5, 5, 3, 5],
  ];

  it('returns correct structure', () => {
    const result = itemValidity(data);
    expect(result).toHaveProperty('n');
    expect(result).toHaveProperty('k');
    expect(result).toHaveProperty('rCritical');
    expect(result).toHaveProperty('df');
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('summary');
  });

  it('returns correct n and k', () => {
    const result = itemValidity(data);
    expect(result.n).toBe(12);
    expect(result.k).toBe(5);
  });

  it('rCritical is positive', () => {
    const result = itemValidity(data);
    expect(result.rCritical).toBeGreaterThan(0);
    expect(result.rCritical).toBeLessThan(1);
  });

  it('df equals n - 2', () => {
    const result = itemValidity(data);
    expect(result.df).toBe(result.n - 2);
  });

  it('items array length matches k', () => {
    const result = itemValidity(data);
    expect(result.items).toHaveLength(5);
  });

  it('each item has correct fields', () => {
    const result = itemValidity(data);
    for (const item of result.items) {
      expect(item).toHaveProperty('item');
      expect(item).toHaveProperty('r');
      expect(item).toHaveProperty('pValue');
      expect(item).toHaveProperty('n');
      expect(item).toHaveProperty('isValid');
      expect(item).toHaveProperty('verdict');
      expect(typeof item.r).toBe('number');
      expect(typeof item.pValue).toBe('number');
      expect(typeof item.isValid).toBe('boolean');
      expect(['VALID', 'TIDAK VALID']).toContain(item.verdict);
    }
  });

  it('verdict matches isValid', () => {
    const result = itemValidity(data);
    for (const item of result.items) {
      if (item.isValid) expect(item.verdict).toBe('VALID');
      else expect(item.verdict).toBe('TIDAK VALID');
    }
  });

  it('listwise deletion removes rows with NaN', () => {
    const dirty = [
      [3, 4, NaN, 2, 4],
      [4, 5, 4, 3, 5],
      [2, 3, 4, 2, 3],
      [5, 4, 5, 4, 5],
      [3, 3, 3, 3, 3],
      [4, 5, 4, 3, 4],
      [2, 2, 3, 2, 2],
      [5, 5, 5, 4, 5],
      [3, 4, 4, 3, 4],
      [4, 4, 4, 3, 4],
      [3, 3, 4, 2, 3],
      [4, 5, 5, 3, 5],
    ];
    const result = itemValidity(dirty);
    expect(result.n).toBe(11); // 1 row removed
  });

  it('returns error for < 2 items', () => {
    const result = itemValidity([[1], [2], [3]]);
    expect(result.error).toBeDefined();
  });

  it('returns error for < 3 respondents', () => {
    const result = itemValidity([[1, 2], [3, 4]]);
    expect(result.error).toBeDefined();
  });

  it('summary string mentions VALID count', () => {
    const result = itemValidity(data);
    expect(result.summary).toContain('VALID');
    expect(result.summary).toContain('item');
  });
});

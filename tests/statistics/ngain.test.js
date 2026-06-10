import { describe, it, expect } from 'vitest';
import { calcNGain, categorizeNGain, analyzeNGain } from '../../src/lib/statistics/ngain.js';

describe('calcNGain', () => {
  it('computes normalized gain correctly', () => {
    expect(calcNGain(40, 80, 100)).toBeCloseTo(0.6667, 3);
    expect(calcNGain(60, 90, 100)).toBeCloseTo(0.75, 3);
    expect(calcNGain(0, 50, 100)).toBeCloseTo(0.5, 3);
  });

  it('returns 1.0 when pre=max and post>=pre (legacy)', () => {
    expect(calcNGain(100, 100, 100)).toBe(1.0);
    expect(calcNGain(100, 110, 100)).toBe(1.0);
  });

  it('returns 0.0 when pre=max and post<pre', () => {
    expect(calcNGain(100, 90, 100)).toBe(0.0);
  });

  it('returns null for non-numeric', () => {
    expect(calcNGain(null, 80, 100)).toBeNull();
    expect(calcNGain(40, undefined, 100)).toBeNull();
  });

  it('returns null for Infinity', () => {
    expect(calcNGain(Infinity, 80, 100)).toBeNull();
  });
});

describe('categorizeNGain', () => {
  it('categorizes correctly by Hake thresholds', () => {
    expect(categorizeNGain(0.7)).toBe('Tinggi');
    expect(categorizeNGain(0.85)).toBe('Tinggi');
    expect(categorizeNGain(0.3)).toBe('Sedang');
    expect(categorizeNGain(0.5)).toBe('Sedang');
    expect(categorizeNGain(0.29)).toBe('Rendah');
    expect(categorizeNGain(0.0)).toBe('Rendah');
  });

  it('returns N/A for null/invalid', () => {
    expect(categorizeNGain(null)).toBe('N/A');
    expect(categorizeNGain(NaN)).toBe('N/A');
  });
});

describe('analyzeNGain', () => {
  const pre = [40, 50, 60, 30, 45];
  const post = [70, 80, 75, 60, 70];

  it('returns correct structure', () => {
    const result = analyzeNGain({ pre, post, maxScore: 100 });
    expect(result).toHaveProperty('n');
    expect(result).toHaveProperty('pairs');
    expect(result).toHaveProperty('distribusi');
    expect(result).toHaveProperty('distribusiPersen');
    expect(result).toHaveProperty('nGainMean');
    expect(result).toHaveProperty('kategoriKelas');
    expect(result).toHaveProperty('efektivitasPersen');
    expect(result).toHaveProperty('tafsiranEfektivitas');
    expect(result).toHaveProperty('preStats');
    expect(result).toHaveProperty('postStats');
    expect(result).toHaveProperty('signifTest');
  });

  it('n matches valid pairs', () => {
    const result = analyzeNGain({ pre, post, maxScore: 100 });
    expect(result.n).toBe(5);
    expect(result.pairs).toHaveLength(5);
  });

  it('each pair has correct fields', () => {
    const result = analyzeNGain({ pre, post, maxScore: 100 });
    for (const p of result.pairs) {
      expect(p).toHaveProperty('index');
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('pre');
      expect(p).toHaveProperty('post');
      expect(p).toHaveProperty('gain');
      expect(p).toHaveProperty('nGain');
      expect(p).toHaveProperty('kategori');
    }
  });

  it('distribusi sums to n', () => {
    const result = analyzeNGain({ pre, post, maxScore: 100 });
    const total = result.distribusi.Tinggi + result.distribusi.Sedang + result.distribusi.Rendah;
    expect(total).toBe(result.n);
  });

  it('kategoriKelas is one of Hake categories', () => {
    const result = analyzeNGain({ pre, post, maxScore: 100 });
    expect(['Tinggi', 'Sedang', 'Rendah']).toContain(result.kategoriKelas);
  });

  it('signifTest has t-test fields', () => {
    const result = analyzeNGain({ pre, post, maxScore: 100 });
    expect(result.signifTest).toBeTruthy();
    expect(result.signifTest).toHaveProperty('t');
    expect(result.signifTest).toHaveProperty('pValue');
    expect(result.signifTest).toHaveProperty('significant');
  });

  it('returns error for mismatched lengths', () => {
    const result = analyzeNGain({ pre: [1, 2], post: [3] });
    expect(result.error).toBeDefined();
  });

  it('returns error for < 2 valid pairs', () => {
    const result = analyzeNGain({ pre: [NaN], post: [NaN] });
    expect(result.error).toBeDefined();
  });

  it('skips out-of-range values', () => {
    const result = analyzeNGain({
      pre: [40, 150, 60],
      post: [70, 80, 75],
      maxScore: 100,
    });
    expect(result.n).toBe(2); // 150 out of range
  });

  it('custom names appear in pairs', () => {
    const result = analyzeNGain({
      pre: [40, 50],
      post: [70, 80],
      maxScore: 100,
      names: ['Alice', 'Bob'],
    });
    expect(result.pairs[0].name).toBe('Alice');
    expect(result.pairs[1].name).toBe('Bob');
  });
});

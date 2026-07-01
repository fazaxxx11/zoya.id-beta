import { describe, it, expect } from 'vitest';
import { fmt } from '../../src/components/StatistikGuide/spssTableData';

describe('spssTableData — fmt helper', () => {
  it('formats numbers to 3 decimals by default, trims trailing zeros', () => {
    expect(fmt(0.970)).toBe('0.97');
    expect(fmt(0.500)).toBe('0.5');
    expect(fmt(1.000)).toBe('1');
    expect(fmt(0.123456)).toBe('0.123');
  });

  it('integers have no decimal point', () => {
    expect(fmt(30)).toBe('30');
    expect(fmt(0)).toBe('0');
    expect(fmt(59)).toBe('59');
  });

  it('null/undefined/NaN → em-dash', () => {
    expect(fmt(null)).toBe('—');
    expect(fmt(undefined)).toBe('—');
    expect(fmt(NaN)).toBe('NaN');
    expect(fmt(Infinity)).toBe('Infinity');
  });

  it('strings pass through unchanged', () => {
    expect(fmt('Skor_Pre')).toBe('Skor_Pre');
    expect(fmt('')).toBe('');
    expect(fmt('Valid N (listwise)')).toBe('Valid N (listwise)');
  });

  it('respects custom decimals', () => {
    expect(fmt(12.23456, 2)).toBe('12.23');
    expect(fmt(0.9, 2)).toBe('0.9');
    expect(fmt(10.821, 3)).toBe('10.821');
  });
});

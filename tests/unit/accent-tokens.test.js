// Unit test accent-tokens — node env (no DOM needed).
import { describe, it, expect } from 'vitest';
import { ACCENT_TOKEN, getAccentColor } from '../../src/components/hero/accent-tokens';

describe('accent-tokens', () => {
  it('punya 3 accent: gold, teal, terracotta', () => {
    expect(ACCENT_TOKEN.gold).toBe('rgb(var(--accent))');
    expect(ACCENT_TOKEN.teal).toBe('rgb(var(--deep-teal))');
    expect(ACCENT_TOKEN.terracotta).toBe('rgb(var(--warm-rose))');
  });

  it('getAccentColor return token yang sesuai', () => {
    expect(getAccentColor('gold')).toBe('rgb(var(--accent))');
    expect(getAccentColor('teal')).toBe('rgb(var(--deep-teal))');
    expect(getAccentColor('terracotta')).toBe('rgb(var(--warm-rose))');
  });

  it('getAccentColor fallback ke gold untuk accent tidak dikenal', () => {
    expect(getAccentColor('unknown')).toBe('rgb(var(--accent))');
    expect(getAccentColor(undefined)).toBe('rgb(var(--accent))');
    expect(getAccentColor('')).toBe('rgb(var(--accent))');
  });
});

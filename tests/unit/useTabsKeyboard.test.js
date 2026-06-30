import { describe, it, expect } from 'vitest';
import { getNextTab } from '../../src/components/StatistikGuide/useTabsKeyboard';

describe('getNextTab (WAI-ARIA tabs keyboard logic)', () => {
  it('ArrowRight advances to next tab', () => {
    expect(getNextTab('ArrowRight', 0, 3)).toBe(1);
  });

  it('ArrowRight wraps from last to first', () => {
    expect(getNextTab('ArrowRight', 2, 3)).toBe(0);
  });

  it('ArrowLeft wraps from first to last', () => {
    expect(getNextTab('ArrowLeft', 0, 3)).toBe(2);
  });

  it('ArrowDown/ArrowUp also navigate (same as Right/Left)', () => {
    expect(getNextTab('ArrowDown', 0, 3)).toBe(1);
    expect(getNextTab('ArrowUp', 0, 3)).toBe(2);
  });

  it('Home goes to first tab', () => {
    expect(getNextTab('Home', 1, 3)).toBe(0);
  });

  it('End goes to last tab', () => {
    expect(getNextTab('End', 0, 3)).toBe(2);
  });

  it('non-navigation key returns null (not intercepted)', () => {
    expect(getNextTab('Enter', 0, 3)).toBeNull();
    expect(getNextTab('Tab', 0, 3)).toBeNull();
    expect(getNextTab(' ', 0, 3)).toBeNull();
  });

  it('count=0 is safe (returns null)', () => {
    expect(getNextTab('ArrowRight', -1, 0)).toBeNull();
  });

  it('roving tabindex logic: active=0, others=-1', () => {
    const roving = (i, activeIndex) => (i === activeIndex ? 0 : -1);
    expect(roving(0, 1)).toBe(-1);
    expect(roving(1, 1)).toBe(0);
    expect(roving(2, 1)).toBe(-1);
  });
});

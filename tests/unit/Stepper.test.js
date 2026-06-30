import { describe, it, expect } from 'vitest';
import { nextStep, prevStep, dotState } from '../../src/components/StatistikGuide/Stepper';

describe('Stepper pure logic', () => {
  it('nextStep advances, clamps at last', () => {
    expect(nextStep(0, 5)).toBe(1);
    expect(nextStep(4, 5)).toBe(4); // last, no overflow
  });

  it('prevStep retreats, clamps at 0', () => {
    expect(prevStep(4, 5)).toBe(3);
    expect(prevStep(0, 5)).toBe(0); // first, no underflow
  });

  it('dotState: active/done/pending', () => {
    expect(dotState(0, 0)).toBe('active');
    expect(dotState(0, 2)).toBe('done');   // i < step
    expect(dotState(2, 2)).toBe('active'); // i === step
    expect(dotState(3, 2)).toBe('pending');// i > step
  });

  it('empty steps: nextStep/prevStep safe', () => {
    expect(nextStep(0, 0)).toBe(0);
    expect(prevStep(0, 0)).toBe(0);
  });
});

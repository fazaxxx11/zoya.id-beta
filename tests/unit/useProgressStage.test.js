import { describe, it, expect } from 'vitest';
import { getProgressStage } from '../../src/components/AIInterpretationPanel/useProgressStage';

describe('getProgressStage (progress stage logic)', () => {
  // 3 stage: mulai di 0ms, 3000ms, 6000ms
  const thresholds = [0, 3000, 6000];

  it('elapsed 0 → stage 0 active, rest pending', () => {
    const r = getProgressStage(0, thresholds);
    expect(r.stageIndex).toBe(0);
    expect(r.stageStates).toEqual(['active', 'pending', 'pending']);
  });

  it('elapsed between threshold[0] and [1] → stage 0 done, stage 1 active', () => {
    const r = getProgressStage(4000, thresholds);
    expect(r.stageIndex).toBe(1);
    expect(r.stageStates).toEqual(['done', 'active', 'pending']);
  });

  it('elapsed exceeds all thresholds → last stage active (parent decides done)', () => {
    const r = getProgressStage(99999, thresholds);
    expect(r.stageIndex).toBe(2);
    expect(r.stageStates).toEqual(['done', 'done', 'active']);
  });

  it('empty thresholds → safe defaults', () => {
    const r = getProgressStage(5000, []);
    expect(r.stageIndex).toBe(0);
    expect(r.stageStates).toEqual([]);
  });
});

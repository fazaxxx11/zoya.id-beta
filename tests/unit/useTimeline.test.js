import { describe, it, expect } from 'vitest';
import { getTimelineProgress } from '../../src/components/WalkthroughPlayer/useTimeline';

describe('getTimelineProgress (walkthrough timeline logic)', () => {
  // 3 scene: 10s, 10s, 10s → total 30s
  const durations = [10000, 10000, 10000];

  it('elapsed 0 → scene 0, progress 0', () => {
    const r = getTimelineProgress(0, durations);
    expect(r.currentScene).toBe(0);
    expect(r.sceneProgress).toBe(0);
    expect(r.totalProgress).toBe(0);
  });

  it('mid scene 0 → sceneProgress = elapsed/duration[0]', () => {
    const r = getTimelineProgress(5000, durations);
    expect(r.currentScene).toBe(0);
    expect(r.sceneProgress).toBeCloseTo(0.5, 5);
    expect(r.totalProgress).toBeCloseTo(5000 / 30000, 5);
  });

  it('boundary: elapsed = duration[0] → scene 1, sceneProgress 0', () => {
    const r = getTimelineProgress(10000, durations);
    expect(r.currentScene).toBe(1);
    expect(r.sceneProgress).toBe(0);
  });

  it('last scene finished → currentScene = last index, totalProgress 1', () => {
    const r = getTimelineProgress(30000, durations);
    expect(r.currentScene).toBe(2);
    expect(r.totalProgress).toBe(1);
  });

  it('elapsed exceeds total → clamp at last scene, totalProgress 1', () => {
    const r = getTimelineProgress(99999, durations);
    expect(r.currentScene).toBe(2);
    expect(r.totalProgress).toBe(1);
  });

  it('empty durations → safe defaults', () => {
    const r = getTimelineProgress(5000, []);
    expect(r.currentScene).toBe(0);
    expect(r.sceneProgress).toBe(0);
    expect(r.totalProgress).toBe(0);
  });
});

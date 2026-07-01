import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Pure logic: hitung posisi timeline dari elapsed time.
 * Dipisah dari hook supaya unit-testable di node env tanpa DOM.
 *
 * @param {number} elapsedMs
 * @param {number[]} durations - durasi tiap scene (ms)
 * @returns {{currentScene: number, sceneProgress: number, totalProgress: number}}
 */
export function getTimelineProgress(elapsedMs, durations) {
  if (!durations || durations.length === 0) {
    return { currentScene: 0, sceneProgress: 0, totalProgress: 0 };
  }
  const total = durations.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    return { currentScene: 0, sceneProgress: 0, totalProgress: 0 };
  }
  let elapsed = Math.max(0, elapsedMs);
  let scene = 0;
  let remaining = elapsed;
  for (let i = 0; i < durations.length; i++) {
    if (remaining < durations[i]) {
      scene = i;
      break;
    }
    remaining -= durations[i];
    if (i === durations.length - 1) {
      scene = i;
      remaining = durations[i]; // clamp di scene terakhir
    }
  }
  const sceneProgress = durations[scene] > 0 ? Math.min(1, remaining / durations[scene]) : 0;
  const totalProgress = Math.min(1, elapsedMs / total);
  return { currentScene: scene, sceneProgress, totalProgress };
}

/**
 * Hook: auto-advance timeline berdasarkan requestAnimationFrame.
 *
 * @param {object} opts
 * @param {number[]} opts.durations - durasi tiap scene (ms)
 * @param {boolean} opts.playing - apakah sedang play
 * @returns {{elapsed: number, currentScene: number, sceneProgress: number, totalProgress: number, isDone: boolean, seek: Function, reset: Function}}
 */
export default function useTimeline({ durations, playing }) {
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef(null);
  const lastRef = useRef(null);

  const total = (durations || []).reduce((a, b) => a + b, 0);

  useEffect(() => {
    if (!playing) {
      lastRef.current = null;
      return;
    }
    const tick = (now) => {
      if (lastRef.current == null) lastRef.current = now;
      const delta = now - lastRef.current;
      lastRef.current = now;
      setElapsed((prev) => {
        const next = prev + delta;
        return next >= total ? total : next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRef.current = null;
    };
  }, [playing, total]);

  const { currentScene, sceneProgress, totalProgress } = getTimelineProgress(elapsed, durations || []);
  const isDone = elapsed >= total && total > 0;

  const seek = useCallback((ms) => setElapsed(Math.max(0, Math.min(ms, total))), [total]);
  const reset = useCallback(() => setElapsed(0), []);

  return { elapsed, currentScene, sceneProgress, totalProgress, isDone, seek, reset };
}

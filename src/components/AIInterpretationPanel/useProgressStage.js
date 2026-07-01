import { useState, useEffect, useRef } from 'react';

/**
 * Pure logic: tentukan stage aktif berdasarkan elapsed time.
 * Dipisah dari hook supaya unit-testable di node env tanpa DOM.
 *
 * @param {number} elapsedMs
 * @param {number[]} thresholds - timestamp mulai tiap stage (ms), sorted ascending
 * @returns {{stageIndex: number, stageStates: Array<'active'|'done'|'pending'>}}
 */
export function getProgressStage(elapsedMs, thresholds) {
  if (!thresholds || thresholds.length === 0) {
    return { stageIndex: 0, stageStates: [] };
  }
  let stageIndex = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (elapsedMs >= thresholds[i]) {
      stageIndex = i;
    } else {
      break;
    }
  }
  const stageStates = thresholds.map((_, i) => {
    if (i < stageIndex) return 'done';
    if (i === stageIndex) return 'active';
    return 'pending';
  });
  return { stageIndex, stageStates };
}

/**
 * Hook: staged progress indicator berdasarkan elapsed time.
 * Berjalan saat `active` true. Reset saat `active` false.
 *
 * @param {object} opts
 * @param {number[]} opts.thresholds - timestamp mulai tiap stage (ms)
 * @param {boolean} opts.active - apakah sedang loading
 * @returns {{elapsed: number, stageIndex: number, stageStates: Array<'active'|'done'|'pending'>}}
 */
export default function useProgressStage({ thresholds, active }) {
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef(null);
  const lastRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      lastRef.current = null;
      return;
    }
    const tick = (now) => {
      if (lastRef.current == null) lastRef.current = now;
      const delta = now - lastRef.current;
      lastRef.current = now;
      setElapsed((prev) => prev + delta);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRef.current = null;
    };
  }, [active]);

  const { stageIndex, stageStates } = getProgressStage(elapsed, thresholds || []);
  return { elapsed, stageIndex, stageStates };
}

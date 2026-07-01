# Video Panduan (Animated Walkthrough) + Animasi Interpretasi AI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah animated walkthrough player (simulated video tutorial 5-scene end-to-end) di Help + StatistikGuide, dan enhance AIInterpretationPanel dengan staged progress + typing effect.

**Architecture:** WalkthroughPlayer = modal overlay dengan sequence of React-rendered mini-screens + simulated cursor (CSS transform). Pure timeline/typing/stage logic di-extract ke plain functions supaya testable di node-env (jsdom tidak terinstall, AGENTS.md larang tambah deps). AIInterpretationPanel di-enhance in-place, logic animasi juga di-extract.

**Tech Stack:** React 18, CSS Modules (theme tokens), lucide-react, Vitest (node env), pnpm via `npx pnpm`.

**Spec:** `docs/superpowers/specs/2026-07-02-walkthrough-animasi-interpretasi-design.md`

**Branch:** `feat/walkthrough-animasi` (buat dari `main`)

---

## File Structure

**Create:**
- `src/components/WalkthroughPlayer/useTimeline.js` — pure `getTimelineProgress` + hook
- `src/components/WalkthroughPlayer/scenes.js` — 5 scene definitions + inline mockups
- `src/components/WalkthroughPlayer/WalkthroughPlayer.module.css` — player + mockup styling
- `src/components/WalkthroughPlayer/index.jsx` — modal player component
- `src/components/AIInterpretationPanel/useTypingEffect.js` — pure `revealNextChunk` + hook
- `src/components/AIInterpretationPanel/useProgressStage.js` — pure `getProgressStage` + hook
- `tests/unit/useTimeline.test.js` — node-env tests
- `tests/unit/useTypingEffect.test.js` — node-env tests
- `tests/unit/useProgressStage.test.js` — node-env tests

**Modify:**
- `src/components/AIInterpretationPanel.jsx` — staged progress loading + typing result
- `src/pages/Help.jsx` — tombol "Tonton Panduan" di hero
- `src/components/StatistikGuide/index.jsx` — CTA "Lihat video panduan"
- `src/components/StatistikGuide/StatistikGuide.module.css` — `.walkthroughCta` class
- `laporan.md` — update progress

---

## Task 1: Pure logic — useTimeline (getTimelineProgress)

**Files:**
- Create: `src/components/WalkthroughPlayer/useTimeline.js`
- Test: `tests/unit/useTimeline.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/useTimeline.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx pnpm test -- --run tests/unit/useTimeline.test.js`
Expected: FAIL — `Cannot find module '../../src/components/WalkthroughPlayer/useTimeline'`

- [ ] **Step 3: Write minimal implementation**

Create `src/components/WalkthroughPlayer/useTimeline.js`:

```js
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
  for (let i = 0; i < durations.length; i++) {
    if (elapsed < durations[i]) {
      scene = i;
      break;
    }
    elapsed -= durations[i];
    if (i === durations.length - 1) {
      scene = i;
      elapsed = durations[i]; // clamp di scene terakhir
    }
  }
  const sceneProgress = durations[scene] > 0 ? Math.min(1, elapsed / durations[scene]) : 0;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx pnpm test -- --run tests/unit/useTimeline.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/WalkthroughPlayer/useTimeline.js tests/unit/useTimeline.test.js
git commit -m "feat(walkthrough): useTimeline hook + getTimelineProgress pure logic"
```

---

## Task 2: Pure logic — useTypingEffect (revealNextChunk)

**Files:**
- Create: `src/components/AIInterpretationPanel/useTypingEffect.js`
- Test: `tests/unit/useTypingEffect.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/useTypingEffect.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { revealNextChunk } from '../../src/components/AIInterpretationPanel/useTypingEffect';

describe('revealNextChunk (typing effect logic)', () => {
  const text = 'Berdasarkan uji t independen pada data pre post';

  it('count 0 → empty string, not done', () => {
    const r = revealNextChunk(text, 0, 3);
    expect(r.text).toBe('');
    expect(r.done).toBe(false);
  });

  it('count < total words → partial text, not done', () => {
    const r = revealNextChunk(text, 2, 3);
    expect(r.text).toBe('Berdasarkan uji');
    expect(r.done).toBe(false);
  });

  it('count >= total words → full text, done', () => {
    const words = text.split(/\s+/);
    const r = revealNextChunk(text, words.length, 3);
    expect(r.text).toBe(text);
    expect(r.done).toBe(true);
  });

  it('wordsPerTick = 3 → reveals 3 words per tick', () => {
    const r1 = revealNextChunk(text, 0, 3);
    expect(r1.nextCount).toBe(3);
    const r2 = revealNextChunk(text, 3, 3);
    expect(r2.nextCount).toBe(6);
    expect(r2.text).toBe('Berdasarkan uji t');
  });

  it('empty text → done immediately', () => {
    const r = revealNextChunk('', 0, 3);
    expect(r.text).toBe('');
    expect(r.done).toBe(true);
    expect(r.nextCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx pnpm test -- --run tests/unit/useTypingEffect.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `src/components/AIInterpretationPanel/useTypingEffect.js`:

```js
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Pure logic: reveal N kata berikutnya dari full text.
 * Dipisah dari hook supaya unit-testable di node env tanpa DOM.
 *
 * @param {string} fullText
 * @param {number} revealedCount - jumlah kata yang sudah ter-reveal
 * @param {number} wordsPerTick
 * @returns {{text: string, nextCount: number, done: boolean}}
 */
export function revealNextChunk(fullText, revealedCount, wordsPerTick) {
  if (!fullText) {
    return { text: '', nextCount: 0, done: true };
  }
  const words = fullText.split(/\s+/);
  const count = Math.min(revealedCount, words.length);
  const text = words.slice(0, count).join(' ');
  const done = count >= words.length;
  const nextCount = Math.min(count + wordsPerTick, words.length);
  return { text, nextCount, done };
}

/**
 * Hook: typing effect — text muncul kata-per-kata.
 *
 * @param {object} opts
 * @param {string} opts.text - full text
 * @param {boolean} opts.playing - apakah sedang animasi
 * @param {number} opts.tickMs - interval tick (ms), default 60
 * @param {number} opts.wordsPerTick - kata per tick, default 3
 * @returns {{visibleText: string, done: boolean, skip: Function}}
 */
export default function useTypingEffect({ text, playing, tickMs = 60, wordsPerTick = 3 }) {
  const [count, setCount] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    setCount(0);
  }, [text]);

  useEffect(() => {
    if (!playing || !text) return;
    const words = text.split(/\s+/);
    timerRef.current = setInterval(() => {
      setCount((prev) => {
        const next = prev + wordsPerTick;
        if (next >= words.length) {
          clearInterval(timerRef.current);
          return words.length;
        }
        return next;
      });
    }, tickMs);
    return () => clearInterval(timerRef.current);
  }, [text, playing, tickMs, wordsPerTick]);

  const { text: visibleText, done } = revealNextChunk(text || '', count, wordsPerTick);

  const skip = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCount(text ? text.split(/\s+/).length : 0);
  }, [text]);

  return { visibleText, done, skip };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx pnpm test -- --run tests/unit/useTypingEffect.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/AIInterpretationPanel/useTypingEffect.js tests/unit/useTypingEffect.test.js
git commit -m "feat(ai-panel): useTypingEffect hook + revealNextChunk pure logic"
```

---

## Task 3: Pure logic — useProgressStage (getProgressStage)

**Files:**
- Create: `src/components/AIInterpretationPanel/useProgressStage.js`
- Test: `tests/unit/useProgressStage.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/useProgressStage.test.js`:

```js
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

  it('elapsed exceeds all thresholds → all done', () => {
    const r = getProgressStage(99999, thresholds);
    expect(r.stageIndex).toBe(2);
    expect(r.stageStates).toEqual(['done', 'done', 'done']);
  });

  it('empty thresholds → safe defaults', () => {
    const r = getProgressStage(5000, []);
    expect(r.stageIndex).toBe(0);
    expect(r.stageStates).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx pnpm test -- --run tests/unit/useProgressStage.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `src/components/AIInterpretationPanel/useProgressStage.js`:

```js
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
  const stageStates = thresholds.map((t, i) => {
    if (i < stageIndex) return 'done';
    if (i === stageIndex) {
      // stage terakhir tidak pernah "active" setelah selesai — tapi di sini
      // active = sedang berjalan. Kalau elapsed melewati threshold terakhir,
      // tetap dianggap active (animasi selesai tapi tetap di stage terakhir).
      return 'active';
    }
    return 'pending';
  });
  // Kalau elapsed melebihi threshold terakhir + margin, semua done.
  // Margin: tidak ada — stage terakhir tetap active supaya spinner tetap tampil
  // sampai parent set loading=false. Tapi kalau semua sudah done flag-nya?
  // Simplifikasi: stage terakhir active selama loading.
  return { stageIndex, stageStates };
}

/**
 * Hook: staged progress indicator berdasarkan elapsed time.
 * Berjalan saat `active` true. Reset saat `active` false→true.
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx pnpm test -- --run tests/unit/useProgressStage.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/AIInterpretationPanel/useProgressStage.js tests/unit/useProgressStage.test.js
git commit -m "feat(ai-panel): useProgressStage hook + getProgressStage pure logic"
```

---

## Task 4: Enhance AIInterpretationPanel — staged progress + typing effect

**Files:**
- Modify: `src/components/AIInterpretationPanel.jsx`
- Modify (lint/imports): no new files (hooks already created in Tasks 2-3)

- [ ] **Step 1: Add imports and staging constants**

In `src/components/AIInterpretationPanel.jsx`, replace the top import block (lines 1-4) with:

```jsx
import { useState } from 'react'
import { toast } from '../lib/toast'
import { generateInterpretation } from '../lib/ai/interpretStats'
import useTypingEffect from './AIInterpretationPanel/useTypingEffect'
import useProgressStage from './AIInterpretationPanel/useProgressStage'

// Staged progress thresholds (ms): 3 langkah simulasi proses AI
const STAGE_THRESHOLDS = [0, 2500, 5000]
const STAGE_LABELS = [
  'Menganalisis hasil uji...',
  'Menyusun interpretasi akademik...',
  'Finalisasi paragraf...',
]
```

- [ ] **Step 2: Wire hooks into component**

Replace the component body opening (the `handleGenerate` and state block, lines 14-35 area) — add hook usage after the existing state. Replace this block:

```jsx
export default function AIInterpretationPanel({ result, value = '', onChange }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [provider, setProvider] = useState(null)
  const [isFallback, setIsFallback] = useState(false)
  const text = value
  const setText = (v) => onChange?.(v)
```

with:

```jsx
export default function AIInterpretationPanel({ result, value = '', onChange }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [provider, setProvider] = useState(null)
  const [isFallback, setIsFallback] = useState(false)
  const text = value
  const setText = (v) => onChange?.(v)

  const { stageIndex, stageStates } = useProgressStage({
    thresholds: STAGE_THRESHOLDS,
    active: loading,
  })
  const { visibleText, done: typingDone, skip } = useTypingEffect({
    text,
    playing: !loading && !!text,
  })
  const displayText = typingDone ? text : visibleText
```

- [ ] **Step 3: Replace loading state JSX**

Replace the loading block (the `{loading && (...)}` block, approximately lines 73-78):

```jsx
      {loading && (
        <div className="bg-card/50 border border-border/80 rounded-lg p-4 text-sm text-muted flex items-center gap-2">
          <span className="w-2 h-2 bg-muted rounded-full animate-pulse" />
          Menulis interpretasi… (biasanya 5-15 detik)
        </div>
      )}
```

with the staged progress UI:

```jsx
      {loading && (
        <div className="bg-card/50 border border-border/80 rounded-lg p-4 space-y-2.5">
          {STAGE_LABELS.map((label, i) => {
            const state = stageStates[i] || 'pending'
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                {state === 'done' ? (
                  <span className="w-4 h-4 rounded-full bg-teal-600/15 flex items-center justify-center flex-shrink-0">
                    <span className="w-1.5 h-1.5 bg-teal-600 rounded-full" />
                  </span>
                ) : state === 'active' ? (
                  <span className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin flex-shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-border flex-shrink-0" />
                )}
                <span className={state === 'active' ? 'text-fg font-medium' : 'text-muted'}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      )}
```

- [ ] **Step 4: Replace result text display with typing effect**

Replace the result text `<div className="prose ...">` block (approximately lines 93-95):

```jsx
          <div className="prose prose-sm max-w-none text-fg whitespace-pre-wrap leading-relaxed text-[13.5px]">
            {text}
          </div>
```

with the typing-effect display + skip button:

```jsx
          <div className="prose prose-sm max-w-none text-fg whitespace-pre-wrap leading-relaxed text-[13.5px]">
            {displayText}
            {!typingDone && text && (
              <span className="inline-block w-1.5 h-4 bg-accent ml-0.5 align-middle animate-pulse" />
            )}
          </div>
          {!typingDone && text && (
            <button
              onClick={skip}
              className="text-[11px] text-muted hover:text-fg border border-border hover:bg-card/50 px-2 py-1 rounded mt-2"
            >
              Tampilkan sekaligus
            </button>
          )}
```

- [ ] **Step 5: Run build to verify no errors**

Run: `npx pnpm run build`
Expected: build succeeds (no import errors, no syntax errors)

- [ ] **Step 6: Run test suite to verify no regression**

Run: `npx pnpm test -- --run`
Expected: 370 + 15 (new) passed, 9 pre-existing failed, 0 new regression

- [ ] **Step 7: Commit**

```bash
git add src/components/AIInterpretationPanel.jsx
git commit -m "feat(ai-panel): staged progress loading + typing effect interpretasi"
```

---

## Task 5: CSS module — WalkthroughPlayer styling

**Files:**
- Create: `src/components/WalkthroughPlayer/WalkthroughPlayer.module.css`

- [ ] **Step 1: Create the CSS module**

Create `src/components/WalkthroughPlayer/WalkthroughPlayer.module.css`:

```css
/* WalkthroughPlayer — animated walkthrough modal player.
   Theme tokens only: rgb(var(--accent)), rgb(var(--border)), var(--muted),
   rgb(var(--bg)), rgb(var(--card)), rgb(var(--surface)), rgb(var(--fg)). */

.overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.modal {
  background: rgb(var(--card));
  border: 1px solid rgb(var(--border));
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  max-width: 640px;
  width: 100%;
  overflow: hidden;
}

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgb(var(--border));
}

.title {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--fg));
}

.closeBtn {
  padding: 4px;
  border-radius: 6px;
  color: var(--muted);
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
}
.closeBtn:hover {
  background: rgb(var(--surface));
  color: rgb(var(--fg));
}

/* ── Player area (16:10 mockup stage) ── */
.playerArea {
  position: relative;
  aspect-ratio: 16 / 10;
  background: rgb(var(--surface));
  overflow: hidden;
}

.sceneLabel {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 5;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
  background: rgb(var(--card));
  border: 1px solid rgb(var(--border));
  border-radius: 6px;
  padding: 2px 8px;
}

/* ── Simulated cursor ── */
.cursor {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgb(var(--accent));
  z-index: 10;
  top: 0;
  left: 0;
  transform: translate(0, 0);
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.cursorClick {
  animation: cursorRipple 0.6s ease-out;
}

@keyframes cursorRipple {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--accent), 0.5);
  }
  100% {
    box-shadow: 0 0 0 16px rgba(var(--accent), 0);
  }
}

/* ── Caption ── */
.caption {
  padding: 10px 16px;
  font-size: 0.8125rem;
  font-style: italic;
  color: var(--muted);
  text-align: center;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Progress bar ── */
.progressBar {
  height: 3px;
  background: rgb(var(--border));
  position: relative;
  cursor: pointer;
}

.progressFill {
  height: 100%;
  background: rgb(var(--accent));
  transition: width 0.1s linear;
}

/* ── Controls ── */
.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px 14px;
}

.ctrlBtn {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgb(var(--border));
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}
.ctrlBtn:hover {
  background: rgb(var(--surface));
  color: rgb(var(--fg));
}
.ctrlBtn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ctrlPrimary {
  background: rgb(var(--accent));
  color: rgb(var(--accent-fg, #fff));
  border-color: rgb(var(--accent));
}
.ctrlPrimary:hover {
  background: rgb(var(--accent));
  opacity: 0.9;
}

/* ── Mockup shared ── */
.mockup {
  position: absolute;
  inset: 0;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.mockupCard {
  background: rgb(var(--card));
  border: 1px solid rgb(var(--border));
  border-radius: 8px;
  padding: 12px;
}

/* ── Scene 1: upload ── */
.uploadZone {
  border: 2px dashed rgb(var(--border));
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  color: var(--muted);
  font-size: 0.75rem;
  transition: border-color 0.3s;
}
.uploadZoneActive {
  border-color: rgb(var(--accent));
}
.fileName {
  margin-top: 8px;
  font-size: 0.75rem;
  color: rgb(var(--fg));
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
}

/* ── Scene 2: pilihan analisis ── */
.optionList {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.option {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgb(var(--border));
  font-size: 0.75rem;
  color: rgb(var(--fg));
  display: flex;
  align-items: center;
  gap: 6px;
}
.optionSelected {
  border-color: rgb(var(--accent));
  background: rgba(var(--accent), 0.08);
}

/* ── Scene 3: results table ── */
.resultTable {
  width: 100%;
  font-size: 0.6875rem;
  border-collapse: collapse;
}
.resultTable th {
  text-align: left;
  font-weight: 600;
  color: var(--muted);
  padding: 4px 8px;
  border-bottom: 1px solid rgb(var(--border));
}
.resultTable td {
  padding: 4px 8px;
  border-bottom: 1px solid rgb(var(--border));
  color: rgb(var(--fg));
}
.resultRow {
  animation: fadeInRow 0.4s ease-out;
}
@keyframes fadeInRow {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Scene 4: AI panel ── */
.aiPanel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.aiText {
  font-size: 0.6875rem;
  line-height: 1.5;
  color: rgb(var(--fg));
  min-height: 32px;
}
.typingCursor {
  display: inline-block;
  width: 4px;
  height: 10px;
  background: rgb(var(--accent));
  margin-left: 1px;
  vertical-align: middle;
  animation: blink 0.8s step-end infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}

/* ── Scene 5: export ── */
.exportBtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  background: rgb(var(--accent));
  color: rgb(var(--accent-fg, #fff));
  font-size: 0.75rem;
  font-weight: 600;
  border: none;
}
.downloadNotice {
  margin-top: 8px;
  font-size: 0.6875rem;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
  animation: fadeInRow 0.4s ease-out;
}

/* ── Finished state ── */
.finished {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
  text-align: center;
}
.finishedTitle {
  font-size: 1rem;
  font-weight: 600;
  color: rgb(var(--fg));
}
.finishedDesc {
  font-size: 0.8125rem;
  color: var(--muted);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/WalkthroughPlayer/WalkthroughPlayer.module.css
git commit -m "style(walkthrough): CSS module — player, cursor, mockup scenes (theme tokens)"
```

---

## Task 6: Scenes definition — 5 scene end-to-end

**Files:**
- Create: `src/components/WalkthroughPlayer/scenes.js`

- [ ] **Step 1: Create scenes definition with inline mockups**

Create `src/components/WalkthroughPlayer/scenes.js`:

```js
// 5 scene walkthrough end-to-end: upload → pilih uji → hasil → interpretasi AI → export.
// Tiap mockup adalah inline React element (bukan screenshot).
// Cursor target: persentase koordinat di player area (0-100).

import { FileUp, Check, Download, FileText } from 'lucide-react';
import styles from './WalkthroughPlayer.module.css';

export const SCENES = [
  {
    id: 'upload',
    durationMs: 15000,
    caption: 'Mulai dengan mengupload file CSV atau Excel Anda.',
    cursor: { x: 50, y: 55, clickAt: 3000 },
    mockup: ({ progress }) => (
      <div className={styles.mockup}>
        <div className={`${styles.mockupCard} ${styles.uploadZone} ${progress > 0.2 ? styles.uploadZoneActive : ''}`}>
          <FileUp style={{ width: 28, height: 28, margin: '0 auto 6px', display: 'block', opacity: 0.5 }} />
          <div>Drag file atau klik untuk pilih</div>
          {progress > 0.25 && (
            <div className={styles.fileName}>
              <Check style={{ width: 12, height: 12, color: 'rgb(var(--accent))' }} />
              data_prepost.csv
            </div>
          )}
        </div>
      </div>
    ),
  },
  {
    id: 'pilih-analisis',
    durationMs: 10000,
    caption: 'Pilih jenis analisis yang sesuai pertanyaan penelitian Anda.',
    cursor: { x: 40, y: 62, clickAt: 4000 },
    mockup: ({ progress }) => (
      <div className={styles.mockup}>
        <div className={styles.mockupCard}>
          <div className={styles.optionList}>
            {['Statistik Deskriptif', 'T-Test Independent', 'ANOVA', 'Regresi Linier'].map((opt, i) => {
              const selected = progress > 0.35 && i === 1;
              return (
                <div key={opt} className={`${styles.option} ${selected ? styles.optionSelected : ''}`}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', border: '1px solid rgb(var(--border))', display: 'inline-block' }} />
                  {opt}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'hasil-uji',
    durationMs: 15000,
    caption: 'Hasil uji muncul otomatis: statistik, p-value, dan effect size.',
    cursor: { x: 50, y: 50, clickAt: -1 },
    mockup: ({ progress }) => {
      const rows = [
        ['Mean (kelompok 1)', '78.4'],
        ['Mean (kelompok 2)', '72.1'],
        ['t-statistic', '2.87'],
        ['p-value', '0.006'],
        ['Cohen\'s d', '0.62'],
      ];
      const visibleCount = Math.floor(progress * rows.length * 1.5);
      return (
        <div className={styles.mockup}>
          <div className={styles.mockupCard}>
            <table className={styles.resultTable}>
              <thead>
                <tr><th>Statistik</th><th>Nilai</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, Math.min(visibleCount, rows.length)).map(([k, v]) => (
                  <tr key={k} className={styles.resultRow}>
                    <td>{k}</td><td><strong>{v}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    },
  },
  {
    id: 'interpretasi-ai',
    durationMs: 15000,
    caption: 'Klik Generate untuk interpretasi siap-paste berbahasa akademik.',
    cursor: { x: 75, y: 30, clickAt: 3000 },
    mockup: ({ progress }) => {
      const sampleText = 'Berdasarkan uji t independen pada data pre dan post, ditemukan perbedaan signifikan antara kedua kelompok (t=2.87, p=0.006). Ukuran efek Cohen\'s d sebesar 0.62 menunjukkan magnitude perbedaan yang moderate.';
      const words = sampleText.split(/\s+/);
      const wordCount = progress > 0.25 ? Math.floor((progress - 0.25) * words.length * 1.4) : 0;
      const visible = words.slice(0, Math.min(wordCount, words.length)).join(' ');
      const typing = wordCount > 0 && wordCount < words.length;
      return (
        <div className={styles.mockup}>
          <div className={`${styles.mockupCard} ${styles.aiPanel}`}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Interpretasi AI
            </div>
            {progress <= 0.25 ? (
              <div style={{ fontSize: '0.6875rem', color: 'rgb(var(--accent))', fontWeight: 500, padding: '4px 10px', border: '1px solid rgb(var(--accent))', borderRadius: 6, display: 'inline-block', width: 'fit-content' }}>
                Generate
              </div>
            ) : progress <= 0.35 ? (
              <div style={{ fontSize: '0.6875rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgb(var(--accent))', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                Menyusun interpretasi...
              </div>
            ) : (
              <div className={styles.aiText}>
                {visible}
                {typing && <span className={styles.typingCursor} />}
              </div>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: 'export',
    durationMs: 15000,
    caption: 'Export draft Hasil & Pembahasan siap-paste ke skripsi Anda.',
    cursor: { x: 65, y: 60, clickAt: 4000 },
    mockup: ({ progress }) => (
      <div className={styles.mockup}>
        <div className={styles.mockupCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <FileText style={{ width: 28, height: 28, color: 'var(--muted)' }} />
          {progress <= 0.3 ? (
            <div className={styles.exportBtn}>
              <Download style={{ width: 14, height: 14 }} />
              Export DOCX
            </div>
          ) : (
            <>
              <div className={styles.exportBtn} style={{ opacity: 0.6 }}>
                <Download style={{ width: 14, height: 14 }} />
                Export DOCX
              </div>
              <div className={styles.downloadNotice}>
                <Check style={{ width: 12, height: 12, color: 'rgb(var(--accent))' }} />
                data_hasil.docx terunduh
              </div>
            </>
          )}
        </div>
      </div>
    ),
  },
];

// Durasi array untuk useTimeline
export const SCENE_DURATIONS = SCENES.map((s) => s.durationMs);
export const TOTAL_DURATION = SCENE_DURATIONS.reduce((a, b) => a + b, 0);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/WalkthroughPlayer/scenes.js
git commit -m "feat(walkthrough): 5 scene definitions end-to-end (upload→export)"
```

---

## Task 7: WalkthroughPlayer component — modal player

**Files:**
- Create: `src/components/WalkthroughPlayer/index.jsx`

- [ ] **Step 1: Create the player component**

Create `src/components/WalkthroughPlayer/index.jsx`:

```jsx
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import styles from './WalkthroughPlayer.module.css';
import useTimeline from './useTimeline';
import { SCENES, SCENE_DURATIONS, TOTAL_DURATION } from './scenes';

/**
 * WalkthroughPlayer — modal overlay animated walkthrough.
 * Auto-play, progress bar, play/pause/replay, next/prev scene.
 *
 * @param {object} props
 * @param {Function} props.onClose - dipanggil saat modal ditutup
 * @param {Function} [props.onFinish] - dipanggil saat user klik "Coba sekarang"
 */
export default function WalkthroughPlayer({ onClose, onFinish }) {
  const [playing, setPlaying] = useState(true);
  const [clickKey, setClickKey] = useState(0); // re-trigger ripple animation
  const { elapsed, currentScene, sceneProgress, totalProgress, isDone, seek, reset } =
    useTimeline({ durations: SCENE_DURATIONS, playing });

  const scene = SCENES[currentScene];
  const Mockup = scene.mockup;
  const cursorTarget = scene.cursor;

  // Auto-advance: pause saat selesai
  useEffect(() => {
    if (isDone) setPlaying(false);
  }, [isDone]);

  // Simulate click ripple at cursor.clickAt timestamp
  const clickTriggeredRef = useRef(false);
  useEffect(() => {
    clickTriggeredRef.current = false;
  }, [currentScene]);

  useEffect(() => {
    if (clickTriggeredRef.current) return;
    if (cursorTarget.clickAt < 0) return;
    const sceneStart = SCENE_DURATIONS.slice(0, currentScene).reduce((a, b) => a + b, 0);
    const clickElapsed = elapsed - sceneStart;
    if (clickElapsed >= cursorTarget.clickAt) {
      clickTriggeredRef.current = true;
      setClickKey((k) => k + 1);
    }
  }, [elapsed, currentScene, cursorTarget.clickAt]);

  // Esc to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleNext = () => {
    const sceneStart = SCENE_DURATIONS.slice(0, currentScene + 1).reduce((a, b) => a + b, 0);
    seek(sceneStart);
    if (!playing) setPlaying(true);
  };

  const handlePrev = () => {
    if (currentScene <= 0) return;
    const sceneStart = SCENE_DURATIONS.slice(0, currentScene - 1).reduce((a, b) => a + b, 0);
    seek(sceneStart);
    if (!playing) setPlaying(true);
  };

  const handleReplay = () => {
    reset();
    setPlaying(true);
  };

  const handleSeek = (e) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(ratio * TOTAL_DURATION);
  };

  return createPortal(
    <div
      className={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.title}>Panduan Cepat — Cara Pakai</span>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Tutup">
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Player area */}
        <div className={styles.playerArea}>
          <span className={styles.sceneLabel}>
            Scene {currentScene + 1} / {SCENES.length}
          </span>
          <Mockup progress={sceneProgress} />
          {/* Simulated cursor */}
          {!isDone && cursorTarget.clickAt >= 0 && (
            <div
              key={clickKey}
              className={`${styles.cursor} ${clickKey > 0 ? styles.cursorClick : ''}`}
              style={{
                transform: `translate(${cursorTarget.x * 6.4 - 6}px, ${cursorTarget.y * 4 - 6}px)`,
              }}
            />
          )}
        </div>

        {/* Caption */}
        <div className={styles.caption}>{scene.caption}</div>

        {/* Progress bar */}
        <div className={styles.progressBar} onClick={handleSeek}>
          <div className={styles.progressFill} style={{ width: `${totalProgress * 100}%` }} />
        </div>

        {/* Controls */}
        {isDone ? (
          <div className={styles.finished}>
            <Check style={{ width: 32, height: 32, color: 'rgb(var(--accent))' }} />
            <div className={styles.finishedTitle}>Selesai!</div>
            <div className={styles.finishedDesc}>Sekarang coba sendiri — langkahnya sama seperti di atas.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleReplay} className={styles.ctrlBtn}>
                <RotateCcw style={{ width: 14, height: 14 }} /> Tonton ulang
              </button>
              <button
                onClick={() => { onClose(); onFinish?.(); }}
                className={`${styles.ctrlBtn} ${styles.ctrlPrimary}`}
              >
                <Play style={{ width: 14, height: 14 }} /> Coba sekarang
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.controls}>
            <button onClick={handlePrev} disabled={currentScene === 0} className={styles.ctrlBtn}>
              <ChevronLeft style={{ width: 14, height: 14 }} /> Prev
            </button>
            <button onClick={() => setPlaying((p) => !p)} className={`${styles.ctrlBtn} ${styles.ctrlPrimary}`}>
              {playing ? <Pause style={{ width: 14, height: 14 }} /> : <Play style={{ width: 14, height: 14 }} />}
              {playing ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={handleNext}
              disabled={currentScene === SCENES.length - 1}
              className={styles.ctrlBtn}
            >
              Next <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
            <button onClick={handleReplay} className={styles.ctrlBtn}>
              <RotateCcw style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 2: Run build to verify no errors**

Run: `npx pnpm run build`
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/WalkthroughPlayer/index.jsx
git commit -m "feat(walkthrough): WalkthroughPlayer modal — auto-play, cursor, controls"
```

---

## Task 8: Entry point — Help page button

**Files:**
- Modify: `src/pages/Help.jsx`

- [ ] **Step 1: Add import + state**

In `src/pages/Help.jsx`, add import after line 17 (`import PageHeader from '../components/PageHeader'`):

```jsx
import WalkthroughPlayer from '../components/WalkthroughPlayer'
```

Add the `useState` import — it's already imported on line 10 (`import { useState, useMemo, useEffect } from 'react'`), so no change needed there.

Add state inside the component. Find the component function opening (after the FAQ const and other consts, before the `return`).

The `Help` component uses a render structure. Find where `PageHeader` is rendered (search for `<PageHeader`). Add state right before the `return` of the component.

Find this line (the beginning of the component return area — look for `const Help`):

```jsx
export default function Help() {
```

Add `const [showWalkthrough, setShowWalkthrough] = useState(false)` as the first line inside the function body. Since the function body starts with `const FAQ = [...]` at the top of file (module scope), the actual component function is further down. Find `export default function Help()` and add the state as the first line inside it.

- [ ] **Step 2: Add walkthrough button in hero section**

In the hero button group (the `<div className="flex flex-wrap gap-2 mt-3">` block, approximately lines 362-373), add a new button before the "Panduan Skripsi" Link:

```jsx
              <button
                onClick={() => setShowWalkthrough(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ background: 'rgb(var(--accent))' }}
              >
                <Play className="w-3.5 h-3.5" /> Tonton Panduan Cepat
              </button>
```

Note: need to add `Play` to the lucide-react import on line 12-16. Change the import to include `Play`:

```jsx
import {
  HelpCircle, Search, ChevronDown, BookOpen, Compass, Calculator,
  FileText, ClipboardCheck, Award, Mail, ExternalLink,
  AlertCircle, CheckCircle2, Play,
} from 'lucide-react'
```

- [ ] **Step 3: Render the player**

At the end of the component's JSX, just before the final closing `</div>` of the page container, add:

```jsx
        {showWalkthrough && (
          <WalkthroughPlayer onClose={() => setShowWalkthrough(false)} />
        )}
```

- [ ] **Step 4: Run build to verify**

Run: `npx pnpm run build`
Expected: build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/pages/Help.jsx
git commit -m "feat(help): tombol Tonton Panduan Cepat di hero — buka WalkthroughPlayer"
```

---

## Task 9: Entry point — StatistikGuide CTA

**Files:**
- Modify: `src/components/StatistikGuide/index.jsx`
- Modify: `src/components/StatistikGuide/StatistikGuide.module.css`

- [ ] **Step 1: Add `.walkthroughCta` class to CSS module**

In `src/components/StatistikGuide/StatistikGuide.module.css`, add after the `.subtitle` block (after line 20):

```css
.walkthroughCta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgb(var(--accent));
  background: rgba(var(--accent), 0.08);
  color: rgb(var(--accent));
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 24px;
  transition: background 0.2s;
}
.walkthroughCta:hover {
  background: rgba(var(--accent), 0.15);
}
```

- [ ] **Step 2: Add import + state to StatistikGuide**

In `src/components/StatistikGuide/index.jsx`, add import after line 11 (`import FAQTab from './tabs/FAQTab'`):

```jsx
import WalkthroughPlayer from '../WalkthroughPlayer';
```

Add `Play` to a new lucide import. Add after the existing imports (after line 11):

```jsx
import { Play } from 'lucide-react';
```

Inside the `StatistikGuide` component (after `const [activeTab, setActiveTab] = useState('overview');` on line 22), add:

```jsx
  const [showWalkthrough, setShowWalkthrough] = useState(false);
```

- [ ] **Step 3: Add CTA button + player render**

In the JSX, after the `<p className={styles.subtitle}>` line (line 45), add the CTA button:

```jsx
        <button
          className={styles.walkthroughCta}
          onClick={() => setShowWalkthrough(true)}
        >
          <Play style={{ width: 14, height: 14 }} /> Lihat video panduan
        </button>
```

At the end of the component JSX, just before the final `</div>` (before line 79 `</div>`), add:

```jsx
      {showWalkthrough && (
        <WalkthroughPlayer onClose={() => setShowWalkthrough(false)} />
      )}
```

- [ ] **Step 4: Run build to verify**

Run: `npx pnpm run build`
Expected: build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/components/StatistikGuide/index.jsx src/components/StatistikGuide/StatistikGuide.module.css
git commit -m "feat(statistik-guide): CTA Lihat video panduan — buka WalkthroughPlayer"
```

---

## Task 10: Final verification + laporan.md

**Files:**
- Modify: `laporan.md`

- [ ] **Step 1: Run full test suite**

Run: `npx pnpm test -- --run`
Expected: 370 + 15 new = 385 passed, 9 pre-existing failed, 0 regression

- [ ] **Step 2: Run production build**

Run: `npx pnpm run build`
Expected: build succeeds

- [ ] **Step 3: Update laporan.md**

In `laporan.md`, update the "Berikutnya" section (around line 97-107) — mark sub-proyek C done. Update the "Log Perubahan" section — add new entry at the end:

```markdown
- **2026-07-02 (sub-proyek C — video panduan + animasi interpretasi)**: Animated walkthrough player (`WalkthroughPlayer`) — modal overlay 5 scene end-to-end (upload → pilih uji → hasil → interpretasi AI → export Bab IV) dengan simulated cursor + ripple + auto-play + progress bar + controls. Entry point: tombol "Tonton Panduan Cepat" di Help hero + CTA "Lihat video panduan" di StatistikGuide. AIInterpretationPanel di-enhance: staged progress 3 langkah (analisis → susun → finalisasi) + typing effect kata-per-kata. Pure logic di-extract (`getTimelineProgress`, `revealNextChunk`, `getProgressStage`) — testable node-env tanpa jsdom. CSS theme tokens only. Spec: `docs/superpowers/specs/2026-07-02-walkthrough-animasi-interpretasi-design.md`. Plan: `docs/superpowers/plans/2026-07-02-walkthrough-animasi-interpretasi.md`. Build OK, 385/394 test (+15 baru, 9 pre-existing ttest, 0 regresi).
```

Update the "Berikutnya" bullets: remove #4 and #5 from "belum dikerjakan" list (now done), keep #3 (output SPSS real — butuh aset), #7 (AI chat room — butuh backend), and code-split `Statistik.jsx`.

- [ ] **Step 4: Commit**

```bash
git add laporan.md
git commit -m "docs: update laporan — sub-proyek C (walkthrough + animasi) selesai"
```

- [ ] **Step 5: Merge to main + push**

```bash
git checkout main
git merge --ff-only feat/walkthrough-animasi
git push origin main
git branch -d feat/walkthrough-animasi
```

---

## Self-Review Checklist

**Spec coverage:**
- §3.1 File baru (4 files) → Tasks 1, 5, 6, 7 ✓
- §3.2 Player behavior (auto-play, progress, controls, cursor, mockup, modal, finished CTA) → Task 7 ✓
- §3.3 5 scene end-to-end → Task 6 ✓
- §3.4 Entry points (Help + StatistikGuide) → Tasks 8, 9 ✓
- §3.5 CSS classes → Task 5 ✓
- §4.1 AIInterpretationPanel enhance → Task 4 ✓
- §4.2 Pure logic files (2 files) → Tasks 2, 3 ✓
- §4.3 Reuse di walkthrough scene 4 → Task 6 (scene 4 mockup has inline staged progress + typing) ✓
- §5 Testing (15-18 tests) → Tasks 1, 2, 3 (6+5+4 = 15 tests) ✓
- §6 Constraints (frontend only, 0 deps, theme tokens, no forbidden icons) → all tasks ✓
- §8 Urutan implementasi → Tasks 1-10 follow this order ✓

**Placeholder scan:** No TBD, TODO, "implement later", or vague steps. All code blocks contain complete code. ✓

**Type consistency:**
- `getTimelineProgress(elapsedMs, durations)` — same signature in Task 1 test + impl ✓
- `revealNextChunk(fullText, revealedCount, wordsPerTick)` — same in Task 2 test + impl + Task 4 usage ✓
- `getProgressStage(elapsedMs, thresholds)` — same in Task 3 test + impl + Task 4 usage ✓
- `useTimeline({durations, playing})` returns `{elapsed, currentScene, sceneProgress, totalProgress, isDone, seek, reset}` — used in Task 7 ✓
- `SCENES` array shape `{id, durationMs, caption, cursor, mockup}` — defined Task 6, consumed Task 7 ✓
- `WalkthroughPlayer({onClose, onFinish})` — defined Task 7, used Tasks 8, 9 ✓

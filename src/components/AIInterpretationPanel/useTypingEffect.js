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
 * @param {number} [opts.tickMs=60] - interval tick (ms)
 * @param {number} [opts.wordsPerTick=3] - kata per tick
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

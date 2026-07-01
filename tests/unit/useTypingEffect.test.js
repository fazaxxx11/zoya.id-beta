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

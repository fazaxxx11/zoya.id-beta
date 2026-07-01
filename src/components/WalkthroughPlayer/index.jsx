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

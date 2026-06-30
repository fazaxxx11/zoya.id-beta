import { useState } from 'react';
import styles from './StatistikGuide.module.css';

/** Advance step, clamp at last. */
export function nextStep(step, total) {
  if (!total) return 0;
  return Math.min(step + 1, total - 1);
}

/** Retreat step, clamp at 0. */
export function prevStep(step, total) {
  if (!total) return 0;
  return Math.max(step - 1, 0);
}

/** Dot state: active | done | pending. */
export function dotState(i, step) {
  if (i === step) return 'active';
  if (i < step) return 'done';
  return 'pending';
}

const dotClass = (i, step) =>
  i === step ? styles.stepDotActive : i < step ? styles.stepDotDone : styles.stepDot;

/**
 * Stepper bersama untuk tutorial StatistikGuide.
 * Indicator: counter "Step X / Y" + dots (active/done/pending) + progress bar.
 * @param {object} props
 * @param {{title:string, desc:string}[]} props.steps
 */
export default function Stepper({ steps = [] }) {
  const [step, setStep] = useState(0);
  const total = steps.length;
  if (!total) return null;

  return (
    <div className={styles.tutorialStepper}>
      <div className={styles.stepIndicator}>
        <span data-testid="step-counter" className={styles.stepCounter}>
          Step {step + 1} / {total}
        </span>
        <div className={styles.stepDots}>
          {steps.map((_, i) => (
            <div
              key={i}
              data-testid="step-dot"
              data-state={dotState(i, step)}
              className={dotClass(i, step)}
            />
          ))}
        </div>
      </div>

      <div className={styles.stepProgress}>
        <div style={{ width: `${((step + 1) / total) * 100}%` }} />
      </div>

      <div className={styles.stepCard} key={step}>
        <h3>{steps[step].title}</h3>
        <p>{steps[step].desc}</p>
      </div>

      <div className={styles.stepBtnRow}>
        <button
          data-testid="step-back"
          className={styles.stepBtn}
          onClick={() => setStep((s) => prevStep(s, total))}
          disabled={step === 0}
        >
          ← Back
        </button>
        {step < total - 1 ? (
          <button
            data-testid="step-next"
            className={styles.stepBtn}
            onClick={() => setStep((s) => nextStep(s, total))}
          >
            Next →
          </button>
        ) : (
          <span className={styles.stepDone}>✅ Selesai!</span>
        )}
      </div>
    </div>
  );
}

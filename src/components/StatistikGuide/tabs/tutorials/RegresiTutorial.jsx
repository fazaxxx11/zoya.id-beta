import { useState } from 'react';
import styles from '../../StatistikGuide.module.css';

const steps = [
  { title: "1. Plot Data (Scatter)", desc: "Gambar scatter plot variabel X (independen) vs Y (dependen)." },
  { title: "2. Hitung Koefisien β", desc: "β = Σ(X-X̄)(Y-Ȳ) / Σ(X-X̄)². Intercept a = Ȳ - β·X̄" },
  { title: "3. Tulis Persamaan", desc: "Y = a + bX. Contoh: Y = 2.1 + 0.75X" },
  { title: "4. Cek R²", desc: "R² mendekati 1 = model fit bagus. R² = 0.94 → 94% variansi dijelaskan." },
  { title: "5. Prediksi", desc: "Masukkan nilai X baru ke persamaan untuk prediksi Y." },
];

export default function RegresiTutorial() {
  const [step, setStep] = useState(0);
  const total = steps.length;
  return (
    <div className={styles.tutorialStepper}>
      <div className={styles.stepProgress}>
        <div style={{ width: `${((step + 1) / total) * 100}%` }} />
      </div>
      <div className={styles.stepCard} key={step}>
        <h3>{steps[step].title}</h3>
        <p>{steps[step].desc}</p>
      </div>
      <div className={styles.stepBtnRow}>
        <button className={styles.stepBtn} onClick={() => setStep(s => s - 1)} disabled={step === 0}>← Back</button>
        {step < total - 1
          ? <button className={styles.stepBtn} onClick={() => setStep(s => s + 1)}>Next →</button>
          : <span className={styles.stepDone}>✅ Selesai!</span>
        }
      </div>
    </div>
  );
}

import { useState } from 'react';
import styles from '../../StatistikGuide.module.css';

const steps = [
  { title: "1. Rumuskan H₀ & H₁", desc: "H₀ = tidak ada perbedaan. H₁ = ada perbedaan/pengaruh." },
  { title: "2. Pilih Uji Statistik", desc: "t-test untuk 2 kelompok, ANOVA untuk 3+, chi-square untuk kategorik." },
  { title: "3. Hitung Nilai Uji", desc: "Masukkan data ke rumus atau SPSS untuk dapat nilai t/F/χ²." },
  { title: "4. Bandingkan p-value & α", desc: "Jika p < 0.05 → tolak H₀. Jika p ≥ 0.05 → gagal tolak H₀." },
  { title: "5. Kesimpulan", desc: "Nyatakan hasil dalam kalimat: 'Terdapat perbedaan signifikan...'" },
];

export default function InferensialTutorial() {
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

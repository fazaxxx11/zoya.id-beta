import { useState } from 'react';
import styles from '../../StatistikGuide.module.css';

const steps = [
  { title: "1. Kumpulkan Data", desc: "Susun data mentah ke dalam tabel atau daftar nilai." },
  { title: "2. Hitung Mean", desc: "Jumlahkan semua nilai lalu bagi dengan n. Contoh: (4+6+8)/3 = 6" },
  { title: "3. Cari Median", desc: "Urutkan data, ambil nilai tengah. Jika n genap, rata-rata 2 nilai tengah." },
  { title: "4. Tentukan Mode", desc: "Nilai yang paling sering muncul dalam data." },
  { title: "5. Interpretasi", desc: "Bandingkan mean/median/mode untuk memahami distribusi data." },
];

export default function DeskriptifTutorial() {
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

import Stepper from '../../Stepper';

const steps = [
  { title: "1. Plot Data (Scatter)", desc: "Gambar scatter plot variabel X (independen) vs Y (dependen)." },
  { title: "2. Hitung Koefisien β", desc: "β = Σ(X-X̄)(Y-Ȳ) / Σ(X-X̄)². Intercept a = Ȳ - β·X̄" },
  { title: "3. Tulis Persamaan", desc: "Y = a + bX. Contoh: Y = 2.1 + 0.75X" },
  { title: "4. Cek R²", desc: "R² mendekati 1 = model fit bagus. R² = 0.94 → 94% variansi dijelaskan." },
  { title: "5. Prediksi", desc: "Masukkan nilai X baru ke persamaan untuk prediksi Y." },
];

export default function RegresiTutorial() {
  return <Stepper steps={steps} />;
}

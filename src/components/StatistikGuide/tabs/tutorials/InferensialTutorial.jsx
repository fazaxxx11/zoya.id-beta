import Stepper from '../../Stepper';

const steps = [
  { title: "1. Rumuskan H₀ & H₁", desc: "H₀ = tidak ada perbedaan. H₁ = ada perbedaan/pengaruh." },
  { title: "2. Pilih Uji Statistik", desc: "t-test untuk 2 kelompok, ANOVA untuk 3+, chi-square untuk kategorik." },
  { title: "3. Hitung Nilai Uji", desc: "Masukkan data ke rumus atau SPSS untuk dapat nilai t/F/χ²." },
  { title: "4. Bandingkan p-value & α", desc: "Jika p < 0.05 → tolak H₀. Jika p ≥ 0.05 → gagal tolak H₀." },
  { title: "5. Kesimpulan", desc: "Nyatakan hasil dalam kalimat: 'Terdapat perbedaan signifikan...'" },
];

export default function InferensialTutorial() {
  return <Stepper steps={steps} />;
}

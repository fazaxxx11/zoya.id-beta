import Stepper from '../../Stepper';

const steps = [
  { title: "1. Kumpulkan Data", desc: "Susun data mentah ke dalam tabel atau daftar nilai." },
  { title: "2. Hitung Mean", desc: "Jumlahkan semua nilai lalu bagi dengan n. Contoh: (4+6+8)/3 = 6" },
  { title: "3. Cari Median", desc: "Urutkan data, ambil nilai tengah. Jika n genap, rata-rata 2 nilai tengah." },
  { title: "4. Tentukan Mode", desc: "Nilai yang paling sering muncul dalam data." },
  { title: "5. Interpretasi", desc: "Bandingkan mean/median/mode untuk memahami distribusi data." },
];

export default function DeskriptifTutorial() {
  return <Stepper steps={steps} />;
}

import { Link } from 'react-router-dom'
import {
  BarChart3, FileText, History, CheckCircle, ArrowRight,
  User, LogOut, Compass, ClipboardList, Brain, PenTool,
} from 'lucide-react'
import { BRAND_NAME } from '../lib/brand'
import { logoutUser } from '../lib/auth'
import { useCurrentUser } from '../lib/useCurrentUser'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'

// ============================================================
// Data
// ============================================================
const MODULES = [
  {
    title: 'Olah Data',
    desc: 'Upload dataset, pilih analisis, dapatkan hasil statistik lengkap — dari deskriptif sampai regresi berganda.',
    icon: BarChart3,
    href: '/statistik',
    cta: 'Mulai Olah Data',
    tags: ['Deskriptif', 'Normalitas', 'Korelasi', 'ANOVA'],
    note: 'Interpretasi otomatis untuk setiap hasil',
  },
  {
    title: 'Instrumen Penelitian',
    desc: 'Rancang kuesioner, tentukan sampel, kelola referensi — siap untuk validasi dan uji coba.',
    icon: ClipboardList,
    href: '/kuesioner',
    cta: 'Buat Instrumen',
    tags: ['Kuesioner', 'Sampling', 'Butir Soal'],
    note: 'Dibantu AI untuk generate item',
  },
  {
    title: 'Interpretasi & Laporan',
    desc: 'Pahami hasil statistik dan susun laporan Bab IV — format akademik, siap pakai.',
    icon: FileText,
    href: '/statistik?tool=deskriptif',
    cta: 'Interpretasi Hasil',
    tags: ['Interpretasi', 'Export Excel', 'Export PDF'],
    note: 'Asisten penelitian untuk penulisan',
  },
  {
    title: 'Assessment Akademik',
    desc: 'Skoring otomatis untuk esai, tugas, dan jawaban siswa — konsisten dengan rubrik Anda.',
    icon: PenTool,
    href: '/assessment',
    cta: 'Buat Assessment',
    tags: ['Penilaian Esai', 'Rubrik Builder', 'Laporan Hasil'],
    note: 'Dibantu AI — skoring konsisten',
  },
]

const AUDIENCES = [
  { label: 'Mahasiswa skripsi/tesis', desc: 'Analisis data, validasi instrumen, susun Bab IV' },
  { label: 'Dosen pembimbing', desc: 'Verifikasi hasil, skoring tugas, feedback' },
  { label: 'Peneliti kuantitatif', desc: 'Uji hipotesis, regresi, non-parametrik, EFA' },
  { label: 'Guru & dosen', desc: 'Rubrik, penilaian esai, laporan hasil belajar' },
]

const PRINCIPLES = [
  { title: 'Metode transparan', desc: 'Setiap hasil menampilkan metode statistik, formula, dan asumsi yang digunakan.' },
  { title: 'Dapat diverifikasi', desc: 'Seluruh hasil dapat dicocokkan dengan R atau SPSS — tidak ada yang "hitam box".' },
  { title: 'Format akademik', desc: 'Pelaporan mengikuti standar APA 7th edition untuk skripsi, tesis, dan jurnal.' },
  { title: 'Tanpa registrasi', desc: 'Hitung langsung di browser — data tidak dikirim ke server.' },
]

// ============================================================
// Component
// ============================================================
function Home() {
  const user = useCurrentUser()
  const handleLogout = () => logoutUser()

  return (
    <div className="min-h-screen bg-bg text-fg">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-5 py-3.5 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="text-lg font-semibold tracking-tight">{BRAND_NAME}</span>
          </Link>

          <nav className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/order" className="text-sm text-muted hover:text-fg transition-colors hidden sm:inline">
              Riwayat
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="text-sm text-muted hover:text-fg transition-colors">
                  {user.name}
                </Link>
                <button onClick={handleLogout} className="text-sm text-muted hover:text-red-500 transition-colors" aria-label="Logout">
                  Keluar
                </button>
              </>
            ) : (
              <Link to="/auth" className="text-sm font-medium px-4 py-2 rounded-lg bg-accent text-white hover:opacity-90 transition-opacity">
                Masuk
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-20 pb-16 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-medium tracking-widest uppercase text-accent mb-4">Platform Penelitian</p>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-snug mb-5">
            Olah data penelitian, pahami hasil statistik,{' '}
            <span className="text-accent">dan susun laporan akademik</span>{' '}
            dalam satu alur.
          </h1>

          <p className="text-base text-muted max-w-xl mx-auto leading-relaxed mb-8">
            Zoya membantu mahasiswa, dosen, dan peneliti mengolah data,
            memahami hasil, membuat instrumen, dan menyusun laporan —
            seluruh alur penelitian dalam satu tempat.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={user ? '/wizard' : '/auth?redirect=%2Fwizard'}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-white font-medium hover:opacity-90 transition-opacity"
            >
              {user ? 'Mulai dari Wizard' : 'Mulai Gratis'}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#modul" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-sm font-medium hover:bg-card transition-colors">
              Lihat Modul
            </a>
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <section className="border-y border-border bg-card/50">
        <div className="max-w-5xl mx-auto px-5 py-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted">
          {['Dibuat untuk penelitian kuantitatif', 'Metode statistik transparan', 'Export laporan akademik', 'Diverifikasi R/SPSS'].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── Modules ── */}
      <section id="modul" className="py-16 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-1">Modul</h2>
            <p className="text-sm text-muted">Empat langkah utama dalam alur penelitian Anda.</p>
          </div>

          <div className="space-y-4">
            {MODULES.map((mod) => {
              const Ic = mod.icon
              return (
                <Link
                  key={mod.title}
                  to={mod.href}
                  className="group block p-5 rounded-xl border border-border bg-card hover:border-accent/40 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Ic className="w-5 h-5 text-accent" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base mb-1 group-hover:text-accent transition-colors">{mod.title}</h3>
                      <p className="text-sm text-muted leading-relaxed mb-3">{mod.desc}</p>

                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {mod.tags.map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded bg-border/50 text-muted">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Brain className="w-3 h-3" />
                          {mod.note}
                        </span>
                        <span className="text-xs font-medium text-accent flex items-center gap-1 group-hover:gap-2 transition-all">
                          {mod.cta} <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Who is this for ── */}
      <section className="py-16 px-5 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-1">Cocok untuk</h2>
            <p className="text-sm text-muted">Siapa saja yang bekerja dengan data penelitian.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AUDIENCES.map(a => (
              <div key={a.label} className="p-4 rounded-xl border border-border bg-card">
                <h3 className="font-semibold text-sm mb-1">{a.label}</h3>
                <p className="text-xs text-muted leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Method transparency ── */}
      <section className="py-16 px-5 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-1">Transparansi Metode</h2>
            <p className="text-sm text-muted">Setiap hasil analisis dapat diverifikasi dan ditelusuri.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRINCIPLES.map(p => (
              <div key={p.title} className="p-4 rounded-xl border border-border bg-card">
                <h3 className="font-semibold text-sm mb-1">{p.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sample output ── */}
      <section className="py-16 px-5 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-1">Contoh Hasil</h2>
            <p className="text-sm text-muted">Tabel rapi, interpretasi jelas, format siap pakai.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Tabel Validitas */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-card">
                <h3 className="font-semibold text-sm">Tabel Validitas</h3>
              </div>
              <div className="p-5">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 text-left font-medium text-muted">Item</th>
                      <th className="py-2 text-left font-medium text-muted">r</th>
                      <th className="py-2 text-left font-medium text-muted">p</th>
                      <th className="py-2 text-left font-medium text-muted">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50"><td className="py-2">Q1</td><td className="py-2">0.812</td><td className="py-2">&lt;0.001</td><td className="py-2 text-emerald-600 font-medium">Valid</td></tr>
                    <tr className="border-b border-border/50"><td className="py-2">Q2</td><td className="py-2">0.756</td><td className="py-2">&lt;0.001</td><td className="py-2 text-emerald-600 font-medium">Valid</td></tr>
                    <tr><td className="py-2">Q3</td><td className="py-2">0.234</td><td className="py-2">0.087</td><td className="py-2 text-red-500 font-medium">Tidak Valid</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cronbach Alpha */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-card">
                <h3 className="font-semibold text-sm">Reliabilitas</h3>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted">Cronbach's α</span><span className="font-semibold">0.847</span></div>
                <div className="flex justify-between"><span className="text-muted">Jumlah item</span><span>15</span></div>
                <div className="flex justify-between"><span className="text-muted">Status</span><span className="font-medium text-emerald-600">Reliabel</span></div>
                <p className="text-[11px] text-muted italic pt-2 border-t border-border">α ≥ 0.7 dianggap reliabel (Nunnally, 1978)</p>
              </div>
            </div>

            {/* Regresi */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-card">
                <h3 className="font-semibold text-sm">Regresi Linear</h3>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted">R²</span><span className="font-semibold">0.634</span></div>
                <div className="flex justify-between"><span className="text-muted">F(2, 97)</span><span>83.21</span></div>
                <div className="flex justify-between"><span className="text-muted">p-value</span><span className="text-emerald-600 font-medium">&lt;0.001</span></div>
                <div className="flex justify-between"><span className="text-muted">Persamaan</span><span className="font-mono text-xs">Y = 2.31 + 0.54X</span></div>
              </div>
            </div>

            {/* Narasi */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-card flex items-center justify-between">
                <h3 className="font-semibold text-sm">Narasi Bab IV</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-accent/10 text-accent font-medium">dibantu AI</span>
              </div>
              <div className="p-5">
                <p className="text-sm text-muted leading-relaxed">
                  Hasil analisis regresi menunjukkan bahwa variabel X secara simultan berpengaruh signifikan
                  terhadap Y (F = 83.21, p &lt; 0.001). Kontribusi variabel X terhadap Y adalah 63.4%
                  (R² = 0.634), sedangkan sisanya dipengaruhi variabel lain.
                </p>
              </div>
            </div>

            {/* Rubrik */}
            <div className="rounded-xl border border-border bg-card overflow-hidden md:col-span-2">
              <div className="px-5 py-3 border-b border-border bg-card flex items-center justify-between">
                <h3 className="font-semibold text-sm">Rubrik Assessment</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-accent/10 text-accent font-medium">dibantu AI</span>
              </div>
              <div className="p-5">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 text-left font-medium text-muted">Aspek</th>
                      <th className="py-2 text-left font-medium text-muted">Skor</th>
                      <th className="py-2 text-left font-medium text-muted">Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50"><td className="py-2">Isi</td><td className="py-2 font-semibold">85</td><td className="py-2 text-muted">Argumen kuat, data pendukung lengkap</td></tr>
                    <tr className="border-b border-border/50"><td className="py-2">Struktur</td><td className="py-2 font-semibold">78</td><td className="py-2 text-muted">Tata bahasa baik, kurang transisi antar paragraf</td></tr>
                    <tr><td className="py-2">Referensi</td><td className="py-2 font-semibold">90</td><td className="py-2 text-muted">Sumber terkini dan relevan</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-16 px-5 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Cara Kerja</h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
            {[
              { n: '1', t: 'Upload Data', d: 'CSV, Excel, atau input manual' },
              { n: '2', t: 'Pilih Analisis', d: 'Statistik atau instrumen' },
              { n: '3', t: 'Dapat Hasil', d: 'Tabel, grafik, interpretasi' },
              { n: '4', t: 'Export', d: 'PDF atau Excel, format APA 7' },
            ].map(s => (
              <div key={s.n} className="text-center">
                <span className="inline-flex w-8 h-8 rounded-full border border-border items-center justify-center text-xs font-semibold text-accent mb-3">{s.n}</span>
                <h3 className="font-semibold text-sm mb-1">{s.t}</h3>
                <p className="text-xs text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-6 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span className="text-sm font-medium">{BRAND_NAME}</span>
          </div>
          <nav className="flex items-center gap-4 text-xs text-muted">
            <Link to="/help" className="hover:text-fg transition-colors">Bantuan</Link>
            <Link to="/feedback" className="hover:text-fg transition-colors">Saran</Link>
            <Link to="/pengaturan" className="hover:text-fg transition-colors">Pengaturan</Link>
            <Link to="/privasi" className="hover:text-fg transition-colors">Privasi</Link>
            <Link to="/syarat" className="hover:text-fg transition-colors">Syarat</Link>
          </nav>
          <p className="text-xs text-muted">© 2026 {BRAND_NAME}</p>
        </div>
      </footer>
    </div>
  )
}

export default Home

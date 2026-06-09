import { Link } from 'react-router-dom'
import {
  BarChart3, FileText, History, ChevronRight, CheckCircle, ArrowRight,
  User, LogOut, Compass, ClipboardList, Users, Brain, FileSpreadsheet,
  FlaskConical, MessageSquare, PenTool,
} from 'lucide-react'
import { BRAND_NAME, BRAND_TAGLINE } from '../lib/brand'
import { logoutUser } from '../lib/auth'
import { useCurrentUser } from '../lib/useCurrentUser'
import ThemeToggle from '../components/ThemeToggle'
import Logo from '../components/Logo'

// ============================================================
// 4 Modul Utama — task-based flow
// ============================================================
const MODULES = [
  {
    id: 'olah-data',
    title: 'Olah Data',
    tagline: 'Upload dataset, pilih analisis, dapatkan hasil statistik lengkap.',
    icon: BarChart3,
    gradient: 'from-sky-500 to-blue-500',
    href: '/statistik',
    cta: 'Mulai Olah Data',
    tools: [
      { label: 'Deskriptif', href: '/statistik?tool=deskriptif' },
      { label: 'Normalitas', href: '/statistik?tool=normalitas' },
      { label: 'Korelasi', href: '/statistik?tool=korelasi' },
      { label: 'T-Test', href: '/statistik?tool=ttest' },
      { label: 'ANOVA', href: '/statistik?tool=anova' },
      { label: 'Regresi', href: '/statistik?tool=regresi' },
    ],
    ai: 'Interpretasi otomatis untuk setiap hasil analisis',
  },
  {
    id: 'instrumen',
    title: 'Instrumen Penelitian',
    tagline: 'Rancang kuesioner, tentukan sampel, kelola referensi.',
    icon: ClipboardList,
    gradient: 'from-emerald-500 to-teal-500',
    href: '/kuesioner',
    cta: 'Buat Instrumen',
    tools: [
      { label: 'Kuesioner', href: '/kuesioner' },
      { label: 'Sampling', href: '/sampling' },
      { label: 'Butir Soal', href: '/butir-soal' },
      { label: 'Referensi', href: '/referensi' },
      { label: 'Kualitatif', href: '/kualitatif' },
    ],
    ai: 'Dibantu AI untuk generate item & validasi instrumen',
  },
  {
    id: 'interpretasi',
    title: 'Interpretasi & Laporan',
    tagline: 'Pahami hasil statistik dan susun laporan Bab IV.',
    icon: FileText,
    gradient: 'from-violet-500 to-purple-500',
    href: '/statistik?tool=deskriptif',
    cta: 'Interpretasi Hasil',
    tools: [
      { label: 'Interpretasi AI', href: '/statistik?tool=deskriptif' },
      { label: 'Export Excel', href: '/statistik?tool=deskriptif' },
      { label: 'Export PDF', href: '/statistik?tool=deskriptif' },
      { label: 'Riwayat Analisis', href: '/statistik/history' },
      { label: 'Bandingkan Hasil', href: '/statistik/compare' },
    ],
    ai: 'Asisten penelitian untuk interpretasi & penulisan',
  },
  {
    id: 'assessment',
    title: 'Assessment Akademik',
    tagline: 'Skoring otomatis untuk esai, tugas, dan jawaban siswa.',
    icon: PenTool,
    gradient: 'from-orange-500 to-amber-500',
    href: '/assessment',
    cta: 'Buat Assessment',
    tools: [
      { label: 'Penilaian Esai', href: '/assessment' },
      { label: 'Rubrik Builder', href: '/assessment' },
      { label: 'Laporan Hasil', href: '/assessment/report' },
    ],
    ai: 'Dibantu AI — skoring konsisten dengan rubrik Anda',
  },
]

const AUDIENCES = [
  { icon: '🎓', label: 'Mahasiswa skripsi/tesis', desc: 'Analisis data, validasi instrumen, susun Bab IV' },
  { icon: '👨‍🏫', label: 'Dosen pembimbing', desc: 'Verifikasi hasil, skoring tugas, feedback otomatis' },
  { icon: '🔬', label: 'Peneliti kuantitatif', desc: 'Uji hipotesis, regresi, non-parametrik, EFA' },
  { icon: '📝', label: 'Guru/dosen pembuat assessment', desc: 'Rubrik, penilaian esai, laporan hasil belajar' },
]

const METHOD_TRANSPARENCY = [
  { title: 'Metode ditampilkan', desc: 'Setiap hasil analisis menampilkan metode statistik yang digunakan, termasuk formula dan asumsi.' },
  { title: 'Parameter kunci', desc: 'Nilai uji, p-value, effect size, dan confidence interval — semua tercantum dalam tabel yang jelas.' },
  { title: 'Interpretasi terverifikasi', desc: 'Interpretasi mengacu pada literatur akademik dan dapat diverifikasi dengan R/SPSS.' },
  { title: 'Format APA 7', desc: 'Pelaporan mengikuti standar APA 7th edition untuk skripsi, tesis, dan jurnal.' },
]

// ============================================================
// Trust signals
// ============================================================
const TRUST = [
  'Kalkulasi di browser',
  'Hasil diverifikasi R/SPSS',
  'Format APA 7',
  'Bootstrap 5000 resamples',
]

function Home() {
  const user = useCurrentUser()
  const handleLogout = () => { logoutUser() }

  return (
    <div className="min-h-screen relative bg-pattern">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-bg/60 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="transition-transform group-hover:scale-110">
              <Logo size={40} />
            </div>
            <span className="text-xl font-bold text-gradient">{BRAND_NAME}</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/order" className="btn-ghost text-sm">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Pesanan</span>
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="btn-ghost">
                  <div className="w-8 h-8 bg-accent/15 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-accent" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{user.name}</span>
                </Link>
                <button onClick={handleLogout} className="btn-ghost text-muted hover:text-rose-500" aria-label="Logout">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <Link to="/auth" className="btn-primary text-sm py-2 px-4">
                <span className="hidden sm:inline">Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5 leading-tight">
            Olah data penelitian, pahami hasil statistik,
            <br />
            <span className="text-gradient">dan susun laporan akademik</span>
            <br />
            dalam satu alur.
          </h1>

          <p className="text-base md:text-lg text-muted mb-8 max-w-2xl mx-auto leading-relaxed">
            Platform terverifikasi untuk analisis statistik, pembuatan instrumen,
            interpretasi hasil, dan penilaian akademik — seluruh alur penelitian dalam satu tempat.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link
              to={user ? '/wizard' : '/auth?redirect=%2Fwizard'}
              className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              style={{ background: 'linear-gradient(135deg, rgb(99 102 241), rgb(168 85 247))' }}
            >
              <Compass className="w-5 h-5" />
              <span>{user ? 'Mulai dari Wizard' : 'Mulai Gratis'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#modul"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-border/60 hover:border-accent/40 hover:bg-white dark:hover:bg-white/5 font-medium transition-all"
            >
              Lihat Semua Modul
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted">
            {TRUST.map(t => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4 MODULES ─── */}
      <section id="modul" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Empat Modul, Satu Alur</h2>
            <p className="text-muted">Pilih langkah Anda — setiap modul saling terhubung.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {MODULES.map((mod, idx) => {
              const Ic = mod.icon
              return (
                <div
                  key={mod.id}
                  className="group relative bg-white dark:bg-white/[0.03] rounded-2xl border border-border/60 hover:border-accent/30 transition-all duration-300 hover:shadow-lg overflow-hidden"
                >
                  {/* Gradient accent bar */}
                  <div className={`h-1 bg-gradient-to-r ${mod.gradient}`} />

                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center text-white shadow-md`}>
                        <Ic className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold">{mod.title}</h3>
                        <p className="text-sm text-muted mt-0.5">{mod.tagline}</p>
                      </div>
                    </div>

                    {/* Tool list — compact */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {mod.tools.map(tool => (
                        <Link
                          key={tool.label}
                          to={tool.href}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-accent/10 hover:text-accent transition-colors font-medium"
                        >
                          {tool.label}
                        </Link>
                      ))}
                    </div>

                    {/* AI badge — subtle, not dominant */}
                    <div className="flex items-center gap-2 text-xs text-muted mb-4">
                      <Brain className="w-3.5 h-3.5 text-sky-500" />
                      <span className="text-sky-700 dark:text-sky-300">{mod.ai}</span>
                    </div>

                    {/* CTA */}
                    <Link
                      to={mod.href}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r ${mod.gradient} text-white text-sm font-medium shadow-md hover:shadow-lg hover:gap-3 transition-all duration-300`}
                    >
                      {mod.cta}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── COCOK UNTUK ─── */}
      <section className="py-16 px-4 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Cocok untuk</h2>
          <p className="text-muted text-center mb-10 max-w-xl mx-auto">Dirancang untuk siapa saja yang bekerja dengan data penelitian.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AUDIENCES.map((a) => (
              <div key={a.label} className="p-5 rounded-xl bg-white dark:bg-white/[0.03] border border-border/50 hover:border-accent/30 transition-all">
                <div className="text-2xl mb-2">{a.icon}</div>
                <h3 className="font-semibold text-sm mb-1">{a.label}</h3>
                <p className="text-xs text-muted">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TRANSPARANSI METODE ─── */}
      <section className="py-16 px-4 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Transparansi Metode</h2>
          <p className="text-muted text-center mb-10 max-w-xl mx-auto">Setiap hasil analisis dapat diverifikasi dan ditelusuri sumbernya.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {METHOD_TRANSPARENCY.map((m) => (
              <div key={m.title} className="flex items-start gap-3 p-5 rounded-xl bg-white dark:bg-white/[0.03] border border-border/50">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">{m.title}</h3>
                  <p className="text-xs text-muted">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PREVIEW OUTPUT ─── */}
      <section className="py-16 px-4 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Contoh Hasil</h2>
          <p className="text-muted text-center mb-10 max-w-xl mx-auto">Ini yang akan Anda dapatkan — tabel rapi, interpretasi jelas, format siap pakai.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Validitas */}
            <div className="p-5 rounded-xl bg-white dark:bg-white/[0.03] border border-border/50">
              <h3 className="font-semibold text-sm mb-2">Tabel Validitas</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b"><th className="py-1.5 text-left font-medium text-muted">Item</th><th className="py-1.5 text-left font-medium text-muted">r</th><th className="py-1.5 text-left font-medium text-muted">p</th><th className="py-1.5 text-left font-medium text-muted">Verdict</th></tr></thead>
                  <tbody className="divide-y divide-border/30">
                    <tr><td className="py-1.5">Q1</td><td className="py-1.5">0.812</td><td className="py-1.5">&lt;0.001</td><td className="py-1.5 text-emerald-600 font-medium">Valid ✓</td></tr>
                    <tr><td className="py-1.5">Q2</td><td className="py-1.5">0.756</td><td className="py-1.5">&lt;0.001</td><td className="py-1.5 text-emerald-600 font-medium">Valid ✓</td></tr>
                    <tr><td className="py-1.5">Q3</td><td className="py-1.5">0.234</td><td className="py-1.5">0.087</td><td className="py-1.5 text-red-600 font-medium">Tidak Valid</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            {/* Cronbach Alpha */}
            <div className="p-5 rounded-xl bg-white dark:bg-white/[0.03] border border-border/50">
              <h3 className="font-semibold text-sm mb-2">Reliabilitas (Cronbach's α)</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted">Cronbach's α</span><span className="font-bold text-sky-600">0.847</span></div>
                <div className="flex justify-between"><span className="text-muted">N item</span><span className="font-medium">15</span></div>
                <div className="flex justify-between"><span className="text-muted">Status</span><span className="font-medium text-emerald-600">Reliabel ✓</span></div>
              </div>
              <p className="text-[10px] text-muted mt-2 italic">α ≥ 0.7 dianggap reliabel (Nunnally, 1978)</p>
            </div>
            {/* Regresi */}
            <div className="p-5 rounded-xl bg-white dark:bg-white/[0.03] border border-border/50">
              <h3 className="font-semibold text-sm mb-2">Regresi Linear</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted">R²</span><span className="font-bold text-sky-600">0.634</span></div>
                <div className="flex justify-between"><span className="text-muted">F(2, 97)</span><span className="font-medium">83.21</span></div>
                <div className="flex justify-between"><span className="text-muted">p-value</span><span className="font-medium text-emerald-600">&lt;0.001</span></div>
                <div className="flex justify-between"><span className="text-muted">Persamaan</span><span className="font-mono text-[10px]">Y = 2.31 + 0.54X</span></div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            {/* Narasi BAB IV */}
            <div className="p-5 rounded-xl bg-white dark:bg-white/[0.03] border border-border/50">
              <h3 className="font-semibold text-sm mb-2">Narasi BAB IV <span className="text-xs font-normal text-sky-600">dibantu AI</span></h3>
              <p className="text-xs text-muted leading-relaxed">Hasil analisis regresi menunjukkan bahwa variabel X secara simultan berpengaruh signifikan terhadap Y (F = 83.21, p &lt; 0.001). Kontribusi variabel X terhadap Y adalah 63.4% (R² = 0.634), sedangkan sisanya 36.6% dipengaruhi variabel lain.</p>
            </div>
            {/* Rubrik */}
            <div className="p-5 rounded-xl bg-white dark:bg-white/[0.03] border border-border/50">
              <h3 className="font-semibold text-sm mb-2">Rubrik Assessment <span className="text-xs font-normal text-sky-600">dibantu AI</span></h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b"><th className="py-1.5 text-left font-medium text-muted">Aspek</th><th className="py-1.5 text-left font-medium text-muted">Skor</th><th className="py-1.5 text-left font-medium text-muted">Feedback</th></tr></thead>
                  <tbody className="divide-y divide-border/30">
                    <tr><td className="py-1.5">Isi</td><td className="py-1.5 font-bold">85</td><td className="py-1.5 text-muted">Argumen kuat, data pendukung lengkap</td></tr>
                    <tr><td className="py-1.5">Struktur</td><td className="py-1.5 font-bold">78</td><td className="py-1.5 text-muted">Tata bahasa baik, kurang transisi antar paragraf</td></tr>
                    <tr><td className="py-1.5">Referensi</td><td className="py-1.5 font-bold">90</td><td className="py-1.5 text-muted">Sumber terkini dan relevan</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-16 px-4 border-t border-border/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">Cara Kerja</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Connector */}
            <div className="hidden md:block absolute top-6 left-[12.5%] right-[12.5%] h-px"
                 style={{ background: 'linear-gradient(to right, transparent, rgb(var(--border)), transparent)' }} />

            {[
              { step: '1', title: 'Upload Data', desc: 'CSV, Excel, atau input manual' },
              { step: '2', title: 'Pilih Analisis', desc: 'Statistik atau instrumen penelitian' },
              { step: '3', title: 'Dapat Hasil', desc: 'Tabel, grafik, interpretasi' },
              { step: '4', title: 'Export Laporan', desc: 'PDF atau Excel, format APA 7' },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="w-12 h-12 rounded-xl bg-bg border-2 border-accent/30 flex items-center justify-center text-lg font-bold text-accent mx-auto mb-3 glass">
                  {item.step}
                </div>
                <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-muted text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border/40 py-8 px-4 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="font-bold text-sm text-gradient">{BRAND_NAME}</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
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

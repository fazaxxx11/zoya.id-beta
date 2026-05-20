import { Link, useNavigate } from 'react-router-dom'
import {
  BarChart3, FileText, History, ChevronRight, Sparkles, Calculator,
  CheckCircle, ArrowRight, User, LogOut, TrendingUp, Zap, Award, ClipboardList, Users,
  Beaker, PenTool, Activity, Layers, FlaskConical, Settings as SettingsIcon,
  Compass,
} from 'lucide-react'
import { BRAND_NAME, BRAND_TAGLINE } from '../lib/brand'
import { logoutUser } from '../lib/auth'
import { useCurrentUser } from '../lib/useCurrentUser'
import ThemeToggle from '../components/ThemeToggle'
import Logo from '../components/Logo'

// ============================================================
// 3 kategori utama — semua tool dikelompokkan di sini
// ============================================================
const CATEGORIES = [
  {
    id: 'statistik',
    title: 'Analisis Statistik',
    tagline: 'Uji hipotesis, regresi, ANOVA — SPSS-style di browser',
    icon: BarChart3,
    gradient: 'from-sky-500 to-cyan-500',
    bgGlow: 'rgb(56 189 248 / 0.15)',
    primaryHref: '/statistik',
    primaryLabel: 'Buka Statistik',
    tools: [
      { title: 'Deskriptif',       desc: 'Mean, median, std dev',         href: '/statistik?tool=deskriptif' },
      { title: 'Validitas & Reliabilitas', desc: 'Pearson, Cronbach α',  href: '/statistik?tool=validitas' },
      { title: 'Korelasi',         desc: 'Pearson, Spearman',             href: '/statistik?tool=korelasi' },
      { title: 'Regresi Linier',   desc: 'Sederhana & ganda',             href: '/statistik?tool=regresi' },
      { title: 'Uji-t & ANOVA',    desc: 'Beda mean 2+ kelompok',         href: '/statistik?tool=ttest' },
      { title: 'N-Gain',           desc: 'Pre-test vs post-test',         href: '/statistik?tool=ngain' },
      { title: 'Regresi Logistik', desc: 'Outcome biner, OR, ROC/AUC',    href: '/logistik' },
      { title: 'EFA',              desc: 'Validitas konstruk: KMO, Bartlett, loading', href: '/efa' },
      { title: 'Mediasi & Moderasi', desc: 'Hayes Model 1 & 4 + bootstrap', href: '/mediasi' },
    ],
  },
  {
    id: 'assessment',
    title: 'Penilaian Tulisan',
    tagline: 'Skoring esai/jawaban siswa otomatis dengan AI + rubrik',
    icon: PenTool,
    gradient: 'from-orange-500 to-rose-500',
    bgGlow: 'rgb(244 114 182 / 0.15)',
    primaryHref: '/assessment',
    primaryLabel: 'Mulai Assessment',
    tools: [
      { title: 'Penilaian Esai AI', desc: 'Per siswa atau batch',         href: '/assessment' },
      { title: 'Rubrik Builder',    desc: 'Bobot kriteria custom',        href: '/assessment' },
      { title: 'Laporan Hasil',     desc: 'Distribusi skor + komentar',   href: '/assessment' },
    ],
  },
  {
    id: 'metodologi',
    title: 'Metodologi & Instrumen',
    tagline: 'Sampling, kuesioner, manajemen instrumen penelitian',
    icon: FlaskConical,
    gradient: 'from-emerald-500 to-teal-500',
    bgGlow: 'rgb(16 185 129 / 0.15)',
    primaryHref: '/sampling',
    primaryLabel: 'Hitung Sampel',
    tools: [
      { title: 'Penentuan Sampel',     desc: 'Slovin, Krejcie, Cochran',        href: '/sampling' },
      { title: 'Kuesioner Builder',    desc: 'Likert, multichoice, Cronbach α', href: '/kuesioner' },
      { title: 'Analisis Butir Soal',  desc: 'P, D, KR-20, distraktor',         href: '/butir-soal' },
      { title: 'Manajemen Referensi',  desc: 'DOI lookup, APA/IEEE, BibTeX',    href: '/referensi' },
      { title: 'Analisis Kualitatif',  desc: 'Coding, codebook, Cohen\u2019s \u03ba',   href: '/kualitatif' },
      { title: 'Random Sampler',       desc: 'Pilih acak dari daftar',          href: '/sampling' },
    ],
  },
]

const features = [
  {
    icon: CheckCircle, title: 'Formula sesuai standar',
    desc: 'Pearson, Cronbach α, ANOVA, Hayes PROCESS, IRLS logistik, Jacobi+Varimax untuk EFA — implementasi mengikuti rumus textbook (Field, Hair, Hayes).'
  },
  {
    icon: BarChart3,   title: 'Output deterministik',
    desc: 'Input data sama → hasil pasti sama. Bukan estimasi heuristik AI. Setiap statistik divalidasi dengan dataset benchmark akademik.'
  },
  {
    icon: FileText,    title: 'Pelaporan APA-style',
    desc: 'Otomatis generate paragraf Bab IV dalam format APA 7 (statistik + p-value + effect size + df) — siap-paste ke skripsi.'
  },
]

function Home() {
  const navigate = useNavigate()
  const user = useCurrentUser()

  const handleLogout = () => {
    logoutUser()
  }

  return (
    <div className="min-h-screen relative bg-pattern">
      {/* Header — glassmorphism */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-bg/60 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="transition-transform group-hover:scale-110">
              <Logo size={40} />
            </div>
            <span className="text-xl font-bold text-gradient">{BRAND_NAME}</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/order" className="btn-ghost">
              <History className="w-5 h-5" />
              <span className="hidden sm:inline">Cek Pesanan</span>
            </Link>
            <Link to="/pengaturan" className="btn-ghost" title="Pengaturan & Backup" aria-label="Pengaturan">
              <SettingsIcon className="w-5 h-5" />
            </Link>
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/dashboard" className="btn-ghost">
                  <div className="w-8 h-8 bg-accent/15 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-accent" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{user.name}</span>
                </Link>
                <button onClick={handleLogout} className="btn-ghost text-muted hover:text-rose-500" aria-label="Logout">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link to="/auth" className="btn-primary text-sm py-2 px-4">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-20 pb-24 px-4">
        <div className="max-w-5xl mx-auto text-center animate-fade-in-up">
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full mb-6 text-sm">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-muted">Currently in beta — gratis untuk user terdaftar</span>
          </div>

          <h1 className="heading-xl mb-6">
            Penelitian &amp; assessment, <br />
            <span className="text-gradient">akademis dan terverifikasi.</span>
          </h1>

          <p className="text-base md:text-lg text-muted mb-6 max-w-3xl mx-auto leading-relaxed">
            Satu platform untuk seluruh alur penelitian Anda — penyusunan kuesioner, sampling,
            uji statistik, mediasi-moderasi, analisis faktor, riset kualitatif, sampai penilaian tulisan dengan rubrik.
          </p>

          <div className="max-w-3xl mx-auto mb-8 rounded-2xl border border-sky-200 bg-sky-50/80 dark:bg-sky-500/10 dark:border-sky-400/30 px-5 py-4 text-left">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sky-900 dark:text-sky-200">Beta Free Access</p>
                <p className="text-sm text-sky-800 dark:text-sky-100/80 mt-0.5">
                  Semua tools inti dapat digunakan gratis selama beta. Login diperlukan untuk menjaga kualitas akses, feedback, dan riwayat penggunaan. Pro/Premium akan dibuka setelah payment selesai diaudit.
                </p>
              </div>
            </div>
          </div>

          {/* Trust strip — credibility signals */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-10 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span><strong className="font-semibold text-fg">292</strong> unit test</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Dapat diverifikasi dengan <strong className="font-semibold text-fg">R / SPSS</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Pelaporan format <strong className="font-semibold text-fg">APA 7</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Bootstrap <strong className="font-semibold text-fg">5000 resamples</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Perhitungan <strong className="font-semibold text-fg">jalan di browser</strong>
            </span>
          </div>

          {/* Skripsi Wizard CTA — primary path for new users */}
          <div className="mb-6 flex justify-center">
            <Link
              to={user ? '/wizard' : '/auth?redirect=%2Fwizard'}
              className="group inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              style={{ background: 'linear-gradient(135deg, rgb(99 102 241), rgb(168 85 247))' }}
            >
              <Compass className="w-5 h-5" />
              <span>{user ? 'Mulai dengan Skripsi Wizard' : 'Login untuk Akses Beta Gratis'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Hero CTAs — kategori (smooth scroll ke section "Pilih Layanan") */}
          <div className="flex flex-wrap justify-center gap-2.5">
            {CATEGORIES.map(cat => {
              const Ic = cat.icon
              return (
                <a
                  key={cat.id}
                  href={`#cat-${cat.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/70 dark:bg-white/5 backdrop-blur border border-border/60 hover:border-accent/40 hover:bg-white dark:hover:bg-white/10 hover:shadow-md transition-all duration-300"
                >
                  <span className={`w-7 h-7 rounded-lg bg-gradient-to-br ${cat.gradient} flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}>
                    <Ic className="w-4 h-4" />
                  </span>
                  <span className="text-sm font-medium">{cat.title}</span>
                  <ChevronRight className="w-4 h-4 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-300" />
                </a>
              )
            })}
          </div>

          {/* Feature pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 max-w-3xl mx-auto">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="glass p-5 rounded-2xl text-left animate-fade-in-up"
                style={{ animationDelay: `${0.2 + i * 0.1}s`, animationFillMode: 'backwards' }}
              >
                <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* PILIH LAYANAN — 3 kategori, masing-masing punya tool list      */}
      {/* ============================================================ */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="heading-lg mb-2">Pilih Layanan</h2>
            <p className="text-muted">Tiga kategori utama — beta gratis untuk user terdaftar</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {CATEGORIES.map((cat, idx) => {
              const Ic = cat.icon
              return (
                <div
                  key={cat.id}
                  id={`cat-${cat.id}`}
                  className="group relative overflow-hidden bg-white dark:bg-white/[0.03] rounded-2xl border border-border/60 hover:border-accent/30 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 scroll-mt-24 animate-fade-in-up"
                  style={{ animationDelay: `${idx * 0.1}s`, animationFillMode: 'backwards' }}
                >
                  {/* Glow background */}
                  <div
                    className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                    style={{ background: cat.bgGlow }}
                  />

                  <div className="relative p-6 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                        <Ic className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold leading-tight">{cat.title}</h3>
                        <p className="text-xs text-muted mt-0.5">{cat.tagline}</p>
                      </div>
                    </div>

                    {/* Tool list */}
                    <ul className="space-y-1 mb-5 flex-1">
                      {cat.tools.map(tool => (
                        <li key={tool.title}>
                          <Link
                            to={tool.href}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group/item"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover/item:bg-accent transition-colors" />
                            <span className="font-medium flex-1 truncate">{tool.title}</span>
                            <span className="text-[11px] text-muted hidden sm:inline truncate">{tool.desc}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover/item:text-accent group-hover/item:translate-x-0.5 transition-all flex-shrink-0" />
                          </Link>
                        </li>
                      ))}
                    </ul>

                    {/* Primary CTA */}
                    <Link
                      to={cat.primaryHref}
                      className={`mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r ${cat.gradient} text-white font-medium text-sm shadow-md hover:shadow-lg hover:gap-3 transition-all duration-300`}
                    >
                      {cat.primaryLabel}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="heading-lg text-center mb-3">Cara Kerja</h2>
          <p className="text-muted text-center mb-12">3 langkah simple, hasil profesional</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-7 left-[16.66%] right-[16.66%] h-px"
                 style={{ background: 'linear-gradient(to right, transparent, rgb(var(--border)), transparent)' }}/>

            {[
              { step: '1', title: 'Pilih Layanan',  desc: 'Statistik kuantitatif atau assessment tulisan AI' },
              { step: '2', title: 'Upload Data',     desc: 'CSV/Excel untuk statistik, atau teks untuk assessment' },
              { step: '3', title: 'Dapat Hasil',     desc: 'Analisis lengkap dengan interpretasi langsung' },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="w-14 h-14 rounded-2xl bg-bg border-2 border-accent/30 flex items-center justify-center text-xl font-bold text-accent mx-auto mb-4 relative z-10 glass">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-muted text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-10 px-4 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   >
                <Logo size={28} />
              </div>
              <span className="font-bold text-gradient">{BRAND_NAME}</span>
            </div>
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
              <Link to="/wizard" className="hover:text-fg transition-colors">Wizard</Link>
              <Link to="/help" className="hover:text-fg transition-colors">Bantuan</Link>
              <Link to="/feedback" className="hover:text-fg transition-colors">Kritik &amp; Saran</Link>
              <Link to="/pengaturan" className="hover:text-fg transition-colors">Pengaturan</Link>
              <Link to="/privasi" className="hover:text-fg transition-colors">Kebijakan Privasi</Link>
              <Link to="/syarat" className="hover:text-fg transition-colors">Syarat Penggunaan</Link>
            </nav>
          </div>
          <p className="text-muted text-xs text-center">
            © 2026 {BRAND_NAME} — {BRAND_TAGLINE}
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Home

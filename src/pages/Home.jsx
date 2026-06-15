import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Activity,
  ClipboardCheck,
  BookOpen,
  Award,
  FileUp,
  Crosshair,
  Download,
  User,
  Menu,
  X,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";
import { useCurrentUser } from '../lib/useCurrentUser'

const TRUST_ITEMS = [
  "Perhitungan transparan",
  "Metode statistik standar",
  "Template APA 7th",
  "Data tetap di browser",
];

const WORKFLOW_STEPS = [
  { label: "Upload Data", icon: FileUp },
  { label: "Analisis", icon: Activity },
  { label: "Export", icon: Download },
];

const SERVICES = [
  {
    id: "statistik",
    title: "Analisis Statistik",
    desc: "Upload data, pilih uji, dapat hasil + interpretasi. t-test, ANOVA, regresi, korelasi, non-parametrik — semua ada.",
    icon: Activity,
    path: "/statistik",
    tags: ["70+ uji", "Interpretasi AI", "Export DOCX"],
    accent: "gold",
    primary: true,
  },
  {
    id: "kuesioner",
    title: "Kuesioner & Instrumen",
    desc: "Buat blueprint, indikator, butir Likert, dan validasi instrumen penelitianmu.",
    icon: ClipboardCheck,
    path: "/kuesioner",
    tags: ["Blueprint", "Likert", "Validasi"],
    accent: "teal",
  },
  {
    id: "wizard",
    title: "Panduan Skripsi",
    desc: "Dampingan dari topik sampai laporan. Metode, instrumen, analisis — step by step.",
    icon: BookOpen,
    path: "/wizard",
    tags: ["Bab 1-5", "Template", "Rujukan"],
    accent: "indigo",
  },
  {
    id: "assessment",
    title: "Assessment & Rubrik",
    desc: "Buat rubrik penilaian, skoring otomatis, dan laporan hasil assessment.",
    icon: Award,
    path: "/assessment",
    tags: ["Rubrik AI", "Skoring", "Laporan"],
    accent: "emerald",
  },
];

const CARA_KERJA = [
  { step: 1, title: "Upload", desc: "Upload file CSV/Excel atau paste data kamu langsung", icon: FileUp },
  { step: 2, title: "Pilih Analisis", desc: "Pilih uji statistik atau layanan yang sesuai kebutuhan penelitianmu", icon: Crosshair },
  { step: 3, title: "Dapat Hasil + Interpretasi", desc: "Hasil perhitungan, tabel, interpretasi AI, siap export DOCX", icon: Download },
];

const accentStyle = {
  gold:    { card: "border-l-4 border-l-accent bg-accent-soft/30", icon: "text-accent", tag: "bg-accent-soft text-accent" },
  teal:    { card: "border-l-4 border-l-teal-500 bg-teal-50 dark:bg-teal-950/20", icon: "text-teal-600 dark:text-teal-400", tag: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300" },
  indigo:  { card: "border-l-4 border-l-indigo-500 bg-indigo-50 dark:bg-indigo-950/20", icon: "text-indigo-600 dark:text-indigo-400", tag: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300" },
  emerald: { card: "border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/20", icon: "text-emerald-600 dark:text-emerald-400", tag: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" },
};

export default function Home() {
  const user = useCurrentUser()
  const [mobileOpen, setMobileOpen] = useState(false)
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-bg text-fg font-body">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="text-xl font-heading font-semibold">Azezmen</span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollTo("layanan")} className="text-sm hover:text-accent transition-colors">
                Layanan
              </button>
              <button onClick={() => scrollTo("alur")} className="text-sm hover:text-accent transition-colors">
                Alur
              </button>
              <button onClick={() => scrollTo("cara-kerja")} className="text-sm hover:text-accent transition-colors">
                Cara Kerja
              </button>
              <Link to="/help" className="text-sm hover:text-accent transition-colors">
                Bantuan
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-fg hover:text-accent transition-colors">
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <ThemeToggle />
              {user ? (
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-accent-fg text-sm font-medium transition-colors"
                >
                  <User className="w-4 h-4" />
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/auth"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-surface text-fg text-sm font-medium transition-colors"
                >
                  Masuk / Daftar
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-b border-border bg-card/95 backdrop-blur">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
            <button onClick={() => { scrollTo("layanan"); setMobileOpen(false) }} className="text-left text-sm hover:text-accent transition-colors py-2">
              Layanan
            </button>
            <button onClick={() => { scrollTo("alur"); setMobileOpen(false) }} className="text-left text-sm hover:text-accent transition-colors py-2">
              Alur
            </button>
            <button onClick={() => { scrollTo("cara-kerja"); setMobileOpen(false) }} className="text-left text-sm hover:text-accent transition-colors py-2">
              Cara Kerja
            </button>
            <Link to="/help" onClick={() => setMobileOpen(false)} className="text-sm hover:text-accent transition-colors py-2">
              Bantuan
            </Link>
          </nav>
        </div>
      )}

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 py-12 md:py-20 relative paper-texture">
          {/* Decorative blurs — human imperfections */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl mx-auto text-center relative z-10">
            <h1 className="text-3xl md:text-5xl font-heading font-black tracking-tight leading-tight mb-6">
              Olah data penelitian dari dataset ke{' '}
              <span className="text-accent">laporan akademik</span>.
            </h1>
            <p className="text-base md:text-lg font-light text-muted leading-relaxed mb-8 max-w-2xl mx-auto">
              Analisis statistik, interpretasi hasil, dan susun laporan —
              seluruh alur penelitian dalam satu tempat.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
              <Link
                to="/statistik"
                className="w-full sm:w-auto px-8 py-3.5 bg-accent text-white rounded-lg hover:opacity-90 transition-colors font-semibold text-base shadow-md shadow-accent/20"
              >
                Mulai Analisis
              </Link>
              <button
                onClick={() => scrollTo("layanan")}
                className="w-full sm:w-auto px-6 py-3.5 border border-border rounded-lg hover:bg-surface transition-colors font-medium text-sm"
              >
                Lihat Layanan
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {TRUST_ITEMS.map((item) => (
                <span key={item} className="text-xs px-3 py-1.5 rounded-full bg-surface text-muted">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Services — 4 Large Cards */}
        <section id="layanan" className="container mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-center mb-4">Layanan</h2>
          <p className="text-base font-light text-muted text-center mb-10 max-w-lg mx-auto">
            Pilih layanan sesuai tahap penelitianmu
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start max-w-5xl mx-auto">
            {SERVICES.map((svc) => {
              const s = accentStyle[svc.accent];
              return (
                <Link
                  key={svc.id}
                  to={svc.path}
                  className={`group rounded-2xl p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${s.card} ${
                    svc.primary ? "min-h-[180px]" : "border border-border bg-card"
                  }`}
                >
                  <svc.icon className={`w-10 h-10 mb-4 ${s.icon}`} />
                  <h3 className="font-heading font-semibold text-lg mb-2">{svc.title}</h3>
                  <p className="text-sm font-light text-muted mb-4 leading-relaxed">{svc.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {svc.tags.map((tag) => (
                      <span key={tag} className={`text-xs px-2 py-0.5 rounded ${s.tag}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Workflow — 3 Steps */}
        <section id="alur" className="container mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-center mb-4">Alur Penelitian</h2>
          <p className="text-base font-light text-muted text-center mb-12 max-w-lg mx-auto">
            Dari data mentah sampai laporan siap cetak
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-0 max-w-3xl mx-auto">
            {WORKFLOW_STEPS.map((step, idx) => (
              <div key={step.label} className="flex flex-col md:flex-row items-center flex-1">
                <div className="flex flex-col items-center text-center px-4 py-6">
                  <div className="w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center mb-3">
                    <step.icon className="w-6 h-6 text-accent" />
                  </div>
                  <span className="text-xs font-light tracking-wide uppercase text-accent mb-1">Langkah {idx + 1}</span>
                  <span className="text-sm font-medium">{step.label}</span>
                </div>
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <div className="flex items-center justify-center py-2 md:py-0">
                    <ArrowRight className="w-12 h-5 text-accent/30 md:w-8 md:h-8 md:rotate-0 rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Cara Kerja — 3 Steps with dashed connectors */}
        <section id="cara-kerja" className="container mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-center mb-4">Cara Kerja</h2>
          <p className="text-base font-light text-muted text-center mb-12 max-w-lg mx-auto">
            Tiga langkah simpel menuju hasil analisis
          </p>

          <div className="flex flex-col md:flex-row items-center max-w-4xl mx-auto">
            {CARA_KERJA.map((ck, idx) => (
              <React.Fragment key={ck.step}>
                <div className="flex-1 text-center p-4 border border-border bg-card rounded-lg shadow-sm hover:border-accent/50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-4">
                    <ck.icon className="w-6 h-6 text-accent" />
                  </div>
                  <span className="text-xs font-light tracking-wide uppercase text-accent mb-2 block">
                    Langkah {ck.step}
                  </span>
                  <h3 className="font-heading font-semibold text-base mb-2">{ck.title}</h3>
                  <p className="text-sm font-light text-muted">{ck.desc}</p>
                </div>
                {idx < CARA_KERJA.length - 1 && (
                  <div className="hidden md:block w-10 border-t-2 border-dashed border-border mx-2 flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="text-lg font-heading font-semibold">Azezmen — Platform Penelitian Akademik</div>
            <p className="text-sm font-light text-muted max-w-md">
              Mendukung penelitian kuantitatif, kualitatif, instrumen, assessment, referensi, dan penyusunan laporan akademik.
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
              <Link to="/privasi" className="text-muted hover:text-accent">Privasi</Link>
              <Link to="/syarat" className="text-muted hover:text-accent">Ketentuan</Link>
              <Link to="/help" className="text-muted hover:text-accent">Bantuan</Link>
              <Link to="/feedback" className="text-muted hover:text-accent">Kontak / Saran</Link>
            </div>
            <div className="flex gap-4 text-sm">
              <Link to="/login" className="text-muted hover:text-accent">Masuk</Link>
              <Link to="/register" className="px-4 py-1.5 bg-accent text-white rounded-lg hover:opacity-90 text-sm">Daftar</Link>
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
}

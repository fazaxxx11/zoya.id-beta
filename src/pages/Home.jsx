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
  BarChart3,
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
              <button onClick={() => scrollTo("layanan")} className="text-sm hover:text-accent transition-colors active:scale-95">
                Layanan
              </button>
              <button onClick={() => scrollTo("alur")} className="text-sm hover:text-accent transition-colors active:scale-95">
                Alur
              </button>
              <button onClick={() => scrollTo("cara-kerja")} className="text-sm hover:text-accent transition-colors active:scale-95">
                Cara Kerja
              </button>
              <Link to="/help" className="text-sm hover:text-accent transition-colors active:scale-95">
                Bantuan
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-fg hover:text-accent transition-colors active:scale-95">
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <ThemeToggle />
              {user ? (
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-accent-fg text-sm font-medium transition-colors active:scale-95"
                >
                  <User className="w-4 h-4" />
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/auth"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-surface text-fg text-sm font-medium transition-colors active:scale-95"
                >
                  Masuk / Daftar
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-b border-border bg-card/95 backdrop-blur">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
            <button onClick={() => { scrollTo("layanan"); setMobileOpen(false) }} className="text-left text-sm hover:text-accent transition-colors py-2">Layanan</button>
            <button onClick={() => { scrollTo("alur"); setMobileOpen(false) }} className="text-left text-sm hover:text-accent transition-colors py-2">Alur</button>
            <button onClick={() => { scrollTo("cara-kerja"); setMobileOpen(false) }} className="text-left text-sm hover:text-accent transition-colors py-2">Cara Kerja</button>
            <Link to="/help" onClick={() => setMobileOpen(false)} className="text-sm hover:text-accent transition-colors py-2">Bantuan</Link>
          </nav>
        </div>
      )}

      <main>
        {/* ===== HERO — Editorial Split Typography ===== */}
        <section className="container mx-auto px-4 py-20 md:py-32 relative paper-texture overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative z-10">
            {/* Left: Bold statement (7 cols) */}
            <div className="md:col-span-7">
              <span className="inline-block text-xs font-semibold text-accent tracking-widest uppercase mb-6">Platform Penelitian Akademik</span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-black tracking-tight leading-[0.95] mb-6">
                70+ uji statistik.<br />
                <span className="text-accent">Satu platform.</span>
              </h1>
              <p className="text-lg md:text-xl font-light text-muted leading-relaxed max-w-lg mb-8">
                Dari data mentah ke laporan akademik — analisis, interpretasi, dan export siap cetak.
              </p>
              <Link
                to="/statistik"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white rounded-lg hover:opacity-90 transition-all font-semibold text-base shadow-md shadow-accent/20 active:scale-95"
              >
                Mulai Sekarang <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            {/* Right: Trust (5 cols) — compact, editorial */}
            <div className="md:col-span-5 flex flex-col items-start md:items-end md:text-right gap-4 mt-4 md:mt-12">
              <div className="space-y-2">
                {TRUST_ITEMS.map((item, i) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-muted">
                    <span className="w-6 h-px bg-accent/40 hidden md:block" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 border border-border bg-card rounded-xl w-full max-w-xs">
                <div className="text-xs text-muted mb-1">Contoh hasil analisis</div>
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-accent" />
                  <div>
                    <div className="text-sm font-semibold">T-Test Independent</div>
                    <div className="text-xs text-emerald-500 font-medium">p = 0.003 • Signifikan</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SERVICES — Editorial Numbered Sections ===== */}
        <section id="layanan" className="container mx-auto px-4 py-20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 max-w-6xl mx-auto">
            {/* Left column: heading */}
            <div className="md:col-span-4">
              <span className="text-xs font-semibold text-accent tracking-widest uppercase">Layanan</span>
              <h2 className="text-2xl md:text-3xl font-heading font-bold mt-2 mb-4">
                Satu platform.<br />Seluruh alur penelitian.
              </h2>
              <p className="text-sm font-light text-muted leading-relaxed">
                Dari upload data mentah sampai laporan akademik siap cetak. Tanpa spreadsheet. Tanpa R Studio.
              </p>
            </div>

            {/* Right column: alternating numbered items */}
            <div className="md:col-span-8 space-y-0">
              {SERVICES.map((svc, i) => {
                const s = accentStyle[svc.accent];
                const isEven = i % 2 === 0;
                return (
                  <Link
                    key={svc.id}
                    to={svc.path}
                    className={`group flex gap-5 py-6 border-b border-border hover:bg-surface/50 transition-all -mx-4 px-4 rounded-lg ${i === 0 ? 'border-t' : ''}`}
                  >
                    <span className="text-4xl font-heading font-black text-accent/15 leading-none mt-1 select-none">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <svc.icon className={`w-4 h-4 ${s.icon}`} />
                        <h3 className="font-heading font-semibold text-base group-hover:text-accent transition-colors">{svc.title}</h3>
                      </div>
                      <p className="text-sm font-light text-muted leading-relaxed mb-2">{svc.desc}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {svc.tags.map((tag) => (
                          <span key={tag} className={`text-xs px-2 py-0.5 rounded ${s.tag}`}>{tag}</span>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted/30 group-hover:text-accent transition-colors mt-2 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== WORKFLOW — Editorial Numbered Steps ===== */}
        <section id="alur" className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <span className="text-xs font-semibold text-accent tracking-widest uppercase">Alur</span>
            <h2 className="text-2xl md:text-3xl font-heading font-bold mt-2 mb-12">
              Dari data mentah ke laporan siap cetak.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
              {WORKFLOW_STEPS.map((step, idx) => (
                <div key={step.label} className="relative pl-8 md:pl-0 pb-8 md:pb-0 border-l md:border-l-0 md:border-t border-border">
                  <span className="absolute left-0 md:static text-5xl font-heading font-black text-accent/10 leading-none select-none">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="pt-2 md:pt-6 md:pl-6">
                    <step.icon className="w-5 h-5 text-accent mb-3" />
                    <h3 className="font-heading font-semibold text-sm mb-1">{step.label}</h3>
                    <p className="text-xs text-muted font-light">{idx === 0 ? 'CSV, Excel, atau paste langsung' : idx === 1 ? 'Pilih uji statistik yang sesuai' : 'Tabel, grafik, interpretasi, DOCX'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CARA KERJA — Bold numbered editorial ===== */}
        <section id="cara-kerja" className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <span className="text-xs font-semibold text-accent tracking-widest uppercase">Proses</span>
            <h2 className="text-2xl md:text-3xl font-heading font-bold mt-2 mb-12">
              Tiga langkah. Tanpa ribet.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {CARA_KERJA.map((ck) => (
                <div key={ck.step} className="relative">
                  <span className="text-6xl font-heading font-black text-accent/10 leading-none select-none block mb-2">
                    {String(ck.step).padStart(2, '0')}
                  </span>
                  <ck.icon className="w-5 h-5 text-accent mb-3" />
                  <h3 className="font-heading font-semibold text-sm mb-1">{ck.title}</h3>
                  <p className="text-xs text-muted font-light leading-relaxed">{ck.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer — Editorial left/center/right layout */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left: brand */}
            <div className="md:col-span-4">
              <span className="text-lg font-heading font-semibold">Azezmen</span>
              <p className="text-xs text-muted font-light mt-1">Platform Penelitian Akademik</p>
            </div>
            {/* Center: links */}
            <div className="md:col-span-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link to="/privasi" className="text-muted hover:text-accent">Privasi</Link>
              <Link to="/syarat" className="text-muted hover:text-accent">Ketentuan</Link>
              <Link to="/help" className="text-muted hover:text-accent">Bantuan</Link>
              <Link to="/feedback" className="text-muted hover:text-accent">Saran</Link>
            </div>
            {/* Right: CTA */}
            <div className="md:col-span-4 flex md:justify-end">
              <Link
                to="/auth"
                className="px-5 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-colors text-sm font-medium active:scale-95"
              >
                Mulai Gratis
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

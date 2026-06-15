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
  Check,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";
import { useCurrentUser } from '../lib/useCurrentUser'
import ScrollReveal from '../components/ScrollReveal'

const TRUST_ITEMS = [
  "Gratis tanpa daftar",
  "70+ uji statistik",
  "Laporan siap cetak",
  "Interpretasi otomatis"
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
        {/* ===== HERO — Split Text: Typography as Art ===== */}
        <section className="container mx-auto px-4 py-20 md:py-32 relative paper-texture overflow-hidden">
          {/* Floating decorative elements */}
          <div className="absolute top-20 right-10 w-2 h-2 bg-accent/20 rounded-full animate-float pointer-events-none" />
          <div className="absolute top-40 right-20 w-3 h-3 bg-teal-500/15 rounded-full animate-float-delayed pointer-events-none" />
          <div className="absolute bottom-20 left-10 w-2 h-2 bg-amber-500/20 rounded-full animate-float pointer-events-none" />
          <div className="absolute bottom-40 left-20 w-4 h-4 bg-rose-500/10 rounded-full animate-float-delayed pointer-events-none" />

          {/* Dot pattern background */}
          <div className="absolute inset-0 dot-pattern-bg opacity-30 pointer-events-none" />

          <div className="relative z-10">
            {/* Bold statement tagline */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-px bg-accent" />
              <span className="text-xs font-semibold text-accent tracking-widest uppercase">
                Platform penelitian akademik
              </span>
            </div>

            {/* Split text hero — typography as visual element */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-black tracking-tight leading-[0.9] mb-8">
              Olah data<br />
              <span className="text-accent">penelitian</span><br />
              <span className="text-muted text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
                dari dataset ke laporan.
              </span>
            </h1>

            {/* Subheadline — confident */}
            <p className="text-lg md:text-xl font-light text-muted leading-relaxed mb-8 max-w-lg">
              70+ uji statistik. Interpretasi otomatis. Laporan siap cetak.
              <span className="text-foreground font-medium"> Semua dalam satu tempat.</span>
            </p>

            {/* CTA — single primary */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link
                to="/statistik"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white rounded-lg hover:opacity-90 transition-all font-semibold text-base shadow-lg shadow-accent/20 active:scale-95"
              >
                Mulai Analisis
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Trust — horizontal, compact */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted">
              {TRUST_ITEMS.slice(0, 3).map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-accent" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Decorative divider */}
        <div className="section-divider" />

        {/* ===== DEMO PREVIEW — Show what the platform does ===== */}
        <ScrollReveal>
          <section className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto">
              {/* Terminal-style preview */}
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
                {/* Terminal header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-xs text-muted ml-2 font-mono">hasil-analisis.csv</span>
                </div>

                {/* Demo content */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-surface/50 rounded-lg p-4 border border-border">
                      <div className="text-xs text-muted mb-1">Uji yang dipilih</div>
                      <div className="text-sm font-semibold">T-Test Independent</div>
                    </div>
                    <div className="bg-surface/50 rounded-lg p-4 border border-border">
                      <div className="text-xs text-muted mb-1">Signifikansi</div>
                      <div className="text-lg font-bold text-emerald-500">p = 0.003</div>
                    </div>
                    <div className="bg-surface/50 rounded-lg p-4 border border-border">
                      <div className="text-xs text-muted mb-1">Kesimpulan</div>
                      <div className="text-sm font-medium text-accent">Signifikan ✓</div>
                    </div>
                  </div>

                  {/* Interpretation */}
                  <div className="mt-6 p-4 bg-accent/5 border border-accent/20 rounded-lg">
                    <div className="text-xs font-semibold text-accent mb-2">Interpretasi AI</div>
                    <p className="text-sm text-muted leading-relaxed">
                      Terdapat perbedaan signifikan antara kelompok kontrol dan perlakuan (t = 3.42, p = 0.003).
                      Nilai rata-rata kelompok perlakuan (M = 78.5) lebih tinggi dibanding kelompok kontrol (M = 72.1).
                      Efek yang ditemukan tergolong <span className="font-medium text-foreground">besar</span> (Cohen's d = 0.85).
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted">Contoh output • Hasil sesungguhnya mungkin berbeda</span>
                    <span className="text-xs text-accent font-medium">Export DOCX →</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Decorative divider */}
        <div className="section-divider" />

        {/* ===== SERVICES — Numbered Editorial Layout ===== */}
        <ScrollReveal>
        <section id="layanan" className="container mx-auto px-4 py-20">
          {/* Section header — numbered, bold */}
          <div className="flex items-baseline gap-4 mb-10">
            <span className="text-5xl md:text-6xl font-heading font-black text-accent/15 leading-none">01</span>
            <div>
              <h2 className="text-2xl md:text-3xl font-heading font-bold">Layanan</h2>
              <p className="text-sm font-light text-muted mt-1">Pilih sesuai tahap penelitianmu</p>
            </div>
          </div>

          {/* Editorial layout — alternating, bukan uniform grid */}
          <div className="space-y-6 max-w-5xl mx-auto">
            {SERVICES.map((svc, idx) => {
              const s = accentStyle[svc.accent];
              return (
                <Link
                  key={svc.id}
                  to={svc.path}
                  className={`group block rounded-xl p-6 transition-all hover:shadow-md hover:-translate-y-0.5 ${s.card} ${
                    svc.primary ? 'border-l-4 border-l-accent' : 'border border-border bg-card'
                  }`}
                >
                  <div className="flex items-start gap-5">
                    {/* Number + Icon */}
                    <div className="flex-shrink-0">
                      <span className="text-3xl font-heading font-black text-accent/20 block mb-1">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <svc.icon className={`w-8 h-8 ${s.icon}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold text-lg mb-1.5">{svc.title}</h3>
                      <p className="text-sm font-light text-muted leading-relaxed mb-3">{svc.desc}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {svc.tags.map((tag) => (
                          <span key={tag} className={`text-xs px-2 py-0.5 rounded ${s.tag}`}>{tag}</span>
                        ))}
                      </div>
                    </div>

                    {/* Arrow indicator */}
                    <ArrowRight className="w-5 h-5 text-muted group-hover:text-accent transition-colors flex-shrink-0 mt-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
        </ScrollReveal>

        {/* Decorative divider */}
        <div className="section-divider" />

        {/* ===== WORKFLOW — Numbered ===== */}
        <ScrollReveal delay={0.1}>
        <section id="alur" className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-baseline gap-4 mb-10">
              <span className="text-5xl md:text-6xl font-heading font-black text-accent/15 leading-none">02</span>
              <div>
                <h2 className="text-2xl md:text-3xl font-heading font-bold">Alur Penelitian</h2>
                <p className="text-sm font-light text-muted mt-1">Dari data mentah sampai laporan siap cetak</p>
              </div>
            </div>

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
        </ScrollReveal>

        {/* Decorative divider */}
        <div className="section-divider" />

        {/* ===== CARA KERJA — Numbered ===== */}
        <ScrollReveal delay={0.1}>
        <section id="cara-kerja" className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-baseline gap-4 mb-10">
              <span className="text-5xl md:text-6xl font-heading font-black text-accent/15 leading-none">03</span>
              <div>
                <h2 className="text-2xl md:text-3xl font-heading font-bold">Cara Kerja</h2>
                <p className="text-sm font-light text-muted mt-1">Tiga langkah simpel menuju hasil analisis</p>
              </div>
            </div>

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
        </ScrollReveal>
      </main>

      {/* Footer — Editorial style */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            {/* Left — brand */}
            <div>
              <div className="text-lg font-heading font-bold mb-2">Azezmen</div>
              <p className="text-sm font-light text-muted max-w-xs">
                Platform penelitian akademik Indonesia.
                Olah data, interpretasi, laporan.
              </p>
            </div>

            {/* Center — links */}
            <div className="flex gap-6 text-sm">
              <Link to="/privasi" className="text-muted hover:text-accent transition-colors">Privasi</Link>
              <Link to="/syarat" className="text-muted hover:text-accent transition-colors">Ketentuan</Link>
              <Link to="/help" className="text-muted hover:text-accent transition-colors">Bantuan</Link>
              <Link to="/feedback" className="text-muted hover:text-accent transition-colors">Kontak</Link>
            </div>

            {/* Right — auth */}
            <div className="flex gap-3">
              <Link to="/login" className="text-sm text-muted hover:text-accent transition-colors">Masuk</Link>
              <Link to="/register" className="px-4 py-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors text-sm active:scale-95">Daftar</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

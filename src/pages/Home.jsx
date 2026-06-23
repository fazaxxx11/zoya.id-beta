import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Activity,
  ClipboardCheck,
  BookOpen,
  Award,
  FileUp,
  FileDown,
  Zap,
  X,
  Check,
  Sigma,
  Table2,
  Brain,
  Languages,
  Compass,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";
import { useCurrentUser } from "../lib/useCurrentUser";
import ScrollReveal from "../components/ScrollReveal";
import GuidedWizardModal from "../components/statistik/GuidedWizardModal";

/* =====================================================
   COMPONENTS
===================================================== */

/** Gold flourish SVG */
function Flourish({ className = "" }) {
  return (
    <svg
      viewBox="0 0 240 20"
      fill="none"
      className={`w-36 md:w-56 h-auto ${className}`}
      aria-hidden="true"
    >
      <path
        d="M0 10h80c0 0 20-6 40 0s20-6 40 0h80"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeOpacity="0.3"
        className="text-accent"
      />
      <circle cx="120" cy="10" r="2.5" className="fill-accent" fillOpacity="0.35" />
      <circle cx="114" cy="10" r="0.8" className="fill-accent" fillOpacity="0.2" />
      <circle cx="126" cy="10" r="0.8" className="fill-accent" fillOpacity="0.2" />
    </svg>
  );
}

/** Animated counter — counts from 0 to target */
function CountUp({ target, suffix = "", duration = 1500 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
            setVal(Math.round(eased * target));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {val}
      {suffix}
    </span>
  );
}

/** Typing effect */
function TypingText({ text, speed = 35, delay = 0 }) {
  const words = text.split(" ");
  const [visible, setVisible] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (delay) {
      const t = setTimeout(() => { started.current = true; }, delay);
      return () => clearTimeout(t);
    }
    started.current = true;
  }, [delay]);

  useEffect(() => {
    if (!started.current || visible >= words.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), speed);
    return () => clearTimeout(t);
  }, [visible, words.length, speed]);

  return (
    <span>
      {words.slice(0, visible).join(" ")}
      {visible < words.length && (
        <span className="inline-block w-px h-3 bg-accent/70 align-middle ml-0.5 animate-pulse" />
      )}
    </span>
  );
}

/** Ambient gradient blobs — soft, breathing, fills space */
function AmbientBlobs({ variant = "default" }) {
  const sets = {
    default: [
      { c: "accent", top: "5%", left: "60%", size: "w-72 h-72", a: "animate-blob" },
      { c: "teal", top: "40%", left: "5%", size: "w-64 h-64", a: "animate-blob-slow" },
      { c: "terracotta", top: "55%", left: "75%", size: "w-56 h-56", a: "animate-blob-fast" },
    ],
    hero: [
      { c: "accent", top: "-5%", left: "65%", size: "w-80 h-80", a: "animate-blob" },
      { c: "teal", top: "30%", left: "-5%", size: "w-72 h-72", a: "animate-blob-slow" },
      { c: "terracotta", top: "60%", left: "80%", size: "w-56 h-56", a: "animate-blob-fast" },
    ],
  };
  const colorMap = {
    accent: "rgb(var(--accent))",
    teal: "rgb(var(--deep-teal))",
    terracotta: "rgb(var(--warm-rose))",
  };
  const blobs = sets[variant] || sets.default;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {blobs.map((b, i) => (
        <div
          key={i}
          className={`absolute ${b.size} ${b.a} rounded-full blur-3xl opacity-[0.08] dark:opacity-[0.12]`}
          style={{ top: b.top, left: b.left, background: colorMap[b.c] }}
        />
      ))}
    </div>
  );
}

/** Pricing "Segera hadir" modal */
function PricingModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-fg/40 backdrop-blur-sm" />
      <div
        className="relative bg-card border border-border rounded-xl p-7 max-w-md w-full shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-muted hover:text-fg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="text-[10px] text-accent font-semibold tracking-[0.18em] uppercase mb-2">
          Harga
        </div>
        <h3 className="font-heading font-bold text-xl tracking-tight mb-3">
          Segera hadir
        </h3>
        <p className="text-sm text-muted leading-relaxed mb-6">
          Kami sedang menyusun paket harga yang adil dan transparan.
          Sementara itu, semua fitur inti tetap gratis tanpa batas.
          Pantau terus ya.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:border-accent/50 transition-colors"
          >
            Mengerti
          </button>
          <Link
            to="/feedback"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent/90 text-accent-fg rounded-lg text-sm font-semibold transition-colors text-center"
          >
            Beri masukan
          </Link>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   DATA
===================================================== */

const SERVICES = [
  {
    no: "01",
    title: "Analisis Statistik",
    desc: "Upload data, pilih uji, dapat hasil + interpretasi otomatis. t-test, ANOVA, regresi, korelasi, non-parametrik.",
    hint: "Mulai dari sini kalau kamu sudah punya data siap olah.",
    icon: Activity,
    path: "/statistik",
    tags: ["70+ uji", "Interpretasi AI", "Export DOCX"],
    accent: "gold",
    featured: true,
  },
  {
    no: "02",
    title: "Kuesioner & Instrumen",
    desc: "Blueprint, indikator, butir Likert, dan validasi instrumen penelitian — dari konsep siap pakai.",
    hint: "Pakai sebelum kumpulkan data — susun kuesioner dulu, lalu validasi.",
    icon: ClipboardCheck,
    path: "/kuesioner",
    tags: ["Blueprint", "Likert", "Validasi"],
    accent: "teal",
  },
  {
    no: "03",
    title: "Panduan Skripsi",
    desc: "Dampingan dari topik sampai laporan. Metode, instrumen, analisis — step by step.",
    hint: "Bingung mulai dari mana? Checklist ini nganterin dari Bab 1 sampai Bab 5.",
    icon: BookOpen,
    path: "/wizard",
    tags: ["Bab 1–5", "Template", "Rujukan"],
    accent: "terracotta",
  },
  {
    no: "04",
    title: "Assessment & Rubrik",
    desc: "Rubrik penilaian, skoring otomatis, dan laporan hasil assessment langsung bisa dipakai.",
    hint: "Buat dosen, peneliti, atau asisten yang mau nilai karya secara terstruktur.",
    icon: Award,
    path: "/assessment",
    tags: ["Rubrik AI", "Skoring", "Laporan"],
    accent: "gold",
  },
];

const CAPABILITIES = [
  { icon: Sigma, label: "70+ uji statistik", desc: "Parametrik & non-parametrik" },
  { icon: Brain, label: "Interpretasi AI", desc: "Naratif otomatis tiap hasil" },
  { icon: Table2, label: "Tabel & grafik", desc: "Rapi, siap tempel skripsi" },
  { icon: Languages, label: "Bahasa Indonesia", desc: "Output & istilah dilokalkan" },
  { icon: FileDown, label: "Export DOCX", desc: "Satu klik ke laporan" },
  { icon: Zap, label: "Cepat", desc: "Hitungan detik, bukan menit" },
];

const FLOW = [
  { no: "01", title: "Upload data", desc: "CSV, Excel, atau paste langsung. Deteksi kolom otomatis.", icon: FileUp },
  { no: "02", title: "Pilih analisis", desc: "Uji statistik atau layanan lain. Panduan memilih tersedia.", icon: Activity },
  { no: "03", title: "Hasil + laporan", desc: "Tabel, grafik, interpretasi, export DOCX siap cetak.", icon: FileDown },
];

const ACCENT = {
  gold: { icon: "text-accent", bg: "bg-accent/8" },
  teal: { icon: "text-teal", bg: "bg-teal/8" },
  terracotta: { icon: "text-terracotta", bg: "bg-terracotta/8" },
};

/* =====================================================
   HOME — Compact Scholarly, framed & filled
===================================================== */

export default function Home() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-bg text-fg font-body">
      {/* ===== HEADER ===== */}
      <header
        className={`sticky top-0 z-50 border-b border-border transition-all duration-300 ${
          scrolled
            ? "bg-bg/85 backdrop-blur-md"
            : "bg-bg"
        }`}
      >
        <div className="max-w-5xl mx-auto px-5">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2">
              <Logo size={24} />
              <span className="text-base font-heading font-bold tracking-tight">Azezmen</span>
            </Link>

            <nav className="hidden md:flex items-center gap-7">
              {[
                { id: "layanan", label: "Layanan" },
                { id: "alur", label: "Alur" },
                { id: "demo", label: "Contoh" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className="text-[13px] text-muted hover:text-fg transition-colors"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => setPricingOpen(true)}
                className="text-[13px] text-muted hover:text-fg transition-colors"
              >
                Harga
              </button>
            </nav>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              {user ? (
                <Link
                  to="/dashboard"
                  className="hidden sm:inline-flex items-center px-3.5 py-1.5 rounded-lg bg-accent hover:bg-accent/90 text-accent-fg text-xs font-semibold transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/auth"
                  className="hidden sm:inline-flex items-center px-3.5 py-1.5 rounded-lg border border-border hover:border-accent/50 hover:text-accent text-xs font-medium transition-all"
                >
                  Masuk
                </Link>
              )}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-1 -mr-1 text-fg"
                aria-label="Menu"
              >
                <div className="space-y-1">
                  <span className={`block w-4 h-px bg-current transition-transform ${mobileOpen ? "translate-y-[5px] rotate-45" : ""}`} />
                  <span className={`block w-4 h-px bg-current transition-opacity ${mobileOpen ? "opacity-0" : ""}`} />
                  <span className={`block w-4 h-px bg-current transition-transform ${mobileOpen ? "-translate-y-[5px] -rotate-45" : ""}`} />
                </div>
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-bg">
            <nav className="max-w-5xl mx-auto px-5 py-3 flex flex-col gap-0.5">
              {[
                { id: "layanan", label: "Layanan" },
                { id: "alur", label: "Alur" },
                { id: "demo", label: "Contoh" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { scrollTo(item.id); setMobileOpen(false); }}
                  className="text-left py-2 text-sm text-muted hover:text-fg"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => { setPricingOpen(true); setMobileOpen(false); }}
                className="text-left py-2 text-sm text-muted hover:text-fg"
              >
                Harga
              </button>
              <Link
                to={user ? "/dashboard" : "/auth"}
                onClick={() => setMobileOpen(false)}
                className="py-2 text-sm font-medium text-accent"
              >
                {user ? "Dashboard" : "Masuk / Daftar"}
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden paper-texture" style={{ background: "rgb(var(--surface))" }}>
          {/* Ambient gradient blobs */}
          <AmbientBlobs variant="hero" />

          <div className="relative max-w-5xl mx-auto px-5 pt-12 md:pt-20 pb-6">
            <ScrollReveal>
              <div className="flex items-center gap-2.5 mb-5">
                <span className="w-6 h-px bg-accent" />
                <span className="text-[10px] font-semibold text-accent tracking-[0.18em] uppercase">Platform penelitian akademik</span>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.04}>
              <h1 className="font-heading font-bold tracking-tight leading-[0.94] text-3xl sm:text-5xl md:text-6xl max-w-3xl">
                Olah data
                <br />
                <span className="text-accent italic">penelitian</span>
                <span className="text-muted">,</span>
                <br />
                sampai jadi laporan.
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="mt-5 md:mt-6"><Flourish /></div>
            </ScrollReveal>

            <ScrollReveal delay={0.14}>
              <p className="mt-5 max-w-md text-[15px] md:text-base font-light text-muted leading-relaxed">
                <CountUp target={70} suffix="+" className="font-medium text-fg" /> uji statistik. Interpretasi otomatis. Laporan siap cetak.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="mt-7 flex flex-col sm:flex-row gap-2.5">
                <Link
                  to="/statistik/start"
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-accent-fg rounded-lg font-semibold text-sm transition-all active:scale-[0.98]"
                >
                  Mulai analisis
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <button
                  onClick={() => setWizardOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border hover:border-teal/50 hover:text-teal rounded-lg font-medium text-sm transition-all"
                >
                  <Compass className="w-3.5 h-3.5" />
                  Bingung? Pilihkan untuk saya
                </button>
                <button
                  onClick={() => scrollTo("layanan")}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border hover:border-accent/50 hover:text-accent rounded-lg font-medium text-sm transition-all"
                >
                  Lihat layanan
                </button>
              </div>
            </ScrollReveal>
          </div>

          {/* Flow badges */}
          <div className="relative max-w-5xl mx-auto px-5 pt-6 pb-10 md:pb-16">
            <ScrollReveal delay={0.24}>
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-border bg-card">
                  <FileUp className="w-3.5 h-3.5 text-accent" />
                  <span className="text-muted">Upload</span>
                </div>
                <span className="text-accent/30 hidden sm:block">→</span>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-border bg-card">
                  <Activity className="w-3.5 h-3.5 text-teal" />
                  <span className="text-muted">Analisis</span>
                </div>
                <span className="text-accent/30 hidden sm:block">→</span>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-border bg-card">
                  <Zap className="w-3.5 h-3.5 text-accent" />
                  <span className="text-muted">Interpretasi AI</span>
                </div>
                <span className="text-accent/30 hidden sm:block">→</span>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-accent/30 bg-accent/5">
                  <FileDown className="w-3.5 h-3.5 text-accent" />
                  <span className="text-accent font-medium">Export DOCX</span>
                </div>
              </div>
            </ScrollReveal>
          </div>

          <div className="flex items-center justify-center gap-3 py-1.5">
            <div className="w-16 md:w-28 h-px bg-gradient-to-r from-transparent to-accent/25" />
            <div className="w-1 h-1 rotate-45 bg-accent/25" />
            <div className="w-16 md:w-28 h-px bg-gradient-to-l from-transparent to-accent/25" />
          </div>
        </section>

        {/* ===== SERVICES ===== */}
        <section id="layanan" style={{ background: "rgb(var(--bg))" }}>
          <div className="max-w-5xl mx-auto px-5 py-12 md:py-20">
            <ScrollReveal>
              <div className="mb-10 md:mb-14">
                <div className="flex items-start gap-3 mb-2">
                  <span className="font-heading text-4xl md:text-5xl font-bold text-accent/12 leading-none italic select-none">§</span>
                  <div className="pt-2">
                    <span className="text-[10px] text-muted tracking-[0.18em] uppercase">Layanan</span>
                    <h2 className="font-heading font-bold text-xl md:text-3xl tracking-tight leading-[1.1] mt-0.5 max-w-lg">
                      Empat jalur bantuan, <span className="text-muted italic">sesuai tahap penelitianmu.</span>
                    </h2>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.05}>
              <div className="border border-border rounded-xl overflow-hidden bg-card/40 transition-all duration-300 hover:shadow-[var(--shadow-md)]">
                {SERVICES.map((svc, idx) => {
                  const a = ACCENT[svc.accent];
                  return (
                    <Link
                      key={svc.id}
                      to={svc.path}
                      className={`group relative block py-5 md:py-6 px-5 md:px-6 transition-all duration-300 hover:bg-surface/60 border-l-2 ${
                        idx !== 0 ? "border-t border-border" : ""
                      } ${svc.featured ? "border-l-accent/30" : "border-l-transparent"}`}
                    >
                      <div className="grid grid-cols-12 gap-3 md:gap-6 items-center">
                        <div className="col-span-2 md:col-span-1">
                          <span className="font-heading text-xl md:text-2xl font-bold text-muted/25 group-hover:text-accent/70 transition-colors duration-300">{svc.no}</span>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg ${a.bg} flex items-center justify-center ${a.icon} transition-transform duration-300 group-hover:scale-110`}>
                            <svc.icon className="w-4 h-4 md:w-5 md:h-5" />
                          </div>
                        </div>
                        <div className="col-span-8 md:col-span-6">
                          <h3 className="font-heading font-semibold text-base md:text-lg tracking-tight mb-0.5">
                            {svc.title}
                            {svc.featured && (
                              <span className="ml-1.5 align-middle text-[9px] font-semibold tracking-wider uppercase bg-accent/10 text-accent rounded-full px-1.5 py-px">Populer</span>
                            )}
                          </h3>
                          <p className="text-xs md:text-sm text-muted leading-relaxed max-w-md">{svc.desc}</p>
                          <p className="text-[11px] md:text-xs text-muted/60 mt-1 italic leading-relaxed max-w-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">{svc.hint}</p>
                        </div>
                        <div className="hidden md:flex col-span-3 flex-wrap gap-1 justify-end">
                          {svc.tags.map((tag) => (
                            <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted">{tag}</span>
                          ))}
                        </div>
                        <div className="col-span-12 md:hidden flex items-center gap-1 text-accent text-xs mt-1">
                          Pelajari <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ===== CAPABILITIES ===== */}
        <section className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, rgb(var(--bg)) 0%, rgb(var(--surface)) 100%)" }}>
          {/* Subtle dot pattern */}
          <div className="absolute inset-0 dot-pattern-bg opacity-[0.04] pointer-events-none" />
          <div
            className="absolute left-0 top-0 w-1/3 h-full pointer-events-none opacity-[0.04]"
            style={{ background: "radial-gradient(ellipse at 0% 50%, rgb(var(--deep-teal)), transparent 60%)" }}
          />

          <div className="relative max-w-5xl mx-auto px-5 py-12 md:py-20">
            <ScrollReveal>
              <div className="mb-8 md:mb-12">
                <div className="flex items-start gap-3 mb-2">
                  <span className="font-heading text-4xl md:text-5xl font-bold text-teal/12 leading-none italic select-none">§</span>
                  <div className="pt-2">
                    <span className="text-[10px] text-muted tracking-[0.18em] uppercase">Kapabilitas</span>
                    <h2 className="font-heading font-bold text-xl md:text-3xl tracking-tight leading-[1.1] mt-0.5">
                      Apa yang kamu dapat di tiap analisis.
                    </h2>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border border border-border rounded-xl overflow-hidden">
              {CAPABILITIES.map((cap, idx) => (
                <ScrollReveal key={cap.label} delay={idx * 0.05}>
                  <div className="bg-card h-full p-4 md:p-5 flex items-start gap-3 group transition-colors duration-300 hover:bg-bg">
                    <div className="w-8 h-8 rounded-lg bg-teal/8 flex items-center justify-center text-teal flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                      <cap.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold mb-0.5">{cap.label}</div>
                      <div className="text-xs text-muted leading-relaxed">{cap.desc}</div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== DEMO PREVIEW ===== */}
        <section id="demo" className="relative overflow-hidden" style={{ background: "rgb(var(--surface))" }}>
          {/* Warm gradient */}
          <div
            className="absolute right-0 top-0 w-1/3 h-full pointer-events-none opacity-[0.04]"
            style={{ background: "radial-gradient(ellipse at 100% 30%, rgb(var(--accent)), transparent 60%)" }}
          />

          <div className="relative max-w-5xl mx-auto px-5 py-12 md:py-20">
            <div className="grid md:grid-cols-2 gap-8 md:gap-14 items-center">
              <ScrollReveal>
                <div className="flex items-start gap-3 mb-2">
                  <span className="font-heading text-4xl md:text-5xl font-bold text-accent/12 leading-none italic select-none">§</span>
                  <div className="pt-2">
                    <span className="text-[10px] text-muted tracking-[0.18em] uppercase">Contoh output</span>
                    <h2 className="font-heading font-bold text-xl md:text-2xl tracking-tight leading-[1.1] mt-0.5">
                      Hasil yang langsung <span className="text-muted italic">bisa dipakai.</span>
                    </h2>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted leading-relaxed mb-5 max-w-sm">
                  Bukan angka mentah. Setiap hasil datang dengan interpretasi naratif dan opsi export ke DOCX.
                </p>

                {/* Inline feature checklist with stagger */}
                <ul className="space-y-2 mb-6 stagger">
                  {[
                    "Tabel hasil terstruktur",
                    "Grafik visualisasi",
                    "Interpretasi naratif otomatis",
                    "Catatan metodologi",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-muted">
                      <span className="w-4 h-4 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-2.5 h-2.5 text-accent" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                <Link to="/statistik" className="inline-flex items-center gap-1 text-accent text-sm font-medium hover:gap-1.5 transition-all">
                  Coba sendiri <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </ScrollReveal>

              <ScrollReveal delay={0.1}>
                <div className="relative bg-card border border-border rounded-lg overflow-hidden shadow-[0_1px_8px_rgba(0,0,0,0.05)] transition-transform duration-500 hover:-translate-y-1 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                  <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-border">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent/40" />
                    <span className="text-[11px] font-mono text-muted ml-1.5">hasil-analisis.docx</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-muted mb-0.5">Uji</div>
                        <div className="text-xs font-semibold">T-Test</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-muted mb-0.5">p-value</div>
                        <div className="font-mono text-xs font-bold text-teal">0.003</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-muted mb-0.5">Cohen's d</div>
                        <div className="font-mono text-xs font-bold text-accent">0.85</div>
                      </div>
                    </div>
                    <div className="border-l-2 border-accent/30 pl-3 py-0.5">
                      <div className="text-[9px] uppercase tracking-wider text-accent mb-1 font-semibold">Interpretasi</div>
                      <p className="text-[11px] leading-relaxed text-muted">
                        <TypingText
                          text="Terdapat perbedaan signifikan antara kelompok kontrol dan perlakuan (t = 3.42, p = 0.003). Efek yang ditemukan tergolong besar (Cohen's d = 0.85)."
                          speed={30}
                          delay={500}
                        />
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-[9px] text-muted">Contoh output</span>
                      <span className="text-[11px] text-accent font-medium">Export DOCX →</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ===== FLOW / ALUR ===== */}
        <section id="alur" className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, rgb(var(--surface)) 0%, rgb(var(--bg)) 100%)" }}>
          <div
            className="absolute right-0 bottom-0 w-1/3 h-full pointer-events-none opacity-[0.04]"
            style={{ background: "radial-gradient(ellipse at 100% 80%, rgb(var(--warm-rose)), transparent 60%)" }}
          />

          <div className="relative max-w-5xl mx-auto px-5 py-12 md:py-20">
            <ScrollReveal>
              <div className="mb-10 md:mb-14">
                <div className="flex items-start gap-3 mb-2">
                  <span className="font-heading text-4xl md:text-5xl font-bold text-terracotta/12 leading-none italic select-none">§</span>
                  <div className="pt-2">
                    <span className="text-[10px] text-muted tracking-[0.18em] uppercase">Alur</span>
                    <h2 className="font-heading font-bold text-xl md:text-3xl tracking-tight max-w-lg leading-[1.1] mt-0.5">
                      Tiga langkah, <span className="text-muted italic">dari data mentah ke laporan.</span>
                    </h2>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-px bg-border border border-border rounded-xl overflow-hidden">
              {FLOW.map((step, idx) => (
                <ScrollReveal key={step.no} delay={idx * 0.08}>
                  <div className="bg-card h-full p-5 md:p-6 flex flex-col group transition-colors duration-300 hover:bg-bg">
                    <div className="flex items-center justify-between mb-5">
                      <span className="font-heading text-3xl md:text-4xl font-bold text-terracotta/10 group-hover:text-terracotta/20 tracking-tight transition-colors duration-300">{step.no}</span>
                      <step.icon className="w-4 h-4 text-terracotta/50 group-hover:text-terracotta transition-colors duration-300" />
                    </div>
                    <h3 className="font-heading font-semibold text-sm mb-1 tracking-tight">{step.title}</h3>
                    <p className="text-xs text-muted leading-relaxed">{step.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== QUOTE ===== */}
        <section className="relative overflow-hidden" style={{ background: "rgb(var(--surface))" }}>
          <div className="absolute inset-0 dot-pattern-bg opacity-[0.03] pointer-events-none" />
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{ background: "radial-gradient(ellipse at 30% 50%, rgb(var(--accent)), transparent 50%)" }}
          />
          <AmbientBlobs />

          <div className="relative max-w-3xl mx-auto px-5 py-14 md:py-20 text-center">
            <ScrollReveal>
              <span className="block font-heading text-6xl md:text-8xl leading-none text-accent/8 select-none -mb-10 md:-mb-14 -mt-2">&ldquo;</span>
              <blockquote className="font-heading text-lg md:text-2xl lg:text-3xl font-medium leading-[1.3] tracking-tight">
                Sebelumnya pusing milih uji statistik. Di sini tinggal upload, dapat hasil{" "}
                <span className="text-accent italic">plus</span> interpretasinya. Bab 4 selesai dalam semalam.
              </blockquote>
              <div className="mt-5 text-xs text-muted">
                <span className="font-medium text-fg">Mahasiswa S1</span>{" · "}<span>Program Studi Psikologi</span>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-border" style={{ background: "rgb(var(--bg))" }}>
        <div className="max-w-5xl mx-auto px-5 py-8">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Logo size={20} />
                <span className="text-sm font-heading font-bold tracking-tight">Azezmen</span>
              </div>
              <p className="text-xs text-muted leading-relaxed max-w-[200px]">Platform penelitian akademik Indonesia.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 md:justify-self-end">
              <div className="space-y-1.5 text-xs">
                <div className="text-[10px] uppercase tracking-wider text-muted/70 mb-1.5">Produk</div>
                <Link to="/statistik" className="block text-fg hover:text-accent transition-colors">Statistik</Link>
                <Link to="/kuesioner" className="block text-fg hover:text-accent transition-colors">Kuesioner</Link>
                <Link to="/wizard" className="block text-fg hover:text-accent transition-colors">Panduan</Link>
                <Link to="/assessment" className="block text-fg hover:text-accent transition-colors">Assessment</Link>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="text-[10px] uppercase tracking-wider text-muted/70 mb-1.5">Lainnya</div>
                <Link to="/help" className="block text-fg hover:text-accent transition-colors">Bantuan</Link>
                <Link to="/feedback" className="block text-fg hover:text-accent transition-colors">Kontak</Link>
                <Link to="/privasi" className="block text-fg hover:text-accent transition-colors">Privasi</Link>
                <Link to="/syarat" className="block text-fg hover:text-accent transition-colors">Ketentuan</Link>
              </div>
            </div>
            <div className="md:justify-self-end md:text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted/70 mb-1.5">Akun</div>
              {user ? (
                <Link to="/dashboard" className="inline-block px-4 py-2 bg-accent hover:bg-accent/90 text-accent-fg rounded-lg text-xs font-semibold transition-colors">Buka dashboard</Link>
              ) : (
                <div className="flex md:justify-end gap-1.5">
                  <Link to="/auth" className="px-4 py-2 border border-border hover:border-accent/50 hover:text-accent rounded-lg text-xs font-medium transition-all">Masuk</Link>
                  <Link to="/auth" className="px-4 py-2 bg-accent hover:bg-accent/90 text-accent-fg rounded-lg text-xs font-semibold transition-colors">Daftar</Link>
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-border pt-4 text-[11px] text-muted">© {new Date().getFullYear()} Azezmen.</div>
        </div>
      </footer>

      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />

      {/* Guided wizard — "Bingung?" button triggers this */}
      <GuidedWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={(intent) => {
          // Navigate to the Statistik page where the user can upload & run analysis
          navigate("/statistik", { state: { wizardIntent: intent } });
        }}
        onSkip={() => setWizardOpen(false)}
      />
    </div>
  );
}

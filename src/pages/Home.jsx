import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronRight,
  BarChart3,
  ClipboardList,
  FileText,
  CheckCircle,
  BookOpen,
  Target,
  FlaskConical,
  Brain,
  GraduationCap,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";

const TRUST_ITEMS = [
  "Perhitungan transparan",
  "Metode statistik standar",
  "Template APA 7th",
  "Data tetap di browser",
];

const QUICK_ACCESS = [
  { label: "Statistik", path: "/statistik", icon: BarChart3 },
  { label: "Kuesioner", path: "/kuesioner", icon: ClipboardList },
  { label: "Wizard Skripsi", path: "/wizard", icon: FileText },
  { label: "Assessment", path: "/assessment", icon: CheckCircle },
];

const WORKFLOW_STEPS = [
  "Upload Data",
  "Review Variabel",
  "Pilih Analisis",
  "Interpretasi Hasil",
  "Export Laporan",
];

const SERVICE_GROUPS = [
  {
    id: "kuantitatif",
    label: "Kuantitatif",
    icon: BarChart3,
    services: [
      {
        title: "Statistik",
        path: "/statistik",
        description: "Analisis deskriptif, inferensial, dan visualisasi data",
        tags: ["Deskriptif", "Normalitas", "Korelasi"],
        primary: true,
      },
      {
        title: "Sampling",
        path: "/sampling",
        description: "Hitung sampel ideal, power analysis, stratifikasi",
        tags: ["Power Analysis", "Stratified"],
        primary: false,
      },
      {
        title: "Regresi",
        path: "/statistik?tool=regresi",
        description: "Regresi linear, logistik, multivariat",
        tags: ["Linear", "Logistik", "Multivariat"],
        primary: false,
      },
      {
        title: "Mediasi",
        path: "/mediasi",
        description: "Uji mediasi dan moderasi variabel",
        tags: ["Mediasi", "Moderasi", "Path"],
        primary: false,
      },
    ],
  },
  {
    id: "kualitatif",
    label: "Kualitatif",
    icon: BookOpen,
    services: [
      {
        title: "Analisis Kualitatif",
        path: "/kualitatif",
        description: "Coding tema, analisis konten, dan triangulasi",
        tags: ["Thematic", "Content Analysis"],
        primary: false,
      },
      {
        title: "Ringkasan Wawancara",
        path: "/kualitatif",
        description: "Ringkasan otomatis dari transkrip wawancara",
        tags: ["Ringkasan", "Transkrip"],
        primary: false,
      },
      {
        title: "Koding Tema",
        path: "/kualitatif",
        description: "Identifikasi dan kategorisasi tema dari data kualitatif",
        tags: ["Coding", "Kategori"],
        primary: false,
      },
    ],
  },
  {
    id: "instrumen",
    label: "Instrumen",
    icon: Target,
    services: [
      {
        title: "Kuesioner",
        path: "/kuesioner",
        description: "Generate instrumen Likert, validasi, dan uji coba",
        tags: ["Likert", "Validasi", "Blueprint"],
        primary: true,
      },
      {
        title: "Uji Butir",
        path: "/butir-soal",
        description: "Analisis butir soal, difficulty index, discrimination",
        tags: ["Difficulty", "Discrimination"],
        primary: false,
      },
      {
        title: "Assessment",
        path: "/assessment",
        description: "Rubrik penilaian otomatis untuk esai dan tugas",
        tags: ["Rubrik", "Skoring", "Esai"],
        primary: false,
      },
      {
        title: "EFA",
        path: "/efa",
        description: "Exploratory Factor Analysis untuk identifikasi dimensi",
        tags: ["EFA", "Factor Loading"],
        primary: false,
      },
    ],
  },
  {
    id: "referensi",
    label: "Referensi & Skripsi",
    icon: GraduationCap,
    services: [
      {
        title: "Referensi",
        path: "/referensi",
        description: "Kelola sitasi, bibliography, dan referensi",
        tags: ["Citation", "Bibliography"],
        primary: false,
      },
      {
        title: "Wizard Skripsi",
        path: "/wizard",
        description: "Panduan langkah demi langkah menyusun skripsi",
        tags: ["Step-by-step", "Template"],
        primary: true,
      },
      {
        title: "Laporan Statistik",
        path: "/statistik/report",
        description: "Auto-generate Bab IV dari hasil analisis",
        tags: ["Bab IV", "APA Format"],
        primary: false,
      },
      {
        title: "Bantuan Akademik",
        path: "/help",
        description: "Panduan penggunaan dan FAQ",
        tags: ["FAQ", "Panduan"],
        primary: false,
      },
    ],
  },
];

export default function Home() {
  const [activeGroup, setActiveGroup] = useState("kuantitatif");

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-bg text-fg font-body">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="text-xl font-heading font-semibold">Zoya</span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection("layanan")}
                className="text-sm hover:text-accent transition-colors"
              >
                Layanan
              </button>
              <button
                onClick={() => scrollToSection("alur")}
                className="text-sm hover:text-accent transition-colors"
              >
                Alur
              </button>
              <button
                onClick={() => scrollToSection("contoh")}
                className="text-sm hover:text-accent transition-colors"
              >
                Contoh Output
              </button>
              <Link
                to="/help"
                className="text-sm hover:text-accent transition-colors"
              >
                Bantuan
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-surface transition-colors"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                >
                  Daftar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-3/5">
              <h1 className="text-4xl md:text-5xl font-heading font-bold leading-tight mb-6">
                Olah data penelitian dari dataset ke laporan akademik.
              </h1>
              <p className="text-lg text-muted mb-8 max-w-2xl">
                Analisis statistik, interpretasi hasil, dan susun laporan —
                seluruh alur penelitian dalam satu tempat.
              </p>

              <div className="flex flex-wrap gap-4 mb-8">
                {TRUST_ITEMS.map((item) => (
                  <div
                    key={item}
                    className="text-sm px-3 py-1.5 rounded-lg bg-surface text-muted"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4">
                <Link
                  to="/wizard"
                  className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium"
                >
                  Mulai dari Wizard
                </Link>
                <button
                  onClick={() => scrollToSection("layanan")}
                  className="px-6 py-3 border border-border rounded-lg hover:bg-surface transition-colors font-medium"
                >
                  Lihat Layanan
                </button>
              </div>
            </div>

            <div className="lg:w-2/5 w-full">
              <div className="border border-border bg-card rounded-xl p-5 shadow-sm">
                <h3 className="font-heading font-semibold text-lg mb-4">
                  Mulai dari kebutuhanmu
                </h3>
                <div className="space-y-3">
                  {QUICK_ACCESS.map((item) => (
                    <Link
                      key={item.label}
                      to={item.path}
                      className="flex items-center justify-between p-4 border border-border bg-card rounded-lg hover:border-accent/30 hover:bg-surface transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 text-accent" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent group-hover:translate-x-1 transition-transform" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section id="alur" className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-heading font-bold text-center mb-12">
            Alur Penelitian
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-between relative">
            {WORKFLOW_STEPS.map((step, index) => (
              <div key={step} className="flex flex-col items-center relative">
                <div className="w-10 h-10 rounded-full border-2 border-accent bg-card flex items-center justify-center font-semibold mb-3">
                  {index + 1}
                </div>
                <span className="text-sm font-medium text-center">{step}</span>
                {index < WORKFLOW_STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-5 left-1/2 w-full h-0.5 bg-border -z-10" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Services */}
        <section id="layanan" className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-heading font-bold text-center mb-12">
            Layanan
          </h2>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar - Desktop */}
            <div className="lg:w-1/4 hidden lg:block">
              <div className="sticky top-24 space-y-2">
                {SERVICE_GROUPS.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setActiveGroup(group.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      activeGroup === group.id
                        ? "bg-accent-soft text-accent font-medium"
                        : "hover:bg-surface"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <group.icon className="w-5 h-5" />
                      {group.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Tabs */}
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-4">
              {SERVICE_GROUPS.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setActiveGroup(group.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full border transition-colors ${
                    activeGroup === group.id
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border hover:bg-surface"
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>

            {/* Services Grid */}
            <div className="lg:w-3/4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {SERVICE_GROUPS.find((g) => g.id === activeGroup)?.services.map(
                  (service) => (
                    <div
                      key={service.title}
                      className={`border rounded-xl p-5 transition-all hover:border-accent/30 ${
                        service.primary
                          ? "border-accent/20 bg-accent/[0.03]"
                          : "border-border bg-card"
                      }`}
                    >
                      <h3 className="font-heading font-semibold text-lg mb-2">
                        {service.title}
                      </h3>
                      <p className="text-sm text-muted mb-4">
                        {service.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {service.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded bg-surface text-muted"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <Link
                        to={service.path}
                        className="inline-flex items-center gap-1 text-accent text-sm font-medium hover:gap-2 transition-all"
                      >
                        Buka <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Sample Output */}
        <section id="contoh" className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-heading font-bold text-center mb-12">
            Contoh Output
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-border bg-card rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h4 className="font-semibold text-sm">
                  Tabel Statistik Deskriptif
                </h4>
              </div>
              <div className="p-5">
                <div className="text-xs font-mono space-y-1">
                  <div className="flex justify-between">
                    <span>Mean</span>
                    <span>3.45</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SD</span>
                    <span>0.89</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min</span>
                    <span>1.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max</span>
                    <span>5.00</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-border bg-card rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h4 className="font-semibold text-sm">Output Regresi</h4>
              </div>
              <div className="p-5">
                <div className="text-xs font-mono space-y-1">
                  <div className="flex justify-between">
                    <span>Koefisien</span>
                    <span>0.324</span>
                  </div>
                  <div className="flex justify-between">
                    <span>p-value</span>
                    <span>0.002</span>
                  </div>
                  <div className="flex justify-between">
                    <span>R²</span>
                    <span>0.67</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-border bg-card rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h4 className="font-semibold text-sm">Interpretasi Hasil</h4>
              </div>
              <div className="p-5">
                <p className="text-xs font-mono">
                  Terdapat hubungan signifikan antara variabel X dan Y (p
                  &lt; .05). Koefisien positif menunjukkan hubungan searah.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="text-lg font-heading font-semibold">
              Zoya — Platform Penelitian Akademik
            </div>
            <p className="text-sm text-muted max-w-md">
              Dibuat untuk penelitian kuantitatif · Data tetap di browser Anda
            </p>
            <div className="flex gap-6 text-sm">
              <Link to="/help" className="text-muted hover:text-accent">
                Bantuan
              </Link>
              <Link to="/login" className="text-muted hover:text-accent">
                Masuk
              </Link>
              <Link to="/register" className="text-muted hover:text-accent">
                Daftar
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
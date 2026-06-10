import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronRight, FileText, BarChart3, Users, Shield } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import Logo from "../components/Logo";

export default function Home() {
  const modules = [
    {
      title: "Deskriptif & Eksplorasi",
      description: "Statistik deskriptif, visualisasi distribusi, identifikasi outlier, dan pemeriksaan asumsi.",
      tags: ["Mean/SD", "Histogram", "Boxplot", "Normalitas"],
      path: "/modules/descriptive",
    },
    {
      title: "Uji Hipotesis",
      description: "Uji-t, ANOVA, chi-square, korelasi, dan uji non-parametrik dengan interpretasi lengkap.",
      tags: ["t-test", "ANOVA", "Chi-square", "Korelasi"],
      path: "/modules/hypothesis",
    },
    {
      title: "Regresi & Modeling",
      description: "Regresi linear, logistik, multilevel, dan analisis jalur dengan diagnostik model.",
      tags: ["Regresi Linear", "Logistik", "Multilevel", "Path Analysis"],
      path: "/modules/regression",
    },
    {
      title: "Laporan Akademik",
      description: "Template laporan APA-style, tabel siap publikasi, visualisasi konsisten, dan ekspor ke Word/LaTeX.",
      tags: ["Template APA", "Tabel Format", "Ekspor Doc", "LaTeX"],
      path: "/modules/reporting",
    },
  ];

  const workflowSteps = [
    "Upload Data",
    "Review Variabel",
    "Pilih Analisis",
    "Interpretasi Hasil",
    "Export Laporan",
  ];

  const audiences = [
    {
      title: "Mahasiswa S1/S2",
      description: "Skripsi, tesis, atau tugas mata kuliah metodologi penelitian.",
      icon: <FileText className="w-5 h-5" />,
    },
    {
      title: "Dosen & Peneliti",
      description: "Penelitian mandiri, publikasi jurnal, atau bahan pengajaran.",
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      title: "Tim Penelitian",
      description: "Kolaborasi dalam proyek dengan pembagian peran dan versi data.",
      icon: <Users className="w-5 h-5" />,
    },
    {
      title: "Lembaga Riset",
      description: "Standardisasi analisis dan pelaporan untuk konsistensi internal.",
      icon: <Shield className="w-5 h-5" />,
    },
  ];

  const principles = [
    {
      title: "Transparansi Metode",
      description: "Setiap analisis dilengkapi dengan penjelasan metodologis, asumsi, dan batasan interpretasi.",
    },
    {
      title: "Reproduksibilitas",
      description: "Seluruh langkah analisis dapat dilacak dan diulang dengan dataset yang sama.",
    },
    {
      title: "Standar Akademik",
      description: "Mengikuti pedoman pelaporan ilmiah (APA, ICMJE) dan praktik statistik yang baik.",
    },
    {
      title: "Fleksibilitas",
      description: "Dapat digunakan sebagai panduan step-by-step atau toolkit analisis mandiri.",
    },
  ];

  const sampleOutputs = [
    {
      title: "Tabel Statistik Deskriptif",
      description: "Format siap publikasi dengan mean, SD, min, max, dan skewness/kurtosis.",
      format: "APA Style",
    },
    {
      title: "Output Analisis Regresi",
      description: "Koefisien, signifikansi, interval kepercayaan, dan metrik goodness-of-fit.",
      format: "Journal Ready",
    },
    {
      title: "Visualisasi Interpretatif",
      description: "Grafik dengan anotasi statistik dan penekanan pada pola penting.",
      format: "Publication Quality",
    },
  ];

  return (
    <div className="min-h-screen bg-bg text-fg font-body">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 ">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="text-lg font-heading font-semibold">ResearchFlow</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/modules" className="text-muted hover:text-accent transition">
                Modul
              </Link>
              <Link to="/docs" className="text-muted hover:text-accent transition">
                Dokumentasi
              </Link>
              <Link to="/pricing" className="text-muted hover:text-accent transition">
                Harga
              </Link>
              <Link to="/login" className="text-muted hover:text-accent transition">
                Masuk
              </Link>
            </nav>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                to="/signup"
                className="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition"
              >
                Daftar
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-heading font-bold leading-tight mb-6">
                Olah data penelitian dari dataset ke laporan akademik.
              </h1>
              <p className="text-xl text-muted mb-10">
                Analisis statistik, interpretasi hasil, dan susun laporan — seluruh alur penelitian dalam satu tempat.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/wizard"
                  className="px-6 py-3 bg-accent text-white rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2"
                >
                  Mulai dari Wizard
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/modules"
                  className="px-6 py-3 border border-border bg-card rounded-lg hover:bg-surface transition flex items-center justify-center gap-2"
                >
                  Lihat Modul
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Strip */}
        <section className="py-12 border-y border-border bg-surface">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-heading font-semibold text-center mb-10">Alur Penelitian</h2>
            <div className="relative">
              {/* Desktop horizontal steps */}
              <div className="hidden md:flex items-center justify-between">
                {workflowSteps.map((step, idx) => (
                  <div key={idx} className="flex flex-col items-center relative z-10">
                    <div className="w-12 h-12 rounded-full border-2 border-accent bg-card flex items-center justify-center mb-3">
                      <span className="font-heading font-semibold text-accent">{idx + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-center max-w-[120px]">{step}</span>
                    {idx < workflowSteps.length - 1 && (
                      <div className="absolute top-6 left-1/2 w-full h-0.5 bg-border -translate-y-1/2 z-0"></div>
                    )}
                  </div>
                ))}
              </div>
              {/* Mobile vertical steps */}
              <div className="md:hidden space-y-8">
                {workflowSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-accent bg-card flex-shrink-0 flex items-center justify-center">
                      <span className="font-heading font-semibold text-accent">{idx + 1}</span>
                    </div>
                    <div>
                      <span className="font-medium">{step}</span>
                      {idx < workflowSteps.length - 1 && (
                        <div className="mt-4 ml-5 w-0.5 h-8 bg-border"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Trust Bar */}
        <section className="py-8 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted">
              <span>Dipakai oleh 500+ peneliti</span>
              <span className="hidden sm:inline">•</span>
              <span>Kompatibel dengan R/SPSS</span>
              <span className="hidden sm:inline">•</span>
              <span>Template APA 7th Edition</span>
              <span className="hidden sm:inline">•</span>
              <span>Dukungan regresi multivariat</span>
            </div>
          </div>
        </section>

        {/* Modules */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-heading font-bold mb-4">Modul Analisis</h2>
              <p className="text-muted max-w-2xl mx-auto">
                Pilih modul sesuai kebutuhan analisis. Setiap modul menyediakan panduan langkah demi langkah.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {modules.map((module, idx) => (
                <div
                  key={idx}
                  className="border border-border bg-card rounded-lg p-5 hover:border-accent/30 transition group"
                >
                  <h3 className="font-heading font-semibold text-lg mb-3">{module.title}</h3>
                  <p className="text-sm text-muted mb-4">{module.description}</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {module.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 text-xs rounded-full bg-surface text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Link
                    to={module.path}
                    className="inline-flex items-center gap-1 text-accent text-sm font-medium group-hover:gap-2 transition-all"
                  >
                    Jelajahi modul
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Audiences */}
        <section className="py-16 bg-surface">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-heading font-bold mb-4">Cocok untuk</h2>
              <p className="text-muted max-w-2xl mx-auto">
                Dirancang untuk berbagai tingkat pengalaman dan konteks penelitian.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {audiences.map((audience, idx) => (
                <div
                  key={idx}
                  className="border border-border bg-card rounded-lg p-6 text-center"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent-soft text-accent mb-4">
                    {audience.icon}
                  </div>
                  <h3 className="font-heading font-semibold text-lg mb-2">{audience.title}</h3>
                  <p className="text-sm text-muted">{audience.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Principles */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-heading font-bold mb-4">Transparansi Metode</h2>
              <p className="text-muted max-w-2xl mx-auto">
                Setiap analisis didukung dengan penjelasan metodologis yang jelas dan referensi yang dapat dipertanggungjawabkan.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {principles.map((principle, idx) => (
                <div key={idx} className="border border-border bg-card rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center">
                      <Check className="w-4 h-4 text-accent" />
                    </div>
                    <h3 className="font-heading font-semibold text-lg">{principle.title}</h3>
                  </div>
                  <p className="text-muted text-sm">{principle.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sample Output */}
        <section className="py-16 bg-surface">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-heading font-bold mb-4">Contoh Output</h2>
              <p className="text-muted max-w-2xl mx-auto">
                Hasil analisis yang siap digunakan dalam laporan akademik.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {sampleOutputs.map((output, idx) => (
                <div
                  key={idx}
                  className="border border-border bg-card rounded-lg p-6"
                >
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 text-xs rounded-full bg-surface text-muted">
                      {output.format}
                    </span>
                  </div>
                  <h3 className="font-heading font-semibold text-lg mb-3">{output.title}</h3>
                  <p className="text-muted text-sm">{output.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center border border-border bg-card rounded-2xl p-10">
              <h2 className="text-3xl font-heading font-bold mb-4">Siap memulai penelitian?</h2>
              <p className="text-muted mb-8">
                Mulai dengan wizard panduan atau jelajahi modul analisis sesuai kebutuhan.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/wizard"
                  className="px-6 py-3 bg-accent text-white rounded-lg hover:opacity-90 transition"
                >
                  Mulai dari Wizard
                </Link>
                <Link
                  to="/modules"
                  className="px-6 py-3 border border-border rounded-lg hover:bg-surface transition"
                >
                  Lihat Semua Modul
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="text-lg font-heading font-semibold">ResearchFlow</span>
            </div>
            <p className="text-sm text-muted text-center">
              Dibuat untuk penelitian kuantitatif · Diverifikasi R/SPSS
            </p>
            <div className="flex items-center gap-6 text-sm text-muted">
              <Link to="/privacy" className="hover:text-accent transition">
                Privasi
              </Link>
              <Link to="/terms" className="hover:text-accent transition">
                Ketentuan
              </Link>
              <Link to="/contact" className="hover:text-accent transition">
                Kontak
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
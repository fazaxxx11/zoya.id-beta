// Skripsi Wizard — Guided Checklist
// =================================
// Halaman terpusat yang memandu mahasiswa dari awal sampai akhir alur
// pengerjaan skripsi kuantitatif/kualitatif. Per langkah ada:
//   - Deskripsi singkat
//   - Link ke tool yang relevan
//   - Checkbox progress (tersimpan di localStorage)
//   - Decision tree mini untuk pilih analisis berdasarkan jenis hipotesis

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Compass, CheckCircle2, Circle, ChevronRight, ChevronDown,
  ClipboardList, Users, Beaker, Activity, Layers, MessageSquare,
  FileText, BookOpen, Sparkles, Award, Target,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'

const PROGRESS_KEY = 'skripsi_wizard_progress_v1'
const TYPE_KEY = 'skripsi_wizard_type_v1'

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}') } catch { return {} }
}
function saveProgress(p) { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)) }

// ============================================================
// Wizard data structure
// ============================================================
const QUANT_STEPS = [
  {
    id: 'q1', title: 'Tentukan Variabel & Hipotesis',
    icon: Target, color: 'bg-blue-500',
    desc: 'Identifikasi variabel bebas (X) & terikat (Y), serta moderator/mediator (W/M) bila ada. Rumuskan hipotesis nol & alternatif.',
    tips: [
      'Variabel bebas = yang Anda manipulasi atau ukur sebagai prediktor',
      'Variabel terikat = outcome yang ingin Anda jelaskan/prediksi',
      'Skala data: nominal, ordinal, interval, rasio — menentukan jenis uji',
    ],
  },
  {
    id: 'q2', title: 'Susun Kuesioner / Instrumen',
    icon: ClipboardList, color: 'bg-cyan-500',
    desc: 'Buat butir-butir pertanyaan (Likert biasanya). Idealnya per variabel ≥ 4 item.',
    tools: [{ label: 'Buat Kuesioner', href: '/kuesioner' }],
  },
  {
    id: 'q3', title: 'Tentukan Ukuran Sampel',
    icon: Users, color: 'bg-emerald-500',
    desc: 'Hitung jumlah responden minimal (Slovin / Cochran / power analysis).',
    tools: [
      { label: 'Sampling Calculator', href: '/sampling' },
      { label: 'Power Analysis', href: '/statistik/power' },
    ],
  },
  {
    id: 'q4', title: 'Validitas & Reliabilitas Instrumen',
    icon: Beaker, color: 'bg-purple-500',
    desc: 'Sebelum analisis utama: cek apakah item-item kuesioner valid (Pearson/EFA) & reliabel (Cronbach α).',
    tools: [
      { label: 'Validitas & Reliabilitas', href: '/statistik?tool=validitas' },
      { label: 'EFA (Faktor)', href: '/efa' },
      { label: 'Item Analysis (Soal Tes)', href: '/butir-soal' },
    ],
    tips: [
      'Cronbach α ≥ 0.7 = reliabel',
      'EFA cocok untuk validasi konstruk multi-faktor',
      'KMO ≥ 0.6 dan Bartlett p < 0.05 = data layak EFA',
    ],
  },
  {
    id: 'q5', title: 'Analisis Deskriptif',
    icon: Activity, color: 'bg-amber-500',
    desc: 'Mean, median, SD, frekuensi — gambaran umum data sebelum uji hipotesis.',
    tools: [{ label: 'Statistik Deskriptif', href: '/statistik?tool=deskriptif' }],
  },
  {
    id: 'q6', title: 'Uji Asumsi (Normalitas, dll)',
    icon: Sparkles, color: 'bg-rose-500',
    desc: 'Uji normalitas (Shapiro-Wilk), homogenitas, multikolinearitas — sesuai analisis yang dipilih.',
    tools: [{ label: 'Uji Asumsi', href: '/statistik?tool=normalitas' }],
  },
  {
    id: 'q7', title: 'Analisis Inferensial Utama',
    icon: Layers, color: 'bg-accent',
    desc: 'Pilih sesuai hipotesis & jenis data — gunakan Decision Tree di bawah.',
    isAnalysisPicker: true,
  },
  {
    id: 'q8', title: 'Generate Bab IV',
    icon: FileText, color: 'bg-muted',
    desc: 'Setelah semua analisis selesai dan disimpan, compile ke draft Bab IV otomatis.',
    tools: [
      { label: 'Generator Bab IV', href: '/statistik/report' },
      { label: 'Riwayat Analisis', href: '/statistik/history' },
    ],
    tips: ['Pastikan setiap analisis sudah ditekan tombol "Simpan ke Riwayat"'],
  },
  {
    id: 'q9', title: 'Backup Workspace',
    icon: BookOpen, color: 'bg-slate-700',
    desc: 'Sebelum sidang, backup semua data riset Anda ke file .json.',
    tools: [{ label: 'Pengaturan & Backup', href: '/pengaturan' }],
  },
]

const QUAL_STEPS = [
  {
    id: 'k1', title: 'Tentukan Pertanyaan Penelitian',
    icon: Target, color: 'bg-blue-500',
    desc: 'Penelitian kualitatif fokus pada "bagaimana" dan "mengapa". Rumuskan pertanyaan terbuka.',
  },
  {
    id: 'k2', title: 'Kumpulkan Data (Wawancara/Observasi)',
    icon: MessageSquare, color: 'bg-cyan-500',
    desc: 'Transkrip wawancara, catatan observasi, dokumen — semua jadi sumber data.',
  },
  {
    id: 'k3', title: 'Coding Tematik',
    icon: Layers, color: 'bg-purple-500',
    desc: 'Buat codebook → tag segmen teks → identifikasi tema. Output: hierarki kode + kutipan.',
    tools: [{ label: 'Qualitative Coder', href: '/kualitatif' }],
    tips: [
      'Mulai dengan open coding, lalu axial coding (cluster), terakhir selective',
      'Inter-coder reliability bisa dihitung kalau ada 2 koder',
    ],
  },
  {
    id: 'k4', title: 'Penulisan Temuan',
    icon: FileText, color: 'bg-amber-500',
    desc: 'Susun narasi tematik. Setiap tema didukung kutipan langsung partisipan.',
  },
  {
    id: 'k5', title: 'Backup Workspace',
    icon: BookOpen, color: 'bg-slate-700',
    desc: 'Backup codebook, dokumen, dan codings ke file .json.',
    tools: [{ label: 'Pengaturan & Backup', href: '/pengaturan' }],
  },
]

// Decision tree: hypothesis type × data type → recommended test
const DECISION_TREE = [
  {
    q: 'Hubungan / pengaruh antar variabel?',
    branches: [
      {
        cond: 'Korelasi (asosiasi 2 variabel)',
        items: [
          { test: 'Pearson Correlation', when: 'Kedua variabel interval/rasio, normal', href: '/statistik?tool=korelasi' },
          { test: 'Spearman Correlation', when: 'Ordinal atau tidak normal', href: '/statistik?tool=korelasi' },
        ],
      },
      {
        cond: 'Regresi (prediksi)',
        items: [
          { test: 'Regresi Linier Sederhana', when: '1 prediktor, Y kontinu', href: '/statistik?tool=regresi' },
          { test: 'Regresi Linier Berganda', when: '2+ prediktor, Y kontinu', href: '/statistik?tool=regresi' },
          { test: 'Regresi Logistik', when: 'Y biner (0/1)', href: '/logistik' },
        ],
      },
      {
        cond: 'Mediasi / Moderasi',
        items: [
          { test: 'Hayes Model 4 (Mediasi)', when: 'Variabel M perantara X→Y', href: '/mediasi' },
          { test: 'Hayes Model 1 (Moderasi)', when: 'Variabel W mempengaruhi kekuatan X→Y', href: '/mediasi' },
        ],
      },
    ],
  },
  {
    q: 'Perbedaan rerata antar kelompok?',
    branches: [
      {
        cond: 'Data normal (parametrik)',
        items: [
          { test: 'One-Sample t-test', when: '1 kelompok vs nilai uji', href: '/statistik?tool=ttest' },
          { test: 'Independent t-test', when: '2 kelompok independen', href: '/statistik?tool=ttest' },
          { test: 'Paired t-test', when: 'Sebelum-sesudah (pre-post)', href: '/statistik?tool=ttest' },
          { test: 'One-way ANOVA', when: '3+ kelompok independen', href: '/statistik?tool=ttest' },
        ],
      },
      {
        cond: 'Data tidak normal (non-parametrik)',
        items: [
          { test: 'Mann-Whitney U', when: '2 kelompok independen', href: '/statistik?tool=nonparametric' },
          { test: 'Wilcoxon Signed-Rank', when: 'Pre-post non-parametrik', href: '/statistik?tool=nonparametric' },
          { test: 'Kruskal-Wallis', when: '3+ kelompok independen', href: '/statistik?tool=nonparametric' },
        ],
      },
      {
        cond: 'Pretest-Posttest dengan eksperimen',
        items: [
          { test: 'N-Gain', when: 'Mengukur efektivitas intervensi', href: '/statistik?tool=ngain' },
        ],
      },
    ],
  },
  {
    q: 'Asosiasi data kategorik?',
    branches: [
      {
        cond: 'Kedua variabel kategorik',
        items: [
          { test: 'Chi-Square Independence', when: 'Tabel kontingensi r×c', href: '/statistik?tool=chisquare' },
        ],
      },
    ],
  },
  {
    q: 'Validasi konstruk kuesioner?',
    branches: [
      {
        cond: 'Multi-faktor laten',
        items: [
          { test: 'Exploratory Factor Analysis', when: 'KMO + Bartlett + Loading + Scree', href: '/efa' },
        ],
      },
      {
        cond: 'Reliabilitas internal',
        items: [
          { test: 'Cronbach Alpha', when: 'Skala Likert 1-faktor', href: '/statistik?tool=validitas' },
        ],
      },
    ],
  },
]

// ============================================================
// Component
// ============================================================
export default function SkripsiWizard() {
  const [type, setType] = useState(() => localStorage.getItem(TYPE_KEY) || null)
  const [progress, setProgress] = useState(loadProgress())
  const [openTip, setOpenTip] = useState(null)

  useEffect(() => { if (type) localStorage.setItem(TYPE_KEY, type) }, [type])

  const toggleStep = (id) => {
    const next = { ...progress, [id]: !progress[id] }
    setProgress(next)
    saveProgress(next)
  }

  const steps = type === 'kuantitatif' ? QUANT_STEPS : type === 'kualitatif' ? QUAL_STEPS : []
  const completedCount = steps.filter(s => progress[s.id]).length

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title="Panduan Skripsi"
        subtitle="Panduan terstruktur dari nol sampai sidang"
        breadcrumbs={[
          { path: '/', label: 'Beranda' },
          { path: '/wizard', label: 'Wizard' },
        ]}
      />

      <div className="max-w-4xl mx-auto px-3 sm:px-5 py-4 space-y-4">
        {/* Hero */}
        <div className="bg-gradient-to-br from-accent/5 to-accent-soft/50 border border-accent/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent text-white flex items-center justify-center flex-shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-fg mb-1">Panduan Pengerjaan Skripsi</h2>
              <p className="text-xs text-accent">
                Ikuti langkah demi langkah. Centang yang sudah selesai, klik link tool untuk mengerjakan.
                Progress tersimpan otomatis di browser Anda.
              </p>
            </div>
          </div>
        </div>

        {/* Type selector */}
        {!type && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-sm">Pilih jenis penelitian Anda:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => setType('kuantitatif')}
                      className="border-2 border-border hover:border-accent/50 rounded-xl p-4 text-left transition-colors active:scale-95">
                <div className="text-2xl mb-1">📊</div>
                <div className="font-semibold text-sm mb-1">Kuantitatif</div>
                <p className="text-xs text-muted">Pengujian hipotesis dengan angka & statistik. Cocok untuk: korelasi, perbandingan kelompok, prediksi.</p>
              </button>
              <button onClick={() => setType('kualitatif')}
                      className="border-2 border-border hover:border-accent/50 rounded-xl p-4 text-left transition-colors active:scale-95">
                <div className="text-2xl mb-1">📝</div>
                <div className="font-semibold text-sm mb-1">Kualitatif</div>
                <p className="text-xs text-muted">Eksplorasi makna, persepsi, pengalaman. Coding wawancara, observasi, dokumen.</p>
              </button>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {type && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted">Progress {type}</div>
                <div className="text-sm font-semibold">{completedCount} dari {steps.length} langkah selesai</div>
              </div>
              <button onClick={() => { setType(null); setProgress({}); saveProgress({}); localStorage.removeItem(TYPE_KEY) }}
                      className="text-xs text-muted hover:text-fg/80">
                Ganti jenis
              </button>
            </div>
            <div className="h-2 bg-muted/15 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-accent/50 to-accent-soft/500 transition-all"
                   style={{ width: `${(completedCount / steps.length) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Steps */}
        {type && (
          <div className="space-y-2">
            {steps.map((step, i) => {
              const done = !!progress[step.id]
              const Icon = step.icon
              return (
                <div key={step.id} className={`bg-card border rounded-xl p-4 transition-all ${done ? 'border-emerald-200 bg-emerald-50/30' : 'border-border'}`}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleStep(step.id)} className="flex-shrink-0 mt-0.5">
                      {done
                        ? <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        : <Circle className="w-6 h-6 text-muted/40 hover:text-muted" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <div className={`w-7 h-7 rounded-lg ${step.color} text-white flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <h3 className={`font-semibold text-sm flex-1 ${done ? 'text-muted line-through' : 'text-fg'}`}>
                          {i + 1}. {step.title}
                        </h3>
                      </div>
                      <p className="text-xs text-muted ml-9 mb-2">{step.desc}</p>

                      {/* Tools */}
                      {step.tools && (
                        <div className="ml-9 flex flex-wrap gap-1.5 mb-2">
                          {step.tools.map((t, ti) => (
                            <Link key={ti} to={t.href}
                                  className="inline-flex items-center gap-1 text-xs bg-accent/5 hover:bg-accent/15 text-accent px-2.5 py-1 rounded-md font-medium border border-accent/20">
                              {t.label} <ChevronRight className="w-3 h-3" />
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Decision tree picker */}
                      {step.isAnalysisPicker && <DecisionTreePicker />}

                      {/* Tips */}
                      {step.tips && step.tips.length > 0 && (
                        <div className="ml-9 mt-2">
                          <button onClick={() => setOpenTip(openTip === step.id ? null : step.id)}
                                  className="text-[11px] text-muted hover:text-fg/80 flex items-center gap-1">
                            <ChevronDown className={`w-3 h-3 transition-transform ${openTip === step.id ? 'rotate-0' : '-rotate-90'}`} />
                            Tips ({step.tips.length})
                          </button>
                          {openTip === step.id && (
                            <ul className="mt-1 space-y-0.5 list-disc list-inside text-[11px] text-muted">
                              {step.tips.map((tip, ti) => <li key={ti}>{tip}</li>)}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Completion celebration */}
        {type && completedCount === steps.length && (
          <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-200 rounded-xl p-5 text-center">
            <Award className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <h3 className="font-bold text-emerald-900 mb-1">Selamat! 🎉</h3>
            <p className="text-sm text-emerald-800">Semua langkah selesai. Saatnya finalisasi naskah dan persiapan sidang!</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Decision Tree Picker
// ============================================================
function DecisionTreePicker() {
  const [openIdx, setOpenIdx] = useState(null)
  return (
    <div className="ml-9 mt-2 bg-card/60 border border-border rounded-lg p-3 space-y-1">
      <div className="text-[11px] font-semibold text-fg/80 mb-1">🧭 Decision Tree — Pilih Analisis:</div>
      {DECISION_TREE.map((q, qi) => (
        <div key={qi}>
          <button
            onClick={() => setOpenIdx(openIdx === qi ? null : qi)}
            className="w-full text-left flex items-center gap-1.5 text-xs font-medium text-fg hover:text-accent py-1"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${openIdx === qi ? 'rotate-0' : '-rotate-90'}`} />
            {q.q}
          </button>
          {openIdx === qi && (
            <div className="ml-4 space-y-2 pb-1">
              {q.branches.map((br, bi) => (
                <div key={bi}>
                  <div className="text-[11px] font-semibold text-muted mb-0.5">{br.cond}</div>
                  <div className="space-y-0.5">
                    {br.items.map((item, ii) => (
                      <Link key={ii} to={item.href}
                            className="flex items-start justify-between gap-2 hover:bg-card px-2 py-1 rounded">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-accent">{item.test}</div>
                          <div className="text-[10.5px] text-muted">{item.when}</div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted/40 mt-0.5 flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

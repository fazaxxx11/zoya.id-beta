// Onboarding wizard untuk Statistik — bantu user pilih tool yang tepat.
// 3 state: welcome, wizard (decision tree), done (rekomendasi).

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3, ChevronLeft, ChevronRight, ArrowRight, Check,
  Upload, FileSpreadsheet, Activity, FileDown,
} from 'lucide-react'

// ============================================================
// Decision Tree — graph nodes
// ============================================================
const TOOL_INFO = {
  deskriptif:   { name: 'Statistik Deskriptif', desc: 'Mean, median, SD, skewness, dll. Cocok untuk merangkum data.' },
  normalitas:   { name: 'Uji Normalitas',       desc: 'Shapiro-Wilk untuk cek apakah data berdistribusi normal.' },
  korelasi_pearson:  { tool: 'korelasi', name: 'Korelasi Pearson',   desc: 'Hubungan linier antara 2 variabel numerik (data normal).', method: 'pearson' },
  korelasi_spearman: { tool: 'korelasi', name: 'Korelasi Spearman',  desc: 'Hubungan monotonic non-parametrik (data tidak normal/ordinal).', method: 'spearman' },
  ttest_one:    { tool: 'ttest', name: 'T-Test 1 Sample',  desc: 'Uji apakah rata-rata sampel berbeda dari nilai hipotesis.', mode: 'oneSample' },
  ttest_indep:  { tool: 'ttest', name: 'Independent T-Test', desc: 'Bandingkan rata-rata 2 kelompok independen (data normal).', mode: 'independent' },
  ttest_paired: { tool: 'ttest', name: 'Paired T-Test', desc: 'Bandingkan rata-rata pre vs post pada subjek yang sama (data normal).', mode: 'paired' },
  mannwhitney:  { name: 'Mann-Whitney U', desc: 'Alternatif non-parametrik untuk independent t-test.' },
  wilcoxon:     { name: 'Wilcoxon Signed-Rank', desc: 'Alternatif non-parametrik untuk paired t-test.' },
  anova:        { name: 'One-way ANOVA', desc: 'Bandingkan rata-rata ≥3 kelompok (data normal).' },
  kruskal:      { name: 'Kruskal-Wallis', desc: 'Alternatif non-parametrik untuk ANOVA.' },
  chisquare:    { name: 'Chi-Square', desc: 'Uji hubungan/independensi 2 variabel kategorik.' },
  regresi:      { name: 'Regresi Linier Sederhana', desc: '1 predictor (X) → 1 outcome (Y), prediksi nilai.' },
  regresiganda: { name: 'Regresi Linier Berganda', desc: '≥2 predictor → 1 outcome, kontrol variabel lain.' },
  validitas:    { name: 'Validitas & Reliabilitas', desc: 'Cek kualitas item kuesioner (Pearson + Cronbach α).' },
}

const NODES = {
  start: {
    question: 'Apa tujuan analisis kamu?',
    options: [
      { label: 'Merangkum data (rata-rata, sebaran)', next: 'desc_norm' },
      { label: 'Cek hubungan antar variabel', next: 'relationship' },
      { label: 'Bandingkan kelompok', next: 'compare' },
      { label: 'Prediksi outcome dari predictor', next: 'predict' },
      { label: 'Cek kualitas kuesioner (validitas/reliabilitas)', recommend: 'validitas' },
    ],
  },
  desc_norm: {
    question: 'Sekalian cek distribusi normalitas?',
    options: [
      { label: 'Tidak, cukup deskriptif saja', recommend: 'deskriptif' },
      { label: 'Ya, sekalian uji normalitas', recommend: 'normalitas' },
    ],
  },
  relationship: {
    question: 'Tipe variabel yang ingin dilihat hubungannya?',
    options: [
      { label: 'Keduanya numerik (mis. nilai matematika & IPA)', next: 'rel_numeric' },
      { label: 'Keduanya kategorik (mis. gender & lulus)', recommend: 'chisquare' },
      { label: 'Numerik vs kategorik (mis. nilai per kelas)', next: 'compare' },
    ],
  },
  rel_numeric: {
    question: 'Apakah datanya berdistribusi normal?',
    hint: 'Cek dulu pakai Uji Normalitas. Kalau ragu, pilih “Tidak yakin”.',
    options: [
      { label: 'Ya, normal (sudah dicek)', recommend: 'korelasi_pearson' },
      { label: 'Tidak normal / data ordinal (Likert)', recommend: 'korelasi_spearman' },
      { label: 'Tidak yakin—pakai non-parametrik aman', recommend: 'korelasi_spearman' },
    ],
  },
  compare: {
    question: 'Berapa kelompok yang ingin dibandingkan?',
    options: [
      { label: '1 kelompok vs nilai standar (mis. rata-rata > 75)', recommend: 'ttest_one' },
      { label: '2 kelompok independen (mis. L vs P)', next: 'cmp_2indep' },
      { label: '2 pengukuran berpasangan (pre vs post)', next: 'cmp_paired' },
      { label: '3 atau lebih kelompok independen', next: 'cmp_3plus' },
    ],
  },
  cmp_2indep: {
    question: 'Apakah outcome (numerik) berdistribusi normal?',
    options: [
      { label: 'Ya, normal', recommend: 'ttest_indep' },
      { label: 'Tidak normal / ordinal', recommend: 'mannwhitney' },
      { label: 'Tidak yakin—non-parametrik aman', recommend: 'mannwhitney' },
    ],
  },
  cmp_paired: {
    question: 'Apakah selisih (post − pre) berdistribusi normal?',
    options: [
      { label: 'Ya, normal', recommend: 'ttest_paired' },
      { label: 'Tidak normal / ordinal', recommend: 'wilcoxon' },
      { label: 'Tidak yakin—non-parametrik aman', recommend: 'wilcoxon' },
    ],
  },
  cmp_3plus: {
    question: 'Apakah outcome berdistribusi normal di setiap kelompok?',
    options: [
      { label: 'Ya, normal', recommend: 'anova' },
      { label: 'Tidak normal / ordinal', recommend: 'kruskal' },
      { label: 'Tidak yakin—non-parametrik aman', recommend: 'kruskal' },
    ],
  },
  predict: {
    question: 'Berapa variabel predictor (X)?',
    options: [
      { label: '1 predictor (mis. matematika → IPA)', recommend: 'regresi' },
      { label: '2 atau lebih predictor (mis. jam belajar + IQ → nilai)', recommend: 'regresiganda' },
    ],
  },
}

// ============================================================
// Component
// ============================================================
export default function OnboardingStatistik() {
  const navigate = useNavigate()
  const [stage, setStage] = useState('welcome') // 'welcome' | 'wizard' | 'done'
  const [path, setPath] = useState(['start'])
  const [recommendation, setRecommendation] = useState(null)

  const currentNodeId = path[path.length - 1]
  const currentNode = NODES[currentNodeId]

  const handleChoose = (option) => {
    if (option.recommend) {
      setRecommendation(option.recommend)
      setStage('done')
    } else if (option.next) {
      setPath([...path, option.next])
    }
  }

  const handleBack = () => {
    if (path.length > 1) {
      setPath(path.slice(0, -1))
    } else {
      setStage('welcome')
    }
  }

  const skipToTools = () => {
    localStorage.setItem('statistik_onboarded', '1')
    navigate('/statistik')
  }

  const goToRecommendedTool = () => {
    localStorage.setItem('statistik_onboarded', '1')
    const info = TOOL_INFO[recommendation]
    const toolId = info.tool || recommendation
    const params = new URLSearchParams({ tool: toolId })
    if (info.method) params.set('method', info.method)
    if (info.mode) params.set('mode', info.mode)
    navigate(`/statistik?${params.toString()}`)
  }

  const restartWizard = () => {
    setPath(['start'])
    setRecommendation(null)
    setStage('wizard')
  }

  return (
    <div className="min-h-screen bg-pattern">
      <header className="bg-white/85 backdrop-blur-md border-b border-border/70 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-xs text-muted hover:text-gray-900 dark:text-gray-100">
            <ChevronLeft className="w-4 h-4" />Kembali
          </button>
          <div className="h-4 w-px bg-gray-300" />
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 tracking-tight">Panduan</span>
          </div>
          <button onClick={skipToTools}
                  className="ml-auto text-xs text-muted hover:text-gray-900 dark:text-gray-100">
            Lewati
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {stage === 'welcome' && <Welcome onStart={() => setStage('wizard')} onSkip={skipToTools} />}
        {stage === 'wizard' && (
          <WizardStep
            node={currentNode}
            stepIndex={path.length}
            onChoose={handleChoose}
            onBack={handleBack}
          />
        )}
        {stage === 'done' && (
          <Recommendation
            toolKey={recommendation}
            onGo={goToRecommendedTool}
            onRestart={restartWizard}
            onSkip={skipToTools}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================
// Welcome
// ============================================================
function Welcome({ onStart, onSkip }) {
  return (
    <div className="bg-card rounded-xl border border-border/80 p-6">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-2">Modul Statistik</div>
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Panduan memilih analisis</h1>
      <p className="text-sm text-muted mt-1.5 leading-relaxed">
        Dua sampai tiga pertanyaan singkat, lalu kami rekomendasikan tool yang sesuai dengan tujuan dan tipe datamu.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5 mb-5">
        {[
          { icon: Upload,          label: 'Upload', desc: 'Excel / CSV' },
          { icon: FileSpreadsheet, label: 'Pilih',  desc: 'Wizard / manual' },
          { icon: Activity,        label: 'Run',    desc: 'Hasil + chart' },
          { icon: FileDown,        label: 'Export', desc: 'Excel / PDF' },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/80">
            <s.icon className="w-3.5 h-3.5 text-muted" strokeWidth={1.75} />
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-tight">{s.label}</div>
              <div className="text-[11px] text-muted leading-tight">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={onStart}
                className="flex-1 bg-gray-900 hover:bg-black text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
          Mulai panduan
          <ArrowRight className="w-4 h-4" strokeWidth={2} />
        </button>
        <button onClick={onSkip}
                className="flex-1 border border-border hover:bg-surface text-sm text-gray-700 dark:text-gray-300 font-medium py-2.5 px-4 rounded-lg transition-colors">
          Langsung ke tools
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Wizard Step
// ============================================================
function WizardStep({ node, stepIndex, onChoose, onBack }) {
  return (
    <div className="bg-card rounded-xl border border-border/80 p-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack}
                className="text-xs text-muted hover:text-gray-900 dark:text-gray-100 flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> Kembali
        </button>
        <div className="text-[11px] uppercase tracking-[0.16em] text-muted">Pertanyaan {stepIndex}</div>
      </div>

      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight mt-3">{node.question}</h2>
      {node.hint && (
        <p className="text-xs text-muted mt-1.5 leading-relaxed">{node.hint}</p>
      )}

      <div className="divide-y divide-gray-100 border border-border/80 rounded-lg mt-5 overflow-hidden">
        {node.options.map((opt, i) => (
          <button key={i} onClick={() => onChoose(opt)}
                  className="w-full text-left px-4 py-3 hover:bg-surface transition-colors flex items-center justify-between group">
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:text-gray-100">{opt.label}</span>
            <ChevronRight className="w-4 h-4 text-muted group-hover:text-gray-600 dark:text-gray-400 flex-shrink-0 ml-3" strokeWidth={2} />
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Recommendation
// ============================================================
function Recommendation({ toolKey, onGo, onRestart, onSkip }) {
  const info = TOOL_INFO[toolKey]
  if (!info) return null

  return (
    <div className="bg-card rounded-xl border border-border/80 p-6">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-3">
        <Check className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" strokeWidth={2.5} />
        Rekomendasi
      </div>

      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{info.name}</h3>
      <p className="text-sm text-muted mt-1.5 leading-relaxed">{info.desc}</p>

      <div className="mt-5 border-t border-border pt-4">
        <div className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium mb-2">Persiapan data</div>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5">
          <li className="flex gap-2"><span className="text-muted">—</span>File Excel (.xlsx) atau CSV (.csv)</li>
          <li className="flex gap-2"><span className="text-muted">—</span>Header kolom di baris pertama</li>
          <li className="flex gap-2"><span className="text-muted">—</span>Setiap baris satu observasi / responden</li>
          <li className="flex gap-2"><span className="text-muted">—</span>Nilai numerik tanpa simbol (Rp, %, dll)</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-6">
        <button onClick={onGo}
                className="flex-1 bg-gray-900 hover:bg-black text-white text-sm font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2">
          Mulai analisis <ArrowRight className="w-4 h-4" strokeWidth={2} />
        </button>
        <button onClick={onRestart}
                className="border border-border hover:bg-surface text-sm text-gray-700 dark:text-gray-300 font-medium py-2.5 px-4 rounded-lg">
          Ulangi panduan
        </button>
        <button onClick={onSkip}
                className="text-sm text-muted hover:text-gray-900 dark:text-gray-100 py-2.5 px-3">
          Semua tools
        </button>
      </div>
    </div>
  )
}

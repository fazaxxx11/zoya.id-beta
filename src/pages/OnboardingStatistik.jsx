// Onboarding wizard untuk Statistik — bantu user pilih tool yang tepat.
// 3 state: welcome, wizard (decision tree), done (rekomendasi).

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, ArrowRight, Check,
  Activity,
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
    hint: 'Cek dulu pakai Uji Normalitas. Kalau ragu, pilih "Tidak yakin".',
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
    <div className="min-h-screen bg-bg pb-bottomnav">
      <header className="sticky top-0 z-50 border-b border-border bg-bg">
        <div className="max-w-2xl mx-auto px-5 h-12 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-1 text-xs text-muted hover:text-fg transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />Kembali
          </button>
          <div className="h-3.5 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-muted" />
            <span className="text-xs font-medium text-fg tracking-tight">Panduan</span>
          </div>
          <button onClick={skipToTools}
                  className="ml-auto text-xs text-muted hover:text-fg transition-colors">
            Lewati
          </button>
        </div>
      </header>

      {/* Vertically centered content */}
      <div className="flex items-start md:items-center justify-center min-h-[calc(100vh-3rem)] px-4 py-6 md:py-0">
        <div className="w-full max-w-lg">
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
    </div>
  )
}

// ============================================================
// Welcome — compact, one-liner CTA
// ============================================================
function Welcome({ onStart, onSkip }) {
  return (
    <div className="border border-border rounded-xl bg-card p-5 md:p-6">
      <div className="text-[10px] text-muted tracking-[0.18em] uppercase font-semibold mb-1.5">Modul Statistik</div>
      <h1 className="font-heading font-bold text-lg md:text-xl tracking-tight leading-tight">
        Panduan memilih analisis
      </h1>
      <p className="text-xs text-muted mt-1.5 leading-relaxed max-w-md">
        2–3 pertanyaan singkat, lalu kami rekomendasikan tool yang sesuai dengan tujuan dan tipe datamu.
      </p>

      <div className="mt-5 flex flex-col sm:flex-row gap-2">
        <button onClick={onStart}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent/90 text-accent-fg rounded-lg text-sm font-semibold transition-all active:scale-[0.98]">
          Mulai panduan
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button onClick={onSkip}
                className="flex-1 inline-flex items-center justify-center px-5 py-2.5 border border-border hover:border-accent/50 hover:text-accent rounded-lg text-sm font-medium transition-all">
          Langsung ke tools
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Wizard Step — compact question + options
// ============================================================
function WizardStep({ node, stepIndex, onChoose, onBack }) {
  return (
    <div className="border border-border rounded-xl bg-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onBack}
                className="text-xs text-muted hover:text-fg transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Kembali
        </button>
        <div className="text-[10px] text-muted tracking-[0.16em] uppercase">Pertanyaan {stepIndex}</div>
      </div>

      <h2 className="font-heading font-semibold text-base tracking-tight">{node.question}</h2>
      {node.hint && (
        <p className="text-[11px] text-muted mt-1 leading-relaxed">{node.hint}</p>
      )}

      <div className="mt-4 divide-y divide-border border border-border rounded-lg overflow-hidden">
        {node.options.map((opt, i) => (
          <button key={i} onClick={() => onChoose(opt)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-surface/60 transition-colors flex items-center justify-between group">
            <span className="text-[13px] text-muted group-hover:text-fg leading-snug">{opt.label}</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted/40 group-hover:text-muted flex-shrink-0 ml-3 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Recommendation — compact card
// ============================================================
function Recommendation({ toolKey, onGo, onRestart, onSkip }) {
  const info = TOOL_INFO[toolKey]
  if (!info) return null

  return (
    <div className="border border-border rounded-xl bg-card p-5 md:p-6">
      <div className="flex items-center gap-1.5 text-[10px] text-accent tracking-[0.18em] uppercase font-semibold mb-2">
        <Check className="w-3 h-3" strokeWidth={2.5} />
        Rekomendasi
      </div>

      <h3 className="font-heading font-bold text-lg tracking-tight">{info.name}</h3>
      <p className="text-xs text-muted mt-1 leading-relaxed">{info.desc}</p>

      <div className="mt-4 border-t border-border pt-3">
        <div className="text-[10px] text-muted tracking-[0.14em] uppercase mb-1.5">Persiapan data</div>
        <p className="text-[11px] text-muted leading-relaxed">
          File Excel/CSV, header kolom di baris pertama, setiap baris satu responden, nilai numerik tanpa simbol.
        </p>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <button onClick={onGo}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent/90 text-accent-fg rounded-lg text-sm font-semibold transition-all active:scale-[0.98]">
          Mulai analisis <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button onClick={onRestart}
                className="px-4 py-2.5 border border-border hover:border-accent/50 hover:text-accent rounded-lg text-xs font-medium transition-all">
          Ulangi panduan
        </button>
        <button onClick={onSkip}
                className="px-3 py-2.5 text-xs text-muted hover:text-fg transition-colors">
          Semua tools
        </button>
      </div>
    </div>
  )
}

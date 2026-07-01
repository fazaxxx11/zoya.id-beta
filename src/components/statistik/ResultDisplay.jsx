import { useState, useEffect, useRef } from 'react'
import { ArrowRight, RotateCcw, HelpCircle, X } from 'lucide-react'
import {
  DescriptiveResult, NormalityResult, CorrelationResult, TTestResult,
  ValidityResult, ANOVAResult, SimpleRegressionResult, MultipleRegressionResult,
  ChiSquareResult, MannWhitneyResult, WilcoxonResult, KruskalResult,
  NGainResult, TwoWayANOVAResult
} from './ResultCards'
import ExportActions from './ExportActions'
import ContextualWriter from './ContextualWriter'
import StatEducation from './StatEducation'
import MethodologyPanel from '../MethodologyPanel'
import Modal from '../Modal'
import AssumptionsPanel from '../AssumptionsPanel'
import AIInterpretationPanel from '../AIInterpretationPanel'
import { saveAnalysis } from '../../lib/savedAnalyses'
import { toast } from '../../lib/toast'

// ============================================================
// Result Display — render based on result type
//
// Di-extract dari src/pages/Statistik.jsx supaya recharts + 14
// ResultCards + panel-panel (Assumptions/Contextual/StatEdu/
// Methodology/AIInterpretation/ExplainChat) hanya dimuat setelah
// analisis selesai. Statistik page me-lazy-load komponen ini.
// ============================================================
function ResultDisplay({ result, onReset, onBackToAnalysis }) {
  const contentRef = useRef(null)

  const [aiInterpretation, setAiInterpretation] = useState('')
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [savedId, setSavedId] = useState(null)

  // Measure tinggi PageHeader supaya sticky TOC & scroll target tidak overlap.
  // Tinggi header beda di mobile/desktop & saat ada subnav — measure saat mount + resize.
  const [headerH, setHeaderH] = useState(88)
  useEffect(() => {
    const measure = () => {
      const hdr = document.querySelector('header')
      if (hdr) setHeaderH(Math.round(hdr.getBoundingClientRect().height))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Build TOC dynamically — only sections that actually render for this result type
  const hasAssumptions =
    (result.type === 'ttest' && result.mode === 'independent') ||
    ['anova', 'regression_simple', 'regression_multiple'].includes(result.type)

  const toc = [
    { id: 'result-summary', label: 'Hasil' },
    ...(hasAssumptions ? [{ id: 'assumptions', label: 'Asumsi' }] : []),
    { id: 'ai-interpretation', label: 'Interpretasi AI' },
    { id: 'contextual-writer', label: 'Tulis Hasil' },
    { id: 'stat-education', label: 'Edukasi' },
    { id: 'methodology', label: 'Untuk Skripsi' },
  ]

  // TOC bar sticky di bawah header (top = headerH), jadi total offset buat scroll target =
  // header + TOC bar (~40px). +8px breathing room.
  const tocBarH = 40
  const scrollOffset = headerH + tocBarH + 8

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - scrollOffset
    window.scrollTo({ top: y, behavior: 'smooth' })
  }

  return (
    <div className="border border-border bg-card rounded-xl overflow-hidden animate-fade-in-up">
      <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-fg text-lg">Hasil: {result.toolName}</h3>
          <p className="text-sm text-muted">{result.sampleSize} sampel · {result.analyzedAt}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setSaveModalOpen(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border transition-colors ${
              savedId
                ? 'bg-teal/8 border-teal/20 text-teal'
                : 'bg-card border-border text-fg hover:bg-surface'
            }`}>
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a2 2 0 012-2h10a2 2 0 012 2v14l-7-3.5L3 18V4z" /></svg>
            {savedId ? 'Tersimpan' : 'Simpan'}
          </button>
          <ExportActions result={result} containerRef={contentRef} />
          <button onClick={onBackToAnalysis}
            className="px-4 py-2 rounded-lg text-sm font-heading font-semibold bg-accent text-accent-fg hover:bg-accent/90 transition-colors flex items-center gap-2">
            <ArrowRight className="w-4 h-4" /> Analisis Lain
          </button>
          <button onClick={onReset}
            className="px-4 py-2 rounded-lg text-sm text-muted hover:text-fg border border-border hover:bg-surface transition-colors flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Upload Ulang
          </button>
        </div>
      </div>

      <SaveAnalysisModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        result={result}
        aiInterpretation={aiInterpretation}
        onSaved={(id) => { setSavedId(id); setSaveModalOpen(false) }}
      />

      {/* Sticky section nav — diposisikan tepat di bawah PageHeader (top = headerH),
          tidak overlap header (z-30). bg solid (no glass) sesuai anti-AI-vibe. */}
      <div className="sticky z-20 bg-card border-b border-border" style={{ top: `${headerH}px` }}>
        <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto no-scrollbar">
          {toc.map(item => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-md text-muted hover:text-accent hover:bg-accent/5 transition-colors whitespace-nowrap"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5" ref={contentRef}>
        <section id="result-summary" style={{ scrollMarginTop: `${scrollOffset}px` }}>
          {result.type === 'descriptive' && <DescriptiveResult r={result} />}
          {result.type === 'normality' && <NormalityResult r={result} />}
          {result.type === 'correlation' && <CorrelationResult r={result} />}
          {result.type === 'ttest' && <TTestResult r={result} />}
          {result.type === 'validity_reliability' && <ValidityResult r={result} />}
          {result.type === 'anova' && <ANOVAResult r={result} />}
          {result.type === 'regression_simple' && <SimpleRegressionResult r={result} />}
          {result.type === 'regression_multiple' && <MultipleRegressionResult r={result} />}
          {result.type === 'chisquare' && <ChiSquareResult r={result} />}
          {result.type === 'mannwhitney' && <MannWhitneyResult r={result} />}
          {result.type === 'wilcoxon' && <WilcoxonResult r={result} />}
          {result.type === 'kruskal' && <KruskalResult r={result} />}
          {result.type === 'ngain' && <NGainResult r={result} />}
          {result.type === 'twowayanova' && <TwoWayANOVAResult r={result} />}
        </section>

        {/* Tier 1: Assumption checks panel — auto-render untuk t-test/ANOVA/regression */}
        {hasAssumptions && (
          <section id="assumptions" style={{ scrollMarginTop: `${scrollOffset}px` }}>
            {result.type === 'ttest' && result.mode === 'independent' && (
              <AssumptionsPanel result={result} type="ttest_independent" />
            )}
            {result.type === 'anova' && <AssumptionsPanel result={result} type="anova" />}
            {result.type === 'regression_simple' && <AssumptionsPanel result={result} type="regression_simple" />}
            {result.type === 'regression_multiple' && <AssumptionsPanel result={result} type="regression_multiple" />}
          </section>
        )}

        <section id="ai-interpretation" style={{ scrollMarginTop: `${scrollOffset}px` }}>
          <AIInterpretationPanel result={result} value={aiInterpretation} onChange={setAiInterpretation} />
        </section>

        <section id="contextual-writer" style={{ scrollMarginTop: `${scrollOffset}px` }}>
          <ContextualWriter result={result} />
        </section>

        <section id="stat-education" style={{ scrollMarginTop: `${scrollOffset}px` }}>
          <StatEducation />
        </section>

        <ExplainChatPanel result={result} aiInterpretation={aiInterpretation} />

        <section id="methodology" style={{ scrollMarginTop: `${scrollOffset}px` }}>
          <MethodologyPanel result={result} />
        </section>
      </div>
    </div>
  )
}

// ============================================================
// Save Analysis Modal
// ============================================================
function SaveAnalysisModal({ open, onClose, result, aiInterpretation, onSaved }) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset state every time modal opens
  useEffect(() => {
    if (open) {
      const stamp = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      setTitle(`${result.toolName} — ${stamp}`)
      setNotes('')
    }
  }, [open, result.toolName])

  if (!open) return null

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    const out = await saveAnalysis({
      title,
      tool: result.type,
      toolName: result.toolName,
      result,
      aiInterpretation,
      notes,
    })
    setSaving(false)
    if (out.ok) {
      toast.success('Analisis tersimpan ke akun Anda')
      onSaved?.(out.analysis.id)
    } else {
      toast.error('Gagal menyimpan: ' + out.error)
    }
  }

  return (
    <Modal open={true} onClose={onClose}
      panelClassName="bg-card rounded-xl border border-border max-w-md w-full p-6">
      <div>
        <div className="mb-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-1">Simpan Analisis</div>
          <h3 className="text-lg font-heading font-bold text-fg">Simpan ke Riwayat</h3>
          <p className="text-sm text-muted mt-1">Akses lagi kapan saja dari halaman Riwayat.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Judul</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
              placeholder="Misal: Pre-test Eksperimen Kelompok A" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Catatan (opsional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15 resize-none"
              placeholder="Misal: data dari kuesioner X, n=50 setelah cleaning" />
          </div>
          {aiInterpretation && (
            <div className="text-xs text-muted bg-surface border border-border rounded-lg px-3 py-2">
              Interpretasi AI yang sudah Anda generate akan ikut tersimpan.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-5 pt-5 border-t border-border">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-muted hover:text-fg rounded-lg disabled:opacity-50">
            Batal
          </button>
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="px-4 py-2 text-sm font-heading font-semibold text-accent-fg bg-accent hover:bg-accent/90 rounded-lg disabled:opacity-50 transition-colors">
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ============================================================
// Explain Panel — "Belum Paham?" tanya AI dalam panel editorial.
// Bukan chat bubble — tampilan Q&A thread bergaya jurnal/scholarly.
// Max 5 pertanyaan per result session (free tier).
// ============================================================
function ExplainChatPanel({ result, aiInterpretation }) {
  const MAX_TURNS = 5
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  const userTurnsUsed = messages.filter(m => m.role === 'user').length
  const remaining = Math.max(0, MAX_TURNS - userTurnsUsed)
  const limitReached = remaining === 0

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading, open])

  function handleOpen() {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Tanya apa saja tentang hasil **${result.toolName || 'analisis'}**-mu — misalnya "apa arti p-value ini?" atau "kesimpulan untuk skripsi seperti apa?". Tersedia ${MAX_TURNS} pertanyaan gratis per hasil.`
      }])
    }
    setOpen(true)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading || limitReached) return
    const userMsg = { role: 'user', content: text }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const ctx = buildResultContext(result, aiInterpretation)
      const r = await fetch('/api/explain-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultContext: ctx,
          messages: newMsgs.filter(m => m.role === 'user' || m.role === 'assistant'),
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (e) {
      setError(e.message)
      setMessages(prev => prev.slice(0, -1))
      setInput(text)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      <div className="mt-5 bg-surface border border-border rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-heading font-semibold text-fg">Belum paham hasilnya?</div>
            <div className="text-sm text-muted">
              Tanya AI — dijelaskan dalam bahasa yang lugas dan ringkas. Gratis {MAX_TURNS} pertanyaan per hasil.
            </div>
          </div>
        </div>
        <button onClick={handleOpen}
                className="bg-accent hover:bg-accent/90 text-accent-fg text-sm font-heading font-semibold px-5 py-2.5 rounded-lg flex-shrink-0 transition-colors active:scale-[0.98]">
          Tanya AI
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)}
             panelClassName="bg-card rounded-xl border border-border max-w-2xl w-full h-[80vh] flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-heading font-semibold text-fg truncate">Tanya AI tentang Hasil</div>
              <div className="text-xs text-muted">{result.toolName} · sisa {remaining}/{MAX_TURNS} pertanyaan</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Tutup" className="p-1.5 rounded hover:bg-surface text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-5 bg-surface/40">
          {messages.map((m, i) => <QaEntry key={i} role={m.role} content={m.content} />)}
          {loading && (
            <div className="border-l-2 border-accent/40 pl-3 py-1 text-sm italic text-muted">
              <span className="font-heading not-italic font-semibold text-accent text-xs uppercase tracking-wider mr-2">AI</span>
              menyusun penjelasan…
            </div>
          )}
          {error && !loading && (
            <div className="bg-terracotta/8 border-l-2 border-terracotta rounded-r-lg p-3 text-sm text-terracotta">
              Error: {error}. Coba kirim ulang ya.
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-border p-3">
          {limitReached ? (
            <div className="bg-accent/5 border-l-2 border-accent rounded-r-lg p-3 text-sm text-accent text-center">
              Kamu sudah pakai {MAX_TURNS}/{MAX_TURNS} pertanyaan untuk hasil ini.<br />
              <span className="text-xs">Buka analisis baru kalau mau tanya lagi.</span>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={loading ? 'Tunggu AI…' : 'Tanya apa aja tentang hasilmu…'}
                disabled={loading} rows={1}
                className="flex-1 resize-none border border-border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-surface disabled:text-muted"
                style={{ maxHeight: '120px' }}
              />
              <button onClick={handleSend} disabled={!input.trim() || loading}
                      className="bg-accent hover:bg-accent/90 disabled:bg-muted/30 disabled:cursor-not-allowed text-accent-fg text-sm font-heading font-semibold px-4 py-2.5 rounded-lg">
                Kirim
              </button>
            </div>
          )}
          <div className="text-[10px] text-muted text-center mt-2">Enter untuk kirim · Shift+Enter untuk baris baru</div>
        </div>
      </Modal>
    </>
  )
}

function QaEntry({ role, content }) {
  if (role === 'user') {
    return (
      <div className="border-l-2 border-border pl-3 py-1">
        <div className="text-[10px] font-heading font-semibold uppercase tracking-[0.14em] text-muted mb-1">Anda</div>
        <div className="text-sm italic text-muted leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    )
  }
  return (
    <div className="border-l-2 border-accent/40 pl-3 py-1">
      <div className="text-[10px] font-heading font-semibold uppercase tracking-[0.14em] text-accent mb-1">AI</div>
      <div className="text-sm leading-relaxed text-fg whitespace-pre-wrap">
        {content}
      </div>
    </div>
  )
}

// Bangun konteks hasil uji untuk dikirim ke AI sebagai system context.
//
// Pendekatan baru (generic JSON serializer): apapun tool yang user buka,
// SELURUH field hasil dirangkum jadi key=value sederhana, kecuali field
// raw/heavy (residuals, yPred, dataMatrix, dll) yang gak relevan untuk AI.
//
// Sebelumnya pakai branch per r.type — banyak tool (mediation, moderation,
// EFA, CFA, logistic, posthoc, dll) gak ke-cover sehingga AI cuma dapat
// "Tool: X, n: Y" tanpa angka sama sekali.
function buildResultContext(r, aiInterpretation) {
  const lines = []
  lines.push(`Tool: ${r.toolName || r.type || 'Analisis Statistik'}`)
  if (r.sampleSize) lines.push(`Jumlah sampel: ${r.sampleSize}`)

  // Field yang dilewati: terlalu besar / gak relevan untuk konteks AI
  const SKIP_KEYS = new Set([
    'type', 'toolName', 'sampleSize',
    'residuals', 'yPred', 'predicted', 'fitted',
    'rawData', 'dataMatrix', 'matrix', 'covariance', 'correlationMatrix',
    'rotatedLoadings', 'unrotatedLoadings', 'loadings',
    'eigenvectors', 'scores',
    'groups', 'groupData', 'rawGroups',
    'interpretation', // dipisah handling-nya
    'aiInterpretation',
    'chart', 'charts', 'plotData',
  ])

  const fmtNum = (v) => {
    if (v === null || v === undefined) return '—'
    if (typeof v !== 'number') return String(v)
    if (!isFinite(v)) return String(v)
    const abs = Math.abs(v)
    if (abs >= 1000 || abs < 0.0001 && v !== 0) return v.toExponential(2)
    return Number(v.toFixed(4)).toString()
  }

  // Flatten 1 level objek nested (mis. r.student, r.welch, r.levene, r.factorA, ...)
  const dumpValue = (key, val, indent = '') => {
    if (val === null || val === undefined) return
    if (SKIP_KEYS.has(key)) return

    if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') {
      lines.push(`${indent}${key}: ${typeof val === 'number' ? fmtNum(val) : val}`)
      return
    }

    if (Array.isArray(val)) {
      // Array of primitives → join
      if (val.every(v => typeof v !== 'object' || v === null)) {
        const preview = val.slice(0, 10).map(v => typeof v === 'number' ? fmtNum(v) : v).join(', ')
        lines.push(`${indent}${key}: [${preview}${val.length > 10 ? ', ...' : ''}]`)
        return
      }
      // Array of objects (mis. coefficients, vifs, stats per kolom) → ringkas
      lines.push(`${indent}${key}:`)
      val.slice(0, 12).forEach((item, idx) => {
        if (typeof item === 'object' && item !== null) {
          const inner = Object.entries(item)
            .filter(([k]) => !SKIP_KEYS.has(k))
            .map(([k, v]) => `${k}=${typeof v === 'number' ? fmtNum(v) : v}`)
            .join(', ')
          lines.push(`${indent}  [${idx + 1}] ${inner}`)
        }
      })
      if (val.length > 12) lines.push(`${indent}  ...dan ${val.length - 12} lagi`)
      return
    }

    if (typeof val === 'object') {
      // Nested object (mis. r.student, r.levene, r.assumptions, r.reliability)
      const innerEntries = Object.entries(val).filter(([k]) => !SKIP_KEYS.has(k))
      if (innerEntries.length === 0) return
      lines.push(`${indent}${key}:`)
      innerEntries.forEach(([k, v]) => dumpValue(k, v, indent + '  '))
    }
  }

  for (const [k, v] of Object.entries(r)) {
    dumpValue(k, v)
  }

  // Interpretasi default (limit dinaikkan: tool kompleks butuh konteks lebih)
  if (r.interpretation) {
    lines.push('')
    lines.push(`Interpretasi default sistem:`)
    lines.push(String(r.interpretation).slice(0, 2000))
  }
  // Interpretasi APA yang sudah di-generate AI (kalau panel sudah dibuka)
  if (aiInterpretation) {
    lines.push('')
    lines.push(`Interpretasi akademik (APA, sudah di-generate AI):`)
    lines.push(String(aiInterpretation).slice(0, 2500))
  }

  return lines.join('\n')
}

export default ResultDisplay

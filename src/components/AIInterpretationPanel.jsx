import { useState } from 'react'
import { toast } from '../lib/toast'
import { generateInterpretation } from '../lib/ai/interpretStats'
import useTypingEffect from './AIInterpretationPanel/useTypingEffect'
import useProgressStage from './AIInterpretationPanel/useProgressStage'

// Staged progress thresholds (ms): 3 langkah simulasi proses AI
const STAGE_THRESHOLDS = [0, 2500, 5000]
const STAGE_LABELS = [
  'Menganalisis hasil uji...',
  'Menyusun interpretasi akademik...',
  'Finalisasi paragraf...',
]

/**
 * AIInterpretationPanel - Reusable AI interpretation component
 * Extracted from Statistik.jsx for use across multiple analysis pages
 * 
 * Props:
 * - result: analysis result object
 * - value: current interpretation text (controlled)
 * - onChange: callback when text changes
 */
export default function AIInterpretationPanel({ result, value = '', onChange }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [provider, setProvider] = useState(null)
  const [isFallback, setIsFallback] = useState(false)
  const text = value
  const setText = (v) => onChange?.(v)

  const { stageIndex, stageStates } = useProgressStage({
    thresholds: STAGE_THRESHOLDS,
    active: loading,
  })
  const { visibleText, done: typingDone, skip } = useTypingEffect({
    text,
    playing: !loading && !!text,
  })
  const displayText = typingDone ? text : visibleText

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setText('')
    const out = await generateInterpretation(result)
    if (out.ok) {
      setText(out.text)
      setProvider(out.provider)
      setIsFallback(!!out.fallback)
    } else {
      setError(out.error)
    }
    setLoading(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Interpretasi disalin ke clipboard')
    } catch {
      toast.error('Gagal menyalin')
    }
  }

  return (
    <div className="mt-6 border-t border-border pt-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-0.5">Interpretasi AI</div>
          <div className="text-sm text-muted">Paragraf akademik siap-paste untuk skripsi (Bahasa Indonesia, format APA).</div>
        </div>
        {!text && !loading && (
          <button onClick={handleGenerate}
                  className="bg-accent hover:bg-accent/90 text-accent-fg text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap">
            Generate
          </button>
        )}
        {text && (
          <div className="flex items-center gap-2">
            <button onClick={handleCopy}
                    className="text-xs text-muted hover:text-fg border border-border hover:bg-card/50 px-3 py-2 rounded-lg">
              Salin
            </button>
            <button onClick={handleGenerate} disabled={loading}
                    className="text-xs text-muted hover:text-fg border border-border hover:bg-card/50 px-3 py-2 rounded-lg disabled:opacity-50">
              {loading ? 'Memproses…' : 'Regenerate'}
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-card/50 border border-border/80 rounded-lg p-4 space-y-2.5">
          {STAGE_LABELS.map((label, i) => {
            const state = stageStates[i] || 'pending'
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                {state === 'done' ? (
                  <span className="w-4 h-4 rounded-full bg-teal-600/15 flex items-center justify-center flex-shrink-0">
                    <span className="w-1.5 h-1.5 bg-teal-600 rounded-full" />
                  </span>
                ) : state === 'active' ? (
                  <span className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin flex-shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-border flex-shrink-0" />
                )}
                <span className={state === 'active' ? 'text-fg font-medium' : 'text-muted'}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          Gagal menghasilkan interpretasi: {error}
        </div>
      )}

      {text && !loading && (
        <div className="bg-card/50 border border-border/80 rounded-lg p-4">
          {isFallback && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-[11px] text-amber-800 leading-relaxed">
              <span className="font-medium">Mode offline:</span> AI provider sedang sibuk, jadi interpretasi disusun dari template lokal berdasarkan angka hasil analisis. Hasil tetap akurat tapi gaya bahasanya lebih baku — coba <em>Regenerate</em> beberapa saat lagi untuk versi AI.
            </div>
          )}
          <div className="prose prose-sm max-w-none text-fg whitespace-pre-wrap leading-relaxed text-[13.5px]">
            {displayText}
            {!typingDone && text && (
              <span className="inline-block w-1.5 h-4 bg-accent ml-0.5 align-middle animate-pulse" />
            )}
          </div>
          {!typingDone && text && (
            <button
              onClick={skip}
              className="text-[11px] text-muted hover:text-fg border border-border hover:bg-card/50 px-2 py-1 rounded mt-2"
            >
              Tampilkan sekaligus
            </button>
          )}
          {provider && (
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted mt-3 pt-3 border-t border-border/70">
              {isFallback ? `Template lokal (${provider})` : `Disusun oleh AI (${provider})`} · Periksa kembali sebelum digunakan
            </div>
          )}
        </div>
      )}
    </div>
  )
}

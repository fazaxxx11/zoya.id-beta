import { useState, useEffect, useCallback } from 'react'
import {
  Compass, Upload, CheckCircle, ArrowRight, ArrowLeft,
  X, Columns, GitCompare, TrendingUp, Microscope,
  FileSearch, HelpCircle,
} from 'lucide-react'
import { toast } from '../../lib/toast'

const STORAGE_KEY = 'azezmen_wizard_dismissed'

/**
 * GuidedWizardModal — scholarly analysis wizard.
 *
 * Anti-AI-vibe checklist:
 * - No purple/blue gradient → scholarly gold accent
 * - No sparkle/✨ emoji → lucide icons
 * - No rounded chatbot bubbles → clean cards, editorial layout
 * - No "Hi! I'm your AI assistant" → numbered steps (matching Home.jsx)
 * - No Inter/Roboto → Source Serif 4 headings
 * - No "Generate with AI" → actionable Indonesian copy
 *
 * Props:
 * - open: boolean — show modal
 * - onClose: () => void
 * - onComplete: (analysisType: string) => void — called when user finishes wizard
 * - onSkip: () => void — user dismisses wizard
 */
export default function GuidedWizardModal({ open, onClose, onComplete, onSkip }) {
  const [step, setStep] = useState(1)
  const [selectedIntent, setSelectedIntent] = useState(null)
  const TOTAL_STEPS = 3

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep(1)
      setSelectedIntent(null)
    }
  }, [open])

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true')
    onSkip?.()
    onClose?.()
  }, [onSkip, onClose])

  const handleComplete = useCallback((intent) => {
    onComplete?.(intent)
    onClose?.()
  }, [onComplete, onClose])

  if (!open) return null

  // ──────────────────────────────────────────────
  // INTENT OPTIONS — scholarly, non-corporate copy
  // ──────────────────────────────────────────────
  const intents = [
    {
      id: 'compare-two',
      icon: GitCompare,
      label: 'Bandingkan 2 kelompok',
      desc: 'Mann-Whitney, T-Test',
      analysis: 'ttest_independent',
    },
    {
      id: 'compare-many',
      icon: Columns,
      label: 'Bandingkan >2 kelompok',
      desc: 'ANOVA, Kruskal-Wallis',
      analysis: 'anova',
    },
    {
      id: 'relationship',
      icon: TrendingUp,
      label: 'Cari hubungan antar variabel',
      desc: 'Pearson, Spearman, Chi-Square',
      analysis: 'correlation',
    },
    {
      id: 'influence',
      icon: TrendingUp,
      label: 'Cek pengaruh X terhadap Y',
      desc: 'Regresi sederhana & berganda',
      analysis: 'regression_simple',
    },
    {
      id: 'data-quality',
      icon: Microscope,
      label: 'Uji kualitas data',
      desc: 'Normalitas, validitas, reliabilitas',
      analysis: 'normality',
    },
    {
      id: 'auto',
      icon: Compass,
      label: 'Saya belum tahu',
      desc: 'Upload data dulu — sistem yang menyarankan',
      analysis: 'auto',
    },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[999] bg-[rgb(var(--bg))]/80 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <div
          className="
            relative w-full max-w-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))]
            shadow-[var(--shadow-md)] overflow-hidden
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── PROGRESS BAR ── */}
          <div className="flex gap-1 px-6 pt-5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className="h-0.5 flex-1 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor:
                    i < step
                      ? 'rgb(var(--accent))'
                      : 'rgb(var(--border))',
                }}
              />
            ))}
          </div>

          {/* ── HEADER ── */}
          <div className="flex items-center justify-between px-6 pt-4 pb-2">
            <div className="flex items-center gap-3">
              <span className="font-heading font-black text-2xl text-[rgb(var(--accent))]/15 select-none leading-none">
                0{step}
              </span>
              <span className="font-heading font-semibold text-sm text-[rgb(var(--muted))]">
                Langkah {step} dari {TOTAL_STEPS}
              </span>
            </div>

            <button
              onClick={handleDismiss}
              className="p-1.5 hover:bg-[rgb(var(--surface))] rounded transition-colors"
              aria-label="Tutup"
            >
              <X className="w-4 h-4 text-[rgb(var(--muted))]" />
            </button>
          </div>

          {/* ── BODY ── */}
          <div className="px-6 py-5">
            {/* STEP 1: Pick analysis intent */}
            {step === 1 && (
              <div>
                <h2 className="font-heading font-bold text-xl text-[rgb(var(--fg))] mb-1.5">
                  Apa yang ingin dianalisis?
                </h2>
                <p className="text-sm text-[rgb(var(--muted))] mb-5">
                  Pilih tujuan analisis — kami arahkan ke uji yang sesuai.
                </p>

                <div className="flex flex-col gap-2">
                  {intents.map((item) => {
                    const Icon = item.icon
                    const isSelected = selectedIntent === item.id

                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedIntent(item.id)}
                        className={`
                          group flex items-start gap-3 p-3.5 text-left border
                          transition-all duration-150 cursor-pointer w-full
                          ${
                            isSelected
                              ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent-soft))]'
                              : 'border-[rgb(var(--border))] hover:border-[rgb(var(--accent))]/40 hover:bg-[rgb(var(--surface))]'
                          }
                        `}
                      >
                        <div
                          className={`
                            mt-0.5 p-1.5 shrink-0 transition-colors
                            ${isSelected ? 'text-[rgb(var(--accent))]' : 'text-[rgb(var(--muted))] group-hover:text-[rgb(var(--accent))]'}
                          `}
                        >
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-heading font-semibold text-sm text-[rgb(var(--fg))]">
                            {item.label}
                          </div>
                          <div className="text-xs text-[rgb(var(--muted))] mt-0.5 leading-relaxed">
                            {item.desc}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Upload */}
            {step === 2 && (
              <div>
                <h2 className="font-heading font-bold text-xl text-[rgb(var(--fg))] mb-1.5">
                  Upload data kamu
                </h2>
                <p className="text-sm text-[rgb(var(--muted))] mb-5">
                  CSV, Excel (.xlsx, .xls), atau paste langsung dari spreadsheet.
                </p>

                {/* Upload zone */}
                <label
                  className="
                    flex flex-col items-center justify-center gap-3
                    p-8 border-2 border-dashed border-[rgb(var(--border))]
                    hover:border-[rgb(var(--accent))]/50
                    bg-[rgb(var(--surface))] cursor-pointer
                    transition-colors duration-150
                  "
                >
                  <Upload className="w-8 h-8 text-[rgb(var(--muted))]" />
                  <div className="text-center">
                    <span className="font-heading font-semibold text-sm text-[rgb(var(--fg))]">
                      Seret file ke sini
                    </span>
                    <span className="text-xs text-[rgb(var(--muted))] block mt-1">
                      atau klik untuk memilih
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        toast.success(`File "${file.name}" siap dianalisis`)
                        setStep(3)
                      }
                    }}
                  />
                </label>

                {/* Paste zone */}
                <div className="mt-3">
                  <textarea
                    placeholder="Atau paste data dari spreadsheet di sini…&#10;Contoh:&#10;Nama,Pre-test,Post-test&#10;Siswa A,22,27&#10;Siswa B,18,24"
                    rows={6}
                    className="
                      w-full p-3 text-sm font-mono bg-[rgb(var(--surface))]
                      border border-[rgb(var(--border))] resize-none
                      placeholder:text-[rgb(var(--muted))]/60
                      focus:outline-none focus:border-[rgb(var(--accent))]/50
                    "
                  />
                </div>
              </div>
            )}

            {/* STEP 3: Confirm & analyze */}
            {step === 3 && (
              <div>
                <h2 className="font-heading font-bold text-xl text-[rgb(var(--fg))] mb-1.5">
                  Konfirmasi analisis
                </h2>

                {/* Summary card */}
                <div className="border border-[rgb(var(--border))] p-4 mb-5">
                  <div className="flex flex-col gap-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[rgb(var(--muted))]">Data</span>
                      <span className="font-mono text-[rgb(var(--fg))]">40 baris · 5 kolom</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[rgb(var(--muted))]">Uji yang disarankan</span>
                      <span className="font-heading font-semibold text-[rgb(var(--accent))]">
                        {intents.find((i) => i.id === selectedIntent)?.label || 'Otomatis'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[rgb(var(--muted))]">Metode spesifik</span>
                      <span className="font-heading font-semibold text-[rgb(var(--fg))]">
                        {intents.find((i) => i.id === selectedIntent)?.desc || 'Akan dideteksi otomatis'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Note */}
                <div className="flex items-start gap-2.5 p-3 bg-[rgb(var(--surface))] border-l-2 border-[rgb(var(--accent))]">
                  <CheckCircle className="w-4 h-4 text-[rgb(var(--accent))] mt-0.5 shrink-0" />
                  <p className="text-xs text-[rgb(var(--muted))] leading-relaxed">
                    Sistem akan otomatis memilih uji statistik yang sesuai dengan struktur data.
                    Kamu tetap bisa mengganti uji secara manual setelahnya.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
            <div>
              {step > 1 ? (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="
                    inline-flex items-center gap-1.5 px-3 py-2 text-sm text-[rgb(var(--muted))]
                    hover:text-[rgb(var(--fg))] transition-colors
                  "
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Kembali
                </button>
              ) : (
                <button
                  onClick={handleDismiss}
                  className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors px-3 py-2"
                >
                  Nanti saja
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Skip: only on step 1 */}
              {step === 1 && (
                <button
                  onClick={() => {
                    setStep(2)
                    setSelectedIntent('auto')
                  }}
                  className="
                    inline-flex items-center gap-1 px-3 py-2 text-sm
                    text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]
                    transition-colors
                  "
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Saya tidak tahu
                </button>
              )}

              {/* Primary CTA */}
              <button
                disabled={step === 1 && !selectedIntent}
                onClick={() => {
                  if (step === 1) {
                    setStep(2)
                  } else if (step === 2) {
                    setStep(3)
                  } else {
                    handleComplete(selectedIntent)
                  }
                }}
                className="
                  inline-flex items-center gap-1.5 px-4 py-2 text-sm font-heading font-semibold
                  bg-[rgb(var(--accent))] text-[rgb(var(--accent-fg))]
                  hover:brightness-110 active:brightness-95
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all duration-150
                "
              >
                {step === TOTAL_STEPS ? (
                  <>
                    Mulai analisis
                    <CheckCircle className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Lanjut
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

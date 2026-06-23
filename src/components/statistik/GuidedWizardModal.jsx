import { useState, useEffect, useCallback } from 'react'
import {
  Compass, CheckCircle, ArrowRight, ArrowLeft,
  X, Columns, GitCompare, TrendingUp, Microscope,
  HelpCircle,
} from 'lucide-react'

const STORAGE_KEY = 'azezmen_wizard_dismissed'

export default function GuidedWizardModal({ open, onClose, onComplete, onSkip }) {
  const [step, setStep] = useState(1)
  const [selectedIntent, setSelectedIntent] = useState(null)
  const TOTAL_STEPS = 2

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

  const intents = [
    {
      id: 'compare-two',
      icon: GitCompare,
      label: 'Bandingkan 2 kelompok',
      desc: 'Mann-Whitney, T-Test',
    },
    {
      id: 'compare-many',
      icon: Columns,
      label: 'Bandingkan >2 kelompok',
      desc: 'ANOVA, Kruskal-Wallis',
    },
    {
      id: 'relationship',
      icon: TrendingUp,
      label: 'Cari hubungan antar variabel',
      desc: 'Pearson, Spearman, Chi-Square',
    },
    {
      id: 'influence',
      icon: TrendingUp,
      label: 'Cek pengaruh X terhadap Y',
      desc: 'Regresi sederhana & berganda',
    },
    {
      id: 'data-quality',
      icon: Microscope,
      label: 'Uji kualitas data',
      desc: 'Normalitas, validitas, reliabilitas',
    },
    {
      id: 'auto',
      icon: HelpCircle,
      label: 'Saya belum tahu',
      desc: 'Pilih sendiri nanti di halaman analisis',
    },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[999] bg-[rgb(var(--bg))]/80 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal — compact, vertically centered */}
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <div
          className="
            relative w-full max-w-md bg-[rgb(var(--card))] border border-[rgb(var(--border))]
            shadow-[var(--shadow-md)] overflow-hidden
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── PROGRESS BAR ── */}
          <div className="flex gap-1 px-4 pt-4">
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
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-[10px] text-[rgb(var(--muted))] tracking-[0.16em] uppercase">
              Langkah {step} dari {TOTAL_STEPS}
            </span>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-[rgb(var(--surface))] rounded transition-colors"
              aria-label="Tutup"
            >
              <X className="w-3.5 h-3.5 text-[rgb(var(--muted))]" />
            </button>
          </div>

          {/* ── BODY ── */}
          <div className="px-4 py-3">
            {/* STEP 1: Pick analysis intent — 2-column grid */}
            {step === 1 && (
              <div>
                <h2 className="font-heading font-bold text-base text-[rgb(var(--fg))] mb-0.5">
                  Apa yang ingin dianalisis?
                </h2>
                <p className="text-[11px] text-[rgb(var(--muted))] mb-3 leading-relaxed">
                  Pilih tujuan — kami arahkan ke uji yang sesuai.
                </p>

                <div className="grid grid-cols-2 gap-1.5">
                  {intents.map((item) => {
                    const Icon = item.icon
                    const isSelected = selectedIntent === item.id

                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedIntent(item.id)}
                        className={`
                          group flex flex-col items-start gap-1.5 p-2.5 text-left border
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
                            p-1.5 shrink-0 rounded-md transition-colors
                            ${isSelected ? 'text-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10' : 'text-[rgb(var(--muted))] group-hover:text-[rgb(var(--accent))]'}
                          `}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-heading font-semibold text-[12px] text-[rgb(var(--fg))] leading-snug">
                            {item.label}
                          </div>
                          <div className="text-[10px] text-[rgb(var(--muted))] mt-0.5 leading-snug">
                            {item.desc}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Confirm & start */}
            {step === 2 && (
              <div>
                <h2 className="font-heading font-bold text-base text-[rgb(var(--fg))] mb-0.5">
                  Siap mulai?
                </h2>
                <p className="text-[11px] text-[rgb(var(--muted))] mb-3 leading-relaxed">
                  Upload data dilakukan di halaman analisis.
                </p>

                {/* Summary card */}
                <div className="border border-[rgb(var(--border))] p-3 mb-3">
                  <div className="flex flex-col gap-1.5 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-[rgb(var(--muted))]">Uji yang disarankan</span>
                      <span className="font-heading font-semibold text-[rgb(var(--accent))]">
                        {intents.find((i) => i.id === selectedIntent)?.label || 'Otomatis'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[rgb(var(--muted))]">Metode spesifik</span>
                      <span className="font-heading font-semibold text-[rgb(var(--fg))]">
                        {intents.find((i) => i.id === selectedIntent)?.desc || 'Semua alat tersedia'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Note */}
                <div className="flex items-start gap-2 p-2.5 bg-[rgb(var(--surface))] border-l-2 border-[rgb(var(--accent))]">
                  <CheckCircle className="w-3.5 h-3.5 text-[rgb(var(--accent))] mt-0.5 shrink-0" />
                  <p className="text-[11px] text-[rgb(var(--muted))] leading-relaxed">
                    Upload CSV/Excel di halaman analisis, lalu langsung jalankan uji.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
            <div>
              {step > 1 ? (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="
                    inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[rgb(var(--muted))]
                    hover:text-[rgb(var(--fg))] transition-colors
                  "
                >
                  <ArrowLeft className="w-3 h-3" />
                  Kembali
                </button>
              ) : (
                <button
                  onClick={handleDismiss}
                  className="text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors px-2.5 py-1.5"
                >
                  Nanti saja
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={step === 1 && !selectedIntent}
                onClick={() => {
                  if (step === 1) {
                    setStep(2)
                  } else {
                    handleComplete(selectedIntent)
                  }
                }}
                className="
                  inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-heading font-semibold
                  bg-[rgb(var(--accent))] text-[rgb(var(--accent-fg))]
                  hover:brightness-110 active:brightness-95
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all duration-150
                "
              >
                {step === TOTAL_STEPS ? (
                  <>
                    Mulai analisis
                    <CheckCircle className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    Lanjut
                    <ArrowRight className="w-3 h-3" />
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

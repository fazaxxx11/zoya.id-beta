// Onboarding tour — first-time user welcome modal yang muncul sekali.
// Mengandalkan localStorage 'onboarding_completed' supaya tidak muncul ulang.
//
// Tour: 4 step welcome screen dengan illustrasi + CTA, bukan overlay highlighting
// ke element specific (lebih simple, tidak fragile saat layout berubah).

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  Rocket, Activity, FileText, ClipboardCheck,
  ChevronRight, ChevronLeft, X,
} from 'lucide-react'

const STORAGE_KEY = 'onboarding_completed_v1'

const STEPS = [
  {
    icon: Rocket,
    iconBg: 'from-accent/20 via-accent to-accent-2/10',
    title: 'Selamat Datang! 👋',
    body: 'Aplikasi ini dirancang untuk membantu skripsi & penelitianmu lebih cepat dan rapi. Mari kita kenalan dengan fitur-fiturnya.',
  },
  {
    icon: Activity,
    iconBg: 'from-teal-500 to-teal-700',
    title: 'Analisis Statistik Lengkap',
    body: 't-test, ANOVA, regresi, korelasi, chi-square — semua dilengkapi pemeriksaan asumsi (Levene, Welch, Durbin-Watson, dll), effect size dengan 95% CI, dan post-hoc test sesuai standar APA 7.',
  },
  {
    icon: ClipboardCheck,
    iconBg: 'from-accent to-accent-2',
    title: 'AI Assessment & Rubrik',
    body: 'Punya tugas siswa untuk dinilai? Upload file, AI akan menilai sesuai rubrik. Bahkan rubriknya bisa dibuat otomatis pakai AI tinggal input topik soal.',
  },
  {
    icon: FileText,
    iconBg: 'from-terracotta to-terracotta/70',
    title: 'Bab IV Auto-Generate',
    body: 'Setelah analisis, klik "Bab IV" untuk generate draft Hasil & Pembahasan otomatis dengan format ilmiah, tabel rapi, dan interpretasi siap-paste ke skripsimu.',
  },
]

export default function OnboardingTour() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    // Show pada first visit di Home, dengan delay supaya halaman sempat render
    const completed = localStorage.getItem(STORAGE_KEY)
    if (completed) return

    // Disable auto-open on public/service routes
    // Tour only shows on explicit trigger or authenticated/dashboard routes
    const PUBLIC_ROUTES = ['/', '/statistik', '/kuesioner', '/assessment', '/kualitatif', '/referensi', '/wizard', '/sampling', '/mediasi', '/auth', '/payment', '/help', '/eviews', '/panel-data', '/time-series', '/butir-soal', '/skripsi', '/privasi', '/syarat', '/bantuan', '/feedback', '/saran', '/pengaturan', '/logistik', '/efa']
    if (PUBLIC_ROUTES.some(r =>
      window.location.pathname === r ||
      window.location.pathname.startsWith(r + '/') ||
      window.location.pathname.startsWith(r + '?')
    )) return

    const t = setTimeout(() => setOpen(true), 600)
    return () => clearTimeout(t)
  }, [])

  // Lock scroll saat open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Esc to skip
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') handleSkip() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    
  }, [open])

  const markComplete = () => {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    setOpen(false)
  }

  const handleSkip = () => {
    markComplete()
  }

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else handleFinish()
  }

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1)
  }

  const handleFinish = () => {
    markComplete()
    // Optional: route ke /statistik biar mereka langsung mulai
    // (kalau mau lebih netral, hapus baris ini)
    navigate('/statistik')
  }

  if (!open) return null

  const current = STEPS[step]
  const Icon = current.icon

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in"
      onClick={(e) => { if (e.target === e.currentTarget) handleSkip() }}
    >
      <div className="bg-card/60 backdrop-blur-md border border-border/30 rounded-lg shadow-2xl max-w-md w-full overflow-hidden animate-scale-in p-4">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1.5 rounded-full text-muted hover:bg-card/50 hover:text-fg transition-colors z-10"
          title="Skip tour"
          aria-label="Skip"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Icon */}
        <div className={`bg-gradient-to-br ${current.iconBg} px-8 pt-10 pb-6 text-center relative`}>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-lg bg-white/20 backdrop-blur-md mb-2">
            <Icon className="w-10 h-10 text-white" strokeWidth={1.8} />
          </div>
        </div>

        {/* Content */}
        <div className="px-7 py-6 text-center">
          <h2 className="text-xl font-bold text-fg mb-2">{current.title}</h2>
          <p className="text-sm text-muted leading-relaxed">{current.body}</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pb-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-accent' : 'w-1.5 bg-border hover:bg-muted'
              }`}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex items-center gap-2">
          {step > 0 ? (
            <button
              onClick={handleBack}
              className="px-3 py-2.5 rounded-lg text-muted hover:bg-card/50 transition-colors text-sm font-medium flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Kembali
            </button>
          ) : (
            <button
              onClick={handleSkip}
              className="px-3 py-2.5 rounded-lg text-muted hover:text-fg transition-colors text-sm font-medium"
            >
              Lewati
            </button>
          )}

          <button
            onClick={handleNext}
            className="ml-auto px-5 py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-accent-fg text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            {step === STEPS.length - 1 ? (
              <>
                <Rocket className="w-4 h-4" /> Mulai Sekarang
              </>
            ) : (
              <>
                Lanjut <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/**
 * Helper: reset tour supaya muncul lagi (untuk debugging atau "show tour again" button).
 */
export function resetOnboardingTour() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
  // Reload to trigger
  if (typeof window !== 'undefined') window.location.reload()
}

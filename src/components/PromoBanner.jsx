// Sticky banner pengumuman diskon launch.
// Muncul kalau diskon masih aktif. Dismissable (per session) lewat tombol X.
// Otomatis hilang saat DISCOUNT_EXPIRES_AT terlewat.

import { useState, useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'

const DISMISS_KEY = 'azezmen:promoBanner:dismissed'

export default function PromoBanner() {
  const [active, setActive] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setActive(true)
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
    } catch {}
  }, [])

  if (!active || dismissed) return null

  const onDismiss = () => {
    setDismissed(true)
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

  return (
    <div
      className="relative w-full text-white text-sm"
      style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #6366f1 100%)' }}
      role="status"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2 sm:gap-3 text-center">
        <Sparkles className="w-4 h-4 flex-shrink-0 hidden sm:block" />
        <span className="font-semibold">🚀 Currently in Beta</span>
        <span className="hidden sm:inline opacity-95">—</span>
        <span>
          Semua tools inti <strong className="font-bold">gratis selama beta</strong>
          <span className="hidden sm:inline">. Login diperlukan untuk akses.</span>
        </span>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Tutup banner promo"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/15 transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

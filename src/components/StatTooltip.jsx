// StatTooltip — info tooltip kecil untuk istilah statistik.
// Cara pakai:
//   <StatTooltip term="cohens_d" />            → render ikon (?) saja
//   <StatTooltip term="p_value">p-value</StatTooltip>  → label inline + (?)
//
// Behavior:
//   - Hover desktop → popover muncul
//   - Click mobile → toggle popover
//   - Outside-click → close
//   - Keyboard: Tab fokus + Enter toggle, Esc close
//
// Tujuan: edukasi terpadu di hasil. Mahasiswa skripsi langsung paham
// arti angka tanpa keluar dari halaman.

import { useState, useRef, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'
import { getGlossary } from '../lib/statGlossary'

export default function StatTooltip({ term, children, className = '' }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const data = getGlossary(term)

  // Outside-click & Esc close
  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false)
    }
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  if (!data) {
    // Term tidak ditemukan — render children apa adanya
    return children || null
  }

  return (
    <span ref={wrapperRef} className={`relative inline-flex items-center gap-1 ${className}`}>
      {children}
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => { e.preventDefault(); setOpen(o => !o) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={`Info ${data.title}`}
        className="inline-flex items-center justify-center text-muted hover:text-accent focus:text-accent focus:outline-none"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {open && (
        <span
          role="tooltip"
          className="absolute z-30 left-1/2 -translate-x-1/2 top-full mt-1.5 w-72 max-w-[calc(100vw-2rem)] bg-fg text-surface text-[12px] rounded-lg shadow-xl px-3.5 py-3 leading-relaxed pointer-events-none"
          // pointer-events-none agar hover di tooltip tidak men-trigger close-on-mouseleave dari icon
          // (kalau perlu interaksi di dalam tooltip, hapus class ini)
        >
          <div className="font-semibold text-emerald-300 mb-1">{data.title}</div>
          <div className="text-white/90">{data.description}</div>
          {data.formula && (
            <div className="mt-1.5 pt-1.5 border-t border-white/15 text-white/70 font-mono text-[11px]">
              {data.formula}
            </div>
          )}
          {data.threshold && (
            <div className="mt-1.5 pt-1.5 border-t border-white/15 text-white/70">
              <span className="text-amber-300 font-medium">Panduan: </span>
              {data.threshold}
            </div>
          )}
        </span>
      )}
    </span>
  )
}

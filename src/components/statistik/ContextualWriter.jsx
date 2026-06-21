import { useState, useMemo } from 'react'
import {
  FileText, MessageSquare, Lightbulb, Copy, Check,
  ChevronDown, ChevronRight,
} from 'lucide-react'
import { toast } from '../../lib/toast'
import { generateSectionInterpretation } from '../../lib/ai/interpretStats'

const SECTIONS = [
  {
    id: 'descriptive',
    label: 'Deskriptif',
    icon: FileText,
    desc: 'Apa yang ditemukan',
    hint: 'Paparan hasil statistik secara objektif. Tanpa opini, tanpa tafsir — murni data.',
  },
  {
    id: 'discussion',
    label: 'Diskusi',
    icon: MessageSquare,
    desc: 'Mengapa terjadi',
    hint: 'Tafsir hasil, kaitkan dengan teori dan penelitian terdahulu. Jelaskan makna di balik angka.',
  },
  {
    id: 'conclusion',
    label: 'Kesimpulan',
    icon: Lightbulb,
    desc: 'Implikasinya',
    hint: 'Ringkasan temuan kunci. Jawab pertanyaan penelitian. Nyatakan kontribusi dan keterbatasan.',
  },
]

export default function ContextualWriter({ result }) {
  const [activeSection, setActiveSection] = useState('descriptive')
  const [copied, setCopied] = useState({})
  const [expanded, setExpanded] = useState(true)

  const interpretations = useMemo(() => {
    if (!result) return {}
    const out = {}
    for (const s of SECTIONS) {
      out[s.id] = generateSectionInterpretation(result, s.id)
    }
    return out
  }, [result])

  const handleCopy = async (sectionId, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied((p) => ({ ...p, [sectionId]: true }))
      setTimeout(() => setCopied((p) => ({ ...p, [sectionId]: false })), 2000)
    } catch {
      toast.error('Gagal menyalin')
    }
  }

  if (!result) return null

  const active = SECTIONS.find((s) => s.id === activeSection)
  const ActiveIcon = active?.icon

  return (
    <div className="border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
      {/* ── Header ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[rgb(var(--surface))] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="font-heading font-bold text-sm text-[rgb(var(--fg))]">
            Tulis Narasi
          </span>
          <span className="text-[10px] text-[rgb(var(--muted))] tracking-wide uppercase">
            per section skripsi
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-[rgb(var(--muted))]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[rgb(var(--muted))]" />
        )}
      </button>

      {expanded && (
        <>
          {/* ── Section tabs ── */}
          <div className="flex border-b border-[rgb(var(--border))]">
            {SECTIONS.map((s) => {
              const Icon = s.icon
              const isActive = activeSection === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`
                    flex-1 flex items-center gap-1.5 px-3 py-2.5 text-xs
                    transition-colors duration-150 relative
                    ${
                      isActive
                        ? 'text-[rgb(var(--accent))] font-heading font-semibold'
                        : 'text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.desc}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[rgb(var(--accent))]" />
                  )}
                </button>
              )
            })}
          </div>

          {/* ── Section content ── */}
          <div className="px-4 py-4">
            {/* Section header */}
            <div className="flex items-center gap-2 mb-3">
              {ActiveIcon && (
                <ActiveIcon className="w-4 h-4 text-[rgb(var(--accent))]" />
              )}
              <span className="font-heading font-bold text-sm text-[rgb(var(--fg))]">
                {active?.label}
              </span>
              <span className="text-[10px] text-[rgb(var(--muted))]">
                — {active?.desc}
              </span>
            </div>

            {/* Content */}
            <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] p-4 mb-3">
              <p className="text-sm text-[rgb(var(--fg))] leading-relaxed whitespace-pre-line font-serif">
                {interpretations[activeSection] || '—'}
              </p>
            </div>

            {/* Hint */}
            <p className="text-[11px] text-[rgb(var(--muted))] leading-relaxed mb-3 italic">
              {active?.hint}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  handleCopy(activeSection, interpretations[activeSection])
                }
                className="
                  inline-flex items-center gap-1.5 px-3 py-1.5 text-xs
                  border border-[rgb(var(--border))]
                  hover:border-[rgb(var(--accent))]
                  text-[rgb(var(--fg))]
                  transition-colors duration-150
                "
              >
                {copied[activeSection] ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    Tersalin
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Salin
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  const all = SECTIONS.map((s) => {
                    const text = interpretations[s.id]
                    if (!text) return ''
                    return `### ${s.label}\n\n${text}`
                  })
                    .filter(Boolean)
                    .join('\n\n---\n\n')
                  handleCopy('all', all)
                }}
                className="
                  inline-flex items-center gap-1.5 px-3 py-1.5 text-xs
                  text-[rgb(var(--muted))]
                  hover:text-[rgb(var(--fg))]
                  transition-colors duration-150
                "
              >
                <Copy className="w-3 h-3" />
                Salin semua
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

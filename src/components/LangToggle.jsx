// Compact language toggle: ID / EN pill switch.
// Persists to localStorage via LangProvider.

import { Globe } from 'lucide-react'
import { useLang } from '../lib/i18n'

export default function LangToggle({ compact = false }) {
  const { lang, setLang } = useLang()
  const next = lang === 'id' ? 'en' : 'id'
  const label = lang.toUpperCase()

  if (compact) {
    return (
      <button
        onClick={() => setLang(next)}
        className="btn-ghost inline-flex items-center gap-1 text-xs font-semibold"
        title={`Switch to ${next.toUpperCase()}`}
        aria-label="Toggle language"
      >
        <Globe className="w-4 h-4" />
        {label}
      </button>
    )
  }

  return (
    <div
      className="inline-flex items-center rounded-full border overflow-hidden text-xs font-semibold"
      style={{ borderColor: 'rgb(var(--border))' }}
    >
      <button
        onClick={() => setLang('id')}
        className="px-2.5 py-1 transition-colors"
        style={
          lang === 'id'
            ? { background: 'linear-gradient(135deg, rgb(99 102 241), rgb(168 85 247))', color: 'white' }
            : { color: 'rgb(var(--muted))' }
        }
        aria-pressed={lang === 'id'}
      >
        ID
      </button>
      <button
        onClick={() => setLang('en')}
        className="px-2.5 py-1 transition-colors"
        style={
          lang === 'en'
            ? { background: 'linear-gradient(135deg, rgb(99 102 241), rgb(168 85 247))', color: 'white' }
            : { color: 'rgb(var(--muted))' }
        }
        aria-pressed={lang === 'en'}
      >
        EN
      </button>
    </div>
  )
}

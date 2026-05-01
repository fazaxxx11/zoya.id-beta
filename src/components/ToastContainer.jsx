import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { subscribeToast } from '../lib/toast'

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const STYLES = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info:    'bg-sky-50 border-sky-200 text-sky-800',
}

const ICON_COLORS = {
  success: 'text-green-500',
  error:   'text-red-500',
  warning: 'text-amber-500',
  info:    'text-sky-500',
}

/**
 * Mount sekali di App.jsx. Listen ke toast events & render.
 */
export default function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    return subscribeToast((t) => {
      setToasts(prev => [...prev, t])
      if (t.duration > 0) {
        setTimeout(() => {
          setToasts(prev => prev.filter(x => x.id !== t.id))
        }, t.duration)
      }
    })
  }, [])

  const dismiss = (id) => setToasts(prev => prev.filter(x => x.id !== id))

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => {
        const Icon = ICONS[t.type] || Info
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border-2 px-4 py-3 shadow-lg backdrop-blur-sm ${STYLES[t.type] || STYLES.info} animate-in slide-in-from-right`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${ICON_COLORS[t.type]}`} />
            <div className="flex-1 text-sm font-medium leading-snug">
              {t.message}
              {t.action && t.onAction && (
                <button
                  onClick={() => { t.onAction(); dismiss(t.id) }}
                  className="block mt-1 text-xs underline hover:no-underline opacity-80"
                >
                  {t.action}
                </button>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="flex-shrink-0 opacity-50 hover:opacity-100"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

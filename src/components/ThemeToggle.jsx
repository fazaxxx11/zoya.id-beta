// src/components/ThemeToggle.jsx
// Light/dark mode toggle — simple icon cycle: light → dark → system

import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../lib/ThemeContext'

export default function ThemeToggle({ className = '' }) {
  const { mode, setMode } = useTheme()

  const cycle = () => {
    if (mode === 'light') setMode('dark')
    else if (mode === 'dark') setMode('system')
    else setMode('light')
  }

  const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor
  const label = mode === 'light' ? 'Siang' : mode === 'dark' ? 'Malam' : 'Sistem'

  return (
    <button
      onClick={cycle}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium transition-colors hover:bg-card/80 ${className}`}
      style={{ color: 'rgb(var(--muted))' }}
      title={`Mode: ${label}`}
      aria-label={`Ganti tema (sekarang: ${label})`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

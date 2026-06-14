// src/lib/ThemeContext.jsx
// React context wrapper around theme.js — single source of truth.
// Provides { mode, resolved, setMode } to all consumers.

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getStoredMode, getSystemTheme, applyTheme } from './theme'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'azezmen_theme'

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(getStoredMode)
  // Force re-render when OS preference changes while in 'system' mode
  const [, setTick] = useState(0)

  const setMode = useCallback((newMode) => {
    setModeState(newMode)
    localStorage.setItem(STORAGE_KEY, newMode)
    applyTheme(newMode)
  }, [])

  // Apply on mount (safety net kalau initTheme belum jalan)
  useEffect(() => {
    applyTheme(mode)
  }, [])

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      // Re-apply & force re-render supaya resolved ikut berubah
      applyTheme('system')
      setTick(t => t + 1)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const resolved = mode === 'system' ? getSystemTheme() : mode

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

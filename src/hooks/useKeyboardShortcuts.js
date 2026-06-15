import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Global keyboard shortcuts:
 *   /        → focus first visible search input
 *   Ctrl+Enter / Cmd+Enter → submit closest form / click primary button
 *   g d      → go to dashboard
 *   g s      → go to statistik
 *   g h      → go to history
 *   Escape   → (handled by existing modals, no-op here)
 */
export default function useKeyboardShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    let pendingG = false
    let gTimeout = null
    function handler(e) {
      const tag = document.activeElement?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable

      // "/" → focus search input (only when not typing)
      if (e.key === '/' && !isInput) {
        e.preventDefault()
        const searchInput = document.querySelector('input[type="text"][placeholder*="Cari"], input[type="search"], input[placeholder*="cari"], input[placeholder*="search"]')
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
      }

      // Ctrl/Cmd + Enter → submit
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        const btn = document.querySelector('button[type="submit"]:not(:disabled), button.btn-primary:not(:disabled), button[class*="bg-sky-500"]:not(:disabled), button[class*="bg-accent"]:not(:disabled)')
        if (btn) btn.click()
      }

      // g + key navigation (vim-style)
      if (e.key === 'g' && !isInput && !pendingG) {
        pendingG = true
        gTimeout = setTimeout(() => { pendingG = false }, 500)
        return
      }
      if (pendingG) {
        pendingG = false
        clearTimeout(gTimeout)
        const routes = { d: '/dashboard', s: '/statistik', h: '/statistik/history' }
        if (routes[e.key]) {
          e.preventDefault()
          navigate(routes[e.key])
        }
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [navigate])
}

import { useEffect } from 'react'

/**
 * Global keyboard shortcuts:
 *   /        → focus first visible search input
 *   Ctrl+Enter / Cmd+Enter → submit closest form / click primary button
 *   Escape   → (handled by existing modals, no-op here)
 */
export default function useKeyboardShortcuts() {
  useEffect(() => {
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
        // Try to find a primary submit button
        const btn = document.querySelector('button[type="submit"]:not(:disabled), button.btn-primary:not(:disabled), button[class*="bg-sky-500"]:not(:disabled), button[class*="bg-accent"]:not(:disabled)')
        if (btn) btn.click()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])
}

// Global keyboard shortcuts for the app.
// Rules:
// - `/` focuses search input (if visible, and not already typing)
// - `Ctrl+Enter` / `Cmd+Enter` submits active form
// - `Escape` closes modals (already handled by Dialog component)

import { useEffect } from 'react'

/**
 * Register global keyboard shortcuts.
 * @param {Object} options
 * @param {Function} [options.onSlashSearch] — callback when `/` pressed (focus search)
 * @param {Function} [options.onCtrlEnter] — callback when Ctrl/Cmd+Enter pressed (submit form)
 */
export function useKeyboardShortcuts({ onSlashSearch, onCtrlEnter } = {}) {
  useEffect(() => {
    function handleKeyDown(e) {
      const activeEl = document.activeElement
      const isTyping = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA' || activeEl?.isContentEditable

      // Slash (`/`) → focus search (only if NOT already typing)
      if (e.key === '/' && !isTyping && onSlashSearch) {
        e.preventDefault()
        onSlashSearch()
        return
      }

      // Ctrl+Enter / Cmd+Enter → submit active form
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && onCtrlEnter) {
        e.preventDefault()
        onCtrlEnter()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSlashSearch, onCtrlEnter])
}

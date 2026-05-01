// Theme management. Default ke 'dark'.
// Persist via localStorage. Apply class .dark ke <html>.

const THEME_KEY = 'zoya_theme'
const DEFAULT_THEME = 'dark' // user prefer

const listeners = new Set()

export function getTheme() {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return DEFAULT_THEME
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  // hint untuk browser supaya scrollbar/native UI ikut tema
  root.style.colorScheme = theme
}

export function setTheme(theme) {
  if (theme !== 'dark' && theme !== 'light') return
  localStorage.setItem(THEME_KEY, theme)
  applyTheme(theme)
  listeners.forEach(fn => fn(theme))
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark')
}

export function subscribeTheme(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Init di awal app load. Idempotent. */
export function initTheme() {
  applyTheme(getTheme())
}

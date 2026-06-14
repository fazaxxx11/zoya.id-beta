// Theme management — single source of truth for DOM manipulation.
// Default ke 'dark'. Persist via localStorage. Apply class ke <html>.
// Supports 'light', 'dark', dan 'system' (auto-resolve ke OS preference).

const THEME_KEY = 'azezmen_theme'
const DEFAULT_THEME = 'dark' // user prefer

/**
 * Resolve OS color scheme preference.
 */
export function getSystemTheme() {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Read raw stored mode ('light' | 'dark' | 'system').
 * Returns DEFAULT_THEME kalau belum pernah set.
 */
export function getStoredMode() {
  if (typeof window === 'undefined') return DEFAULT_THEME
  return localStorage.getItem(THEME_KEY) || DEFAULT_THEME
}

/**
 * Read resolved theme (always 'light' or 'dark', never 'system').
 * Backward-compatible — dipakai di tempat yang butuh resolved value.
 */
export function getTheme() {
  const mode = getStoredMode()
  return mode === 'system' ? getSystemTheme() : mode
}

/**
 * Apply theme ke DOM — manipulasi class & colorScheme.
 * Bisa terima 'light' | 'dark' | 'system' (auto-resolve).
 */
export function applyTheme(mode) {
  if (typeof document === 'undefined') return
  const resolved = mode === 'system' ? getSystemTheme() : mode
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  // hint untuk browser supaya scrollbar/native UI ikut tema
  root.style.colorScheme = resolved
}

/**
 * Set theme — persist ke localStorage + apply ke DOM.
 * Tidak trigger React re-render; itu tugas ThemeContext.
 */
export function setTheme(mode) {
  if (typeof window === 'undefined') return
  if (mode !== 'dark' && mode !== 'light' && mode !== 'system') return
  localStorage.setItem(THEME_KEY, mode)
  applyTheme(mode)
}

/**
 * Cycle: light → dark → system → light
 */
export function toggleTheme() {
  const current = getStoredMode()
  const next = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light'
  setTheme(next)
}

/**
 * Init di awal app load (sebelum React render). Idempotent.
 * Supaya tidak ada flash of wrong theme.
 */
export function initTheme() {
  applyTheme(getStoredMode())
}

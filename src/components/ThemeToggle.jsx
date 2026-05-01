import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { getTheme, toggleTheme, subscribeTheme } from '../lib/theme'

/**
 * Animated toggle dark/light. Pakai di header.
 */
export default function ThemeToggle({ className = '' }) {
  const [theme, setLocalTheme] = useState(getTheme())

  useEffect(() => subscribeTheme(setLocalTheme), [])

  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:bg-accent/10 ${className}`}
      style={{ color: 'rgb(var(--fg))' }}
    >
      <Sun
        className={`absolute w-5 h-5 transition-all duration-500 ${
          isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
        }`}
      />
      <Moon
        className={`absolute w-5 h-5 transition-all duration-500 ${
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
        }`}
      />
    </button>
  )
}

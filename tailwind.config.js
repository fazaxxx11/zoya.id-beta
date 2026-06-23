/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // toggle via <html class="dark">
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary alias → scholarly gold (sinkron dengan --accent token).
        // Dipakai di banyak panel components (PanelConfig, HausmanCard, dll)
        // jadi tetap dipertahankan tapi value-nya diganti ke gold.
        primary: 'rgb(var(--accent) / <alpha-value>)',
        // Secondary alias → warm muted ink (was #1e293b slate)
        secondary: 'rgb(var(--fg) / <alpha-value>)',
        // Theme tokens — pakai CSS variables dari index.css
        bg: 'rgb(var(--bg) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        foreground: 'rgb(var(--fg) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-fg': 'rgb(var(--accent-fg) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
        // Scholarly secondary accents — editorial palette
        teal: 'rgb(var(--deep-teal) / <alpha-value>)',
        terracotta: 'rgb(var(--warm-rose) / <alpha-value>)',
        // accent-2 retained for backward compat (3 JSX files use it)
        'accent-2': 'rgb(var(--accent-2) / <alpha-value>)',
      },
      fontFamily: {
        // Sync dengan CSS variables --heading-font / --body-font / --mono-font
        heading: ['"EB Garamond"', 'Georgia', 'serif'],
        serif: ['"EB Garamond"', 'Georgia', 'serif'],
        body: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'Menlo', 'monospace'],
      },
      keyframes: {
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}

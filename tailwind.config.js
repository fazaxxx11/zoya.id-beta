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
        // Legacy (untuk backward compat)
        primary: '#f99f1e',
        secondary: '#1e293b',
        // Theme tokens — pakai CSS variables dari index.css
        bg: 'rgb(var(--bg) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-2': 'rgb(var(--accent-2) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        'aurora-1': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':       { transform: 'translate(40px, -20px) scale(1.1)' },
          '66%':       { transform: 'translate(-30px, 30px) scale(0.95)' },
        },
        'aurora-2': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':       { transform: 'translate(-30px, 20px) scale(0.95)' },
          '66%':       { transform: 'translate(40px, -30px) scale(1.05)' },
        },
        'aurora-3': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1.05)' },
          '50%':       { transform: 'translate(20px, -40px) scale(0.95)' },
        },
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
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgb(var(--accent) / 0.3)' },
          '50%':       { boxShadow: '0 0 40px rgb(var(--accent) / 0.5)' },
        },
      },
      animation: {
        'aurora-1': 'aurora-1 18s ease-in-out infinite',
        'aurora-2': 'aurora-2 22s ease-in-out infinite',
        'aurora-3': 'aurora-3 26s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

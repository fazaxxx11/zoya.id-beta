// BottomNav — mobile-only bottom navigation untuk akses cepat antar
// halaman utama. Hidden di desktop (lg+).
//
// Pakai: render <BottomNav /> sekali di App.jsx.

import { Link, useLocation } from 'react-router-dom'
import { Home, BarChart3, Clock, FileText, Sigma } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

const ITEMS = [
  { path: '/', label: 'Home', icon: Home, exact: true },
  { path: '/statistik', label: 'Analisis', icon: BarChart3, match: ['/statistik'] },
  { path: '/statistik/power', label: 'Power', icon: Sigma },
  { path: '/statistik/history', label: 'Riwayat', icon: Clock },
  { path: '/statistik/report', label: 'Bab IV', icon: FileText },
]

export default function BottomNav() {
  const location = useLocation()
  const path = location.pathname

  // Hide on certain routes (auth, payment, admin, assessment)
  const HIDDEN_PREFIXES = ['/auth', '/login', '/register', '/payment', '/admin', '/assessment', '/order', '/result']
  if (path === '/' || HIDDEN_PREFIXES.some(p => path.startsWith(p))) return null

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t"
      style={{
        backgroundColor: 'rgb(var(--card) / 0.94)',
        borderColor: 'rgb(var(--border) / 0.7)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -1px 0 rgb(var(--border) / 0.3), 0 -4px 16px -8px rgb(0 0 0 / 0.06)',
      }}
    >
      <div className="grid grid-cols-5 max-w-screen-md mx-auto">
        {ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = item.exact
            ? path === item.path
            : item.match
              ? item.match.some(m => path === m)
              : path === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center py-2 px-1 gap-0.5 text-[10px] font-medium transition-colors"
              style={{
                color: isActive ? 'rgb(var(--fg))' : 'rgb(var(--muted) / 0.85)',
              }}
            >
              <div
                className="p-1 rounded-lg transition-colors"
                style={
                  isActive
                    ? { backgroundColor: 'rgb(var(--fg))', color: 'rgb(var(--card))' }
                    : {}
                }
              >
                <Icon className="w-4 h-4" />
              </div>
              <span>{item.label}</span>
            </Link>
          )
        })}
        {/* Theme toggle */}
        <div className="flex flex-col items-center justify-center py-2 px-1">
          <ThemeToggle className="!border-0 !px-0 !py-0 !text-[10px]" />
        </div>
      </div>
    </nav>
  )
}

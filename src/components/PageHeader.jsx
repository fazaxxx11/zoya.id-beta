// PageHeader — konsisten untuk semua sub-page Statistik.
// Fitur:
// - Back button: navigate(-1) dengan fallback ke `parentPath`
// - Home button (icon-only di mobile)
// - Breadcrumb hierarchy
// - Sub-navigation links (opsional)
// - Title + subtitle
// - Sticky di top dengan solid background (no glass)

import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ChevronLeft, Home } from 'lucide-react'

/**
 * @param {object} props
 * @param {string} props.title - judul halaman
 * @param {string} [props.subtitle] - subtitle / kategori
 * @param {string} [props.parentPath] - fallback back path bila history kosong (default: '/')
 * @param {string} [props.parentLabel] - label parent (default: 'Beranda')
 * @param {Array<{path: string, label: string, icon?: any}>} [props.breadcrumbs] - hierarchy
 * @param {Array<{path: string, label: string, icon?: any, color?: string}>} [props.subNav] - sub-page tabs
 * @param {React.ReactNode} [props.right] - custom right content (replaces default actions area)
 * @param {React.ReactNode} [props.actions] - extra actions appended next to home button
 */
export default function PageHeader({
  title,
  subtitle,
  parentPath = '/',
  parentLabel = 'Beranda',
  breadcrumbs,
  subNav,
  right,
  actions,
}) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleBack = () => {
    // Smart back: if history exists go back, otherwise navigate to parentPath
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(parentPath)
    }
  }

  return (
    <header
      className="sticky top-0 z-30 bg-card border-b"
      style={{
        borderColor: 'rgb(var(--border))',
      }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-3">
        {/* Top row: back, breadcrumb, home/actions */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: back button + breadcrumb */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 px-2 py-1.5 -ml-2 rounded-lg transition-colors group"
              style={{ color: 'rgb(var(--muted))' }}
              title={`Kembali ke ${parentLabel}`}
              aria-label="Kembali"
              onMouseEnter={(e) => { e.currentTarget.style.color = 'rgb(var(--fg))'; e.currentTarget.style.backgroundColor = 'rgb(var(--border) / 0.4)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(var(--muted))'; e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <ChevronLeft className="w-5 h-5 group-active:-translate-x-0.5 transition-transform" />
              <span className="text-sm font-medium hidden sm:inline">{parentLabel}</span>
            </button>

            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="hidden md:flex items-center gap-1.5 text-xs ml-2 min-w-0" style={{ color: 'rgb(var(--muted) / 0.8)' }}>
                {breadcrumbs.map((bc, i) => (
                  <span key={i} className="flex items-center gap-1.5 truncate">
                    <span style={{ color: 'rgb(var(--border))' }}>/</span>
                    {bc.path && i < breadcrumbs.length - 1 ? (
                      <Link to={bc.path} className="truncate hover:underline" style={{ color: 'rgb(var(--muted))' }}>
                        {bc.label}
                      </Link>
                    ) : (
                      <span className="font-medium truncate" style={{ color: 'rgb(var(--fg) / 0.85)' }}>{bc.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
          </div>

          {/* Right: custom or default home button */}
          {right ? (
            <div className="flex items-center gap-2">{right}</div>
          ) : (
            <div className="flex items-center gap-1.5">
              {actions}
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'rgb(var(--muted))' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'rgb(var(--fg))'; e.currentTarget.style.backgroundColor = 'rgb(var(--border) / 0.4)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(var(--muted))'; e.currentTarget.style.backgroundColor = 'transparent' }}
                title="Beranda"
                aria-label="Beranda"
              >
                <Home className="w-[18px] h-[18px]" />
              </button>
            </div>
          )}
        </div>

        {/* Title row */}
        {(title || subtitle) && (
          <div className="mt-2">
            {subtitle && (
              <div
                className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] font-semibold mb-0.5"
                style={{ color: 'rgb(var(--muted) / 0.9)' }}
              >
                {subtitle}
              </div>
            )}
            {title && (
              <h1
                className="text-lg sm:text-xl font-bold leading-tight"
                style={{ color: 'rgb(var(--fg))' }}
              >
                {title}
              </h1>
            )}
          </div>
        )}

        {/* Sub-navigation tabs */}
        {subNav && subNav.length > 0 && (
          <nav className="-mx-3 sm:-mx-5 px-3 sm:px-5 mt-3 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 min-w-max">
              {subNav.map((item, i) => {
                const active = location.pathname === item.path
                const Icon = item.icon
                return (
                  <Link
                    key={i}
                    to={item.path}
                    className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors"
                    style={
                      active
                        ? { backgroundColor: 'rgb(var(--fg))', color: 'rgb(var(--card))' }
                        : { color: 'rgb(var(--muted))' }
                    }
                    onMouseEnter={(e) => {
                      if (active) return
                      e.currentTarget.style.color = 'rgb(var(--fg))'
                      e.currentTarget.style.backgroundColor = 'rgb(var(--border) / 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      if (active) return
                      e.currentTarget.style.color = 'rgb(var(--muted))'
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}

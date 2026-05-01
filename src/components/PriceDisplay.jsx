// Reusable price display dengan strikethrough harga asli + harga diskon + badge "diskon 70%".
// Pakai applyDiscount() dari lib/discount.js untuk konsistensi di seluruh app.

import { applyDiscount, DISCOUNT_PERCENT } from '../lib/discount'
import { BETA_FREE, formatIDR } from '../lib/pricing'

/**
 * @param {object} props
 * @param {number} props.price - Harga ASLI (sebelum diskon). Wajib pass harga base, bukan yang sudah diskon.
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.showBadge=true] - Tampilkan badge "diskon 70%"
 * @param {boolean} [props.inline=false] - Tampilkan dalam 1 baris (untuk card kecil)
 * @param {string} [props.className]
 */
export default function PriceDisplay({
  price,
  size = 'md',
  showBadge = true,
  inline = false,
  className = '',
}) {
  if (BETA_FREE) {
    const sizeMap = {
      sm: { main: 'text-xs font-semibold', badge: 'text-[10px] px-1.5 py-0.5' },
      md: { main: 'text-sm font-semibold', badge: 'text-xs px-2 py-0.5' },
      lg: { main: 'text-xl font-extrabold', badge: 'text-sm px-2.5 py-1' },
    }
    const s = sizeMap[size] || sizeMap.md
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <span className={`${s.main} text-sky-700 dark:text-sky-300`}>
          Beta Free
        </span>
        {showBadge && (
          <span className={`${s.badge} font-semibold rounded-full bg-sky-100 text-sky-700 whitespace-nowrap`}>
            Login Required
          </span>
        )}
      </span>
    )
  }

  const d = applyDiscount(price)

  const sizeMap = {
    sm: { main: 'text-base font-bold', strike: 'text-xs', badge: 'text-[10px] px-1.5 py-0.5' },
    md: { main: 'text-xl font-bold', strike: 'text-sm', badge: 'text-xs px-2 py-0.5' },
    lg: { main: 'text-3xl font-extrabold', strike: 'text-base', badge: 'text-sm px-2.5 py-1' },
  }
  const s = sizeMap[size] || sizeMap.md

  // Free / zero price
  if (d.original === 0) {
    return (
      <span className={`${s.main} text-emerald-600 dark:text-emerald-400 ${className}`}>
        Gratis
      </span>
    )
  }

  // No discount active — just show price
  if (!d.active) {
    return (
      <span className={`${s.main} ${className}`} style={{ color: 'rgb(var(--fg))' }}>
        {formatIDR(d.discounted)}
      </span>
    )
  }

  // Discount active — show strikethrough + new price + badge
  if (inline) {
    return (
      <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
        <span className={`${s.strike} line-through opacity-60`} style={{ color: 'rgb(var(--muted))' }}>
          {formatIDR(d.original)}
        </span>
        <span className={s.main} style={{ color: 'rgb(var(--fg))' }}>
          {formatIDR(d.discounted)}
        </span>
        {showBadge && (
          <span
            className={`${s.badge} font-semibold rounded-full text-white whitespace-nowrap`}
            style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}
          >
            -{DISCOUNT_PERCENT}%
          </span>
        )}
      </span>
    )
  }

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <div className="flex items-center gap-2">
        <span className={`${s.strike} line-through opacity-60`} style={{ color: 'rgb(var(--muted))' }}>
          {formatIDR(d.original)}
        </span>
        {showBadge && (
          <span
            className={`${s.badge} font-semibold rounded-full text-white whitespace-nowrap`}
            style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}
          >
            Diskon {DISCOUNT_PERCENT}%
          </span>
        )}
      </div>
      <span className={s.main} style={{ color: 'rgb(var(--fg))' }}>
        {formatIDR(d.discounted)}
      </span>
    </div>
  )
}

/**
 * Inline mini badge — buat di-embed dalam teks atau button.
 * Cuma muncul kalau diskon aktif.
 */
export function DiscountBadge({ className = '' }) {
  if (BETA_FREE) {
    return (
      <span className={`inline-block text-[10px] font-semibold rounded-full bg-sky-100 text-sky-700 px-1.5 py-0.5 ${className}`}>
        Beta Free
      </span>
    )
  }
  const d = applyDiscount(1) // probe apakah aktif
  if (!d.active) return null
  return (
    <span
      className={`inline-block text-[10px] font-semibold rounded-full text-white px-1.5 py-0.5 ${className}`}
      style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}
    >
      -{DISCOUNT_PERCENT}%
    </span>
  )
}

// ============================================================
// Discount / Launch Promo configuration
// ------------------------------------------------------------
// Cara cabut diskon kapan saja:
//   1. Set ENABLED = false di sini, atau
//   2. Override via env: VITE_DISCOUNT_ENABLED=false
//   3. Atau tunggu EXPIRES_AT terlewat (otomatis off)
// ============================================================

// Read env safely — Vite injects import.meta.env at build time.
// Wrap in try/catch in case running in non-Vite context.
function readEnv(key) {
  try {
    return import.meta.env?.[key]
  } catch {
    return undefined
  }
}

/** Tanggal launch (anchor untuk countdown banner). Update saat go-live. */
export const LAUNCH_DATE = new Date('2026-05-01T00:00:00+07:00')

/** Tanggal akhir promo — 3 bulan dari launch. Bisa di-override via env. */
export const DISCOUNT_EXPIRES_AT = (() => {
  const env = readEnv('VITE_DISCOUNT_EXPIRES_AT')
  if (env) {
    const d = new Date(env)
    if (!isNaN(d.getTime())) return d
  }
  const d = new Date(LAUNCH_DATE)
  d.setMonth(d.getMonth() + 3) // +3 bulan default
  return d
})()

/** Master toggle. Override via VITE_DISCOUNT_ENABLED=false untuk hard-disable. */
const ENV_ENABLED = readEnv('VITE_DISCOUNT_ENABLED')
const TOGGLE = ENV_ENABLED === undefined ? true : ENV_ENABLED !== 'false'

/** Persen diskon (0-100). Saat ini 70%. */
const ENV_PERCENT = readEnv('VITE_DISCOUNT_PERCENT')
export const DISCOUNT_PERCENT = Number(ENV_PERCENT != null ? ENV_PERCENT : 70)

/** Cek apakah diskon masih aktif sekarang. */
export function isDiscountActive(now = new Date()) {
  if (!TOGGLE) return false
  if (DISCOUNT_PERCENT <= 0) return false
  return now < DISCOUNT_EXPIRES_AT
}

/**
 * Hitung harga setelah diskon, dengan minimum floor Rp 1.000.
 * @param {number} originalPrice
 * @returns {{ original:number, discounted:number, savings:number, percent:number, active:boolean }}
 */
export const PRICE_FLOOR = 1000

export function applyDiscount(originalPrice) {
  const original = Math.max(0, Math.round(Number(originalPrice) || 0))
  const active = isDiscountActive()
  if (!active) {
    return { original, discounted: original, savings: 0, percent: 0, active: false }
  }
  const raw = Math.round(original * (1 - DISCOUNT_PERCENT / 100))
  // Floor: harga tidak boleh dibawah Rp 1.000 kecuali memang gratis (0)
  const discounted = original === 0 ? 0 : Math.max(PRICE_FLOOR, raw)
  return {
    original,
    discounted,
    savings: original - discounted,
    percent: DISCOUNT_PERCENT,
    active: true,
  }
}

/** Sisa hari sampai diskon habis (untuk countdown banner). */
export function daysUntilExpiry(now = new Date()) {
  const ms = DISCOUNT_EXPIRES_AT.getTime() - now.getTime()
  if (ms <= 0) return 0
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

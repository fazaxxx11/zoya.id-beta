// Brand config — baca dari env vars (Vite akan replace saat build).
// Default fallback aman kalau env belum di-set.

export const BRAND_NAME = import.meta.env.VITE_BRAND_NAME || 'Azezmen'
export const BRAND_TAGLINE = import.meta.env.VITE_BRAND_TAGLINE || 'Assessment akademik, olah data, dan laporan penelitian.'
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'zoya.id1432@gmail.com'

// Admin authentication now uses Supabase profiles.role instead of password

// ───────────────────────────────────────────────────────────────────
// Payment info untuk manual TF (ditampilkan di modal top-up).
// Isi via env .env.local supaya tidak ter-commit ke repo public.
// ───────────────────────────────────────────────────────────────────

export const PAYMENT_INFO = {
  bankName: import.meta.env.VITE_BANK_NAME || 'BCA',
  // No hardcoded fallback for account/e-wallet/WhatsApp numbers — if env vars
  // are missing, fields stay empty rather than leaking dummy values into the
  // client bundle. Set VITE_BANK_ACCOUNT etc. in Vercel/env.local.
  bankAccount: import.meta.env.VITE_BANK_ACCOUNT || '',
  bankHolder: import.meta.env.VITE_BANK_HOLDER || 'Azezmen Research',
  ewallet: {
    name: import.meta.env.VITE_EWALLET_NAME || 'DANA',
    number: import.meta.env.VITE_EWALLET_NUMBER || '',
  },
  whatsapp: import.meta.env.VITE_WHATSAPP || '', // format internasional, tanpa +
}

/** Generate WhatsApp deep-link untuk konfirmasi top-up */
export function buildWaConfirmUrl({ orderId, userEmail, amount }) {
  const msg = [
    `Halo admin ${BRAND_NAME},`,
    `Saya sudah transfer untuk top-up saldo.`,
    ``,
    `Order ID: ${orderId}`,
    `Email: ${userEmail}`,
    `Nominal: Rp ${Number(amount).toLocaleString('id-ID')}`,
    ``,
    `Mohon diverifikasi. Terima kasih.`,
  ].join('\n')
  return `https://wa.me/${PAYMENT_INFO.whatsapp}?text=${encodeURIComponent(msg)}`
}

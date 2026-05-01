// ============================================================
// Paywall helper — single source of truth untuk gating analisis berbayar.
// ------------------------------------------------------------
// Pattern pemakaian di komponen tool:
//
//   const handleRunClick = () => {
//     const gate = checkPaywall('mediation', sampleSize)
//     if (!gate.allowed) {
//       gate.action() // otomatis show toast / redirect ke login / topup
//       return
//     }
//     setShowConfirm(true)
//   }
//
//   const handleConfirmPay = () => {
//     const r = chargeForTool('mediation')
//     if (!r.success) { toast.error(r.error); return }
//     setShowConfirm(false)
//     runActualAnalysis()
//   }
// ============================================================

import { getCurrentUser, isAdmin } from './auth'
import { getWallet, deductWallet } from './wallet'
import { getStatisticsPriceWithDiscount } from './pricing'
import { toast } from './toast'

/**
 * Cek apakah user boleh menjalankan analisis paid.
 * @param {string} toolId — id dari STATISTICS_PRICES (mediation, logistic, efa, ...)
 * @param {number} [sampleSize=0] — untuk breakdown info (opsional)
 * @returns {{
 *   allowed: boolean,
 *   reason?: 'unauth' | 'insufficient' | 'free',
 *   pricing: ReturnType<typeof getStatisticsPriceWithDiscount>,
 *   action?: () => void,  // panggil ini kalau allowed=false untuk handle UX
 * }}
 */
export function checkPaywall(toolId, sampleSize = 0, navigate = null) {
  const pricing = getStatisticsPriceWithDiscount(toolId, sampleSize)

  // Admin bypass full
  if (isAdmin()) {
    return { allowed: true, pricing, reason: 'free' }
  }

  // Login required
  const user = getCurrentUser()
  if (!user) {
    return {
      allowed: false,
      reason: 'unauth',
      pricing,
      action: () => {
        toast.error(pricing.betaFree ? 'Silakan login dulu untuk menggunakan beta gratis' : 'Silakan login dulu untuk menggunakan layanan berbayar')
        if (navigate) navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search))
        else window.location.href = '/auth'
      },
    }
  }

  // Free tools / beta-free tools are accessible after login.
  if (!pricing.price) {
    return { allowed: true, pricing, reason: 'free' }
  }

  // Saldo cek
  const wallet = getWallet()
  const total = (wallet.balance || 0) + (wallet.bonus || 0)
  if (total < pricing.price) {
    return {
      allowed: false,
      reason: 'insufficient',
      pricing,
      action: () => {
        toast.error(`Saldo kurang. Butuh Rp ${pricing.price.toLocaleString('id-ID')}, Anda punya Rp ${total.toLocaleString('id-ID')}`)
        if (navigate) navigate('/auth?mode=topup')
        else window.location.href = '/auth?mode=topup'
      },
    }
  }

  return { allowed: true, pricing }
}

/**
 * Eksekusi pembayaran. Hanya panggil dari handleConfirmPay setelah user
 * approve modal konfirmasi.
 * @param {string} toolId
 * @param {number} [sampleSize=0]
 * @returns {{ success:boolean, error?:string, paid?:number, pricing?:object }}
 */
export function chargeForTool(toolId, sampleSize = 0) {
  // Admin: gratis
  if (isAdmin()) {
    return { success: true, paid: 0, pricing: getStatisticsPriceWithDiscount(toolId, sampleSize) }
  }

  const pricing = getStatisticsPriceWithDiscount(toolId, sampleSize)
  if (!pricing.price) return { success: true, paid: 0, pricing }

  const user = getCurrentUser()
  if (!user) return { success: false, error: 'Belum login' }

  const r = deductWallet(pricing.price)
  if (!r.success) return { success: false, error: r.error }

  return { success: true, paid: pricing.price, pricing }
}

/**
 * Convenience: cek + apakah ada current user. Untuk gating UI yang butuh login
 * tapi belum tentu butuh saldo (mis: save history).
 */
export function requireLogin(navigate = null, redirectAfter = null) {
  if (getCurrentUser()) return true
  toast.error('Silakan login dulu')
  const url = redirectAfter
    ? '/auth?redirect=' + encodeURIComponent(redirectAfter)
    : '/auth'
  if (navigate) navigate(url)
  else window.location.href = url
  return false
}

// Wallet helpers — semua operasi saldo via Supabase RPC (atomic & secure)
import { supabase } from './supabase'

/**
 * Ambil saldo wallet user yang sedang login.
 * @returns {Promise<{balance:number, bonus:number}>}
 */
export async function getWallet() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { balance: 0, bonus: 0 }

  const { data, error } = await supabase
    .from('wallets')
    .select('balance, bonus')
    .eq('user_id', user.id)
    .single()

  if (error || !data) return { balance: 0, bonus: 0 }
  return { balance: Number(data.balance), bonus: Number(data.bonus) }
}

/**
 * Ambil riwayat transaksi (terbaru di atas).
 * @param {number} limit
 */
export async function getTransactions(limit = 20) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data
}

/**
 * Potong saldo & buat order secara atomic (via RPC di DB).
 * Bonus dipakai dulu, baru saldo utama.
 * @param {{orderId:string, service:string, tier:string, amount:number, paymentMethod?:string}}
 * @returns {Promise<{success:boolean, order?:object, error?:string}>}
 */
export async function deductWalletAndCreateOrder({
  orderId, service, tier, amount, paymentMethod = 'wallet',
}) {
  const { data, error } = await supabase.rpc('deduct_wallet_and_create_order', {
    p_order_id: orderId,
    p_service: service,
    p_tier: tier,
    p_amount: amount,
    p_payment_method: paymentMethod,
  })

  if (error) {
    if (error.message.includes('INSUFFICIENT_BALANCE')) {
      return { success: false, error: 'Saldo tidak cukup' }
    }
    if (error.message.includes('NOT_AUTHENTICATED')) {
      return { success: false, error: 'Silakan login dulu' }
    }
    return { success: false, error: error.message }
  }

  return { success: true, order: data }
}

/**
 * Generate human-readable order ID di client. ID unique-nya juga di-check di DB (PK).
 */
export function generateOrderId() {
  const ts = Date.now().toString(36).toUpperCase().slice(-6)
  const rnd = Math.random().toString(36).toUpperCase().slice(2, 5)
  return `ORD-${ts}${rnd}`
}

/**
 * Hitung preview bonus top-up (sama dengan fungsi DB top_up_wallet).
 */
export function previewTopUpBonus(amount) {
  const n = Math.max(0, Number(amount) || 0)
  if (n < 25000) return 0
  return Math.min(n, 250000)
}

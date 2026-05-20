// Wallet helpers — Supabase-backed dengan sync cache pattern.
//
// Pattern:
//   1. main.jsx → initWallet() (subscribe ke auth changes)
//   2. Login/Logout → auto-refresh _wallet dari Supabase
//   3. getWallet() sync return cache
//   4. Mutations (topUp/deductWallet) — deferred ke post-beta (saat ini BETA_FREE,
//      jadi paywall short-circuit sebelum panggil deductWallet).
//
// Pending top-ups + manual TF flow tetap localStorage selama beta
// karena belum ada tabel pending_topups di schema.

import { supabase, isSupabaseConfigured } from './supabase'
import { getCurrentUser, subscribeAuth } from './auth'

const WALLET_KEY = 'skor_wallet' // legacy, untuk migration script kalau perlu

const safeParse = (raw, fallback) => {
  try { return JSON.parse(raw ?? '') ?? fallback } catch { return fallback }
}

const defaultWallet = () => ({ balance: 0, bonus: 0, transactions: [] })

// ─── Sync cache ─────────────────────────────────────────────────────
let _wallet = defaultWallet()
let _initialized = false
const _listeners = new Set()

function setCache(next) {
  _wallet = next
  for (const cb of _listeners) {
    try { cb(_wallet) } catch (e) { console.error('[wallet subscriber]', e) }
  }
}

export function subscribeWallet(cb) {
  _listeners.add(cb)
  try { cb(_wallet) } catch {}
  return () => _listeners.delete(cb)
}

/** Refresh saldo & 20 transaksi terbaru dari Supabase ke cache. */
export async function refreshWallet() {
  const user = getCurrentUser()
  if (!user || !isSupabaseConfigured) {
    setCache(defaultWallet())
    return _wallet
  }
  try {
    const [walletRes, txRes] = await Promise.all([
      supabase.from('wallets').select('balance, bonus').eq('user_id', user.id).maybeSingle(),
      supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    ])
    setCache({
      balance: Number(walletRes.data?.balance ?? 0),
      bonus: Number(walletRes.data?.bonus ?? 0),
      transactions: (txRes.data || []).map(t => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount || 0),
        bonus: Number(t.bonus || 0),
        note: t.note,
        date: t.created_at ? new Date(t.created_at).toLocaleString('id-ID') : '',
      })),
    })
  } catch (e) {
    console.error('[wallet] refresh failed:', e)
    setCache(defaultWallet())
  }
  return _wallet
}

/** Init: subscribe ke auth changes → auto refresh wallet on login/logout. */
export function initWallet() {
  if (_initialized) return
  _initialized = true
  subscribeAuth(() => { refreshWallet() })
}

export const getWallet = () => _wallet

/** @deprecated no-op di mode Supabase. */
export const setWallet = (_wallet) => {}

/**
 * Hitung bonus top-up: 100% bonus (2x saldo) untuk paket Rp 25.000 ke atas,
 * dengan MAX bonus Rp 250.000 (artinya saldo total max yang dijual = Rp 500.000).
 * Paket Rp 10.000 (Coba) tidak dapat bonus.
 */
export const TOPUP_BONUS_THRESHOLD = 25000
export const TOPUP_BONUS_MAX = 250000

export const calcTopUpBonus = (amount) => {
  const n = Math.max(0, Number(amount) || 0)
  if (n < TOPUP_BONUS_THRESHOLD) return 0
  return Math.min(n, TOPUP_BONUS_MAX) // 100% bonus, capped
}

/**
 * Top-up via RPC Supabase (atomic). Selama BETA_FREE feature ini disabled,
 * jadi hanya dipanggil oleh approvePendingTopup. Async — caller perlu await.
 */
export async function topUp(amount, code = 'DIRECT', userId = null) {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase belum dikonfigurasi' }
  }
  const targetUser = userId || getCurrentUser()?.id
  if (!targetUser) return { success: false, error: 'Belum login' }
  const { error } = await supabase.rpc('top_up_wallet', {
    p_user_id: targetUser,
    p_amount: amount,
    p_reference_id: code,
  })
  if (error) return { success: false, error: error.message }
  await refreshWallet()
  return { success: true }
}

/**
 * Potong saldo. Selama BETA_FREE, paywall short-circuit sebelum panggil ini
 * (semua tool gratis). Untuk post-beta, paywall.chargeForTool perlu di-async-kan
 * supaya bisa await RPC `deduct_wallet_and_create_order` di Supabase (atomic).
 *
 * Saat ini sync (untuk kompat dengan paywall sync). Mengembalikan stub error
 * supaya kalau dipanggil tidak hang.
 */
export const deductWallet = (amount) => {
  console.warn('[wallet] deductWallet (sync) dipanggil saat BETA_FREE seharusnya tidak terjadi. Gunakan deductWalletAndCreateOrder (async) untuk post-beta.')
  return { success: false, error: 'Wallet operations disabled during beta. (BETA_FREE=true)' }
}

/**
 * Init wallet untuk user baru. Trigger DB di Supabase otomatis bikin row di
 * `wallets` saat auth.users di-insert (lihat schema.sql init_user_wallet).
 * Function ini sekarang no-op — tetap di-export untuk kompat.
 */
export const initEmptyWallet = () => {
  // Trigger DB handle ini. No-op di client.
  return defaultWallet()
}

// ============================================================
// Pending top-ups (manual TF verification flow)
// ------------------------------------------------------------
// User klik "Sudah transfer" → entry disimpan dengan status 'pending'.
// Admin lihat di /admin, klik approve → saldo otomatis bertambah.
// ============================================================

const PENDING_TOPUPS_KEY = 'skor_pending_topups'

export const getPendingTopups = () =>
  safeParse(localStorage.getItem(PENDING_TOPUPS_KEY), [])

export const savePendingTopups = (list) => {
  localStorage.setItem(PENDING_TOPUPS_KEY, JSON.stringify(list))
}

/**
 * User mengajukan top-up manual. Tidak menambah saldo — cuma catat permintaan.
 * @param {{ userEmail:string, amount:number, method:string, note?:string }} req
 */
export const submitPendingTopup = ({ userEmail, amount, method = 'transfer', note = '' }) => {
  const list = getPendingTopups()
  const entry = {
    id: 'TOP-' + Date.now().toString(36).slice(-6).toUpperCase(),
    userEmail,
    amount: Number(amount) || 0,
    bonus: calcTopUpBonus(amount),
    method,
    note,
    status: 'pending', // 'pending' | 'approved' | 'rejected'
    createdAt: Date.now(),
    submittedAt: new Date().toLocaleString('id-ID'),
  }
  list.unshift(entry)
  savePendingTopups(list)
  return entry
}

/**
 * Admin approve pending top-up → saldo user bertambah via RPC Supabase.
 * Async sekarang — caller perlu await.
 *
 * NOTE: Pending topups masih di localStorage (admin-side), tapi saat approve,
 * saldo benar-benar di-credit ke wallet user di Supabase via RPC.
 * Untuk multi-device admin sync, perlu tabel `pending_topups` di schema.
 */
export async function approvePendingTopup(id) {
  const list = getPendingTopups()
  const idx = list.findIndex(e => e.id === id)
  if (idx < 0) return { success: false, error: 'Entry tidak ditemukan' }
  const entry = list[idx]
  if (entry.status !== 'pending') return { success: false, error: 'Sudah diproses' }

  // Cari user_id berdasarkan email — RPC top_up_wallet butuh user_id (uuid).
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', entry.userEmail)
    .maybeSingle()
  if (profErr || !profile) {
    return { success: false, error: `User dengan email ${entry.userEmail} tidak ditemukan di Supabase` }
  }

  const r = await topUp(entry.amount, 'TF-' + entry.id, profile.id)
  if (!r.success) return r

  list[idx] = { ...entry, status: 'approved', approvedAt: Date.now() }
  savePendingTopups(list)
  return { success: true, entry: list[idx] }
}

export const rejectPendingTopup = (id, reason = '') => {
  const list = getPendingTopups()
  const idx = list.findIndex(e => e.id === id)
  if (idx < 0) return { success: false, error: 'Entry tidak ditemukan' }
  list[idx] = { ...list[idx], status: 'rejected', rejectedAt: Date.now(), rejectReason: reason }
  savePendingTopups(list)
  return { success: true, entry: list[idx] }
}

export { WALLET_KEY, PENDING_TOPUPS_KEY }

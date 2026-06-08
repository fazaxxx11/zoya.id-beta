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
 * Async version of deductWallet that calls the backend API.
 */
export async function deductWalletAndCreateOrder(toolId, sampleSize = 0) {
  const user = getCurrentUser()
  if (!user) return { success: false, error: 'Belum login' }
  // Get access token from supabase
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return { success: false, error: 'No access token' }
  
  const res = await fetch('/api/billing-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
    body: JSON.stringify({ toolId, sampleSize }),
  })
  const data = await res.json()
  if (!res.ok) return { success: false, error: data.error, reason: data.reason }
  await refreshWallet()
  return { success: true, paid: data.price, orderId: data.orderId }
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

/**
 * Get pending top-ups from Supabase if configured, otherwise fallback to localStorage.
 */
export const getPendingTopups = async () => {
  if (!isSupabaseConfigured) {
    return safeParse(localStorage.getItem(PENDING_TOPUPS_KEY), [])
  }
  
  try {
    const { data, error } = await supabase
      .from('pending_topups')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[wallet] Failed to fetch pending top-ups from Supabase:', error)
      return safeParse(localStorage.getItem(PENDING_TOPUPS_KEY), [])
    }
    
    return data.map(entry => ({
      id: entry.id,
      userEmail: entry.user_email,
      amount: Number(entry.amount || 0),
      bonus: Number(entry.bonus || 0),
      method: entry.method,
      note: entry.note || '',
      status: entry.status,
      createdAt: new Date(entry.created_at).getTime(),
      submittedAt: new Date(entry.created_at).toLocaleString('id-ID'),
      approvedAt: entry.approved_at ? new Date(entry.approved_at).getTime() : undefined,
      rejectedAt: entry.rejected_at ? new Date(entry.rejected_at).getTime() : undefined,
      rejectReason: entry.reject_reason || '',
    }))
  } catch (e) {
    console.error('[wallet] Error fetching pending top-ups:', e)
    return safeParse(localStorage.getItem(PENDING_TOPUPS_KEY), [])
  }
}

/**
 * Save pending top-ups to Supabase if configured, otherwise fallback to localStorage.
 */
const savePendingTopups = (list) => {
  localStorage.setItem(PENDING_TOPUPS_KEY, JSON.stringify(list))
}

/**
 * User mengajukan top-up manual. Tidak menambah saldo — cuma catat permintaan.
 * @param {{ userEmail:string, amount:number, method:string, note?:string }} req
 */
export const submitPendingTopup = async ({ userEmail, amount, method = 'transfer', note = '' }) => {
  const bonus = calcTopUpBonus(amount)
  const entry = {
    id: 'TOP-' + Date.now().toString(36).slice(-6).toUpperCase(),
    userEmail,
    amount: Number(amount) || 0,
    bonus,
    method,
    note,
    status: 'pending',
    createdAt: Date.now(),
    submittedAt: new Date().toLocaleString('id-ID'),
  }
  
  if (!isSupabaseConfigured) {
    const list = safeParse(localStorage.getItem(PENDING_TOPUPS_KEY), [])
    list.unshift(entry)
    savePendingTopups(list)
    return entry
  }
  
  try {
    const { data, error } = await supabase
      .from('pending_topups')
      .insert({
        id: entry.id,
        user_email: userEmail,
        amount: entry.amount,
        bonus: entry.bonus,
        method: entry.method,
        note: entry.note,
        status: entry.status,
      })
      .select()
      .single()
    
    if (error) {
      console.error('[wallet] Failed to insert pending top-up to Supabase:', error)
      // Fallback to localStorage
      const list = safeParse(localStorage.getItem(PENDING_TOPUPS_KEY), [])
      list.unshift(entry)
      savePendingTopups(list)
    } else {
      // Return the entry with proper timestamps
      entry.createdAt = new Date(data.created_at).getTime()
      entry.submittedAt = new Date(data.created_at).toLocaleString('id-ID')
    }
  } catch (e) {
    console.error('[wallet] Error submitting pending top-up:', e)
    // Fallback to localStorage
    const list = safeParse(localStorage.getItem(PENDING_TOPUPS_KEY), [])
    list.unshift(entry)
    savePendingTopups(list)
  }
  
  return entry
}

/**
 * Admin approve pending top-up → saldo user bertambah via RPC Supabase.
 * Async sekarang — caller perlu await.
 */
export async function approvePendingTopup(id) {
  if (!isSupabaseConfigured) {
    // Fallback to localStorage logic
    const list = safeParse(localStorage.getItem(PENDING_TOPUPS_KEY), [])
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
  
  try {
    // Fetch the pending top-up from Supabase
    const { data: pending, error: fetchError } = await supabase
      .from('pending_topups')
      .select('*')
      .eq('id', id)
      .eq('status', 'pending')
      .single()
    
    if (fetchError || !pending) {
      return { success: false, error: 'Entry tidak ditemukan atau sudah diproses' }
    }
    
    // Find user by email
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', pending.user_email)
      .maybeSingle()
    
    if (profErr || !profile) {
      return { success: false, error: `User dengan email ${pending.user_email} tidak ditemukan di Supabase` }
    }
    
    // Top up the wallet
    const r = await topUp(pending.amount, 'TF-' + pending.id, profile.id)
    if (!r.success) return r
    
    // Update status in Supabase
    const { error: updateError } = await supabase
      .from('pending_topups')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
    
    if (updateError) {
      console.error('[wallet] Failed to update pending top-up status:', updateError)
      return { success: false, error: 'Gagal mengupdate status top-up' }
    }
    
    // Also update localStorage for backward compatibility
    const list = safeParse(localStorage.getItem(PENDING_TOPUPS_KEY), [])
    const idx = list.findIndex(e => e.id === id)
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        status: 'approved',
        approvedAt: Date.now(),
      }
      savePendingTopups(list)
    }
    
    return { 
      success: true, 
      entry: {
        id: pending.id,
        userEmail: pending.user_email,
        amount: Number(pending.amount || 0),
        bonus: Number(pending.bonus || 0),
        method: pending.method,
        note: pending.note || '',
        status: 'approved',
        createdAt: new Date(pending.created_at).getTime(),
        submittedAt: new Date(pending.created_at).toLocaleString('id-ID'),
        approvedAt: Date.now(),
      }
    }
  } catch (e) {
    console.error('[wallet] Error approving pending top-up:', e)
    return { success: false, error: 'Terjadi kesalahan saat menyetujui top-up' }
  }
}

export const rejectPendingTopup = async (id, reason = '') => {
  if (!isSupabaseConfigured) {
    const list = safeParse(localStorage.getItem(PENDING_TOPUPS_KEY), [])
    const idx = list.findIndex(e => e.id === id)
    if (idx < 0) return { success: false, error: 'Entry tidak ditemukan' }
    list[idx] = { ...list[idx], status: 'rejected', rejectedAt: Date.now(), rejectReason: reason }
    savePendingTopups(list)
    return { success: true, entry: list[idx] }
  }
  
  try {
    const { error } = await supabase
      .from('pending_topups')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        reject_reason: reason,
      })
      .eq('id', id)
    
    if (error) {
      console.error('[wallet] Failed to reject pending top-up:', error)
      return { success: false, error: 'Gagal menolak top-up' }
    }
    
    // Also update localStorage for backward compatibility
    const list = safeParse(localStorage.getItem(PENDING_TOPUPS_KEY), [])
    const idx = list.findIndex(e => e.id === id)
    if (idx >= 0) {
      list[idx] = { ...list[idx], status: 'rejected', rejectedAt: Date.now(), rejectReason: reason }
      savePendingTopups(list)
    }
    
    return { success: true }
  } catch (e) {
    console.error('[wallet] Error rejecting pending top-up:', e)
    return { success: false, error: 'Terjadi kesalahan saat menolak top-up' }
  }
}

export { WALLET_KEY, PENDING_TOPUPS_KEY }
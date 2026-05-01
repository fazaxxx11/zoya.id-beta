// Wallet helpers — localStorage version (development).
// Saat migrasi ke Supabase, tinggal swap implementasi tanpa ubah pemanggil.

const WALLET_KEY = 'skor_wallet'

const safeParse = (raw, fallback) => {
  try { return JSON.parse(raw ?? '') ?? fallback } catch { return fallback }
}

const defaultWallet = () => ({ balance: 0, bonus: 0, transactions: [] })

export const getWallet = () => safeParse(localStorage.getItem(WALLET_KEY), defaultWallet())

export const setWallet = (wallet) => {
  localStorage.setItem(WALLET_KEY, JSON.stringify(wallet))
}

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

export const topUp = (amount, code = 'DIRECT') => {
  const wallet = getWallet()
  const bonus = calcTopUpBonus(amount)

  wallet.balance += amount
  wallet.bonus += bonus
  wallet.transactions.unshift({
    id: 'TOP-' + Date.now().toString(36).slice(2, 8).toUpperCase(),
    type: 'topup',
    amount,
    bonus,
    total: amount + bonus,
    code,
    date: new Date().toLocaleString('id-ID'),
  })

  setWallet(wallet)
  return { ...wallet, bonus, total: amount + bonus }
}

/** Bonus dipakai dulu, baru saldo utama */
export const deductWallet = (amount) => {
  const wallet = getWallet()
  if (wallet.balance + wallet.bonus < amount) {
    return { success: false, error: 'Saldo tidak cukup' }
  }

  let remaining = amount
  if (wallet.bonus > 0) {
    const useBonus = Math.min(wallet.bonus, remaining)
    wallet.bonus -= useBonus
    remaining -= useBonus
  }
  if (remaining > 0) wallet.balance -= remaining

  wallet.transactions.unshift({
    id: 'PAY-' + Date.now().toString(36).slice(2, 8).toUpperCase(),
    type: 'payment',
    amount: -amount,
    date: new Date().toLocaleString('id-ID'),
  })

  setWallet(wallet)
  return { success: true, wallet }
}

/**
 * Init wallet untuk user baru (TANPA welcome bonus per kebijakan launch).
 * Saldo awal = 0. User wajib top-up sebelum bisa pakai paid features.
 */
export const initEmptyWallet = () => {
  const wallet = { balance: 0, bonus: 0, transactions: [] }
  setWallet(wallet)
  return wallet
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
 * Admin approve pending top-up → saldo user bertambah.
 * Karena wallet localStorage cuma untuk current device, approve di sini
 * cuma bisa nambah saldo kalau admin sedang login sebagai user-nya.
 * Untuk dev/local: anggap admin = current user (testing).
 * Untuk production: butuh Supabase shared DB.
 */
export const approvePendingTopup = (id) => {
  const list = getPendingTopups()
  const idx = list.findIndex(e => e.id === id)
  if (idx < 0) return { success: false, error: 'Entry tidak ditemukan' }
  const entry = list[idx]
  if (entry.status !== 'pending') return { success: false, error: 'Sudah diproses' }

  // Add to wallet (assumes admin is on same device as user, or migrating to Supabase later)
  topUp(entry.amount, 'TF-' + entry.id)

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

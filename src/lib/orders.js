// Orders — Supabase-backed dengan sync cache pattern.
// Sama dengan wallet.js: cache di-load dari Supabase saat login, sync API.
// saveOrder() sinkron ke cache instant + fire-and-forget Supabase upsert.
//
// Schema mapping:
//   Local shape (UI): { id, userId, service, serviceName, tier, tierName, amount,
//                        paymentMethod, status, paidAt(ms), completedAt(ms),
//                        createdAt(ms), data, ... }
//   Supabase columns: id, user_id, service, tier, amount, payment_method, status,
//                      paid_at(timestamptz), completed_at(timestamptz), created_at
//
// Supabase status constraint: pending|processing|completed|failed|refunded.
// UI status `pending_service` di-map ke `processing` saat write.

import { supabase, isSupabaseConfigured } from './supabase'
import { getCurrentUser, subscribeAuth } from './auth'

const ORDERS_KEY = 'skor_orders' // legacy
const PENDING_KEY = 'pending_order'

// ─── Sync cache ─────────────────────────────────────────────────────
let _orders = []
let _initialized = false
const _listeners = new Set()

function setCache(next) {
  _orders = next
  for (const cb of _listeners) {
    try { cb(_orders) } catch (e) { console.error('[orders subscriber]', e) }
  }
}

export function subscribeOrders(cb) {
  _listeners.add(cb)
  try { cb(_orders) } catch {}
  return () => _listeners.delete(cb)
}

/** Map row Supabase → shape lokal yang dipakai UI. */
function fromSupabase(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    service: row.service,
    tier: row.tier,
    amount: Number(row.amount || 0),
    paymentMethod: row.payment_method || '',
    status: row.status,
    paidAt: row.paid_at ? Date.parse(row.paid_at) : null,
    completedAt: row.completed_at ? Date.parse(row.completed_at) : null,
    createdAt: row.created_at ? Date.parse(row.created_at) : null,
    midtransOrderId: row.midtrans_order_id || null,
  }
}

/** Map shape lokal → kolom yang valid untuk insert/update Supabase. */
function toSupabase(order) {
  // Normalize status (UI 'pending_service' → 'processing')
  let status = order.status
  if (status === 'pending_service') status = 'processing'
  if (!['pending', 'processing', 'completed', 'failed', 'refunded'].includes(status)) {
    status = 'pending'
  }
  // Normalize service (schema only allows 'assessment'|'statistics')
  let service = order.service
  if (!['assessment', 'statistics'].includes(service)) service = 'statistics'
  return {
    id: order.id,
    user_id: order.userId, // harus uuid; caller pastikan ini user.id Supabase
    service,
    tier: order.tier || '-',
    amount: Math.max(0, Number(order.amount || 0)),
    status,
    payment_method: order.paymentMethod || null,
    paid_at: order.paidAt ? new Date(order.paidAt).toISOString() : null,
    completed_at: order.completedAt ? new Date(order.completedAt).toISOString() : null,
    midtrans_order_id: order.midtransOrderId || null,
  }
}

export async function refreshOrders() {
  const user = getCurrentUser()
  if (!user || !isSupabaseConfigured) {
    setCache([])
    return _orders
  }
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    setCache((data || []).map(fromSupabase))
  } catch (e) {
    console.error('[orders] refresh failed:', e)
    setCache([])
  }
  return _orders
}

export function initOrders() {
  if (_initialized) return
  _initialized = true
  subscribeAuth(() => { refreshOrders() })
}

// ─── Sync API ───────────────────────────────────────────────────────

export const getOrders = () => _orders

export const getOrderById = (orderId) => {
  if (!orderId) return null
  return _orders.find(o => o.id === orderId) || null
}

/**
 * Save / upsert order. Cache di-update sync. Supabase write fire-and-forget.
 * Caller bisa kasih userId Supabase (uuid) di order.userId, atau biarkan otomatis
 * pakai current user.
 */
export const saveOrder = (order) => {
  const user = getCurrentUser()
  // Pastikan userId di order adalah uuid Supabase, BUKAN email
  const enriched = { ...order, userId: user?.id || order.userId }

  // Update cache
  const list = _orders.slice()
  const idx = list.findIndex(o => o.id === enriched.id)
  if (idx >= 0) list[idx] = enriched
  else list.unshift(enriched)
  setCache(list)

  // Fire-and-forget Supabase upsert (kalau user logged in)
  if (user && isSupabaseConfigured) {
    const row = toSupabase(enriched)
    if (row.user_id) {
      supabase.from('orders').upsert(row).then(({ error }) => {
        if (error) console.error('[orders] upsert failed:', error.message)
      })
    }
  }
  return list
}

export const updateOrderStatus = (orderId, status, extras = {}) => {
  const order = getOrderById(orderId)
  if (!order) return { success: false, error: 'Order tidak ditemukan' }
  const updated = {
    ...order,
    status,
    ...extras,
    ...(status === 'completed' ? { completedAt: Date.now() } : {}),
  }
  saveOrder(updated)
  return { success: true, order: updated }
}

export const generateOrderId = () => {
  const ts = Date.now().toString(36).toUpperCase().slice(-6)
  const rnd = Math.random().toString(36).toUpperCase().slice(2, 5)
  return `ORD-${ts}${rnd}`
}

// Pending order pointer — transient (1 user, 1 device), tetap localStorage.
export const getPendingOrderId = () => localStorage.getItem(PENDING_KEY)
export const setPendingOrderId = (id) => localStorage.setItem(PENDING_KEY, id)
export const clearPendingOrderId = () => localStorage.removeItem(PENDING_KEY)

export { ORDERS_KEY, PENDING_KEY }

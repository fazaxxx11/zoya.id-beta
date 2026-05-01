// Orders — list & detail dari Supabase (replace localStorage)
import { supabase } from './supabase'

/**
 * Ambil list order milik user yang login.
 */
export async function getOrders({ limit = 50 } = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return error ? [] : data
}

/**
 * Cari order by ID. RLS pastikan user hanya lihat ordernya sendiri (admin lihat semua).
 */
export async function getOrderById(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, assessments(*)')
    .eq('id', orderId)
    .maybeSingle()

  return error ? null : data
}

/**
 * Update status order (umumnya dipanggil dari webhook/server, tapi exposed
 * untuk admin tools / fallback).
 */
export async function updateOrderStatus(orderId, status, extras = {}) {
  const patch = { status, ...extras }
  if (status === 'completed') patch.completed_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', orderId)
    .select()
    .single()

  return error ? { success: false, error: error.message } : { success: true, order: data }
}

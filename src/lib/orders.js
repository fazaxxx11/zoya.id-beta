// Orders — localStorage version. Interface match dengan orders.supabase.js
// supaya nanti tinggal swap import.

const ORDERS_KEY = 'skor_orders'
const PENDING_KEY = 'pending_order'

const safeParse = (raw, fallback) => {
  try { return JSON.parse(raw ?? '') ?? fallback } catch { return fallback }
}

export const getOrders = () => safeParse(localStorage.getItem(ORDERS_KEY), [])

export const saveOrder = (order) => {
  const orders = getOrders()
  const idx = orders.findIndex(o => o.id === order.id)
  if (idx >= 0) orders[idx] = order
  else orders.unshift(order)
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
  return orders
}

export const getOrderById = (orderId) => {
  if (!orderId) return null
  return getOrders().find(o => o.id === orderId) || null
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

export const getPendingOrderId = () => localStorage.getItem(PENDING_KEY)
export const setPendingOrderId = (id) => localStorage.setItem(PENDING_KEY, id)
export const clearPendingOrderId = () => localStorage.removeItem(PENDING_KEY)

export { ORDERS_KEY, PENDING_KEY }

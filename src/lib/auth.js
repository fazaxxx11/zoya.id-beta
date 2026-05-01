// Auth helpers — localStorage version (development).
// Interface ini sengaja dibuat sama dengan auth.supabase.js supaya
// nanti tinggal swap import path saat migrasi ke Supabase.

const USERS_KEY = 'skor_users'
const CURRENT_USER_KEY = 'skor_current_user'
const ADMIN_FLAG_KEY = 'admin_logged_in'

// Synthetic admin "user" — dipakai kalau admin login tapi CURRENT_USER_KEY hilang.
// Email-nya akan di-overwrite dari brand.js ADMIN_EMAIL waktu Admin login,
// di sini kita cuma fallback static supaya getCurrentUser() ngga pernah return null
// untuk admin yang sudah login.
const SYNTHETIC_ADMIN = {
  email: 'admin@local',
  name: 'Admin',
  isAdmin: true,
  role: 'admin',
  __synthetic: true,
}

const safeParse = (raw, fallback) => {
  try { return JSON.parse(raw ?? '') ?? fallback } catch { return fallback }
}

export const getUsers = () => safeParse(localStorage.getItem(USERS_KEY), [])

export const saveUser = (user) => {
  const users = getUsers()
  const idx = users.findIndex(u => u.email === user.email)
  if (idx >= 0) users[idx] = user
  else users.push(user)
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  return users
}

/**
 * Get current logged-in user.
 *
 * Penting: kalau `admin_logged_in=true` di localStorage tapi CURRENT_USER_KEY
 * kosong (misal: user accidentally hit logout di menu user), kita tetap
 * mengembalikan synthetic admin object. Tujuannya supaya admin status sticky
 * dan tidak ada page yang salah deteksi "belum login".
 */
export const getCurrentUser = () => {
  const stored = safeParse(localStorage.getItem(CURRENT_USER_KEY), null)
  if (stored) {
    // Kalau admin flag aktif tapi user object belum punya isAdmin, paksa upgrade.
    if (localStorage.getItem(ADMIN_FLAG_KEY) === 'true' && !stored.isAdmin) {
      return { ...stored, isAdmin: true, role: 'admin' }
    }
    return stored
  }
  // Fallback: admin flag aktif tapi user object hilang → restore synthetic.
  if (localStorage.getItem(ADMIN_FLAG_KEY) === 'true') {
    return SYNTHETIC_ADMIN
  }
  return null
}

export const setCurrentUser = (user) => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
}

export const loginUser = (email, password) => {
  const users = getUsers()
  const user = users.find(u => u.email === email && u.password === password)
  if (!user) return { success: false, error: 'Email atau password salah' }
  setCurrentUser(user)
  return { success: true, user }
}

export const registerUser = ({ email, password, name, phone }) => {
  if (!email || !password || !name) {
    return { success: false, error: 'Mohon isi semua data' }
  }
  if (getUsers().some(u => u.email === email)) {
    return { success: false, error: 'Email sudah terdaftar' }
  }
  const user = { email, password, name, phone, createdAt: Date.now() }
  saveUser(user)
  setCurrentUser(user)
  return { success: true, user }
}

/**
 * Logout — clear BOTH user session dan admin flag.
 * Sebelumnya cuma clear CURRENT_USER_KEY → admin flag bisa orphan.
 * Sekarang konsisten: logout = full reset auth state.
 */
export const logoutUser = () => {
  localStorage.removeItem(CURRENT_USER_KEY)
  localStorage.removeItem(ADMIN_FLAG_KEY)
}

/**
 * Cek admin synchronous. Single source of truth — gunakan ini di mana pun
 * daripada baca `localStorage.getItem('admin_logged_in')` langsung.
 */
export const isAdmin = () => {
  if (localStorage.getItem(ADMIN_FLAG_KEY) === 'true') return true
  const u = safeParse(localStorage.getItem(CURRENT_USER_KEY), null)
  return Boolean(u?.isAdmin || u?.role === 'admin')
}

/** Alias eksplisit — supaya code site lebih readable. */
export const isAdminLogged = isAdmin

// Storage keys exposed (dipakai page lain untuk init)
export { USERS_KEY, CURRENT_USER_KEY, ADMIN_FLAG_KEY }

// Auth helpers — Supabase Auth wrapper.
// Menjaga API sync (getCurrentUser, isAdmin) lewat session cache yang
// di-update oleh onAuthStateChange listener.
//
// Pattern:
//   1. main.jsx panggil initAuth() sebelum render React.
//   2. initAuth fetch session → normalize → cache → subscribe.
//   3. Pages panggil getCurrentUser() sync dari cache.
//   4. Pages bisa subscribe perubahan via subscribeAuth(cb) atau hook useCurrentUser().
//
// Untuk login/register/logout: async (return Promise). Auth.jsx sudah pakai await.

import { supabase, isSupabaseConfigured } from './supabase'

// ─── Module-level cache ─────────────────────────────────────────────
let _user = null              // normalized user object atau null
let _initialized = false      // sudah initAuth() pernah dipanggil?
let _initPromise = null       // promise dari initAuth() pertama
const _listeners = new Set()  // subscriber callbacks

// ─── Legacy storage keys (kompat utk Admin panel lama) ──────────────
const USERS_KEY = 'skor_users'
const CURRENT_USER_KEY = 'skor_current_user'
const ADMIN_FLAG_KEY = 'admin_logged_in'

/** Normalize Supabase user object ke shape yang dipakai UI lama. */
function normalizeUser(supaUser, role = 'user') {
  if (!supaUser) return null
  const meta = supaUser.user_metadata || {}
  const email = supaUser.email || ''
  const isAdminUser = role === 'admin'
  return {
    id: supaUser.id,
    email,
    name: meta.name || meta.full_name || (email ? email.split('@')[0] : ''),
    phone: meta.phone || '',
    isAdmin: isAdminUser,
    role: role,
    createdAt: supaUser.created_at ? Date.parse(supaUser.created_at) : Date.now(),
  }
}

function setUser(next) {
  _user = next
  for (const cb of _listeners) {
    try { cb(_user) } catch (e) { console.error('[auth subscriber]', e) }
  }
}

/**
 * Fetch user role from Supabase profiles table.
 * @param {string} userId
 * @returns {Promise<'admin'|'user'>}
 */
async function fetchUserRole(userId) {
  if (!userId || !isSupabaseConfigured) return 'user'
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw error
    return data?.role === 'admin' ? 'admin' : 'user'
  } catch (e) {
    console.error('[auth] fetchUserRole failed:', e)
    return 'user'
  }
}

/**
 * Init auth: fetch initial session + subscribe ke perubahan.
 * Idempotent — aman dipanggil berkali-kali, hanya jalan sekali.
 */
export async function initAuth() {
  if (_initialized) return _user
  if (_initPromise) return _initPromise

  _initPromise = (async () => {
    if (!isSupabaseConfigured) {
      console.warn('[auth] Supabase belum dikonfigurasi (VITE_SUPABASE_URL/ANON_KEY). Auth dinonaktifkan.')
      _initialized = true
      return null
    }
    try {
      const { data } = await supabase.auth.getSession()
      const supaUser = data?.session?.user
      if (supaUser) {
        const role = await fetchUserRole(supaUser.id)
        setUser(normalizeUser(supaUser, role))
      } else {
        setUser(null)
      }
    } catch (e) {
      console.error('[auth] getSession failed:', e)
      setUser(null)
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const supaUser = session?.user
      if (supaUser) {
        const role = await fetchUserRole(supaUser.id)
        setUser(normalizeUser(supaUser, role))
      } else {
        setUser(null)
      }
    })

    _initialized = true
    return _user
  })()

  return _initPromise
}

/** Subscribe ke perubahan auth state. Return unsubscribe fn. */
export function subscribeAuth(cb) {
  _listeners.add(cb)
  // panggil sekali dengan state sekarang biar konsumen langsung sync
  try { cb(_user) } catch {}
  return () => _listeners.delete(cb)
}

// ─── Sync API (dipakai luas di pages) ───────────────────────────────

export function getCurrentUser() {
  return _user
}

/** No-op untuk kompat — Supabase yang manage session via cookie/localStorage. */
export function setCurrentUser(_user) {
  // intentional no-op
}

export function isAdmin() {
  return Boolean(_user?.isAdmin)
}

export const isAdminLogged = isAdmin

// ─── RBAC helpers ──────────────────────────────────────────────────

/**
 * Get the role of a user object.
 * @param {object|null} user - normalized user from getCurrentUser() or null
 * @returns {'admin'|'user'}
 */
export function getUserRole(user) {
  if (!user) return 'user'
  return user.role === 'admin' ? 'admin' : 'user'
}

/**
 * Check if a user has admin role.
 * @param {object|null} user
 * @returns {boolean}
 */
export function isAdminUser(user) {
  return getUserRole(user) === 'admin'
}

/**
 * Permission map — defines what each role can do.
 * Extend this as new features are added.
 */
const ROLE_PERMISSIONS = {
  admin: [
    'view:all_users',
    'view:all_orders',
    'view:all_wallets',
    'approve:topup',
    'manage:rubric_templates',
    'view:analytics',
    'manage:users',
  ],
  user: [
    'view:own_profile',
    'edit:own_profile',
    'view:own_orders',
    'view:own_wallet',
    'create:order',
    'save:analysis',
    'view:own_analyses',
    'submit:feedback',
  ],
}

/**
 * Check if a user has a specific permission.
 * Admin role implicitly includes all user permissions.
 * @param {object|null} user
 * @param {string} permission - e.g. 'approve:topup', 'view:all_orders'
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  const role = getUserRole(user)
  const perms = ROLE_PERMISSIONS[role] || []
  if (perms.includes(permission)) return true
  // Admin gets all user permissions too
  if (role === 'admin') {
    return (ROLE_PERMISSIONS.user || []).includes(permission)
  }
  return false
}

// ─── Async API ──────────────────────────────────────────────────────

/**
 * Login dengan email + password.
 * @returns {Promise<{success: boolean, error?: string, user?: object}>}
 */
export async function loginUser(email, password) {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Auth backend belum dikonfigurasi.' }
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { success: false, error: translateAuthError(error.message) }
  const role = await fetchUserRole(data.user.id)
  const u = normalizeUser(data.user, role)
  setUser(u)
  return { success: true, user: u }
}

/**
 * Register user baru. Profile + wallet dibuat otomatis oleh trigger DB.
 * @returns {Promise<{success: boolean, error?: string, user?: object}>}
 */
export async function registerUser({ email, password, name, phone }) {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Auth backend belum dikonfigurasi.' }
  }
  if (!email || !password || !name) {
    return { success: false, error: 'Mohon isi semua data' }
  }
  if (password.length < 6) {
    return { success: false, error: 'Password minimal 6 karakter' }
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, phone: phone || null } },
  })
  if (error) return { success: false, error: translateAuthError(error.message) }
  // Note: kalau email confirmation aktif, data.session akan null sampai user verifikasi.
  if (data.session) {
    const role = await fetchUserRole(data.user.id)
    const u = normalizeUser(data.user, role)
    setUser(u)
    return { success: true, user: u }
  }
  // For new registration, default role is 'user'
  const u = normalizeUser(data.user, 'user')
  return {
    success: true,
    user: u,
    needsEmailConfirmation: true,
  }
}

/**
 * Kirim OTP / magic link ke email. Email akan menerima:
 *  - Magic link (klik untuk auto-login), DAN
 *  - 6-digit OTP code (untuk verifikasi manual via verifyOtp)
 * @param {string} email
 * @param {{shouldCreateUser?: boolean, redirectTo?: string}} [options]
 */
export async function sendOtp(email, options = {}) {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Auth backend belum dikonfigurasi.' }
  }
  if (!email) return { success: false, error: 'Email wajib diisi' }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: options.shouldCreateUser !== false, // default true
      emailRedirectTo: options.redirectTo || `${window.location.origin}/auth`,
    },
  })
  if (error) return { success: false, error: translateAuthError(error.message) }
  return { success: true }
}

/**
 * Verifikasi OTP code (6-digit) yang dikirim via sendOtp.
 * @param {string} email
 * @param {string} token
 */
export async function verifyOtp(email, token) {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Auth backend belum dikonfigurasi.' }
  }
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })
  if (error) return { success: false, error: translateAuthError(error.message) }
  const role = await fetchUserRole(data.user.id)
  const u = normalizeUser(data.user, role)
  setUser(u)
  return { success: true, user: u }
}

/**
 * Login via Google OAuth. User akan di-redirect ke Google → balik ke /auth.
 * Session otomatis di-detect oleh Supabase client (detectSessionInUrl: true).
 */
export async function loginWithGoogle(redirectTo) {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Auth backend belum dikonfigurasi.' }
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || `${window.location.origin}/auth`,
    },
  })
  if (error) return { success: false, error: translateAuthError(error.message) }
  // Pada saat ini browser sudah redirect ke Google, jadi return ini jarang dipakai.
  return { success: true }
}

/** Logout — clear Supabase session. Optimistic: cache di-clear duluan. */
export async function logoutUser() {
  // Optimistic: clear cache duluan supaya UI langsung respon
  setUser(null)
  try {
    localStorage.removeItem(CURRENT_USER_KEY)
    localStorage.removeItem(ADMIN_FLAG_KEY)
  } catch {}
  if (isSupabaseConfigured) {
    try { await supabase.auth.signOut() } catch (e) { console.error('[auth] signOut:', e) }
  }
}

// ─── Legacy stubs (Admin panel & kode lama) ─────────────────────────

/** @deprecated localStorage user list. Return [] di mode Supabase. */
export function getUsers() {
  return []
}

/** @deprecated no-op di mode Supabase. */
export function saveUser(_user) {
  // intentional no-op
}

export { USERS_KEY, CURRENT_USER_KEY, ADMIN_FLAG_KEY }

// ─── Helpers ────────────────────────────────────────────────────────

function translateAuthError(msg) {
  if (!msg) return 'Terjadi kesalahan'
  const lower = msg.toLowerCase()
  if (lower.includes('invalid login credentials')) return 'Email atau password salah'
  if (lower.includes('user already registered')) return 'Email sudah terdaftar'
  if (lower.includes('email rate limit')) return 'Terlalu banyak permintaan, coba lagi nanti'
  if (lower.includes('email not confirmed')) return 'Email belum diverifikasi. Cek inbox kamu.'
  return msg
}
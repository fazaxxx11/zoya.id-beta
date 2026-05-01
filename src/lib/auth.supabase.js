// Auth helpers — wrapper di atas Supabase Auth
import { supabase } from './supabase'

/**
 * Register user baru. Profile + wallet dibuat otomatis oleh trigger di DB.
 * @param {{email:string, password:string, name:string, phone?:string}} payload
 */
export async function registerUser({ email, password, name, phone }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone: phone || null },
    },
  })
  if (error) return { success: false, error: error.message }
  return { success: true, user: data.user, session: data.session }
}

/**
 * Login dengan email + password.
 */
export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { success: false, error: error.message }
  return { success: true, user: data.user, session: data.session }
}

/**
 * Logout current session.
 */
export async function logoutUser() {
  await supabase.auth.signOut()
}

/**
 * Ambil user saat ini (dari session). Return null kalau belum login.
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null
  return data.user
}

/**
 * Ambil profile (extra data: name, phone, role).
 */
export async function getCurrentProfile() {
  const user = await getCurrentUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (error) return null
  return data
}

/**
 * Cek apakah user adalah admin.
 */
export async function isAdmin() {
  const profile = await getCurrentProfile()
  return profile?.role === 'admin'
}

/**
 * Subscribe ke perubahan session (login/logout). Return unsubscribe fn.
 */
export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
  return () => data.subscription.unsubscribe()
}

/**
 * Reset password — kirim magic link ke email.
 */
export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/auth?mode=reset',
  })
  return error ? { success: false, error: error.message } : { success: true }
}

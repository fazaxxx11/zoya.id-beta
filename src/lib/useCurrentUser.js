// Reactive hook untuk current user. Subscribe ke auth state changes
// supaya komponen otomatis re-render saat login/logout.
//
// Also fetches the user's role from the Supabase `profiles` table
// and merges it into the cached user object so RBAC checks work.
import { useEffect, useState } from 'react'
import { getCurrentUser, subscribeAuth } from './auth'
import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Fetch user role from Supabase `profiles` table and merge into user object.
 * Returns the updated user or null.
 */
async function fetchAndMergeRole(user) {
  if (!user || !isSupabaseConfigured) return user
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (error || !data) return user
    const isAdm = data.role === 'admin'
    return {
      ...user,
      role: data.role,
      isAdmin: isAdm,
    }
  } catch {
    return user
  }
}

export function useCurrentUser() {
  const [user, setUser] = useState(() => getCurrentUser())

  useEffect(() => {
    const unsub = subscribeAuth(async (authUser) => {
      // First, set the auth-level user immediately (fast UI response)
      setUser(authUser)
      // Then, if logged in, fetch role from DB and merge (non-blocking)
      if (authUser) {
        const withRole = await fetchAndMergeRole(authUser)
        setUser(withRole)
      }
    })
    return unsub
  }, [])

  return user
}

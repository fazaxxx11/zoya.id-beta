// Global auth context — single source of truth untuk session di seluruh app
import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from './supabase'

const AuthCtx = createContext({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (currentUser) => {
    if (!currentUser) return setProfile(null)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single()
    setProfile(data || null)
  }

  useEffect(() => {
    let mounted = true

    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      const u = data?.session?.user || null
      setUser(u)
      loadProfile(u).finally(() => setLoading(false))
    })

    // Listener
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null
      setUser(u)
      loadProfile(u)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const refreshProfile = () => loadProfile(user)

  return (
    <AuthCtx.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  return useContext(AuthCtx)
}

/**
 * Wrap route yang butuh login. Optional: requireAdmin.
 */
export function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Memuat...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />
  }

  if (requireAdmin && profile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}

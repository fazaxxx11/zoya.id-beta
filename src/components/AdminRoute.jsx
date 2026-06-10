import { Navigate } from 'react-router-dom'
import { useCurrentUser } from '../lib/useCurrentUser'
import { isAdminUser } from '../lib/auth'

export default function AdminRoute({ children }) {
  const currentUser = useCurrentUser()

  // Loading state
  if (currentUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-sm text-muted">Memuat…</div>
        </div>
      </div>
    )
  }

  // Not logged in → redirect to auth
  if (!currentUser) {
    return <Navigate to="/auth" replace />
  }

  // Not admin → redirect to dashboard
  if (!isAdminUser(currentUser)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

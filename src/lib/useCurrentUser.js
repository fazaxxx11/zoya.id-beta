// Reactive hook untuk current user. Subscribe ke auth state changes
// supaya komponen otomatis re-render saat login/logout.
import { useEffect, useState } from 'react'
import { getCurrentUser, subscribeAuth } from './auth'

export function useCurrentUser() {
  const [user, setUser] = useState(() => getCurrentUser())
  useEffect(() => subscribeAuth(setUser), [])
  return user
}

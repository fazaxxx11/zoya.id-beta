// usePersist — useState yang otomatis sync ke localStorage.
// Dipakai oleh tool page untuk persist result antar-route (cth: Statistik
// write result di /statistik → StatistikHasil read di /statistik/hasil).
//
// Catatan: write ke localStorage terjadi di useEffect (async). Kalau caller
// navigate() di handler yang sama dgn setState, component bisa unmount sebelum
// effect fire. Untuk kasus itu, tulis localStorage secara synchronous sebelum
// navigate, dan gunakan usePersist di sisi pembaca (mount → baca localStorage).

import { useState, useEffect } from 'react'

export function usePersist(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {}
  }, [key, state])

  return [state, setState]
}

export default usePersist

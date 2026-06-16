import { useState, useEffect } from 'react'
import { getBackendStatus } from '../stats/backend'

export function useStatsBackend() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBackendStatus()
      .then(setStatus)
      .catch(() => setStatus({ pythonAvailable: false, backend: 'javascript' }))
      .finally(() => setLoading(false))
  }, [])

  return { status, loading }
}

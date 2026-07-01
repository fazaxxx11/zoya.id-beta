// StatistikHasil — page terpisah buat nampilin hasil analisis Statistik.
// Sebelumnya result dirender inline di /statistik (numpuk dgn form upload).
// Sekarang Statistik.jsx persist result ke localStorage + navigate ke sini.
//
// ResultDisplay di-lazy-load (recharts + 14 ResultCards + panel-panel hasil
// berat) supaya chunk awal tetap kecil — sama seperti sebelumnya.

import { lazy, Suspense, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { STATISTIK_SUBNAV } from '../lib/statistikNav'
import { usePersist } from '../hooks/usePersist'

const ResultDisplay = lazy(() => import('../components/statistik/ResultDisplay'))

export default function StatistikHasil() {
  const navigate = useNavigate()
  const [result] = usePersist('statistik_result', null)

  // "Analisis Lain" — balik ke /statistik. Result tetap persisted, user bisa
  // balik ke /statistik/hasil kalo mau lihat lagi.
  const handleBackToAnalysis = useCallback(() => {
    navigate('/statistik')
  }, [navigate])

  // "Upload Ulang" — balik ke /statistik & clear result supaya form fresh.
  const handleReset = useCallback(() => {
    try { localStorage.removeItem('statistik_result') } catch {}
    navigate('/statistik')
  }, [navigate])

  // Kalau gak ada result (misal user buka /statistik/hasil langsung tanpa
  // analisis), balik ke /statistik.
  if (!result) {
    return (
      <div className="min-h-screen bg-bg pb-bottomnav">
        <PageHeader
          title="Hasil analisis"
          subtitle="STATISTIK · HASIL"
          parentPath="/statistik"
          parentLabel="Statistik"
          subNav={STATISTIK_SUBNAV}
        />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-sm text-muted mb-4">Belum ada hasil analisis. Jalankan analisis dulu di halaman Statistik.</p>
          <button onClick={() => navigate('/statistik')}
            className="px-5 py-2.5 bg-accent hover:bg-accent/90 text-accent-fg text-sm font-medium rounded-lg">
            Ke Statistik
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg text-fg pb-bottomnav paper-texture">
      <PageHeader
        title="Hasil analisis"
        eyebrow="STATISTIK · HASIL"
        tagline={`${result.toolName} · ${result.sampleSize} sampel · ${result.analyzedAt}`}
        variant="hero"
        accent="gold"
        parentPath="/statistik"
        parentLabel="Statistik"
        breadcrumbs={[
          { path: '/statistik', label: 'Statistik' },
          { label: 'Hasil' },
        ]}
        subNav={STATISTIK_SUBNAV}
      />
      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-4">
        <Suspense fallback={
          <div className="border border-border bg-card rounded-xl p-8 flex items-center justify-center gap-3 text-sm text-muted">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            Memuat hasil…
          </div>
        }>
          <ResultDisplay
            result={result}
            onReset={handleReset}
            onBackToAnalysis={handleBackToAnalysis}
          />
        </Suspense>
      </div>
    </div>
  )
}

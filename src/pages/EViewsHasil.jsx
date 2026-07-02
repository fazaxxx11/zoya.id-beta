// EViewsHasil — page terpisah buat nampilin hasil EViews.
// Sebelumnya result dirender inline di /eviews (3 tab numpuk dgn form input).
// Sekarang EViews.jsx persist result ke localStorage + navigate ke sini.
//
// Branch pada result._type:
// 'estimasi'   → ModelSummaryCard + CoefficientsTable + Hausman + Diagnostik (interaktif)
// 'timeseries' → ADF / Granger / Cointegration cards

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RotateCcw, ArrowRight, AlertTriangle, TrendingUp,
  ArrowRightLeft, Link2, Activity,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SaveAnalysisButton from '../components/SaveAnalysisButton'
import AIInterpretationPanel from '../components/AIInterpretationPanel'
import ModelSummaryCard from '../components/panel/ModelSummaryCard'
import CoefficientsTable from '../components/panel/CoefficientsTable'
import HausmanCard from '../components/panel/HausmanCard'
import DiagnosticsCard from '../components/panel/DiagnosticsCard'
import {
  ADFResultCard,
  GrangerResultCard,
  CointegrationResultCard,
  LagInfoCard,
} from '../components/timeseries'
import {
  hausmanTestAdapter, breuschPaganAdapter, whiteTestAdapter, wooldridgeTestAdapter,
} from '../lib/statistics'
import { usePersist } from '../hooks/usePersist'
import { toast } from '../lib/toast'

export default function EViewsHasil() {
  const navigate = useNavigate()
  const [result] = usePersist('eviews_result', null)
  const [aiInterpretation, setAiInterpretation] = useState('')

  // Interactive diagnostic state (recomputed on this page, not persisted back)
  const [hausman, setHausman] = useState(null)
  const [diagnostics, setDiagnostics] = useState({ bp: null, white: null, wooldridge: null })

  const handleBack = useCallback(() => navigate('/eviews'), [navigate])

  const handleReset = useCallback(() => {
    try { localStorage.removeItem('eviews_result') } catch {}
    navigate('/eviews')
  }, [navigate])

  // ─── Hausman test (interactive) ───
  const runHausman = useCallback(() => {
    const est = result?.estimationResults
    if (!est?.FE || !est?.RE) return
    try {
      const h = hausmanTestAdapter(est.FE, est.RE)
      setHausman(h)
    } catch (err) {
      toast.error(err.message)
    }
  }, [result])

  // ─── Diagnostic tests (interactive) ───
  const runDiagnostic = useCallback((type) => {
    const est = result?.estimationResults
    const mainResult = est?.pooledOLS || est?.FE || est?.RE
    if (!mainResult || !result?.data || !result?.panelConfig) return
    try {
      const cfg = result.panelConfig
      let r
      if (type === 'bp') {
        r = breuschPaganAdapter(mainResult, result.data, cfg.xCols)
      } else if (type === 'white') {
        r = whiteTestAdapter(mainResult, result.data, cfg.xCols)
      } else if (type === 'wooldridge') {
        r = wooldridgeTestAdapter(result.data, cfg.yCol, cfg.xCols, cfg.entityCol, cfg.timeCol)
      }
      if (r) setDiagnostics(prev => ({ ...prev, [type]: r }))
    } catch (err) {
      toast.error(err.message)
    }
  }, [result])

  // ─── Empty state ───
  if (!result) {
    return (
      <div className="min-h-screen pb-bottomnav" style={{ backgroundColor: 'rgb(var(--bg))' }}>
        <PageHeader
          title="Hasil EViews"
          subtitle="EVIEWS · HASIL"
          parentPath="/eviews"
          parentLabel="EViews"
        />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-sm text-muted mb-4">Belum ada hasil analisis. Jalankan analisis dulu di halaman EViews.</p>
          <button onClick={() => navigate('/eviews')}
            className="px-5 py-2.5 bg-accent hover:bg-accent/90 text-accent-fg text-sm font-medium rounded-lg">
            Ke EViews
          </button>
        </div>
      </div>
    )
  }

  const isEstimasi = result._type === 'estimasi'
  const title = isEstimasi ? 'Hasil Estimasi Panel' : 'Hasil Time Series'
  const tsResults = result.tsResults || { adf: [], granger: null, cointegration: null }
  const est = result.estimationResults || {}
  const cfg = result.panelConfig
  const mainResult = est.pooledOLS || est.FE || est.RE

  return (
    <div className="min-h-screen pb-bottomnav" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title={title}
        subtitle="EVIEWS · HASIL"
        breadcrumbs={[
          { path: '/eviews', label: 'EViews' },
          { label: 'Hasil' },
        ]}
        actions={
          <button onClick={handleReset}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border flex items-center gap-1.5 bg-card text-fg border-border hover:bg-surface">
            <RotateCcw className="w-3.5 h-3.5" /> Analisis Baru
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-4 space-y-4">
        {/* Timestamp + save */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">
            {result.fileName ? `${result.fileName} · ` : ''}{result.analyzedAt || ''}
          </span>
          <SaveAnalysisButton result={result} defaultTitle={isEstimasi ? 'Estimasi Panel' : 'Time Series'} />
        </div>

        {/* ═══════════ ESTIMASI ═══════════ */}
        {isEstimasi && (
          <>
            {/* Error */}
            {mainResult?.error && (
              <div className="p-3 rounded-lg border text-sm" style={{ borderColor: 'rgb(239 68 68 / 0.3)', backgroundColor: 'rgb(239 68 68 / 0.05)', color: 'rgb(239 68 68)' }}>
                <strong>Error:</strong> {mainResult.error}
              </div>
            )}

            {/* Model summary + coefficients */}
            {mainResult && !mainResult.error && (
              <>
                <ModelSummaryCard result={mainResult} modelType={cfg?.modelType} />
                <CoefficientsTable result={mainResult} />
              </>
            )}

            {/* Hausman — interactive */}
            {est.FE && est.RE && !mainResult?.error && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-fg">Uji Hausman (FE vs RE)</h3>
                {!hausman && (
                  <button
                    onClick={runHausman}
                    className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors active:scale-95"
                    style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--surface))', color: 'rgb(var(--fg))' }}
                  >
                    Jalankan Uji Hausman (FE vs RE)
                  </button>
                )}
                {hausman && <HausmanCard result={hausman} />}
              </div>
            )}

            {/* Diagnostik — interactive */}
            {mainResult && !mainResult?.error && cfg && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-fg flex items-center gap-2">
                  <Activity className="w-4 h-4" style={{ color: 'rgb(var(--accent))' }} />
                  Diagnostik Model
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'bp', label: 'Breusch-Pagan', desc: 'Uji heteroskedastisitas — apakah varians error konstan?' },
                    { key: 'white', label: "White's Test", desc: 'Uji heteroskedastisitas umum — tanpa asumsi distribusi tertentu' },
                    { key: 'wooldridge', label: 'Wooldridge', desc: 'Uji autokorelasi pada data panel — apakah error berkorelasi lintas waktu?' },
                  ].map(d => (
                    <button
                      key={d.key}
                      onClick={() => runDiagnostic(d.key)}
                      disabled={!!diagnostics[d.key]}
                      className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 active:scale-95"
                      style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--surface))', color: 'rgb(var(--fg))' }}
                    >
                      {diagnostics[d.key] ? '✓ ' : ''}{d.label}
                      <span className="ml-1 opacity-60 cursor-help" title={d.desc}>ⓘ</span>
                    </button>
                  ))}
                </div>
                {Object.entries(diagnostics).filter(([, v]) => v).map(([type, r]) => (
                  <DiagnosticsCard key={type} type={type} result={r} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══════════ TIME SERIES ═══════════ */}
        {!isEstimasi && (
          <>
            {/* ADF Results */}
            {tsResults.adf?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--fg))' }}>
                  <TrendingUp className="w-4 h-4" style={{ color: 'rgb(var(--accent))' }} />
                  ADF Results ({tsResults.adf.length} variabel)
                </h3>
                {tsResults.adf.map((r, i) => (
                  r.error ? (
                    <div key={i} className="p-3 rounded-lg border text-xs" style={{ borderColor: 'rgb(239 68 68 / 0.3)', backgroundColor: 'rgb(239 68 68 / 0.05)', color: 'rgb(239 68 68)' }}>
                      {r.variable}: {r.error}
                    </div>
                  ) : (
                    <ADFResultCard key={i} result={r} />
                  )
                ))}
                <LagInfoCard lagInfo={{ lags: tsResults.adf[0]?.lags, method: 'AIC' }} title="Lag Selection Info" />
              </div>
            )}

            {/* Granger Results */}
            {tsResults.granger && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--fg))' }}>
                  <ArrowRightLeft className="w-4 h-4" style={{ color: 'rgb(var(--accent))' }} />
                  Granger Results ({tsResults.granger.pairs.length} pasangan)
                </h3>
                {tsResults.granger.warnings?.map((w, i) => (
                  <div key={i} className="p-3 rounded-lg border flex items-center gap-2 text-xs" style={{ borderColor: 'rgb(251 191 36 / 0.3)', backgroundColor: 'rgb(251 191 36 / 0.05)', color: 'rgb(180 83 9)' }}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {w}
                  </div>
                ))}
                {tsResults.granger.pairs.map((r, i) => (
                  <GrangerResultCard key={i} result={{ ...r, xLabel: r.x, yLabel: r.y }} />
                ))}
              </div>
            )}

            {/* Cointegration Results */}
            {tsResults.cointegration && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--fg))' }}>
                  <Link2 className="w-4 h-4" style={{ color: 'rgb(var(--accent))' }} />
                  Cointegration Result
                </h3>
                <CointegrationResultCard result={{ ...tsResults.cointegration, yLabel: tsResults.cointegration.pair?.y, xLabel: tsResults.cointegration.pair?.x }} />
              </div>
            )}
          </>
        )}

        <AIInterpretationPanel
          result={result}
          value={aiInterpretation}
          onChange={setAiInterpretation}
        />

        <div className="flex justify-center pt-2">
          <button onClick={handleBack}
            className="px-5 py-2.5 rounded-lg text-sm font-heading font-semibold bg-accent text-accent-fg hover:bg-accent/90 transition-colors flex items-center gap-2">
            <ArrowRight className="w-4 h-4" /> Analisis Lain
          </button>
        </div>
      </div>
    </div>
  )
}

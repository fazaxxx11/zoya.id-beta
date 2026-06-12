// EViews.jsx — Consolidated EViews Analysis Page (Phase 5C)
// 3 tabs: Estimasi Panel | Diagnostik | Time Series
// One shared CSV upload across all tabs.

import { useState, useMemo, useCallback } from 'react'
import {
  TrendingUp, Upload, Play, FileSpreadsheet,
  AlertTriangle, CheckCircle, Settings2,
  ArrowRightLeft, Link2, Trash2, BarChart3,
  LayoutGrid, Activity,
} from 'lucide-react'
import Papa from 'papaparse'
import PageHeader from '../components/PageHeader'
import { Button } from '../components/ui/Button'
import PanelConfig from '../components/panel/PanelConfig'
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
  pooledOLSAdapter, fixedEffectsAdapter, randomEffectsAdapter,
  hausmanTestAdapter, breuschPaganAdapter, whiteTestAdapter, wooldridgeTestAdapter,
} from '../lib/statistics'
import {
  adfTestAdapter,
  grangerCausalityAdapter,
  engleGrangerCointegrationAdapter,
} from '../lib/statistics/uiAdapters'
import { toast } from '../lib/toast'

// ============================================================
// Constants
// ============================================================
const FREQUENCIES = ['Harian', 'Mingguan', 'Bulanan', 'Kuartal', 'Tahunan']
const DETERMINISTICS = [
  { value: 'constant', label: 'Constant' },
  { value: 'trend', label: 'Constant + Trend' },
  { value: 'none', label: 'None' },
]

const SAMPLE_CSV = `Date,GDP,Inflation,Interest_Rate
2020-01,100,2.5,5.0
2020-02,101,2.6,5.0
2020-03,99,2.4,4.8
2020-04,97,2.3,4.5
2020-05,98,2.2,4.3
2020-06,100,2.1,4.2
2020-07,102,2.0,4.0
2020-08,103,1.9,4.0
2020-09,104,1.8,3.8
2020-10,105,1.7,3.8
2020-11,106,1.6,3.5
2020-12,107,1.5,3.5
2021-01,108,1.6,3.5
2021-02,109,1.7,3.5
2021-03,110,1.8,3.5
2021-04,111,1.9,3.5
2021-05,112,2.0,3.5
2021-06,113,2.1,3.5
2021-07,114,2.2,3.5
2021-08,115,2.3,3.5
2021-09,116,2.4,3.8
2021-10,117,2.5,3.8
2021-11,118,2.6,4.0
2021-12,119,2.7,4.0
2022-01,120,2.8,4.2
2022-02,121,2.9,4.5
2022-03,122,3.0,4.8
2022-04,123,3.1,5.0
2022-05,124,3.0,5.0
2022-06,125,2.9,5.0
2022-07,126,2.8,5.0
2022-08,127,2.7,4.8
2022-09,128,2.6,4.8
2022-10,129,2.5,4.5
2022-11,130,2.4,4.5
2022-12,131,2.3,4.2`

// ============================================================
// Main Component
// ============================================================
export default function EViewsPage() {
  // ─── Shared State ───
  const [data, setData] = useState(null)
  const [columns, setColumns] = useState([])
  const [fileName, setFileName] = useState('')
  const [activeTab, setActiveTab] = useState('estimasi')

  // ─── Tab 1: Estimasi ───
  const [panelConfig, setPanelConfig] = useState(null)
  const [estLoading, setEstLoading] = useState(false)
  const [estimationResults, setEstimationResults] = useState({
    pooledOLS: null, FE: null, RE: null,
  })

  // ─── Tab 2: Diagnostik ───
  const [diagnosticResults, setDiagnosticResults] = useState({
    hausman: null, bp: null, white: null, wooldridge: null,
  })

  // ─── Tab 3: Time Series ───
  const [tsConfig, setTsConfig] = useState({
    dateColumn: '',
    frequency: 'Bulanan',
    selectedCols: [],
    adfColumns: [],
    deterministic: 'constant',
    maxLagInput: 'auto',
    significance: 0.05,
    grangerX: '',
    grangerY: '',
    runAllPairs: false,
    cointY: '',
    cointX: '',
    tsTest: 'adf',
  })
  const [tsResults, setTsResults] = useState({
    adf: [], granger: null, cointegration: null,
  })
  const [tsRunning, setTsRunning] = useState(false)
  const [tsError, setTsError] = useState(null)

  // ─── Derived: numeric columns ───
  const numericColumns = useMemo(() => {
    if (!data || !columns.length) return []
    return columns.filter(h => {
      const vals = data.slice(0, 50).map(r => Number(r[h]))
      const numeric = vals.filter(v => !isNaN(v) && v !== 0)
      return numeric.length / Math.max(vals.length, 1) > 0.5
    })
  }, [data, columns])

  // ─── Derived: numeric rows for time series ───
  const tsRows = useMemo(() => {
    if (!data) return []
    return data.map(row => {
      const obj = {}
      columns.forEach(c => { obj[c] = Number(row[c]) })
      return obj
    })
  }, [data, columns])

  // ─── Derived: column data getter ───
  const getColumnData = useCallback((colName) => {
    if (!data) return []
    return data.map(r => Number(r[colName]))
  }, [data])

  // ============================================================
  // Upload Handler
  // ============================================================
  const handleUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) return
        const cols = results.meta.fields || Object.keys(results.data[0])
        setData(results.data)
        setColumns(cols)
        setFileName(file.name)
        // Reset all results
        setEstimationResults({ pooledOLS: null, FE: null, RE: null })
        setDiagnosticResults({ hausman: null, bp: null, white: null, wooldridge: null })
        setTsResults({ adf: [], granger: null, cointegration: null })
        toast.info(`File "${file.name}" dimuat`)
      },
    })
  }, [])

  const clearAll = useCallback(() => {
    setData(null)
    setColumns([])
    setFileName('')
    setPanelConfig(null)
    setEstimationResults({ pooledOLS: null, FE: null, RE: null })
    setDiagnosticResults({ hausman: null, bp: null, white: null, wooldridge: null })
    setTsResults({ adf: [], granger: null, cointegration: null })
  }, [])

  // ============================================================
  // Tab 1: Estimasi
  // ============================================================
  const handleEstimate = useCallback(async (cfg) => {
    setPanelConfig(cfg)
    setEstLoading(true)
    setEstimationResults({ pooledOLS: null, FE: null, RE: null })
    setDiagnosticResults({ hausman: null, bp: null, white: null, wooldridge: null })

    await new Promise(r => setTimeout(r, 50))

    try {
      const { entityCol, timeCol, yCol, xCols, modelType } = cfg
      const options = { entityCol, timeCol }

      let result
      if (modelType === 'pooledOLS') {
        result = pooledOLSAdapter(data, yCol, xCols, options)
      } else if (modelType === 'fixedEffects') {
        result = fixedEffectsAdapter(data, yCol, xCols, options)
      } else if (modelType === 'randomEffects') {
        result = randomEffectsAdapter(data, yCol, xCols, options)
      }

      setEstimationResults(prev => ({ ...prev, [modelType === 'fixedEffects' ? 'FE' : modelType === 'randomEffects' ? 'RE' : 'pooledOLS']: result }))

      // Auto-estimate FE and RE for Hausman
      if (modelType === 'fixedEffects') {
        setEstimationResults(prev => ({ ...prev, FE: result }))
        try {
          const re = randomEffectsAdapter(data, yCol, xCols, options)
          setEstimationResults(prev => ({ ...prev, RE: re }))
        } catch {}
      } else if (modelType === 'randomEffects') {
        setEstimationResults(prev => ({ ...prev, RE: result }))
        try {
          const fe = fixedEffectsAdapter(data, yCol, xCols, options)
          setEstimationResults(prev => ({ ...prev, FE: fe }))
        } catch {}
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setEstLoading(false)
    }
  }, [data])

  const runHausman = useCallback(() => {
    const { FE, RE } = estimationResults
    if (!FE || !RE) return
    try {
      const h = hausmanTestAdapter(FE, RE)
      setDiagnosticResults(prev => ({ ...prev, hausman: h }))
    } catch (err) {
      toast.error(err.message)
    }
  }, [estimationResults])

  // ============================================================
  // Tab 2: Diagnostik
  // ============================================================
  const runDiagnostic = useCallback((type) => {
    const mainResult = estimationResults.pooledOLS || estimationResults.FE || estimationResults.RE
    if (!mainResult || !data || !panelConfig) return
    try {
      let result
      if (type === 'bp') {
        result = breuschPaganAdapter(mainResult, data, panelConfig.xCols)
      } else if (type === 'white') {
        result = whiteTestAdapter(mainResult, data, panelConfig.xCols)
      } else if (type === 'wooldridge') {
        result = wooldridgeTestAdapter(data, panelConfig.yCol, panelConfig.xCols, panelConfig.entityCol, panelConfig.timeCol)
      }
      if (result) setDiagnosticResults(prev => ({ ...prev, [type]: result }))
    } catch (err) {
      toast.error(err.message)
    }
  }, [estimationResults, data, panelConfig])

  // ============================================================
  // Tab 3: Time Series
  // ============================================================
  const updateTsConfig = useCallback((patch) => {
    setTsConfig(prev => ({ ...prev, ...patch }))
  }, [])

  // Auto-detect date column
  useMemo(() => {
    if (!tsConfig.dateColumn && columns.length > 0) {
      const dateKeywords = ['date', 'time', 'tanggal', 'periode', 'period', 'year', 'month', 'quarter']
      const found = columns.find(h => dateKeywords.some(k => h.toLowerCase().includes(k)))
      if (found) updateTsConfig({ dateColumn: found })
    }
  }, [columns, tsConfig.dateColumn, updateTsConfig])

  // Auto-select numeric columns for TS
  useMemo(() => {
    if (tsConfig.selectedCols.length === 0 && numericColumns.length > 0) {
      updateTsConfig({ selectedCols: numericColumns.slice(), adfColumns: numericColumns.slice() })
    }
  }, [numericColumns, tsConfig.selectedCols.length, updateTsConfig])

  const toggleTsCol = useCallback((col) => {
    updateTsConfig({
      selectedCols: tsConfig.selectedCols.includes(col)
        ? tsConfig.selectedCols.filter(c => c !== col)
        : [...tsConfig.selectedCols, col],
    })
  }, [tsConfig.selectedCols, updateTsConfig])

  const toggleAdfCol = useCallback((col) => {
    updateTsConfig({
      adfColumns: tsConfig.adfColumns.includes(col)
        ? tsConfig.adfColumns.filter(c => c !== col)
        : [...tsConfig.adfColumns, col],
    })
  }, [tsConfig.adfColumns, updateTsConfig])

  const tsOpts = useMemo(() => ({
    deterministic: tsConfig.deterministic,
    maxLags: tsConfig.maxLagInput === 'auto' ? 'auto' : parseInt(tsConfig.maxLagInput, 10),
  }), [tsConfig.deterministic, tsConfig.maxLagInput])

  // ADF
  const runADF = useCallback(() => {
    setTsError(null)
    setTsRunning(true)
    setTsResults(prev => ({ ...prev, adf: [] }))
    try {
      const cols = tsConfig.adfColumns.length > 0 ? tsConfig.adfColumns : tsConfig.selectedCols
      if (cols.length === 0) throw new Error('Pilih minimal satu kolom')
      const results = cols.map(col => {
        const series = getColumnData(col)
        const r = adfTestAdapter(series, tsOpts)
        return { variable: col, ...r }
      })
      setTsResults(prev => ({ ...prev, adf: results }))
      toast.success(`ADF selesai — ${results.length} variabel`)
    } catch (err) {
      setTsError(err.message)
      toast.error(err.message)
    } finally {
      setTsRunning(false)
    }
  }, [tsConfig.adfColumns, tsConfig.selectedCols, getColumnData, tsOpts])

  // Granger
  const runGranger = useCallback(() => {
    setTsError(null)
    setTsRunning(true)
    setTsResults(prev => ({ ...prev, granger: null }))
    try {
      const grangerOpts = { maxLags: tsOpts.maxLags, method: 'AIC' }

      // Stationarity warning
      const adfResults = tsResults.adf
      const nonStationaryVars = []
      if (tsConfig.runAllPairs) {
        const cols = tsConfig.selectedCols.length > 0 ? tsConfig.selectedCols : numericColumns
        cols.forEach(col => {
          const adfR = adfResults.find(a => a.variable === col)
          if (adfR && !adfR.isStationary) nonStationaryVars.push(col)
        })
      } else {
        ;[tsConfig.grangerX, tsConfig.grangerY].forEach(col => {
          if (!col) return
          const adfR = adfResults.find(a => a.variable === col)
          if (adfR && !adfR.isStationary) nonStationaryVars.push(col)
        })
      }
      if (nonStationaryVars.length > 0) {
        toast.error(`Variabel tidak stasioner: ${nonStationaryVars.join(', ')}. Gunakan first differencing.`)
        setTsRunning(false)
        return
      }

      if (tsConfig.runAllPairs) {
        const cols = tsConfig.selectedCols.length > 0 ? tsConfig.selectedCols : numericColumns
        if (cols.length < 2) throw new Error('Minimal 2 kolom untuk run all pairs')
        const pairs = []
        for (let i = 0; i < cols.length; i++) {
          for (let j = 0; j < cols.length; j++) {
            if (i === j) continue
            const x = getColumnData(cols[i])
            const y = getColumnData(cols[j])
            const r = grangerCausalityAdapter(y, x, grangerOpts)
            pairs.push({ x: cols[i], y: cols[j], ...r })
          }
        }
        const nPairs = cols.length * (cols.length - 1)
        const adjustedAlpha = tsConfig.significance / nPairs
        const warnings = nPairs > 1
          ? [`Multiple testing: ${nPairs} pairs. Bonferroni-adjusted α = ${adjustedAlpha.toFixed(4)}`]
          : []
        setTsResults(prev => ({ ...prev, granger: { pairs, warnings, nPairs, adjustedAlpha } }))
        toast.success(`Granger selesai — ${pairs.length} pasangan`)
      } else {
        if (!tsConfig.grangerX || !tsConfig.grangerY) throw new Error('Pilih kolom X dan Y')
        if (tsConfig.grangerX === tsConfig.grangerY) throw new Error('X dan Y harus berbeda')
        const x = getColumnData(tsConfig.grangerX)
        const y = getColumnData(tsConfig.grangerY)
        const r = grangerCausalityAdapter(y, x, grangerOpts)
        setTsResults(prev => ({ ...prev, granger: { pairs: [{ x: tsConfig.grangerX, y: tsConfig.grangerY, ...r }], warnings: [] } }))
        toast.success('Granger selesai')
      }
    } catch (err) {
      setTsError(err.message)
      toast.error(err.message)
    } finally {
      setTsRunning(false)
    }
  }, [tsConfig, tsOpts, tsResults.adf, numericColumns, getColumnData])

  // Cointegration
  const runCoint = useCallback(() => {
    setTsError(null)
    setTsRunning(true)
    setTsResults(prev => ({ ...prev, cointegration: null }))
    try {
      if (!tsConfig.cointY || !tsConfig.cointX) throw new Error('Pilih kolom Y dan X')
      if (tsConfig.cointY === tsConfig.cointX) throw new Error('Y dan X harus berbeda')
      const y = getColumnData(tsConfig.cointY)
      const x = getColumnData(tsConfig.cointX)
      const r = engleGrangerCointegrationAdapter(y, x, tsOpts)
      setTsResults(prev => ({ ...prev, cointegration: { pair: { y: tsConfig.cointY, x: tsConfig.cointX }, ...r } }))
      toast.success('Cointegration selesai')
    } catch (err) {
      setTsError(err.message)
      toast.error(err.message)
    } finally {
      setTsRunning(false)
    }
  }, [tsConfig, tsOpts, getColumnData])

  const handleTsRun = useCallback(() => {
    if (tsConfig.tsTest === 'adf') runADF()
    else if (tsConfig.tsTest === 'granger') runGranger()
    else if (tsConfig.tsTest === 'cointegration') runCoint()
  }, [tsConfig.tsTest, runADF, runGranger, runCoint])

  // ============================================================
  // Render
  // ============================================================
  const hasData = !!data
  const { pooledOLS, FE, RE } = estimationResults

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title="Analisis EViews"
        subtitle="Panel Estimation · Diagnostics · Time Series"
        breadcrumbs={[
          { path: '/', label: 'Beranda' },
          { path: '/eviews', label: 'EViews' },
        ]}
      />

      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-4 space-y-4 pb-bottomnav">
        {/* ─── Shared Upload ─── */}
        {!hasData ? (
          <label
            className="block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
            style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--card))' }}
          >
            <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgb(var(--muted) / 0.4)' }} />
            <div className="font-semibold text-sm" style={{ color: 'rgb(var(--fg))' }}>
              Upload Dataset
            </div>
            <div className="text-xs mt-1" style={{ color: 'rgb(var(--muted))' }}>
              CSV dengan kolom entitas, waktu, dan variabel
            </div>
            <input type="file" accept=".csv" onChange={handleUpload} className="hidden" />
          </label>
        ) : (
          <div
            className="border rounded-xl p-4"
            style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--card))' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" style={{ color: 'rgb(var(--accent))' }} />
                <span className="font-medium text-sm" style={{ color: 'rgb(var(--fg))' }}>{fileName}</span>
                <span className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                  ({data.length} baris, {columns.length} kolom)
                </span>
              </div>
              <button
                onClick={clearAll}
                className="text-xs flex items-center gap-1 hover:text-red-500 transition-colors"
                style={{ color: 'rgb(var(--muted))' }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            </div>

            {/* Preview */}
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'rgb(var(--border))' }}>
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    {columns.map(c => (
                      <th
                        key={c}
                        className="px-3 py-2 text-left font-medium"
                        style={{ backgroundColor: 'rgb(var(--table-head))', color: 'rgb(var(--fg))' }}
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 5).map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgb(var(--border))' }}>
                      {columns.map(c => (
                        <td
                          key={c}
                          className="px-3 py-1.5 font-mono"
                          style={{ color: 'rgb(var(--fg))' }}
                        >
                          {String(row[c] ?? '').slice(0, 20)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length > 5 && (
                <div className="text-xs text-center py-1" style={{ backgroundColor: 'rgb(var(--surface))', color: 'rgb(var(--muted))' }}>
                  … dan {data.length - 5} baris lainnya
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Tab Bar ─── */}
        {hasData && (
          <div
            className="border rounded-xl overflow-hidden"
            style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--card))' }}
          >
            <div className="flex border-b" style={{ borderColor: 'rgb(var(--border))' }}>
              {[
                { id: 'estimasi', label: 'Estimasi Panel', icon: LayoutGrid },
                { id: 'diagnostik', label: 'Diagnostik', icon: Activity },
                { id: 'timeseries', label: 'Time Series', icon: TrendingUp },
              ].map(tab => {
                const Icon = tab.icon
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold transition-colors"
                    style={{
                      borderBottom: active ? '2px solid rgb(var(--accent))' : '2px solid transparent',
                      color: active ? 'rgb(var(--accent))' : 'rgb(var(--muted))',
                      backgroundColor: active ? 'rgb(var(--accent) / 0.04)' : 'transparent',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="p-4">
              {/* ═══════════ TAB 1: ESTIMASI ═══════════ */}
              {activeTab === 'estimasi' && (
                <div className="space-y-4">
                  <PanelConfig columns={columns} onEstimate={handleEstimate} loading={estLoading} />

                  {(pooledOLS || FE || RE) && !pooledOLS?.error && !FE?.error && !RE?.error && (
                    <>
                      <ModelSummaryCard result={pooledOLS || FE || RE} modelType={panelConfig?.modelType} />
                      <CoefficientsTable result={pooledOLS || FE || RE} />

                      {/* Hausman */}
                      {FE && RE && (
                        <div className="space-y-3">
                          {!diagnosticResults.hausman && (
                            <button
                              onClick={runHausman}
                              className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
                              style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--surface))', color: 'rgb(var(--fg))' }}
                            >
                              Jalankan Uji Hausman (FE vs RE)
                            </button>
                          )}
                          {diagnosticResults.hausman && <HausmanCard result={diagnosticResults.hausman} />}
                        </div>
                      )}
                    </>
                  )}

                  {(pooledOLS?.error || FE?.error || RE?.error) && (
                    <div
                      className="p-3 rounded-lg border text-sm"
                      style={{ borderColor: 'rgb(239 68 68 / 0.3)', backgroundColor: 'rgb(239 68 68 / 0.05)', color: 'rgb(239 68 68)' }}
                    >
                      <strong>Error:</strong> {pooledOLS?.error || FE?.error || RE?.error}
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════ TAB 2: DIAGNOSTIK ═══════════ */}
              {activeTab === 'diagnostik' && (
                <div className="space-y-4">
                  {!panelConfig ? (
                    <div className="text-center py-8" style={{ color: 'rgb(var(--muted))' }}>
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Jalankan estimasi panel terlebih dahulu di tab Estimasi.</p>
                    </div>
                  ) : (
                    <>
                      {/* Hausman */}
                      {FE && RE && !diagnosticResults.hausman && (
                        <button
                          onClick={runHausman}
                          className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
                          style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--surface))', color: 'rgb(var(--fg))' }}
                        >
                          Jalankan Uji Hausman (FE vs RE)
                        </button>
                      )}
                      {diagnosticResults.hausman && <HausmanCard result={diagnosticResults.hausman} />}

                      {/* BP, White, Wooldridge */}
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: 'bp', label: 'Breusch-Pagan' },
                          { key: 'white', label: "White's Test" },
                          { key: 'wooldridge', label: 'Wooldridge' },
                        ].map(d => (
                          <button
                            key={d.key}
                            onClick={() => runDiagnostic(d.key)}
                            disabled={!!diagnosticResults[d.key]}
                            className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50"
                            style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--surface))', color: 'rgb(var(--fg))' }}
                          >
                            {diagnosticResults[d.key] ? '✓ ' : ''}{d.label}
                          </button>
                        ))}
                      </div>

                      {Object.entries(diagnosticResults).filter(([k, v]) => v && k !== 'hausman').map(([type, result]) => (
                        <DiagnosticsCard key={type} type={type} result={result} />
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* ═══════════ TAB 3: TIME SERIES ═══════════ */}
              {activeTab === 'timeseries' && (
                <div className="space-y-4">
                  {/* TS Config */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>
                        Kolom Date/Time
                      </label>
                      <select
                        value={tsConfig.dateColumn}
                        onChange={(e) => updateTsConfig({ dateColumn: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--input))', color: 'rgb(var(--fg))' }}
                      >
                        <option value="">— Pilih —</option>
                        {columns.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>
                        Frekuensi
                      </label>
                      <select
                        value={tsConfig.frequency}
                        onChange={(e) => updateTsConfig({ frequency: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--input))', color: 'rgb(var(--fg))' }}
                      >
                        {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Numeric columns */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium" style={{ color: 'rgb(var(--muted))' }}>
                        Kolom Numerik
                      </label>
                      <div className="flex gap-2">
                        <button onClick={() => updateTsConfig({ selectedCols: numericColumns.slice(), adfColumns: numericColumns.slice() })} className="text-[10px] font-medium hover:underline" style={{ color: 'rgb(var(--accent))' }}>Select All</button>
                        <button onClick={() => updateTsConfig({ selectedCols: [], adfColumns: [] })} className="text-[10px] font-medium hover:underline" style={{ color: 'rgb(var(--muted))' }}>Deselect All</button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {numericColumns.map(col => {
                        const active = tsConfig.selectedCols.includes(col)
                        return (
                          <button
                            key={col}
                            onClick={() => toggleTsCol(col)}
                            className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                            style={{
                              borderColor: active ? 'rgb(var(--accent))' : 'rgb(var(--border))',
                              backgroundColor: active ? 'rgb(var(--accent) / 0.1)' : 'rgb(var(--surface))',
                              color: active ? 'rgb(var(--accent))' : 'rgb(var(--muted))',
                            }}
                          >
                            {col}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Test selector tabs */}
                  <div className="flex border-b" style={{ borderColor: 'rgb(var(--border))' }}>
                    {[
                      { id: 'adf', label: 'ADF Unit Root', icon: TrendingUp },
                      { id: 'granger', label: 'Granger', icon: ArrowRightLeft },
                      { id: 'cointegration', label: 'Cointegration', icon: Link2 },
                    ].map(tab => {
                      const Icon = tab.icon
                      const active = tsConfig.tsTest === tab.id
                      return (
                        <button
                          key={tab.id}
                          onClick={() => updateTsConfig({ tsTest: tab.id })}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold transition-colors"
                          style={{
                            borderBottom: active ? '2px solid rgb(var(--accent))' : '2px solid transparent',
                            color: active ? 'rgb(var(--accent))' : 'rgb(var(--muted))',
                            backgroundColor: active ? 'rgb(var(--accent) / 0.04)' : 'transparent',
                          }}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* ADF tab content */}
                  {tsConfig.tsTest === 'adf' && (
                    <div>
                      <p className="text-xs mb-3" style={{ color: 'rgb(var(--muted))' }}>
                        ADF test akan dijalankan pada semua kolom yang dipilih.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {numericColumns.map(col => {
                          const active = tsConfig.adfColumns.includes(col)
                          return (
                            <button
                              key={col}
                              onClick={() => toggleAdfCol(col)}
                              className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                              style={{
                                borderColor: active ? 'rgb(var(--accent))' : 'rgb(var(--border))',
                                backgroundColor: active ? 'rgb(var(--accent) / 0.1)' : 'rgb(var(--surface))',
                                color: active ? 'rgb(var(--accent))' : 'rgb(var(--muted))',
                              }}
                            >
                              {active && <CheckCircle className="w-3 h-3 inline mr-1" />}
                              {col}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Granger tab content */}
                  {tsConfig.tsTest === 'granger' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>X (Explanatory)</label>
                          <select
                            value={tsConfig.grangerX}
                            onChange={(e) => updateTsConfig({ grangerX: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border text-sm"
                            style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--input))', color: 'rgb(var(--fg))' }}
                            disabled={tsConfig.runAllPairs}
                          >
                            <option value="">— Pilih X —</option>
                            {numericColumns.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>Y (Dependent)</label>
                          <select
                            value={tsConfig.grangerY}
                            onChange={(e) => updateTsConfig({ grangerY: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border text-sm"
                            style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--input))', color: 'rgb(var(--fg))' }}
                            disabled={tsConfig.runAllPairs}
                          >
                            <option value="">— Pilih Y —</option>
                            {numericColumns.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={tsConfig.runAllPairs} onChange={(e) => updateTsConfig({ runAllPairs: e.target.checked })} className="rounded" />
                        <span className="text-xs font-medium" style={{ color: 'rgb(var(--fg))' }}>Run all pairs</span>
                      </label>
                      {tsConfig.runAllPairs && (
                        <div className="flex items-center gap-2 text-xs p-2 rounded-lg" style={{ backgroundColor: 'rgb(251 191 36 / 0.08)', color: 'rgb(180 83 9)' }}>
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          Multiple testing: Bonferroni correction akan diterapkan
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cointegration tab content */}
                  {tsConfig.tsTest === 'cointegration' && (
                    <div className="space-y-3">
                      <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Engle-Granger bivariate cointegration test.</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>Y (Dependent)</label>
                          <select value={tsConfig.cointY} onChange={(e) => updateTsConfig({ cointY: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--input))', color: 'rgb(var(--fg))' }}>
                            <option value="">— Pilih Y —</option>
                            {numericColumns.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>X (Explanatory)</label>
                          <select value={tsConfig.cointX} onChange={(e) => updateTsConfig({ cointX: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--input))', color: 'rgb(var(--fg))' }}>
                            <option value="">— Pilih X —</option>
                            {numericColumns.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Options */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>Significance</label>
                      <select value={tsConfig.significance} onChange={(e) => updateTsConfig({ significance: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg border text-xs" style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--input))', color: 'rgb(var(--fg))' }}>
                        <option value={0.01}>1%</option>
                        <option value={0.05}>5%</option>
                        <option value={0.10}>10%</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>Deterministic</label>
                      <select value={tsConfig.deterministic} onChange={(e) => updateTsConfig({ deterministic: e.target.value })} className="w-full px-2 py-1.5 rounded-lg border text-xs" style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--input))', color: 'rgb(var(--fg))' }}>
                        {DETERMINISTICS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>Max Lags</label>
                      <input type="text" value={tsConfig.maxLagInput} onChange={(e) => updateTsConfig({ maxLagInput: e.target.value })} placeholder="auto" className="w-full px-2 py-1.5 rounded-lg border text-xs" style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--input))', color: 'rgb(var(--fg))' }} />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>Lag Method</label>
                      <select disabled className="w-full px-2 py-1.5 rounded-lg border text-xs" style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--surface))', color: 'rgb(var(--muted))' }}>
                        <option>AIC</option>
                      </select>
                    </div>
                  </div>

                  {/* Run button */}
                  <Button onClick={handleTsRun} disabled={tsRunning || !data} className="w-full" size="lg">
                    {tsRunning ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Running {tsConfig.tsTest.toUpperCase()}…
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Run {tsConfig.tsTest === 'adf' ? 'ADF Test' : tsConfig.tsTest === 'granger' ? 'Granger Test' : 'Cointegration Test'}
                      </>
                    )}
                  </Button>

                  {/* TS Error */}
                  {tsError && (
                    <div className="p-3 rounded-lg border flex items-center gap-2 text-sm" style={{ borderColor: 'rgb(239 68 68 / 0.3)', backgroundColor: 'rgb(239 68 68 / 0.05)', color: 'rgb(239 68 68)' }}>
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      {tsError}
                    </div>
                  )}

                  {/* TS Results: ADF */}
                  {tsConfig.tsTest === 'adf' && tsResults.adf.length > 0 && (
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

                  {/* TS Results: Granger */}
                  {tsConfig.tsTest === 'granger' && tsResults.granger && (
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

                  {/* TS Results: Cointegration */}
                  {tsConfig.tsTest === 'cointegration' && tsResults.cointegration && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--fg))' }}>
                        <Link2 className="w-4 h-4" style={{ color: 'rgb(var(--accent))' }} />
                        Cointegration Result
                      </h3>
                      <CointegrationResultCard result={{ ...tsResults.cointegration, yLabel: tsResults.cointegration.pair?.y, xLabel: tsResults.cointegration.pair?.x }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// EViews.jsx — Consolidated EViews Analysis Page (Phase 3)
// 2 tabs: Estimasi Panel | Time Series
// One shared CSV upload across all tabs.
// Results display on /eviews/hasil (separate page).

import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Upload, Play, FileSpreadsheet,
  AlertTriangle, CheckCircle,
  ArrowRightLeft, Link2, Trash2,
  LayoutGrid,
} from 'lucide-react'
import Papa from 'papaparse'
import PageHeader from '../components/PageHeader'
import { Button } from '../components/ui/Button'
import PanelConfig from '../components/panel/PanelConfig'
import {
  pooledOLSAdapter, fixedEffectsAdapter, randomEffectsAdapter,
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
// Helpers
// ============================================================
const stamp = () => new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })

// ============================================================
// Main Component
// ============================================================
export default function EViewsPage() {
  const navigate = useNavigate()

  // ─── Restore from last result (user can run another test without re-uploading) ───
  const saved = useMemo(() => {
    try {
      const raw = localStorage.getItem('eviews_result')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }, [])

  // ─── Shared State ───
  const [data, setData] = useState(saved?.data ?? null)
  const [columns, setColumns] = useState(saved?.columns ?? [])
  const [fileName, setFileName] = useState(saved?.fileName ?? '')
  const [activeTab, setActiveTab] = useState(saved?._type === 'timeseries' ? 'timeseries' : 'estimasi')

  // ─── Tab 1: Estimasi ───
  const [estLoading, setEstLoading] = useState(false)

  // ─── Tab 2: Time Series ───
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
    ...saved?.tsConfig,
  })
  const [tsRunning, setTsRunning] = useState(false)
  const [tsError, setTsError] = useState(null)

  // ─── Persist + navigate helper ───
  const persistAndNavigate = useCallback((payload) => {
    try {
      localStorage.setItem('eviews_result', JSON.stringify(payload))
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        toast.error('Dataset terlalu besar untuk disimpan. Coba dataset yang lebih kecil.')
        return false
      }
      throw e
    }
    navigate('/eviews/hasil')
    return true
  }, [navigate])

  // ─── Derived: numeric columns ───
  const numericColumns = useMemo(() => {
    if (!data || !columns.length) return []
    return columns.filter(h => {
      const vals = data.slice(0, 50).map(r => Number(r[h]))
      const numeric = vals.filter(v => !isNaN(v) && v !== 0)
      return numeric.length / Math.max(vals.length, 1) > 0.5
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
        // Clear old results — new data invalidates them
        try { localStorage.removeItem('eviews_result') } catch {}
        toast.info(`File "${file.name}" dimuat`)
      },
    })
  }, [])

  const clearAll = useCallback(() => {
    setData(null)
    setColumns([])
    setFileName('')
    try { localStorage.removeItem('eviews_result') } catch {}
  }, [])

  // ============================================================
  // Tab 1: Estimasi
  // ============================================================
  const handleEstimate = useCallback(async (cfg) => {
    setEstLoading(true)
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

      // If the main result has an error, show it and don't navigate
      if (result?.error) {
        toast.error(result.error)
        return
      }

      const est = { pooledOLS: null, FE: null, RE: null }
      const key = modelType === 'fixedEffects' ? 'FE' : modelType === 'randomEffects' ? 'RE' : 'pooledOLS'
      est[key] = result

      // Auto-estimate counterpart for Hausman
      if (modelType === 'fixedEffects') {
        try { est.RE = randomEffectsAdapter(data, yCol, xCols, options) } catch {}
      } else if (modelType === 'randomEffects') {
        try { est.FE = fixedEffectsAdapter(data, yCol, xCols, options) } catch {}
      }

      persistAndNavigate({
        _type: 'estimasi',
        data, columns, fileName,
        estimationResults: est,
        panelConfig: cfg,
        diagnosticResults: { hausman: null, bp: null, white: null, wooldridge: null },
        analyzedAt: stamp(),
      })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setEstLoading(false)
    }
  }, [data, columns, fileName, persistAndNavigate])

  // ============================================================
  // Tab 2: Time Series
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
    try {
      const cols = tsConfig.adfColumns.length > 0 ? tsConfig.adfColumns : tsConfig.selectedCols
      if (cols.length === 0) throw new Error('Pilih minimal satu kolom')
      const results = cols.map(col => {
        const series = getColumnData(col)
        const r = adfTestAdapter(series, tsOpts)
        return { variable: col, ...r }
      })
      toast.success(`ADF selesai — ${results.length} variabel`)
      persistAndNavigate({
        _type: 'timeseries',
        data, columns, fileName, tsConfig,
        tsResults: { adf: results, granger: null, cointegration: null },
        analyzedAt: stamp(),
      })
    } catch (err) {
      setTsError(err.message)
      toast.error(err.message)
    } finally {
      setTsRunning(false)
    }
  }, [tsConfig, getColumnData, tsOpts, data, columns, fileName, persistAndNavigate])

  // Granger
  const runGranger = useCallback(() => {
    setTsError(null)
    setTsRunning(true)
    try {
      const grangerOpts = { maxLags: tsOpts.maxLags, method: 'AIC' }

      // Read last ADF results from localStorage for stationarity check
      let adfResults = []
      try {
        const raw = localStorage.getItem('eviews_result')
        if (raw) {
          const s = JSON.parse(raw)
          if (s._type === 'timeseries' && s.tsResults?.adf) {
            adfResults = s.tsResults.adf
          }
        }
      } catch {}

      // Stationarity warning
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
        toast.success(`Granger selesai — ${pairs.length} pasangan`)
        persistAndNavigate({
          _type: 'timeseries',
          data, columns, fileName, tsConfig,
          tsResults: { adf: adfResults, granger: { pairs, warnings, nPairs, adjustedAlpha }, cointegration: null },
          analyzedAt: stamp(),
        })
      } else {
        if (!tsConfig.grangerX || !tsConfig.grangerY) throw new Error('Pilih kolom X dan Y')
        if (tsConfig.grangerX === tsConfig.grangerY) throw new Error('X dan Y harus berbeda')
        const x = getColumnData(tsConfig.grangerX)
        const y = getColumnData(tsConfig.grangerY)
        const r = grangerCausalityAdapter(y, x, grangerOpts)
        toast.success('Granger selesai')
        persistAndNavigate({
          _type: 'timeseries',
          data, columns, fileName, tsConfig,
          tsResults: { adf: adfResults, granger: { pairs: [{ x: tsConfig.grangerX, y: tsConfig.grangerY, ...r }], warnings: [] }, cointegration: null },
          analyzedAt: stamp(),
        })
      }
    } catch (err) {
      setTsError(err.message)
      toast.error(err.message)
    } finally {
      setTsRunning(false)
    }
  }, [tsConfig, tsOpts, numericColumns, getColumnData, data, columns, fileName, persistAndNavigate])

  // Cointegration
  const runCoint = useCallback(() => {
    setTsError(null)
    setTsRunning(true)
    try {
      if (!tsConfig.cointY || !tsConfig.cointX) throw new Error('Pilih kolom Y dan X')
      if (tsConfig.cointY === tsConfig.cointX) throw new Error('Y dan X harus berbeda')
      const y = getColumnData(tsConfig.cointY)
      const x = getColumnData(tsConfig.cointX)
      const r = engleGrangerCointegrationAdapter(y, x, tsOpts)
      toast.success('Cointegration selesai')
      persistAndNavigate({
        _type: 'timeseries',
        data, columns, fileName, tsConfig,
        tsResults: { adf: [], granger: null, cointegration: { pair: { y: tsConfig.cointY, x: tsConfig.cointX }, ...r } },
        analyzedAt: stamp(),
      })
    } catch (err) {
      setTsError(err.message)
      toast.error(err.message)
    } finally {
      setTsRunning(false)
    }
  }, [tsConfig, tsOpts, getColumnData, data, columns, fileName, persistAndNavigate])

  const handleTsRun = useCallback(() => {
    if (tsConfig.tsTest === 'adf') runADF()
    else if (tsConfig.tsTest === 'granger') runGranger()
    else if (tsConfig.tsTest === 'cointegration') runCoint()
  }, [tsConfig.tsTest, runADF, runGranger, runCoint])

  // ============================================================
  // Render
  // ============================================================
  const hasData = !!data

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title="Analisis EViews"
        subtitle="Panel Estimation · Time Series"
        breadcrumbs={[
          { path: '/', label: 'Beranda' },
          { path: '/eviews', label: 'EViews' },
        ]}
      />

      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-4 space-y-4 pb-bottomnav">
        {/* ─── Shared Upload ─── */}
        {!hasData ? (
          <label
            className="block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors active:scale-95"
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
                className="text-xs flex items-center gap-1 hover:text-red-500 transition-colors active:scale-95"
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
                { id: 'timeseries', label: 'Time Series', icon: TrendingUp },
              ].map(tab => {
                const Icon = tab.icon
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold transition-colors active:scale-95"
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

            {/* Tab descriptions */}
            {activeTab === 'estimasi' && (
              <div className="px-1 pt-3 pb-1">
                <h4 className="text-sm font-semibold text-fg mb-1">Estimasi Panel Data</h4>
                <p className="text-xs text-muted leading-relaxed">
                  Cocok untuk data dengan struktur cross-section + time (misal: 30 provinsi × 10 tahun).
                  Pilih entitas (ID), waktu, variabel Y dan X, lalu pilih metode estimasi.
                  Hasil — termasuk uji Hausman & diagnostik (Breusch-Pagan, White, Wooldridge) — tampil di halaman hasil.
                </p>
              </div>
            )}
            {activeTab === 'timeseries' && (
              <div className="px-1 pt-3 pb-1">
                <h4 className="text-sm font-semibold text-fg mb-1">Time Series Analysis</h4>
                <p className="text-xs text-muted leading-relaxed">
                  Untuk data deret waktu (misal: GDP bulanan, harga saham harian).
                  <strong> ADF</strong> — uji stasioneritas (unit root),
                  <strong> Granger</strong> — uji kausalitas antar variabel,
                  <strong> Cointegration</strong> — uji hubungan jangka panjang.
                  Hasil tampil di halaman hasil.
                </p>
              </div>
            )}

            <div className="p-4">
              {/* ═══════════ TAB 1: ESTIMASI ═══════════ */}
              {activeTab === 'estimasi' && (
                <div className="space-y-4">
                  <PanelConfig columns={columns} onEstimate={handleEstimate} loading={estLoading} />
                </div>
              )}

              {/* ═══════════ TAB 2: TIME SERIES ═══════════ */}
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
                            className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors active:scale-95"
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
                      { id: 'adf', label: 'ADF Unit Root', desc: 'Uji stasioneritas — apakah data punya tren/unit root?', icon: TrendingUp },
                      { id: 'granger', label: 'Granger', desc: 'Uji kausalitas — apakah X bisa prediksi Y di masa depan?', icon: ArrowRightLeft },
                      { id: 'cointegration', label: 'Cointegration', desc: 'Uji hubungan jangka panjang — apakah X dan Y bergerak bersama?', icon: Link2 },
                    ].map(tab => {
                      const Icon = tab.icon
                      const active = tsConfig.tsTest === tab.id
                      return (
                        <button
                          key={tab.id}
                          onClick={() => updateTsConfig({ tsTest: tab.id })}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold transition-colors active:scale-95"
                          style={{
                            borderBottom: active ? '2px solid rgb(var(--accent))' : '2px solid transparent',
                            color: active ? 'rgb(var(--accent))' : 'rgb(var(--muted))',
                            backgroundColor: active ? 'rgb(var(--accent) / 0.04)' : 'transparent',
                          }}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="hidden sm:inline">{tab.label}</span>
                          <span className="ml-1 opacity-60 cursor-help hidden sm:inline" title={tab.desc}>ⓘ</span>
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
                              className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors active:scale-95"
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
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

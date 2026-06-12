// TimeSeries.jsx — Time Series Analysis Page
// ADF Unit Root, Granger Causality, Engle-Granger Cointegration

import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Upload, Play, FileSpreadsheet,
  AlertTriangle, CheckCircle, Settings2,
  ArrowRightLeft, Link2,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Button } from '../components/ui/Button'
import {
  ADFResultCard,
  GrangerResultCard,
  CointegrationResultCard,
  LagInfoCard,
} from '../components/timeseries'
import {
  adfTestAdapter,
  grangerCausalityAdapter,
  engleGrangerCointegrationAdapter,
} from '../lib/statistics/uiAdapters'
import { toast } from '../lib/toast'

// ============================================================
// CSV Parser (matches Statistik page pattern)
// ============================================================
function parseCSV(text) {
  if (!text || !text.trim()) return { headers: [], rows: [] }
  const lines = text.trim().split('\n').map(l => l.split(',').map(c => c.trim()))
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0]
  const rows = lines.slice(1).filter(r => r.length === headers.length && r.some(c => c !== ''))
  return { headers, rows }
}

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
export default function TimeSeriesPage() {
  const navigate = useNavigate()

  // State
  const [csvText, setCsvText] = useState(SAMPLE_CSV)
  const [dateColumn, setDateColumn] = useState('')
  const [frequency, setFrequency] = useState('Bulanan')
  const [selectedCols, setSelectedCols] = useState([])
  const [deterministic, setDeterministic] = useState('constant')
  const [maxLagInput, setMaxLagInput] = useState('auto')
  const [activeTab, setActiveTab] = useState('adf')

  // ADF
  const [adfColumns, setAdfColumns] = useState([])

  // Granger
  const [grangerX, setGrangerX] = useState('')
  const [grangerY, setGrangerY] = useState('')
  const [runAllPairs, setRunAllPairs] = useState(false)

  // Cointegration
  const [cointY, setCointY] = useState('')
  const [cointX, setCointX] = useState('')

  // Significance
  const [significance, setSignificance] = useState(0.05)

  // Results
  const [adfResults, setAdfResults] = useState([])
  const [grangerResults, setGrangerResults] = useState(null)
  const [cointResult, setCointResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)

  // Parse data
  const parsed = useMemo(() => parseCSV(csvText), [csvText])

  // Auto-detect date column
  useMemo(() => {
    if (!dateColumn && parsed.headers.length > 0) {
      const dateKeywords = ['date', 'time', 'tanggal', 'periode', 'period', 'year', 'month', 'quarter']
      const found = parsed.headers.find(h =>
        dateKeywords.some(k => h.toLowerCase().includes(k))
      )
      if (found) setDateColumn(found)
    }
  }, [parsed.headers, dateColumn])

  // Numeric columns
  const numericColumns = useMemo(() => {
    return parsed.headers.filter(h => {
      if (h === dateColumn) return false
      const vals = parsed.rows.slice(0, 50).map(r => Number(r[parsed.headers.indexOf(h)]))
      const numeric = vals.filter(v => !isNaN(v) && v !== 0)
      return numeric.length / Math.max(vals.length, 1) > 0.5
    })
  }, [parsed, dateColumn])

  // Auto-select numeric columns
  useMemo(() => {
    if (selectedCols.length === 0 && numericColumns.length > 0) {
      setSelectedCols(numericColumns.slice())
    }
  }, [numericColumns])

  // Auto-select ADF columns
  useMemo(() => {
    if (adfColumns.length === 0 && numericColumns.length > 0) {
      setAdfColumns(numericColumns.slice())
    }
  }, [numericColumns])

  // Helper: get column data as number array
  const getColumnData = useCallback((colName) => {
    const idx = parsed.headers.indexOf(colName)
    return parsed.rows.map(r => Number(r[idx]))
  }, [parsed])

  // ============================================================
  // Handlers
  // ============================================================
  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCsvText(String(ev.target.result || ''))
      toast.info(`File "${f.name}" dimuat`)
    }
    reader.readAsText(f)
    e.target.value = ''
  }

  const toggleCol = (col) => {
    setSelectedCols(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    )
  }

  const toggleAdfCol = (col) => {
    setAdfColumns(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    )
  }

  const opts = useMemo(() => ({
    deterministic,
    maxLags: maxLagInput === 'auto' ? 'auto' : parseInt(maxLagInput, 10),
  }), [deterministic, maxLagInput])

  // ============================================================
  // Run ADF
  // ============================================================
  const runADFTests = useCallback(() => {
    setError(null)
    setRunning(true)
    setAdfResults([])
    try {
      const cols = adfColumns.length > 0 ? adfColumns : selectedCols
      if (cols.length === 0) throw new Error('Pilih minimal satu kolom')

      const results = cols.map(col => {
        const series = getColumnData(col)
        const r = adfTestAdapter(series, opts)
        return { variable: col, ...r }
      })

      setAdfResults(results)
      toast.success(`ADF selesai — ${results.length} variabel`)
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setRunning(false)
    }
  }, [adfColumns, selectedCols, getColumnData, opts])

  // ============================================================
  // Run Granger
  // ============================================================
  const runGrangerTest = useCallback(() => {
    setError(null)
    setRunning(true)
    setGrangerResults(null)
    try {
      const grangerOpts = { maxLags: opts.maxLags, method: 'AIC' }

      if (runAllPairs) {
        const cols = selectedCols.length > 0 ? selectedCols : numericColumns
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
        const adjustedAlpha = significance / nPairs
        const warnings = nPairs > 1
          ? [`Multiple testing: ${nPairs} pairs. Bonferroni-adjusted α = ${adjustedAlpha.toFixed(4)}`]
          : []

        setGrangerResults({ pairs, warnings, nPairs, adjustedAlpha })
        toast.success(`Granger selesai — ${pairs.length} pasangan`)
      } else {
        if (!grangerX || !grangerY) throw new Error('Pilih kolom X dan Y')
        if (grangerX === grangerY) throw new Error('X dan Y harus berbeda')
        const x = getColumnData(grangerX)
        const y = getColumnData(grangerY)
        const r = grangerCausalityAdapter(y, x, grangerOpts)
        setGrangerResults({ pairs: [{ x: grangerX, y: grangerY, ...r }], warnings: [] })
        toast.success('Granger selesai')
      }
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setRunning(false)
    }
  }, [runAllPairs, grangerX, grangerY, selectedCols, numericColumns, getColumnData, opts, significance])

  // ============================================================
  // Run Cointegration
  // ============================================================
  const runCointTest = useCallback(() => {
    setError(null)
    setRunning(true)
    setCointResult(null)
    try {
      if (!cointY || !cointX) throw new Error('Pilih kolom Y dan X')
      if (cointY === cointX) throw new Error('Y dan X harus berbeda')

      const y = getColumnData(cointY)
      const x = getColumnData(cointX)
      const r = engleGrangerCointegrationAdapter(y, x, opts)
      setCointResult({ pair: { y: cointY, x: cointX }, ...r })
      toast.success('Cointegration selesai')
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setRunning(false)
    }
  }, [cointY, cointX, getColumnData, opts])

  // Run appropriate test
  const handleRun = useCallback(() => {
    if (activeTab === 'adf') runADFTests()
    else if (activeTab === 'granger') runGrangerTest()
    else if (activeTab === 'cointegration') runCointTest()
  }, [activeTab, runADFTests, runGrangerTest, runCointTest])

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title="Time Series Analysis"
        subtitle="Unit Root · Granger Causality · Cointegration"
        breadcrumbs={[
          { path: '/', label: 'Beranda' },
          { path: '/panel-data', label: 'Panel Data' },
          { path: '/time-series', label: 'Time Series' },
        ]}
      />

      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-4 space-y-4 pb-bottomnav">
        {/* ─── Upload ─── */}
        <div
          className="border rounded-xl p-4"
          style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--card))' }}
        >
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgb(var(--fg))' }}>
            <Upload className="w-4 h-4" style={{ color: 'rgb(var(--accent))' }} />
            Unggah Dataset
          </h2>

          <div
            className="relative block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-accent/30 transition-colors"
            style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--surface))' }}
          >
            <FileSpreadsheet className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgb(var(--muted) / 0.4)' }} />
            <p className="text-xs font-medium" style={{ color: 'rgb(var(--muted))' }}>
              Klik atau seret file CSV / Excel
            </p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              onChange={handleFile}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Upload dataset"
            />
          </div>

          <div className="mt-3 flex items-center justify-center gap-4 text-xs" style={{ color: 'rgb(var(--muted))' }}>
            <span>Belum punya data?</span>
            <button
              onClick={() => { setCsvText(SAMPLE_CSV); toast.info('Sample data dimuat') }}
              className="font-medium hover:underline"
              style={{ color: 'rgb(var(--accent))' }}
            >
              Pakai Contoh Data
            </button>
          </div>

          {/* Preview */}
          {parsed.headers.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    {parsed.headers.map((h, i) => (
                      <th
                        key={i}
                        className="px-2 py-1.5 text-left font-semibold border-b"
                        style={{
                          color: 'rgb(var(--fg))',
                          backgroundColor: 'rgb(var(--table-head))',
                          borderColor: 'rgb(var(--border))',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 5).map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className="px-2 py-1 border-b"
                          style={{ borderColor: 'rgb(var(--border) / 0.5)', color: 'rgb(var(--fg))' }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {parsed.rows.length > 5 && (
                    <tr>
                      <td
                        colSpan={parsed.headers.length}
                        className="px-2 py-1 text-center italic"
                        style={{ color: 'rgb(var(--muted))' }}
                      >
                        … {parsed.rows.length - 5} baris lagi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Configuration ─── */}
        <div
          className="border rounded-xl p-4"
          style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--card))' }}
        >
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgb(var(--fg))' }}>
            <Settings2 className="w-4 h-4" style={{ color: 'rgb(var(--accent))' }} />
            Konfigurasi
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>
                Kolom Date/Time
              </label>
              <select
                value={dateColumn}
                onChange={(e) => setDateColumn(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--input))', color: 'rgb(var(--fg))' }}
              >
                <option value="">— Pilih —</option>
                {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>
                Frekuensi
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--input))', color: 'rgb(var(--fg))' }}
              >
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* Numeric columns multi-select */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: 'rgb(var(--muted))' }}>
                Kolom Numerik
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCols(numericColumns.slice())}
                  className="text-[10px] font-medium hover:underline"
                  style={{ color: 'rgb(var(--accent))' }}
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedCols([])}
                  className="text-[10px] font-medium hover:underline"
                  style={{ color: 'rgb(var(--muted))' }}
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {numericColumns.map(col => {
                const active = selectedCols.includes(col)
                return (
                  <button
                    key={col}
                    onClick={() => toggleCol(col)}
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
              {numericColumns.length === 0 && (
                <span className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                  Upload data untuk memilih kolom
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ─── Test Selection (Tabs) ─── */}
        <div
          className="border rounded-xl overflow-hidden"
          style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--card))' }}
        >
          <div className="flex border-b" style={{ borderColor: 'rgb(var(--border))' }}>
            {[
              { id: 'adf', label: 'ADF Unit Root', icon: TrendingUp },
              { id: 'granger', label: 'Granger Causality', icon: ArrowRightLeft },
              { id: 'cointegration', label: 'Cointegration', icon: Link2 },
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
            {/* ADF Tab */}
            {activeTab === 'adf' && (
              <div>
                <p className="text-xs mb-3" style={{ color: 'rgb(var(--muted))' }}>
                  ADF test akan dijalankan pada semua kolom yang dipilih secara otomatis.
                </p>
                <div className="flex flex-wrap gap-2">
                  {numericColumns.map(col => {
                    const active = adfColumns.includes(col)
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

            {/* Granger Tab */}
            {activeTab === 'granger' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>
                      X (Explanatory)
                    </label>
                    <select
                      value={grangerX}
                      onChange={(e) => setGrangerX(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--input))', color: 'rgb(var(--fg))' }}
                      disabled={runAllPairs}
                    >
                      <option value="">— Pilih X —</option>
                      {numericColumns.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>
                      Y (Dependent)
                    </label>
                    <select
                      value={grangerY}
                      onChange={(e) => setGrangerY(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--input))', color: 'rgb(var(--fg))' }}
                      disabled={runAllPairs}
                    >
                      <option value="">— Pilih Y —</option>
                      {numericColumns.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={runAllPairs}
                    onChange={(e) => setRunAllPairs(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs font-medium" style={{ color: 'rgb(var(--fg))' }}>
                    Run all pairs
                  </span>
                </label>

                {runAllPairs && (
                  <div
                    className="flex items-center gap-2 text-xs p-2 rounded-lg"
                    style={{ backgroundColor: 'rgb(251 191 36 / 0.08)', color: 'rgb(180 83 9)' }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    Multiple testing: akan menjalankan Bonferroni correction
                  </div>
                )}
              </div>
            )}

            {/* Cointegration Tab */}
            {activeTab === 'cointegration' && (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                  Engle-Granger bivariate cointegration test.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>
                      Y (Dependent)
                    </label>
                    <select
                      value={cointY}
                      onChange={(e) => setCointY(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--input))', color: 'rgb(var(--fg))' }}
                    >
                      <option value="">— Pilih Y —</option>
                      {numericColumns.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>
                      X (Explanatory)
                    </label>
                    <select
                      value={cointX}
                      onChange={(e) => setCointX(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--input))', color: 'rgb(var(--fg))' }}
                    >
                      <option value="">— Pilih X —</option>
                      {numericColumns.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Options Panel ─── */}
        <div
          className="border rounded-xl p-4"
          style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--card))' }}
        >
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgb(var(--fg))' }}>
            <Settings2 className="w-4 h-4" style={{ color: 'rgb(var(--muted))' }} />
            Options
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>
                Significance Level
              </label>
              <select
                value={significance}
                onChange={(e) => setSignificance(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg border text-xs"
                style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--input))', color: 'rgb(var(--fg))' }}
              >
                <option value={0.01}>1%</option>
                <option value={0.05}>5%</option>
                <option value={0.10}>10%</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>
                Deterministic
              </label>
              <select
                value={deterministic}
                onChange={(e) => setDeterministic(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border text-xs"
                style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--input))', color: 'rgb(var(--fg))' }}
              >
                {DETERMINISTICS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>
                Max Lags
              </label>
              <input
                type="text"
                value={maxLagInput}
                onChange={(e) => setMaxLagInput(e.target.value)}
                placeholder="auto"
                className="w-full px-2 py-1.5 rounded-lg border text-xs"
                style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--input))', color: 'rgb(var(--fg))' }}
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-medium block mb-1" style={{ color: 'rgb(var(--muted))' }}>
                Lag Method
              </label>
              <select
                disabled
                className="w-full px-2 py-1.5 rounded-lg border text-xs"
                style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--surface))', color: 'rgb(var(--muted))' }}
              >
                <option>AIC</option>
              </select>
            </div>
          </div>
        </div>

        {/* ─── Run Button ─── */}
        <Button
          onClick={handleRun}
          disabled={running || parsed.rows.length === 0}
          className="w-full"
          size="lg"
        >
          {running ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running {activeTab.toUpperCase()}…
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run {activeTab === 'adf' ? 'ADF Test' : activeTab === 'granger' ? 'Granger Test' : 'Cointegration Test'}
            </>
          )}
        </Button>

        {/* Error */}
        {error && (
          <div
            className="p-3 rounded-lg border flex items-center gap-2 text-sm"
            style={{ borderColor: 'rgb(239 68 68 / 0.3)', backgroundColor: 'rgb(239 68 68 / 0.05)', color: 'rgb(239 68 68)' }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ─── Results ─── */}

        {/* ADF */}
        {activeTab === 'adf' && adfResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--fg))' }}>
              <TrendingUp className="w-4 h-4" style={{ color: 'rgb(var(--accent))' }} />
              ADF Results ({adfResults.length} variabel)
            </h3>
            {adfResults.map((r, i) => (
              r.error ? (
                <div
                  key={i}
                  className="p-3 rounded-lg border text-xs"
                  style={{ borderColor: 'rgb(239 68 68 / 0.3)', backgroundColor: 'rgb(239 68 68 / 0.05)', color: 'rgb(239 68 68)' }}
                >
                  {r.variable}: {r.error}
                </div>
              ) : (
                <ADFResultCard key={i} result={r} />
              )
            ))}
            <LagInfoCard
              lagInfo={{ lags: adfResults[0]?.lags, method: 'AIC' }}
              title="Lag Selection Info"
            />
          </div>
        )}

        {/* Granger */}
        {activeTab === 'granger' && grangerResults && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--fg))' }}>
              <ArrowRightLeft className="w-4 h-4" style={{ color: 'rgb(var(--accent))' }} />
              Granger Causality Results ({grangerResults.pairs.length} pasangan)
            </h3>
            {grangerResults.warnings?.map((w, i) => (
              <div
                key={i}
                className="p-3 rounded-lg border flex items-center gap-2 text-xs"
                style={{ borderColor: 'rgb(251 191 36 / 0.3)', backgroundColor: 'rgb(251 191 36 / 0.05)', color: 'rgb(180 83 9)' }}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {w}
              </div>
            ))}
            {grangerResults.pairs.map((r, i) => (
              <GrangerResultCard key={i} result={{ ...r, xLabel: r.x, yLabel: r.y }} />
            ))}
          </div>
        )}

        {/* Cointegration */}
        {activeTab === 'cointegration' && cointResult && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--fg))' }}>
              <Link2 className="w-4 h-4" style={{ color: 'rgb(var(--accent))' }} />
              Cointegration Result
            </h3>
            <CointegrationResultCard result={{ ...cointResult, yLabel: cointResult.pair?.y, xLabel: cointResult.pair?.x }} />
          </div>
        )}

        {/* Back link */}
        <div className="text-center text-xs pt-4 pb-8" style={{ color: 'rgb(var(--muted))' }}>
          <a href="/panel-data" className="hover:underline font-medium" style={{ color: 'rgb(var(--accent))' }}>
            ← Kembali ke Panel Data
          </a>
        </div>
      </div>
    </div>
  )
}

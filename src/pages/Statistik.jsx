import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  BarChart3, Upload, FileSpreadsheet, CheckCircle,
  Sparkles, Download, FileType, File as FileIcon, AlertCircle,
  Layers, Sigma, Clock, FileText, BookOpen, X,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import { getCurrentUser } from '../lib/auth'
import { getWallet, deductWallet } from '../lib/wallet'
import { calculateStatisticsPrice, getStatisticsPriceWithDiscount, formatIDR } from '../lib/pricing'
import PriceDisplay from '../components/PriceDisplay'
import { saveOrder, generateOrderId } from '../lib/orders'
import ConfirmPaymentModal from '../components/ConfirmPaymentModal'
import { Histogram, QQPlot, ScatterPlot, BoxPlot, ChartGrid } from '../components/charts/StatCharts'
import { toast } from '../lib/toast'
import { generateInterpretation } from '../lib/ai/interpretStats'
import { saveAnalysis } from '../lib/savedAnalyses'
import DataCleanerModal from '../components/DataCleanerModal'
import ExampleDatasetPicker from '../components/ExampleDatasetPicker'
import MethodologyPanel from '../components/MethodologyPanel'
import StatTooltip from '../components/StatTooltip'
import Modal from '../components/Modal'
import AssumptionsPanel from '../components/AssumptionsPanel'
import PageHeader from '../components/PageHeader'
import { datasetToParsed } from '../lib/exampleDatasets'
import {
  describe, formatDescriptive,
  testNormality,
  pearsonCorrelation, spearmanCorrelation,
  cronbachAlpha, itemValidity,
  oneSampleTTest, independentTTest, pairedTTest,
  oneWayANOVA,
  twoWayANOVA,
  simpleLinearRegression, multipleLinearRegression,
  mannWhitneyU, wilcoxonSignedRank, kruskalWallis,
  analyzeNGain,
  chiSquareIndependence,
} from '../lib/stats'

// ============================================================
// Tools registry — single source of truth
// ============================================================
const tools = [
  { id: 'deskriptif',   name: 'Statistik Deskriptif', desc: 'Mean, Median, SD, Varians, Skewness, Kurtosis', tier: 'dasar' },
  { id: 'normalitas',   name: 'Uji Normalitas',        desc: 'Shapiro-Wilk / Kolmogorov-Smirnov',           tier: 'dasar' },
  { id: 'korelasi',     name: 'Korelasi',              desc: 'Pearson & Spearman',                           tier: 'dasar' },
  { id: 'ttest',        name: 'T-Test',                desc: '1-sample, Independent, Paired',                tier: 'dasar' },
  { id: 'validitas',    name: 'Validitas & Reliabilitas', desc: 'Pearson item-total + Cronbach α',          tier: 'menengah' },
  { id: 'anova',        name: 'One-way ANOVA',         desc: 'F-test + post-hoc + η²',                       tier: 'menengah' },
  { id: 'twowayanova',  name: 'Two-way ANOVA',         desc: 'Faktorial 2 faktor + interaksi',                tier: 'lanjutan' },
  { id: 'regresi',      name: 'Regresi Sederhana',     desc: '1 predictor → 1 outcome',                      tier: 'menengah' },
  { id: 'regresiganda', name: 'Regresi Berganda',      desc: 'Multi predictor + VIF',                        tier: 'lanjutan' },
  { id: 'chisquare',    name: 'Chi-Square',            desc: 'Uji independensi 2 variabel kategorik',         tier: 'menengah' },
  { id: 'mannwhitney',  name: 'Mann-Whitney U',        desc: 'Non-parametrik 2 grup independen',              tier: 'menengah' },
  { id: 'wilcoxon',     name: 'Wilcoxon Signed-Rank',  desc: 'Non-parametrik berpasangan',                    tier: 'menengah' },
  { id: 'kruskal',      name: 'Kruskal-Wallis',        desc: 'Non-parametrik ≥3 grup',                        tier: 'menengah' },
  { id: 'ngain',        name: 'Uji N-Gain (Hake)',     desc: 'Efektivitas pre-test → post-test (skripsi pendidikan)', tier: 'menengah' },
]

// Detect column type heuristic
const isNumericColumn = (data, col) => {
  const vals = (data[col] || []).slice(0, 50)
  const numeric = vals.filter(v => typeof v === 'number' && !isNaN(v))
  return numeric.length / Math.max(vals.length, 1) > 0.7
}

// ============================================================
// Main Component
// ============================================================
function Statistik() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const activeTool = searchParams.get('tool') || 'deskriptif'

  // Auto-redirect ke onboarding kalau new user (tidak punya flag di localStorage)
  // Skip kalau ada query param (mis. dari onboarding sendiri yang mengarahkan dengan ?tool=...)
  useEffect(() => {
    const hasOnboarded = localStorage.getItem('statistik_onboarded') === '1'
    const hasParams = searchParams.toString().length > 0
    const hasHandoff = !!sessionStorage.getItem('kuesioner_handoff_csv')
    if (!hasOnboarded && !hasParams && !hasHandoff) {
      navigate('/statistik/start', { replace: true })
    }
  }, [])

  const [file, setFile] = useState(null)
  const [data, setData] = useState(null)
  const [columns, setColumns] = useState([])
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // Per-tool params (selected columns, modes, etc.)
  const [params, setParams] = useState({})

  // Row filter (subset data berdasarkan kolom kategorik)
  const [filterColumn, setFilterColumn] = useState('')
  const [filterValues, setFilterValues] = useState([])
  const [showGuide, setShowGuide] = useState(false)
  const [cleanerOpen, setCleanerOpen] = useState(false)
  const [cleaningReport, setCleaningReport] = useState(null)
  const [examplePickerOpen, setExamplePickerOpen] = useState(false)

  // Reset params/result/error when tool changes
  useEffect(() => {
    setParams({})
    setResult(null)
    setError(null)
  }, [activeTool])

  const currentTool = tools.find(t => t.id === activeTool)

  // Apply filter ke data
  const filteredData = useMemo(() => {
    if (!data) return null
    if (!filterColumn || !filterValues.length) return data
    const colData = data[filterColumn]
    const keepIdx = []
    colData.forEach((v, i) => {
      if (filterValues.includes(String(v))) keepIdx.push(i)
    })
    const out = {}
    columns.forEach(c => { out[c] = keepIdx.map(i => data[c][i]) })
    return out
  }, [data, columns, filterColumn, filterValues])

  const sampleSize = filteredData && columns[0] ? (filteredData[columns[0]]?.length || 0) : 0
  const rawSampleSize = data && columns[0] ? (data[columns[0]]?.length || 0) : 0
  const pricing = getStatisticsPriceWithDiscount(activeTool, sampleSize)

  const numericColumns = useMemo(
    () => filteredData ? columns.filter(c => isNumericColumn(filteredData, c)) : [],
    [filteredData, columns]
  )

  // Detect categorical columns (untuk filter dropdown).
  // Definisi: kolom yang BUKAN numerik (text-based) DAN punya >1 unique values.
  // Hindari false-positive untuk kolom numerik diskrit (umur, total, skor).
  const categoricalColumns = useMemo(() => {
    if (!data) return []
    return columns.filter(c => {
      if (isNumericColumn(data, c)) return false  // skip numerik
      const vals = data[c] || []
      const unique = new Set(vals.map(v => String(v)).filter(v => v !== '' && v !== 'null'))
      return unique.size > 1 && unique.size <= 50
    })
  }, [data, columns])

  const filterUniqueValues = useMemo(() => {
    if (!data || !filterColumn) return []
    const vals = data[filterColumn] || []
    return Array.from(new Set(vals.map(v => String(v)))).sort()
  }, [data, filterColumn])

  // ============================================================
  // File upload
  // ============================================================
  const handleFileUpload = useCallback((e) => {
    const uploadedFile = e.target.files[0]
    if (!uploadedFile) return
    setFile(uploadedFile)
    setResult(null)
    setError(null)
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const wb = XLSX.read(event.target.result, { type: 'binary' })
        if (!wb.SheetNames.length) throw new Error('File tidak punya sheet')
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { defval: null })
        if (!json.length) throw new Error('File kosong (tidak ada baris data)')

        // Bersihkan & trim header — buang header yang kosong
        const rawHeaders = Object.keys(json[0])
        const headers = rawHeaders
          .map(h => String(h).trim())
          .filter(h => h !== '' && h !== '__EMPTY' && !h.startsWith('Unnamed:'))
        if (!headers.length) throw new Error('File tidak punya header yang valid')

        // Cek duplikat header
        const seen = new Set()
        const dupes = headers.filter(h => seen.has(h) || (seen.add(h), false))
        if (dupes.length) throw new Error(`Header duplikat: ${dupes.join(', ')}. Beri nama kolom yang unik.`)

        const parsed = {}
        headers.forEach((h, idx) => {
          const origKey = rawHeaders[idx] // tetap pakai key asli untuk akses
          parsed[h] = json.map(row => {
            const v = row[origKey]
            if (v === '' || v === null || v === undefined) return null
            if (typeof v === 'string') {
              const trimmed = v.trim()
              if (trimmed === '') return null
              const num = Number(trimmed)
              return isNaN(num) ? trimmed : num
            }
            const num = Number(v)
            return isNaN(num) ? v : num
          })
        })

        // Drop baris yang seluruh nilainya null
        const nRows = json.length
        const keepRowIdx = []
        for (let i = 0; i < nRows; i++) {
          const allNull = headers.every(h => parsed[h][i] === null)
          if (!allNull) keepRowIdx.push(i)
        }
        if (!keepRowIdx.length) throw new Error('Semua baris kosong — tidak ada data untuk dianalisis')

        const cleaned = {}
        headers.forEach(h => { cleaned[h] = keepRowIdx.map(i => parsed[h][i]) })

        setColumns(headers)
        setData(cleaned)
        setFilterColumn('')
        setFilterValues([])
        setCleaningReport(null)
      } catch (err) {
        setError('Gagal parse file: ' + err.message)
        toast.error('Gagal upload: ' + err.message)
      }
    }
    reader.readAsBinaryString(uploadedFile)
  }, [])

  // ============================================================
  // Load example dataset (built-in, no upload required)
  // ============================================================
  const loadExampleDataset = useCallback((dataset) => {
    const parsed = datasetToParsed(dataset)
    setFile({ name: parsed.fileName })
    setColumns(parsed.columns)
    setData(parsed.data)
    setFilterColumn('')
    setFilterValues([])
    setCleaningReport(null)
    setResult(null)
    setError(null)
    if (dataset.recommendedTool) {
      setActiveTool(dataset.recommendedTool)
    }
    if (dataset.recommendedParams) {
      // delay sedikit supaya activeTool effect (yg reset params) berjalan dulu
      setTimeout(() => setParams(dataset.recommendedParams), 0)
    }
    toast.success(`Contoh data dimuat: ${dataset.name}`)
  }, [])

  // ============================================================
  // Handoff dari Kuesioner: parse CSV di sessionStorage → load data
  // ============================================================
  useEffect(() => {
    const csv = sessionStorage.getItem('kuesioner_handoff_csv')
    if (!csv) return
    const name = sessionStorage.getItem('kuesioner_handoff_name') || 'Kuesioner'
    sessionStorage.removeItem('kuesioner_handoff_csv')
    sessionStorage.removeItem('kuesioner_handoff_name')
    try {
      const lines = csv.split(/\r?\n/).filter(l => l.length > 0)
      if (lines.length < 2) { toast.warning('Data kuesioner kosong'); return }
      const parseLine = (line) => {
        const out = []; let cur = '', inQ = false
        for (let i = 0; i < line.length; i++) {
          const c = line[i]
          if (c === '"') {
            if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
            else inQ = !inQ
          } else if (c === ',' && !inQ) { out.push(cur); cur = '' }
          else cur += c
        }
        out.push(cur); return out
      }
      const headers = parseLine(lines[0])
      const rows = lines.slice(1).map(parseLine)
      const cols = {}
      headers.forEach((h, i) => {
        const vals = rows.map(r => {
          const v = r[i]
          if (v === '' || v === undefined) return null
          const n = Number(v)
          return isFinite(n) && /^-?\d+(\.\d+)?$/.test(String(v).trim()) ? n : v
        })
        cols[h] = vals
      })
      setFile({ name: `${name}.csv` })
      setColumns(headers)
      setData(cols)
      setError(null)
      setResult(null)
      // Auto-suggest validitas tool
      navigate('/statistik?tool=validitas', { replace: true })
      toast.success(`Data kuesioner "${name}" dimuat (${rows.length} responden)`)
    } catch (e) {
      toast.error('Gagal parse data kuesioner')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ============================================================
  // Validate params before allow analysis
  // ============================================================
  const validateParams = () => {
    if (!data) return 'Upload data dulu'
    switch (activeTool) {
      case 'deskriptif':
        if (!params.columns?.length) return 'Pilih minimal 1 kolom numerik'
        return null
      case 'normalitas':
        if (!params.columns?.length) return 'Pilih minimal 1 kolom numerik'
        return null
      case 'korelasi':
        if (!params.x || !params.y) return 'Pilih variabel X dan Y'
        if (params.x === params.y) return 'X dan Y harus berbeda'
        return null
      case 'ttest':
        if (!params.mode) return 'Pilih jenis t-test'
        if (params.mode === 'oneSample' && (!params.column1 || params.mu0 === undefined || params.mu0 === '')) return 'Pilih kolom dan masukkan μ₀'
        if (params.mode === 'independent' && (!params.column1 || !params.grouping)) return 'Pilih kolom outcome & grouping'
        if (params.mode === 'paired' && (!params.column1 || !params.column2)) return 'Pilih 2 kolom (sebelum, sesudah)'
        return null
      case 'validitas':
        if (!params.items?.length || params.items.length < 2) return 'Pilih minimal 2 kolom item'
        return null
      case 'anova':
        if (!params.outcome || !params.grouping) return 'Pilih outcome dan grouping variable'
        return null
      case 'twowayanova':
        if (!params.outcome) return 'Pilih variabel outcome (numerik)'
        if (!params.factorA || !params.factorB) return 'Pilih kedua faktor (kategorik)'
        if (params.factorA === params.factorB) return 'Faktor A & B harus kolom berbeda'
        if (params.factorA === params.outcome || params.factorB === params.outcome) return 'Outcome tidak boleh sama dengan faktor'
        return null
      case 'regresi':
        if (!params.x || !params.y) return 'Pilih predictor X dan outcome Y'
        if (params.x === params.y) return 'X dan Y harus berbeda'
        return null
      case 'regresiganda':
        if (!params.predictors?.length || !params.outcome) return 'Pilih predictors dan outcome'
        if (params.predictors.includes(params.outcome)) return 'Outcome tidak boleh ada di predictors'
        return null
      case 'chisquare':
        if (!params.var1 || !params.var2) return 'Pilih 2 variabel kategorik'
        if (params.var1 === params.var2) return 'Variabel harus berbeda'
        return null
      case 'mannwhitney':
        if (!params.outcome || !params.grouping) return 'Pilih outcome (numerik) & grouping (kategorik 2 grup)'
        return null
      case 'wilcoxon':
        if (!params.column1 || !params.column2) return 'Pilih 2 kolom (sebelum, sesudah)'
        if (params.column1 === params.column2) return 'Sebelum & sesudah harus berbeda'
        return null
      case 'kruskal':
        if (!params.outcome || !params.grouping) return 'Pilih outcome (numerik) & grouping (≥3 grup)'
        return null
      case 'ngain':
        if (!params.column1 || !params.column2) return 'Pilih kolom Pre-test & Post-test'
        if (params.column1 === params.column2) return 'Pre-test & Post-test harus kolom berbeda'
        if (!params.maxScore || Number(params.maxScore) <= 0) return 'Skor maksimum harus > 0'
        return null
      default:
        return 'Tool tidak dikenali'
    }
  }

  // ============================================================
  // Run analysis — DISPATCH KE LIB/STATS REAL
  // ============================================================
  const runAnalysis = ({ paidAmount = 0, paymentMethod = 'free' } = {}) => {
    if (!data) return
    setAnalyzing(true)
    setError(null)

    setTimeout(() => {
      try {
        // Pakai data yang sudah difilter (kalau filter aktif). Fallback ke raw data.
        const data = filteredData
        let analysisResult = null

        if (activeTool === 'deskriptif') {
          const stats = params.columns.map(col => {
            const d = describe(data[col])
            if (!d) throw new Error(`Kolom "${col}" tidak punya data numerik valid (semua kosong/NaN). Periksa data atau filter.`)
            return { column: col, values: data[col].filter(v => typeof v === 'number' && !isNaN(v)), ...formatDescriptive(d) }
          })
          analysisResult = { type: 'descriptive', stats }
        }
        else if (activeTool === 'normalitas') {
          const results = params.columns.map(col => {
            const r = testNormality(data[col], 0.05)
            return { column: col, values: data[col].filter(v => typeof v === 'number' && !isNaN(v)), ...r }
          })
          analysisResult = { type: 'normality', results }
        }
        else if (activeTool === 'korelasi') {
          const fn = params.method === 'spearman' ? spearmanCorrelation : pearsonCorrelation
          const r = fn(data[params.x], data[params.y])
          analysisResult = { type: 'correlation', method: params.method || 'pearson', x: params.x, y: params.y, xValues: data[params.x], yValues: data[params.y], ...r }
        }
        else if (activeTool === 'ttest') {
          if (params.mode === 'oneSample') {
            const r = oneSampleTTest(data[params.column1], Number(params.mu0))
            analysisResult = { type: 'ttest', mode: 'oneSample', column: params.column1, values: data[params.column1], mu0: Number(params.mu0), ...r }
          } else if (params.mode === 'paired') {
            const r = pairedTTest(data[params.column1], data[params.column2])
            analysisResult = { type: 'ttest', mode: 'paired', column1: params.column1, column2: params.column2, beforeValues: data[params.column1], afterValues: data[params.column2], ...r }
          } else {
            // independent — split by grouping
            const groupingVals = data[params.grouping]
            const outcome = data[params.column1]
            const groups = {}
            outcome.forEach((v, i) => {
              const g = groupingVals[i]
              if (g === null || g === undefined || g === '') return
              if (!groups[g]) groups[g] = []
              groups[g].push(v)
            })
            const groupKeys = Object.keys(groups)
            if (groupKeys.length !== 2) {
              throw new Error(`Independent t-test butuh 2 grup, ditemukan ${groupKeys.length}: ${groupKeys.join(', ')}`)
            }
            const r = independentTTest(groups[groupKeys[0]], groups[groupKeys[1]])
            analysisResult = {
              type: 'ttest', mode: 'independent',
              outcome: params.column1, grouping: params.grouping,
              groupNames: groupKeys,
              groupValues: groupKeys.map(k => ({ name: k, values: groups[k] })),
              ...r,
            }
          }
        }
        else if (activeTool === 'validitas') {
          const matrix = []
          const n = data[params.items[0]].length
          for (let i = 0; i < n; i++) {
            const row = params.items.map(it => data[it][i])
            matrix.push(row)
          }
          const validity = itemValidity(matrix)
          const reliability = cronbachAlpha(matrix)
          analysisResult = {
            type: 'validity_reliability',
            items: params.items,
            validity, reliability,
          }
        }
        else if (activeTool === 'anova') {
          const groupingVals = data[params.grouping]
          const outcome = data[params.outcome]
          const groups = {}
          outcome.forEach((v, i) => {
            const g = groupingVals[i]
            if (g === null || g === undefined || g === '') return
            if (!groups[g]) groups[g] = []
            groups[g].push(v)
          })
          const groupKeys = Object.keys(groups)
          if (groupKeys.length < 2) throw new Error('Butuh minimal 2 grup')
          const r = oneWayANOVA(groupKeys.map(k => groups[k]), groupKeys)
          analysisResult = { type: 'anova', outcome: params.outcome, grouping: params.grouping,
            groupValues: groupKeys.map(k => ({ name: k, values: groups[k] })), ...r }
        }
        else if (activeTool === 'twowayanova') {
          const r = twoWayANOVA({
            y: data[params.outcome],
            a: data[params.factorA],
            b: data[params.factorB],
            nameA: params.factorA,
            nameB: params.factorB,
          })
          analysisResult = {
            type: 'twowayanova',
            outcome: params.outcome,
            factorAName: params.factorA,
            factorBName: params.factorB,
            ...r,
          }
        }
        else if (activeTool === 'regresi') {
          const r = simpleLinearRegression(data[params.x], data[params.y])
          analysisResult = { type: 'regression_simple', x: params.x, y: params.y, xValues: data[params.x], yValues: data[params.y], ...r }
        }
        else if (activeTool === 'regresiganda') {
          const X = params.predictors.map(p => data[p])
          const r = multipleLinearRegression(X, data[params.outcome], params.predictors)
          analysisResult = { type: 'regression_multiple', predictors: params.predictors, outcome: params.outcome, ...r }
        }
        else if (activeTool === 'chisquare') {
          const r = chiSquareIndependence(data[params.var1], data[params.var2])
          analysisResult = { type: 'chisquare', var1: params.var1, var2: params.var2, ...r }
        }
        else if (activeTool === 'mannwhitney') {
          const groupingVals = data[params.grouping]
          const outcome = data[params.outcome]
          const groups = {}
          outcome.forEach((v, i) => {
            const g = String(groupingVals[i])
            if (g === 'null' || g === 'undefined' || g === '' || typeof v !== 'number') return
            if (!groups[g]) groups[g] = []
            groups[g].push(v)
          })
          const allKeys = Object.keys(groups)
          let g1, g2
          if (allKeys.length === 2) {
            [g1, g2] = allKeys
          } else if (allKeys.length > 2) {
            // Pakai pilihan user
            g1 = params.group1
            g2 = params.group2
            if (!g1 || !g2) throw new Error(`Ada ${allKeys.length} grup (${allKeys.join(', ')}). Pilih 2 grup yang ingin dibandingkan di panel parameter.`)
            if (g1 === g2) throw new Error('Grup 1 dan Grup 2 harus berbeda')
            if (!groups[g1] || !groups[g2]) throw new Error(`Grup tidak ditemukan dalam data`)
          } else {
            throw new Error(`Butuh minimal 2 grup, ditemukan ${allKeys.length}`)
          }
          const r = mannWhitneyU(groups[g1], groups[g2])
          analysisResult = { type: 'mannwhitney', outcome: params.outcome, grouping: params.grouping, groupNames: [g1, g2],
            groupValues: [{ name: g1, values: groups[g1] }, { name: g2, values: groups[g2] }], ...r }
        }
        else if (activeTool === 'wilcoxon') {
          const r = wilcoxonSignedRank(data[params.column1], data[params.column2])
          analysisResult = { type: 'wilcoxon', column1: params.column1, column2: params.column2, beforeValues: data[params.column1], afterValues: data[params.column2], ...r }
        }
        else if (activeTool === 'kruskal') {
          const groupingVals = data[params.grouping]
          const outcome = data[params.outcome]
          const groups = {}
          outcome.forEach((v, i) => {
            const g = groupingVals[i]
            if (g === null || g === undefined || g === '' || typeof v !== 'number') return
            if (!groups[g]) groups[g] = []
            groups[g].push(v)
          })
          const keys = Object.keys(groups)
          if (keys.length < 2) throw new Error('Butuh minimal 2 grup')
          const r = kruskalWallis(keys.map(k => groups[k]), keys)
          analysisResult = { type: 'kruskal', outcome: params.outcome, grouping: params.grouping,
            groupValues: keys.map(k => ({ name: k, values: groups[k] })), ...r }
        }
        else if (activeTool === 'ngain') {
          // Coba ambil kolom nama bila ditentukan, kalau tidak biarkan lib generate "Subjek 1.."
          const names = params.nameColumn ? data[params.nameColumn] : []
          const r = analyzeNGain({
            pre: data[params.column1],
            post: data[params.column2],
            maxScore: Number(params.maxScore),
            names,
          })
          analysisResult = {
            type: 'ngain',
            column1: params.column1,
            column2: params.column2,
            nameColumn: params.nameColumn || null,
            maxScore: Number(params.maxScore),
            ...r,
          }
        }

        if (!analysisResult || analysisResult.error) {
          throw new Error(analysisResult?.error || 'Analisis gagal')
        }

        const finalResult = {
          ...analysisResult,
          tool: activeTool,
          toolName: currentTool?.name,
          sampleSize,
          analyzedAt: new Date().toLocaleString('id-ID'),
        }
        setResult(finalResult)

        // Save order (kalau bukan free / admin)
        if (paidAmount > 0) {
          saveOrder({
            id: generateOrderId(),
            service: 'statistics',
            serviceName: currentTool?.name,
            tier: currentTool?.tier,
            tierName: currentTool?.tier,
            amount: paidAmount,
            status: 'completed',
            paymentMethod,
            userId: getCurrentUser()?.email || 'guest',
            results: finalResult,
            paidAt: Date.now(),
            createdAt: Date.now(),
          })
        }
        toast.success('Analisis selesai!')
      } catch (err) {
        console.error('Analysis error:', err)
        setError(err.message)
        toast.error('Analisis gagal: ' + err.message)
      } finally {
        setAnalyzing(false)
      }
    }, 250)
  }

  const handlePayClick = () => {
    const validationError = validateParams()
    if (validationError) {
      toast.error(validationError)
      return
    }
    const user = getCurrentUser()
    if (!user) {
      localStorage.setItem('pending_statistik', JSON.stringify({ activeTool, params }))
      toast.warning(pricing.betaFree ? 'Silakan login dulu untuk menggunakan beta gratis' : 'Silakan login dulu untuk melanjutkan', {
        action: 'Login sekarang',
        onAction: () => navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search)),
        duration: 6000,
      })
      return
    }
    setError(null)
    setShowConfirm(true)
  }

  const handleConfirmPay = () => {
    setConfirmLoading(true)
    if (pricing.price === 0) {
      setShowConfirm(false)
      setConfirmLoading(false)
      toast.success('Beta gratis aktif. Menganalisis...')
      runAnalysis({ paidAmount: 0, paymentMethod: pricing.betaFree ? 'beta_free' : 'free' })
      return
    }
    const r = deductWallet(pricing.price)
    if (!r.success) {
      toast.error(r.error || 'Gagal memotong saldo')
      setConfirmLoading(false)
      setShowConfirm(false)
      return
    }
    setShowConfirm(false)
    setConfirmLoading(false)
    toast.success(`Pembayaran ${formatIDR(pricing.price)} berhasil. Menganalisis...`)
    runAnalysis({ paidAmount: pricing.price, paymentMethod: 'wallet' })
  }

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="min-h-screen bg-pattern pb-bottomnav">
      <PageHeader
        title={currentTool?.name || 'Analisis Statistik'}
        subtitle="Modul Statistik"
        parentPath="/"
        parentLabel="Beranda"
        subNav={[
          { path: '/statistik',         label: 'Analisis', icon: BarChart3 },
          { path: '/statistik/batch',   label: 'Batch',    icon: Layers },
          { path: '/statistik/power',   label: 'Power',    icon: Sigma },
          { path: '/statistik/history', label: 'Riwayat',  icon: Clock },
          { path: '/statistik/report',  label: 'Bab IV',   icon: FileText },
          { path: '/statistik/start',   label: 'Panduan',  icon: BookOpen },
        ]}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-5 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Sidebar tools */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-4 sticky top-24">
              <h3 className="font-semibold text-gray-800 mb-4">Pilih Analisis</h3>
              <div className="space-y-1.5">
                {tools.map(tool => (
                  <a key={tool.id} href={'/statistik?tool=' + tool.id}
                    className={'block p-3 rounded-xl transition-all ' + (activeTool === tool.id
                      ? 'bg-sky-100 text-sky-700 border border-sky-200'
                      : 'hover:bg-gray-50 text-gray-600')}>
                    <div className="font-medium text-sm">{tool.name}</div>
                    <div className="text-xs text-gray-400">{tool.desc}</div>
                    <div className="text-xs mt-0.5 flex items-center gap-1">
                      <PriceDisplay price={calculateStatisticsPrice(tool.id).price} size="sm" inline showBadge />
                      <span className="text-gray-400">· {tool.tier}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Main panel */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">{currentTool?.name}</h1>
              <p className="text-gray-600">{currentTool?.desc}</p>
              <div className="mt-2 inline-flex items-center gap-2">
                <span className="text-sm text-gray-600">Harga:</span>
                <PriceDisplay price={pricing.original || pricing.price} size="md" inline showBadge />
              </div>
            </div>

            {/* Upload */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  <Upload className="w-5 h-5 inline mr-2" />Upload Data
                </h2>
                <button onClick={() => setShowGuide(true)}
                  className="text-sm text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Panduan Format Data
                </button>
              </div>
              <label className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center cursor-pointer hover:border-sky-300 bg-gray-50">
                <FileSpreadsheet className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-600 font-medium">Klik untuk upload file</p>
                <p className="text-gray-400 text-sm">Format: .xlsx, .xls, .csv</p>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
              </label>
              {!file && (
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <span>Belum punya data?</span>
                  <button onClick={() => setExamplePickerOpen(true)}
                          className="text-sky-600 hover:text-sky-700 font-medium inline-flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Pakai Contoh Data
                  </button>
                </div>
              )}
              {file && (
                <div className="mt-4 border-2 border-green-200 bg-green-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {sampleSize === rawSampleSize
                          ? `${sampleSize} baris · ${columns.length} variabel · ${numericColumns.length} numerik`
                          : `${sampleSize} dari ${rawSampleSize} baris (filter aktif) · ${columns.length} variabel · ${numericColumns.length} numerik`}
                      </p>
                    </div>
                    <button onClick={() => setCleanerOpen(true)}
                      className="text-xs font-medium px-3 py-2 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 whitespace-nowrap">
                      Bersihkan Data
                    </button>
                  </div>
                  {cleaningReport && cleaningReport.actions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-200 text-xs text-gray-700">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Cleaning aktif:</span>{' '}
                      <span>{cleaningReport.dropped} drop, {cleaningReport.filled} filled, {cleaningReport.clipped} clipped, {cleaningReport.duplicatesRemoved} dup removed</span>
                    </div>
                  )}
                </div>
              )}
              {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
            </div>

            {/* Filter panel — pilih subset data berdasarkan kategori */}
            {data && categoricalColumns.length > 0 && (
              <FilterPanel
                categoricalColumns={categoricalColumns}
                filterColumn={filterColumn}
                setFilterColumn={(c) => { setFilterColumn(c); setFilterValues([]) }}
                filterValues={filterValues}
                setFilterValues={setFilterValues}
                uniqueValues={filterUniqueValues}
                rawSampleSize={rawSampleSize}
                filteredSize={sampleSize}
              />
            )}

            {/* Tool-specific params */}
            {data && (
              <ParamPanel
                tool={activeTool}
                columns={columns}
                numericColumns={numericColumns}
                categoricalColumns={categoricalColumns}
                data={filteredData}
                params={params}
                setParams={setParams}
              />
            )}

            {/* Run button */}
            {data && !result && (
              <button
                onClick={handlePayClick}
                disabled={analyzing}
                className="btn-primary w-full text-lg py-4 disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Menganalisis...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {pricing.betaFree ? 'Jalankan Analisis Gratis' : `Bayar ${formatIDR(pricing.price)} & Jalankan Analisis`}
                  </>
                )}
              </button>
            )}

            {/* Result */}
            {result && (
              <ResultDisplay
                result={result}
                onReset={() => { setResult(null); setParams({}) }}
              />
            )}
          </div>
        </div>
      </div>

      <ConfirmPaymentModal
        open={showConfirm}
        loading={confirmLoading}
        title="Bayar & Jalankan Analisis"
        description={pricing.betaFree ? `${pricing.label} untuk ${sampleSize} sampel data — gratis selama beta` : `${pricing.label} untuk ${sampleSize} sampel data`}
        price={pricing.price}
        originalPrice={pricing.original}
        priceBreakdown={pricing.breakdown}
        wallet={getWallet()}
        onConfirm={handleConfirmPay}
        onClose={() => setShowConfirm(false)}
      />

      <DataGuideModal open={showGuide} onClose={() => setShowGuide(false)} />

      <DataCleanerModal
        open={cleanerOpen}
        data={data || {}}
        columns={columns}
        onClose={() => setCleanerOpen(false)}
        onApply={({ data: cleaned, report }) => {
          setData(cleaned)
          setCleaningReport(report)
          setCleanerOpen(false)
          if (report.actions.length > 0) {
            toast.success(`Data dibersihkan: ${report.rowsAfter} baris tersisa`)
          } else {
            toast.success('Tidak ada perubahan diterapkan')
          }
        }}
      />

      <ExampleDatasetPicker
        open={examplePickerOpen}
        onClose={() => setExamplePickerOpen(false)}
        onPick={loadExampleDataset}
      />
    </div>
  )
}

// ============================================================
// Filter Panel — subset data berdasarkan kategori
// ============================================================
function FilterPanel({
  categoricalColumns, filterColumn, setFilterColumn,
  filterValues, setFilterValues, uniqueValues,
  rawSampleSize, filteredSize,
}) {
  const isFiltered = filterColumn && filterValues.length > 0
  // Collapsed by default — filter adalah fitur opsional/tambahan, bukan syarat
  const [open, setOpen] = useState(isFiltered)

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2 text-sm">
          <span>🔎</span>
          <span className="font-medium text-gray-700">Filter Data</span>
          <span className="text-xs text-gray-400">(opsional — analisis tetap jalan tanpa ini)</span>
          {isFiltered && (
            <span className="ml-2 px-2 py-0.5 bg-sky-100 text-sky-700 rounded-full text-xs font-semibold">
              Aktif: {filteredSize}/{rawSampleSize}
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-3">
            Saring baris berdasarkan kategori. Misal: pilih hanya kelas A, atau gender = Perempuan.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kolom kategori</label>
              <select value={filterColumn} onChange={e => setFilterColumn(e.target.value)}
                      className="input-field text-sm">
                <option value="">— Tidak filter —</option>
                {categoricalColumns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {filterColumn && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-600">Pilih nilai (centang)</label>
                  {uniqueValues.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterValues(
                        filterValues.length === uniqueValues.length ? [] : [...uniqueValues]
                      )}
                      className="text-xs text-sky-600 hover:text-sky-700 font-medium"
                    >
                      {filterValues.length === uniqueValues.length ? 'Hapus Semua' : 'Pilih Semua'}
                    </button>
                  )}
                </div>
                <div className="border border-gray-200 rounded-xl p-2 max-h-32 overflow-y-auto bg-gray-50">
                  {uniqueValues.map(v => (
                    <label key={v} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white px-2 py-1 rounded">
                      <input type="checkbox" checked={filterValues.includes(v)}
                             onChange={e => {
                               if (e.target.checked) setFilterValues([...filterValues, v])
                               else setFilterValues(filterValues.filter(x => x !== v))
                             }} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  {filterValues.length} dari {uniqueValues.length} nilai dipilih
                </p>
              </div>
            )}
          </div>
          {isFiltered && (
            <div className="mt-3 flex items-center justify-between p-2 bg-sky-50 rounded text-xs text-sky-900">
              <span>📊 Analisis akan pakai <strong>{filteredSize}</strong> dari {rawSampleSize} baris</span>
              <button onClick={() => { setFilterColumn(''); setFilterValues([]) }}
                      className="text-red-600 hover:text-red-700 font-medium">
                ✕ Hapus
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Data Format Guide Modal
// ============================================================
function DataGuideModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose}
      panelClassName="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">📖 Panduan Format Data</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm text-gray-700">
          <section>
            <h3 className="font-semibold text-base text-gray-900 mb-2">1. Format File yang Didukung</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><code className="bg-gray-100 px-1 rounded">.xlsx</code> / <code className="bg-gray-100 px-1 rounded">.xls</code> — Excel</li>
              <li><code className="bg-gray-100 px-1 rounded">.csv</code> — Comma-separated values</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-base text-gray-900 mb-2">2. Struktur Data</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Baris pertama = nama variabel/kolom</strong> (header). Contoh: <code className="bg-gray-100 px-1 rounded">nama, umur, skor_pre, skor_post, kelas</code></li>
              <li><strong>Tiap baris berikutnya = 1 responden / observasi</strong></li>
              <li><strong>Tiap kolom = 1 variabel</strong> (jangan campur 2 variabel di 1 kolom)</li>
              <li>Hindari <strong>merged cells</strong>, baris kosong di tengah, atau judul tabel sebelum header</li>
            </ul>
            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-xs">
              <div className="font-bold mb-1">✅ Format yang BENAR:</div>
              <pre>{`nama,umur,skor_pre,skor_post,kelas
Andi,18,72,80,A
Budi,19,68,75,A
Citra,18,75,82,B
...`}</pre>
            </div>
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3 font-mono text-xs">
              <div className="font-bold mb-1 text-red-700">❌ Yang harus DIHINDARI:</div>
              <pre>{`Hasil Penelitian Skripsi    ← jangan ada judul!
                            ← jangan ada baris kosong
nama,umur,skor
Andi,18,72
,,                          ← jangan baris kosong
Budi,19 tahun,68            ← jangan campur teks dengan angka`}</pre>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-base text-gray-900 mb-2">3. Tipe Data per Kolom</h3>
            <table className="w-full text-xs border border-gray-200 rounded">
              <thead className="bg-gray-50">
                <tr><th className="p-2 text-left">Tipe</th><th className="p-2 text-left">Contoh</th><th className="p-2 text-left">Tool yang cocok</th></tr>
              </thead>
              <tbody className="divide-y">
                <tr><td className="p-2 font-medium">Numerik kontinu</td><td className="p-2">tinggi (cm), berat, IQ, skor</td><td className="p-2">Deskriptif, Korelasi, t-test, Regresi</td></tr>
                <tr><td className="p-2 font-medium">Numerik diskrit</td><td className="p-2">jumlah anak, frekuensi</td><td className="p-2">Deskriptif, Korelasi</td></tr>
                <tr><td className="p-2 font-medium">Skala Likert</td><td className="p-2">1-5 atau 1-7 (per item)</td><td className="p-2">Validitas-Reliabilitas (semua item di kolom terpisah)</td></tr>
                <tr><td className="p-2 font-medium">Kategorik</td><td className="p-2">"L"/"P", "A"/"B"/"C", kelas</td><td className="p-2">Grouping di t-test/ANOVA, Filter</td></tr>
              </tbody>
            </table>
          </section>

          <section>
            <h3 className="font-semibold text-base text-gray-900 mb-2">4. Tips Penting</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>🔹 <strong>Missing values</strong>: kosongkan saja sel-nya (jangan tulis "tidak ada", "-", "N/A"). Sistem akan abaikan otomatis.</li>
              <li>🔹 <strong>Desimal</strong>: pakai titik <code className="bg-gray-100 px-1 rounded">3.14</code>, bukan koma <code className="bg-gray-100 px-1 rounded">3,14</code></li>
              <li>🔹 <strong>Tidak ada satuan di angka</strong>: tulis <code>175</code> bukan <code>175 cm</code> atau <code>Rp 5000</code></li>
              <li>🔹 <strong>Nama kolom</strong> sebaiknya tanpa spasi atau karakter aneh. Pakai <code>skor_pre</code> bukan <code>skor pre (test 1)</code></li>
              <li>🔹 <strong>Banyak grup?</strong> Pakai 1 kolom kategorik (misal <code>kelas</code> = A/B/C), bukan 1 kolom per grup.</li>
              <li>🔹 <strong>Sebelum/sesudah?</strong> Pisahkan jadi 2 kolom: <code>skor_pre</code> dan <code>skor_post</code> (paired t-test)</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-base text-gray-900 mb-2">5. Contoh Skema per Tool</h3>
            <div className="space-y-2 text-xs">
              <div className="bg-sky-50 border-l-4 border-sky-500 p-2 rounded-r">
                <strong>Korelasi & Regresi Sederhana</strong> — minimal 2 kolom numerik (X dan Y).
              </div>
              <div className="bg-sky-50 border-l-4 border-sky-500 p-2 rounded-r">
                <strong>Independent t-test / ANOVA</strong> — 1 kolom numerik (outcome) + 1 kolom kategorik (grouping). Independent t-test = 2 grup, ANOVA = ≥2 grup.
              </div>
              <div className="bg-sky-50 border-l-4 border-sky-500 p-2 rounded-r">
                <strong>Paired t-test</strong> — 2 kolom numerik (sebelum, sesudah) untuk responden yang sama.
              </div>
              <div className="bg-sky-50 border-l-4 border-sky-500 p-2 rounded-r">
                <strong>Validitas-Reliabilitas</strong> — minimal 2 kolom item Likert (1-5 atau 1-7). Skala harus sama antar item. Item negatif sudah harus di-reverse code dulu.
              </div>
              <div className="bg-sky-50 border-l-4 border-sky-500 p-2 rounded-r">
                <strong>Regresi Berganda</strong> — 1 kolom outcome (Y) + ≥2 kolom predictor (X₁, X₂, ...) numerik.
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-base text-gray-900 mb-2">6. Punya Subset Data?</h3>
            <p>Pakai fitur <strong>🔎 Filter Data</strong> di bawah upload. Misal data 150 baris (3 species), pilih species = <code>setosa</code> → analisis pakai 50 baris saja.</p>
          </section>
      </div>

      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 flex justify-end">
        <button onClick={onClose} className="btn-primary">Mengerti</button>
      </div>
    </Modal>
  )
}

// ============================================================
// Param Panel — render input controls per tool
// ============================================================
function ParamPanel({ tool, columns, numericColumns, categoricalColumns = [], data, params, setParams }) {
  const update = (k, v) => setParams(p => ({ ...p, [k]: v }))

  // Helper: dapatkan unique values dari kolom grouping (untuk picker MW)
  const groupingUniqueValues = useMemo(() => {
    if (!data || !params.grouping) return []
    const vals = data[params.grouping] || []
    return Array.from(new Set(vals.map(v => String(v)).filter(v => v !== '' && v !== 'null'))).sort()
  }, [data, params.grouping])

  const Select = ({ label, value, onChange, options, placeholder = '— pilih —' }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)}
              className="input-field text-sm">
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )

  const MultiSelect = ({ label, values, onChange, options }) => {
    const selected = values || []
    const allSelected = options.length > 0 && selected.length === options.length
    const someSelected = selected.length > 0 && !allSelected
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          {options.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => onChange(allSelected ? [] : [...options])}
                className="text-sky-600 hover:text-sky-700 font-medium"
              >
                {allSelected ? 'Hapus Semua' : 'Pilih Semua'}
              </button>
              {someSelected && !allSelected && (
                <>
                  <span className="text-gray-300">·</span>
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Reset
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <div className="border border-border rounded-xl p-3 max-h-48 overflow-y-auto bg-card/30 grid grid-cols-2 gap-2">
          {options.map(o => (
            <label key={o} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/10 px-2 py-1 rounded">
              <input type="checkbox" checked={selected.includes(o)}
                     onChange={e => {
                       onChange(e.target.checked ? [...selected, o] : selected.filter(c => c !== o))
                     }} />
              <span className="truncate">{o}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {selected.length} dari {options.length} dipilih
          {allSelected && <span className="text-sky-600 font-medium"> · semua</span>}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      <h3 className="font-semibold text-gray-800">Parameter Analisis</h3>

      {tool === 'deskriptif' && (
        <MultiSelect label="Kolom yang dianalisis (numerik)" values={params.columns}
                     onChange={v => update('columns', v)} options={numericColumns} />
      )}

      {tool === 'normalitas' && (
        <MultiSelect label="Kolom numerik (bisa pilih beberapa)" values={params.columns}
                     onChange={v => update('columns', v)} options={numericColumns} />
      )}

      {tool === 'korelasi' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Variabel X" value={params.x} onChange={v => update('x', v)} options={numericColumns} />
            <Select label="Variabel Y" value={params.y} onChange={v => update('y', v)} options={numericColumns} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metode</label>
            <div className="flex gap-2">
              {[['pearson', 'Pearson (parametrik)'], ['spearman', 'Spearman (non-parametrik)']].map(([id, lbl]) => (
                <button key={id} onClick={() => update('method', id)}
                        className={'flex-1 px-3 py-2 rounded-xl text-sm border transition-colors '
                                 + ((params.method || 'pearson') === id
                                     ? 'bg-sky-100 border-sky-300 text-sky-700'
                                     : 'border-gray-200 hover:bg-gray-50')}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {tool === 'ttest' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis t-test</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['oneSample', 'One-sample'],
                ['independent', 'Independent'],
                ['paired', 'Paired (before-after)'],
              ].map(([id, lbl]) => (
                <button key={id} onClick={() => update('mode', id)}
                        className={'px-3 py-2 rounded-xl text-sm border transition-colors '
                                 + (params.mode === id
                                     ? 'bg-sky-100 border-sky-300 text-sky-700'
                                     : 'border-gray-200 hover:bg-gray-50')}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          {params.mode === 'oneSample' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Kolom" value={params.column1} onChange={v => update('column1', v)} options={numericColumns} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">μ₀ (nilai hipotesis)</label>
                <input type="number" value={params.mu0 || ''} onChange={e => update('mu0', e.target.value)}
                       className="input-field text-sm" placeholder="e.g. 75" />
              </div>
            </div>
          )}
          {params.mode === 'independent' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Outcome (numerik)" value={params.column1} onChange={v => update('column1', v)} options={numericColumns} />
              <Select label="Grouping (kategorik, harus 2 grup)" value={params.grouping} onChange={v => update('grouping', v)} options={columns} />
            </div>
          )}
          {params.mode === 'paired' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Sebelum (pre-test)" value={params.column1} onChange={v => update('column1', v)} options={numericColumns} />
              <Select label="Sesudah (post-test)" value={params.column2} onChange={v => update('column2', v)} options={numericColumns} />
            </div>
          )}
        </>
      )}

      {tool === 'validitas' && (
        <MultiSelect label="Item-item kuisioner (skor numerik)"
                     values={params.items} onChange={v => update('items', v)}
                     options={numericColumns} />
      )}

      {tool === 'anova' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Outcome (numerik)" value={params.outcome} onChange={v => update('outcome', v)} options={numericColumns} />
          <Select label="Grouping (kategorik, ≥2 grup)" value={params.grouping} onChange={v => update('grouping', v)} options={columns} />
        </div>
      )}

      {tool === 'twowayanova' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select label="Outcome (numerik)" value={params.outcome} onChange={v => update('outcome', v)} options={numericColumns} />
            <Select label="Faktor A (kategorik)" value={params.factorA} onChange={v => update('factorA', v)} options={categoricalColumns.length ? categoricalColumns : columns} />
            <Select label="Faktor B (kategorik)" value={params.factorB} onChange={v => update('factorB', v)} options={categoricalColumns.length ? categoricalColumns : columns} />
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-xs text-purple-900 leading-relaxed">
            <strong>Two-way ANOVA</strong> menguji pengaruh 2 faktor sekaligus + interaksinya.
            Cocok untuk desain faktorial (mis. metode × jenis kelamin, dosis × waktu).
            Output: <em>F utama</em> tiap faktor + <em>F interaksi</em> + partial η².
            Disarankan minimal 2 obs per kombinasi sel.
          </div>
        </>
      )}

      {tool === 'regresi' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="X (predictor)" value={params.x} onChange={v => update('x', v)} options={numericColumns} />
          <Select label="Y (outcome)" value={params.y} onChange={v => update('y', v)} options={numericColumns} />
        </div>
      )}

      {tool === 'regresiganda' && (
        <>
          <Select label="Y (outcome)" value={params.outcome} onChange={v => update('outcome', v)} options={numericColumns} />
          <MultiSelect label="X (predictors, ≥2)" values={params.predictors} onChange={v => update('predictors', v)} options={numericColumns} />
        </>
      )}

      {tool === 'chisquare' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Variabel 1 (kategorik)" value={params.var1} onChange={v => update('var1', v)} options={categoricalColumns.length ? categoricalColumns : columns} />
            <Select label="Variabel 2 (kategorik)" value={params.var2} onChange={v => update('var2', v)} options={categoricalColumns.length ? categoricalColumns : columns} />
          </div>
          <p className="text-xs text-gray-500">Kedua variabel harus kategorik (mis. gender, kelas, status). Tabel kontingensi otomatis dibuat.</p>
        </>
      )}

      {tool === 'mannwhitney' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Outcome (numerik)" value={params.outcome} onChange={v => update('outcome', v)} options={numericColumns} />
            <Select label="Grouping (kategorik)" value={params.grouping} onChange={v => { update('grouping', v); update('group1', ''); update('group2', '') }} options={categoricalColumns.length ? categoricalColumns : columns} />
          </div>
          {groupingUniqueValues.length > 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <Select label={`Bandingkan: Grup 1 (dari ${groupingUniqueValues.length} level)`} value={params.group1} onChange={v => update('group1', v)} options={groupingUniqueValues} />
              <Select label="Bandingkan: Grup 2" value={params.group2} onChange={v => update('group2', v)} options={groupingUniqueValues} />
            </div>
          )}
          <p className="text-xs text-gray-500">
            Alternatif non-parametrik untuk Independent t-test bila data tidak normal.
            {groupingUniqueValues.length > 2 && ' Ada lebih dari 2 grup — pilih 2 grup yang ingin dibandingkan.'}
          </p>
        </>
      )}

      {tool === 'wilcoxon' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Sebelum" value={params.column1} onChange={v => update('column1', v)} options={numericColumns} />
            <Select label="Sesudah" value={params.column2} onChange={v => update('column2', v)} options={numericColumns} />
          </div>
          <p className="text-xs text-gray-500">Alternatif non-parametrik untuk Paired t-test bila data tidak normal.</p>
        </>
      )}

      {tool === 'kruskal' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Outcome (numerik)" value={params.outcome} onChange={v => update('outcome', v)} options={numericColumns} />
            <Select label="Grouping (≥3 grup)" value={params.grouping} onChange={v => update('grouping', v)} options={categoricalColumns.length ? categoricalColumns : columns} />
          </div>
          <p className="text-xs text-gray-500">Alternatif non-parametrik untuk One-way ANOVA bila data tidak normal.</p>
        </>
      )}

      {tool === 'ngain' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Pre-test (nilai awal)" value={params.column1} onChange={v => update('column1', v)} options={numericColumns} />
            <Select label="Post-test (nilai akhir)" value={params.column2} onChange={v => update('column2', v)} options={numericColumns} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Skor Maksimum</label>
              <input
                type="number"
                min="1"
                step="1"
                value={params.maxScore ?? 100}
                onChange={e => update('maxScore', e.target.value)}
                placeholder="100"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <Select
              label="Nama Siswa (opsional)"
              value={params.nameColumn || ''}
              onChange={v => update('nameColumn', v || null)}
              options={['', ...columns.filter(c => !numericColumns.includes(c))]}
            />
          </div>
          <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-xs text-sky-900 leading-relaxed">
            <strong>Rumus N-Gain (Hake, 1998):</strong> g = (post − pre) / (max − pre)<br />
            <strong>Kategori:</strong> Tinggi (g ≥ 0.7), Sedang (0.3 ≤ g &lt; 0.7), Rendah (g &lt; 0.3).<br />
            Mengukur efektivitas pembelajaran/treatment dengan desain pre-test → post-test.
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================
// Result Display — render based on result type
// ============================================================
function ResultDisplay({ result, onReset }) {
  const contentRef = useRef(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [aiInterpretation, setAiInterpretation] = useState('')
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [savedId, setSavedId] = useState(null)

  const handleExportPdf = async () => {
    if (exportingPdf) return
    setExportingPdf(true)
    try {
      await exportToPDF({ ...result, aiInterpretation }, contentRef.current)
      toast.success('PDF berhasil di-download')
    } catch (e) {
      console.error(e)
      toast.error('Gagal export PDF: ' + e.message)
    } finally {
      setExportingPdf(false)
    }
  }

  const dl = (label, fn, disabled = false) => (
    <button onClick={fn} disabled={disabled}
      className="px-3 sm:px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-gray-300 text-white rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
      <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {label}
    </button>
  )

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">Hasil: {result.toolName}</h3>
          <p className="text-sm text-gray-500">{result.sampleSize} sampel · {result.analyzedAt}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setSaveModalOpen(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border transition-colors ${
              savedId
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}>
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a2 2 0 012-2h10a2 2 0 012 2v14l-7-3.5L3 18V4z" /></svg>
            {savedId ? 'Tersimpan' : 'Simpan'}
          </button>
          {dl('Excel', () => exportToExcel(result))}
          {dl(exportingPdf ? 'Membuat PDF…' : 'PDF', handleExportPdf, exportingPdf)}
          <button onClick={onReset} className="btn-ghost text-sm">Analisis Baru</button>
        </div>
      </div>

      <SaveAnalysisModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        result={result}
        aiInterpretation={aiInterpretation}
        onSaved={(id) => { setSavedId(id); setSaveModalOpen(false) }}
      />
      <div className="p-5" ref={contentRef}>
        {result.type === 'descriptive' && <DescriptiveResult r={result} />}
        {result.type === 'normality' && <NormalityResult r={result} />}
        {result.type === 'correlation' && <CorrelationResult r={result} />}
        {result.type === 'ttest' && <TTestResult r={result} />}
        {result.type === 'validity_reliability' && <ValidityResult r={result} />}
        {result.type === 'anova' && <ANOVAResult r={result} />}
        {result.type === 'regression_simple' && <SimpleRegressionResult r={result} />}
        {result.type === 'regression_multiple' && <MultipleRegressionResult r={result} />}
        {result.type === 'chisquare' && <ChiSquareResult r={result} />}
        {result.type === 'mannwhitney' && <MannWhitneyResult r={result} />}
        {result.type === 'wilcoxon' && <WilcoxonResult r={result} />}
        {result.type === 'kruskal' && <KruskalResult r={result} />}
        {result.type === 'ngain' && <NGainResult r={result} />}
        {result.type === 'twowayanova' && <TwoWayANOVAResult r={result} />}

        {/* Tier 1: Assumption checks panel — auto-render untuk t-test/ANOVA/regression */}
        {result.type === 'ttest' && result.mode === 'independent' && (
          <AssumptionsPanel result={result} type="ttest_independent" />
        )}
        {result.type === 'anova' && <AssumptionsPanel result={result} type="anova" />}
        {result.type === 'regression_simple' && <AssumptionsPanel result={result} type="regression_simple" />}
        {result.type === 'regression_multiple' && <AssumptionsPanel result={result} type="regression_multiple" />}

        <AIInterpretationPanel result={result} value={aiInterpretation} onChange={setAiInterpretation} />

        <ExplainChatPanel result={result} aiInterpretation={aiInterpretation} />

        <MethodologyPanel result={result} />
      </div>
    </div>
  )
}

// ============================================================
// Save Analysis Modal
// ============================================================
function SaveAnalysisModal({ open, onClose, result, aiInterpretation, onSaved }) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset state every time modal opens
  useEffect(() => {
    if (open) {
      const stamp = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      setTitle(`${result.toolName} — ${stamp}`)
      setNotes('')
    }
  }, [open, result.toolName])

  if (!open) return null

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    const out = await saveAnalysis({
      title,
      tool: result.type,
      toolName: result.toolName,
      result,
      aiInterpretation,
      notes,
    })
    setSaving(false)
    if (out.ok) {
      toast.success('Analisis tersimpan ke akun Anda')
      onSaved?.(out.analysis.id)
    } else {
      toast.error('Gagal menyimpan: ' + out.error)
    }
  }

  return (
    <Modal open={true} onClose={onClose}
      panelClassName="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
      <div>
        <div className="mb-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-medium mb-1">Simpan Analisis</div>
          <h3 className="text-lg font-bold text-gray-900">Simpan ke Riwayat</h3>
          <p className="text-sm text-gray-500 mt-1">Akses lagi kapan saja dari halaman Riwayat.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Judul</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
              placeholder="Misal: Pre-test Eksperimen Kelompok A" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Catatan (opsional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 resize-none"
              placeholder="Misal: data dari kuesioner X, n=50 setelah cleaning" />
          </div>
          {aiInterpretation && (
            <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              Interpretasi AI yang sudah Anda generate akan ikut tersimpan.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-5 pt-5 border-t border-gray-100">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg disabled:opacity-50">
            Batal
          </button>
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black rounded-lg disabled:opacity-50">
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ============================================================
// AI Interpretation Panel
// ============================================================
function AIInterpretationPanel({ result, value = '', onChange }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [provider, setProvider] = useState(null)
  const [isFallback, setIsFallback] = useState(false)
  const text = value
  const setText = (v) => onChange?.(v)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setText('')
    const out = await generateInterpretation(result)
    if (out.ok) {
      setText(out.text)
      setProvider(out.provider)
      setIsFallback(!!out.fallback)
    } else {
      setError(out.error)
    }
    setLoading(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Interpretasi disalin ke clipboard')
    } catch {
      toast.error('Gagal menyalin')
    }
  }

  return (
    <div className="mt-6 border-t border-gray-100 pt-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-medium mb-0.5">Interpretasi AI</div>
          <div className="text-sm text-gray-600">Paragraf akademik siap-paste untuk skripsi (Bahasa Indonesia, format APA).</div>
        </div>
        {!text && !loading && (
          <button onClick={handleGenerate}
                  className="bg-gray-900 hover:bg-black text-white text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap">
            Generate
          </button>
        )}
        {text && (
          <div className="flex items-center gap-2">
            <button onClick={handleCopy}
                    className="text-xs text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg">
              Salin
            </button>
            <button onClick={handleGenerate} disabled={loading}
                    className="text-xs text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg disabled:opacity-50">
              {loading ? 'Memproses…' : 'Regenerate'}
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-gray-50 border border-gray-200/80 rounded-lg p-4 text-sm text-gray-500 flex items-center gap-2">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
          Menulis interpretasi… (biasanya 5-15 detik)
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          Gagal menghasilkan interpretasi: {error}
        </div>
      )}

      {text && !loading && (
        <div className="bg-gray-50 border border-gray-200/80 rounded-lg p-4">
          {isFallback && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-[11px] text-amber-800 leading-relaxed">
              <span className="font-medium">Mode offline:</span> AI provider sedang sibuk, jadi interpretasi disusun dari template lokal berdasarkan angka hasil analisis. Hasil tetap akurat tapi gaya bahasanya lebih baku — coba <em>Regenerate</em> beberapa saat lagi untuk versi AI.
            </div>
          )}
          <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed text-[13.5px]">
            {text}
          </div>
          {provider && (
            <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-3 pt-3 border-t border-gray-200/70">
              {isFallback ? `Template lokal (${provider})` : `Disusun oleh AI (${provider})`} · Periksa kembali sebelum digunakan
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Explain Chat Panel — pop-up "Belum Paham?" dengan AI bahasa santai.
// Max 5 pertanyaan per result session (free tier).
// ============================================================
function ExplainChatPanel({ result, aiInterpretation }) {
  const MAX_TURNS = 5
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  const userTurnsUsed = messages.filter(m => m.role === 'user').length
  const remaining = Math.max(0, MAX_TURNS - userTurnsUsed)
  const limitReached = remaining === 0

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading, open])

  function handleOpen() {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Halo! 👋 Aku siap bantu jelasin hasil **${result.toolName || 'analisis'}**-mu pakai bahasa yang gampang dimengerti. Mau aku jelasin dari mana? Misalnya:\n\n• "Hasilnya artinya gimana sih?"\n• "Apa itu p-value?"\n• "Kesimpulannya untuk skripsi gimana?"\n\nTanya bebas aja — kamu punya jatah ${MAX_TURNS} pertanyaan ya 😊`
      }])
    }
    setOpen(true)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading || limitReached) return
    const userMsg = { role: 'user', content: text }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const ctx = buildResultContext(result, aiInterpretation)
      const r = await fetch('/api/explain-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultContext: ctx,
          messages: newMsgs.filter(m => m.role === 'user' || m.role === 'assistant'),
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (e) {
      setError(e.message)
      setMessages(prev => prev.slice(0, -1))
      setInput(text)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      <div className="mt-5 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center flex-shrink-0 text-lg">💬</div>
          <div className="min-w-0">
            <div className="font-semibold text-purple-900">Belum paham hasilnya?</div>
            <div className="text-sm text-purple-700">
              Tanya AI! Bakal dijelasin pakai bahasa santai, kayak ngobrol sama temen. Gratis {MAX_TURNS} pertanyaan per hasil.
            </div>
          </div>
        </div>
        <button onClick={handleOpen}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg flex-shrink-0">
          Tanya AI
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)}
             panelClassName="bg-white rounded-2xl shadow-2xl max-w-2xl w-full h-[80vh] flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-purple-500 text-white flex items-center justify-center flex-shrink-0">💬</div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 truncate">Tanya AI tentang Hasil</div>
              <div className="text-xs text-gray-500">{result.toolName} · sisa {remaining}/{MAX_TURNS} pertanyaan</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50/50">
          {messages.map((m, i) => <ChatBubble key={i} role={m.role} content={m.content} />)}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 pl-2">
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              <span className="ml-1">AI lagi mikir…</span>
            </div>
          )}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              Error: {error}. Coba kirim ulang ya.
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-gray-100 p-3">
          {limitReached ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 text-center">
              Kamu sudah pakai {MAX_TURNS}/{MAX_TURNS} pertanyaan untuk hasil ini.<br />
              <span className="text-xs">Buka analisis baru kalau mau tanya lagi.</span>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={loading ? 'Tunggu AI…' : 'Tanya apa aja tentang hasilmu…'}
                disabled={loading} rows={1}
                className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:bg-gray-50 disabled:text-gray-400"
                style={{ maxHeight: '120px' }}
              />
              <button onClick={handleSend} disabled={!input.trim() || loading}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-xl">
                Kirim
              </button>
            </div>
          )}
          <div className="text-[10px] text-gray-400 text-center mt-2">Enter untuk kirim · Shift+Enter untuk baris baru</div>
        </div>
      </Modal>
    </>
  )
}

function ChatBubble({ role, content }) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-purple-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm max-w-[85%] whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start gap-2">
      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 text-base">💬</div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm max-w-[85%] whitespace-pre-wrap leading-relaxed text-gray-800">
        {content}
      </div>
    </div>
  )
}

// Bangun konteks hasil uji untuk dikirim ke AI sebagai system context.
//
// Pendekatan baru (generic JSON serializer): apapun tool yang user buka,
// SELURUH field hasil dirangkum jadi key=value sederhana, kecuali field
// raw/heavy (residuals, yPred, dataMatrix, dll) yang gak relevan untuk AI.
//
// Sebelumnya pakai branch per r.type — banyak tool (mediation, moderation,
// EFA, CFA, logistic, posthoc, dll) gak ke-cover sehingga AI cuma dapat
// "Tool: X, n: Y" tanpa angka sama sekali.
function buildResultContext(r, aiInterpretation) {
  const lines = []
  lines.push(`Tool: ${r.toolName || r.type || 'Analisis Statistik'}`)
  if (r.sampleSize) lines.push(`Jumlah sampel: ${r.sampleSize}`)

  // Field yang dilewati: terlalu besar / gak relevan untuk konteks AI
  const SKIP_KEYS = new Set([
    'type', 'toolName', 'sampleSize',
    'residuals', 'yPred', 'predicted', 'fitted',
    'rawData', 'dataMatrix', 'matrix', 'covariance', 'correlationMatrix',
    'rotatedLoadings', 'unrotatedLoadings', 'loadings',
    'eigenvectors', 'scores',
    'groups', 'groupData', 'rawGroups',
    'interpretation', // dipisah handling-nya
    'aiInterpretation',
    'chart', 'charts', 'plotData',
  ])

  const fmtNum = (v) => {
    if (v === null || v === undefined) return '—'
    if (typeof v !== 'number') return String(v)
    if (!isFinite(v)) return String(v)
    const abs = Math.abs(v)
    if (abs >= 1000 || abs < 0.0001 && v !== 0) return v.toExponential(2)
    return Number(v.toFixed(4)).toString()
  }

  // Flatten 1 level objek nested (mis. r.student, r.welch, r.levene, r.factorA, ...)
  const dumpValue = (key, val, indent = '') => {
    if (val === null || val === undefined) return
    if (SKIP_KEYS.has(key)) return

    if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') {
      lines.push(`${indent}${key}: ${typeof val === 'number' ? fmtNum(val) : val}`)
      return
    }

    if (Array.isArray(val)) {
      // Array of primitives → join
      if (val.every(v => typeof v !== 'object' || v === null)) {
        const preview = val.slice(0, 10).map(v => typeof v === 'number' ? fmtNum(v) : v).join(', ')
        lines.push(`${indent}${key}: [${preview}${val.length > 10 ? ', ...' : ''}]`)
        return
      }
      // Array of objects (mis. coefficients, vifs, stats per kolom) → ringkas
      lines.push(`${indent}${key}:`)
      val.slice(0, 12).forEach((item, idx) => {
        if (typeof item === 'object' && item !== null) {
          const inner = Object.entries(item)
            .filter(([k]) => !SKIP_KEYS.has(k))
            .map(([k, v]) => `${k}=${typeof v === 'number' ? fmtNum(v) : v}`)
            .join(', ')
          lines.push(`${indent}  [${idx + 1}] ${inner}`)
        }
      })
      if (val.length > 12) lines.push(`${indent}  ...dan ${val.length - 12} lagi`)
      return
    }

    if (typeof val === 'object') {
      // Nested object (mis. r.student, r.levene, r.assumptions, r.reliability)
      const innerEntries = Object.entries(val).filter(([k]) => !SKIP_KEYS.has(k))
      if (innerEntries.length === 0) return
      lines.push(`${indent}${key}:`)
      innerEntries.forEach(([k, v]) => dumpValue(k, v, indent + '  '))
    }
  }

  for (const [k, v] of Object.entries(r)) {
    dumpValue(k, v)
  }

  // Interpretasi default (limit dinaikkan: tool kompleks butuh konteks lebih)
  if (r.interpretation) {
    lines.push('')
    lines.push(`Interpretasi default sistem:`)
    lines.push(String(r.interpretation).slice(0, 2000))
  }
  // Interpretasi APA yang sudah di-generate AI (kalau panel sudah dibuka)
  if (aiInterpretation) {
    lines.push('')
    lines.push(`Interpretasi akademik (APA, sudah di-generate AI):`)
    lines.push(String(aiInterpretation).slice(0, 2500))
  }

  return lines.join('\n')
}

// ============================================================
// Result subcomponents
// ============================================================
const num = (v, d = 3) => typeof v === 'number' ? v.toFixed(d) : (v ?? '—')
const pct = (p) => typeof p === 'number' ? (p < 0.001 ? '< 0.001' : p.toFixed(4)) : '—'

const Stat = ({ label, value, accent, term }) => (
  <div className="bg-gray-50 rounded-lg p-3">
    <div className="text-xs text-gray-500">
      {term ? <StatTooltip term={term}>{label}</StatTooltip> : label}
    </div>
    <div className={`font-semibold mt-0.5 ${accent || 'text-gray-800'}`}>{value}</div>
  </div>
)
const InterpBox = ({ children }) => (
  <div className="mt-4 p-4 bg-sky-50 border-l-4 border-sky-500 rounded-r-lg">
    <p className="text-sm font-semibold text-sky-800 mb-1">Interpretasi:</p>
    <p className="text-sm text-sky-900">{children}</p>
  </div>
)

function DescriptiveResult({ r }) {
  return (
    <div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Variabel','N','Mean','Median','Modus','SD','Var','Min','Max','Skew','Kurt','SEM'].map(h => (
              <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {r.stats.map((s, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium">{s.column}</td>
              <td className="px-3 py-2">{s.n}</td>
              <td className="px-3 py-2 font-semibold text-sky-600">{s.mean}</td>
              <td className="px-3 py-2">{s.median}</td>
              <td className="px-3 py-2">{s.mode}</td>
              <td className="px-3 py-2">{s.stdDev}</td>
              <td className="px-3 py-2">{s.variance}</td>
              <td className="px-3 py-2">{s.min}</td>
              <td className="px-3 py-2">{s.max}</td>
              <td className="px-3 py-2">{s.skewness}</td>
              <td className="px-3 py-2">{s.kurtosis}</td>
              <td className="px-3 py-2">{s.sem}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 mt-3">SD &amp; Variance dihitung dengan formula sample (n−1).</p>
    </div>
      <ChartGrid>
        {r.stats.map((s, i) => (
          <Histogram key={i} values={s.values} title={`Histogram: ${s.column}`} xLabel={s.column} />
        ))}
      </ChartGrid>
    </div>
  )
}

function NormalityResult({ r }) {
  // Multi-column: r.results = [{column, method, W/D, pValue, isNormal, interpretation}, ...]
  const rows = r.results || [{ column: r.column, ...r }]
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Variabel', 'Metode', 'Statistik', 'p-value', 'Status', 'Kesimpulan'].map(h => (
              <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 align-top">
              <td className="px-3 py-2 font-medium">{row.column}</td>
              <td className="px-3 py-2">{row.method}</td>
              <td className="px-3 py-2">{num(row.W ?? row.D, 4)}</td>
              <td className="px-3 py-2 font-semibold">{pct(row.pValue)}</td>
              <td className={'px-3 py-2 font-semibold ' + (row.isNormal ? 'text-green-600' : 'text-red-600')}>
                {row.isNormal ? 'Normal ✅' : 'Tidak Normal ❌'}
              </td>
              <td className="px-3 py-2 text-xs text-gray-600 max-w-md">{row.interpretation}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 mt-3">
        H₀: data berdistribusi normal. Jika p &gt; 0.05 → tidak ada bukti tolak H₀ → data dianggap normal.
      </p>
      {rows.map((row, i) => row.values && (
        <div key={i} className="mt-4">
          <h4 className="font-semibold text-sm text-gray-700 mb-2">Visualisasi: {row.column}</h4>
          <ChartGrid>
            <Histogram values={row.values} title="Histogram + kurva normal" xLabel={row.column} overlayNormal />
            <QQPlot values={row.values} title="Q-Q Plot (Normal)" />
          </ChartGrid>
        </div>
      ))}
    </div>
  )
}

function CorrelationResult({ r }) {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Metode" value={r.method === 'spearman' ? 'Spearman' : 'Pearson'} />
        <Stat label="r / ρ" value={num(r.r ?? r.rho, 3)} accent="text-sky-600" term={r.method === 'spearman' ? 'spearman_rho' : 'pearson_r'} />
        <Stat label="p-value" value={pct(r.pValue)} accent={r.pValue < 0.05 ? 'text-green-600' : 'text-gray-700'} term="p_value" />
        <Stat label="n" value={r.n} />
        <Stat label="t" value={num(r.t)} />
        <Stat label="df" value={r.df} />
        <Stat label="Kekuatan" value={r.strength} />
        <Stat label="Arah" value={r.direction} />
        {r.ci95 && <Stat label="95% CI" value={`[${num(r.ci95[0])}, ${num(r.ci95[1])}]`} />}
      </div>
      {r.xValues && r.yValues && (
        <div className="mt-4">
          <ScatterPlot x={r.xValues} y={r.yValues}
                       title={`Scatter: ${r.x} vs ${r.y}`} xLabel={r.x} yLabel={r.y} />
        </div>
      )}
      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

function TTestResult({ r }) {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Test" value={r.test} />
        <Stat label="t" value={num(r.t)} term="t_statistic" />
        <Stat label="df" value={typeof r.df === 'number' ? r.df.toFixed(2) : r.df} term="df" />
        <Stat label="p-value" value={pct(r.pValue)} accent={r.significant ? 'text-green-600' : 'text-gray-700'} term="p_value" />
        <Stat label="Cohen's d" value={num(r.cohensD)} term="cohens_d" />
        <Stat label="Effect Size" value={r.effectSize} />
        {r.ci95 && <Stat label="95% CI" value={`[${num(r.ci95[0])}, ${num(r.ci95[1])}]`} />}
        <Stat label="Signifikan?" value={r.significant ? 'Ya ✅' : 'Tidak ❌'} accent={r.significant ? 'text-green-600' : 'text-red-600'} />
      </div>
      {r.mode === 'independent' && r.group1 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Stat label={`Grup 1 (${r.groupNames?.[0] ?? 'A'})`} value={`M=${num(r.group1.mean)}, SD=${num(r.group1.sd)}, n=${r.group1.n}`} />
          <Stat label={`Grup 2 (${r.groupNames?.[1] ?? 'B'})`} value={`M=${num(r.group2.mean)}, SD=${num(r.group2.sd)}, n=${r.group2.n}`} />
        </div>
      )}
      {r.note && <p className="text-xs text-gray-500 italic mb-3">{r.note}</p>}
      {r.mode === 'oneSample' && r.values && (
        <div className="mt-3">
          <Histogram values={r.values} title={`Histogram: ${r.column} (μ₀ = ${r.mu0})`} xLabel={r.column} overlayNormal />
        </div>
      )}
      {r.mode === 'independent' && r.groupValues && (
        <div className="mt-3">
          <BoxPlot groups={r.groupValues} title={`Boxplot: ${r.outcome} per ${r.grouping}`} yLabel={r.outcome} />
        </div>
      )}
      {r.mode === 'paired' && r.beforeValues && r.afterValues && (
        <div className="mt-3">
          <BoxPlot groups={[
            { name: r.column1 || 'Sebelum', values: r.beforeValues },
            { name: r.column2 || 'Sesudah', values: r.afterValues },
          ]} title="Boxplot: Sebelum vs Sesudah" />
        </div>
      )}
      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

function ValidityResult({ r }) {
  return (
    <div className="space-y-5">
      <div>
        <h4 className="font-semibold mb-2">Reliabilitas (Cronbach's α)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Stat label="Cronbach's α" value={num(r.reliability.alpha)} accent="text-sky-600" term="cronbach_alpha" />
          <Stat label="N item" value={r.reliability.k} />
          <Stat label="N responden" value={r.reliability.n} />
          <Stat label="Status" value={r.reliability.alpha >= 0.7 ? 'Reliabel ✅' : 'Kurang Reliabel ⚠️'}
                accent={r.reliability.alpha >= 0.7 ? 'text-green-600' : 'text-amber-600'} />
        </div>
        <InterpBox>{r.reliability.interpretation}</InterpBox>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Validitas Item (Pearson item-total terkoreksi)</h4>
        <p className="text-xs text-gray-500 mb-2">Kriteria: r ≥ {num(r.validity.rCritical)} dan p &lt; 0.05</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">r</th>
                <th className="px-3 py-2 text-left">p</th>
                <th className="px-3 py-2 text-left">α jika dihapus</th>
                <th className="px-3 py-2 text-left">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {r.validity.items.map((it, i) => {
                const alphaRaw = r.reliability.itemStats?.[i]?.alphaIfDeleted
                const alpha = (typeof alphaRaw === 'number' && !isNaN(alphaRaw)) ? alphaRaw : null
                return (
                  <tr key={i} className={it.isValid ? '' : 'bg-red-50'}>
                    <td className="px-3 py-2 font-medium">{r.items[i]}</td>
                    <td className="px-3 py-2">{num(it.r)}</td>
                    <td className="px-3 py-2">{pct(it.pValue)}</td>
                    <td className="px-3 py-2">{num(alpha)}</td>
                    <td className={'px-3 py-2 font-semibold ' + (it.isValid ? 'text-green-600' : 'text-red-600')}>
                      {it.verdict}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-sm mt-3 text-gray-700">{r.validity.summary}</p>
      </div>
    </div>
  )
}

function ANOVAResult({ r }) {
  return (
    <div>
      <h4 className="font-semibold mb-2">Statistik Per Grup</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>{['Grup','n','Mean','SD'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {r.groupStats.map((g, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-medium">{g.label}</td>
                <td className="px-3 py-2">{g.n}</td>
                <td className="px-3 py-2 font-semibold text-sky-600">{num(g.mean)}</td>
                <td className="px-3 py-2">{num(g.sd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 className="font-semibold mb-2">Tabel ANOVA</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>{['Sumber','SS','df','MS','F','p'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-3 py-2">Antar grup</td><td className="px-3 py-2">{num(r.ssBetween)}</td><td className="px-3 py-2">{r.dfBetween}</td><td className="px-3 py-2">{num(r.msBetween)}</td><td className="px-3 py-2 font-semibold text-sky-600">{num(r.F)}</td><td className="px-3 py-2 font-semibold">{pct(r.pValue)}</td></tr>
            <tr><td className="px-3 py-2">Dalam grup</td><td className="px-3 py-2">{num(r.ssWithin)}</td><td className="px-3 py-2">{r.dfWithin}</td><td className="px-3 py-2">{num(r.msWithin)}</td><td colSpan="2" /></tr>
            <tr className="font-semibold bg-gray-50"><td className="px-3 py-2">Total</td><td className="px-3 py-2">{num(r.ssTotal)}</td><td className="px-3 py-2">{r.dfTotal}</td><td colSpan="3" /></tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="η² (Eta-squared)" value={num(r.etaSquared)} term="eta_squared" />
        <Stat label="ω² (Omega-squared)" value={num(r.omegaSquared)} term="omega_squared" />
        <Stat label="Effect Size" value={r.effectSize} />
        <Stat label="Signifikan?" value={r.significant ? 'Ya ✅' : 'Tidak ❌'}
              accent={r.significant ? 'text-green-600' : 'text-red-600'} />
      </div>

      {r.postHoc && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Post-hoc: {r.postHoc.method}</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Pasangan','Mean Diff','t','p (Bonferroni)','Signifikan'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {r.postHoc.comparisons.map((c, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{c.group1} vs {c.group2}</td>
                    <td className="px-3 py-2">{num(c.meanDiff)}</td>
                    <td className="px-3 py-2">{num(c.t)}</td>
                    <td className="px-3 py-2">{pct(c.pBonferroni)}</td>
                    <td className={'px-3 py-2 font-semibold ' + (c.significant ? 'text-green-600' : 'text-gray-500')}>
                      {c.significant ? '✅ Ya' : 'Tidak'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {r.groupValues && (
        <div className="mb-4">
          <BoxPlot groups={r.groupValues} title={`Boxplot: ${r.outcome} per ${r.grouping}`} yLabel={r.outcome} />
        </div>
      )}
      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

function SimpleRegressionResult({ r }) {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="R²" value={num(r.rSquared)} accent="text-sky-600" term="r_squared" />
        <Stat label="Adj. R²" value={num(r.adjustedR2)} term="adjusted_r_squared" />
        <Stat label="F" value={num(r.F)} term="f_statistic" />
        <Stat label="p (F)" value={pct(r.pF)} accent={r.significant ? 'text-green-600' : 'text-gray-700'} term="p_value" />
        <Stat label="SE Estimate" value={num(r.standardErrorOfEstimate)} />
        <Stat label="β (standardized)" value={num(r.standardizedBeta)} />
        <Stat label="Signifikan?" value={r.significant ? 'Ya ✅' : 'Tidak ❌'} accent={r.significant ? 'text-green-600' : 'text-red-600'} />
        <Stat label="N" value={r.n} />
      </div>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>{['Koefisien','b','SE','t','p','95% CI'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-3 py-2">Intercept (b₀)</td><td className="px-3 py-2 font-semibold">{num(r.intercept)}</td><td className="px-3 py-2">{num(r.intercept_se)}</td><td className="px-3 py-2">{num(r.intercept_t)}</td><td className="px-3 py-2">{pct(r.intercept_p)}</td><td className="px-3 py-2">[{num(r.intercept_ci?.[0])}, {num(r.intercept_ci?.[1])}]</td></tr>
            <tr><td className="px-3 py-2">Slope ({r.x})</td><td className="px-3 py-2 font-semibold text-sky-600">{num(r.slope)}</td><td className="px-3 py-2">{num(r.slope_se)}</td><td className="px-3 py-2">{num(r.slope_t)}</td><td className="px-3 py-2">{pct(r.slope_p)}</td><td className="px-3 py-2">[{num(r.slope_ci?.[0])}, {num(r.slope_ci?.[1])}]</td></tr>
          </tbody>
        </table>
      </div>

      <p className="text-sm bg-gray-50 p-3 rounded font-mono">{r.equation}</p>
      {r.xValues && r.yValues && (
        <div className="mt-4">
          <ScatterPlot x={r.xValues} y={r.yValues}
                       title={`Regresi: ${r.y} vs ${r.x}`}
                       xLabel={r.x} yLabel={r.y}
                       regressionLine={{ slope: r.slope, intercept: r.intercept }} />
        </div>
      )}
      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

function MultipleRegressionResult({ r }) {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="R²" value={num(r.rSquared)} accent="text-sky-600" term="r_squared" />
        <Stat label="Adj. R²" value={num(r.adjustedR2)} term="adjusted_r_squared" />
        <Stat label="F" value={num(r.F)} term="f_statistic" />
        <Stat label="p (F)" value={pct(r.pF)} accent={r.significant ? 'text-green-600' : 'text-gray-700'} term="p_value" />
        <Stat label="SE Estimate" value={num(r.standardErrorOfEstimate)} />
        <Stat label="N" value={r.n} />
        <Stat label="p (predictors)" value={r.p} />
        <Stat label="Multikolinearitas" value={r.multicollinearity} accent={r.multicollinearity.includes('TERDETEKSI') ? 'text-red-600' : 'text-green-600'} />
      </div>

      <h4 className="font-semibold mb-2">Koefisien</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>{['Variabel','b','SE','t','p'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {r.coefficients.map((c, i) => (
              <tr key={i} className={c.p < 0.05 ? 'bg-green-50/50' : ''}>
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2 font-semibold">{num(c.b)}</td>
                <td className="px-3 py-2">{num(c.se)}</td>
                <td className="px-3 py-2">{num(c.t)}</td>
                <td className="px-3 py-2">{pct(c.p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {r.vifs?.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">VIF (Multikolinearitas)</h4>
          <p className="text-xs text-gray-500 mb-2">VIF &gt; 10 mengindikasikan masalah multikolinearitas berat.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {r.vifs.map((v, i) => (
              <Stat key={i} label={v.predictor} value={num(v.vif)}
                    accent={v.vif > 10 ? 'text-red-600' : v.vif > 5 ? 'text-amber-600' : 'text-green-600'} />
            ))}
          </div>
        </div>
      )}

      <p className="text-sm bg-gray-50 p-3 rounded font-mono">{r.equation}</p>
      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

// ============================================================
// Chi-Square Result
// ============================================================
function ChiSquareResult({ r }) {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="χ²" value={num(r.chi2)} accent="text-sky-600" />
        <Stat label="df" value={r.df} term="df" />
        <Stat label="p-value" value={pct(r.pValue)} accent={r.isSignificant ? 'text-green-600' : 'text-gray-700'} term="p_value" />
        <Stat label="N" value={r.N} />
        <Stat label="Cramer's V" value={num(r.cramersV)} accent="text-sky-600" term="cramers_v" />
        <Stat label="Effect Size" value={r.effectSizeLabel} />
        {r.phi !== null && <Stat label="Phi (φ)" value={num(r.phi)} />}
        <Stat label="Status" value={r.isSignificant ? 'Signifikan ✅' : 'Tidak signifikan'}
              accent={r.isSignificant ? 'text-green-600' : 'text-gray-700'} />
      </div>

      <h4 className="font-semibold mb-2">Tabel Kontingensi (Observed)</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left border">{r.var1} \ {r.var2}</th>
              {r.colLabels.map(c => <th key={c} className="px-3 py-2 text-left border">{c}</th>)}
              <th className="px-3 py-2 text-left border bg-gray-100">Total</th>
            </tr>
          </thead>
          <tbody>
            {r.observed.map((row, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2 font-medium border bg-gray-50">{r.rowLabels[i]}</td>
                {row.map((v, j) => (
                  <td key={j} className="px-3 py-2 border">
                    {v}
                    <span className="text-xs text-gray-400 ml-1">(E={r.expected[i][j].toFixed(1)})</span>
                  </td>
                ))}
                <td className="px-3 py-2 border bg-gray-50 font-semibold">{r.rowTotals[i]}</td>
              </tr>
            ))}
            <tr className="border-t bg-gray-50">
              <td className="px-3 py-2 font-semibold border">Total</td>
              {r.colTotals.map((c, j) => <td key={j} className="px-3 py-2 border font-semibold">{c}</td>)}
              <td className="px-3 py-2 border font-bold">{r.N}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-2">Angka dalam kurung = expected frequency.</p>
      </div>

      {r.assumptionWarning && (
        <div className="mb-3 p-3 bg-amber-50 border-l-4 border-amber-500 rounded-r text-sm text-amber-900">
          {r.assumptionWarning}
        </div>
      )}

      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

// ============================================================
// Mann-Whitney U Result
// ============================================================
function MannWhitneyResult({ r }) {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="U" value={num(r.U, 2)} accent="text-sky-600" term="mann_whitney_u" />
        <Stat label="z" value={num(r.z, 3)} />
        <Stat label="p-value" value={pct(r.pValue)} accent={r.isSignificant ? 'text-green-600' : 'text-gray-700'} term="p_value" />
        <Stat label="Status" value={r.isSignificant ? 'Signifikan ✅' : 'Tidak signifikan'}
              accent={r.isSignificant ? 'text-green-600' : 'text-gray-700'} />
        <Stat label="N total" value={r.N} />
        <Stat label="Effect size r" value={num(r.effectSize, 3)} accent="text-sky-600" />
        <Stat label="Magnitude" value={r.effectSizeLabel} />
      </div>

      <h4 className="font-semibold mb-2">Statistik per Grup</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>{['Grup', 'n', 'Mean Rank', 'Sum Rank'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-3 py-2 font-medium">{r.groupNames[0]}</td><td className="px-3 py-2">{r.n1}</td><td className="px-3 py-2">{num(r.meanRank1, 2)}</td><td className="px-3 py-2">{num(r.R1, 1)}</td></tr>
            <tr><td className="px-3 py-2 font-medium">{r.groupNames[1]}</td><td className="px-3 py-2">{r.n2}</td><td className="px-3 py-2">{num(r.meanRank2, 2)}</td><td className="px-3 py-2">{num(r.R2, 1)}</td></tr>
          </tbody>
        </table>
      </div>

      {r.groupValues && (
        <div className="mb-4">
          <BoxPlot groups={r.groupValues} title={`Boxplot: ${r.outcome} per ${r.grouping}`} yLabel={r.outcome} />
        </div>
      )}
      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

// ============================================================
// Wilcoxon Signed-Rank Result
// ============================================================
function WilcoxonResult({ r }) {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="W" value={num(r.W, 2)} accent="text-sky-600" term="wilcoxon_signed_rank" />
        <Stat label="z" value={num(r.z, 3)} />
        <Stat label="p-value" value={pct(r.pValue)} accent={r.isSignificant ? 'text-green-600' : 'text-gray-700'} term="p_value" />
        <Stat label="N pasangan" value={r.n} />
        <Stat label="W+ (positif)" value={num(r.Wpos, 1)} />
        <Stat label="W− (negatif)" value={num(r.Wneg, 1)} />
        <Stat label="Mean diff" value={num(r.meanDiff, 3)} />
        <Stat label="Effect size r" value={num(r.effectSize, 3)} accent="text-sky-600" />
      </div>
      {r.beforeValues && r.afterValues && (
        <div className="mb-4">
          <BoxPlot groups={[
            { name: r.column1 || 'Sebelum', values: r.beforeValues },
            { name: r.column2 || 'Sesudah', values: r.afterValues },
          ]} title="Boxplot: Sebelum vs Sesudah" />
        </div>
      )}
      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

// ============================================================
// Kruskal-Wallis Result
// ============================================================
function KruskalResult({ r }) {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="H" value={num(r.H, 3)} accent="text-sky-600" />
        <Stat label="df" value={r.df} />
        <Stat label="p-value" value={pct(r.pValue)} accent={r.isSignificant ? 'text-green-600' : 'text-gray-700'} />
        <Stat label="Status" value={r.isSignificant ? 'Signifikan ✅' : 'Tidak signifikan'}
              accent={r.isSignificant ? 'text-green-600' : 'text-gray-700'} />
        <Stat label="N total" value={r.N} />
        <Stat label="k grup" value={r.k} />
        <Stat label="η² (eta²)" value={num(r.etaSquared, 3)} accent="text-sky-600" />
        <Stat label="Magnitude" value={r.effectSizeLabel} />
      </div>

      <h4 className="font-semibold mb-2">Statistik per Grup</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>{['Grup', 'n', 'Median', 'Mean Rank'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {r.groupStats.map((g, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-medium">{g.name}</td>
                <td className="px-3 py-2">{g.n}</td>
                <td className="px-3 py-2">{num(g.median, 2)}</td>
                <td className="px-3 py-2">{num(g.meanRank, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {r.groupValues && (
        <div className="mb-4">
          <BoxPlot groups={r.groupValues} title={`Boxplot: ${r.outcome} per ${r.grouping}`} yLabel={r.outcome} />
        </div>
      )}
      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

// ============================================================
// N-Gain (Hake) Result
// ============================================================
function NGainResult({ r }) {
  const sig = r.signifTest
  const totalKategori = r.distribusi.Tinggi + r.distribusi.Sedang + r.distribusi.Rendah
  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="N pasangan" value={r.n} />
        <Stat label="Skor Maks" value={r.maxScore} />
        <Stat
          label="Rata-rata N-Gain"
          value={num(r.nGainMean, 3)}
          accent={r.nGainMean >= 0.7 ? 'text-green-600' : r.nGainMean >= 0.3 ? 'text-amber-600' : 'text-red-600'}
        />
        <Stat
          label="Kategori Kelas"
          value={r.kategoriKelas}
          accent={r.kategoriKelas === 'Tinggi' ? 'text-green-600' : r.kategoriKelas === 'Sedang' ? 'text-amber-600' : 'text-red-600'}
        />
        <Stat label="SD N-Gain" value={num(r.nGainSD, 3)} />
        <Stat label="Min" value={num(r.nGainMin, 3)} />
        <Stat label="Max" value={num(r.nGainMax, 3)} />
        <Stat
          label="Efektivitas"
          value={`${num(r.efektivitasPersen, 2)}%`}
          accent="text-sky-600"
        />
      </div>

      {/* Tafsiran efektivitas */}
      <div className={`rounded-xl p-3 mb-4 text-sm border ${
        r.tafsiranEfektivitas === 'Efektif'        ? 'bg-green-50 border-green-200 text-green-800' :
        r.tafsiranEfektivitas === 'Cukup Efektif'  ? 'bg-sky-50 border-sky-200 text-sky-800' :
        r.tafsiranEfektivitas === 'Kurang Efektif' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                                     'bg-red-50 border-red-200 text-red-800'
      }`}>
        <strong>Tafsiran Efektivitas:</strong> {r.tafsiranEfektivitas} ({num(r.efektivitasPersen, 2)}%) ·
        kategori klasifikasi Hake (1998).
      </div>

      {/* Pre vs Post stats */}
      <h4 className="font-semibold mb-2">Statistik Pre-test vs Post-test</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>{['Variabel', 'Mean', 'SD', 'Min', 'Max'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-3 py-2 font-medium">Pre-test ({r.column1})</td>
              <td className="px-3 py-2">{num(r.preStats.mean, 2)}</td>
              <td className="px-3 py-2">{num(r.preStats.sd, 2)}</td>
              <td className="px-3 py-2">{num(r.preStats.min, 2)}</td>
              <td className="px-3 py-2">{num(r.preStats.max, 2)}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium">Post-test ({r.column2})</td>
              <td className="px-3 py-2">{num(r.postStats.mean, 2)}</td>
              <td className="px-3 py-2">{num(r.postStats.sd, 2)}</td>
              <td className="px-3 py-2">{num(r.postStats.min, 2)}</td>
              <td className="px-3 py-2">{num(r.postStats.max, 2)}</td>
            </tr>
            <tr className="bg-sky-50/50">
              <td className="px-3 py-2 font-medium">Rata-rata Selisih</td>
              <td className="px-3 py-2 font-bold text-sky-700" colSpan={4}>
                {num(r.postStats.mean - r.preStats.mean, 2)} poin
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Distribusi kategori */}
      <h4 className="font-semibold mb-2">Distribusi Kategori N-Gain</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>{['Kategori', 'Rentang', 'Jumlah', '%', 'Visualisasi'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { kat: 'Tinggi',  range: 'g ≥ 0.7',           color: 'bg-green-500' },
              { kat: 'Sedang',  range: '0.3 ≤ g < 0.7',     color: 'bg-amber-500' },
              { kat: 'Rendah',  range: 'g < 0.3',           color: 'bg-red-500' },
            ].map(({ kat, range, color }) => {
              const n = r.distribusi[kat] || 0
              const pct = totalKategori > 0 ? (n / totalKategori) * 100 : 0
              return (
                <tr key={kat}>
                  <td className="px-3 py-2 font-medium">{kat}</td>
                  <td className="px-3 py-2 text-gray-500">{range}</td>
                  <td className="px-3 py-2 font-bold">{n}</td>
                  <td className="px-3 py-2">{pct.toFixed(1)}%</td>
                  <td className="px-3 py-2">
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paired t-test signifikansi (kalau available) */}
      {sig && (
        <div className={`rounded-xl p-4 mb-4 border ${
          sig.significant ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
        }`}>
          <h4 className="font-semibold mb-2 text-sm">
            Uji Signifikansi (Paired t-test)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div><span className="text-gray-500">t:</span> <strong>{num(sig.t, 3)}</strong></div>
            <div><span className="text-gray-500">df:</span> <strong>{sig.df}</strong></div>
            <div><span className="text-gray-500">p-value:</span> <strong>{pct(sig.pValue)}</strong></div>
            <div><span className="text-gray-500">Cohen's d:</span> <strong>{num(sig.cohensD, 3)}</strong></div>
          </div>
          <p className="text-xs mt-2 text-gray-700">
            {sig.significant
              ? `✅ Peningkatan signifikan secara statistik (p < 0.05). Selisih rata-rata: ${num(sig.meanDiff, 2)} poin.`
              : `❌ Peningkatan TIDAK signifikan secara statistik (p ≥ 0.05). Selisih rata-rata: ${num(sig.meanDiff, 2)} poin.`
            }
          </p>
        </div>
      )}

      {/* Detail per individu (collapsible) */}
      <details className="border border-gray-200 rounded-xl overflow-hidden mb-4">
        <summary className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 cursor-pointer text-sm font-medium">
          Detail per Subjek ({r.pairs.length}) — klik untuk buka
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>{['No', 'Nama', 'Pre', 'Post', 'Gain', 'N-Gain', 'Kategori'].map(h =>
                <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {r.pairs.map((p, i) => (
                <tr key={i}>
                  <td className="px-3 py-1.5">{i + 1}</td>
                  <td className="px-3 py-1.5 font-medium">{p.name}</td>
                  <td className="px-3 py-1.5">{p.pre}</td>
                  <td className="px-3 py-1.5">{p.post}</td>
                  <td className={`px-3 py-1.5 ${p.gain > 0 ? 'text-green-600' : p.gain < 0 ? 'text-red-600' : ''}`}>
                    {p.gain > 0 ? '+' : ''}{p.gain}
                  </td>
                  <td className="px-3 py-1.5 font-bold">{num(p.nGain, 3)}</td>
                  <td className="px-3 py-1.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                      p.kategori === 'Tinggi' ? 'bg-green-100 text-green-700' :
                      p.kategori === 'Sedang' ? 'bg-amber-100 text-amber-700' :
                                                'bg-red-100 text-red-700'
                    }`}>{p.kategori}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <InterpBox>
        <strong>Interpretasi:</strong> Berdasarkan klasifikasi Hake (1998), rata-rata N-gain kelas
        sebesar <strong>{num(r.nGainMean, 3)}</strong> termasuk kategori <strong>{r.kategoriKelas}</strong>.
        Tingkat efektivitas pembelajaran/treatment mencapai <strong>{num(r.efektivitasPersen, 2)}%</strong> ({r.tafsiranEfektivitas}).
        Dari {r.n} subjek, terdapat {r.distribusi.Tinggi} ({r.distribusiPersen.Tinggi}%) kategori Tinggi,
        {' '}{r.distribusi.Sedang} ({r.distribusiPersen.Sedang}%) Sedang, dan
        {' '}{r.distribusi.Rendah} ({r.distribusiPersen.Rendah}%) Rendah.
        {sig && (sig.significant
          ? ` Uji paired t-test menunjukkan peningkatan signifikan (t = ${num(sig.t, 2)}, p ${sig.pValue < 0.001 ? '< 0.001' : `= ${num(sig.pValue, 3)}`}).`
          : ` Uji paired t-test belum menunjukkan peningkatan signifikan secara statistik (p = ${num(sig.pValue, 3)}).`
        )}
      </InterpBox>
    </div>
  )
}

// ============================================================
// Two-Way ANOVA Result
// ============================================================
function TwoWayANOVAResult({ r }) {
  if (r.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        <strong>Error:</strong> {r.error}
      </div>
    )
  }
  const verdict = (sig, name) => sig
    ? `✅ Pengaruh ${name} signifikan`
    : `❌ Pengaruh ${name} tidak signifikan`
  const fmtP = (p) => p === null ? '—' : (p < 0.001 ? '< 0.001' : num(p, 4))
  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="N total" value={r.N} />
        <Stat label={`Level ${r.nameA}`} value={r.levelsA.length} />
        <Stat label={`Level ${r.nameB}`} value={r.levelsB.length} />
        <Stat label="Grand Mean" value={num(r.grandMean, 3)} />
        <Stat
          label={`F ${r.nameA}`}
          value={num(r.factorA.F, 3)}
          accent={r.significantA ? 'text-green-600' : 'text-gray-500'}
        />
        <Stat
          label={`F ${r.nameB}`}
          value={num(r.factorB.F, 3)}
          accent={r.significantB ? 'text-green-600' : 'text-gray-500'}
        />
        <Stat
          label={`F ${r.nameA}×${r.nameB}`}
          value={num(r.interaction.F, 3)}
          accent={r.significantInteraction ? 'text-green-600' : 'text-gray-500'}
        />
        <Stat
          label="Desain"
          value={r.isBalanced ? 'Balanced' : 'Unbalanced'}
          accent={r.isBalanced ? 'text-green-600' : 'text-amber-600'}
        />
      </div>

      {/* Verdicts */}
      <div className={`rounded-xl p-3 mb-4 text-sm border ${
        r.significantInteraction ? 'bg-purple-50 border-purple-200 text-purple-900'
                                 : 'bg-gray-50 border-gray-200 text-gray-700'
      }`}>
        <strong>Ringkasan:</strong>
        <ul className="mt-1 space-y-0.5 list-disc list-inside">
          <li>{verdict(r.significantA, r.nameA)} (p = {fmtP(r.factorA.pValue)}, partial η² = {num(r.factorA.partialEtaSquared, 3)} · {r.factorA.effectSize})</li>
          <li>{verdict(r.significantB, r.nameB)} (p = {fmtP(r.factorB.pValue)}, partial η² = {num(r.factorB.partialEtaSquared, 3)} · {r.factorB.effectSize})</li>
          <li>{verdict(r.significantInteraction, `interaksi ${r.nameA}×${r.nameB}`)} (p = {fmtP(r.interaction.pValue)}, partial η² = {num(r.interaction.partialEtaSquared, 3)} · {r.interaction.effectSize})</li>
        </ul>
        {r.significantInteraction && (
          <p className="mt-2 text-xs italic">
            ⚠️ Karena interaksi signifikan, efek utama harus diinterpretasikan dengan hati-hati — efek satu faktor bergantung pada level faktor lain (lihat tabel cell means).
          </p>
        )}
      </div>

      {/* ANOVA table */}
      <h4 className="font-semibold mb-2">Tabel ANOVA</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>{['Source', 'SS', 'df', 'MS', 'F', 'p-value', 'partial η²', 'Effect'].map(h =>
              <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {r.anovaTable.map((row, i) => (
              <tr key={i} className={row.significant ? 'bg-green-50/40' : ''}>
                <td className="px-3 py-2 font-medium">{row.source}</td>
                <td className="px-3 py-2">{num(row.SS, 3)}</td>
                <td className="px-3 py-2">{row.df}</td>
                <td className="px-3 py-2">{row.MS === null ? '—' : num(row.MS, 3)}</td>
                <td className="px-3 py-2 font-bold">{row.F === null ? '—' : num(row.F, 3)}</td>
                <td className="px-3 py-2">{fmtP(row.pValue)}</td>
                <td className="px-3 py-2">{row.partialEtaSquared === null ? '—' : num(row.partialEtaSquared, 3)}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{row.effectSize || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cell means */}
      <h4 className="font-semibold mb-2">Cell Means ({r.nameA} × {r.nameB})</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>{[r.nameA, r.nameB, 'n', 'Mean', 'SD'].map(h =>
              <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {r.cellTable.map((c, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-medium">{c.levelA}</td>
                <td className="px-3 py-2 font-medium">{c.levelB}</td>
                <td className="px-3 py-2">{c.n}</td>
                <td className="px-3 py-2 font-bold">{num(c.mean, 3)}</td>
                <td className="px-3 py-2">{num(c.sd, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!r.isBalanced && (
          <p className="text-xs text-amber-700 mt-2">
            ⚠️ Desain unbalanced (n sel: {r.cellSizesRange.min}–{r.cellSizesRange.max}). F-test menggunakan pendekatan cell-means (mendekati Type III). Untuk inference ketat, verifikasi di R/SPSS.
          </p>
        )}
      </div>

      {/* Marginal means */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="font-semibold mb-2 text-sm">Marginal Means: {r.nameA}</h4>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Level</th><th className="px-3 py-2 text-left">n</th><th className="px-3 py-2 text-left">Mean</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {r.marginalA.map((m, i) => (
                <tr key={i}><td className="px-3 py-2 font-medium">{m.level}</td><td className="px-3 py-2">{m.n}</td><td className="px-3 py-2 font-bold">{num(m.mean, 3)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-sm">Marginal Means: {r.nameB}</h4>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Level</th><th className="px-3 py-2 text-left">n</th><th className="px-3 py-2 text-left">Mean</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {r.marginalB.map((m, i) => (
                <tr key={i}><td className="px-3 py-2 font-medium">{m.level}</td><td className="px-3 py-2">{m.n}</td><td className="px-3 py-2 font-bold">{num(m.mean, 3)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InterpBox>
        <strong>Interpretasi:</strong> Two-way ANOVA pada outcome <strong>{r.outcome}</strong> dengan
        faktor <strong>{r.nameA}</strong> ({r.levelsA.length} level) dan <strong>{r.nameB}</strong> ({r.levelsB.length} level).
        {' '}Efek utama {r.nameA}: F({r.factorA.df}, {r.residual.df}) = {num(r.factorA.F, 2)}, p {r.factorA.pValue < 0.001 ? '< 0.001' : `= ${num(r.factorA.pValue, 3)}`} ({r.significantA ? 'signifikan' : 'tidak signifikan'}).
        {' '}Efek utama {r.nameB}: F({r.factorB.df}, {r.residual.df}) = {num(r.factorB.F, 2)}, p {r.factorB.pValue < 0.001 ? '< 0.001' : `= ${num(r.factorB.pValue, 3)}`} ({r.significantB ? 'signifikan' : 'tidak signifikan'}).
        {' '}Interaksi {r.nameA}×{r.nameB}: F({r.interaction.df}, {r.residual.df}) = {num(r.interaction.F, 2)}, p {r.interaction.pValue < 0.001 ? '< 0.001' : `= ${num(r.interaction.pValue, 3)}`} ({r.significantInteraction ? 'signifikan' : 'tidak signifikan'}).
      </InterpBox>
    </div>
  )
}

// ============================================================
// Export utilities (Excel + PDF)
// ============================================================
function exportToExcel(result) {
  const wb = XLSX.utils.book_new()
  let ws

  if (result.type === 'descriptive') {
    ws = XLSX.utils.json_to_sheet(result.stats.map(s => ({
      Variabel: s.column, N: s.n, Mean: s.mean, Median: s.median,
      Modus: s.mode, SD: s.stdDev, Variance: s.variance,
      Min: s.min, Max: s.max, Skewness: s.skewness, Kurtosis: s.kurtosis,
    })))
  } else {
    // generic flat object
    const flat = flatten(result)
    ws = XLSX.utils.json_to_sheet([flat])
  }

  XLSX.utils.book_append_sheet(wb, ws, result.toolName?.slice(0, 30) || 'Hasil')
  XLSX.writeFile(wb, `${result.tool}_${Date.now()}.xlsx`)
}

function flatten(obj, prefix = '') {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key))
    } else if (Array.isArray(v)) {
      out[key] = JSON.stringify(v)
    } else {
      out[key] = v
    }
  }
  return out
}

// ============================================================
// PDF Export — formatted dengan tabel & chart embed
// ============================================================
async function exportToPDF(result, containerEl) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210, pageH = 297
  const mx = 18                 // margin x
  const myTop = 18              // margin top
  const myBot = 18              // margin bottom
  const contentW = pageW - 2 * mx
  const state = { y: myTop }

  // ---------- low-level helpers ----------
  const setFont = (size, style = 'normal', color = [40, 40, 40]) => {
    doc.setFontSize(size); doc.setFont('helvetica', style); doc.setTextColor(...color)
  }
  const ensureSpace = (need) => {
    if (state.y + need > pageH - myBot) { doc.addPage(); state.y = myTop }
  }
  const writeText = (text, opts = {}) => {
    const { size = 10, style = 'normal', color = [40, 40, 40], indent = 0, leading = 4.6, align = 'left' } = opts
    setFont(size, style, color)
    const lines = doc.splitTextToSize(String(text ?? '—'), contentW - indent)
    ensureSpace(lines.length * leading)
    if (align === 'center') {
      // Render line-by-line agar tiap baris benar-benar center secara horizontal
      lines.forEach((line, i) => {
        doc.text(String(line), pageW / 2, state.y + i * leading, { align: 'center' })
      })
    } else {
      doc.text(lines, mx + indent, state.y)
    }
    state.y += lines.length * leading
  }
  const hr = (gap = 3) => {
    ensureSpace(gap + 1)
    doc.setDrawColor(220); doc.setLineWidth(0.2)
    doc.line(mx, state.y, pageW - mx, state.y); state.y += gap
  }
  const sectionTitle = (text) => {
    state.y += 2
    ensureSpace(8)
    setFont(7.5, 'bold', [120, 120, 120])
    doc.text(String(text).toUpperCase(), mx, state.y, { charSpace: 0.4 }); state.y += 5
  }

  // ---------- table renderer ----------
  // columns: [{ key, label, width? }]; rows: array of objects
  const drawTable = (columns, rows, opts = {}) => {
    const { headerBg = [245, 245, 245], rowH = 6, headerH = 7, fontSize = 8.5 } = opts
    const totalDeclaredW = columns.reduce((s, c) => s + (c.width || 0), 0)
    const remaining = contentW - totalDeclaredW
    const flexCols = columns.filter(c => !c.width).length || 1
    const flexW = remaining / flexCols
    const widths = columns.map(c => c.width || flexW)

    const drawHeader = () => {
      doc.setFillColor(...headerBg)
      doc.rect(mx, state.y, contentW, headerH, 'F')
      setFont(fontSize, 'bold', [60, 60, 60])
      let x = mx + 2
      columns.forEach((c, i) => {
        doc.text(c.label, x, state.y + headerH - 2.4)
        x += widths[i]
      })
      state.y += headerH
      doc.setDrawColor(220)
      doc.line(mx, state.y, pageW - mx, state.y)
    }

    ensureSpace(headerH + rowH)
    drawHeader()

    rows.forEach((row, ri) => {
      ensureSpace(rowH)
      if (state.y === myTop) drawHeader() // header on new page
      if (ri % 2 === 1) {
        doc.setFillColor(252, 252, 252)
        doc.rect(mx, state.y, contentW, rowH, 'F')
      }
      setFont(fontSize, 'normal', [40, 40, 40])
      let x = mx + 2
      columns.forEach((c, i) => {
        const raw = row[c.key]
        const txt = typeof raw === 'number' && !Number.isInteger(raw) ? raw.toFixed(c.digits ?? 3) : (raw ?? '—')
        const truncated = doc.splitTextToSize(String(txt), widths[i] - 2)[0]
        doc.text(String(truncated), x, state.y + rowH - 2)
        x += widths[i]
      })
      state.y += rowH
    })
    doc.setDrawColor(220)
    doc.line(mx, state.y, pageW - mx, state.y)
    state.y += 3
  }

  // ---------- key-value summary ----------
  const drawKVGrid = (pairs) => {
    // Layout 2 columns
    const colW = contentW / 2
    const rowH = 5.5
    const padding = 1.5
    setFont(8.5, 'normal', [40, 40, 40])
    for (let i = 0; i < pairs.length; i += 2) {
      ensureSpace(rowH + 0.5)
      const left = pairs[i], right = pairs[i + 1]
      // left
      setFont(7.5, 'normal', [140, 140, 140])
      doc.text(String(left[0]).toUpperCase(), mx, state.y)
      if (right) doc.text(String(right[0]).toUpperCase(), mx + colW, state.y)
      setFont(9.5, 'bold', [40, 40, 40])
      doc.text(formatVal(left[1]), mx, state.y + 4.5)
      if (right) doc.text(formatVal(right[1]), mx + colW, state.y + 4.5)
      state.y += rowH + 4
    }
    state.y += 1
  }

  const formatVal = (v) => {
    if (v === null || v === undefined) return '—'
    if (typeof v === 'number') {
      if (Math.abs(v) < 0.001 && v !== 0) return v.toExponential(2)
      if (Number.isInteger(v)) return String(v)
      return v.toFixed(3)
    }
    return String(v).slice(0, 30)
  }

  // ============================================================
  // Header (centered branding + title)
  // ============================================================
  setFont(8, 'normal', [150, 150, 150])
  doc.text('zoya.id · Modul Statistik', pageW / 2, state.y, { align: 'center' }); state.y += 5
  setFont(15, 'bold', [30, 30, 30])
  doc.text(result.toolName || 'Hasil Analisis', pageW / 2, state.y, { align: 'center' }); state.y += 5
  setFont(8, 'normal', [120, 120, 120])
  doc.text(`${result.sampleSize ?? '—'} sampel · ${result.analyzedAt || new Date().toLocaleString('id-ID')}`,
           pageW / 2, state.y, { align: 'center' })
  state.y += 4
  hr(4)

  // ============================================================
  // Per-tool body
  // ============================================================
  buildPdfBody(result, { drawTable, writeText, sectionTitle, drawKVGrid, ensureSpace, hr })

  // ============================================================
  // Interpretation
  // ============================================================
  const interp = result.interpretation || result.reliability?.interpretation
  if (interp) {
    sectionTitle('Interpretasi')
    writeText(interp, { size: 9.5, leading: 4.7, align: 'center' })
    state.y += 3
  }

  if (result.aiInterpretation) {
    sectionTitle('Interpretasi AI (akademik)')
    writeText(result.aiInterpretation, { size: 9.5, leading: 4.7, align: 'center' })
    state.y += 3
  }

  // ============================================================
  // Charts (capture SVGs from container)
  // ============================================================
  if (containerEl) {
    // Filter SVG agar HANYA chart (visualisasi data) yang ke-embed.
    // Lucide icons biasanya 16-32px → di-skip. Chart biasanya ≥ 200px.
    const allSvgs = Array.from(containerEl.querySelectorAll('svg'))
    const svgs = allSvgs.filter(svg => {
      const rect = svg.getBoundingClientRect()
      const vbW = svg.viewBox?.baseVal?.width || 0
      const vbH = svg.viewBox?.baseVal?.height || 0
      const w = Math.max(rect.width, vbW)
      const h = Math.max(rect.height, vbH)
      // Chart minimum 200×100. Skip kalau lebih kecil (likely icon).
      // Juga skip kalau ada class `lucide` (icon library).
      if (svg.classList?.contains('lucide')) return false
      if (Array.from(svg.classList || []).some(c => /icon/i.test(c))) return false
      return w >= 200 && h >= 100
    })
    if (svgs.length > 0) {
      sectionTitle('Visualisasi')
      for (const svg of svgs) {
        try {
          const { dataUrl, w, h } = await svgToPng(svg)
          const aspect = h / w
          const targetW = Math.min(contentW, 170)
          const targetH = targetW * aspect
          ensureSpace(targetH + 4)
          doc.addImage(dataUrl, 'PNG', mx, state.y, targetW, targetH)
          state.y += targetH + 5
        } catch (err) {
          console.warn('Skip chart:', err)
        }
      }
    }
  }

  // ============================================================
  // Footer (page number)
  // ============================================================
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    setFont(7.5, 'normal', [160, 160, 160])
    doc.text(`Halaman ${i} dari ${total}`, pageW / 2, pageH - 8, { align: 'center' })
    doc.text(new Date().toLocaleDateString('id-ID'), pageW - mx, pageH - 8, { align: 'right' })
    doc.text('zoya.id', mx, pageH - 8)
  }

  doc.save(`${result.tool}_${Date.now()}.pdf`)
}

// ============================================================
// Per-tool PDF body builder
// ============================================================
function buildPdfBody(r, ctx) {
  const { drawTable, writeText, sectionTitle, drawKVGrid } = ctx

  if (r.type === 'descriptive') {
    sectionTitle('Statistik Deskriptif')
    drawTable(
      [
        { key: 'column', label: 'Variabel', width: 32 },
        { key: 'n', label: 'N' },
        { key: 'mean', label: 'Mean' },
        { key: 'median', label: 'Median' },
        { key: 'stdDev', label: 'SD' },
        { key: 'variance', label: 'Var' },
        { key: 'min', label: 'Min' },
        { key: 'max', label: 'Max' },
        { key: 'skewness', label: 'Skew' },
        { key: 'kurtosis', label: 'Kurt' },
      ],
      r.stats
    )
  }

  else if (r.type === 'normality') {
    sectionTitle('Uji Normalitas')
    drawTable(
      [
        { key: 'column', label: 'Variabel', width: 35 },
        { key: 'method', label: 'Metode', width: 35 },
        { key: 'stat', label: 'Statistik' },
        { key: 'pValue', label: 'p-value', digits: 4 },
        { key: 'status', label: 'Status' },
      ],
      r.results.map(row => ({
        ...row,
        stat: row.W ?? row.D,
        status: row.isNormal ? 'Normal' : 'Tidak Normal',
      }))
    )
  }

  else if (r.type === 'correlation') {
    sectionTitle('Ringkasan')
    drawKVGrid([
      ['Metode', r.method === 'spearman' ? 'Spearman' : 'Pearson'],
      ['n', r.n],
      ['r / ρ', r.r ?? r.rho],
      ['p-value', r.pValue],
      ['t', r.t],
      ['df', r.df],
      ['Kekuatan', r.strength],
      ['Arah', r.direction],
    ])
  }

  else if (r.type === 'ttest') {
    sectionTitle('Ringkasan')
    drawKVGrid([
      ['Test', r.test || r.mode],
      ['t', r.t],
      ['df', typeof r.df === 'number' ? r.df.toFixed(2) : r.df],
      ['p-value', r.pValue],
      ['Cohen\u2019s d', r.cohensD],
      ['Effect size', r.effectSize],
      ['Signifikan?', r.significant ? 'Ya' : 'Tidak'],
      ['95% CI', r.ci95 ? `[${r.ci95[0]?.toFixed(3)}, ${r.ci95[1]?.toFixed(3)}]` : '—'],
    ])
    if (r.mode === 'independent' && r.group1) {
      sectionTitle('Statistik per Grup')
      drawTable(
        [
          { key: 'name', label: 'Grup', width: 60 },
          { key: 'n', label: 'n' },
          { key: 'mean', label: 'Mean' },
          { key: 'sd', label: 'SD' },
        ],
        [
          { name: r.groupNames?.[0] ?? 'A', n: r.group1.n, mean: r.group1.mean, sd: r.group1.sd },
          { name: r.groupNames?.[1] ?? 'B', n: r.group2.n, mean: r.group2.mean, sd: r.group2.sd },
        ]
      )
    }
  }

  else if (r.type === 'anova') {
    sectionTitle('Ringkasan ANOVA')
    drawKVGrid([
      ['F', r.F],
      ['df between', r.dfBetween],
      ['df within', r.dfWithin],
      ['p-value', r.pValue],
      ['η² (eta-squared)', r.etaSquared],
      ['ω² (omega-squared)', r.omegaSquared],
      ['Signifikan?', r.significant ? 'Ya' : 'Tidak'],
      ['N total', r.N],
    ])
    if (r.groupStats) {
      sectionTitle('Statistik per Grup')
      drawTable(
        [
          { key: 'label', label: 'Grup', width: 50 },
          { key: 'n', label: 'n' },
          { key: 'mean', label: 'Mean' },
          { key: 'sd', label: 'SD' },
        ],
        r.groupStats
      )
    }
  }

  else if (r.type === 'regression_simple') {
    sectionTitle('Ringkasan Regresi')
    drawKVGrid([
      ['R²', r.rSquared],
      ['Adj. R²', r.adjustedR2],
      ['F', r.F],
      ['p (F)', r.pF],
      ['β (standardized)', r.standardizedBeta],
      ['SE estimate', r.standardErrorOfEstimate],
      ['Signifikan?', r.significant ? 'Ya' : 'Tidak'],
      ['N', r.n],
    ])
    sectionTitle('Koefisien')
    drawTable(
      [{ key: 'name', label: 'Koefisien', width: 50 }, { key: 'b', label: 'b' },
       { key: 'se', label: 'SE' }, { key: 't', label: 't' }, { key: 'p', label: 'p', digits: 4 }],
      [
        { name: 'Intercept (b₀)', b: r.intercept, se: r.intercept_se, t: r.intercept_t, p: r.intercept_p },
        { name: `Slope (${r.x})`,  b: r.slope,    se: r.slope_se,    t: r.slope_t,    p: r.slope_p },
      ]
    )
    writeText(`Persamaan: ${r.equation}`, { size: 9, style: 'italic' })
  }

  else if (r.type === 'regression_multiple') {
    sectionTitle('Ringkasan Regresi Berganda')
    drawKVGrid([
      ['R²', r.rSquared], ['Adj. R²', r.adjustedR2],
      ['F', r.F], ['p (F)', r.pF],
      ['SE estimate', r.standardErrorOfEstimate], ['N', r.n],
    ])
    sectionTitle('Koefisien')
    drawTable(
      [{ key: 'name', label: 'Variabel', width: 50 }, { key: 'b', label: 'b' },
       { key: 'se', label: 'SE' }, { key: 't', label: 't' }, { key: 'p', label: 'p', digits: 4 }],
      r.coefficients
    )
    if (r.vifs?.length) {
      sectionTitle('VIF')
      drawTable(
        [{ key: 'predictor', label: 'Predictor', width: 80 }, { key: 'vif', label: 'VIF' }],
        r.vifs
      )
    }
    writeText(`Persamaan: ${r.equation}`, { size: 9, style: 'italic' })
  }

  else if (r.type === 'chisquare') {
    sectionTitle('Ringkasan Chi-Square')
    drawKVGrid([
      ['χ²', r.chi2], ['df', r.df],
      ['p-value', r.pValue], ['N', r.N],
      ['Cramer\u2019s V', r.cramersV], ['Effect size', r.effectSizeLabel],
      ['Signifikan?', r.isSignificant ? 'Ya' : 'Tidak'],
      r.phi !== null ? ['Phi (φ)', r.phi] : ['Asumsi', r.assumptionWarning ? 'Pelanggaran' : 'Terpenuhi'],
    ])
    sectionTitle(`Tabel kontingensi: ${r.var1} × ${r.var2}`)
    const cols = [{ key: '_row', label: r.var1, width: 30 }, ...r.colLabels.map(c => ({ key: c, label: c }))]
    const rows = r.observed.map((row, i) => {
      const obj = { _row: r.rowLabels[i] }
      r.colLabels.forEach((c, j) => { obj[c] = row[j] })
      return obj
    })
    drawTable(cols, rows)
  }

  else if (r.type === 'mannwhitney') {
    sectionTitle('Ringkasan Mann-Whitney U')
    drawKVGrid([
      ['U', r.U], ['z', r.z],
      ['p-value', r.pValue], ['N total', r.N],
      ['Effect size r', r.effectSize], ['Magnitude', r.effectSizeLabel],
      ['Signifikan?', r.isSignificant ? 'Ya' : 'Tidak'],
    ])
    sectionTitle('Statistik per Grup')
    drawTable(
      [{ key: 'name', label: 'Grup', width: 50 }, { key: 'n', label: 'n' },
       { key: 'meanRank', label: 'Mean Rank' }, { key: 'sumRank', label: 'Sum Rank' }],
      [
        { name: r.groupNames[0], n: r.n1, meanRank: r.meanRank1, sumRank: r.R1 },
        { name: r.groupNames[1], n: r.n2, meanRank: r.meanRank2, sumRank: r.R2 },
      ]
    )
  }

  else if (r.type === 'wilcoxon') {
    sectionTitle('Ringkasan Wilcoxon')
    drawKVGrid([
      ['W', r.W], ['z', r.z],
      ['p-value', r.pValue], ['N pasangan', r.n],
      ['W+', r.Wpos], ['W−', r.Wneg],
      ['Mean diff', r.meanDiff], ['Effect size r', r.effectSize],
    ])
  }

  else if (r.type === 'kruskal') {
    sectionTitle('Ringkasan Kruskal-Wallis')
    drawKVGrid([
      ['H', r.H], ['df', r.df],
      ['p-value', r.pValue], ['η²', r.etaSquared],
      ['N total', r.N], ['k grup', r.k],
      ['Signifikan?', r.isSignificant ? 'Ya' : 'Tidak'],
      ['Magnitude', r.effectSizeLabel],
    ])
    sectionTitle('Statistik per Grup')
    drawTable(
      [{ key: 'name', label: 'Grup', width: 50 }, { key: 'n', label: 'n' },
       { key: 'median', label: 'Median' }, { key: 'meanRank', label: 'Mean Rank' }],
      r.groupStats
    )
  }

  else if (r.type === 'validity_reliability') {
    sectionTitle('Reliabilitas (Cronbach\u2019s α)')
    drawKVGrid([
      ['Cronbach\u2019s α', r.reliability.alpha],
      ['Status', r.reliability.alpha >= 0.7 ? 'Reliabel' : 'Kurang Reliabel'],
      ['k item', r.reliability.k],
      ['n responden', r.reliability.n],
    ])
    sectionTitle('Validitas Item')
    drawTable(
      [{ key: 'name', label: 'Item', width: 50 },
       { key: 'r', label: 'r' }, { key: 'p', label: 'p', digits: 4 },
       { key: 'alphaIfDeleted', label: 'α-if-del' },
       { key: 'verdict', label: 'Verdict' }],
      r.validity.items.map((it, i) => ({
        name: r.items[i],
        r: it.r,
        p: it.pValue,
        alphaIfDeleted: r.reliability.itemStats?.[i]?.alphaIfDeleted,
        verdict: it.verdict,
      }))
    )
  }
}

// ============================================================
// SVG → PNG (untuk embed ke PDF)
// ============================================================
async function svgToPng(svg) {
  // Clone & inline computed styles agar render konsisten
  const cloned = svg.cloneNode(true)
  cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  // Pastikan background putih (default SVG transparent)
  const bbox = svg.getBoundingClientRect()
  const w = Math.max(svg.viewBox?.baseVal?.width || bbox.width || 480, 100)
  const h = Math.max(svg.viewBox?.baseVal?.height || bbox.height || 280, 100)

  const xml = new XMLSerializer().serializeToString(cloned)
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)

  const img = new Image()
  img.crossOrigin = 'anonymous'
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = (e) => reject(new Error('Gagal load SVG sebagai image'))
    img.src = dataUrl
  })

  const scale = 2 // retina
  const canvas = document.createElement('canvas')
  canvas.width = w * scale
  canvas.height = h * scale
  const cx = canvas.getContext('2d')
  cx.fillStyle = '#fff'
  cx.fillRect(0, 0, canvas.width, canvas.height)
  cx.drawImage(img, 0, 0, canvas.width, canvas.height)

  return { dataUrl: canvas.toDataURL('image/png'), w, h }
}

export default Statistik

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Upload, FileSpreadsheet, CheckCircle,
  Download, FileType, File as FileIcon, AlertCircle,
  BookOpen, X,
  ArrowRight, RotateCcw, AlertTriangle,
  Filter, Check, HelpCircle,
} from 'lucide-react'
import { STATISTIK_SUBNAV } from '../lib/statistikNav'
import { parseExcelFile, getColumnNames } from '../utils/excelHelper'

import { getCurrentUser } from '../lib/auth'
import { getWallet, deductWalletAndCreateOrder } from '../lib/wallet'
import { trackEvent } from '../lib/analytics'
import { calculateStatisticsPrice, getStatisticsPriceWithDiscount, formatIDR } from '../lib/pricing'
import PriceDisplay from '../components/PriceDisplay'
import { saveOrder, generateOrderId } from '../lib/orders'
import ConfirmPaymentModal from '../components/ConfirmPaymentModal'
import { toast } from '../lib/toast'
import { generateInterpretation } from '../lib/ai/interpretStats'
import { saveAnalysis } from '../lib/savedAnalyses'
import DataCleanerModal from '../components/DataCleanerModal'
import ExampleDatasetPicker from '../components/ExampleDatasetPicker'
import MethodologyPanel from '../components/MethodologyPanel'
import Modal from '../components/Modal'
import AssumptionsPanel from '../components/AssumptionsPanel'
import PageHeader from '../components/PageHeader'
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts'
import { datasetToParsed } from '../lib/exampleDatasets'
import StatistikFlow from '../components/statistik/StatistikFlow'
// NOTE: GuidedWizardModal & floating "Pandu" button removed — tab "Panduan"
// (/statistik/start) now is the single entry point for the analysis picker.
import {
  DescriptiveResult, NormalityResult, CorrelationResult, TTestResult,
  ValidityResult, ANOVAResult, SimpleRegressionResult, MultipleRegressionResult,
  ChiSquareResult, MannWhitneyResult, WilcoxonResult, KruskalResult,
  NGainResult, TwoWayANOVAResult
} from '../components/statistik/ResultCards'
import ExportActions from '../components/statistik/ExportActions'
import ContextualWriter from '../components/statistik/ContextualWriter'
import StatEducation from '../components/statistik/StatEducation'
import MessyDataBanner from '../components/statistik/MessyDataBanner'
import { preprocessMessyData } from '../lib/messyDataPreprocessor'
import { exportToExcel } from '../lib/export/excelExport'
import { exportToPDF } from '../lib/export/pdfExport'
import {
  describeAdapter as describe, formatDescriptive,
  normalityAdapter as testNormality,
  pearsonAdapter as pearsonCorrelation, spearmanAdapter as spearmanCorrelation,
  cronbachAdapter as cronbachAlpha, itemValidity,
  oneSampleTTestAdapter as oneSampleTTest, independentTTestAdapter as independentTTest, pairedTTestAdapter as pairedTTest,
  oneWayANOVAAdapter as oneWayANOVA,
  simpleRegressionAdapter as simpleLinearRegression,
  twoWayANOVAAdapter as twoWayANOVA,
  multipleLinearRegressionAdapter as multipleLinearRegression,
  mannWhitneyAdapter as mannWhitneyU, wilcoxonAdapter as wilcoxonSignedRank, kruskalWallisAdapter as kruskalWallis,
  analyzeNGain,
  chiSquareIndependence,
  splitByGroup,
} from '../lib/statistics'
import { wilcoxonSignedRank as wilcoxonBackend, mannWhitneyU as mannWhitneyBackend, analyzeNGain as ngainBackend,
  pearsonCorrelationBackend, spearmanCorrelationBackend,
  oneSampleTTestBackend, pairedTTestBackend, independentTTestBackend,
  normalityBackend, anOVABackend, twoWayANOVABackend,
  chiSquareBackend, validityBackend, reliabilityBackend,
  kruskalWallisBackend, regressionBackend, regressionMultipleBackend
} from '../lib/stats/backend.js'

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

  // Keyboard shortcuts: / → focus search
  useKeyboardShortcuts()

  // Auto-redirect DISABLED — show /statistik directly with analysis choices
  // Users can access /statistik/start manually if they want guided tour
  useEffect(() => {
    // Set onboarded flag so future visits skip redirect
    localStorage.setItem('statistik_onboarded', '1')
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
  const [rawRows, setRawRows] = useState(null) // for messy data detection

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
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result
        const jsonData = await parseExcelFile(arrayBuffer, uploadedFile.name)
        if (!jsonData.length) throw new Error('File kosong (tidak ada baris data)')

        // Store raw rows for messy data detection
        setRawRows(jsonData)
        setFile(uploadedFile)

        // First row = headers
        const rawHeaders = Array.isArray(jsonData[0]) ? jsonData[0] : Object.values(jsonData[0])
        const headers = rawHeaders
          .map((h, i) => {
            const str = String(h ?? '').trim()
            if (str === '' || str === 'undefined' || str.startsWith('Unnamed:')) return null
            return { original: i, clean: str }
          })
          .filter(Boolean)
        if (!headers.length) throw new Error('File tidak punya header yang valid')

        // Cek duplikat header
        const seen = new Set()
        const dupes = headers.filter(h => seen.has(h.clean) || (seen.add(h.clean), false))
        if (dupes.length) throw new Error(`Header duplikat: ${dupes.map(d => d.clean).join(', ')}. Beri nama kolom yang unik.`)

        // Build column-oriented data
        const parsed = {}
        headers.forEach(({ original, clean }) => {
          parsed[clean] = jsonData.slice(1).map(row => {
            const v = Array.isArray(row) ? row[original] : Object.values(row)[original]
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
        const nRows = jsonData.length - 1
        const keepRowIdx = []
        for (let i = 0; i < nRows; i++) {
          const allNull = headers.every(h => parsed[h.clean][i] === null)
          if (!allNull) keepRowIdx.push(i)
        }
        if (!keepRowIdx.length) throw new Error('Semua baris kosong — tidak ada data untuk dianalisis')

        const cleaned = {}
        headers.forEach(({ clean }) => { cleaned[clean] = keepRowIdx.map(i => parsed[clean][i]) })

        setColumns(headers.map(h => h.clean))
        setData(cleaned)
        setFilterColumn('')
        setFilterValues([])
        setCleaningReport(null)
      } catch (err) {
        setError('Gagal parse file: ' + err.message)
        toast.error('Gagal upload: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(uploadedFile)
    e.target.value = ''
  }, [])

  // Paste CSV/TSV data dari clipboard
  const handlePasteData = useCallback((text) => {
    if (!text || !text.trim()) return
    try {
      // Detect delimiter: tab vs comma
      const firstLine = text.trim().split('\n')[0]
      const delimiter = firstLine.includes('\t') ? '\t' : ','
      
      const lines = text.trim().split('\n').filter(l => l.trim())
      if (lines.length < 2) throw new Error('Minimal 2 baris: 1 header + 1 data')
      
      const rawHeaders = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''))
      if (rawHeaders.length < 1) throw new Error('Tidak ada header')
      
      // Clean headers
      const headers = rawHeaders.map((h, i) => {
        if (!h || h === 'undefined' || h.startsWith('Unnamed:')) return null
        return { original: i, clean: h }
      }).filter(Boolean)
      
      if (!headers.length) throw new Error('Header tidak valid')
      
      // Check dupes
      const seen = new Set()
      for (const h of headers) {
        if (seen.has(h.clean)) throw new Error(`Header duplikat: ${h.clean}`)
        seen.add(h.clean)
      }
      
      // Parse rows
      const dataRows = lines.slice(1).map(line => {
        const vals = []
        let current = ''
        let inQuotes = false
        for (const ch of line) {
          if (ch === '"') { inQuotes = !inQuotes; continue }
          if (ch === delimiter && !inQuotes) { vals.push(current.trim()); current = '' }
          else current += ch
        }
        vals.push(current.trim())
        return vals
      })
      
      // Build column-oriented data (same format as parseExcelFile)
      const parsed = {}
      headers.forEach(({ original, clean }) => {
        parsed[clean] = dataRows.map(row => {
          const v = row[original] ?? ''
          if (v === '' || v === null || v === undefined) return null
          const trimmed = String(v).trim().replace(/^"|"$/g, '')
          if (trimmed === '') return null
          const num = Number(trimmed)
          return isNaN(num) ? trimmed : num
        })
      })
      
      // Drop fully-null rows
      const nRows = dataRows.length
      const keepIdx = []
      for (let i = 0; i < nRows; i++) {
        if (!headers.every(h => parsed[h.clean][i] === null)) keepIdx.push(i)
      }
      if (!keepIdx.length) throw new Error('Semua baris kosong')
      
      const cleaned = {}
      headers.forEach(({ clean }) => { cleaned[clean] = keepIdx.map(i => parsed[clean][i]) })
      
      setFile({ name: 'data-paste.csv' })
      setColumns(headers.map(h => h.clean))
      setData(cleaned)
      setResult(null)
      setError(null)
      setFilterColumn('')
      setFilterValues([])
      setCleaningReport(null)
      toast.success(`${keepIdx.length} baris, ${headers.length} kolom berhasil diparse`)
    } catch (err) {
      setError('Gagal parse data: ' + err.message)
      toast.error('Gagal parse: ' + err.message)
    }
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
      navigate('/statistik?tool=' + dataset.recommendedTool)
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
  const runAnalysis = async ({ paidAmount = 0, paymentMethod = 'free' } = {}) => {
    if (!data) return
    // Re-validate params (guard against race conditions)
    const validationError = validateParams()
    if (validationError) {
      toast.error(validationError)
      setAnalyzing(false)
      return
    }
    setAnalyzing(true)
    setError(null)

    setTimeout(async () => {
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
          const results = await Promise.all(params.columns.map(async col => {
            let r
            try {
              r = await normalityBackend(data[col])
            } catch {
              r = testNormality(data[col], 0.05)
            }
            return { column: col, values: data[col].filter(v => typeof v === 'number' && !isNaN(v)), ...r }
          }))
          analysisResult = { type: 'normality', results }
        }
        else if (activeTool === 'korelasi') {
          let r
          if (params.method === 'spearman') {
            try { r = await spearmanCorrelationBackend(data[params.x], data[params.y]) } catch { r = spearmanCorrelation(data[params.x], data[params.y]) }
          } else {
            try { r = await pearsonCorrelationBackend(data[params.x], data[params.y]) } catch { r = pearsonCorrelation(data[params.x], data[params.y]) }
          }
          analysisResult = { type: 'correlation', method: params.method || 'pearson', x: params.x, y: params.y, xValues: data[params.x], yValues: data[params.y], ...r }
        }
        else if (activeTool === 'ttest') {
          if (params.mode === 'oneSample') {
            let r
            try { r = await oneSampleTTestBackend(data[params.column1], Number(params.mu0)) } catch { r = oneSampleTTest(data[params.column1], Number(params.mu0)) }
            analysisResult = { type: 'ttest', mode: 'oneSample', column: params.column1, values: data[params.column1], mu0: Number(params.mu0), ...r }
          } else if (params.mode === 'paired') {
            let r
            try { r = await pairedTTestBackend(data[params.column1], data[params.column2]) } catch { r = pairedTTest(data[params.column1], data[params.column2]) }
            analysisResult = { type: 'ttest', mode: 'paired', column1: params.column1, column2: params.column2, beforeValues: data[params.column1], afterValues: data[params.column2], ...r }
          } else {
            // independent — split by grouping
            const { groups, keys: groupKeys } = splitByGroup(data[params.column1], data[params.grouping], { numericOnly: false })
            if (groupKeys.length !== 2) {
              throw new Error(`Independent t-test butuh 2 grup, ditemukan ${groupKeys.length}: ${groupKeys.join(', ')}`)
            }
            let r
            try { r = await independentTTestBackend(groups[groupKeys[0]], groups[groupKeys[1]]) } catch { r = independentTTest(groups[groupKeys[0]], groups[groupKeys[1]]) }
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
          let validity
          try { validity = await validityBackend(matrix) } catch { validity = itemValidity(matrix) }
          let reliability
          try { reliability = await reliabilityBackend(matrix) } catch { reliability = cronbachAlpha(matrix) }
          analysisResult = {
            type: 'validity_reliability',
            items: params.items,
            validity, reliability,
          }
        }
        else if (activeTool === 'anova') {
          const { groups, keys: groupKeys } = splitByGroup(data[params.outcome], data[params.grouping], { numericOnly: false })
          if (groupKeys.length < 2) throw new Error('Butuh minimal 2 grup')
          let r
          try { r = await anOVABackend(groupKeys.map(k => groups[k]), groupKeys) } catch { r = oneWayANOVA(groupKeys.map(k => groups[k]), groupKeys) }
          analysisResult = { type: 'anova', outcome: params.outcome, grouping: params.grouping,
            groupValues: groupKeys.map(k => ({ name: k, values: groups[k] })), ...r }
        }
        else if (activeTool === 'twowayanova') {
          let r
          try {
            r = await twoWayANOVABackend(data[params.outcome], data[params.factorA], data[params.factorB], params.factorA, params.factorB)
          } catch {
            r = twoWayANOVA({
              y: data[params.outcome],
              a: data[params.factorA],
              b: data[params.factorB],
              nameA: params.factorA,
              nameB: params.factorB,
            })
          }
          analysisResult = {
            type: 'twowayanova',
            outcome: params.outcome,
            factorAName: params.factorA,
            factorBName: params.factorB,
            ...r,
          }
        }
        else if (activeTool === 'regresi') {
          let r
          try { r = await regressionBackend(data[params.x], data[params.y]) } catch { r = simpleLinearRegression(data[params.x], data[params.y]) }
          analysisResult = { type: 'regression_simple', x: params.x, y: params.y, xValues: data[params.x], yValues: data[params.y], ...r }
        }
        else if (activeTool === 'regresiganda') {
          const X = params.predictors.map(p => data[p])
          let r
          try { r = await regressionMultipleBackend(X, data[params.outcome], params.predictors) } catch { r = multipleLinearRegression(X, data[params.outcome], params.predictors) }
          analysisResult = { type: 'regression_multiple', predictors: params.predictors, outcome: params.outcome, ...r }
        }
        else if (activeTool === 'chisquare') {
          let r
          try { r = await chiSquareBackend(data[params.var1], data[params.var2]) } catch { r = chiSquareIndependence(data[params.var1], data[params.var2]) }
          analysisResult = { type: 'chisquare', var1: params.var1, var2: params.var2, ...r }
        }
        else if (activeTool === 'mannwhitney') {
          const { groups, keys: allKeys } = splitByGroup(data[params.outcome], data[params.grouping])
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
          const r = await mannWhitneyBackend(groups[g1], groups[g2])
          analysisResult = { type: 'mannwhitney', outcome: params.outcome, grouping: params.grouping, groupNames: [g1, g2],
            groupValues: [{ name: g1, values: groups[g1] }, { name: g2, values: groups[g2] }], ...r }
        }
        else if (activeTool === 'wilcoxon') {
          const r = await wilcoxonBackend(data[params.column1], data[params.column2])
          analysisResult = { type: 'wilcoxon', column1: params.column1, column2: params.column2, beforeValues: data[params.column1], afterValues: data[params.column2], ...r }
        }
        else if (activeTool === 'kruskal') {
          const { groups, keys } = splitByGroup(data[params.outcome], data[params.grouping])
          if (keys.length < 2) throw new Error('Butuh minimal 2 grup')
          let r
          try { r = await kruskalWallisBackend(keys.map(k => groups[k]), keys) } catch { r = kruskalWallis(keys.map(k => groups[k]), keys) }
          analysisResult = { type: 'kruskal', outcome: params.outcome, grouping: params.grouping,
            groupValues: keys.map(k => ({ name: k, values: groups[k] })), ...r }
        }
        else if (activeTool === 'ngain') {
          // Coba ambil kolom nama bila ditentukan, kalau tidak biarkan lib generate "Subjek 1.."
          const names = params.nameColumn ? data[params.nameColumn] : []
          const r = await ngainBackend({
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
    trackEvent('analyze', { tool: activeTool, method: params.method || 'default' })
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

  const handleConfirmPay = async () => {
    setConfirmLoading(true)
    if (pricing.price === 0) {
      setShowConfirm(false)
      setConfirmLoading(false)
      toast.success('Beta gratis aktif. Menganalisis...')
      runAnalysis({ paidAmount: 0, paymentMethod: pricing.betaFree ? 'beta_free' : 'free' })
      return
    }
    const r = await deductWalletAndCreateOrder(activeTool, sampleSize)
    if (!r.success) {
      toast.error(r.error || 'Gagal memotong saldo')
      setConfirmLoading(false)
      setShowConfirm(false)
      return
    }
    setShowConfirm(false)
    setConfirmLoading(false)
    toast.success(`Pembayaran ${formatIDR(r.paid ?? pricing.price)} berhasil. Menganalisis...`)
    runAnalysis({ paidAmount: r.paid ?? pricing.price, paymentMethod: 'wallet' })
  }

  // Handle "Analisis Lain" — reset result but keep data
  const handleBackToAnalysis = useCallback(() => {
    setResult(null)
  }, [])

  // Handle "Upload Ulang" — reset everything
  const handleReset = useCallback(() => {
    setResult(null)
    setParams({})
    setData(null)
    setColumns([])
    setFile(null)
    setError(null)
    setFilterColumn('')
    setFilterValues([])
    setCleaningReport(null)
  }, [])

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="min-h-screen bg-bg text-fg pb-bottomnav paper-texture">
      <PageHeader
        title="Analisis Statistik"
        subtitle="Modul Statistik"
        parentPath="/"
        parentLabel="Beranda"
        subNav={STATISTIK_SUBNAV}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-5 py-5 sm:py-6">
        {/* Messy Data Banner — appears after upload if issues detected */}
        {rawRows && (
          <div className="mb-4">
            <MessyDataBanner
              rawRows={rawRows}
              fileName={file?.name}
              onApply={(result) => {
                if (result.error) {
                  toast.error(result.error)
                  return
                }
                setColumns(result.columns)
                setData(result.data)
                setRawRows(null)
                setFilterColumn('')
                setFilterValues([])
                setCleaningReport(null)
                toast.success(
                  `Data dirapihkan: ${result.report.rowsAfter} baris, ${result.columnsAfter} kolom. ` +
                  `${result.report.skippedRows.header > 0 ? `Skip ${result.report.skippedRows.header} baris header. ` : ''}` +
                  `${result.report.skippedRows.summary > 0 ? `Hapus ${result.report.skippedRows.summary} baris summary. ` : ''}`
                )
              }}
              onSkip={() => setRawRows(null)}
            />
          </div>
        )}

        <StatistikFlow
          file={file}
          data={data}
          columns={columns}
          numericColumns={numericColumns}
          categoricalColumns={categoricalColumns}
          error={error}
          activeTool={activeTool}
          selectedTool={activeTool}
          onSelectTool={(id) => navigate('/statistik?tool=' + id)}
          onFileUpload={handleFileUpload}
          onPasteData={handlePasteData}
          onExampleLoad={() => setExamplePickerOpen(true)}
          onOpenGuide={() => setShowGuide(true)}
          onAnalyze={handlePayClick}
          onClearFile={handleReset}
          onDataChange={setData}
          analyzing={analyzing}
          result={result}
          priceLabel={
            pricing.betaFree ? 'Gratis (beta)'
            : pricing.price === 0 ? 'Gratis'
            : formatIDR(pricing.price)
          }
        >
          {/* Filter panel — hidden when result is showing */}
            {data && categoricalColumns.length > 0 && !result && (
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

            {/* Data quality badge — shown after upload, before test selection */}
            {data && !result && (
              <DataValidationBadge
                data={data}
                columns={columns}
                numericColumns={numericColumns}
                sampleSize={sampleSize}
                onOpenCleaner={() => setCleanerOpen(true)}
              />
            )}

            {/* Tool-specific params — hidden when result is showing */}
            {data && !result && (
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

            {/* Shimmer loading skeleton */}
            {analyzing && (
              <div className="border border-border bg-card rounded-lg overflow-hidden p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full shimmer" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-48 rounded shimmer" />
                    <div className="h-3 w-32 rounded shimmer" />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-lg shimmer" />)}
                </div>
                <div className="h-24 rounded-lg shimmer" />
                <div className="flex items-center gap-2 text-sm text-muted">
                  <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  Menganalisis data...
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <ResultDisplay
                result={result}
                onReset={handleReset}
                onBackToAnalysis={handleBackToAnalysis}
              />
            )}
        </StatistikFlow>
      </div>

      {/* ── Floating wizard trigger removed — "Panduan" tab is the single entry point ── */}

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
    <div className="border border-border bg-card rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-card/50 transition-colors active:scale-95">
        <div className="flex items-center gap-2 text-sm">
          <Filter className="w-4 h-4 text-muted" />
          <span className="font-medium text-fg">Filter Data</span>
          <span className="text-xs text-muted">(opsional — analisis tetap jalan tanpa ini)</span>
          {isFiltered && (
            <span className="ml-2 px-2 py-0.5 bg-accent/10 text-accent rounded-full text-xs font-semibold">
              Aktif: {filteredSize}/{rawSampleSize}
            </span>
          )}
        </div>
        <span className="text-muted text-sm">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-border">
          <p className="text-xs text-muted mb-3">
            Saring baris berdasarkan kategori. Misal: pilih hanya kelas A, atau gender = Perempuan.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Kolom kategori</label>
              <select value={filterColumn} onChange={e => setFilterColumn(e.target.value)}
                      className="input-field text-sm">
                <option value="">— Tidak filter —</option>
                {categoricalColumns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {filterColumn && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-muted">Pilih nilai (centang)</label>
                  {uniqueValues.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterValues(
                        filterValues.length === uniqueValues.length ? [] : [...uniqueValues]
                      )}
                      className="text-xs text-accent hover:text-accent font-medium"
                    >
                      {filterValues.length === uniqueValues.length ? 'Hapus Semua' : 'Pilih Semua'}
                    </button>
                  )}
                </div>
                <div className="border border-border rounded-xl p-2 max-h-32 overflow-y-auto bg-card/50">
                  {uniqueValues.map(v => (
                    <label key={v} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-card px-2 py-1 rounded">
                      <input type="checkbox" checked={filterValues.includes(v)}
                             onChange={e => {
                               if (e.target.checked) setFilterValues([...filterValues, v])
                               else setFilterValues(filterValues.filter(x => x !== v))
                             }} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-muted mt-1">
                  {filterValues.length} dari {uniqueValues.length} nilai dipilih
                </p>
              </div>
            )}
          </div>
          {isFiltered && (
            <div className="mt-3 flex items-center justify-between p-2.5 bg-accent/5 border border-accent/20 rounded-lg text-xs text-accent">
              <span>Analisis akan pakai <strong>{filteredSize}</strong> dari {rawSampleSize} baris</span>
              <button onClick={() => { setFilterColumn(''); setFilterValues([]) }}
                      className="text-terracotta hover:text-terracotta/80 font-heading font-semibold">
                Hapus
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
      panelClassName="bg-card rounded-xl border border-border max-w-3xl w-full max-h-[90vh] flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-heading font-bold text-fg">Panduan Format Data</h2>
        </div>
        <button onClick={onClose} className="text-muted hover:text-fg text-2xl leading-none">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm text-fg">
          <section>
            <h3 className="font-heading font-semibold text-base text-fg mb-2">1. Format File yang Didukung</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><code className="bg-surface px-1 rounded">.xlsx</code> / <code className="bg-surface px-1 rounded">.xls</code> — Excel</li>
              <li><code className="bg-surface px-1 rounded">.csv</code> — Comma-separated values</li>
            </ul>
          </section>

          <section>
            <h3 className="font-heading font-semibold text-base text-fg mb-2">2. Struktur Data</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Baris pertama = nama variabel/kolom</strong> (header). Contoh: <code className="bg-surface px-1 rounded">nama, umur, skor_pre, skor_post, kelas</code></li>
              <li><strong>Tiap baris berikutnya = 1 responden / observasi</strong></li>
              <li><strong>Tiap kolom = 1 variabel</strong> (jangan campur 2 variabel di 1 kolom)</li>
              <li>Hindari <strong>merged cells</strong>, baris kosong di tengah, atau judul tabel sebelum header</li>
            </ul>
            <div className="mt-2 bg-surface border border-border rounded-lg p-3 font-mono text-xs">
              <div className="flex items-center gap-1.5 font-heading font-bold mb-1 text-teal"><Check className="w-3.5 h-3.5" /> Format yang BENAR:</div>
              <pre>{`nama,umur,skor_pre,skor_post,kelas
Andi,18,72,80,A
Budi,19,68,75,A
Citra,18,75,82,B
...`}</pre>
            </div>
            <div className="mt-2 bg-terracotta/8 border border-terracotta/20 rounded-lg p-3 font-mono text-xs">
              <div className="flex items-center gap-1.5 font-heading font-bold mb-1 text-terracotta"><AlertTriangle className="w-3.5 h-3.5" /> Yang harus DIHINDARI:</div>
              <pre>{`Hasil Penelitian Skripsi    ← jangan ada judul!
                            ← jangan ada baris kosong
nama,umur,skor
Andi,18,72
,,                          ← jangan baris kosong
Budi,19 tahun,68            ← jangan campur teks dengan angka`}</pre>
            </div>
          </section>

          <section>
            <h3 className="font-heading font-semibold text-base text-fg mb-2">3. Tipe Data per Kolom</h3>
            <table className="w-full text-xs border border-border rounded">
              <thead className="bg-surface/60">
                <tr><th className="p-2 text-left font-heading font-semibold text-muted uppercase tracking-wider">Tipe</th><th className="p-2 text-left font-heading font-semibold text-muted uppercase tracking-wider">Contoh</th><th className="p-2 text-left font-heading font-semibold text-muted uppercase tracking-wider">Tool yang cocok</th></tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <tr><td className="p-2 font-medium">Numerik kontinu</td><td className="p-2">tinggi (cm), berat, IQ, skor</td><td className="p-2">Deskriptif, Korelasi, t-test, Regresi</td></tr>
                <tr><td className="p-2 font-medium">Numerik diskrit</td><td className="p-2">jumlah anak, frekuensi</td><td className="p-2">Deskriptif, Korelasi</td></tr>
                <tr><td className="p-2 font-medium">Skala Likert</td><td className="p-2">1-5 atau 1-7 (per item)</td><td className="p-2">Validitas-Reliabilitas (semua item di kolom terpisah)</td></tr>
                <tr><td className="p-2 font-medium">Kategorik</td><td className="p-2">"L"/"P", "A"/"B"/"C", kelas</td><td className="p-2">Grouping di t-test/ANOVA, Filter</td></tr>
              </tbody>
            </table>
          </section>

          <section>
            <h3 className="font-heading font-semibold text-base text-fg mb-2">4. Tips Penting</h3>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-muted">
              <li><strong>Missing values</strong>: kosongkan saja sel-nya (jangan tulis "tidak ada", "-", "N/A"). Sistem akan abaikan otomatis.</li>
              <li><strong>Desimal</strong>: pakai titik <code className="bg-surface px-1 rounded">3.14</code>, bukan koma <code className="bg-surface px-1 rounded">3,14</code></li>
              <li><strong>Tidak ada satuan di angka</strong>: tulis <code>175</code> bukan <code>175 cm</code> atau <code>Rp 5000</code></li>
              <li><strong>Nama kolom</strong> sebaiknya tanpa spasi atau karakter aneh. Pakai <code>skor_pre</code> bukan <code>skor pre (test 1)</code></li>
              <li><strong>Banyak grup?</strong> Pakai 1 kolom kategorik (misal <code>kelas</code> = A/B/C), bukan 1 kolom per grup.</li>
              <li><strong>Sebelum/sesudah?</strong> Pisahkan jadi 2 kolom: <code>skor_pre</code> dan <code>skor_post</code> (paired t-test)</li>
            </ul>
          </section>

          <section>
            <h3 className="font-heading font-semibold text-base text-fg mb-2">5. Contoh Skema per Tool</h3>
            <div className="space-y-2 text-xs">
              <div className="bg-accent/5 border-l-2 border-accent p-2 rounded-r text-fg">
                <strong>Korelasi & Regresi Sederhana</strong> — minimal 2 kolom numerik (X dan Y).
              </div>
              <div className="bg-teal/5 border-l-2 border-teal p-2 rounded-r text-fg">
                <strong>Independent t-test / ANOVA</strong> — 1 kolom numerik (outcome) + 1 kolom kategorik (grouping). Independent t-test = 2 grup, ANOVA = ≥2 grup.
              </div>
              <div className="bg-terracotta/5 border-l-2 border-terracotta p-2 rounded-r text-fg">
                <strong>Paired t-test</strong> — 2 kolom numerik (sebelum, sesudah) untuk responden yang sama.
              </div>
              <div className="bg-accent/5 border-l-2 border-accent p-2 rounded-r text-fg">
                <strong>Validitas-Reliabilitas</strong> — minimal 2 kolom item Likert (1-5 atau 1-7). Skala harus sama antar item. Item negatif sudah harus di-reverse code dulu.
              </div>
              <div className="bg-teal/5 border-l-2 border-teal p-2 rounded-r text-fg">
                <strong>Regresi Berganda</strong> — 1 kolom outcome (Y) + ≥2 kolom predictor (X₁, X₂, ...) numerik.
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-heading font-semibold text-base text-fg mb-2">6. Punya Subset Data?</h3>
            <p>Pakai fitur <strong>Filter Data</strong> di bawah upload. Misal data 150 baris (3 species), pilih species = <code>setosa</code> → analisis pakai 50 baris saja.</p>
          </section>
      </div>

      <div className="flex-shrink-0 px-6 py-4 border-t border-border flex justify-end">
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
      <label className="block text-sm font-medium text-fg mb-1">{label}</label>
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
          <label className="block text-sm font-medium text-fg">{label}</label>
          {options.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => onChange(allSelected ? [] : [...options])}
                className="text-accent hover:text-accent font-medium"
              >
                {allSelected ? 'Hapus Semua' : 'Pilih Semua'}
              </button>
              {someSelected && !allSelected && (
                <>
                  <span className="text-muted">·</span>
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className="text-muted hover:text-fg"
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
        <p className="text-xs text-muted mt-1">
          {selected.length} dari {options.length} dipilih
          {allSelected && <span className="text-accent font-medium"> · semua</span>}
        </p>
      </div>
    )
  }

  return (
    <div className="border border-border bg-card rounded-xl p-6 space-y-4">
      <h3 className="font-semibold text-fg">Parameter Analisis</h3>

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
            <label className="block text-sm font-medium text-fg mb-1">Metode</label>
            <div className="flex gap-2">
              {[['pearson', 'Pearson (parametrik)'], ['spearman', 'Spearman (non-parametrik)']].map(([id, lbl]) => (
                <button key={id} onClick={() => update('method', id)}
                        className={'flex-1 px-3 py-2 rounded-xl text-sm border transition-colors active:scale-95 '
                                 + ((params.method || 'pearson') === id
                                     ? 'bg-accent/10 border-accent/30 text-accent'
                                     : 'border-border hover:bg-card/50')}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          {/* Auto-suggest Spearman for non-normal data */}
          {data && params.x && (() => {
            try {
              const r = testNormality(data[params.x], 0.05)
              if (r && !r.isNormal && (params.method || 'pearson') === 'pearson') {
                return (
                  <div className="p-3 rounded-lg bg-terracotta/5 border-l-2 border-terracotta text-sm text-terracotta">
                    <AlertTriangle className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                    Variabel <strong>{params.x}</strong> terdeteksi tidak normal.
                    Disarankan pakai{' '}
                    <button onClick={() => update('method', 'spearman')}
                      className="underline font-semibold hover:text-terracotta/80">Spearman</button>.
                  </div>
                )
              }
            } catch { /* ignore normality check errors */ }
            return null
          })()}
        </>
      )}

      {tool === 'ttest' && (
        <>
          <div>
            <label className="block text-sm font-medium text-fg mb-1">Jenis t-test</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['oneSample', 'One-sample'],
                ['independent', 'Independent'],
                ['paired', 'Paired (before-after)'],
              ].map(([id, lbl]) => (
                <button key={id} onClick={() => update('mode', id)}
                        className={'px-3 py-2 rounded-xl text-sm border transition-colors active:scale-95 '
                                 + (params.mode === id
                                     ? 'bg-accent/10 border-accent/30 text-accent'
                                     : 'border-border hover:bg-card/50')}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          {params.mode === 'oneSample' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Kolom" value={params.column1} onChange={v => update('column1', v)} options={numericColumns} />
              <div>
                <label className="block text-sm font-medium text-fg mb-1">μ₀ (nilai hipotesis)</label>
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
          <div className="bg-surface border border-border rounded-lg p-3 text-xs text-fg leading-relaxed">
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
          <p className="text-xs text-muted">Kedua variabel harus kategorik (mis. gender, kelas, status). Tabel kontingensi otomatis dibuat.</p>
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
          <p className="text-xs text-muted">
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
          <p className="text-xs text-muted">Alternatif non-parametrik untuk Paired t-test bila data tidak normal.</p>
        </>
      )}

      {tool === 'kruskal' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Outcome (numerik)" value={params.outcome} onChange={v => update('outcome', v)} options={numericColumns} />
            <Select label="Grouping (≥3 grup)" value={params.grouping} onChange={v => update('grouping', v)} options={categoricalColumns.length ? categoricalColumns : columns} />
          </div>
          <p className="text-xs text-muted">Alternatif non-parametrik untuk One-way ANOVA bila data tidak normal.</p>
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
              <label className="block text-[11px] font-medium text-muted mb-1">Skor Maksimum</label>
              <input
                type="number"
                min="1"
                step="1"
                value={params.maxScore ?? 100}
                onChange={e => update('maxScore', e.target.value)}
                placeholder="100"
                className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15 bg-bg"
              />
            </div>
            <Select
              label="Nama Siswa (opsional)"
              value={params.nameColumn || ''}
              onChange={v => update('nameColumn', v || null)}
              options={['', ...columns.filter(c => !numericColumns.includes(c))]}
            />
          </div>
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 text-xs text-fg leading-relaxed">
            <strong className="text-accent">Rumus N-Gain (Hake, 1998):</strong> g = (post − pre) / (max − pre)<br />
            <strong>Kategori:</strong> Tinggi (g ≥ 0.7), Sedang (0.3 ≤ g &lt; 0.7), Rendah (g &lt; 0.3).<br />
            Mengukur efektivitas pembelajaran/treatment dengan desain pre-test → post-test.
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================
// Data Validation Badge — shows data quality issues
// ============================================================
function DataValidationBadge({ data, columns, numericColumns, sampleSize, onOpenCleaner }) {
  const issues = useMemo(() => {
    const list = []
    if (sampleSize < 30) list.push(`Sampel kecil (${sampleSize} < 30) — hasil mungkin kurang stabil`)
    if (numericColumns.length === 0) list.push('Tidak ditemukan kolom numerik')
    let totalMissing = 0, totalCells = 0
    for (const col of columns) {
      const vals = data[col] || []
      totalCells += vals.length
      totalMissing += vals.filter(v => v === null || v === undefined || v === '').length
    }
    const pct = totalCells > 0 ? (totalMissing / totalCells * 100) : 0
    if (pct > 5) list.push(`${pct.toFixed(1)}% missing values — pertimbangkan data cleaning`)
    if (pct > 0 && pct <= 5) list.push(`${pct.toFixed(1)}% missing values (masih aman)`)
    return list
  }, [data, columns, numericColumns, sampleSize])

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-teal/8 border border-teal/20 rounded-xl text-sm">
        <CheckCircle className="w-4 h-4 text-teal flex-shrink-0" />
        <span className="text-teal font-medium">Data valid — {sampleSize} baris, {columns.length} kolom siap analisis</span>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {issues.map((issue, i) => (
        <div key={i} className="flex items-center gap-2 px-4 py-3 bg-terracotta/8 border border-terracotta/20 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 text-terracotta flex-shrink-0" />
          <span className="text-terracotta">{issue}</span>
        </div>
      ))}
      {issues.some(i => String(i).includes('missing values')) && onOpenCleaner && (
        <button
          onClick={onOpenCleaner}
          className="inline-flex items-center gap-1.5 mt-1 text-xs px-3 py-1.5 bg-accent hover:bg-accent/90 text-accent-fg rounded-lg font-heading font-semibold transition-colors active:scale-[0.98]"
        >
          Bersihkan Data
        </button>
      )}
    </div>
  )
}

// ============================================================
// Result Display — render based on result type
// ============================================================
function ResultDisplay({ result, onReset, onBackToAnalysis }) {
  const contentRef = useRef(null)

  const [aiInterpretation, setAiInterpretation] = useState('')
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [savedId, setSavedId] = useState(null)

  // Measure tinggi PageHeader supaya sticky TOC & scroll target tidak overlap.
  // Tinggi header beda di mobile/desktop & saat ada subnav — measure saat mount + resize.
  const [headerH, setHeaderH] = useState(88)
  useEffect(() => {
    const measure = () => {
      const hdr = document.querySelector('header')
      if (hdr) setHeaderH(Math.round(hdr.getBoundingClientRect().height))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Build TOC dynamically — only sections that actually render for this result type
  const hasAssumptions =
    (result.type === 'ttest' && result.mode === 'independent') ||
    ['anova', 'regression_simple', 'regression_multiple'].includes(result.type)

  const toc = [
    { id: 'result-summary', label: 'Hasil' },
    ...(hasAssumptions ? [{ id: 'assumptions', label: 'Asumsi' }] : []),
    { id: 'ai-interpretation', label: 'Interpretasi AI' },
    { id: 'contextual-writer', label: 'Tulis Hasil' },
    { id: 'stat-education', label: 'Edukasi' },
    { id: 'methodology', label: 'Untuk Skripsi' },
  ]

  // TOC bar sticky di bawah header (top = headerH), jadi total offset buat scroll target =
  // header + TOC bar (~40px). +8px breathing room.
  const tocBarH = 40
  const scrollOffset = headerH + tocBarH + 8

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - scrollOffset
    window.scrollTo({ top: y, behavior: 'smooth' })
  }

  return (
    <div className="border border-border bg-card rounded-xl overflow-hidden animate-fade-in-up">
      <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-fg text-lg">Hasil: {result.toolName}</h3>
          <p className="text-sm text-muted">{result.sampleSize} sampel · {result.analyzedAt}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setSaveModalOpen(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border transition-colors ${
              savedId
                ? 'bg-teal/8 border-teal/20 text-teal'
                : 'bg-card border-border text-fg hover:bg-surface'
            }`}>
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a2 2 0 012-2h10a2 2 0 012 2v14l-7-3.5L3 18V4z" /></svg>
            {savedId ? 'Tersimpan' : 'Simpan'}
          </button>
          <ExportActions result={result} containerRef={contentRef} />
          <button onClick={onBackToAnalysis}
            className="px-4 py-2 rounded-lg text-sm font-heading font-semibold bg-accent text-accent-fg hover:bg-accent/90 transition-colors flex items-center gap-2">
            <ArrowRight className="w-4 h-4" /> Analisis Lain
          </button>
          <button onClick={onReset}
            className="px-4 py-2 rounded-lg text-sm text-muted hover:text-fg border border-border hover:bg-surface transition-colors flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Upload Ulang
          </button>
        </div>
      </div>

      <SaveAnalysisModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        result={result}
        aiInterpretation={aiInterpretation}
        onSaved={(id) => { setSavedId(id); setSaveModalOpen(false) }}
      />

      {/* Sticky section nav — diposisikan tepat di bawah PageHeader (top = headerH),
          tidak overlap header (z-30). bg solid (no glass) sesuai anti-AI-vibe. */}
      <div className="sticky z-20 bg-card border-b border-border" style={{ top: `${headerH}px` }}>
        <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto no-scrollbar">
          {toc.map(item => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-md text-muted hover:text-accent hover:bg-accent/5 transition-colors whitespace-nowrap"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5" ref={contentRef}>
        <section id="result-summary" style={{ scrollMarginTop: `${scrollOffset}px` }}>
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
        </section>

        {/* Tier 1: Assumption checks panel — auto-render untuk t-test/ANOVA/regression */}
        {hasAssumptions && (
          <section id="assumptions" style={{ scrollMarginTop: `${scrollOffset}px` }}>
            {result.type === 'ttest' && result.mode === 'independent' && (
              <AssumptionsPanel result={result} type="ttest_independent" />
            )}
            {result.type === 'anova' && <AssumptionsPanel result={result} type="anova" />}
            {result.type === 'regression_simple' && <AssumptionsPanel result={result} type="regression_simple" />}
            {result.type === 'regression_multiple' && <AssumptionsPanel result={result} type="regression_multiple" />}
          </section>
        )}

        <section id="ai-interpretation" style={{ scrollMarginTop: `${scrollOffset}px` }}>
          <AIInterpretationPanel result={result} value={aiInterpretation} onChange={setAiInterpretation} />
        </section>

        <section id="contextual-writer" style={{ scrollMarginTop: `${scrollOffset}px` }}>
          <ContextualWriter result={result} />
        </section>

        <section id="stat-education" style={{ scrollMarginTop: `${scrollOffset}px` }}>
          <StatEducation />
        </section>

        <ExplainChatPanel result={result} aiInterpretation={aiInterpretation} />

        <section id="methodology" style={{ scrollMarginTop: `${scrollOffset}px` }}>
          <MethodologyPanel result={result} />
        </section>
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
      panelClassName="bg-card rounded-xl border border-border max-w-md w-full p-6">
      <div>
        <div className="mb-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-1">Simpan Analisis</div>
          <h3 className="text-lg font-heading font-bold text-fg">Simpan ke Riwayat</h3>
          <p className="text-sm text-muted mt-1">Akses lagi kapan saja dari halaman Riwayat.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Judul</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
              placeholder="Misal: Pre-test Eksperimen Kelompok A" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Catatan (opsional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-bg focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15 resize-none"
              placeholder="Misal: data dari kuesioner X, n=50 setelah cleaning" />
          </div>
          {aiInterpretation && (
            <div className="text-xs text-muted bg-surface border border-border rounded-lg px-3 py-2">
              Interpretasi AI yang sudah Anda generate akan ikut tersimpan.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-5 pt-5 border-t border-border">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-muted hover:text-fg rounded-lg disabled:opacity-50">
            Batal
          </button>
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="px-4 py-2 text-sm font-heading font-semibold text-accent-fg bg-accent hover:bg-accent/90 rounded-lg disabled:opacity-50 transition-colors">
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
    <div className="mt-6 border-t border-border pt-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-0.5">Interpretasi AI</div>
          <div className="text-sm text-muted">Paragraf akademik siap-paste untuk skripsi (Bahasa Indonesia, format APA).</div>
        </div>
        {!text && !loading && (
          <button onClick={handleGenerate}
                  className="bg-accent hover:bg-accent/90 text-accent-fg text-xs font-heading font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors">
            <BookOpen className="w-3.5 h-3.5" /> Generate
          </button>
        )}
        {text && (
          <div className="flex items-center gap-2">
            <button onClick={handleCopy}
                    className="text-xs text-muted hover:text-fg border border-border hover:bg-surface px-3 py-2 rounded-lg transition-colors">
              Salin
            </button>
            <button onClick={handleGenerate} disabled={loading}
                    className="text-xs text-muted hover:text-fg border border-border hover:bg-surface px-3 py-2 rounded-lg disabled:opacity-50 transition-colors">
              {loading ? 'Memproses…' : 'Regenerate'}
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-surface border border-border rounded-lg p-4 text-sm text-muted flex items-center gap-2">
          <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          Menulis interpretasi… (biasanya 5-15 detik)
        </div>
      )}

      {error && !loading && (
        <div className="bg-terracotta/8 border-l-2 border-terracotta rounded-r-lg p-3 text-sm text-terracotta">
          Gagal menghasilkan interpretasi: {error}
        </div>
      )}

      {text && !loading && (
        <div className="bg-surface border border-border rounded-lg p-4">
          {isFallback && (
            <div className="bg-accent/5 border-l-2 border-accent rounded-r-lg px-3 py-2 mb-3 text-[11px] text-accent leading-relaxed">
              <span className="font-medium">Mode offline:</span> AI provider sedang sibuk, jadi interpretasi disusun dari template lokal berdasarkan angka hasil analisis. Hasil tetap akurat tapi gaya bahasanya lebih baku — coba <em>Regenerate</em> beberapa saat lagi untuk versi AI.
            </div>
          )}
          <div className="prose prose-sm max-w-none text-fg whitespace-pre-wrap leading-relaxed text-[13.5px]">
            {text}
          </div>
          {provider && (
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted mt-3 pt-3 border-t border-border/70">
              {isFallback ? `Template lokal (${provider})` : `Disusun oleh AI (${provider})`} · Periksa kembali sebelum digunakan
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Explain Panel — "Belum Paham?" tanya AI dalam panel editorial.
// Bukan chat bubble — tampilan Q&A thread bergaya jurnal/scholarly.
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
        content: `Tanya apa saja tentang hasil **${result.toolName || 'analisis'}**-mu — misalnya "apa arti p-value ini?" atau "kesimpulan untuk skripsi seperti apa?". Tersedia ${MAX_TURNS} pertanyaan gratis per hasil.`
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
      <div className="mt-5 bg-surface border border-border rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-heading font-semibold text-fg">Belum paham hasilnya?</div>
            <div className="text-sm text-muted">
              Tanya AI — dijelaskan dalam bahasa yang lugas dan ringkas. Gratis {MAX_TURNS} pertanyaan per hasil.
            </div>
          </div>
        </div>
        <button onClick={handleOpen}
                className="bg-accent hover:bg-accent/90 text-accent-fg text-sm font-heading font-semibold px-5 py-2.5 rounded-lg flex-shrink-0 transition-colors active:scale-[0.98]">
          Tanya AI
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)}
             panelClassName="bg-card rounded-xl border border-border max-w-2xl w-full h-[80vh] flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-heading font-semibold text-fg truncate">Tanya AI tentang Hasil</div>
              <div className="text-xs text-muted">{result.toolName} · sisa {remaining}/{MAX_TURNS} pertanyaan</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Tutup" className="p-1.5 rounded hover:bg-surface text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-5 bg-surface/40">
          {messages.map((m, i) => <QaEntry key={i} role={m.role} content={m.content} />)}
          {loading && (
            <div className="border-l-2 border-accent/40 pl-3 py-1 text-sm italic text-muted">
              <span className="font-heading not-italic font-semibold text-accent text-xs uppercase tracking-wider mr-2">AI</span>
              menyusun penjelasan…
            </div>
          )}
          {error && !loading && (
            <div className="bg-terracotta/8 border-l-2 border-terracotta rounded-r-lg p-3 text-sm text-terracotta">
              Error: {error}. Coba kirim ulang ya.
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-border p-3">
          {limitReached ? (
            <div className="bg-accent/5 border-l-2 border-accent rounded-r-lg p-3 text-sm text-accent text-center">
              Kamu sudah pakai {MAX_TURNS}/{MAX_TURNS} pertanyaan untuk hasil ini.<br />
              <span className="text-xs">Buka analisis baru kalau mau tanya lagi.</span>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={loading ? 'Tunggu AI…' : 'Tanya apa aja tentang hasilmu…'}
                disabled={loading} rows={1}
                className="flex-1 resize-none border border-border rounded-lg px-3 py-2.5 text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-surface disabled:text-muted"
                style={{ maxHeight: '120px' }}
              />
              <button onClick={handleSend} disabled={!input.trim() || loading}
                      className="bg-accent hover:bg-accent/90 disabled:bg-muted/30 disabled:cursor-not-allowed text-accent-fg text-sm font-heading font-semibold px-4 py-2.5 rounded-lg">
                Kirim
              </button>
            </div>
          )}
          <div className="text-[10px] text-muted text-center mt-2">Enter untuk kirim · Shift+Enter untuk baris baru</div>
        </div>
      </Modal>
    </>
  )
}

function QaEntry({ role, content }) {
  if (role === 'user') {
    return (
      <div className="border-l-2 border-border pl-3 py-1">
        <div className="text-[10px] font-heading font-semibold uppercase tracking-[0.14em] text-muted mb-1">Anda</div>
        <div className="text-sm italic text-muted leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    )
  }
  return (
    <div className="border-l-2 border-accent/40 pl-3 py-1">
      <div className="text-[10px] font-heading font-semibold uppercase tracking-[0.14em] text-accent mb-1">AI</div>
      <div className="text-sm leading-relaxed text-fg whitespace-pre-wrap">
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


export default Statistik

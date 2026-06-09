// src/components/statistik/StatistikFlow.jsx
// Guided step-based flow for Statistik page
// Wraps existing logic, presents as Upload → Review → Select → Results → Interpret → Export

import { useState, useMemo } from 'react'
import {
  Upload, Table, BarChart3, Brain, Download, CheckCircle,
  ChevronRight, AlertCircle, FileSpreadsheet, ArrowRight,
} from 'lucide-react'

const STEPS = [
  { id: 'upload',   label: 'Upload',    icon: Upload },
  { id: 'review',   label: 'Variabel',  icon: Table },
  { id: 'select',   label: 'Analisis',  icon: BarChart3 },
  { id: 'results',  label: 'Hasil',     icon: CheckCircle },
  { id: 'interpret',label: 'Interpretasi', icon: Brain },
  { id: 'export',   label: 'Export',    icon: Download },
]

// ============================================================
// Step indicator (horizontal progress)
// ============================================================
function StepIndicator({ current, completed }) {
  return (
    <nav className="flex items-center gap-1 overflow-x-auto pb-2 mb-6">
      {STEPS.map((step, i) => {
        const Ic = step.icon
        const isActive = step.id === current
        const isDone = completed.includes(step.id)
        return (
          <div key={step.id} className="flex items-center gap-1 flex-shrink-0">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isActive ? 'bg-accent/10 text-accent' :
              isDone ? 'text-emerald-600' :
              'text-muted'
            }`}>
              {isDone ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <Ic className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-3 h-3 text-muted/40 flex-shrink-0" />
            )}
          </div>
        )
      })}
    </nav>
  )
}

// ============================================================
// Step 1: Upload
// ============================================================
function StepUpload({ file, data, error, onFileUpload, onExampleLoad, onOpenGuide }) {
  return (
    <div className="border border-border bg-card rounded-xl p-6">
      <h2 className="text-lg font-semibold text-fg mb-1">Unggah Dataset</h2>
      <p className="text-sm text-muted mb-5">Format yang didukung: .xlsx, .xls, .csv</p>

      <div className="relative block border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-accent/30 bg-card/50 transition-colors">
        <FileSpreadsheet className="w-10 h-10 text-muted/40 mx-auto mb-3" />
        <p className="text-muted font-medium mb-1">Klik atau seret file ke sini</p>
        <p className="text-xs text-muted">Maksimal 10MB · header di baris pertama</p>
        <input
          type="file"
          accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={onFileUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="Upload dataset"
        />
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted">
        <span>Belum punya data?</span>
        <button onClick={onExampleLoad} className="text-accent hover:text-accent font-medium">
          Pakai Contoh Data
        </button>
        <span className="text-muted/30">|</span>
        <button onClick={onOpenGuide} className="text-muted hover:text-fg font-medium">
          Lihat Panduan Format
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Step 2: Review Variables
// ============================================================
function StepReview({ columns, data, numericColumns, categoricalColumns }) {
  if (!data) return null

  const safeColumns = Array.isArray(columns) ? columns : []
  const safeNumeric = Array.isArray(numericColumns) ? numericColumns : []
  const safeCategorical = Array.isArray(categoricalColumns) ? categoricalColumns : []

  // Consistent missing value policy
  const isMissing = (v) =>
    v === null ||
    v === undefined ||
    v === '' ||
    ['NA', 'N/A', 'NULL', 'null', '-'].includes(String(v).trim())

  // data is column-oriented: { col1: [values...], col2: [values...] }
  const totalRows = safeColumns[0] ? (data?.[safeColumns[0]]?.length || 0) : 0
  const missingByCol = safeColumns.map(col => {
    const values = Array.isArray(data?.[col]) ? data[col] : []
    const missing = values.filter(isMissing)
    return { col, count: missing.length, pct: totalRows ? ((missing.length / totalRows) * 100).toFixed(1) : '0.0' }
  })
  const totalMissing = missingByCol.filter(m => m.count > 0)

  return (
    <div className="border border-border bg-card rounded-xl p-6">
      <h2 className="text-lg font-semibold text-fg mb-1">Preview Data</h2>
      <p className="text-sm text-muted mb-5">Periksa variabel sebelum memilih analisis</p>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="p-3 rounded-lg bg-card/50 border border-border">
          <div className="text-xs text-muted">Baris</div>
          <div className="text-lg font-semibold">{totalRows.toLocaleString()}</div>
        </div>
        <div className="p-3 rounded-lg bg-card/50 border border-border">
          <div className="text-xs text-muted">Variabel</div>
          <div className="text-lg font-semibold">{columns.length}</div>
        </div>
        <div className="p-3 rounded-lg bg-card/50 border border-border">
          <div className="text-xs text-muted">Numerik</div>
          <div className="text-lg font-semibold text-accent">{numericColumns.length}</div>
        </div>
        <div className="p-3 rounded-lg bg-card/50 border border-border">
          <div className="text-xs text-muted">Kategorik</div>
          <div className="text-lg font-semibold">{categoricalColumns.length}</div>
        </div>
      </div>

      {/* Missing values alert */}
      {totalMissing.length > 0 && (
        <div className="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <strong>{totalMissing.length} variabel</strong> memiliki missing values. Pertimbangkan untuk membersihkan data sebelum analisis.
        </div>
      )}

      {/* Variable list */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 text-left font-medium text-muted">Variabel</th>
              <th className="py-2 text-left font-medium text-muted">Tipe</th>
              <th className="py-2 text-left font-medium text-muted">Contoh</th>
              <th className="py-2 text-left font-medium text-muted">Missing</th>
            </tr>
          </thead>
          <tbody>
            {safeColumns.map(col => {
              const isNum = safeNumeric.includes(col)
              const values = Array.isArray(data?.[col]) ? data[col] : []
              const sample = values.find(v => !isMissing(v))
              const m = missingByCol.find(x => x.col === col)
              return (
                <tr key={col} className="border-b border-border/50">
                  <td className="py-2 font-medium">{col}</td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${isNum ? 'bg-accent/10 text-accent' : 'bg-muted/10 text-muted'}`}>
                      {isNum ? 'Numerik' : 'Kategorik'}
                    </span>
                  </td>
                  <td className="py-2 text-muted font-mono text-xs">{String(sample ?? '—').substring(0, 30)}</td>
                  <td className="py-2">
                    {m && m.count > 0 ? (
                      <span className="text-amber-600 text-xs">{m.count} ({m.pct}%)</span>
                    ) : (
                      <span className="text-emerald-600 text-xs">0</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Spreadsheet preview */}
      {totalRows > 0 && safeColumns.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-fg mb-1">Preview Dataset</h3>
          <p className="text-xs text-muted mb-3">
            Menampilkan {Math.min(totalRows, 20)} baris pertama dari {totalRows.toLocaleString()} baris.
          </p>
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-card/80 border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-muted border-r border-border w-10">#</th>
                    {safeColumns.map(col => (
                      <th key={col} className="px-3 py-2 text-left font-medium text-muted border-r border-border last:border-r-0 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.min(totalRows, 20) }, (_, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-card/30">
                      <td className="px-3 py-1.5 text-muted border-r border-border w-10 font-mono">
                        {i + 1}
                      </td>
                      {safeColumns.map(col => {
                        const values = Array.isArray(data?.[col]) ? data[col] : []
                        const value = values[i]
                        const display = isMissing(value) ? '—' : String(value)
                        return (
                          <td
                            key={col}
                            className="px-3 py-1.5 border-r border-border last:border-r-0 font-mono max-w-[180px] truncate"
                            title={display === '—' ? 'empty' : display}
                          >
                            {display === '—' ? (
                              <span className="text-muted/40">—</span>
                            ) : (
                              display
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Step 3: Select Analysis (guided recommendations)
// ============================================================
function StepSelect({ numericColumns, categoricalColumns, selectedTool, onSelectTool, onAnalyze }) {
  const safeNumeric = Array.isArray(numericColumns) ? numericColumns : []
  const safeCategorical = Array.isArray(categoricalColumns) ? categoricalColumns : []

  if (!safeNumeric.length && !safeCategorical.length) return null

  // Build recommendations based on data types
  const recommendations = useMemo(() => {
    const recs = []
    if (safeNumeric.length >= 2) {
      recs.push({
        category: 'Hubungan',
        items: [
          { id: 'korelasi', label: 'Korelasi', desc: `Hubungan antar variabel numerik (${safeNumeric.slice(0, 3).join(', ')}${safeNumeric.length > 3 ? '...' : ''})` },
          { id: 'regresi', label: 'Regresi Sederhana', desc: 'Prediksi 1 variabel dari 1 variabel lain' },
        ],
      })
    }
    if (safeNumeric.length >= 3) {
      recs.push({
        category: 'Prediksi',
        items: [
          { id: 'regresiganda', label: 'Regresi Berganda', desc: `Prediksi dari ${safeNumeric.length} variabel numerik` },
        ],
      })
    }
    if (safeNumeric.length >= 1) {
      recs.push({
        category: 'Distribusi',
        items: [
          { id: 'deskriptif', label: 'Statistik Deskriptif', desc: 'Mean, median, SD, skewness, kurtosis' },
          { id: 'normalitas', label: 'Uji Normalitas', desc: 'Shapiro-Wilk / Kolmogorov-Smirnov' },
        ],
      })
    }
    if (safeCategorical.length >= 2) {
      recs.push({
        category: 'Asosiasi',
        items: [
          { id: 'chisquare', label: 'Chi-Square', desc: 'Asosiasi antar variabel kategorik' },
        ],
      })
    }
    if (safeNumeric.length >= 1 && safeCategorical.length >= 1) {
      recs.push({
        category: 'Perbandingan',
        items: [
          { id: 'ttest', label: 'T-Test', desc: 'Bandingkan rata-rata antar grup' },
          { id: 'anova', label: 'ANOVA', desc: 'Bandingkan rata-rata ≥3 grup' },
        ],
      })
    }
    return recs
  }, [safeNumeric, safeCategorical])

  // All tools (for advanced mode)
  const allTools = [
    { id: 'deskriptif', name: 'Deskriptif' },
    { id: 'normalitas', name: 'Normalitas' },
    { id: 'korelasi', name: 'Korelasi' },
    { id: 'ttest', name: 'T-Test' },
    { id: 'validitas', name: 'Validitas & Reliabilitas' },
    { id: 'anova', name: 'ANOVA' },
    { id: 'twowayanova', name: 'Two-way ANOVA' },
    { id: 'regresi', name: 'Regresi Sederhana' },
    { id: 'regresiganda', name: 'Regresi Berganda' },
    { id: 'chisquare', name: 'Chi-Square' },
    { id: 'mannwhitney', name: 'Mann-Whitney U' },
    { id: 'wilcoxon', name: 'Wilcoxon' },
    { id: 'kruskal', name: 'Kruskal-Wallis' },
    { id: 'ngain', name: 'N-Gain (Hake)' },
  ]

  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="border border-border bg-card rounded-xl p-6">
      <h2 className="text-lg font-semibold text-fg mb-1">Pilih Analisis</h2>
      <p className="text-sm text-muted mb-5">Rekomendasi berdasarkan tipe data Anda</p>

      {/* Recommendations */}
      <div className="space-y-5">
        {recommendations.map(rec => (
          <div key={rec.category}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">{rec.category}</h3>
            <div className="space-y-2">
              {rec.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => onSelectTool(item.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    selectedTool === item.id
                      ? 'border-accent bg-accent/5'
                      : 'border-border hover:border-accent/30 bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className="text-xs text-muted mt-0.5">{item.desc}</div>
                    </div>
                    <ArrowRight className={`w-4 h-4 ${selectedTool === item.id ? 'text-accent' : 'text-muted/40'}`} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Advanced toggle */}
      <div className="mt-6 pt-4 border-t border-border">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-muted hover:text-fg transition-colors"
        >
          {showAdvanced ? 'Sembunyikan semua analisis' : 'Lihat semua analisis →'}
        </button>
        {showAdvanced && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {allTools.map(tool => (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                  selectedTool === tool.id
                    ? 'border-accent bg-accent/5 text-accent font-medium'
                    : 'border-border hover:border-accent/30 text-muted'
                }`}
              >
                {tool.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Export
// ============================================================
export default function StatistikFlow({
  file, data, columns, numericColumns, categoricalColumns, error,
  activeTool, selectedTool, onSelectTool,
  onFileUpload, onExampleLoad, onOpenGuide, onAnalyze,
  analyzing, children, // children = result/interpretation panels
}) {
  // Determine current step based on state
  const currentStep = useMemo(() => {
    if (!file || !data) return 'upload'
    if (!selectedTool) return 'select' // skip review, go straight to select
    return 'results'
  }, [file, data, selectedTool])

  const completed = useMemo(() => {
    const c = []
    if (file && data) c.push('upload')
    if (data && columns.length > 0) c.push('review')
    if (selectedTool) c.push('select')
    if (children) c.push('results')
    return c
  }, [file, data, columns, selectedTool, children])

  return (
    <div>
      <StepIndicator current={currentStep} completed={completed} />

      {/* Step 1: Upload (always show) */}
      <StepUpload
        file={file}
        data={data}
        error={error}
        onFileUpload={onFileUpload}
        onExampleLoad={onExampleLoad}
        onOpenGuide={onOpenGuide}
      />

      {/* Step 2: Review (show after upload) */}
      {data && (
        <div className="mt-4">
          <StepReview
            columns={columns}
            data={data}
            numericColumns={numericColumns}
            categoricalColumns={categoricalColumns}
          />
        </div>
      )}

      {/* Step 3: Select (show after upload) */}
      {data && (
        <div className="mt-4">
          <StepSelect
            numericColumns={numericColumns}
            categoricalColumns={categoricalColumns}
            selectedTool={selectedTool}
            onSelectTool={onSelectTool}
            onAnalyze={onAnalyze}
          />
        </div>
      )}

      {/* Analyze button */}
      {data && selectedTool && (
        <div className="mt-4">
          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className="w-full py-3 rounded-xl bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menganalisis...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4" />
                Jalankan Analisis
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 4+: Results (children) */}
      {children}
    </div>
  )
}

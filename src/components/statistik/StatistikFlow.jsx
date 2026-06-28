// src/components/statistik/StatistikFlow.jsx
// Guided step-based flow for Statistik page — Scholarly Editorial redesign.
// Presents as Upload → Cek Data → Analisis → Hasil.

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  Activity, CheckCircle,
  ChevronRight, AlertCircle, FileSpreadsheet, ArrowRight, ClipboardCheck, X,
} from 'lucide-react'
import Fuse from 'fuse.js'
import ScrollReveal from '../ScrollReveal'
import { AmbientBlobs, Flourish } from '../design'

// Step order — dot indicator + watermark angka di kartu masing-masing.
const STEPS = [
  { id: 'upload',  label: 'Upload' },
  { id: 'review',  label: 'Cek Data' },
  { id: 'select',  label: 'Analisis' },
  { id: 'results', label: 'Hasil' },
]

// ============================================================
// Step indicator — progress dot-only (no nomor ganda).
// Nomor watermark tetap di tiap kartu step — indikator ini murni progress.
// ============================================================
function StepIndicator({ current, completed }) {
  const currentIndex = STEPS.findIndex(s => s.id === current)

  const renderDot = (step, i) => {
    const isActive = step.id === current
    const isDone = completed.includes(step.id) || i < currentIndex

    return (
      <div key={step.id} className="flex items-center gap-1.5 flex-shrink-0">
        <div className={`
          w-2 h-2 rounded-full transition-all duration-300
          ${isActive ? 'bg-accent scale-125' :
            isDone ? 'bg-accent/50' : 'bg-border'}
        `} />
        <span className={`text-[11px] font-medium transition-colors ${
          isActive ? 'text-fg' : isDone ? 'text-accent/70' : 'text-muted/60'
        }`}>
          {step.label}
        </span>
      </div>
    )
  }

  return (
    <nav className="mb-6 mt-5">
      {/* Desktop: dots + connector line */}
      <div className="hidden sm:flex items-center gap-2">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2 flex-1 last:flex-none">
            {renderDot(step, i)}
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px ${i < currentIndex ? 'bg-accent/30' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Mobile: compact horizontal scroll */}
      <div className="sm:hidden flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-1 flex-shrink-0">
            {renderDot(step, i)}
            {i < STEPS.length - 1 && (
              <ChevronRight className={`w-3 h-3 flex-shrink-0 ${i < currentIndex ? 'text-accent/30' : 'text-border'}`} />
            )}
          </div>
        ))}
      </div>
    </nav>
  )
}

// ============================================================
// Step 1: Upload — calmer dropzone, scholarly
// ============================================================
function StepUpload({ file, data, error, onFileUpload, onExampleLoad, onOpenGuide, onPasteData, onClearFile }) {
  const hasFile = file && file.name
  const [mode, setMode] = useState('file') // 'file' | 'paste'
  const [pasteText, setPasteText] = useState('')
  // After a successful upload, collapse to a compact summary row.
  // User can click "Ganti" to expand the full dropzone again.
  const [collapsed, setCollapsed] = useState(false)

  // Auto-collapse whenever a new file is loaded (clears focus for next step)
  useEffect(() => {
    if (hasFile) setCollapsed(true)
  }, [hasFile])

  const handleDragOver = (e) => { e.preventDefault() }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) onFileUpload({ target: { files: [droppedFile] } })
  }

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setPasteText(text)
        onPasteData(text)
      }
    } catch {
      // clipboard API not available
    }
  }

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-heading text-2xl font-bold text-accent/15 leading-none italic select-none">01</span>
          <div>
            <h2 className="font-heading font-semibold text-sm tracking-tight">Unggah Dataset</h2>
            <p className="text-[11px] text-muted">CSV, Excel, atau paste langsung</p>
          </div>
        </div>
        {/* Mode toggle */}
        <div className="flex bg-surface rounded-lg p-0.5 text-[11px]">
          <button
            onClick={() => setMode('file')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              mode === 'file'
                ? 'bg-card text-fg shadow-sm'
                : 'text-muted hover:text-fg'
            }`}
          >
            File
          </button>
          <button
            onClick={() => setMode('paste')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              mode === 'paste'
                ? 'bg-card text-fg shadow-sm'
                : 'text-muted hover:text-fg'
            }`}
          >
            Paste
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Compact summary once a file is loaded — keeps focus on the active step */}
        {hasFile && collapsed ? (
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-teal/5 border border-teal/20">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-teal" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-heading font-medium text-fg truncate">{file.name}</p>
                <p className="text-[11px] text-muted">Dataset siap · klik untuk mengganti</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setCollapsed(false)}
                className="text-[11px] text-accent hover:text-accent/80 font-medium px-2.5 py-1.5 rounded-md border border-border hover:bg-surface transition-colors"
              >
                Ganti
              </button>
              {onClearFile && (
                <button
                  onClick={onClearFile}
                  title="Hapus data"
                  className="w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-terracotta hover:bg-terracotta/8 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : mode === 'file' && (
          <>
            <div
              className={`relative block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all active:scale-[0.99] ${
                hasFile
                  ? 'border-teal/40 bg-teal/5'
                  : 'border-border hover:border-accent/50 hover:bg-accent/3 bg-surface/40'
              }`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {hasFile ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-5 h-5 text-teal" />
                  </div>
                  <p className="font-heading font-medium text-sm text-fg mb-0.5">Berhasil diunggah</p>
                  <p className="text-xs text-muted font-mono">{file.name}</p>
                  <p className="text-[11px] text-muted mt-2">Klik untuk ganti file</p>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-8 h-8 text-muted/40 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-muted font-medium mb-1">Klik atau seret file ke sini</p>
                  <p className="text-[11px] text-muted/70">.xlsx, .xls, .csv · maks 10MB</p>
                </>
              )}
              <input
                type="file"
                accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={onFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Upload dataset"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]">
              <span className="text-muted">Belum punya data?</span>
              <button onClick={onExampleLoad} className="text-accent hover:text-accent/80 font-medium transition-colors">
                Pakai contoh data
              </button>
              <span className="text-border">·</span>
              <button onClick={onOpenGuide} className="text-muted hover:text-fg font-medium transition-colors">
                Panduan format
              </button>
            </div>
          </>
        )}

        {mode === 'paste' && (
          <div className="space-y-3">
            <p className="text-xs text-muted leading-relaxed">
              Copy data dari Excel / Google Sheets, lalu paste di bawah.
              Format: baris pertama = header, pisahkan dengan tab atau koma.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handlePasteFromClipboard}
                className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 border border-border rounded-md hover:bg-surface hover:text-fg text-muted transition-colors"
              >
                <ClipboardCheck className="w-3 h-3" />
                Ambil dari clipboard
              </button>
              <button
                onClick={() => {
                  setPasteText(
                    'Nama\tPre-test\tPost-test\n' +
                    'Siswa A\t22\t27\n' +
                    'Siswa B\t18\t24\n' +
                    'Siswa C\t25\t30\n' +
                    'Siswa D\t20\t23\n' +
                    'Siswa E\t21\t26'
                  )
                }}
                className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 border border-border rounded-md hover:bg-surface hover:text-fg text-muted transition-colors"
              >
                Isi contoh
              </button>
            </div>

            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`Paste data di sini…\n\nNama\tPre-test\tPost-test\nSiswa A\t22\t27\nSiswa B\t18\t24`}
              rows={7}
              className="w-full p-3 text-xs font-mono bg-surface border border-border resize-y rounded-lg placeholder:text-muted/50 focus:outline-none focus:border-accent/50 transition-colors"
              spellCheck={false}
            />

            <button
              onClick={() => onPasteData(pasteText)}
              disabled={!pasteText.trim()}
              className="inline-flex items-center gap-1.5 text-xs font-heading font-semibold bg-accent text-accent-fg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-all"
            >
              <ArrowRight className="w-3 h-3" />
              Parse & Lanjutkan
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-terracotta/8 border-l-2 border-terracotta text-sm text-terracotta flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Step 2: Review — compact summary, scholarly table
// ============================================================
function StepReview({ columns, data, numericColumns, categoricalColumns, editingCell, draftValue, hasEdits, onCellClick, onCellChange, onCellSave, onCellCancel, onReset }) {
  if (!data) return null

  const safeColumns = Array.isArray(columns) ? columns : []
  const safeNumeric = Array.isArray(numericColumns) ? numericColumns : []
  const safeCategorical = Array.isArray(categoricalColumns) ? categoricalColumns : []

  const isMissing = (v) =>
    v === null ||
    v === undefined ||
    v === '' ||
    ['NA', 'N/A', 'NULL', 'null', '-'].includes(String(v).trim())

  const totalRows = safeColumns[0] ? (data?.[safeColumns[0]]?.length || 0) : 0
  const missingByCol = safeColumns.map(col => {
    const values = Array.isArray(data?.[col]) ? data[col] : []
    const missing = values.filter(isMissing)
    return { col, count: missing.length, pct: totalRows ? ((missing.length / totalRows) * 100).toFixed(1) : '0.0' }
  })
  const totalMissing = missingByCol.filter(m => m.count > 0)

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-heading text-2xl font-bold text-accent/15 leading-none italic select-none">02</span>
          <div>
            <h2 className="font-heading font-semibold text-sm tracking-tight">Cek Data</h2>
            <p className="text-[11px] text-muted">Pastikan tipe variabel terbaca benar</p>
          </div>
        </div>
        {hasEdits && (
          <button
            onClick={onReset}
            className="text-[11px] text-muted hover:text-fg border border-border rounded-lg px-2.5 py-1 transition-colors active:scale-95"
          >
            Reset
          </button>
        )}
      </div>

      <div className="p-5">
        {/* Edit notice */}
        {hasEdits && (
          <div className="mb-4 p-2.5 rounded-lg bg-accent/5 border-l-2 border-accent text-xs text-accent">
            Data sudah diubah — hasil analisis memakai data terbaru.
          </div>
        )}

        {/* Summary grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Baris', value: totalRows.toLocaleString(), accent: false },
            { label: 'Variabel', value: columns.length, accent: false },
            { label: 'Numerik', value: numericColumns.length, accent: true },
            { label: 'Kategorik', value: categoricalColumns.length, accent: false },
          ].map(s => (
            <div key={s.label} className="p-2.5 rounded-lg bg-surface border border-border">
              <div className="text-[10px] text-muted tracking-wider uppercase">{s.label}</div>
              <div className={`text-lg font-heading font-bold ${s.accent ? 'text-accent' : 'text-fg'}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Missing values warning */}
        {totalMissing.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-terracotta/8 border-l-2 border-terracotta text-xs text-terracotta flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span><strong>{totalMissing.length} variabel</strong> memiliki missing values. Pertimbangkan membersihkan data sebelum analisis.</span>
          </div>
        )}

        {/* Variable list */}
        <p className="text-[11px] text-muted mb-2">Tipe variabel terdeteksi otomatis. Lanjut jika sudah sesuai.</p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-3 text-left font-heading font-semibold text-muted">Variabel</th>
                <th className="py-2 pr-3 text-left font-heading font-semibold text-muted">Tipe</th>
                <th className="py-2 pr-3 text-left font-heading font-semibold text-muted">Contoh</th>
                <th className="py-2 text-left font-heading font-semibold text-muted">Missing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {safeColumns.map(col => {
                const isNum = safeNumeric.includes(col)
                const values = Array.isArray(data?.[col]) ? data[col] : []
                const sample = values.find(v => !isMissing(v))
                const m = missingByCol.find(x => x.col === col)
                return (
                  <tr key={col}>
                    <td className="py-1.5 pr-3 font-medium text-fg">{col}</td>
                    <td className="py-1.5 pr-3">
                      <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        isNum ? 'bg-accent/10 text-accent' : 'bg-muted/10 text-muted'
                      }`}>
                        {isNum ? 'Numerik' : 'Kategorik'}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 text-muted font-mono">{String(sample ?? '—').substring(0, 30)}</td>
                    <td className="py-1.5">
                      {m && m.count > 0 ? (
                        <span className="text-terracotta">{m.count} ({m.pct}%)</span>
                      ) : (
                        <span className="text-teal">0</span>
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
          <div>
            <h3 className="text-xs font-heading font-semibold mb-1">Preview Dataset</h3>
            <p className="text-[11px] text-muted mb-2">
              Klik cell untuk perbaiki nilai. Menampilkan {Math.min(totalRows, 20)} dari {totalRows.toLocaleString()} baris.
            </p>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-surface border-b border-border">
                      <th className="px-2 py-1.5 text-left font-heading font-medium text-muted border-r border-border w-8">#</th>
                      {safeColumns.map(col => (
                        <th key={col} className="px-2 py-1.5 text-left font-heading font-medium text-muted border-r border-border last:border-r-0 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.min(totalRows, 20) }, (_, i) => (
                      <tr key={i} className="border-b border-border/30 last:border-b-0 hover:bg-surface/50">
                        <td className="px-2 py-1 text-muted border-r border-border w-8 font-mono">{i + 1}</td>
                        {safeColumns.map(col => {
                          const values = Array.isArray(data?.[col]) ? data[col] : []
                          const value = values[i]
                          const isEditing = editingCell?.rowIndex === i && editingCell?.col === col
                          const display = isMissing(value) ? '—' : String(value)

                          if (isEditing) {
                            return (
                              <td key={col} className="px-1 py-0.5 border-r border-border last:border-r-0">
                                <input
                                  autoFocus
                                  type="text"
                                  value={draftValue}
                                  onChange={(e) => onCellChange(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') onCellSave(col, i)
                                    if (e.key === 'Escape') onCellCancel()
                                  }}
                                  onBlur={() => onCellSave(col, i)}
                                  className="w-full px-1.5 py-0.5 text-[11px] font-mono border border-accent rounded bg-card text-fg outline-none"
                                />
                              </td>
                            )
                          }

                          return (
                            <td
                              key={col}
                              onClick={() => onCellClick(i, col, value)}
                              className="px-2 py-1 border-r border-border last:border-r-0 font-mono max-w-[140px] truncate cursor-pointer hover:bg-accent/5 transition-colors"
                              title={display === '—' ? 'empty — klik untuk edit' : `${display} — klik untuk edit`}
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
    </div>
  )
}

// ============================================================
// Step 3: Select Analysis — scholarly grid with tier badges
// ============================================================
const categoryHints = {
  Hubungan: 'Cari tahu apakah dua variabel saling berkaitan.',
  Prediksi: 'Prediksi satu variabel berdasarkan variabel lain.',
  Distribusi: 'Lihat ringkasan dan pola sebaran data.',
  Perbandingan: 'Bandingkan rata-rata antar kelompok.',
  Asosiasi: 'Cek hubungan antar kategori.',
}

function StepSelect({ numericColumns, categoricalColumns, selectedTool, onSelectTool, onAnalyze, hasData }) {
  const safeNumeric = Array.isArray(numericColumns) ? numericColumns : []
  const safeCategorical = Array.isArray(categoricalColumns) ? categoricalColumns : []

  const showRecommendations = hasData && (safeNumeric.length > 0 || safeCategorical.length > 0)

  // Tier-based full list
  const tieredTools = useMemo(() => [
    {
      tier: 'Dasar',
      items: [
        { id: 'deskriptif', name: 'Statistik Deskriptif', desc: 'Mean, median, SD, skewness' },
        { id: 'normalitas', name: 'Uji Normalitas', desc: 'Shapiro-Wilk / K-S' },
        { id: 'korelasi', name: 'Korelasi', desc: 'Pearson & Spearman' },
        { id: 'ttest', name: 'T-Test', desc: '1-sample, independent, paired' },
      ],
    },
    {
      tier: 'Menengah',
      items: [
        { id: 'validitas', name: 'Validitas & Reliabilitas', desc: 'Item-total + Cronbach α' },
        { id: 'anova', name: 'One-way ANOVA', desc: 'F-test + post-hoc' },
        { id: 'regresi', name: 'Regresi Sederhana', desc: '1 predictor → outcome' },
        { id: 'chisquare', name: 'Chi-Square', desc: 'Asosiasi kategorik' },
        { tier: 'Menengah', id: 'mannwhitney', name: 'Mann-Whitney U', desc: 'Non-parametrik 2 grup' },
        { id: 'wilcoxon', name: 'Wilcoxon', desc: 'Non-parametrik berpasangan' },
        { id: 'kruskal', name: 'Kruskal-Wallis', desc: 'Non-parametrik ≥3 grup' },
        { id: 'ngain', name: 'N-Gain (Hake)', desc: 'Efektivitas pre-post' },
      ],
    },
    {
      tier: 'Lanjutan',
      items: [
        { id: 'twowayanova', name: 'Two-way ANOVA', desc: 'Faktorial 2 faktor' },
        { id: 'regresiganda', name: 'Regresi Berganda', desc: 'Multi predictor + VIF' },
      ],
    },
  ], [])

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

  const [showAll, setShowAll] = useState(false)
  const [search, setSearch] = useState('')

  // Flatten tiered for search
  const allToolsFlat = tieredTools.flatMap(t => t.items)
  const fuse = useMemo(() => new Fuse(allToolsFlat, { keys: ['name', 'desc'], threshold: 0.3 }), [allToolsFlat])
  const searchResults = search.trim() ? fuse.search(search).map(r => r.item) : []

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="font-heading text-2xl font-bold text-accent/15 leading-none italic select-none">03</span>
          <div>
            <h2 className="font-heading font-semibold text-sm tracking-tight">Pilih Analisis</h2>
            <p className="text-[11px] text-muted">
              {showRecommendations
                ? 'Direkomendasikan berdasarkan tipe data terdeteksi'
                : 'Pilih uji yang sesuai kebutuhan penelitianmu'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {!hasData && (
          <div className="mb-4 p-3 rounded-lg bg-accent/5 border-l-2 border-accent text-xs text-accent flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Upload dataset terlebih dahulu untuk menjalankan analisis.
          </div>
        )}

        {/* Search */}
        <div className="mb-4 relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari uji statistik… (mis. korelasi, t-test)"
            className="w-full pl-3 pr-3 py-2 text-xs border border-border rounded-lg bg-surface text-fg placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        {/* Search results */}
        {search.trim() ? (
          <div className="space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-xs text-muted text-center py-6">Tidak ada uji cocok dengan "{search}"</p>
            ) : (
              searchResults.map(item => (
                <ToolCard
                  key={item.id}
                  item={item}
                  selected={selectedTool === item.id}
                  onClick={() => hasData && onSelectTool(item.id)}
                  disabled={!hasData}
                />
              ))
            )}
          </div>
        ) : showRecommendations && !showAll ? (
          /* Recommendations by category */
          <div className="space-y-5">
            {recommendations.map(rec => (
              <div key={rec.category}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-heading font-semibold uppercase tracking-[0.14em] text-accent">{rec.category}</span>
                  <span className="flex-1 h-px bg-border" />
                </div>
                <p className="text-[11px] text-muted mb-2">{categoryHints[rec.category]}</p>
                <div className="space-y-2">
                  {rec.items.map(item => (
                    <ToolCard
                      key={item.id}
                      item={item}
                      selected={selectedTool === item.id}
                      onClick={() => hasData && onSelectTool(item.id)}
                      disabled={!hasData}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Tiered full grid */
          <div className="space-y-5">
            {tieredTools.map(group => (
              <div key={group.tier}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-heading font-semibold uppercase tracking-[0.14em] text-muted">{group.tier}</span>
                  <span className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.items.map(item => (
                    <ToolCard
                      key={item.id}
                      item={item}
                      selected={selectedTool === item.id}
                      onClick={() => hasData && onSelectTool(item.id)}
                      disabled={!hasData}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Toggle all / recommendations */}
        {showRecommendations && !search.trim() && (
          <div className="mt-5 pt-4 border-t border-border">
            <button
              onClick={() => setShowAll(!showAll)}
              className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors"
            >
              {showAll ? '← Tampilkan rekomendasi' : 'Lihat semua 14 uji'}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Tool card — reusable, scholarly
function ToolCard({ item, selected, onClick, disabled }) {
  const tier = item.tier || (['deskriptif', 'normalitas', 'korelasi', 'ttest'].includes(item.id) ? 'Dasar' :
    ['twowayanova', 'regresiganda'].includes(item.id) ? 'Lanjutan' : 'Menengah')
  const tierColor = tier === 'Dasar' ? 'text-teal bg-teal/10' : tier === 'Lanjutan' ? 'text-terracotta bg-terracotta/10' : 'text-accent bg-accent/10'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full text-left p-3 rounded-lg border transition-all duration-200
        ${disabled ? 'opacity-40 cursor-not-allowed border-border' :
          selected ? 'border-accent bg-accent/5 shadow-sm' :
          'border-border hover:border-accent/40 hover:bg-surface/50 bg-card'}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-heading font-medium text-sm ${selected ? 'text-accent' : 'text-fg'}`}>
              {item.name || item.label}
            </span>
            {/* Tier badge selalu tampil — color coding penting walau mode compact. */}
            <span className={`text-[9px] font-medium uppercase tracking-wider px-1.5 py-px rounded-full ${tierColor}`}>{tier}</span>
          </div>
          <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{item.desc}</p>
        </div>
        <ArrowRight className={`w-3.5 h-3.5 mt-1 flex-shrink-0 transition-colors ${selected ? 'text-accent' : 'text-muted/30'}`} />
      </div>
    </button>
  )
}

// ============================================================
// Hero — editorial empty state (hanya saat belum upload).
// Ruled-lines pattern (notebook) + floating shape samar.
// ============================================================
function StatistikHero() {
  const FLOW = [
    { icon: FileSpreadsheet, label: 'Upload', tint: 'text-accent' },
    { icon: Activity, label: 'Analisis', tint: 'text-teal' },
    { icon: ClipboardCheck, label: 'Interpretasi', tint: 'text-terracotta' },
    { icon: ArrowRight, label: 'Export DOCX', tint: 'text-accent', strong: true },
  ]
  return (
    <section
      className="relative overflow-hidden border-b border-border"
      style={{
        background: 'rgb(var(--surface))',
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 22px, rgb(var(--border) / 0.12) 22px, rgb(var(--border) / 0.12) 23px)',
      }}
    >
      {/* Ambient gradient blobs — shared component, hero variant */}
      <AmbientBlobs variant="hero" />

      <div className="relative max-w-3xl px-5 pt-8 sm:pt-10 pb-6 sm:pb-8">
        <ScrollReveal>
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-6 h-px bg-accent" />
            <span className="text-[10px] font-semibold text-accent tracking-[0.18em] uppercase">
              Modul Statistik
            </span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.04}>
          <h2 className="font-heading text-xl sm:text-3xl font-bold text-fg leading-[1.1] tracking-tight">
            Dari data mentah menjadi{' '}
            <span className="italic text-accent">kesimpulan</span>{' '}
            yang siap ditulis.
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="mt-4"><Flourish /></div>
        </ScrollReveal>

        {/* Flow hint — compact pill row, sama motif dengan Home hero */}
        <ScrollReveal delay={0.2}>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-[13px]">
            {FLOW.map((f, i) => (
              <div key={f.label} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card ${
                    f.strong ? 'border-accent/30 bg-accent/5' : 'border-border'
                  }`}
                >
                  <f.icon className={`w-3.5 h-3.5 ${f.tint}`} />
                  <span className={f.strong ? 'text-accent font-medium' : 'text-muted'}>
                    {f.label}
                  </span>
                </div>
                {i < FLOW.length - 1 && (
                  <span className="text-accent/30 hidden sm:block">→</span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-muted/70">
            Mulai dari upload file Excel/CSV, lalu pilih uji statistik yang sesuai.
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}

export default function StatistikFlow({
  file, data: propData, columns, numericColumns, categoricalColumns, error,
  activeTool, selectedTool, onSelectTool,
  onFileUpload, onExampleLoad, onOpenGuide, onAnalyze, onDataChange, onPasteData, onClearFile,
  analyzing, result, priceLabel, children,
}) {
  const [originalData, setOriginalData] = useState(null)
  const [editedData, setEditedData] = useState(null)
  const [editingCell, setEditingCell] = useState(null)
  const [draftValue, setDraftValue] = useState('')
  const [hasEdits, setHasEdits] = useState(false)

  const data = editedData || propData

  // Snapshot "original" (sebelum edit) berdasarkan signature dataset.
  // Saat struktur berubah (upload/paste/example/clean → kolom atau baris beda),
  // re-snapshot fresh & reset state edit. Saan hanya nilai cell diubah (edit),
  // signature identik → originalData dipertahankan untuk Reset.
  // Sebelumnya pakai effect [file] terpisah → race condition bisa menyisakan
  // originalData=null lalu Reset mengirim null ke parent (data hilang).
  const lastSigRef = useRef('')
  useEffect(() => {
    if (!propData) { lastSigRef.current = ''; return }
    const cols = Object.keys(propData)
    const n = cols.length ? (propData[cols[0]]?.length || 0) : 0
    const sig = cols.join(',') + '|' + n
    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig
      setOriginalData(propData)
      setEditedData(null)
      setHasEdits(false)
      setEditingCell(null)
    }
  }, [propData])

  const handleCellClick = useCallback((rowIndex, col, value) => {
    setEditingCell({ rowIndex, col })
    setDraftValue(value === null || value === undefined ? '' : String(value))
  }, [])

  const handleCellChange = useCallback((value) => {
    setDraftValue(value)
  }, [])

  const handleCellSave = useCallback((col, rowIndex) => {
    setEditingCell(null)
    const trimmed = draftValue.trim()
    let newValue
    if (trimmed === '') {
      newValue = null
    } else {
      const normalized = trimmed.replace(',', '.')
      if (!isNaN(normalized) && normalized !== '') {
        newValue = Number(normalized)
      } else {
        newValue = trimmed
      }
    }
    const base = editedData || propData
    if (!base) return
    const colValues = Array.isArray(base[col]) ? [...base[col]] : []
    if (colValues[rowIndex] === newValue) return // no-op: nilai tak berubah
    colValues[rowIndex] = newValue
    const next = { ...base, [col]: colValues }
    setEditedData(next)
    setHasEdits(true)
    // Propagasi ke parent agar analisis, pricing, filter & deteksi tipe kolom
    // memakai data teredit — tanpa ini edit di preview cuma kosmetik.
    if (onDataChange) onDataChange(next)
  }, [draftValue, propData, editedData, onDataChange])

  const handleCellCancel = useCallback(() => {
    setEditingCell(null)
  }, [])

  const handleReset = useCallback(() => {
    setEditedData(originalData)
    setHasEdits(false)
    setEditingCell(null)
    if (onDataChange) onDataChange(originalData)
  }, [originalData, onDataChange])

  const currentStep = useMemo(() => {
    if (!file || !data) return 'upload'
    if (result) return 'results'
    if (analyzing) return 'select'
    return 'review'
  }, [file, data, result, analyzing])

  const completed = useMemo(() => {
    const c = []
    if (currentStep !== 'upload') c.push('upload')
    if (currentStep !== 'upload' && currentStep !== 'review') c.push('review')
    if (currentStep === 'results') c.push('select')
    return c
  }, [currentStep])

  return (
    <div>
      {/* Hero hanya saat belum upload — kasih konteks editorial, hilang setelah data masuk */}
      {!file && <StatistikHero />}

      <StepIndicator current={currentStep} completed={completed} />

      {/* Step 1: Upload */}
      <StepUpload
        file={file}
        data={data}
        error={error}
        onFileUpload={onFileUpload}
        onPasteData={onPasteData}
        onExampleLoad={onExampleLoad}
        onOpenGuide={onOpenGuide}
        onClearFile={onClearFile}
      />

      {/* Step 2: Review */}
      {data && (
        <div className="mt-3">
          <StepReview
            columns={columns}
            data={data}
            numericColumns={numericColumns}
            categoricalColumns={categoricalColumns}
            editingCell={editingCell}
            draftValue={draftValue}
            hasEdits={hasEdits}
            onCellClick={handleCellClick}
            onCellChange={handleCellChange}
            onCellSave={handleCellSave}
            onCellCancel={handleCellCancel}
            onReset={handleReset}
          />
        </div>
      )}

      {/* Step 3: Select — only after data is uploaded */}
      {data && (
      <div className="mt-3">
        <StepSelect
          numericColumns={numericColumns}
          categoricalColumns={categoricalColumns}
          selectedTool={selectedTool}
          onSelectTool={onSelectTool}
          onAnalyze={onAnalyze}
          hasData={!!data}
        />
      </div>
      )}

      {/* Analyze button */}
      {data && selectedTool && (
        <div className="mt-4 sticky bottom-[calc(72px+env(safe-area-inset-bottom))] lg:bottom-0 bg-card py-3 -mx-4 px-4 border-t border-border md:border-0 md:bg-transparent md:py-0 md:mx-0 md:px-0 md:mt-4">
          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className="group w-full py-3 rounded-xl bg-accent hover:bg-accent/90 text-accent-fg font-heading font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {analyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-accent-fg/30 border-t-accent-fg rounded-full animate-spin" />
                Menganalisis…
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" />
                <span>Jalankan Analisis</span>
                {priceLabel && (
                  <span className="ml-1 text-[11px] font-medium opacity-80 border-l border-accent-fg/30 pl-2">
                    {priceLabel}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      )}

      {/* Results (children) */}
      {children}
    </div>
  )
}

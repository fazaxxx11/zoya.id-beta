// src/components/statistik/StatistikFlow.jsx
// Guided step-based flow for Statistik page
import Fuse from 'fuse.js'
// Wraps existing logic, presents as Upload → Review → Select → Results → Interpret → Export

import { useState, useMemo, useCallback } from 'react'
import {
  Upload, Table, BarChart3, Brain, Download, CheckCircle,
  ChevronRight, AlertCircle, FileSpreadsheet, ArrowRight,
} from 'lucide-react'
import DataPreview from '../DataPreview'

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
              isDone ? 'text-accent' :
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
function StepReview({ columns, data, numericColumns, categoricalColumns, editingCell, draftValue, hasEdits, onCellClick, onCellChange, onCellSave, onCellCancel, onReset }) {
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
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-lg font-semibold text-fg">Data kamu sudah terbaca</h2>
        {hasEdits && (
          <button
            onClick={onReset}
            className="text-xs text-muted hover:text-fg border border-border rounded-lg px-3 py-1.5 transition-colors"
          >
            Reset ke file asli
          </button>
        )}
      </div>
      <p className="text-sm text-muted mb-5">
        Cek beberapa baris pertama untuk memastikan header, angka, dan kategori terbaca dengan benar sebelum memilih analisis.
      </p>

      {/* Edit status */}
      {hasEdits && (
        <div className="mb-5 p-3 rounded-lg bg-accent/5 border border-accent/20 text-sm text-accent">
          Data sudah diubah — hasil analisis akan memakai data terbaru.
        </div>
      )}

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
      <p className="text-xs text-muted mb-2">
        Azezmen mendeteksi tipe variabel secara otomatis. Kamu bisa lanjut jika tipe sudah sesuai.
      </p>
      <div className="overflow-x-auto mb-6">
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
                      <span className="text-accent text-xs">0</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Spreadsheet preview — editable */}
      {totalRows > 0 && safeColumns.length > 0 && (
        <div className="mt-2">
          <h3 className="text-sm font-semibold text-fg mb-1">Preview Dataset</h3>
          <p className="text-xs text-muted mb-1">
            Klik cell untuk memperbaiki nilai kecil. Untuk edit besar, ubah file Excel lalu upload ulang.
          </p>
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
                                className="w-full px-1.5 py-0.5 text-xs font-mono border border-accent rounded bg-card text-fg outline-none"
                              />
                            </td>
                          )
                        }

                        return (
                          <td
                            key={col}
                            onClick={() => onCellClick(i, col, value)}
                            className="px-3 py-1.5 border-r border-border last:border-r-0 font-mono max-w-[180px] truncate cursor-pointer hover:bg-accent/5 transition-colors"
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
          {totalRows > 20 && (
            <p className="text-xs text-muted mt-2 italic">
              Untuk perubahan besar, sebaiknya edit file Excel lalu upload ulang.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Step 3: Select Analysis (guided recommendations)
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

  // Show flat list when no data, recommendations when data exists
  const showRecommendations = hasData && (safeNumeric.length > 0 || safeCategorical.length > 0)

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
  const [search, setSearch] = useState('')
  const fuse = useMemo(() => new Fuse(allTools, { keys: ['name', 'desc'], threshold: 0.3 }), [])
  const filteredAllTools = search.trim() ? fuse.search(search).map(r => r.item) : allTools

  return (
    <div className="border border-border bg-card rounded-xl p-6">
      <GuideSection />
      <h2 className="text-lg font-semibold text-fg mb-1">Analisis apa yang ingin kamu lakukan?</h2>
      <p className="text-sm text-muted mb-5">
        {showRecommendations
          ? 'Azezmen merekomendasikan analisis berdasarkan tipe data yang terdeteksi.'
          : 'Pilih analisis yang sesuai kebutuhan penelitianmu.'}
      </p>

      {!hasData && (
        <div className="mb-4 p-3 rounded-lg bg-accent/5 border border-accent/20 text-sm text-accent flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Upload dataset terlebih dahulu untuk menjalankan analisis.
        </div>
      )}

      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari uji statistik... (tekan /)"
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          onKeyDown={e => { if (e.key === '/') { e.preventDefault(); e.target.focus() } }}
        />
      </div>

      {showRecommendations && !search.trim() ? (
        /* Recommendations by category */
        <div className="space-y-5">
          {recommendations.map(rec => (
            <div key={rec.category}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">{rec.category}</h3>
              <p className="text-xs text-muted/70 mb-2">{categoryHints[rec.category] || ''}</p>
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
      ) : (
        /* Flat list — all tools or search results */
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filteredAllTools.map(tool => (
            <button
              key={tool.id}
              onClick={() => hasData && onSelectTool(tool.id)}
              disabled={!hasData}
              className={`text-left px-3 py-3 rounded-lg border text-xs transition-colors ${
                !hasData ? 'opacity-50 cursor-not-allowed border-border bg-card text-muted' :
                selectedTool === tool.id
                  ? 'border-accent bg-accent/5 text-accent font-medium'
                  : 'border-border hover:border-accent/30 text-muted hover:text-fg'
              }`}
            >
              <div className="font-medium">{tool.name}</div>
            </button>
          ))}
          {search.trim() && filteredAllTools.length === 0 && (
            <p className="col-span-full text-sm text-muted text-center py-4">Tidak ada uji yang cocok dengan \"{search}\"</p>
          )}
        </div>
      )}

      {/* Advanced toggle — only show when recommendations are visible */}
      {showRecommendations && (
      <div className="mt-6 pt-4 border-t border-border">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-muted hover:text-fg transition-colors"
        >
          {showAdvanced ? 'Sembunyikan semua analisis' : 'Lihat semua analisis →'}
        </button>
        {showAdvanced && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filteredAllTools.map(tool => (
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
      )}
    </div>
  )
}

// ============================================================
// Export
// ============================================================
// ============================================================
// Always-visible Test Selection Panel
// Shows all 13 tests even before upload
// ============================================================
// ============================================================
// Guide Section (collapsible how-to)
// ============================================================
function GuideSection() {
  const [open, setOpen] = useState(false)

  const steps = [
    { num: '1', title: 'Upload Data', desc: 'Siapkan file CSV atau Excel. Baris pertama = nama kolom, isi = data.' },
    { num: '2', title: 'Cek Variabel', desc: 'Azezmen otomatis deteksi kolom numerik dan kategori. Pastikan benar.' },
    { num: '3', title: 'Pilih Uji', desc: 'Pilih analisis yang sesuai. Kalau bingung, gunakan rekomendasi otomatis.' },
    { num: '4', title: 'Lihat Hasil', desc: 'Hasil perhitungan + interpretasi muncul langsung. Bisa download.' },
  ]

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-muted hover:text-fg transition-colors"
      >
        <span>{open ? '▾' : '▸'}</span>
        <span className="font-medium">Cara Menggunakan Azezmen</span>
      </button>

      {open && (
        <div className="mt-4 pl-4 border-l-2 border-accent/20">
          {steps.map((step) => (
            <div key={step.num} className="mb-4 last:mb-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-mono text-accent">{step.num}.</span>
                <div>
                  <div className="text-sm font-medium text-fg">{step.title}</div>
                  <div className="text-xs text-muted mt-0.5">{step.desc}</div>
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted mt-4 italic">
            Tips: Mulai dari Statistik Deskriptif dulu untuk lihat gambaran umum data kamu.
          </p>
        </div>
      )}
    </div>
  )
}

const ALL_TESTS = [
  { id: 'deskriptif', label: 'Deskriptif', desc: 'Mean, median, SD, skewness, kurtosis', tooltip: 'Gunakan untuk gambaran umum data. Langkah pertama sebelum analisis lanjutan.' },
  { id: 'normalitas', label: 'Normalitas', desc: 'Shapiro-Wilk / Kolmogorov-Smirnov', tooltip: 'Cek apakah data berdistribusi normal. Syarat wajib sebelum pakai uji parametrik.' },
  { id: 'korelasi', label: 'Korelasi', desc: 'Pearson / Spearman', tooltip: 'Uji hubungan antar 2 variabel numerik. Pearson untuk data normal, Spearman untuk non-parametrik.' },
  { id: 'ttest', label: 'T-Test', desc: 'Bandingkan rata-rata antar grup', tooltip: 'Independent untuk 2 grup berbeda, Paired untuk sebelum-sesudah. Syarat: data normal.' },
  { id: 'anova', label: 'ANOVA', desc: 'Bandingkan rata-rata ≥3 grup', tooltip: 'Uji F untuk 3+ grup. Jika signifikan, lanjut post-hoc (Tukey). Syarat: normal + homogen.' },
  { id: 'regresi', label: 'Regresi Sederhana', desc: '1 prediktor → 1 outcome', tooltip: 'Prediksi Y dari 1 variabel X. Output: R², koefisien β, persamaan garis.' },
  { id: 'regresiganda', label: 'Regresi Berganda', desc: '≥2 prediktor → 1 outcome', tooltip: 'Prediksi Y dari beberapa X. Cek VIF untuk multikolinearitas. Output: R², adj-R², F.' },
  { id: 'chisquare', label: 'Chi-Square', desc: 'Asosiasi antar variabel kategorik', tooltip: 'Uji hubungan antar 2 variabel kategori (Laki-laki/Perempuan × Setuju/Tidak).' },
  { id: 'validitas', label: 'Validitas & Reliabilitas', desc: 'Cronbach Alpha + korelasi item', tooltip: 'Untuk instrumen kuesioner. Validitas = korelasi item-total. Reliabilitas = Cronbach α ≥ 0.7.' },
  { id: 'mannwhitney', label: 'Mann-Whitney U', desc: 'Non-parametrik, 2 grup', tooltip: 'Alternatif T-Test jika data tidak normal. Cocok untuk data ordinal atau skewed.' },
  { id: 'wilcoxon', label: 'Wilcoxon', desc: 'Non-parametrik, berpasangan', tooltip: 'Alternatif Paired T-Test jika data tidak normal. Cocok untuk pre-test/post-test.' },
  { id: 'kruskal', label: 'Kruskal-Wallis', desc: 'Non-parametrik, ≥3 grup', tooltip: 'Alternatif ANOVA jika data tidak normal. Jika signifikan, lanjut Dunn test.' },
  { id: 'ngain', label: 'N-Gain', desc: 'Efektivitas pre-post', tooltip: 'Skor gain ternormalisasi. Cocok untuk skripsi pendidikan. Interpretasi: rendah/sedang/tinggi.' },
]

function TestSelectionPanel({ data, selectedTool, onSelectTool }) {
  const [notify, setNotify] = useState(null)
  const [search, setSearch] = useState('')
  const fuse = useMemo(() => new Fuse(ALL_TESTS, { keys: ['label', 'desc', 'tooltip'], threshold: 0.3 }), [])
  const filtered = search.trim() ? fuse.search(search).map(r => r.item) : ALL_TESTS

  const handleClick = (id) => {
    if (!data) {
      setNotify(id)
      setTimeout(() => setNotify(null), 3000)
    }
    onSelectTool(id)
  }

  return (
    <div className="border border-border bg-card rounded-xl p-6">
      <GuideSection />
      <h2 className="text-base font-semibold text-fg mb-1">Pilih Uji Statistik</h2>
      <p className="text-xs text-muted mb-4">Klik uji yang ingin dijalankan. {data ? 'Pilih kolom yang sesuai di data Anda.' : 'Upload dataset terlebih dahulu untuk menjalankan analisis.'}</p>

      {!data && notify && (
        <div className="mb-3 p-2.5 rounded-lg bg-accent/5 border border-accent/20 text-xs text-accent flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          Upload dataset untuk menjalankan <strong>{ALL_TESTS.find(t => t.id === notify)?.label}</strong>
        </div>
      )}

      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari uji statistik... (tekan /)"
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filtered.map(test => (
          <button
            key={test.id}
            onClick={() => handleClick(test.id)}
            className={`text-left p-3 rounded-lg border text-xs transition-colors ${
              selectedTool === test.id
                ? 'border-accent bg-accent/5'
                : 'border-border hover:border-accent/30 bg-card'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <div className="font-medium text-fg">{test.label}</div>
              {test.tooltip && (
                <span className="opacity-50 cursor-help text-xs" title={test.tooltip}>ⓘ</span>
              )}
            </div>
            <div className="text-muted mt-0.5 leading-tight">{test.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function StatistikFlow({
  file, data: propData, columns, numericColumns, categoricalColumns, error,
  activeTool, selectedTool, onSelectTool,
  onFileUpload, onExampleLoad, onOpenGuide, onAnalyze, onDataChange,
  analyzing, children, // children = result/interpretation panels
}) {
  // Editing state
  const [originalData, setOriginalData] = useState(null)
  const [editedData, setEditedData] = useState(null)
  const [editingCell, setEditingCell] = useState(null) // { rowIndex, col }
  const [draftValue, setDraftValue] = useState('')
  const [hasEdits, setHasEdits] = useState(false)

  // Use edited data if available, otherwise prop data
  const data = editedData || propData

  // Store original data when file changes
  useMemo(() => {
    if (propData && !originalData) {
      setOriginalData(propData)
    }
  }, [propData])

  // Reset originalData when file changes (new upload)
  useMemo(() => {
    if (file) {
      setOriginalData(null)
      setEditedData(null)
      setHasEdits(false)
      setEditingCell(null)
    }
  }, [file])

  // Cell edit handlers
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
    // Convert to number if valid (supports comma decimal), otherwise string, empty = null
    let newValue
    if (trimmed === '') {
      newValue = null
    } else {
      // Replace comma with dot for number parsing
      const normalized = trimmed.replace(',', '.')
      if (!isNaN(normalized) && normalized !== '') {
        newValue = Number(normalized)
      } else {
        newValue = trimmed
      }
    }
    setEditedData(prev => {
      const base = prev || propData
      if (!base) return base
      const colValues = Array.isArray(base[col]) ? [...base[col]] : []
      if (colValues[rowIndex] === newValue) return prev // no change
      colValues[rowIndex] = newValue
      return { ...base, [col]: colValues }
    })
    setHasEdits(true)
  }, [draftValue, propData])

  const handleCellCancel = useCallback(() => {
    setEditingCell(null)
  }, [])

  const handleReset = useCallback(() => {
    setEditedData(originalData)
    setHasEdits(false)
    setEditingCell(null)
    if (onDataChange) onDataChange(originalData)
  }, [originalData, onDataChange])

  // Determine current step based on state
  const currentStep = useMemo(() => {
    if (!file || !data) return 'upload'
    if (!selectedTool) return 'select'
    if (!children) return 'select'  // still configuring params
    return 'results'
  }, [file, data, selectedTool, children])

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

      {/* Data Preview — compact summary */}
      {data && columns.length > 0 && (
        <div className="mt-4">
          <DataPreview data={data} columns={columns} compact />
        </div>
      )}

      {/* Step 3: Select — always visible */}
        <div className="mt-4">
          <StepSelect
            numericColumns={numericColumns}
            categoricalColumns={categoricalColumns}
            selectedTool={selectedTool}
            onSelectTool={onSelectTool}
            onAnalyze={onAnalyze}
            hasData={!!data}
          />
        </div>

      {/* Analyze button — sticky on mobile */}
      {data && selectedTool && (
        <div className="mt-4 sticky bottom-0 bg-bg/80 backdrop-blur-sm py-3 -mx-4 px-4 border-t border-border md:border-0 md:bg-transparent md:backdrop-blur-none md:py-0 md:mx-0 md:px-0">
          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className="w-full py-3 rounded-xl bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg md:shadow-none"
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

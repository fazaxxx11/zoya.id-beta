// Multi-file batch analysis — upload N files, pick a numeric column,
// render a side-by-side descriptive comparison matrix + bar chart.
// Useful for comparing the same metric across multiple datasets/cohorts/periods.

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { describe, oneWayANOVA, kruskalWallis, shapiroWilk } from '../lib/stats'
import jstat from 'jstat'
import { toast } from '../lib/toast'
import { generateInterpretation } from '../lib/ai/interpretStats'
import { EXAMPLE_DATASETS } from '../lib/exampleDatasets'
import MethodologyPanel from '../components/MethodologyPanel'
import PageHeader from '../components/PageHeader'

export default function StatistikBatch() {
  const [files, setFiles] = useState([]) // [{ id, name, columns, data, error? }]
  const [selectedColumn, setSelectedColumn] = useState('')
  const [parsing, setParsing] = useState(false)
  const inputRef = useRef(null)

  // -----------------------------------------------------------
  // File upload — accepts multiple
  // -----------------------------------------------------------
  const handleFiles = useCallback(async (fileList) => {
    if (!fileList || !fileList.length) return
    setParsing(true)
    const newOnes = []
    for (const f of Array.from(fileList)) {
      try {
        const parsed = await parseFile(f)
        newOnes.push({ id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: f.name, ...parsed })
      } catch (e) {
        newOnes.push({ id: `${f.name}-${Date.now()}`, name: f.name, error: e.message })
        toast.error(`${f.name}: ${e.message}`)
      }
    }
    setFiles(prev => [...prev, ...newOnes])
    setParsing(false)
  }, [])

  const onPick = (e) => {
    handleFiles(e.target.files)
    e.target.value = '' // allow re-uploading same file
  }
  const onDrop = (e) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id))
  const clearAll = () => { setFiles([]); setSelectedColumn('') }

  // Demo loader: split IPK dataset jadi 4 "file" per jurusan untuk instan demo batch ANOVA
  const loadDemoBatch = useCallback(() => {
    const ds = EXAMPLE_DATASETS.find(d => d.id === 'ipk-4-jurusan')
    if (!ds) return
    const groups = {}
    ds.data.jurusan.forEach((j, i) => {
      if (!groups[j]) groups[j] = { mahasiswa: [], ipk: [] }
      groups[j].mahasiswa.push(ds.data.mahasiswa[i])
      groups[j].ipk.push(ds.data.ipk[i])
    })
    const demoFiles = Object.entries(groups).map(([jurusan, rows], idx) => ({
      id: `demo-${jurusan}-${Date.now()}-${idx}`,
      name: `[Contoh] IPK ${jurusan}.csv`,
      columns: ['mahasiswa', 'ipk'],
      numericColumns: ['ipk'],
      data: rows,
      rowCount: rows.ipk.length,
    }))
    setFiles(demoFiles)
    setSelectedColumn('ipk')
    toast.success(`Contoh data dimuat: 4 file IPK lintas jurusan`)
  }, [])

  // -----------------------------------------------------------
  // Common numeric columns across all uploaded files
  // -----------------------------------------------------------
  const commonColumns = useMemo(() => {
    const valid = files.filter(f => !f.error && f.data && f.columns)
    if (valid.length === 0) return []
    // Intersection of numeric columns
    const sets = valid.map(f => new Set(f.numericColumns))
    let common = [...sets[0]]
    for (let i = 1; i < sets.length; i++) common = common.filter(c => sets[i].has(c))
    return common.sort((a, b) => a.localeCompare(b))
  }, [files])

  // Auto-select first common column when list changes
  useEffect(() => {
    if (!commonColumns.length) {
      if (selectedColumn) setSelectedColumn('')
      return
    }
    if (!selectedColumn || !commonColumns.includes(selectedColumn)) {
      setSelectedColumn(commonColumns[0])
    }
  }, [commonColumns, selectedColumn])

  // -----------------------------------------------------------
  // Compute descriptives matrix
  // -----------------------------------------------------------
  const matrix = useMemo(() => {
    if (!selectedColumn) return []
    return files.filter(f => !f.error).map(f => {
      const values = (f.data?.[selectedColumn] || []).filter(v => typeof v === 'number' && isFinite(v))
      const stats = values.length ? describe(values) : null
      return { id: f.id, name: f.name, stats, missing: (f.data?.[selectedColumn]?.length || 0) - values.length }
    })
  }, [files, selectedColumn])

  // -----------------------------------------------------------
  // Assumption diagnostics — Shapiro-Wilk per file + Levene across files
  // Runs only when ≥ 2 valid groups exist for the selected column.
  // -----------------------------------------------------------
  const assumptions = useMemo(() => {
    const validRows = matrix.filter(r => r.stats && r.stats.n >= 3)
    if (validRows.length < 2) return null

    const groups = validRows.map(r =>
      (files.find(f => f.id === r.id)?.data?.[selectedColumn] || [])
        .filter(v => typeof v === 'number' && isFinite(v))
    )

    // Shapiro-Wilk per file (only if 3 ≤ n ≤ 5000)
    const normality = validRows.map((r, i) => {
      const g = groups[i]
      try {
        if (g.length < 3) return { name: r.name, n: g.length, skipped: 'n < 3' }
        const sw = shapiroWilk(g)
        return { name: r.name, ...sw }
      } catch (e) {
        return { name: r.name, error: e.message }
      }
    })
    const allNormal = normality.every(x => x.isNormal === true)

    // Levene's test (Brown-Forsythe variant — uses median, robust)
    const levene = leveneTest(groups)
    const homogeneous = levene && !levene.error ? levene.pValue >= 0.05 : null

    // Recommendation
    let recommendation = 'anova'
    let reason = 'Asumsi parametrik terpenuhi.'
    if (!allNormal) {
      recommendation = 'kruskal'
      reason = 'Setidaknya satu file menyimpang dari distribusi normal — Kruskal-Wallis lebih tepat.'
    } else if (homogeneous === false) {
      recommendation = 'kruskal'
      reason = 'Varians antar file tidak homogen — Kruskal-Wallis lebih aman.'
    }

    return { normality, allNormal, levene, homogeneous, recommendation, reason }
  }, [matrix, files, selectedColumn])

  // -----------------------------------------------------------
  // Inferential test across files (treats each file as a group)
  // -----------------------------------------------------------
  const [testMethod, setTestMethod] = useState('anova') // 'anova' | 'kruskal'

  const inferential = useMemo(() => {
    const validRows = matrix.filter(r => r.stats && r.stats.n >= 2)
    if (validRows.length < 2) return null
    const groups = validRows.map(r =>
      (files.find(f => f.id === r.id)?.data?.[selectedColumn] || [])
        .filter(v => typeof v === 'number' && isFinite(v))
    )
    const labels = validRows.map(r => r.name.replace(/\.[^.]+$/, ''))
    try {
      const out = testMethod === 'kruskal'
        ? kruskalWallis(groups, labels)
        : oneWayANOVA(groups, labels)
      return out?.error ? { error: out.error } : { ...out, method: testMethod }
    } catch (e) {
      return { error: e.message }
    }
  }, [matrix, files, selectedColumn, testMethod])

  // -----------------------------------------------------------
  // Excel export
  // -----------------------------------------------------------
  const exportExcel = async () => {
    if (!matrix.length) return
    const XLSX = await import('xlsx')
    const rows = matrix.map(r => ({
      File: r.name,
      Column: selectedColumn,
      n: r.stats?.n ?? 0,
      Missing: r.missing ?? 0,
      Mean: r.stats?.mean,
      SD: r.stats?.stdDev,
      Median: r.stats?.median,
      Min: r.stats?.min,
      Max: r.stats?.max,
      Q1: r.stats?.q1,
      Q3: r.stats?.q3,
      IQR: r.stats?.iqr,
      SEM: r.stats?.sem,
      Skewness: r.stats?.skewness,
      Kurtosis: r.stats?.kurtosis,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Batch Comparison')
    XLSX.writeFile(wb, `batch-comparison-${selectedColumn}-${Date.now()}.xlsx`)
    toast.success('Excel di-download')
  }

  // -----------------------------------------------------------
  // Build payload for AI interpretation (combines descriptives + assumptions + inferential)
  // -----------------------------------------------------------
  const aiPayload = useMemo(() => {
    if (!inferential || inferential.error) return null
    const isANOVA = testMethod === 'anova'
    const groups = matrix
      .filter(r => r.stats)
      .map(r => ({
        name: r.name.replace(/\.[^.]+$/, ''),
        n: r.stats.n,
        mean: r.stats.mean,
        sd: r.stats.stdDev,
        median: r.stats.median,
      }))
    // Raw values per file untuk reproducibility R script
    const groupsRaw = files
      .filter(f => !f.error && f.data && f.data[selectedColumn])
      .map(f => ({
        name: f.name.replace(/\.[^.]+$/, ''),
        values: f.data[selectedColumn].filter(v => typeof v === 'number' && !isNaN(v)),
      }))
    const base = {
      type: isANOVA ? 'batch_anova' : 'batch_kruskal',
      toolName: isANOVA ? 'Batch ANOVA (lintas file)' : 'Batch Kruskal-Wallis (lintas file)',
      column: selectedColumn,
      fileCount: groups.length,
      groups,
      groupsRaw,
      assumptions: assumptions ? {
        allNormal: assumptions.allNormal,
        homogeneous: assumptions.homogeneous,
        recommendation: assumptions.recommendation,
      } : null,
      alpha: inferential.alpha ?? 0.05,
    }
    if (isANOVA) {
      return {
        ...base,
        F: inferential.F,
        dfBetween: inferential.dfBetween,
        dfWithin: inferential.dfWithin,
        pValue: inferential.pValue,
        etaSquared: inferential.etaSquared,
        omegaSquared: inferential.omegaSquared,
        effectSize: inferential.effectSize,
        significant: inferential.significant,
        N: inferential.N,
        posthoc: inferential.postHoc?.comparisons || [],
      }
    }
    return {
      ...base,
      H: inferential.H,
      df: inferential.df,
      pValue: inferential.pValue,
      etaSquared: inferential.etaSquared,
      effectSizeLabel: inferential.effectSizeLabel,
      isSignificant: inferential.isSignificant,
      N: inferential.N,
      k: inferential.k,
    }
  }, [matrix, assumptions, inferential, testMethod, selectedColumn, files])

  const exportPDF = async () => {
    if (!matrix.length) return
    try {
      await buildBatchPDF({
        column: selectedColumn,
        matrix,
        assumptions,
        inferential,
        method: testMethod,
      })
      toast.success('PDF di-download')
    } catch (e) {
      console.error(e)
      toast.error('Gagal export PDF: ' + e.message)
    }
  }

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#fafafa] pb-bottomnav">
      <PageHeader
        title="Bandingkan Banyak File Sekaligus"
        subtitle="Batch Analysis"
        parentPath="/statistik"
        parentLabel="Statistik"
        breadcrumbs={[
          { path: '/statistik', label: 'Statistik' },
          { label: 'Batch Analysis' },
        ]}
      />

      <main className="max-w-6xl mx-auto px-3 sm:px-5 py-4 sm:py-6 space-y-4 sm:space-y-5">
        {/* Drop zone */}
        <div onDrop={onDrop} onDragOver={e => e.preventDefault()}
             className="bg-white rounded-2xl border border-dashed border-gray-300 p-5 sm:p-8 text-center hover:border-gray-400 transition-colors">
          <div className="text-sm text-gray-600 mb-3">
            Drop beberapa file Excel/CSV di sini, atau pilih file. Tiap file dianggap satu dataset.
          </div>
          <input ref={inputRef} type="file" multiple accept=".xlsx,.xls,.csv"
                 onChange={onPick} className="hidden" />
          <button onClick={() => inputRef.current?.click()}
                  className="bg-gray-900 hover:bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg">
            {parsing ? 'Parsing…' : 'Pilih File'}
          </button>
          {files.length > 0 && (
            <button onClick={clearAll}
                    className="ml-2 text-xs text-muted hover:text-gray-900 px-3 py-2.5">
              Hapus semua
            </button>
          )}
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="bg-white rounded-2xl border border-border p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-3">
              File ({files.length})
            </div>
            <div className="space-y-2">
              {files.map(f => (
                <div key={f.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{f.name}</div>
                    {f.error ? (
                      <div className="text-xs text-red-600 mt-0.5">{f.error}</div>
                    ) : (
                      <div className="text-xs text-muted mt-0.5">
                        {f.rowCount} baris · {f.columns?.length} kolom · {f.numericColumns?.length} numerik
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeFile(f.id)}
                          className="text-xs text-muted hover:text-red-600 px-2 py-1">
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Column picker */}
        {commonColumns.length > 0 && (
          <div className="bg-white rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-1">Kolom Numerik</div>
                <div className="text-sm text-gray-600">Pilih kolom yang ada di semua file untuk dibandingkan.</div>
              </div>
              {matrix.length > 0 && (
                <div className="flex items-center gap-2">
                  <button onClick={exportPDF}
                          className="text-gray-700 hover:text-gray-900 border border-border hover:bg-surface text-xs font-medium px-4 py-2 rounded-lg">
                    Export PDF
                  </button>
                  <button onClick={exportExcel}
                          className="bg-gray-900 hover:bg-black text-white text-xs font-medium px-4 py-2 rounded-lg">
                    Export Excel
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {commonColumns.map(c => (
                <button key={c} onClick={() => setSelectedColumn(c)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          selectedColumn === c
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-700 border-border hover:border-gray-400'
                        }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && commonColumns.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            Tidak ada kolom numerik yang sama di semua file. Pastikan file punya header dan kolom angka yang serupa
            (mis. semua punya kolom “Nilai” atau “Skor”).
          </div>
        )}

        {/* Comparison matrix */}
        {matrix.length > 0 && (
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-1">Matriks Perbandingan</div>
              <div className="text-sm font-semibold text-gray-800">Statistik deskriptif: <span className="text-gray-600 font-normal">{selectedColumn}</span></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface text-muted uppercase tracking-wider">
                  <tr>
                    {['File', 'n', 'Mean', 'SD', 'Median', 'Min', 'Max', 'Q1', 'Q3', 'Skew', 'Kurt'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {matrix.map(r => (
                    <tr key={r.id} className="hover:bg-surface/60">
                      <td className="px-3 py-2.5 font-medium text-gray-800 truncate max-w-[200px]" title={r.name}>{r.name}</td>
                      {r.stats ? (
                        <>
                          <td className="px-3 py-2.5 tabular-nums text-gray-700">{r.stats.n}</td>
                          <td className="px-3 py-2.5 tabular-nums text-gray-700">{fmt(r.stats.mean)}</td>
                          <td className="px-3 py-2.5 tabular-nums text-gray-700">{fmt(r.stats.stdDev)}</td>
                          <td className="px-3 py-2.5 tabular-nums text-gray-700">{fmt(r.stats.median)}</td>
                          <td className="px-3 py-2.5 tabular-nums text-gray-700">{fmt(r.stats.min)}</td>
                          <td className="px-3 py-2.5 tabular-nums text-gray-700">{fmt(r.stats.max)}</td>
                          <td className="px-3 py-2.5 tabular-nums text-gray-700">{fmt(r.stats.q1)}</td>
                          <td className="px-3 py-2.5 tabular-nums text-gray-700">{fmt(r.stats.q3)}</td>
                          <td className="px-3 py-2.5 tabular-nums text-gray-700">{fmt(r.stats.skewness, 2)}</td>
                          <td className="px-3 py-2.5 tabular-nums text-gray-700">{fmt(r.stats.kurtosis, 2)}</td>
                        </>
                      ) : (
                        <td colSpan={10} className="px-3 py-2.5 text-muted italic">Tidak ada data numerik valid</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Assumption diagnostics */}
        {assumptions && (
          <AssumptionsPanel
            data={assumptions}
            onApplyRecommendation={() => setTestMethod(assumptions.recommendation)}
            currentMethod={testMethod}
          />
        )}

        {/* Inferential test across files */}
        {inferential && !inferential.error && (
          <InferentialPanel
            result={inferential}
            method={testMethod}
            onMethodChange={setTestMethod}
            column={selectedColumn}
          />
        )}
        {inferential?.error && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            Tidak bisa menjalankan uji: {inferential.error}
          </div>
        )}

        {/* AI interpretation */}
        {aiPayload && <BatchAIPanel payload={aiPayload} />}

        {/* Citation + R script (Strategy A+B+C) */}
        {aiPayload && <MethodologyPanel result={aiPayload} />}

        {/* Mean ± SD bar chart */}
        {matrix.length > 0 && matrix.some(r => r.stats) && (
          <MeanComparisonChart matrix={matrix} column={selectedColumn} />
        )}

        {files.length === 0 && (
          <div className="text-center py-16 text-sm">
            <div className="text-muted mb-3">Belum ada file. Upload minimal 2 file untuk membandingkan.</div>
            <button onClick={loadDemoBatch}
                    className="text-sky-600 hover:text-sky-700 font-medium inline-flex items-center gap-1 text-xs">
              ✨ Coba dengan contoh data (IPK 4 jurusan)
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

// ============================================================
// Assumptions panel — Shapiro-Wilk per file + Levene across files
// ============================================================
function AssumptionsPanel({ data, onApplyRecommendation, currentMethod }) {
  const { normality, allNormal, levene, homogeneous, recommendation, reason } = data
  const recommendsKruskal = recommendation === 'kruskal'
  const matchesCurrent = recommendation === currentMethod

  return (
    <div className="bg-white rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-1">Cek Asumsi</div>
          <div className="text-sm font-semibold text-gray-800">Apakah asumsi ANOVA terpenuhi?</div>
        </div>
        {!matchesCurrent && (
          <button onClick={onApplyRecommendation}
                  className="bg-gray-900 hover:bg-black text-white text-xs font-medium px-3 py-1.5 rounded-lg">
            Pakai {recommendsKruskal ? 'Kruskal-Wallis' : 'ANOVA'} (rekomendasi)
          </button>
        )}
      </div>

      {/* Recommendation banner */}
      <div className={`rounded-lg px-4 py-3 mb-4 text-[13px] leading-relaxed ${
        recommendsKruskal
          ? 'bg-amber-50 border border-amber-200 text-amber-900'
          : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
      }`}>
        <div className="font-medium mb-0.5">
          {recommendsKruskal ? 'Rekomendasi: Kruskal-Wallis' : 'Rekomendasi: One-way ANOVA'}
        </div>
        <div className="text-[12.5px] opacity-90">{reason}</div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Normality */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">Normalitas (Shapiro-Wilk)</div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              allNormal ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {allNormal ? 'Semua normal' : 'Ada yang tidak normal'}
            </span>
          </div>
          <div className="space-y-1.5">
            {normality.map((n, i) => (
              <div key={i} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-surface border border-border">
                <div className="truncate font-medium text-gray-800 mr-2" title={n.name}>{n.name}</div>
                <div className="flex items-center gap-2 shrink-0">
                  {n.skipped ? (
                    <span className="text-muted italic">{n.skipped}</span>
                  ) : n.error ? (
                    <span className="text-red-500 italic">{n.error}</span>
                  ) : (
                    <>
                      <span className="tabular-nums text-gray-600">W = {fmt(n.W, 3)}</span>
                      <span className="tabular-nums text-gray-600">p = {fmtP(n.pValue)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        n.isNormal ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {n.isNormal ? 'normal' : 'tidak'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Homogeneity (Levene) */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">Homogenitas Varians (Levene)</div>
            {homogeneous != null && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                homogeneous ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {homogeneous ? 'Homogen' : 'Tidak homogen'}
              </span>
            )}
          </div>
          {levene?.error ? (
            <div className="text-xs text-muted italic px-3 py-2 bg-surface rounded-lg">
              Tidak dapat dihitung: {levene.error}
            </div>
          ) : levene ? (
            <div className="px-3 py-3 rounded-lg bg-surface border border-border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted">F({levene.dfBetween}, {levene.dfWithin})</span>
                <span className="tabular-nums font-medium text-gray-800">{fmt(levene.F, 3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">p-value</span>
                <span className="tabular-nums font-medium text-gray-800">{fmtP(levene.pValue)}</span>
              </div>
              <div className="text-[11px] text-muted pt-1.5 border-t border-border/60 leading-relaxed">
                Levene Brown-Forsythe (median-based). H₀: varians antar grup sama. p &lt; 0,05 → tolak H₀ (varians tidak homogen).
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// AI Interpretation panel for batch — calls /api/interpret-stats
// with synthesized batch_anova/batch_kruskal payload, falls back to
// deterministic local template when all providers are rate-limited.
// ============================================================
function BatchAIPanel({ payload }) {
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const [provider, setProvider] = useState(null)
  const [isFallback, setIsFallback] = useState(false)
  const [error, setError] = useState(null)

  // Reset when method or column changes (payload identity changes via memo)
  useEffect(() => { setText(''); setProvider(null); setError(null); setIsFallback(false) },
    [payload?.type, payload?.column])

  const generate = async () => {
    setLoading(true); setError(null); setText('')
    const out = await generateInterpretation(payload)
    if (out.ok) {
      setText(out.text)
      setProvider(out.provider)
      setIsFallback(!!out.fallback)
    } else {
      setError(out.error)
    }
    setLoading(false)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Interpretasi disalin ke clipboard')
    } catch {
      toast.error('Gagal menyalin')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-1">Interpretasi AI</div>
          <div className="text-sm text-gray-600">Paragraf akademik siap-paste untuk skripsi (Bahasa Indonesia, format APA).</div>
        </div>
        {!text && !loading && (
          <button onClick={generate}
                  className="bg-gray-900 hover:bg-black text-white text-xs font-medium px-4 py-2 rounded-lg">
            Generate
          </button>
        )}
        {text && (
          <div className="flex items-center gap-2">
            <button onClick={copy}
                    className="text-xs text-gray-600 hover:text-gray-900 border border-border hover:bg-surface px-3 py-2 rounded-lg">
              Salin
            </button>
            <button onClick={generate} disabled={loading}
                    className="text-xs text-gray-600 hover:text-gray-900 border border-border hover:bg-surface px-3 py-2 rounded-lg disabled:opacity-50">
              {loading ? 'Memproses…' : 'Regenerate'}
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-surface border border-border/80 rounded-lg p-4 text-sm text-muted flex items-center gap-2">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
          Menulis interpretasi…
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          Gagal: {error}
        </div>
      )}

      {text && !loading && (
        <div className="bg-surface border border-border/80 rounded-lg p-4">
          {isFallback && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-[11px] text-amber-800 leading-relaxed">
              <span className="font-medium">Mode offline:</span> AI provider sedang sibuk, jadi interpretasi disusun dari template lokal berdasarkan angka. Coba <em>Regenerate</em> beberapa saat lagi untuk versi AI.
            </div>
          )}
          <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed text-[13.5px]">
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
// Inferential test panel — ANOVA / Kruskal-Wallis across files
// ============================================================
function InferentialPanel({ result, method, onMethodChange, column }) {
  const isANOVA = method === 'anova'
  const sig = method === 'anova' ? result.significant : result.isSignificant
  const pVal = result.pValue

  return (
    <div className="bg-white rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-1">Uji Inferensial</div>
          <div className="text-sm font-semibold text-gray-800">
            Apakah <span className="text-gray-600 font-normal">{column}</span> berbeda nyata antar file?
          </div>
        </div>
        <div className="inline-flex border border-border rounded-lg p-0.5 bg-surface">
          <button onClick={() => onMethodChange('anova')}
                  className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                    method === 'anova' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-muted hover:text-gray-800'
                  }`}>
            One-way ANOVA
          </button>
          <button onClick={() => onMethodChange('kruskal')}
                  className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                    method === 'kruskal' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-muted hover:text-gray-800'
                  }`}>
            Kruskal-Wallis
          </button>
        </div>
      </div>

      {/* Verdict pill */}
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium mb-4 ${
        sig ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-surface text-gray-600 border border-border'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${sig ? 'bg-emerald-500' : 'bg-gray-400'}`} />
        {sig ? 'Signifikan' : 'Tidak signifikan'} pada α = {result.alpha ?? 0.05}
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {isANOVA ? (
          <>
            <Stat label={`F(${result.dfBetween}, ${result.dfWithin})`} value={fmt(result.F, 3)} />
            <Stat label="p-value" value={fmtP(pVal)} highlight={sig} />
            <Stat label="η² (eta²)" value={fmt(result.etaSquared, 3)} sub={result.effectSize} />
            <Stat label="ω² (omega²)" value={fmt(result.omegaSquared, 3)} />
          </>
        ) : (
          <>
            <Stat label={`H(${result.df})`} value={fmt(result.H, 3)} />
            <Stat label="p-value" value={fmtP(pVal)} highlight={sig} />
            <Stat label="η²_H" value={fmt(result.etaSquared, 3)} sub={result.effectSizeLabel} />
            <Stat label="N total" value={String(result.N)} sub={`${result.k} grup`} />
          </>
        )}
      </div>

      {/* Interpretation */}
      {result.interpretation && (
        <div className="bg-surface border border-border/80 rounded-lg p-3 text-[13px] text-gray-700 leading-relaxed mb-4">
          {result.interpretation}
        </div>
      )}

      {/* Post-hoc (ANOVA only, when significant) */}
      {isANOVA && result.postHoc?.comparisons?.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-2">Post-hoc (Tukey HSD / Bonferroni)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Pair</th>
                  <th className="px-3 py-2 text-left font-medium">Mean diff</th>
                  <th className="px-3 py-2 text-left font-medium">p (adj)</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.postHoc.comparisons.map((c, i) => (
                  <tr key={i} className={c.significant ? 'bg-emerald-50/40' : ''}>
                    <td className="px-3 py-2 text-gray-800">{c.group1} vs {c.group2}</td>
                    <td className="px-3 py-2 tabular-nums text-gray-700">{fmt(c.meanDiff, 3)}</td>
                    <td className="px-3 py-2 tabular-nums text-gray-700">{fmtP(c.pValue)}</td>
                    <td className="px-3 py-2 text-xs">
                      {c.significant
                        ? <span className="text-emerald-700 font-medium">Berbeda nyata</span>
                        : <span className="text-muted">Tidak signifikan</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Method hint */}
      <div className="mt-4 text-[11px] text-muted leading-relaxed">
        {isANOVA
          ? 'ANOVA mengasumsikan distribusi normal dan homogenitas varians. Kalau asumsi tidak terpenuhi, beralih ke Kruskal-Wallis.'
          : 'Kruskal-Wallis non-parametrik (berbasis peringkat) — robust terhadap outlier dan tidak memerlukan asumsi normalitas.'}
      </div>
    </div>
  )
}

function Stat({ label, value, sub, highlight }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted font-medium">{label}</div>
      <div className={`text-base tabular-nums font-semibold mt-0.5 ${highlight ? 'text-emerald-700' : 'text-gray-900'}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted mt-0.5 capitalize">{sub}</div>}
    </div>
  )
}

const fmtP = (p) => {
  if (p == null || !isFinite(p)) return '—'
  if (p < 0.001) return '< 0.001'
  return Number(p).toFixed(4)
}

// =====================================================================
// PDF report builder — minimalist layout, no canvas dependency.
// Sections: header → file list → descriptive matrix → assumptions → inferential.
// =====================================================================
async function buildBatchPDF({ column, matrix, assumptions, inferential, method }) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210, pageH = 297
  const mx = 16
  const contentW = pageW - mx * 2
  const state = { y: 18 }

  const ensureSpace = (h) => {
    if (state.y + h > pageH - 18) {
      doc.addPage()
      state.y = 18
    }
  }
  const text = (s, x, y, opts = {}) => {
    doc.setFontSize(opts.size || 10)
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setTextColor(opts.color || '#1f2937')
    doc.text(String(s), x, y, opts)
  }
  const rule = (y, color = '#e5e7eb') => {
    doc.setDrawColor(color)
    doc.setLineWidth(0.2)
    doc.line(mx, y, mx + contentW, y)
  }
  const sectionTitle = (label) => {
    ensureSpace(12)
    state.y += 4
    text(label.toUpperCase(), mx, state.y, { size: 8, bold: true, color: '#9ca3af' })
    state.y += 4
    rule(state.y)
    state.y += 4
  }

  // Header
  text('Batch Comparison Report', mx, state.y, { size: 16, bold: true })
  state.y += 6
  text(`Kolom dianalisis: ${column}`, mx, state.y, { size: 10, color: '#4b5563' })
  state.y += 4.5
  text(`Jumlah file: ${matrix.length}  ·  Tanggal: ${new Date().toLocaleString('id-ID')}`,
       mx, state.y, { size: 9, color: '#6b7280' })
  state.y += 4
  rule(state.y, '#1f2937')
  state.y += 4

  // Descriptive matrix
  sectionTitle('Statistik Deskriptif')
  const headers = ['File', 'n', 'Mean', 'SD', 'Median', 'Min', 'Max']
  const colW = [62, 12, 20, 20, 20, 20, 20]
  drawTableHeader(doc, mx, state.y, headers, colW)
  state.y += 6
  for (const r of matrix) {
    ensureSpace(6)
    const row = r.stats
      ? [truncate(r.name, 38), String(r.stats.n), fmt(r.stats.mean, 2), fmt(r.stats.stdDev, 2),
         fmt(r.stats.median, 2), fmt(r.stats.min, 2), fmt(r.stats.max, 2)]
      : [truncate(r.name, 38), '—', '—', '—', '—', '—', '—']
    drawTableRow(doc, mx, state.y, row, colW)
    state.y += 5.5
  }

  // Assumptions
  if (assumptions) {
    sectionTitle('Cek Asumsi')
    text(`Rekomendasi: ${assumptions.recommendation === 'kruskal' ? 'Kruskal-Wallis' : 'One-way ANOVA'}`,
         mx, state.y, { size: 10, bold: true, color: assumptions.recommendation === 'kruskal' ? '#b45309' : '#047857' })
    state.y += 4.5
    text(assumptions.reason, mx, state.y, { size: 9, color: '#4b5563' })
    state.y += 6

    text('Shapiro-Wilk per file:', mx, state.y, { size: 9.5, bold: true })
    state.y += 4.5
    for (const n of assumptions.normality) {
      ensureSpace(5)
      const line = n.skipped
        ? `${truncate(n.name, 50)} — ${n.skipped}`
        : n.error
        ? `${truncate(n.name, 50)} — ${n.error}`
        : `${truncate(n.name, 50)}: W = ${fmt(n.W, 3)}, p = ${fmtPlain(n.pValue)} → ${n.isNormal ? 'normal' : 'tidak normal'}`
      text(line, mx + 3, state.y, { size: 9, color: '#374151' })
      state.y += 4.5
    }
    state.y += 2

    if (assumptions.levene && !assumptions.levene.error) {
      const lv = assumptions.levene
      text('Levene (Brown-Forsythe):', mx, state.y, { size: 9.5, bold: true })
      state.y += 4.5
      text(`F(${lv.dfBetween}, ${lv.dfWithin}) = ${fmt(lv.F, 3)}, p = ${fmtPlain(lv.pValue)} → varians ${assumptions.homogeneous ? 'homogen' : 'tidak homogen'}`,
           mx + 3, state.y, { size: 9, color: '#374151' })
      state.y += 5
    }
  }

  // Inferential
  if (inferential && !inferential.error) {
    sectionTitle('Uji Inferensial')
    const isANOVA = method === 'anova'
    const sig = isANOVA ? inferential.significant : inferential.isSignificant
    text(`Metode: ${isANOVA ? 'One-way ANOVA' : 'Kruskal-Wallis'}`,
         mx, state.y, { size: 10, bold: true })
    state.y += 5

    const stats = isANOVA
      ? `F(${inferential.dfBetween}, ${inferential.dfWithin}) = ${fmt(inferential.F, 3)}, p = ${fmtPlain(inferential.pValue)}, η² = ${fmt(inferential.etaSquared, 3)} (${inferential.effectSize}), ω² = ${fmt(inferential.omegaSquared, 3)}`
      : `H(${inferential.df}) = ${fmt(inferential.H, 3)}, p = ${fmtPlain(inferential.pValue)}, η²_H = ${fmt(inferential.etaSquared, 3)} (${inferential.effectSizeLabel}), N = ${inferential.N}, k = ${inferential.k}`
    splitText(doc, stats, contentW).forEach(line => {
      ensureSpace(5)
      text(line, mx, state.y, { size: 9.5, color: '#374151' })
      state.y += 4.5
    })

    text(`Verdict: ${sig ? 'SIGNIFIKAN' : 'TIDAK SIGNIFIKAN'} pada α = ${inferential.alpha ?? 0.05}`,
         mx, state.y, { size: 10, bold: true, color: sig ? '#047857' : '#6b7280' })
    state.y += 6

    if (inferential.interpretation) {
      text('Interpretasi:', mx, state.y, { size: 9.5, bold: true })
      state.y += 4.5
      splitText(doc, inferential.interpretation, contentW).forEach(line => {
        ensureSpace(5)
        text(line, mx, state.y, { size: 9, color: '#374151' })
        state.y += 4.3
      })
      state.y += 2
    }

    // Post-hoc table (ANOVA only)
    if (isANOVA && inferential.postHoc?.comparisons?.length) {
      ensureSpace(8)
      text('Post-hoc (Bonferroni / Tukey HSD):', mx, state.y, { size: 9.5, bold: true })
      state.y += 5
      const phHeaders = ['Pair', 'Mean diff', 'p (adj)', 'Status']
      const phW = [78, 25, 25, 30]
      drawTableHeader(doc, mx, state.y, phHeaders, phW)
      state.y += 6
      for (const c of inferential.postHoc.comparisons) {
        ensureSpace(6)
        drawTableRow(doc, mx, state.y, [
          truncate(`${c.group1} vs ${c.group2}`, 50),
          fmt(c.meanDiff, 3),
          fmtPlain(c.pValue),
          c.significant ? 'Berbeda nyata' : 'Tidak signifikan',
        ], phW)
        state.y += 5.5
      }
    }
  }

  // Footer
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor('#9ca3af')
    doc.text('Azezmen', mx, pageH - 10)
    doc.text('Batch Comparison Report', pageW / 2, pageH - 10, { align: 'center' })
    doc.text(`Halaman ${i} dari ${totalPages}`, pageW - mx, pageH - 10, { align: 'right' })
  }

  doc.save(`batch-report-${column}-${Date.now()}.pdf`)
}

function drawTableHeader(doc, x, y, headers, widths) {
  doc.setFillColor('#f3f4f6')
  doc.rect(x, y - 4, widths.reduce((a, b) => a + b, 0), 5.5, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#6b7280')
  let cx = x
  headers.forEach((h, i) => {
    doc.text(h, cx + 1.5, y)
    cx += widths[i]
  })
}

function drawTableRow(doc, x, y, cells, widths) {
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#1f2937')
  let cx = x
  cells.forEach((c, i) => {
    doc.text(String(c), cx + 1.5, y)
    cx += widths[i]
  })
  doc.setDrawColor('#f3f4f6')
  doc.setLineWidth(0.1)
  doc.line(x, y + 1.5, x + widths.reduce((a, b) => a + b, 0), y + 1.5)
}

function splitText(doc, str, maxWidth) {
  doc.setFontSize(9)
  return doc.splitTextToSize(String(str), maxWidth)
}

const truncate = (s, n) => {
  const str = String(s ?? '')
  return str.length <= n ? str : str.slice(0, n - 1) + '…'
}
const fmtPlain = (p) => {
  if (p == null || !isFinite(p)) return '—'
  if (p < 0.001) return '< 0.001'
  return Number(p).toFixed(4)
}

// =====================================================================
// Levene's test (Brown-Forsythe variant — uses group medians).
// More robust to non-normality than the original Levene (mean-based).
// H₀: σ²₁ = σ²₂ = ... = σ²ₖ.  Returns ANOVA on Z_ij = |x_ij - median_i|.
// =====================================================================
function leveneTest(groups) {
  const cleanGroups = groups.map(g => g.filter(v => typeof v === 'number' && isFinite(v)))
  const k = cleanGroups.length
  if (k < 2) return { error: 'Butuh minimal 2 grup' }
  if (cleanGroups.some(g => g.length < 2)) return { error: 'Setiap grup butuh n ≥ 2' }

  // Step 1: compute median of each group
  const medians = cleanGroups.map(g => {
    const s = [...g].sort((a, b) => a - b)
    const n = s.length
    return n % 2 === 0 ? (s[n / 2 - 1] + s[n / 2]) / 2 : s[Math.floor(n / 2)]
  })

  // Step 2: transform to absolute deviations from group median
  const Z = cleanGroups.map((g, i) => g.map(v => Math.abs(v - medians[i])))

  // Step 3: one-way ANOVA on Z (closed-form, avoids circular import)
  const ns = Z.map(z => z.length)
  const N = ns.reduce((a, b) => a + b, 0)
  const groupMeans = Z.map(z => z.reduce((a, b) => a + b, 0) / z.length)
  const grandMean = Z.flat().reduce((a, b) => a + b, 0) / N

  const ssBetween = Z.reduce((s, _, i) => s + ns[i] * (groupMeans[i] - grandMean) ** 2, 0)
  const ssWithin = Z.reduce((s, z, i) =>
    s + z.reduce((ss, v) => ss + (v - groupMeans[i]) ** 2, 0), 0)

  const dfBetween = k - 1
  const dfWithin = N - k
  if (ssWithin <= 0 || dfWithin <= 0) {
    return { error: 'Variansi within grup nol — tidak dapat menghitung F' }
  }
  const msBetween = ssBetween / dfBetween
  const msWithin = ssWithin / dfWithin
  const F = msBetween / msWithin
  const pValue = 1 - jstat.centralF.cdf(F, dfBetween, dfWithin)

  return { F, pValue, dfBetween, dfWithin, k, N }
}

// ============================================================
// Mean ± SD bar chart (SVG)
// ============================================================
function MeanComparisonChart({ matrix, column }) {
  const data = matrix.filter(r => r.stats).map(r => ({
    name: r.name.replace(/\.[^.]+$/, ''),
    mean: r.stats.mean,
    sd: r.stats.stdDev,
    n: r.stats.n,
  }))
  if (!data.length) return null

  const W = 720, H = 320, padL = 70, padR = 20, padT = 30, padB = 80
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const barW = innerW / data.length * 0.6
  const gap = innerW / data.length

  const allValues = data.flatMap(d => [d.mean - d.sd, d.mean + d.sd])
  const yMin = Math.min(0, ...allValues)
  const yMax = Math.max(...allValues)
  const range = yMax - yMin || 1
  const yScale = v => padT + innerH - ((v - yMin) / range) * innerH

  const yTicks = 5
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (range * i) / yTicks)

  return (
    <div className="bg-white rounded-2xl border border-border p-5">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-1">Visualisasi</div>
      <div className="text-sm font-semibold text-gray-800 mb-4">Mean ± SD per file: <span className="font-normal text-gray-600">{column}</span></div>
      <div className="overflow-x-auto">
        <svg width={W} height={H} className="block min-w-full">
          {/* Y-axis grid + labels */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={yScale(t)} y2={yScale(t)}
                    stroke="#f3f4f6" strokeWidth={1} />
              <text x={padL - 8} y={yScale(t) + 4} fontSize={10} fill="#9ca3af" textAnchor="end">
                {fmt(t, 1)}
              </text>
            </g>
          ))}
          {/* Zero line */}
          {yMin < 0 && yMax > 0 && (
            <line x1={padL} x2={W - padR} y1={yScale(0)} y2={yScale(0)}
                  stroke="#d1d5db" strokeWidth={1} />
          )}

          {/* Bars + error bars */}
          {data.map((d, i) => {
            const cx = padL + gap * i + gap / 2
            const x = cx - barW / 2
            const y = yScale(Math.max(0, d.mean))
            const h = Math.abs(yScale(d.mean) - yScale(0))
            const errTop = yScale(d.mean + d.sd)
            const errBot = yScale(d.mean - d.sd)
            return (
              <g key={i}>
                <rect x={x} y={y} width={barW} height={h} fill="#374151" rx={2} />
                {/* error bars */}
                <line x1={cx} x2={cx} y1={errTop} y2={errBot} stroke="#111827" strokeWidth={1.5} />
                <line x1={cx - 6} x2={cx + 6} y1={errTop} y2={errTop} stroke="#111827" strokeWidth={1.5} />
                <line x1={cx - 6} x2={cx + 6} y1={errBot} y2={errBot} stroke="#111827" strokeWidth={1.5} />
                {/* mean label */}
                <text x={cx} y={Math.min(errTop, y) - 6} fontSize={10} fill="#374151" textAnchor="middle" fontWeight={500}>
                  {fmt(d.mean, 1)}
                </text>
                {/* x-axis label */}
                <text x={cx} y={H - padB + 14} fontSize={10} fill="#6b7280" textAnchor="end"
                      transform={`rotate(-30 ${cx} ${H - padB + 14})`}>
                  {d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name}
                </text>
                <text x={cx} y={H - padB + 30} fontSize={9} fill="#9ca3af" textAnchor="end"
                      transform={`rotate(-30 ${cx} ${H - padB + 30})`}>
                  n={d.n}
                </text>
              </g>
            )
          })}

          {/* Axes */}
          <line x1={padL} x2={padL} y1={padT} y2={H - padB} stroke="#9ca3af" strokeWidth={1} />
          <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="#9ca3af" strokeWidth={1} />
        </svg>
      </div>
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================
const fmt = (v, d = 3) => {
  if (v == null || (typeof v === 'number' && !isFinite(v))) return '—'
  if (typeof v === 'number') return Number(v).toFixed(d)
  return String(v)
}

function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.onload = (event) => {
      try {
        const wb = XLSX.read(event.target.result, { type: 'binary' })
        if (!wb.SheetNames.length) throw new Error('File tidak punya sheet')
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { defval: null })
        if (!json.length) throw new Error('File kosong')

        const rawHeaders = Object.keys(json[0])
        const headers = rawHeaders
          .map(h => String(h).trim())
          .filter(h => h !== '' && h !== '__EMPTY' && !h.startsWith('Unnamed:'))
        if (!headers.length) throw new Error('Tidak ada header valid')

        const data = {}
        headers.forEach((h, idx) => {
          const origKey = rawHeaders[idx]
          data[h] = json.map(row => {
            const v = row[origKey]
            if (v === '' || v == null) return null
            if (typeof v === 'string') {
              const t = v.trim()
              if (t === '') return null
              const n = Number(t)
              return isNaN(n) ? t : n
            }
            const n = Number(v)
            return isNaN(n) ? v : n
          })
        })

        // Drop fully-null rows
        const nRows = json.length
        const keep = []
        for (let i = 0; i < nRows; i++) {
          if (!headers.every(h => data[h][i] === null)) keep.push(i)
        }
        const cleaned = {}
        headers.forEach(h => { cleaned[h] = keep.map(i => data[h][i]) })

        // Detect numeric columns: ≥80% of non-null values numeric
        const numericColumns = headers.filter(h => {
          const nonNull = cleaned[h].filter(v => v !== null)
          if (nonNull.length === 0) return false
          const numeric = nonNull.filter(v => typeof v === 'number' && isFinite(v)).length
          return numeric / nonNull.length >= 0.8
        })

        resolve({
          columns: headers,
          numericColumns,
          data: cleaned,
          rowCount: keep.length,
        })
      } catch (e) {
        reject(e)
      }
    }
    reader.readAsBinaryString(file)
  })
}

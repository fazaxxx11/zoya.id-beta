import { useState, useMemo, useEffect } from 'react'
import { X, AlertTriangle, CheckCircle2, Sparkles, Table2, ChevronLeft, ChevronRight } from 'lucide-react'
import { analyzeColumns, findDuplicateRows, applyCleaning } from '../lib/dataCleaner'
import Modal from './Modal'

/**
 * Modal untuk membersihkan dataset sebelum analisis.
 * Props:
 *  - open: bool
 *  - data: { [col]: [...] }
 *  - columns: string[]
 *  - onClose: () => void
 *  - onApply: ({ data, columns, report }) => void
 */
export default function DataCleanerModal({ open, data, columns, onClose, onApply }) {
  if (!open) return null
  return <ModalBody data={data} columns={columns} onClose={onClose} onApply={onApply} />
}

function ModalBody({ data, columns, onClose, onApply }) {
  // editedData = mirror of `data` yang bisa di-edit cell-by-cell oleh user
  // di tabel preview di bawah. Semua analisis (missing/outlier/dupe) di-hitung
  // dari editedData ini, jadi user lihat live impact dari editannya.
  const [editedData, setEditedData] = useState(() => {
    const clone = {}
    for (const c of columns) clone[c] = Array.isArray(data[c]) ? [...data[c]] : []
    return clone
  })

  // Re-sync kalau parent kirim data baru (misalnya user upload ulang file)
  useEffect(() => {
    const clone = {}
    for (const c of columns) clone[c] = Array.isArray(data[c]) ? [...data[c]] : []
    setEditedData(clone)
  }, [data, columns])

  const analysis = useMemo(() => analyzeColumns(editedData, columns), [editedData, columns])
  const dupes = useMemo(() => findDuplicateRows(editedData, columns), [editedData, columns])
  const totalRows = editedData[columns[0]]?.length || 0

  // Per-column op state
  const [colOps, setColOps] = useState(() => {
    const init = {}
    for (const c of columns) init[c] = { missing: 'keep', outliers: 'keep' }
    return init
  })
  const [dropDuplicates, setDropDuplicates] = useState(dupes.length > 0)

  // Pagination untuk tabel preview (dataset bisa ribuan baris)
  const ROWS_PER_PAGE = 25
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE))
  const startRow = page * ROWS_PER_PAGE
  const endRow = Math.min(startRow + ROWS_PER_PAGE, totalRows)
  const [showDataPreview, setShowDataPreview] = useState(true)

  // Track sel mana yang baru di-edit (untuk highlight visual)
  const [editedCells, setEditedCells] = useState(new Set())

  // Edit satu sel
  const updateCell = (col, rowIdx, raw) => {
    setEditedData(prev => {
      const next = { ...prev, [col]: [...prev[col]] }
      // Auto-convert ke number kalau kolom-nya numeric & input bisa di-parse
      const trimmed = String(raw).trim()
      let val
      if (trimmed === '') {
        val = null
      } else if (analysis[col]?.type === 'numeric') {
        const n = Number(trimmed.replace(',', '.'))
        val = isNaN(n) ? trimmed : n
      } else {
        val = trimmed
      }
      next[col][rowIdx] = val
      return next
    })
    setEditedCells(prev => new Set(prev).add(`${col}|${rowIdx}`))
  }

  // Preview cleaning (drop missing/clip/dedupe) di atas data yang sudah di-edit
  const preview = useMemo(() => {
    return applyCleaning(editedData, columns, { columnOps: colOps, dropDuplicates })
  }, [editedData, columns, colOps, dropDuplicates])

  // Quick action: smart-clean (drop missing + clip outliers + drop duplicates)
  const handleSmartClean = () => {
    const next = {}
    for (const c of columns) {
      const a = analysis[c]
      next[c] = {
        missing: a.missing > 0 ? (a.type === 'numeric' ? 'median' : 'mode') : 'keep',
        outliers: a.outlierCount > 0 ? 'clip' : 'keep',
      }
    }
    setColOps(next)
    setDropDuplicates(dupes.length > 0)
  }

  const handleReset = () => {
    const next = {}
    for (const c of columns) next[c] = { missing: 'keep', outliers: 'keep' }
    setColOps(next)
    setDropDuplicates(false)
  }

  const updateOp = (col, key, value) => {
    setColOps(prev => ({ ...prev, [col]: { ...prev[col], [key]: value } }))
  }

  const handleApply = () => {
    onApply?.(preview)
  }

  const totalIssues =
    Object.values(analysis).reduce((s, a) => s + a.missing + a.outlierCount, 0) + dupes.length

  return (
    <Modal open={true} onClose={onClose}
      panelClassName="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-1">Pre-Analysis</div>
            <h2 className="text-lg font-bold text-gray-900">Bersihkan Dataset</h2>
            <p className="text-sm text-gray-400 mt-1">
              {totalIssues > 0
                ? `Ditemukan ${totalIssues} isu (missing + outlier + duplikat). Pilih cara penanganan.`
                : 'Dataset bersih — tidak ada missing, outlier, atau duplikat terdeteksi.'}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-gray-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick actions */}
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap bg-surface/60">
          <div className="flex items-center gap-2">
            <button onClick={handleSmartClean}
              className="text-xs font-medium px-3 py-2 rounded-lg bg-gray-900 hover:bg-black text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Smart Clean
            </button>
            <button onClick={handleReset}
              className="text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 hover:bg-white text-gray-700">
              Reset
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>Total baris: <strong className="text-gray-900">{totalRows}</strong></span>
            <span>→</span>
            <span>Setelah bersihkan: <strong className={preview.report.rowsAfter < totalRows ? 'text-amber-700' : 'text-emerald-700'}>{preview.report.rowsAfter}</strong></span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Per-column table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left">
                <tr className="text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-3 py-2.5 font-medium">Kolom</th>
                  <th className="px-3 py-2.5 font-medium">Tipe</th>
                  <th className="px-3 py-2.5 font-medium text-right">Missing</th>
                  <th className="px-3 py-2.5 font-medium">Aksi Missing</th>
                  <th className="px-3 py-2.5 font-medium text-right">Outlier</th>
                  <th className="px-3 py-2.5 font-medium">Aksi Outlier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {columns.map(col => {
                  const a = analysis[col]
                  const op = colOps[col]
                  return (
                    <tr key={col} className="hover:bg-surface/40">
                      <td className="px-3 py-2.5 font-medium text-gray-900">{col}</td>
                      <td className="px-3 py-2.5">
                        <TypeBadge type={a.type} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {a.missing > 0 ? (
                          <span className="text-amber-700 font-medium">
                            {a.missing} <span className="text-xs text-muted">({a.missingPct.toFixed(0)}%)</span>
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {a.missing === 0 ? (
                          <span className="text-xs text-muted">tidak ada</span>
                        ) : (
                          <select value={op.missing}
                            onChange={e => updateOp(col, 'missing', e.target.value)}
                            className="text-xs px-2 py-1 border border-gray-200 rounded bg-white outline-none focus:border-gray-400">
                            <option value="keep">Biarkan</option>
                            <option value="drop">Drop baris</option>
                            {a.type === 'numeric' && <option value="mean">Isi: mean</option>}
                            {a.type === 'numeric' && <option value="median">Isi: median</option>}
                            {a.type !== 'numeric' && <option value="mode">Isi: mode</option>}
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {a.outlierCount > 0 ? (
                          <span className="text-orange-700 font-medium">{a.outlierCount}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {a.type !== 'numeric' ? (
                          <span className="text-xs text-muted">—</span>
                        ) : a.outlierCount === 0 ? (
                          <span className="text-xs text-muted">tidak ada</span>
                        ) : (
                          <select value={op.outliers}
                            onChange={e => updateOp(col, 'outliers', e.target.value)}
                            className="text-xs px-2 py-1 border border-gray-200 rounded bg-white outline-none focus:border-gray-400">
                            <option value="keep">Biarkan</option>
                            <option value="clip">Clip ke batas IQR</option>
                            <option value="drop">Drop baris</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Duplicate rows toggle */}
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${dupes.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-surface border-gray-200'}`}>
            {dupes.length > 0 ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
            <div className="flex-1 text-sm">
              <span className="font-medium text-gray-900">
                {dupes.length === 0 ? 'Tidak ada baris duplikat' : `${dupes.length} baris duplikat ditemukan`}
              </span>
              {dupes.length > 0 && <span className="text-gray-400 ml-2">(seluruh kolom identik)</span>}
            </div>
            {dupes.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={dropDuplicates}
                  onChange={e => setDropDuplicates(e.target.checked)}
                  className="w-4 h-4 accent-gray-900" />
                Drop duplikat
              </label>
            )}
          </div>

          {/* === DATA PREVIEW & INLINE EDIT (Excel-like) ===
              Tabel menampilkan semua kolom × paginated rows. Tiap sel jadi
              input yang bisa di-edit langsung. Perubahan auto-update analisis
              & preview cleaning di atas. */}
          <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDataPreview(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Table2 className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Lihat & Edit Data</span>
                <span className="text-xs text-gray-400">
                  {totalRows} baris × {columns.length} kolom
                </span>
                {editedCells.size > 0 && (
                  <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                    {editedCells.size} sel diubah
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400">{showDataPreview ? '▲ Tutup' : '▼ Buka'}</span>
            </button>

            {showDataPreview && (
              <>
                <div className="overflow-auto max-h-[420px] border-t border-gray-200">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                      <tr>
                        <th className="border-b border-r border-gray-200 px-2 py-1.5 w-12 text-center text-[11px] font-semibold text-gray-600 sticky left-0 bg-gray-100 z-20">
                          #
                        </th>
                        {columns.map(col => (
                          <th key={col} className="border-b border-r border-gray-200 px-2 py-1.5 text-left text-[11px] font-semibold text-gray-700 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {col}
                              <TypeBadge type={analysis[col]?.type} />
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: endRow - startRow }, (_, k) => {
                        const i = startRow + k
                        return (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-surface/40'}>
                            <td className="border-b border-r border-border px-2 py-1 text-center text-[11px] text-muted font-mono sticky left-0 bg-inherit z-10">
                              {i + 1}
                            </td>
                            {columns.map(col => {
                              const v = editedData[col]?.[i]
                              const isEmpty = v === null || v === undefined || v === ''
                              const isEdited = editedCells.has(`${col}|${i}`)
                              return (
                                <td key={col} className={`border-b border-r border-border p-0 ${isEdited ? 'bg-amber-50' : ''}`}>
                                  <input
                                    type="text"
                                    value={isEmpty ? '' : String(v)}
                                    onChange={e => updateCell(col, i, e.target.value)}
                                    placeholder={isEmpty ? '(kosong)' : ''}
                                    className={`w-full px-2 py-1.5 text-xs bg-transparent border-0 focus:bg-white focus:ring-2 focus:ring-sky-300 focus:outline-none ${
                                      isEmpty ? 'text-red-400 italic' : 'text-gray-800'
                                    } ${analysis[col]?.type === 'numeric' ? 'font-mono text-right' : ''}`}
                                  />
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                      {totalRows === 0 && (
                        <tr>
                          <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-sm text-muted">
                            Dataset kosong
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-3 py-2 bg-surface border-t border-gray-200 text-xs text-gray-600">
                    <span>Baris {startRow + 1}–{endRow} dari {totalRows}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-2">
                        Hal. {page + 1} / {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Preview report */}
          {preview.report.actions.length > 0 && (
            <div className="mt-4 bg-surface border border-gray-200 rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-medium mb-2">Preview Aksi</div>
              <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
                {preview.report.actions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
              <div className="mt-3 pt-3 border-t border-gray-200 flex gap-4 text-xs flex-wrap">
                <span className="text-gray-600">Drop: <strong className="text-red-700">{preview.report.dropped}</strong> baris</span>
                <span className="text-gray-600">Filled: <strong className="text-emerald-700">{preview.report.filled}</strong> sel</span>
                <span className="text-gray-600">Clipped: <strong className="text-orange-700">{preview.report.clipped}</strong> sel</span>
                <span className="text-gray-600">Duplicates: <strong className="text-amber-700">{preview.report.duplicatesRemoved}</strong> baris</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between gap-2">
          <div className="text-xs text-muted">
            {preview.report.rowsAfter < 5 && (
              <span className="text-red-600 font-medium">⚠ Sisa baris terlalu sedikit untuk analisis</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg">
              Batal
            </button>
            <button onClick={handleApply}
              disabled={preview.report.rowsAfter < 1}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black rounded-lg disabled:opacity-50">
              Terapkan
            </button>
          </div>
        </div>
    </Modal>
  )
}

function TypeBadge({ type }) {
  const cfg = {
    numeric: { label: 'Numerik', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    categorical: { label: 'Kategorik', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    text: { label: 'Teks', cls: 'bg-surface text-gray-700 border-gray-200' },
    empty: { label: 'Kosong', cls: 'bg-red-50 text-red-700 border-red-200' },
  }[type] || { label: type, cls: 'bg-surface text-gray-700 border-gray-200' }
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.cls}`}>{cfg.label}</span>
}

import { useState, useMemo } from 'react'
import { X, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'
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
  const analysis = useMemo(() => analyzeColumns(data, columns), [data, columns])
  const dupes = useMemo(() => findDuplicateRows(data, columns), [data, columns])
  const totalRows = data[columns[0]]?.length || 0

  // Per-column op state
  const [colOps, setColOps] = useState(() => {
    const init = {}
    for (const c of columns) init[c] = { missing: 'keep', outliers: 'keep' }
    return init
  })
  const [dropDuplicates, setDropDuplicates] = useState(dupes.length > 0)

  // Preview
  const preview = useMemo(() => {
    return applyCleaning(data, columns, { columnOps: colOps, dropDuplicates })
  }, [data, columns, colOps, dropDuplicates])

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
        <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-medium mb-1">Pre-Analysis</div>
            <h2 className="text-lg font-bold text-gray-900">Bersihkan Dataset</h2>
            <p className="text-sm text-gray-500 mt-1">
              {totalIssues > 0
                ? `Ditemukan ${totalIssues} isu (missing + outlier + duplikat). Pilih cara penanganan.`
                : 'Dataset bersih — tidak ada missing, outlier, atau duplikat terdeteksi.'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick actions */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap bg-gray-50/60">
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
          <div className="flex items-center gap-3 text-xs text-gray-500">
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
              <thead className="bg-gray-50 text-left">
                <tr className="text-[11px] uppercase tracking-wider text-gray-500">
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
                    <tr key={col} className="hover:bg-gray-50/40">
                      <td className="px-3 py-2.5 font-medium text-gray-900">{col}</td>
                      <td className="px-3 py-2.5">
                        <TypeBadge type={a.type} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {a.missing > 0 ? (
                          <span className="text-amber-700 font-medium">
                            {a.missing} <span className="text-xs text-gray-400">({a.missingPct.toFixed(0)}%)</span>
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {a.missing === 0 ? (
                          <span className="text-xs text-gray-300">tidak ada</span>
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
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {a.type !== 'numeric' ? (
                          <span className="text-xs text-gray-300">—</span>
                        ) : a.outlierCount === 0 ? (
                          <span className="text-xs text-gray-300">tidak ada</span>
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
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${dupes.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
            {dupes.length > 0 ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
            <div className="flex-1 text-sm">
              <span className="font-medium text-gray-900">
                {dupes.length === 0 ? 'Tidak ada baris duplikat' : `${dupes.length} baris duplikat ditemukan`}
              </span>
              {dupes.length > 0 && <span className="text-gray-500 ml-2">(seluruh kolom identik)</span>}
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

          {/* Preview report */}
          {preview.report.actions.length > 0 && (
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500 font-medium mb-2">Preview Aksi</div>
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
        <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-2">
          <div className="text-xs text-gray-400">
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
    text: { label: 'Teks', cls: 'bg-gray-50 text-gray-700 border-gray-200' },
    empty: { label: 'Kosong', cls: 'bg-red-50 text-red-700 border-red-200' },
  }[type] || { label: type, cls: 'bg-gray-50 text-gray-700 border-gray-200' }
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.cls}`}>{cfg.label}</span>
}

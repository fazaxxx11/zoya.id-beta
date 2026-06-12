// src/components/DataPreview.jsx
// Compact data preview — rows/cols summary + first 10 rows table
// Reusable across Statistik, SkripsiWizard, and other data-inspection surfaces

import { useState } from 'react'
import { Table, Columns, Hash, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

const MAX_PREVIEW_ROWS = 10

/**
 * Detect if a value is missing (null, undefined, empty string, NA markers).
 */
function isMissing(v) {
  return (
    v === null ||
    v === undefined ||
    v === '' ||
    ['NA', 'N/A', 'NULL', 'null', '-', 'nan', 'NaN'].includes(String(v).trim())
  )
}

/**
 * Detect if a column is numeric (>= 70% of non-missing values are numbers).
 */
function isNumeric(colData) {
  const valid = colData.filter(v => !isMissing(v))
  if (valid.length === 0) return false
  const numeric = valid.filter(v => typeof v === 'number' && !isNaN(v))
  return numeric.length / valid.length >= 0.7
}

/**
 * Format a cell value for display.
 */
function fmtCell(v) {
  if (isMissing(v)) return '—'
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return String(v)
    return v.toFixed(3).replace(/\.?0+$/, '')
  }
  return String(v).substring(0, 40)
}

/**
 * DataPreview — compact data summary card.
 *
 * Props:
 *  data      - column-oriented data { col1: [values...], col2: [values...] }
 *  columns   - array of column names
 *  maxRows   - max rows to preview (default 10)
 *  compact   - skip the full table, show only stats (default false)
 *  className - additional wrapper classes
 */
export default function DataPreview({
  data,
  columns = [],
  maxRows = MAX_PREVIEW_ROWS,
  compact = false,
  className = '',
}) {
  const [expanded, setExpanded] = useState(false)

  if (!data || !columns.length) return null

  const safeColumns = Array.isArray(columns) ? columns : []
  const totalRows = safeColumns[0] ? (data[safeColumns[0]]?.length || 0) : 0
  const previewN = Math.min(totalRows, maxRows)

  // Column analysis
  const colInfo = safeColumns.map(col => {
    const vals = Array.isArray(data[col]) ? data[col] : []
    const missing = vals.filter(isMissing)
    const numeric = isNumeric(vals)
    const unique = new Set(vals.filter(v => !isMissing(v)).map(String))
    return {
      col,
      numeric,
      missing: missing.length,
      missingPct: totalRows ? ((missing.length / totalRows) * 100).toFixed(1) : '0.0',
      unique: unique.size,
      sample: vals.find(v => !isMissing(v)),
    }
  })

  const numericCount = colInfo.filter(c => c.numeric).length
  const categoricalCount = colInfo.length - numericCount
  const totalMissing = colInfo.reduce((s, c) => s + c.missing, 0)

  return (
    <div className={`border border-border bg-card rounded-xl p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-fg">Pratinjau Data</h3>
        </div>
        {!compact && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted hover:text-fg flex items-center gap-1 transition-colors"
          >
            {expanded ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Sembunyikan</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> Lihat Data</>
            )}
          </button>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatBadge icon={Hash} label="Baris" value={totalRows.toLocaleString()} />
        <StatBadge icon={Columns} label="Variabel" value={String(safeColumns.length)} />
        <StatBadge icon={Hash} label="Numerik" value={String(numericCount)} accent />
        <StatBadge icon={Hash} label="Kategorik" value={String(categoricalCount)} />
      </div>

      {/* Missing values warning */}
      {totalMissing > 0 && (
        <div className="mb-4 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            <strong>{totalMissing}</strong> missing value{totalMissing > 1 ? 's' : ''} terdeteksi di{' '}
            {colInfo.filter(c => c.missing > 0).length} variabel.
            Pertimbangkan membersihkan data sebelum analisis.
          </span>
        </div>
      )}

      {/* Column overview */}
      <div className="mb-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="py-1.5 text-left font-medium text-muted">Variabel</th>
              <th className="py-1.5 text-left font-medium text-muted">Tipe</th>
              <th className="py-1.5 text-left font-medium text-muted">Unique</th>
              <th className="py-1.5 text-left font-medium text-muted">Missing</th>
              <th className="py-1.5 text-left font-medium text-muted">Contoh</th>
            </tr>
          </thead>
          <tbody>
            {colInfo.map(info => (
              <tr key={info.col} className="border-b border-border/40">
                <td className="py-1.5 font-medium text-fg">{info.col}</td>
                <td className="py-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    info.numeric
                      ? 'bg-accent/10 text-accent'
                      : 'bg-muted/10 text-muted'
                  }`}>
                    {info.numeric ? 'Numerik' : 'Kategorik'}
                  </span>
                </td>
                <td className="py-1.5 text-muted">{info.unique}</td>
                <td className="py-1.5">
                  {info.missing > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      {info.missing} ({info.missingPct}%)
                    </span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400">0</span>
                  )}
                </td>
                <td className="py-1.5 text-muted font-mono text-[10px] max-w-[120px] truncate" title={String(info.sample ?? '—')}>
                  {String(info.sample ?? '—').substring(0, 25)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expandable data table */}
      {!compact && expanded && totalRows > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-card/95 backdrop-blur-sm">
                <tr className="border-b border-border">
                  <th className="px-2.5 py-1.5 text-left font-medium text-muted border-r border-border w-10">#</th>
                  {safeColumns.map(col => (
                    <th key={col} className="px-2.5 py-1.5 text-left font-medium text-muted border-r border-border last:border-r-0 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: previewN }, (_, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-border/30 hover:bg-card/50">
                    <td className="px-2.5 py-1 text-muted border-r border-border font-mono text-[10px]">
                      {rowIdx + 1}
                    </td>
                    {safeColumns.map(col => {
                      const vals = data[col] || []
                      const raw = vals[rowIdx]
                      const display = fmtCell(raw)
                      const missing = isMissing(raw)
                      return (
                        <td
                          key={col}
                          className={`px-2.5 py-1 border-r border-border last:border-r-0 font-mono text-[10px] max-w-[150px] truncate ${
                            missing ? 'text-muted/30 italic' : 'text-fg'
                          }`}
                          title={display}
                        >
                          {missing ? <span className="text-muted/30">—</span> : display}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalRows > previewN && (
            <div className="px-3 py-2 text-[10px] text-muted bg-card/50 border-t border-border">
              Menampilkan {previewN} dari {totalRows.toLocaleString()} baris
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Internal ──────────────────────────────────────────────────────

function StatBadge({ icon: Icon, label, value, accent = false }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-card/50 border border-border">
      <Icon className={`w-3.5 h-3.5 ${accent ? 'text-accent' : 'text-muted'}`} />
      <div>
        <div className="text-[10px] text-muted leading-tight">{label}</div>
        <div className={`text-sm font-semibold ${accent ? 'text-accent' : 'text-fg'}`}>{value}</div>
      </div>
    </div>
  )
}

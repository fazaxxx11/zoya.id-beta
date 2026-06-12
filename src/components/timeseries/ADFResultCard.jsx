// ADFResultCard.jsx — Display ADF Unit Root test results per variable
import { useState } from 'react'
import { CheckCircle, XCircle, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

const num = (v, d = 3) => typeof v === 'number' && !isNaN(v) ? v.toFixed(d) : '—'

export default function ADFResultCard({ result }) {
  const [expanded, setExpanded] = useState(false)

  if (!result) return null

  const isStationary = result.isStationary

  return (
    <div
      className="rounded-xl border overflow-hidden transition-colors"
      style={{
        borderColor: isStationary
          ? 'rgb(34 197 94 / 0.3)'
          : 'rgb(239 68 68 / 0.2)',
        backgroundColor: 'rgb(var(--card))',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{
          backgroundColor: isStationary
            ? 'rgb(34 197 94 / 0.06)'
            : 'rgb(239 68 68 / 0.04)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isStationary ? (
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          )}
          <span className="font-semibold text-sm truncate" style={{ color: 'rgb(var(--fg))' }}>
            {result.variable || 'Variabel'}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
              isStationary ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'
            }`}
          >
            {isStationary ? 'STASIONER' : 'NON-STASIONER'}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-black/5 transition-colors flex-shrink-0"
          style={{ color: 'rgb(var(--muted))' }}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Summary stats */}
      <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'rgb(var(--muted))' }}>
            ADF Statistic
          </div>
          <div className="text-sm font-bold mt-0.5" style={{ color: 'rgb(var(--fg))' }}>
            {num(result.statistic, 4)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'rgb(var(--muted))' }}>
            p-value
          </div>
          <div className={`text-sm font-bold mt-0.5 ${result.pValue < 0.05 ? 'text-green-600' : 'text-red-500'}`}>
            {num(result.pValue, 4)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'rgb(var(--muted))' }}>
            Lags
          </div>
          <div className="text-sm font-bold mt-0.5" style={{ color: 'rgb(var(--fg))' }}>
            {result.lags}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'rgb(var(--muted))' }}>
            N
          </div>
          <div className="text-sm font-bold mt-0.5" style={{ color: 'rgb(var(--fg))' }}>
            {result.nobs}
          </div>
        </div>
      </div>

      {/* Critical values */}
      {result.criticalValues && (
        <div className="px-4 py-3 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
          <div className="text-[10px] uppercase tracking-wider font-medium mb-2" style={{ color: 'rgb(var(--muted))' }}>
            Critical Values
          </div>
          <div className="flex gap-4">
            {[
              { key: 'pct1', label: '1%' },
              { key: 'pct5', label: '5%' },
              { key: 'pct10', label: '10%' },
            ].map(({ key, label }) => (
              result.criticalValues[key] != null && (
                <div key={key} className="text-center">
                  <div className="text-[10px] font-medium" style={{ color: 'rgb(var(--muted))' }}>{label}</div>
                  <div className="text-xs font-bold" style={{ color: 'rgb(var(--fg))' }}>
                    {num(result.criticalValues[key], 3)}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Interpretation */}
      <div
        className="px-4 py-3 border-t text-sm"
        style={{
          borderColor: 'rgb(var(--border))',
          color: 'rgb(var(--fg))',
          backgroundColor: 'rgb(var(--surface))',
        }}
      >
        {isStationary
          ? `Tolak H₀ pada taraf 5%: seri STASIONER (tidak memiliki unit root)`
          : `Gagal tolak H₀ pada taraf 5%: seri TIDAK STASIONER (memiliki unit root)`}
      </div>

      {/* Suggestion for non-stationary */}
      {!isStationary && (
        <div
          className="px-4 py-2 border-t flex items-center gap-2 text-xs"
          style={{
            borderColor: 'rgb(var(--border))',
            backgroundColor: 'rgb(251 191 36 / 0.06)',
            color: 'rgb(180 83 9)',
          }}
        >
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Coba first differencing atau gunakan level/constant/trend yang berbeda
        </div>
      )}

      {/* Expandable: details */}
      {expanded && (
        <div
          className="px-4 py-3 border-t text-xs space-y-1"
          style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--muted))' }}
        >
          <div className="font-medium mb-2" style={{ color: 'rgb(var(--fg))' }}>Detail</div>
          <div>Deterministic: {result.deterministic}</div>
          <div>Model type: {result.modelType}</div>
          {result.error && <div className="text-red-500">Error: {result.error}</div>}
        </div>
      )}
    </div>
  )
}

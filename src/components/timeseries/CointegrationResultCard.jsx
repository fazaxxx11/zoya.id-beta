// CointegrationResultCard.jsx — Display Engle-Granger cointegration results
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

const num = (v, d = 3) => typeof v === 'number' && !isNaN(v) ? v.toFixed(d) : '—'

export default function CointegrationResultCard({ result }) {
  if (!result) return null

  const isCointegrated = result.isCointegrated

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: isCointegrated
          ? 'rgb(16 185 129 / 0.3)'
          : 'rgb(var(--border))',
        backgroundColor: 'rgb(var(--card))',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{
          backgroundColor: isCointegrated
            ? 'rgb(16 185 129 / 0.05)'
            : 'rgb(var(--surface))',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isCointegrated ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-muted flex-shrink-0" />
          )}
          <span className="text-sm font-bold truncate" style={{ color: 'rgb(var(--fg))' }}>
            {result.yLabel || 'Y'}
          </span>
          <span className="text-xs px-1" style={{ color: 'rgb(var(--muted))' }}>~</span>
          <span className="text-sm font-bold truncate" style={{ color: 'rgb(var(--fg))' }}>
            {result.xLabel || 'X'}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
              isCointegrated ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {isCointegrated ? 'COINTEGRATED' : 'TIDAK COINTEGRATED'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'rgb(var(--muted))' }}>
            ADF on Residuals
          </div>
          <div className="text-sm font-bold mt-0.5" style={{ color: 'rgb(var(--fg))' }}>
            {num(result.adfStatistic, 4)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'rgb(var(--muted))' }}>
            p-value
          </div>
          <div className={`text-sm font-bold mt-0.5 ${result.pValue < 0.05 ? 'text-emerald-600' : 'text-red-500'}`}>
            {num(result.pValue, 4)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'rgb(var(--muted))' }}>
            β (slope)
          </div>
          <div className="text-sm font-bold mt-0.5" style={{ color: 'rgb(var(--fg))' }}>
            {num(result.beta, 4)}
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
            Engle-Granger Critical Values
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
        {isCointegrated
          ? `Tolak H₀: Y dan X memiliki hubungan keseimbangan jangka panjang (cointegrated)`
          : `Gagal tolak H₀: Y dan X TIDAK cointegrated`}
      </div>

      {/* Warning */}
      <div
        className="px-4 py-2 border-t flex items-center gap-2 text-xs"
        style={{
          borderColor: 'rgb(var(--border))',
          backgroundColor: 'rgb(251 191 36 / 0.06)',
          color: 'rgb(180 83 9)',
        }}
      >
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        Engle-Granger hanya untuk bivariate. Untuk multivariate gunakan Johansen test.
      </div>
    </div>
  )
}

// GrangerResultCard.jsx — Display Granger Causality test results for a pair
import { CheckCircle, XCircle, ArrowRight, AlertTriangle } from 'lucide-react'

const num = (v, d = 3) => typeof v === 'number' && !isNaN(v) ? v.toFixed(d) : '—'

export default function GrangerResultCard({ result }) {
  if (!result || result.error) return null

  const isSignificant = result.isSignificant

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: isSignificant
          ? 'rgb(29 78 216 / 0.3)'
          : 'rgb(var(--border))',
        backgroundColor: 'rgb(var(--card))',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{
          backgroundColor: isSignificant
            ? 'rgb(29 78 216 / 0.05)'
            : 'rgb(var(--surface))',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isSignificant ? (
            <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          <span className="text-sm font-bold truncate" style={{ color: 'rgb(var(--fg))' }}>
            {result.xLabel || 'X'}
          </span>
          <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--muted))' }} />
          <span className="text-sm font-bold truncate" style={{ color: 'rgb(var(--fg))' }}>
            {result.yLabel || 'Y'}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
              isSignificant ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {isSignificant ? 'SIGNIFIKAN' : 'TIDAK SIGNIFIKAN'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'rgb(var(--muted))' }}>
            F-statistic
          </div>
          <div className="text-sm font-bold mt-0.5" style={{ color: 'rgb(var(--fg))' }}>
            {num(result.statistic, 3)}
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
            df₁ / df₂
          </div>
          <div className="text-sm font-bold mt-0.5" style={{ color: 'rgb(var(--fg))' }}>
            {result.df1}, {result.df2}
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
      </div>

      {/* Direction */}
      <div className="px-4 py-2 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
        <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'rgb(var(--muted))' }}>
          Direction: {result.direction || 'x→y'}
        </div>
      </div>

      {/* Interpretation */}
      <div
        className="px-4 py-3 border-t text-sm"
        style={{
          borderColor: 'rgb(var(--border))',
          color: 'rgb(var(--fg))',
          backgroundColor: 'rgb(var(--surface))',
        }}
      >
        {isSignificant
          ? `Tolak H₀: X Granger-causes Y (ada hubungan kausalitas)`
          : `Gagal tolak H₀: X TIDAK Granger-causes Y`}
      </div>

      {/* Warning for raw data */}
      {result.warning && (
        <div
          className="px-4 py-2 border-t flex items-center gap-2 text-xs"
          style={{
            borderColor: 'rgb(var(--border))',
            backgroundColor: 'rgb(251 191 36 / 0.06)',
            color: 'rgb(180 83 9)',
          }}
        >
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          {result.warning}
        </div>
      )}
    </div>
  )
}

// LagInfoCard.jsx — Expandable lag selection details
import { useState } from 'react'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'

const num = (v, d = 4) => typeof v === 'number' && !isNaN(v) ? v.toFixed(d) : (v ?? '—')

export default function LagInfoCard({ lagInfo, title = 'Lag Selection' }) {
  const [expanded, setExpanded] = useState(false)

  if (!lagInfo) return null

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: 'rgb(var(--border))',
        backgroundColor: 'rgb(var(--card))',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 transition-colors hover:bg-black/[0.02]"
        style={{ color: 'rgb(var(--fg))' }}
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4" style={{ color: 'rgb(var(--muted))' }} />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgb(var(--accent) / 0.1)', color: 'rgb(var(--accent))' }}>
            Lag {lagInfo.lags ?? lagInfo.selected ?? '—'}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div
          className="px-4 py-3 border-t space-y-2 text-xs"
          style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--muted))' }}
        >
          <div className="flex items-center justify-between">
            <span>Method</span>
            <span className="font-semibold" style={{ color: 'rgb(var(--fg))' }}>{lagInfo.method || 'AIC'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Selected lag</span>
            <span className="font-semibold" style={{ color: 'rgb(var(--fg))' }}>{lagInfo.lags ?? lagInfo.selected ?? '—'}</span>
          </div>
          {lagInfo.maxLags && (
            <div className="flex items-center justify-between">
              <span>Max lags tested</span>
              <span className="font-semibold" style={{ color: 'rgb(var(--fg))' }}>{lagInfo.maxLags}</span>
            </div>
          )}

          {lagInfo.aicValues && lagInfo.aicValues.length > 0 && (
            <div className="mt-3">
              <div className="font-medium mb-2" style={{ color: 'rgb(var(--fg))' }}>AIC / BIC per Lag</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ color: 'rgb(var(--muted))' }}>
                      <th className="text-left py-1 px-2">Lag</th>
                      <th className="text-right py-1 px-2">AIC</th>
                      <th className="text-right py-1 px-2">BIC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'rgb(var(--border))' }}>
                    {lagInfo.aicValues.map((row, i) => (
                      <tr
                        key={i}
                        className={row.lag === (lagInfo.lags ?? lagInfo.selected) ? 'font-bold' : ''}
                        style={
                          row.lag === (lagInfo.lags ?? lagInfo.selected)
                            ? { backgroundColor: 'rgb(var(--accent) / 0.06)', color: 'rgb(var(--fg))' }
                            : {}
                        }
                      >
                        <td className="py-1 px-2">{row.lag}</td>
                        <td className="py-1 px-2 text-right">{num(row.aic)}</td>
                        <td className="py-1 px-2 text-right">{num(row.bic)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

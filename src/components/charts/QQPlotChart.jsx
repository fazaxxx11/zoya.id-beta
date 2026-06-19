import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import { formatNumber } from '../../lib/format'

/**
 * Q-Q Plot for normality assessment
 * Plots theoretical quantiles vs observed quantiles
 */
export function QQPlotChart({ data, title = 'Q-Q Plot (Normalitas)' }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full p-4 text-center text-gray-500">
        Tidak ada data untuk ditampilkan
      </div>
    )
  }

  return (
    <div className="w-full space-y-2">
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="theoretical" 
            type="number"
            tick={{ fontSize: 11 }}
            label={{ value: 'Theoretical Quantiles', position: 'insideBottom', offset: -10, fontSize: 11 }}
          />
          <YAxis 
            dataKey="observed" 
            type="number"
            tick={{ fontSize: 11 }}
            label={{ value: 'Sample Quantiles', angle: -90, position: 'insideLeft', fontSize: 11 }}
          />
          <Tooltip 
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(value) => formatNumber(value)}
          />
          {/* Reference line y=x (perfect normal distribution) */}
          <ReferenceLine 
            segment={[
              { x: Math.min(...data.map(d => d.theoretical)), y: Math.min(...data.map(d => d.theoretical)) },
              { x: Math.max(...data.map(d => d.theoretical)), y: Math.max(...data.map(d => d.theoretical)) }
            ]} 
            stroke="#ef4444" 
            strokeDasharray="5 5"
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="observed" 
            stroke="#4f46e5" 
            strokeWidth={2}
            dot={{ fill: '#4f46e5', r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-600 text-center">
        Jika titik mendekati garis diagonal merah → data normal
      </p>
    </div>
  )
}

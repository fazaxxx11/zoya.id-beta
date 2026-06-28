import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatNumber } from '../../lib/format'

/**
 * Histogram chart for displaying frequency distribution
 * Used in: Normality test results
 */
export function HistogramChart({ data, title = 'Distribusi Data' }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full p-4 text-center text-muted">
        Tidak ada data untuk ditampilkan
      </div>
    )
  }

  return (
    <div className="w-full space-y-2">
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <XAxis 
            dataKey="bin" 
            tick={{ fontSize: 11 }} 
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip 
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(value) => [`Frekuensi: ${value}`, '']}
          />
          <Bar dataKey="count" fill="#9A6721" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={`hsl(35, ${50 - index * 2}%, ${42 + index * 0.5}%)`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

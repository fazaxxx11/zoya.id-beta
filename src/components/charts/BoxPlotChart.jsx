import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, ErrorBar } from 'recharts'
import { formatNumber } from '../../lib/format'

/**
 * Box plot alternative using bar chart with error bars
 * Used in: ANOVA, group comparisons
 */
export function BoxPlotChart({ data, title = 'Perbandingan Kelompok' }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full p-4 text-center text-muted">
        Tidak ada data untuk ditampilkan
      </div>
    )
  }

  // data format: [{ group: 'A', mean, q1, q3, min, max }, ...]
  const chartData = data.map(g => ({
    group: g.group,
    mean: g.mean,
    errorLower: g.mean - g.q1,
    errorUpper: g.q3 - g.mean,
  }))

  // Scholarly palette — sinkron dengan design tokens
  const colors = ['#9A6721', '#166C66', '#B25F58', '#73665A', '#5C8B6F']

  return (
    <div className="w-full space-y-2">
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 30 }}>
          <XAxis 
            dataKey="group" 
            tick={{ fontSize: 11 }}
          />
          <YAxis 
            tick={{ fontSize: 11 }}
            label={{ value: 'Mean', angle: -90, position: 'insideLeft', fontSize: 11 }}
          />
          <Tooltip 
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(value, name) => {
              if (name === 'mean') return [`Mean: ${formatNumber(value)}`, '']
              return [formatNumber(value), name]
            }}
          />
          <Bar dataKey="mean" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
            <ErrorBar
              dataKey="errorLower"
              width={4}
              strokeWidth={2}
              stroke="#1C1E26"
              direction="y"
            />
            <ErrorBar
              dataKey="errorUpper"
              width={4}
              strokeWidth={2}
              stroke="#1C1E26"
              direction="y"
            />
            <LabelList dataKey="mean" position="top" formatter={(val) => formatNumber(val)} style={{ fontSize: 10 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-fg/60 text-center">
        Bar = Mean, Error bars = Q1-Q3 range
      </p>
    </div>
  )
}

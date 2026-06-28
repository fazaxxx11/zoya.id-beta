import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, CartesianGrid, Legend } from 'recharts'
import { formatNumber } from '../../lib/format'

/**
 * Scatter plot with optional regression line
 * Used in: Correlation, Regression analysis
 */
export function ScatterPlotChart({ 
  data, 
  xKey = 'x', 
  yKey = 'y', 
  xLabel, 
  yLabel,
  regressionLine = null,
  title = 'Scatter Plot' 
}) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full p-4 text-center text-muted">
        Tidak ada data untuk ditampilkan
      </div>
    )
  }

  // Compute regression line points if equation provided
  let regressionData = null
  if (regressionLine && regressionLine.slope != null && regressionLine.intercept != null) {
    const xMin = Math.min(...data.map(d => d[xKey]))
    const xMax = Math.max(...data.map(d => d[xKey]))
    regressionData = [
      { [xKey]: xMin, predicted: regressionLine.slope * xMin + regressionLine.intercept },
      { [xKey]: xMax, predicted: regressionLine.slope * xMax + regressionLine.intercept },
    ]
  }

  return (
    <div className="w-full space-y-2">
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#DAD6CD" />
          <XAxis 
            dataKey={xKey} 
            type="number" 
            name={xLabel || xKey}
            tick={{ fontSize: 11 }}
            label={{ value: xLabel || xKey, position: 'insideBottom', offset: -10, fontSize: 12 }}
          />
          <YAxis 
            dataKey={yKey} 
            type="number" 
            name={yLabel || yKey}
            tick={{ fontSize: 11 }}
            label={{ value: yLabel || yKey, angle: -90, position: 'insideLeft', fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(value) => formatNumber(value)}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Scatter
            name="Data Points"
            data={data}
            fill="#166C66"
            fillOpacity={0.6}
          />
          {regressionData && (
            <Scatter
              name="Garis Regresi"
              data={regressionData}
              fill="#B25F58"
              line={{ stroke: '#B25F58', strokeWidth: 2 }}
              shape={() => null}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>
      {regressionLine && (
        <p className="text-xs text-fg/60 text-center">
          ŷ = {formatNumber(regressionLine.slope)}x + {formatNumber(regressionLine.intercept)}
        </p>
      )}
    </div>
  )
}

// Lightweight SVG-based chart components untuk hasil statistik.
// Self-contained, zero dependency, responsive via viewBox.

import jstat from 'jstat'

// ============================================================
// Shared constants
// ============================================================
const COLORS = {
  primary: '#0ea5e9',   // sky-500
  secondary: '#6366f1', // indigo-500
  axis: '#374151',      // gray-700
  grid: '#e5e7eb',      // gray-200
  text: '#6b7280',      // gray-500
  fill: '#bae6fd',      // sky-200
  accent: '#f59e0b',    // amber-500
}

const PALETTE = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

// ============================================================
// ChartFrame — wrapper dengan title, axes, padding
// ============================================================
function ChartFrame({ title, width = 480, height = 280, padding = { t: 30, r: 20, b: 50, l: 50 }, children, xLabel, yLabel }) {
  const innerW = width - padding.l - padding.r
  const innerH = height - padding.t - padding.b
  return (
    <div className="bg-card rounded-lg border border-border p-3">
      {title && <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 text-center">{title}</div>}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ maxHeight: 320 }}>
        <g transform={`translate(${padding.l}, ${padding.t})`}>
          {typeof children === 'function' ? children({ innerW, innerH }) : children}
        </g>
        {xLabel && (
          <text x={padding.l + innerW / 2} y={height - 10} textAnchor="middle"
                fontSize="11" fill={COLORS.text}>{xLabel}</text>
        )}
        {yLabel && (
          <text x={15} y={padding.t + innerH / 2} textAnchor="middle"
                fontSize="11" fill={COLORS.text}
                transform={`rotate(-90, 15, ${padding.t + innerH / 2})`}>{yLabel}</text>
        )}
      </svg>
    </div>
  )
}

function Axes({ innerW, innerH, xTicks, yTicks, xScale, yScale }) {
  return (
    <>
      {/* Y-axis grid */}
      {yTicks.map((t, i) => (
        <g key={`y${i}`}>
          <line x1={0} x2={innerW} y1={yScale(t)} y2={yScale(t)} stroke={COLORS.grid} strokeDasharray="2,2" />
          <text x={-6} y={yScale(t)} dy="0.32em" textAnchor="end" fontSize="10" fill={COLORS.text}>
            {formatTick(t)}
          </text>
        </g>
      ))}
      {/* X-axis */}
      <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke={COLORS.axis} />
      {xTicks.map((t, i) => (
        <g key={`x${i}`}>
          <line x1={xScale(t)} x2={xScale(t)} y1={innerH} y2={innerH + 4} stroke={COLORS.axis} />
          <text x={xScale(t)} y={innerH + 16} textAnchor="middle" fontSize="10" fill={COLORS.text}>
            {formatTick(t)}
          </text>
        </g>
      ))}
      {/* Y-axis line */}
      <line x1={0} x2={0} y1={0} y2={innerH} stroke={COLORS.axis} />
    </>
  )
}

function formatTick(v) {
  if (typeof v !== 'number') return v
  const abs = Math.abs(v)
  if (abs === 0) return '0'
  if (abs >= 1000) return v.toExponential(1)
  if (abs >= 10) return v.toFixed(1)
  if (abs >= 1) return v.toFixed(2)
  return v.toFixed(3)
}

function makeTicks(min, max, n = 5) {
  if (min === max) return [min]
  const step = (max - min) / (n - 1)
  return Array.from({ length: n }, (_, i) => min + i * step)
}

// ============================================================
// Histogram
// ============================================================
export function Histogram({ values, title, xLabel = 'Nilai', yLabel = 'Frekuensi', overlayNormal = false }) {
  const data = values.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v))
  if (data.length < 2) return <EmptyChart title={title} message="Data tidak cukup" />

  const min = Math.min(...data)
  const max = Math.max(...data)
  // Sturges' rule: k = ceil(log2(n) + 1)
  const k = Math.max(5, Math.min(20, Math.ceil(Math.log2(data.length) + 1)))
  const binWidth = (max - min) / k || 1
  const bins = Array.from({ length: k }, (_, i) => ({
    x0: min + i * binWidth,
    x1: min + (i + 1) * binWidth,
    count: 0,
  }))
  data.forEach(v => {
    const idx = Math.min(k - 1, Math.floor((v - min) / binWidth))
    bins[idx].count++
  })

  const maxCount = Math.max(...bins.map(b => b.count))
  const W = 480, H = 280
  const pad = { t: 30, r: 20, b: 50, l: 50 }

  return (
    <ChartFrame title={title} width={W} height={H} padding={pad} xLabel={xLabel} yLabel={yLabel}>
      {({ innerW, innerH }) => {
        const xScale = v => ((v - min) / (max - min || 1)) * innerW
        const yScale = v => innerH - (v / maxCount) * innerH
        const xTicks = makeTicks(min, max, 6)
        const yTicks = makeTicks(0, maxCount, 5).map(v => Math.round(v))

        // Normal curve overlay
        let normalPath = null
        if (overlayNormal) {
          const mean = data.reduce((s, v) => s + v, 0) / data.length
          const sd = Math.sqrt(data.reduce((s, v) => s + (v - mean) ** 2, 0) / (data.length - 1))
          if (sd > 0) {
            const npts = 60
            const pts = []
            for (let i = 0; i <= npts; i++) {
              const x = min + (i / npts) * (max - min)
              const density = jstat.normal.pdf(x, mean, sd)
              // Scale density to match histogram height: density * binWidth * n = expected count
              const expected = density * binWidth * data.length
              pts.push([xScale(x), yScale(Math.min(expected, maxCount * 1.2))])
            }
            normalPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
          }
        }

        return (
          <>
            <Axes innerW={innerW} innerH={innerH} xTicks={xTicks} yTicks={yTicks} xScale={xScale} yScale={yScale} />
            {bins.map((b, i) => {
              const x = xScale(b.x0)
              const w = xScale(b.x1) - x - 1
              const h = innerH - yScale(b.count)
              return <rect key={i} x={x} y={yScale(b.count)} width={Math.max(0, w)} height={h}
                           fill={COLORS.fill} stroke={COLORS.primary} strokeWidth="1" />
            })}
            {normalPath && (
              <path d={normalPath} fill="none" stroke={COLORS.accent} strokeWidth="2" />
            )}
          </>
        )
      }}
    </ChartFrame>
  )
}

// ============================================================
// Q-Q Plot (Normal Quantile-Quantile)
// ============================================================
export function QQPlot({ values, title = 'Q-Q Plot', xLabel = 'Theoretical Quantiles', yLabel = 'Sample Quantiles' }) {
  const data = values.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v))
                     .slice().sort((a, b) => a - b)
  const n = data.length
  if (n < 3) return <EmptyChart title={title} message="Data tidak cukup (n<3)" />

  const mean = data.reduce((s, v) => s + v, 0) / n
  const sd = Math.sqrt(data.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1))

  // Theoretical quantiles
  const points = data.map((v, i) => {
    const p = (i + 0.5) / n
    const theoretical = jstat.normal.inv(p, 0, 1)
    const standardized = (v - mean) / (sd || 1)
    return [theoretical, standardized]
  })

  const xMin = Math.min(...points.map(p => p[0]))
  const xMax = Math.max(...points.map(p => p[0]))
  const yMin = Math.min(...points.map(p => p[1]))
  const yMax = Math.max(...points.map(p => p[1]))
  const dom = Math.max(Math.abs(xMin), Math.abs(xMax), Math.abs(yMin), Math.abs(yMax))

  const W = 360, H = 280
  return (
    <ChartFrame title={title} width={W} height={H} xLabel={xLabel} yLabel={yLabel}>
      {({ innerW, innerH }) => {
        const xScale = v => ((v + dom) / (2 * dom)) * innerW
        const yScale = v => innerH - ((v + dom) / (2 * dom)) * innerH
        const ticks = makeTicks(-dom, dom, 5)

        return (
          <>
            <Axes innerW={innerW} innerH={innerH} xTicks={ticks} yTicks={ticks} xScale={xScale} yScale={yScale} />
            {/* Reference line y=x */}
            <line x1={xScale(-dom)} y1={yScale(-dom)} x2={xScale(dom)} y2={yScale(dom)}
                  stroke={COLORS.accent} strokeWidth="1.5" strokeDasharray="4,3" />
            {points.map((p, i) => (
              <circle key={i} cx={xScale(p[0])} cy={yScale(p[1])} r="3"
                      fill={COLORS.primary} fillOpacity="0.7" />
            ))}
          </>
        )
      }}
    </ChartFrame>
  )
}

// ============================================================
// Scatter Plot (with optional regression line)
// ============================================================
export function ScatterPlot({ x, y, title, xLabel = 'X', yLabel = 'Y', regressionLine = null }) {
  const pairs = x.map((v, i) => [v, y[i]])
                 .filter(([a, b]) => typeof a === 'number' && typeof b === 'number'
                                     && !isNaN(a) && !isNaN(b))
  if (pairs.length < 2) return <EmptyChart title={title} message="Data tidak cukup" />

  const xs = pairs.map(p => p[0])
  const ys = pairs.map(p => p[1])
  const xMin = Math.min(...xs), xMax = Math.max(...xs)
  const yMin = Math.min(...ys), yMax = Math.max(...ys)

  // Padding 5% di axis
  const xRng = xMax - xMin || 1
  const yRng = yMax - yMin || 1
  const xLo = xMin - 0.05 * xRng, xHi = xMax + 0.05 * xRng
  const yLo = yMin - 0.05 * yRng, yHi = yMax + 0.05 * yRng

  const W = 480, H = 280
  return (
    <ChartFrame title={title} width={W} height={H} xLabel={xLabel} yLabel={yLabel}>
      {({ innerW, innerH }) => {
        const xScale = v => ((v - xLo) / (xHi - xLo)) * innerW
        const yScale = v => innerH - ((v - yLo) / (yHi - yLo)) * innerH
        const xTicks = makeTicks(xLo, xHi, 6)
        const yTicks = makeTicks(yLo, yHi, 5)

        // Regression line: y = slope*x + intercept
        let lineEl = null
        if (regressionLine && typeof regressionLine.slope === 'number'
            && typeof regressionLine.intercept === 'number') {
          const x1 = xLo, x2 = xHi
          const y1 = regressionLine.slope * x1 + regressionLine.intercept
          const y2 = regressionLine.slope * x2 + regressionLine.intercept
          lineEl = <line x1={xScale(x1)} y1={yScale(y1)} x2={xScale(x2)} y2={yScale(y2)}
                         stroke={COLORS.accent} strokeWidth="2" />
        }

        return (
          <>
            <Axes innerW={innerW} innerH={innerH} xTicks={xTicks} yTicks={yTicks} xScale={xScale} yScale={yScale} />
            {pairs.map((p, i) => (
              <circle key={i} cx={xScale(p[0])} cy={yScale(p[1])} r="3"
                      fill={COLORS.primary} fillOpacity="0.6" />
            ))}
            {lineEl}
          </>
        )
      }}
    </ChartFrame>
  )
}

// ============================================================
// Box Plot (single or multiple groups)
// ============================================================
export function BoxPlot({ groups, title, xLabel, yLabel = 'Nilai' }) {
  // groups: [{ name, values }]
  const cleaned = groups
    .map(g => ({
      name: g.name,
      values: g.values.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v))
                       .slice().sort((a, b) => a - b),
    }))
    .filter(g => g.values.length >= 3)

  if (!cleaned.length) return <EmptyChart title={title} message="Data tidak cukup" />

  const stats = cleaned.map(g => {
    const v = g.values
    const n = v.length
    const q1 = quantile(v, 0.25)
    const median = quantile(v, 0.5)
    const q3 = quantile(v, 0.75)
    const iqr = q3 - q1
    const lowerFence = q1 - 1.5 * iqr
    const upperFence = q3 + 1.5 * iqr
    const inFence = v.filter(x => x >= lowerFence && x <= upperFence)
    const minWhisker = inFence.length ? inFence[0] : v[0]
    const maxWhisker = inFence.length ? inFence[inFence.length - 1] : v[v.length - 1]
    const outliers = v.filter(x => x < lowerFence || x > upperFence)
    return { name: g.name, n, q1, median, q3, minWhisker, maxWhisker, outliers }
  })

  const allValues = cleaned.flatMap(g => g.values)
  const yMin = Math.min(...allValues)
  const yMax = Math.max(...allValues)
  const yRng = yMax - yMin || 1
  const yLo = yMin - 0.05 * yRng, yHi = yMax + 0.05 * yRng

  const W = Math.max(360, 100 + stats.length * 80)
  const H = 320
  const pad = { t: 30, r: 20, b: 60, l: 60 }

  return (
    <ChartFrame title={title} width={W} height={H} padding={pad} xLabel={xLabel} yLabel={yLabel}>
      {({ innerW, innerH }) => {
        const yScale = v => innerH - ((v - yLo) / (yHi - yLo)) * innerH
        const yTicks = makeTicks(yLo, yHi, 6)
        const groupWidth = innerW / stats.length
        const boxWidth = Math.min(50, groupWidth * 0.6)

        return (
          <>
            {/* Y-grid */}
            {yTicks.map((t, i) => (
              <g key={i}>
                <line x1={0} x2={innerW} y1={yScale(t)} y2={yScale(t)} stroke={COLORS.grid} strokeDasharray="2,2" />
                <text x={-6} y={yScale(t)} dy="0.32em" textAnchor="end" fontSize="10" fill={COLORS.text}>
                  {formatTick(t)}
                </text>
              </g>
            ))}
            <line x1={0} x2={0} y1={0} y2={innerH} stroke={COLORS.axis} />
            <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke={COLORS.axis} />

            {stats.map((s, i) => {
              const cx = (i + 0.5) * groupWidth
              const left = cx - boxWidth / 2
              const right = cx + boxWidth / 2
              const color = PALETTE[i % PALETTE.length]
              return (
                <g key={i}>
                  {/* Whisker */}
                  <line x1={cx} x2={cx} y1={yScale(s.minWhisker)} y2={yScale(s.maxWhisker)} stroke={color} strokeWidth="1.5" />
                  <line x1={cx - 10} x2={cx + 10} y1={yScale(s.minWhisker)} y2={yScale(s.minWhisker)} stroke={color} strokeWidth="1.5" />
                  <line x1={cx - 10} x2={cx + 10} y1={yScale(s.maxWhisker)} y2={yScale(s.maxWhisker)} stroke={color} strokeWidth="1.5" />
                  {/* Box (Q1 - Q3) */}
                  <rect x={left} y={yScale(s.q3)} width={boxWidth} height={yScale(s.q1) - yScale(s.q3)}
                        fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.5" />
                  {/* Median line */}
                  <line x1={left} x2={right} y1={yScale(s.median)} y2={yScale(s.median)} stroke={color} strokeWidth="2.5" />
                  {/* Outliers */}
                  {s.outliers.map((o, j) => (
                    <circle key={j} cx={cx} cy={yScale(o)} r="3"
                            fill="none" stroke={color} strokeWidth="1.5" />
                  ))}
                  {/* Group label */}
                  <text x={cx} y={innerH + 18} textAnchor="middle" fontSize="11" fill={COLORS.axis}>
                    {s.name}
                  </text>
                  <text x={cx} y={innerH + 32} textAnchor="middle" fontSize="9" fill={COLORS.text}>
                    n={s.n}
                  </text>
                </g>
              )
            })}
          </>
        )
      }}
    </ChartFrame>
  )
}

function quantile(sorted, p) {
  const idx = p * (sorted.length - 1)
  const lo = Math.floor(idx), hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo])
}

// ============================================================
// Empty / fallback chart
// ============================================================
function EmptyChart({ title, message }) {
  return (
    <div className="bg-surface rounded-lg border border-border p-6 text-center text-sm text-muted">
      {title && <div className="font-medium mb-1">{title}</div>}
      {message || 'Tidak ada data'}
    </div>
  )
}

// ============================================================
// Multi-chart layout helper
// ============================================================
export function ChartGrid({ children }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
      {children}
    </div>
  )
}

/**
 * Chart data transformation utilities
 * Converts raw statistical data into recharts-compatible formats
 */

import { formatNumber } from './format'

/**
 * Process array of numbers into histogram bins
 * @param {number[]} arr - Array of numeric values
 * @param {number} bins - Number of bins (default: 10)
 * @returns {Array<{bin: string, count: number}>}
 */
export function processHistogramData(arr, bins = 10) {
  if (!arr || arr.length === 0) return []
  
  const min = Math.min(...arr)
  const max = Math.max(...arr)
  const binWidth = (max - min) / bins
  
  if (binWidth === 0) {
    // All values are the same
    return [{ bin: formatNumber(min), count: arr.length }]
  }
  
  const histogram = Array(bins).fill(0).map((_, i) => ({
    bin: `${formatNumber(min + i * binWidth)}-${formatNumber(min + (i + 1) * binWidth)}`,
    count: 0,
    rangeStart: min + i * binWidth,
    rangeEnd: min + (i + 1) * binWidth,
  }))
  
  arr.forEach(val => {
    const binIndex = Math.min(Math.floor((val - min) / binWidth), bins - 1)
    histogram[binIndex].count++
  })
  
  return histogram
}

/**
 * Compute Q-Q plot data (theoretical vs observed quantiles)
 * @param {number[]} arr - Array of numeric values
 * @returns {Array<{theoretical: number, observed: number}>}
 */
export function processQQPlot(arr) {
  if (!arr || arr.length === 0) return []
  
  const sorted = [...arr].sort((a, b) => a - b)
  const n = sorted.length
  
  return sorted.map((observed, i) => {
    // Compute theoretical quantile using inverse normal CDF approximation
    const p = (i + 0.5) / n  // Plotting position
    const theoretical = approximateInvNorm(p)
    return { theoretical, observed }
  })
}

/**
 * Approximate inverse normal CDF (z-score from probability)
 * Beasley-Springer-Moro algorithm
 */
function approximateInvNorm(p) {
  const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637]
  const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833]
  const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209, 
             0.0276438810333863, 0.0038405729373609, 0.0003951896511919,
             0.0000321767881768, 0.0000002888167364, 0.0000003960315187]
  
  if (p < 0 || p > 1) return NaN
  if (p === 0) return -Infinity
  if (p === 1) return Infinity
  if (p === 0.5) return 0
  
  const y = p < 0.5 ? p : 1 - p
  const x = Math.sqrt(-2 * Math.log(y))
  const z = (((a[3] * x + a[2]) * x + a[1]) * x + a[0]) / 
            ((((b[3] * x + b[2]) * x + b[1]) * x + b[0]) * x + 1)
  
  return p < 0.5 ? -z : z
}

/**
 * Process grouped data for box plot visualization
 * @param {Object} groups - { groupName: [values], ... }
 * @returns {Array<{group: string, mean, median, q1, q3, min, max}>}
 */
export function processBoxPlot(groups) {
  if (!groups || typeof groups !== 'object') return []
  
  return Object.entries(groups).map(([group, values]) => {
    if (!values || values.length === 0) {
      return { group, mean: 0, median: 0, q1: 0, q3: 0, min: 0, max: 0 }
    }
    
    const sorted = [...values].sort((a, b) => a - b)
    const n = sorted.length
    const mean = values.reduce((sum, v) => sum + v, 0) / n
    const median = n % 2 === 0 
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 
      : sorted[Math.floor(n / 2)]
    
    const q1Index = Math.floor(n * 0.25)
    const q3Index = Math.floor(n * 0.75)
    const q1 = sorted[q1Index]
    const q3 = sorted[q3Index]
    
    return {
      group,
      mean,
      median,
      q1,
      q3,
      min: sorted[0],
      max: sorted[n - 1],
    }
  })
}

/**
 * Convert {x: [], y: []} to scatter plot format
 * @param {{x: number[], y: number[]}} data
 * @returns {Array<{x: number, y: number}>}
 */
export function processScatterData(data) {
  if (!data || !data.x || !data.y) return []
  const { x, y } = data
  const minLength = Math.min(x.length, y.length)
  return Array.from({ length: minLength }, (_, i) => ({ x: x[i], y: y[i] }))
}

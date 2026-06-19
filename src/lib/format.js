/**
 * Number formatting utilities
 */

/**
 * Format number with fixed decimal places
 * @param {number} value - Number to format
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} Formatted number
 */
export function formatNumber(value, decimals = 2) {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return '—'
  }
  return value.toFixed(decimals)
}

/**
 * Format as percentage
 * @param {number} value - Decimal value (0-1)
 * @param {number} decimals - Decimal places (default: 1)
 * @returns {string} Formatted percentage
 */
export function formatPercent(value, decimals = 1) {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return '—'
  }
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Format p-value with scientific notation for very small values
 * @param {number} pValue - P-value to format
 * @returns {string} Formatted p-value
 */
export function formatPValue(pValue) {
  if (typeof pValue !== 'number' || isNaN(pValue)) return '—'
  if (pValue < 0.001) return '< 0.001'
  return pValue.toFixed(4)
}

/**
 * Format currency (Indonesian Rupiah)
 * @param {number} value - Amount to format
 * @returns {string} Formatted currency
 */
export function formatIDR(value) {
  if (typeof value !== 'number' || isNaN(value)) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

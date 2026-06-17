// Validitas & Reliabilitas Instrumen
// - Validitas: Pearson item-total correlation
// - Reliabilitas: Cronbach's Alpha + split-half

import jstat from 'jstat'
import { pearsonCorrelation } from './correlation.js'

/**
 * Cronbach's Alpha — reliabilitas internal consistency.
 * @param {Array<Array<number>>} items - matriks [n_responden][n_item]
 * @returns {{ alpha: number, k: number, n: number, interpretation: string, itemStats: Array }}
 */
export function cronbachAlpha(items) {
  // items: array of arrays — tiap row = 1 responden, tiap col = 1 item
  if (!items || items.length < 2) {
    return { alpha: NaN, error: 'Minimal 2 responden' }
  }
  const k = items[0].length
  if (k < 2) {
    return { alpha: NaN, error: 'Minimal 2 item' }
  }

  // Filter respondents that have all items numeric
  const valid = items.filter(row => row.length === k
    && row.every(v => typeof v === 'number' && !isNaN(v)))
  const n = valid.length
  if (n < 2) return { alpha: NaN, n: valid.length, error: 'Data tidak valid (responden < 2)' }

  // Variance per item (sample, n-1)
  const itemVar = []
  const itemMean = []
  for (let j = 0; j < k; j++) {
    const col = valid.map(row => row[j])
    const m = col.reduce((a, b) => a + b, 0) / n
    itemMean.push(m)
    const v = col.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1)
    itemVar.push(v)
  }
  const sumItemVar = itemVar.reduce((a, b) => a + b, 0)

  // Total score per responden = sum of items
  const totals = valid.map(row => row.reduce((a, b) => a + b, 0))
  const totalMean = totals.reduce((a, b) => a + b, 0) / n
  const totalVar = totals.reduce((s, t) => s + (t - totalMean) ** 2, 0) / (n - 1)

  if (totalVar === 0) {
    return { alpha: NaN, n, k, error: 'Variansi total = 0; semua responden memberi jawaban identik' }
  }

  const alpha = (k / (k - 1)) * (1 - sumItemVar / totalVar)

  // Item-level statistics: alpha if item deleted
  const itemStats = []
  for (let j = 0; j < k; j++) {
    // Recalculate alpha tanpa item j
    const reducedItems = valid.map(row => row.filter((_, idx) => idx !== j))
    const subAlpha = cronbachAlphaCore(reducedItems)
    // Pearson correlation item-total (corrected: total minus current item)
    const correctedTotals = valid.map((row, ri) => totals[ri] - row[j])
    const itemValues = valid.map(row => row[j])
    const corr = pearsonCorrelation(itemValues, correctedTotals)
    itemStats.push({
      item: j + 1,
      mean: itemMean[j],
      variance: itemVar[j],
      stdDev: Math.sqrt(itemVar[j]),
      itemTotalCorrelation: corr.r,
      itemTotalP: corr.pValue,
      alphaIfDeleted: subAlpha,
      isValid: corr.r >= 0.3 && corr.pValue < 0.05, // umum: item valid jika r ≥ 0.3 & p < 0.05
    })
  }

  return {
    alpha,
    n,
    k,
    sumItemVar,
    totalVar,
    interpretation: interpretCronbach(alpha),
    itemStats,
  }
}

/** Internal: hitung alpha tanpa item-stats (untuk performance saat alpha-if-deleted) */
function cronbachAlphaCore(items) {
  const k = items[0]?.length || 0
  if (k < 2) return NaN
  const n = items.length
  const itemVar = []
  for (let j = 0; j < k; j++) {
    const col = items.map(row => row[j])
    const m = col.reduce((a, b) => a + b, 0) / n
    const v = col.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1)
    itemVar.push(v)
  }
  const sumItemVar = itemVar.reduce((a, b) => a + b, 0)
  const totals = items.map(row => row.reduce((a, b) => a + b, 0))
  const totalMean = totals.reduce((a, b) => a + b, 0) / n
  const totalVar = totals.reduce((s, t) => s + (t - totalMean) ** 2, 0) / (n - 1)
  if (totalVar === 0) return NaN
  return (k / (k - 1)) * (1 - sumItemVar / totalVar)
}

function interpretCronbach(alpha) {
  if (isNaN(alpha)) return 'Tidak dapat dihitung'
  if (alpha < 0) return `α = ${alpha.toFixed(3)} (negatif → instrumen bermasalah, periksa coding/reverse items)`
  if (alpha < 0.5) return `α = ${alpha.toFixed(3)} → reliabilitas TIDAK DAPAT DITERIMA. Instrumen perlu direvisi.`
  if (alpha < 0.6) return `α = ${alpha.toFixed(3)} → reliabilitas LEMAH. Sebagian besar peneliti menolak.`
  if (alpha < 0.7) return `α = ${alpha.toFixed(3)} → reliabilitas QUESTIONABLE/cukup. Perlu peningkatan.`
  if (alpha < 0.8) return `α = ${alpha.toFixed(3)} → reliabilitas DITERIMA (acceptable).`
  if (alpha < 0.9) return `α = ${alpha.toFixed(3)} → reliabilitas BAIK (good).`
  if (alpha < 0.95) return `α = ${alpha.toFixed(3)} → reliabilitas SANGAT BAIK (excellent).`
  return `α = ${alpha.toFixed(3)} → reliabilitas SEMPURNA, namun curiga redundansi item. Periksa apakah item terlalu mirip.`
}

/**
 * Validitas instrumen (Pearson item-total — corrected + simple).
 * Hasil: tabel item dengan r, p, kesimpulan valid/tidak.
 * corrected = total minus item itu sendiri (standar R/SPSS RELIABILITY)
 * simple = total termasuk item itu sendiri (SPSS CORRELATIONS command)
 */
export function itemValidity(items) {
  const k = items[0]?.length || 0
  if (k < 2) return { error: 'Minimal 2 item' }
  const valid = items.filter(row => row.length === k
    && row.every(v => typeof v === 'number' && !isNaN(v)))
  const n = valid.length
  if (n < 3) return { error: 'Minimal 3 responden' }

  // r tabel approx (df = n-2, two-tailed α = 0.05)
  const dfPath = n - 2
  // Pakai t-distribution: r_critical = t / sqrt(t² + df)
  const tCrit = jstat.studentt.inv(0.975, dfPath)
  const rCritical = tCrit / Math.sqrt(tCrit ** 2 + dfPath)

  const totals = valid.map(row => row.reduce((a, b) => a + b, 0))

  const results = []
  for (let j = 0; j < k; j++) {
    const itemVals = valid.map(row => row[j])
    // Corrected item-total (standard: subtract current item)
    const correctedTotals = valid.map((row, ri) => totals[ri] - row[j])
    const corrCorrected = pearsonCorrelation(itemVals, correctedTotals)
    // Simple item-total (SPSS CORRELATIONS: include current item)
    const corrSimple = pearsonCorrelation(itemVals, totals)
    results.push({
      item: j + 1,
      r: corrCorrected.r,
      pValue: corrCorrected.pValue,
      rSimple: corrSimple.r,
      pSimple: corrSimple.pValue,
      n,
      isValid: corrCorrected.r >= rCritical && corrCorrected.pValue < 0.05,
      verdict: corrCorrected.r >= rCritical && corrCorrected.pValue < 0.05
        ? 'VALID'
        : 'TIDAK VALID',
    })
  }

  return {
    n, k,
    rCritical,
    df: dfPath,
    items: results,
    summary: `Dari ${k} item, ${results.filter(r => r.isValid).length} item VALID, `
           + `${results.filter(r => !r.isValid).length} item TIDAK VALID `
           + `(kriteria: r ≥ ${rCritical.toFixed(3)} dan p < 0.05).`,
  }
}

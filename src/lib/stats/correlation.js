// Korelasi: Pearson (parametrik) & Spearman (non-parametrik).

import jstat from 'jstat'
import * as ss from 'simple-statistics'

/**
 * Pearson product-moment correlation.
 * @param {number[]} x
 * @param {number[]} y
 * @returns {{ r: number, pValue: number, n: number, df: number, t: number, ci95: [number, number], strength: string, direction: string }}
 */
export function pearsonCorrelation(x, y) {
  const pairs = x.map((v, i) => [v, y[i]])
                 .filter(([a, b]) => typeof a === 'number' && typeof b === 'number'
                                     && !isNaN(a) && !isNaN(b))
  const n = pairs.length
  if (n < 3) {
    return { r: NaN, pValue: NaN, n, error: 'Sampel terlalu kecil (n<3)' }
  }

  const xs = pairs.map(p => p[0])
  const ys = pairs.map(p => p[1])
  let r = ss.sampleCorrelation(xs, ys)
  if (!isFinite(r)) {
    return { r: NaN, pValue: NaN, n, error: 'Salah satu variabel konstan (tidak ada variasi) — korelasi tak terdefinisi.' }
  }
  // Clamp untuk hindari div-by-zero pada perfect correlation
  const rClamped = Math.max(-0.99999, Math.min(0.99999, r))

  // Test signifikansi: t = r * sqrt((n-2) / (1-r²))
  const df = n - 2
  const t = rClamped * Math.sqrt(df / (1 - rClamped * rClamped))
  const pValue = 2 * (1 - jstat.studentt.cdf(Math.abs(t), df)) // two-tailed

  // 95% Confidence interval (Fisher Z transformation)
  const z = 0.5 * Math.log((1 + rClamped) / (1 - rClamped))
  const seZ = n > 3 ? 1 / Math.sqrt(n - 3) : NaN
  const ci95 = isFinite(seZ) ? [
    (Math.exp(2 * (z - 1.96 * seZ)) - 1) / (Math.exp(2 * (z - 1.96 * seZ)) + 1),
    (Math.exp(2 * (z + 1.96 * seZ)) - 1) / (Math.exp(2 * (z + 1.96 * seZ)) + 1),
  ] : [NaN, NaN]

  return {
    r, pValue, n, df, t, ci95,
    strength: interpretStrength(r),
    direction: r > 0 ? 'positif' : r < 0 ? 'negatif' : 'tidak ada',
    interpretation: buildInterpretation(r, pValue, n, 'Pearson', ci95),
  }
}

/**
 * Spearman rank correlation (non-parametric).
 */
export function spearmanCorrelation(x, y) {
  const pairs = x.map((v, i) => [v, y[i]])
                 .filter(([a, b]) => typeof a === 'number' && typeof b === 'number'
                                     && !isNaN(a) && !isNaN(b))
  const n = pairs.length
  if (n < 3) return { rho: NaN, pValue: NaN, n, error: 'Sampel terlalu kecil (n<3)' }

  const ranks = (arr) => {
    const sorted = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0])
    const r = new Array(arr.length)
    let i = 0
    while (i < sorted.length) {
      let j = i
      while (j + 1 < sorted.length && sorted[j + 1][0] === sorted[i][0]) j++
      const avg = (i + j + 2) / 2 // average rank for ties (1-indexed)
      for (let k = i; k <= j; k++) r[sorted[k][1]] = avg
      i = j + 1
    }
    return r
  }

  const rx = ranks(pairs.map(p => p[0]))
  const ry = ranks(pairs.map(p => p[1]))
  const rho = ss.sampleCorrelation(rx, ry)
  if (!isFinite(rho)) {
    return { rho: NaN, pValue: NaN, n, error: 'Salah satu variabel konstan (tidak ada variasi).' }
  }
  const rhoClamped = Math.max(-0.99999, Math.min(0.99999, rho))

  // p-value via t approximation
  const df = n - 2
  const t = rhoClamped * Math.sqrt(df / (1 - rhoClamped * rhoClamped))
  const pValue = 2 * (1 - jstat.studentt.cdf(Math.abs(t), df))

  // 95% CI via Fisher z (same as Pearson, valid approximation for Spearman per Bonett & Wright 2000)
  const z = 0.5 * Math.log((1 + rhoClamped) / (1 - rhoClamped))
  const seZ = n > 3 ? Math.sqrt(1.06 / (n - 3)) : NaN // Bonett-Wright correction for Spearman
  const ci95 = isFinite(seZ) ? [
    (Math.exp(2 * (z - 1.96 * seZ)) - 1) / (Math.exp(2 * (z - 1.96 * seZ)) + 1),
    (Math.exp(2 * (z + 1.96 * seZ)) - 1) / (Math.exp(2 * (z + 1.96 * seZ)) + 1),
  ] : [NaN, NaN]

  return {
    rho, pValue, n, df, t, ci95,
    strength: interpretStrength(rho),
    direction: rho > 0 ? 'positif' : rho < 0 ? 'negatif' : 'tidak ada',
    interpretation: buildInterpretation(rho, pValue, n, 'Spearman', ci95),
  }
}

/** Interpretasi kekuatan korelasi (Cohen, 1988). */
function interpretStrength(r) {
  const a = Math.abs(r)
  if (a < 0.1) return 'sangat lemah / dapat diabaikan'
  if (a < 0.3) return 'lemah'
  if (a < 0.5) return 'sedang'
  if (a < 0.7) return 'kuat'
  if (a < 0.9) return 'sangat kuat'
  return 'hampir sempurna'
}

function buildInterpretation(r, p, n, method, ci95) {
  const sig = p < 0.05 ? 'signifikan secara statistik' : 'tidak signifikan secara statistik'
  const dir = r > 0 ? 'positif' : 'negatif'
  const symbol = method === 'Spearman' ? 'ρ' : 'r'
  const ciStr = ci95 && isFinite(ci95[0])
    ? `, 95% CI [${ci95[0].toFixed(3)}, ${ci95[1].toFixed(3)}]`
    : ''
  return `Hasil ${method} menunjukkan korelasi ${interpretStrength(r)} ${dir} antara kedua variabel `
       + `(${symbol} = ${r.toFixed(3)}${ciStr}, n = ${n}, p = ${p.toFixed(4)}). `
       + `Korelasi ini ${sig} pada α = 0.05. `
       + `${p < 0.05 ? `Artinya, ada hubungan ${dir} yang nyata.` : `Artinya, hubungan ini bisa terjadi karena kebetulan.`}`
}

/**
 * Hitung matriks korelasi untuk multiple kolom.
 * @returns array of { var1, var2, r, p, n }
 */
export function correlationMatrix(data, columns, method = 'pearson') {
  const fn = method === 'spearman' ? spearmanCorrelation : pearsonCorrelation
  const out = []
  for (let i = 0; i < columns.length; i++) {
    for (let j = i + 1; j < columns.length; j++) {
      const x = data[columns[i]] || []
      const y = data[columns[j]] || []
      const result = fn(x, y)
      out.push({
        var1: columns[i],
        var2: columns[j],
        ...result,
      })
    }
  }
  return out
}

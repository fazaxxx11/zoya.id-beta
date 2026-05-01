// Uji Normalitas — Shapiro-Wilk (small N, n<=50 ideal) & Kolmogorov-Smirnov.
// Catatan: Shapiro-Wilk dengan implementasi exact butuh tabel coefficient (Royston).
// Untuk MVP, kita pakai approximation Royston (1992) yang valid untuk n=3..5000.

import jstat from 'jstat'

/**
 * Shapiro-Wilk test for normality.
 * Implementasi pakai Royston (1992) approximation.
 * Valid untuk n=3 sampai n=5000.
 * Reference: Royston, P. (1992). "Approximating the Shapiro-Wilk W-test for non-normality"
 *
 * @param {number[]} values
 * @returns {{ W: number, pValue: number, n: number, isNormal: boolean, alpha: number }}
 */
export function shapiroWilk(values, alpha = 0.05) {
  const x = values.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v))
                  .sort((a, b) => a - b)
  const n = x.length

  if (n < 3) {
    return { W: NaN, pValue: NaN, n, isNormal: null, alpha,
             note: 'Sampel terlalu kecil (n<3) untuk uji Shapiro-Wilk' }
  }
  if (n > 5000) {
    return { W: NaN, pValue: NaN, n, isNormal: null, alpha,
             note: 'Sampel terlalu besar (n>5000); gunakan Kolmogorov-Smirnov atau visual Q-Q plot' }
  }

  const mean = x.reduce((a, b) => a + b, 0) / n
  const ssq = x.reduce((s, v) => s + (v - mean) ** 2, 0) // Σ(x-mean)²

  // Hitung koefisien a_i (Royston approximation)
  // m_i = Φ⁻¹((i - 3/8) / (n + 1/4))
  const m = []
  for (let i = 1; i <= n; i++) {
    m.push(jstat.normal.inv((i - 3 / 8) / (n + 1 / 4), 0, 1))
  }
  const m2 = m.reduce((s, v) => s + v * v, 0)

  // a coefficients (Royston 1992)
  const u = 1 / Math.sqrt(n)
  const a = new Array(n).fill(0)
  // a_n
  let an = -2.706056 * u ** 5 + 4.434685 * u ** 4 - 2.071190 * u ** 3
           - 0.147981 * u ** 2 + 0.221157 * u + m[n - 1] / Math.sqrt(m2)
  // a_{n-1}
  let an1 = -3.582633 * u ** 5 + 5.682633 * u ** 4 - 1.752460 * u ** 3
            - 0.293762 * u ** 2 + 0.042981 * u + m[n - 2] / Math.sqrt(m2)
  a[n - 1] = an
  a[n - 2] = an1
  a[0] = -an
  a[1] = -an1

  let phi
  if (n === 3) {
    a[0] = Math.sqrt(0.5)
    a[1] = 0
    a[2] = -Math.sqrt(0.5)
  } else {
    const eps = (m2 - 2 * m[n - 1] ** 2 - 2 * m[n - 2] ** 2)
              / (1 - 2 * a[n - 1] ** 2 - 2 * a[n - 2] ** 2)
    phi = eps
    for (let i = 2; i < n - 2; i++) {
      a[i] = m[i] / Math.sqrt(phi)
    }
  }

  // W statistic
  const numerator = a.reduce((s, ai, i) => s + ai * x[i], 0) ** 2
  const W = numerator / ssq

  // p-value approximation (Royston 1992 untuk n=12-5000; pakai approach untuk semua)
  let pValue
  if (n <= 11) {
    // Untuk n kecil pakai pendekatan polynomial
    const gamma = -2.273 + 0.459 * n
    const mu = 0.5440 - 0.39978 * n + 0.025054 * n ** 2 - 0.0006714 * n ** 3
    const sigma = Math.exp(1.3822 - 0.77857 * n + 0.062767 * n ** 2 - 0.0020322 * n ** 3)
    const w = -Math.log(gamma - Math.log(1 - W))
    const z = (w - mu) / sigma
    pValue = 1 - jstat.normal.cdf(z, 0, 1)
  } else {
    // n=12-5000
    const u2 = Math.log(n)
    const mu = -1.5861 - 0.31082 * u2 - 0.083751 * u2 ** 2 + 0.0038915 * u2 ** 3
    const sigma = Math.exp(-0.4803 - 0.082676 * u2 + 0.0030302 * u2 ** 2)
    const z = (Math.log(1 - W) - mu) / sigma
    pValue = 1 - jstat.normal.cdf(z, 0, 1)
  }

  // Clamp p-value
  pValue = Math.max(0, Math.min(1, pValue))

  return {
    W,
    pValue,
    n,
    isNormal: pValue > alpha,
    alpha,
    interpretation: pValue > alpha
      ? `Data terdistribusi normal (p = ${pValue.toFixed(4)} > α = ${alpha}). Asumsi normalitas TERPENUHI.`
      : `Data TIDAK terdistribusi normal (p = ${pValue.toFixed(4)} ≤ α = ${alpha}). Asumsi normalitas TIDAK terpenuhi — pertimbangkan uji non-parametrik.`,
  }
}

/**
 * Kolmogorov-Smirnov test (one-sample, terhadap distribusi normal).
 * Pakai sample mean & SD sebagai parameter (Lilliefors correction tidak applied — strict KS).
 * @param {number[]} values
 */
export function kolmogorovSmirnov(values, alpha = 0.05) {
  const x = values.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v))
                  .sort((a, b) => a - b)
  const n = x.length
  if (n < 4) {
    return { D: NaN, pValue: NaN, n, isNormal: null, alpha,
             note: 'Sampel terlalu kecil (n<4)' }
  }

  const mean = x.reduce((a, b) => a + b, 0) / n
  const variance = x.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
  const sd = Math.sqrt(variance)

  // D = max |F_empirical(x) - F_theoretical(x)|
  let D = 0
  for (let i = 0; i < n; i++) {
    const Femp1 = i / n           // sebelum nilai
    const Femp2 = (i + 1) / n      // setelah nilai
    const Fth = jstat.normal.cdf(x[i], mean, sd)
    D = Math.max(D, Math.abs(Femp1 - Fth), Math.abs(Femp2 - Fth))
  }

  // p-value approximation (Stephens 1986 modification)
  const dMod = D * (Math.sqrt(n) - 0.01 + 0.85 / Math.sqrt(n))
  let pValue
  if (dMod < 0.775) pValue = 1
  else if (dMod < 0.819) pValue = 1 - Math.exp(-7.01256 * dMod ** 2 + 2.76773 * dMod - 0.4)
  else if (dMod < 0.895) pValue = 1 - Math.exp(-7.90289 * dMod ** 2 + 3.180 * dMod - 0.583)
  else pValue = Math.exp(-1.2937 * dMod ** 2 + 0.275 * dMod - 1.0184) // approx tail

  pValue = Math.max(0, Math.min(1, pValue))

  return {
    D,
    pValue,
    n,
    mean, sd,
    isNormal: pValue > alpha,
    alpha,
    interpretation: pValue > alpha
      ? `Data terdistribusi normal menurut KS (p = ${pValue.toFixed(4)}).`
      : `Data TIDAK terdistribusi normal menurut KS (p = ${pValue.toFixed(4)}).`,
  }
}

/**
 * Auto-pilih uji normalitas berdasarkan ukuran sampel:
 * - n ≤ 50: Shapiro-Wilk (lebih sensitif)
 * - n > 50: Kolmogorov-Smirnov
 */
export function testNormality(values, alpha = 0.05) {
  const n = values.filter(v => typeof v === 'number' && !isNaN(v)).length
  if (n <= 50) {
    return { method: 'Shapiro-Wilk', ...shapiroWilk(values, alpha) }
  }
  return { method: 'Kolmogorov-Smirnov', ...kolmogorovSmirnov(values, alpha) }
}

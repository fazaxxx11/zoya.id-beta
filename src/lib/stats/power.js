// Power Analysis (a priori) — kalkulator sampel/power untuk uji-uji utama.
// Approach: power dihitung lewat aproksimasi normal/large-sample,
// lalu n dicari via bisection. Akurasi cukup untuk perencanaan skripsi
// (selisih < 5% vs G*Power untuk sebagian besar effect-size > 0.2).
//
// Konvensi:
//   - alpha   : Type-I error (default 0.05, two-tailed kecuali disebut 1-tailed)
//   - power   : 1 - β (default 0.80)
//   - returns : { n, power, effectSize, ...detail } tergantung mode
//
// Mode "solve":
//   'n'     → cari N minimum agar power tercapai
//   'power' → hitung power dari N yang diberikan
//   'es'    → cari minimum detectable effect size

import jstat from 'jstat'

const Z = (p) => jstat.normal.inv(p, 0, 1)
const PHI = (z) => jstat.normal.cdf(z, 0, 1)

// =====================================================================
// Common z-power formula: untuk one-mean / paired / one-sample t,
// power = Φ(d√n − z_{1−α/2}) + Φ(−d√n − z_{1−α/2})
// Untuk independent two-sample, gunakan d√(n/2) (n = per-group size).
// =====================================================================
function zPower(noncen, alpha, twoTailed = true) {
  const zCrit = twoTailed ? Z(1 - alpha / 2) : Z(1 - alpha)
  if (twoTailed) return PHI(noncen - zCrit) + PHI(-noncen - zCrit)
  return PHI(noncen - zCrit)
}

// Bisection helper to find smallest integer n in [lo, hi] s.t. fn(n) ≥ target
function bisectN(fn, target, lo = 4, hi = 100000) {
  if (fn(hi) < target) return null // tidak bisa dicapai dalam range
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (fn(mid) >= target) hi = mid
    else lo = mid + 1
  }
  return lo
}

// =====================================================================
// 1) Independent two-sample t-test (equal n)
//    d = (μ1 − μ2) / SD_pooled
// =====================================================================
export function powerIndependentT({ d, n, alpha = 0.05, power = 0.80, twoTailed = true, solve = 'n' }) {
  if (d <= 0) return { error: 'Effect size d harus > 0' }
  const compute = (nPerGroup) => zPower(d * Math.sqrt(nPerGroup / 2), alpha, twoTailed)

  if (solve === 'power') {
    if (!n) return { error: 'n per grup harus diberikan' }
    const p = compute(n)
    return { test: 'Independent t-test', d, alpha, twoTailed, nPerGroup: n, nTotal: n * 2, power: p }
  }
  if (solve === 'es') {
    if (!n) return { error: 'n per grup harus diberikan' }
    const zCrit = twoTailed ? Z(1 - alpha / 2) : Z(1 - alpha)
    const zPow = Z(power)
    const dMin = (zCrit + zPow) / Math.sqrt(n / 2)
    return { test: 'Independent t-test', d: dMin, alpha, twoTailed, power, nPerGroup: n, nTotal: n * 2 }
  }
  // solve = 'n' (default)
  const nFound = bisectN(compute, power, 4, 100000)
  if (nFound == null) return { error: 'Tidak dapat dicapai dalam range n ≤ 100000' }
  return { test: 'Independent t-test', d, alpha, twoTailed, power, nPerGroup: nFound, nTotal: nFound * 2 }
}

// =====================================================================
// 2) Paired / one-sample t-test
//    d = mean_diff / SD_diff
// =====================================================================
export function powerPairedT({ d, n, alpha = 0.05, power = 0.80, twoTailed = true, solve = 'n' }) {
  if (d <= 0) return { error: 'Effect size d harus > 0' }
  const compute = (nn) => zPower(d * Math.sqrt(nn), alpha, twoTailed)

  if (solve === 'power') {
    if (!n) return { error: 'n harus diberikan' }
    return { test: 'Paired/One-sample t-test', d, alpha, twoTailed, n, power: compute(n) }
  }
  if (solve === 'es') {
    if (!n) return { error: 'n harus diberikan' }
    const zCrit = twoTailed ? Z(1 - alpha / 2) : Z(1 - alpha)
    const dMin = (zCrit + Z(power)) / Math.sqrt(n)
    return { test: 'Paired/One-sample t-test', d: dMin, alpha, twoTailed, power, n }
  }
  const nFound = bisectN(compute, power, 3, 100000)
  if (nFound == null) return { error: 'Tidak dapat dicapai dalam range n ≤ 100000' }
  return { test: 'Paired/One-sample t-test', d, alpha, twoTailed, power, n: nFound }
}

// =====================================================================
// 3) Pearson correlation (Fisher z-transform)
//    Effect size: r (target population correlation)
// =====================================================================
export function powerCorrelation({ r, n, alpha = 0.05, power = 0.80, twoTailed = true, solve = 'n' }) {
  if (Math.abs(r) >= 1 || r === 0) return { error: 'r harus dalam (−1, 0) ∪ (0, 1)' }
  const zr = 0.5 * Math.log((1 + Math.abs(r)) / (1 - Math.abs(r)))
  const compute = (nn) => zPower(zr * Math.sqrt(nn - 3), alpha, twoTailed)

  if (solve === 'power') {
    if (!n) return { error: 'n harus diberikan' }
    return { test: 'Pearson correlation', r, alpha, twoTailed, n, power: compute(n) }
  }
  if (solve === 'es') {
    if (!n) return { error: 'n harus diberikan' }
    const zCrit = twoTailed ? Z(1 - alpha / 2) : Z(1 - alpha)
    const zrMin = (zCrit + Z(power)) / Math.sqrt(n - 3)
    const rMin = (Math.exp(2 * zrMin) - 1) / (Math.exp(2 * zrMin) + 1)
    return { test: 'Pearson correlation', r: rMin, alpha, twoTailed, power, n }
  }
  const nFound = bisectN(compute, power, 4, 100000)
  if (nFound == null) return { error: 'Tidak dapat dicapai' }
  return { test: 'Pearson correlation', r, alpha, twoTailed, power, n: nFound }
}

// =====================================================================
// 4) One-way ANOVA — k grup, equal n
//    Effect size: Cohen's f (small=0.10, medium=0.25, large=0.40)
//    Power dihitung via aproksimasi normal terhadap noncentral F
//    (Patnaik-style: 1-cdf(F_crit | df1, df2, λ) ≈ Φ((mean − F_crit)/sd))
// =====================================================================
export function powerANOVA({ f, k, n, alpha = 0.05, power = 0.80, solve = 'n' }) {
  if (f <= 0) return { error: 'Effect size f harus > 0' }
  if (!k || k < 2) return { error: 'Jumlah grup k harus ≥ 2' }
  const df1 = k - 1

  const computePower = (nPerGroup) => {
    const N = nPerGroup * k
    const df2 = N - k
    if (df2 < 1) return 0
    const lambda = f * f * N
    const Fcrit = jstat.centralF.inv(1 - alpha, df1, df2)
    // Mean & var of noncentral F (Johnson-Kotz):
    // E[F] = df2*(df1 + λ) / (df1*(df2 − 2))
    // Var[F] = 2*(df2/df1)^2 * [(df1+λ)^2 + (df1+2λ)*(df2−2)] / ((df2−2)^2 * (df2−4))
    if (df2 <= 4) return 0
    const meanF = (df2 * (df1 + lambda)) / (df1 * (df2 - 2))
    const varF = 2 * (df2 / df1) ** 2 *
                 ((df1 + lambda) ** 2 + (df1 + 2 * lambda) * (df2 - 2)) /
                 ((df2 - 2) ** 2 * (df2 - 4))
    const sdF = Math.sqrt(varF)
    return 1 - PHI((Fcrit - meanF) / sdF)
  }

  if (solve === 'power') {
    if (!n) return { error: 'n per grup harus diberikan' }
    return { test: 'One-way ANOVA', f, k, alpha, nPerGroup: n, nTotal: n * k, power: computePower(n) }
  }
  if (solve === 'es') {
    if (!n) return { error: 'n per grup harus diberikan' }
    // Bisection on f (independent of outer `f`)
    const N = n * k
    const df2 = N - k
    if (df2 <= 4) return { error: 'n per grup terlalu kecil untuk df2 > 4' }
    const Fcrit = jstat.centralF.inv(1 - alpha, df1, df2)
    const powerForF = (fTry) => {
      const lambda = fTry * fTry * N
      const meanF = (df2 * (df1 + lambda)) / (df1 * (df2 - 2))
      const varF = 2 * (df2 / df1) ** 2 *
                   ((df1 + lambda) ** 2 + (df1 + 2 * lambda) * (df2 - 2)) /
                   ((df2 - 2) ** 2 * (df2 - 4))
      return 1 - PHI((Fcrit - meanF) / Math.sqrt(varF))
    }
    let lo = 0.01, hi = 2.0
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2
      if (powerForF(mid) < power) lo = mid; else hi = mid
    }
    return { test: 'One-way ANOVA', f: hi, k, alpha, power, nPerGroup: n, nTotal: n * k }
  }
  const nFound = bisectN(computePower, power, 3, 100000)
  if (nFound == null) return { error: 'Tidak dapat dicapai' }
  return { test: 'One-way ANOVA', f, k, alpha, power, nPerGroup: nFound, nTotal: nFound * k }
}

// =====================================================================
// 5) Chi-square (goodness-of-fit / independence)
//    Effect size: Cohen's w (small=0.10, medium=0.30, large=0.50)
//    df: derajat kebebasan, untuk RxC contingency: (R-1)*(C-1)
//    Pakai aproksimasi noncentral chi-square via normal:
//    NCχ²(df, λ) ≈ N(df + λ, 2(df + 2λ))
// =====================================================================
export function powerChiSquare({ w, df, n, alpha = 0.05, power = 0.80, solve = 'n' }) {
  if (w <= 0) return { error: "Effect size w harus > 0" }
  if (!df || df < 1) return { error: 'df harus ≥ 1' }
  const computePower = (nn) => {
    const lambda = w * w * nn
    const crit = jstat.chisquare.inv(1 - alpha, df)
    const mean = df + lambda
    const sd = Math.sqrt(2 * (df + 2 * lambda))
    return 1 - PHI((crit - mean) / sd)
  }

  if (solve === 'power') {
    if (!n) return { error: 'n harus diberikan' }
    return { test: 'Chi-square', w, df, alpha, n, power: computePower(n) }
  }
  if (solve === 'es') {
    if (!n) return { error: 'n harus diberikan' }
    let lo = 0.01, hi = 2.0
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2
      const lambda = mid * mid * n
      const crit = jstat.chisquare.inv(1 - alpha, df)
      const mean = df + lambda
      const sd = Math.sqrt(2 * (df + 2 * lambda))
      const p = 1 - PHI((crit - mean) / sd)
      if (p < power) lo = mid; else hi = mid
    }
    return { test: 'Chi-square', w: hi, df, alpha, power, n }
  }
  const nFound = bisectN(computePower, power, 5, 100000)
  if (nFound == null) return { error: 'Tidak dapat dicapai' }
  return { test: 'Chi-square', w, df, alpha, power, n: nFound }
}

// =====================================================================
// Convenience: Cohen's conventions (untuk auto-fill UI)
// =====================================================================
export const COHEN_CONVENTIONS = {
  d:  { small: 0.20, medium: 0.50, large: 0.80 },
  r:  { small: 0.10, medium: 0.30, large: 0.50 },
  f:  { small: 0.10, medium: 0.25, large: 0.40 },
  f2: { small: 0.02, medium: 0.15, large: 0.35 },
  w:  { small: 0.10, medium: 0.30, large: 0.50 },
}

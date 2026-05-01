// Effect size calculations dengan 95% Confidence Intervals.
// Sesuai standar APA 7 yang mewajibkan effect size + CI di setiap inferential statistic.

import jstat from 'jstat'

/**
 * 95% CI untuk Cohen's d (independent groups).
 * Menggunakan noncentral t-distribution approximation (Hedges & Olkin 1985).
 *
 * @param {number} d - Cohen's d
 * @param {number} n1
 * @param {number} n2
 * @returns {[number, number]} [lower, upper]
 */
export function cohensD_CI_independent(d, n1, n2, alpha = 0.05) {
  const N = n1 + n2
  // SE of d (Hedges & Olkin)
  const se = Math.sqrt((N / (n1 * n2)) + (d * d) / (2 * (N - 2)))
  const z = jstat.normal.inv(1 - alpha / 2, 0, 1)
  return [d - z * se, d + z * se]
}

/**
 * 95% CI untuk Cohen's d (paired / one-sample).
 * @param {number} d
 * @param {number} n
 */
export function cohensD_CI_paired(d, n, alpha = 0.05) {
  // SE for paired Cohen's d (Borenstein 2009)
  const se = Math.sqrt((1 / n) + (d * d) / (2 * n))
  const z = jstat.normal.inv(1 - alpha / 2, 0, 1)
  return [d - z * se, d + z * se]
}

/**
 * Hedges' g — bias-corrected version of Cohen's d.
 * @param {number} d
 * @param {number} n1
 * @param {number} n2
 */
export function hedgesG(d, n1, n2) {
  const df = n1 + n2 - 2
  // Correction factor J ≈ 1 - 3/(4·df - 1)
  const J = 1 - 3 / (4 * df - 1)
  return d * J
}

/**
 * 95% CI untuk η² (eta-squared) dari one-way ANOVA.
 * Menggunakan noncentral F-distribution via Steiger (2004) approximation.
 *
 * @param {number} F - F-statistic
 * @param {number} df1
 * @param {number} df2
 * @returns {{ etaSq: number, ci: [number, number] }}
 */
export function etaSquared_CI(F, df1, df2, alpha = 0.05) {
  const etaSq = (F * df1) / (F * df1 + df2)

  // Find noncentrality parameter bounds via inverse noncentral F
  // Approximation: lambda such that P(F > observed | df1, df2, lambda) = alpha/2 and 1-alpha/2
  const lambdaLower = ncfInv(F, df1, df2, 1 - alpha / 2)
  const lambdaUpper = ncfInv(F, df1, df2, alpha / 2)

  const lower = lambdaLower / (lambdaLower + df1 + df2 + 1)
  const upper = lambdaUpper / (lambdaUpper + df1 + df2 + 1)

  return {
    etaSq,
    ci: [Math.max(0, lower), Math.min(1, upper)],
  }
}

/**
 * Omega-squared (less biased than eta²).
 */
export function omegaSquared(F, df1, df2) {
  return (df1 * (F - 1)) / (df1 * (F - 1) + df1 + df2 + 1)
}

/**
 * 95% CI untuk Cramér's V (Bonett 2006 approximation).
 *
 * @param {number} v - Cramér's V
 * @param {number} chi2
 * @param {number} N - sample size
 * @param {number} df - chi-square df
 */
export function cramersV_CI(v, chi2, N, df, alpha = 0.05) {
  if (v === 0 || N < 10) return [Math.max(0, v - 0.1), Math.min(1, v + 0.1)]
  // SE for V via delta method
  const se = v / Math.sqrt(2 * chi2)
  const z = jstat.normal.inv(1 - alpha / 2, 0, 1)
  return [Math.max(0, v - z * se), Math.min(1, v + z * se)]
}

/**
 * Inverse noncentral F-distribution: find lambda such that
 * P(F_observed | df1, df2, lambda) corresponds to target tail probability.
 *
 * Numerical bisection. Returns 0 if no positive lambda works.
 *
 * @param {number} fObs
 * @param {number} df1
 * @param {number} df2
 * @param {number} pTarget - desired CDF value (e.g., 0.025 for upper bound)
 */
function ncfInv(fObs, df1, df2, pTarget) {
  // Bisection on lambda ∈ [0, large]
  let lo = 0, hi = 1000
  // Approximation of noncentral F CDF via series expansion (truncated Poisson mixture)
  const cdf = (lambda) => ncfCdf(fObs, df1, df2, lambda)

  // Check bounds
  if (cdf(0) <= pTarget) return 0
  if (cdf(hi) >= pTarget) {
    // expand hi
    while (cdf(hi) >= pTarget && hi < 1e6) hi *= 2
  }

  for (let it = 0; it < 60; it++) {
    const mid = (lo + hi) / 2
    if (cdf(mid) > pTarget) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/**
 * CDF of noncentral F via Poisson mixture of central F-distributions.
 * P(F < f | df1, df2, lambda) = Σ_{j=0}^∞ exp(-λ/2)(λ/2)^j / j! * P(F < f | df1+2j, df2)
 */
function ncfCdf(f, df1, df2, lambda, maxIter = 100) {
  if (lambda < 1e-9) return jstat.centralF.cdf(f, df1, df2)
  let sum = 0
  let logFactJ = 0
  const halfLambda = lambda / 2
  for (let j = 0; j < maxIter; j++) {
    if (j > 0) logFactJ += Math.log(j)
    const logWeight = -halfLambda + j * Math.log(halfLambda) - logFactJ
    const weight = Math.exp(logWeight)
    if (!isFinite(weight) || weight < 1e-12) {
      if (j > 5) break
      continue
    }
    const cdfJ = jstat.centralF.cdf(f, df1 + 2 * j, df2)
    sum += weight * cdfJ
    if (weight < 1e-10 && j > 10) break
  }
  return Math.max(0, Math.min(1, sum))
}

/**
 * Helper: interpret Cohen's d magnitude (Cohen 1988).
 */
export function interpretCohensD(d) {
  const a = Math.abs(d)
  if (a < 0.2) return 'sangat kecil / dapat diabaikan'
  if (a < 0.5) return 'kecil'
  if (a < 0.8) return 'sedang'
  if (a < 1.2) return 'besar'
  return 'sangat besar'
}

/**
 * Helper: interpret eta-squared magnitude (Cohen 1988).
 */
export function interpretEtaSquared(eta) {
  if (eta < 0.01) return 'sangat kecil'
  if (eta < 0.06) return 'kecil'
  if (eta < 0.14) return 'sedang'
  return 'besar'
}

/**
 * Helper: interpret Cramér's V magnitude.
 */
export function interpretCramersV(v) {
  if (v < 0.1) return 'sangat kecil'
  if (v < 0.3) return 'kecil'
  if (v < 0.5) return 'sedang'
  return 'besar'
}

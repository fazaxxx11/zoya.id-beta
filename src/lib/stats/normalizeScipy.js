/**
 * Scipy → UI shape normalizer.
 *
 * The Python/scipy backend (api/stats.py) returns its own result shapes, which
 * differ from the shapes the Statistik UI consumes (the JS adapter shapes from
 * uiAdapters.js). Rather than hand-rebuild every field from the scipy result —
 * error-prone, since any missed field would render as `undefined` and break the
 * UI — we use a *merge* strategy:
 *
 *   1. Run the JS adapter on the same raw input → gives the exact UI shape.
 *   2. Override the authoritative inferential fields (t, p, F, r, χ², …) with
 *      scipy's values.
 *   3. Tag the result `backend: 'scipy'`.
 *
 * Fields scipy does not compute (e.g. Welch's t, ω², VIFs, Cramér's V CI,
 * residual diagnostics, per-student N-gain pairs) stay at the JS adapter value,
 * so the UI never sees a missing field. This matches the project intent: scipy
 * is the primary compute path, JS is the graceful fallback — even field-by-field
 * within a single scipy result.
 *
 * scipy returns ci95 as `{ low, high }`; the UI expects a 2-element array
 * `[lo, hi]`. Converted per test via ciArray().
 */

import {
  mannWhitneyAdapter,
  wilcoxonAdapter,
  analyzeNGainAdapter,
  pearsonAdapter,
  spearmanAdapter,
  oneSampleTTestAdapter,
  pairedTTestAdapter,
  independentTTestAdapter,
  normalityAdapter,
  oneWayANOVAAdapter,
  twoWayANOVAAdapter,
  chiSquareIndependenceAdapter,
  itemValidityAdapter,
  cronbachAdapter,
  kruskalWallisAdapter,
  simpleRegressionAdapter,
  multipleLinearRegressionAdapter,
} from '../statistics/uiAdapters.js'

const SCIPY = 'scipy'

/**
 * Spread scipy overrides over an adapter result.
 *
 * Override values that are `undefined` are dropped, so the adapter's value for
 * that field is preserved — i.e. "scipy didn't compute this → keep JS". Adapter
 * errors are passed through unchanged (tagged scipy so callers can short-circuit).
 */
function merge(base, overrides) {
  if (!base || base.error) return { ...base, backend: SCIPY }
  const clean = {}
  for (const k in overrides) {
    if (overrides[k] !== undefined) clean[k] = overrides[k]
  }
  return { ...base, ...clean, backend: SCIPY }
}

/** scipy ci95 `{ low, high }` → UI `[lo, hi]`. Returns undefined if not an object. */
const ciArray = (ci) => (ci && typeof ci === 'object' && 'low' in ci ? [ci.low, ci.high] : undefined)

/** t-statistic from a correlation coefficient r with df = n−2. undefined if not derivable. */
function tFromR(r, df) {
  if (r == null || !isFinite(r) || df == null) return undefined
  const denom = 1 - r * r
  if (denom <= 0) return undefined
  return r * Math.sqrt(df / denom)
}

const strength = (r) => {
  if (!isFinite(r)) return undefined
  const a = Math.abs(r)
  if (a >= 0.7) return 'kuat'
  if (a >= 0.4) return 'sedang'
  if (a >= 0.2) return 'lemah'
  return 'sangat lemah'
}

const direction = (r) => {
  if (!isFinite(r)) return undefined
  return r > 0 ? 'positif' : r < 0 ? 'negatif' : 'tidak ada'
}

// ── Non-parametric ────────────────────────────────────────────────

export function normalizeWilcoxon(scipy, before, after, alpha = 0.05) {
  const base = wilcoxonAdapter(before, after, alpha)
  return merge(base, {
    W: scipy.W, Wpos: scipy.Wpos, Wneg: scipy.Wneg, n: scipy.n,
    z: scipy.z, pValue: scipy.pValue, meanDiff: scipy.meanDiff,
    isSignificant: scipy.isSignificant, effectSize: scipy.effectSize,
    effectSizeLabel: scipy.effectSizeLabel, interpretation: scipy.interpretation,
  })
}

export function normalizeMannWhitney(scipy, group1, group2, alpha = 0.05) {
  const base = mannWhitneyAdapter(group1, group2, alpha)
  return merge(base, {
    U: scipy.U, R1: scipy.R1, R2: scipy.R2,
    meanRank1: scipy.meanRank1, meanRank2: scipy.meanRank2,
    n1: scipy.n1, n2: scipy.n2, N: scipy.N,
    z: scipy.z, pValue: scipy.pValue, isSignificant: scipy.isSignificant,
    effectSize: scipy.effectSize, effectSizeLabel: scipy.effectSizeLabel,
    interpretation: scipy.interpretation,
  })
}

export function normalizeKruskal(scipy, groups, groupNames, alpha = 0.05) {
  const base = kruskalWallisAdapter(groups, groupNames, alpha)
  const groupStats = base.groupStats && scipy.groupStats
    ? base.groupStats.map((g, i) => {
        const s = scipy.groupStats[i] || {}
        return {
          ...g,
          meanRank: s.meanRank ?? g.meanRank,
          median: s.median ?? g.median,
          mean: s.mean, sd: s.sd, min: s.min, max: s.max,
        }
      })
    : base.groupStats
  return merge(base, {
    H: scipy.H, df: scipy.df, pValue: scipy.pValue,
    isSignificant: scipy.significant, etaSquared: scipy.epsilonSquared,
    effectSizeLabel: scipy.effectSizeLabel, groupStats, interpretation: scipy.interpretation,
  })
}

// ── N-Gain ────────────────────────────────────────────────────────

export function normalizeNGain(scipy, data) {
  const base = analyzeNGainAdapter(data)
  const signifTest = base.signifTest
    ? {
        ...base.signifTest,
        t: scipy.signifTest?.t,
        pValue: scipy.signifTest?.pValue,
        significant: scipy.signifTest?.significant,
      }
    : scipy.signifTest
  return merge(base, {
    n: scipy.n, nGainMean: scipy.nGainMean, nGainSD: scipy.nGainSD,
    nGainMin: scipy.nGainMin, nGainMax: scipy.nGainMax,
    kategoriKelas: scipy.kategoriKelas, efektivitasPersen: scipy.efektivitasPersen,
    tafsiranEfektivitas: scipy.tafsiranEfektivitas,
    distribusi: scipy.distribusi, distribusiPersen: scipy.distribusiPersen,
    preStats: scipy.preStats, postStats: scipy.postStats, signifTest,
  })
}

// ── Correlation ───────────────────────────────────────────────────

export function normalizePearson(scipy, x, y) {
  const base = pearsonAdapter(x, y)
  return merge(base, {
    r: scipy.r, pValue: scipy.pValue, n: scipy.n, df: scipy.df,
    t: tFromR(scipy.r, scipy.df),
    strength: strength(scipy.r), direction: direction(scipy.r),
    interpretation: scipy.interpretation,
  })
}

export function normalizeSpearman(scipy, x, y) {
  const base = spearmanAdapter(x, y)
  return merge(base, {
    rho: scipy.r, pValue: scipy.pValue, n: scipy.n, df: scipy.df,
    t: tFromR(scipy.r, scipy.df),
    strength: strength(scipy.r), direction: direction(scipy.r),
    interpretation: scipy.interpretation,
  })
}

// ── T-Tests ───────────────────────────────────────────────────────

export function normalizeOneSampleT(scipy, values, mu0) {
  const base = oneSampleTTestAdapter(values, mu0, 0.05)
  return merge(base, {
    t: scipy.t, df: scipy.df, pValue: scipy.pValue,
    cohensD: scipy.effectSize, ci95: ciArray(scipy.ci95),
    significant: scipy.significant, interpretation: scipy.interpretation,
  })
}

export function normalizePairedT(scipy, before, after) {
  const base = pairedTTestAdapter(before, after)
  return merge(base, {
    t: scipy.t, df: scipy.df, pValue: scipy.pValue, meanDiff: scipy.meanDiff,
    cohensD: scipy.effectSize, ci95: ciArray(scipy.ci95),
    significant: scipy.significant, interpretation: scipy.interpretation,
  })
}

export function normalizeIndependentT(scipy, group1, group2) {
  const base = independentTTestAdapter(group1, group2)
  // Welch's t is a supplementary statistic scipy doesn't return for the
  // equal-variance Student t — keep the adapter's welch object intact.
  return merge(base, {
    meanDiff: scipy.meanDiff, t: scipy.t, df: scipy.df, pValue: scipy.pValue,
    cohensD: scipy.effectSize, ci95: ciArray(scipy.ci95),
    significant: scipy.significant, interpretation: scipy.interpretation,
  })
}

// ── Normality ─────────────────────────────────────────────────────

export function normalizeNormality(scipy, values) {
  const base = normalityAdapter(values, 0.05)
  if (!base || base.error) return { ...(base || {}), backend: SCIPY }
  // scipy always runs Shapiro-Wilk; the JS adapter dispatches Shapiro (n≤50)
  // or Kolmogorov-Smirnov (n>50). Normalize to the Shapiro shape so the
  // displayed statistic (W) and method label match scipy's p-value.
  const out = merge(base, {
    method: 'Shapiro-Wilk',
    W: scipy.W, pValue: scipy.pValue, n: scipy.n,
    isNormal: scipy.isNormal, alpha: scipy.alpha, interpretation: scipy.interpretation,
  })
  delete out.D // drop KS statistic if the adapter took the n>50 branch
  return out
}

// ── ANOVA ─────────────────────────────────────────────────────────

export function normalizeAnova(scipy, groups, groupNames) {
  const base = oneWayANOVAAdapter(groups, groupNames)
  // scipy's postHoc uses Tukey HSD p-values; the adapter's postHoc uses the
  // Studentized range q. Shapes differ, so the omnibus F/η²/p come from scipy
  // and post-hoc stays on the JS adapter (valid Tukey-q approximation).
  return merge(base, {
    F: scipy.F, dfBetween: scipy.dfBetween, dfWithin: scipy.dfWithin,
    pValue: scipy.pValue, significant: scipy.significant,
    etaSquared: scipy.etaSquared, interpretation: scipy.interpretation,
  })
}

export function normalizeTwoWayAnova(scipy, y, a, b, nameA, nameB) {
  const base = twoWayANOVAAdapter({ y, a, b, nameA, nameB })
  if (!base || base.error) return { ...base, backend: SCIPY }

  // scipy returns a flat `effects` array (Type II); the UI wants the full
  // anovaTable. Map scipy's F/df/p/η² onto the adapter's table rows.
  const find = (nm) => scipy.effects.find(e => e.name === nm)
  const eA = find('A') || scipy.effects[0]
  const eB = find('B') || scipy.effects[1]
  const eI = find('A × B') || find('A:B') || scipy.effects[2]

  const overlay = (row, e) => e
    ? { ...row, F: e.F, df: e.df, pValue: e.pValue, significant: e.significant, etaSquared: e.etaSquared }
    : row

  const anovaTable = base.anovaTable.slice()
  if (anovaTable[0]) anovaTable[0] = overlay(anovaTable[0], eA)
  if (anovaTable[1]) anovaTable[1] = overlay(anovaTable[1], eB)
  if (anovaTable[2]) anovaTable[2] = overlay(anovaTable[2], eI)
  if (anovaTable[3] && scipy.residuals) {
    anovaTable[3] = { ...anovaTable[3], df: scipy.residuals.df, SS: scipy.residuals.ss, MS: scipy.residuals.ms }
  }

  return merge(base, {
    anovaTable,
    factorA: anovaTable[0], factorB: anovaTable[1],
    interaction: anovaTable[2], residual: anovaTable[3],
    significantA: eA?.significant, significantB: eB?.significant,
    significantInteraction: eI?.significant,
    interpretation: scipy.interpretation,
  })
}

// ── Chi-Square ────────────────────────────────────────────────────

export function normalizeChiSquare(scipy, var1, var2) {
  const base = chiSquareIndependenceAdapter(var1, var2, 0.05)
  const ct = scipy.contingencyTable || {}
  return merge(base, {
    chi2: scipy.chi2, df: scipy.df, pValue: scipy.pValue, N: scipy.n,
    cramersV: scipy.cramersV, effectSizeLabel: scipy.effectSizeLabel,
    isSignificant: scipy.significant,
    observed: ct.observed, expected: ct.expected,
    rowLabels: ct.rows, colLabels: ct.columns,
    interpretation: scipy.interpretation,
  })
}

// ── Validity & Reliability ────────────────────────────────────────

export function normalizeValidity(scipy, matrix) {
  const base = itemValidityAdapter(matrix)
  if (!base || base.error) return { ...base, backend: SCIPY }
  const items = base.items && scipy.items
    ? base.items.map((it, i) => {
        const s = scipy.items[i] || {}
        return {
          ...it,
          r: s.r ?? it.r,
          pValue: s.pValue ?? it.pValue,
          isValid: s.isValid ?? it.isValid,
          verdict: s.verdict ?? it.verdict,
          rSimple: s.rSimple, pSimple: s.pSimple,
        }
      })
    : base.items
  return merge(base, {
    n: scipy.n, k: scipy.k, rCritical: scipy.rCritical, df: scipy.df,
    validCount: scipy.validCount, invalidCount: scipy.invalidCount,
    summary: scipy.summary, items,
  })
}

export function normalizeReliability(scipy, matrix) {
  const base = cronbachAdapter(matrix)
  return merge(base, {
    alpha: scipy.alpha, k: scipy.k, n: scipy.n, interpretation: scipy.interpretation,
  })
}

// ── Regression ────────────────────────────────────────────────────

export function normalizeRegression(scipy, x, y) {
  const base = simpleRegressionAdapter(x, y)
  return merge(base, {
    b0: scipy.intercept, b1: scipy.slope, r: scipy.r, r2: scipy.rSquared,
    se_b1: scipy.se,
    t_b1: scipy.se ? scipy.slope / scipy.se : undefined,
    p_b1: scipy.pValue, significant: scipy.significant, n: scipy.n,
    interpretation: scipy.interpretation,
  })
}

export function normalizeRegressionMultiple(scipy, X, y, predictors) {
  const base = multipleLinearRegressionAdapter(X, y, predictors, 0.05)
  if (!base || base.error) return { ...base, backend: SCIPY }
  const coefficients = base.coefficients && scipy.coefficients
    ? base.coefficients.map((c, i) => {
        const s = scipy.coefficients[i] || {}
        return {
          ...c,
          b: s.coef ?? c.b,
          se: s.se ?? c.se,
          t: s.t ?? c.t,
          p: s.pValue ?? c.p,
        }
      })
    : base.coefficients
  return merge(base, {
    coefficients,
    rSquared: scipy.rSquared, adjustedR2: scipy.adjRSquared,
    F: scipy.F, pF: scipy.pValue, significant: scipy.significant, n: scipy.n,
    interpretation: scipy.interpretation,
  })
}

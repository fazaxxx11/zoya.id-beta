/**
 * Statistical Tests Backend Adapter
 *
 * Priority:
 * 1. Python scipy backend (scipy + statsmodels compute) — primary path.
 *    Requires an authenticated Supabase session (Bearer JWT) on every POST.
 * 2. JS adapter fallback (offline / anon / backend error) — graceful 1-2% path.
 *
 * Scipy results are normalized to the JS adapter shapes (see normalizeScipy.js)
 * so every consumer (ResultCards, export, AI) sees one consistent shape
 * regardless of which backend produced the numbers.
 */

import { supabase } from '../supabase.js'

import {
  mannWhitneyAdapter as mannWhitneyJS,
  wilcoxonAdapter as wilcoxonJS,
  analyzeNGainAdapter as ngainJS,
  pearsonAdapter as pearsonJS,
  spearmanAdapter as spearmanJS,
  oneSampleTTestAdapter as oneSampleTJS,
  pairedTTestAdapter as pairedTJS,
  independentTTestAdapter as independentTJS,
  normalityAdapter as normalityJS,
  oneWayANOVAAdapter as anovaJS,
  twoWayANOVAAdapter as twoWayJS,
  chiSquareIndependenceAdapter as chiSquareJS,
  itemValidityAdapter as validityJS,
  cronbachAdapter as reliabilityJS,
  kruskalWallisAdapter as kruskalJS,
  simpleRegressionAdapter as regressionJS,
  multipleLinearRegressionAdapter as regressionMultipleJS,
} from '../statistics/uiAdapters.js'

import {
  normalizeWilcoxon, normalizeMannWhitney, normalizeNGain,
  normalizePearson, normalizeSpearman,
  normalizeOneSampleT, normalizePairedT, normalizeIndependentT,
  normalizeNormality, normalizeAnova, normalizeTwoWayAnova,
  normalizeChiSquare, normalizeValidity, normalizeReliability,
  normalizeKruskal, normalizeRegression, normalizeRegressionMultiple,
} from './normalizeScipy.js'

const PYTHON_BACKEND_URL = '/api/stats'
const BACKEND_TIMEOUT = 10000 // 10s (cold start can take 5-8s)

/** Tag a JS-adapter result as the fallback origin (matches old behavior). */
const withJsBackend = (r) => ({ ...r, backend: 'javascript', note: 'Backend scipy tidak tersedia' })

/**
 * Eager warm-up: fire a lightweight GET to keep the serverless function warm.
 * Runs once on module load — no user action needed. (GET needs no auth.)
 */
;(async function warmUpBackend() {
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 5000)
    await fetch(PYTHON_BACKEND_URL, { method: 'GET', signal: controller.signal })
  } catch { /* ignore — warm-up is best-effort */ }
})()

/**
 * Check if Python backend is available (health check via GET, no auth required).
 */
let backendCache = null
let lastCheck = 0
const CACHE_TTL = 60000 // 1 minute

async function isPythonBackendAvailable() {
  const now = Date.now()
  if (backendCache !== null && now - lastCheck < CACHE_TTL) {
    return backendCache
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    // Health check via GET (no auth required, no body needed)
    const response = await fetch(PYTHON_BACKEND_URL, {
      method: 'GET',
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    backendCache = response.ok
    lastCheck = now
    return backendCache
  } catch {
    backendCache = false
    lastCheck = now
    return false
  }
}

/**
 * Wait for Python backend to warm up (Vercel cold start).
 * Retries with exponential backoff — total ~15s max.
 * Caller shows loading/buffering UI during this wait naturally.
 */
async function waitForPythonBackend(maxRetries = 6, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    // Force fresh check (ignore cache) on retries
    if (i > 0) {
      backendCache = null
    }
    const available = await isPythonBackendAvailable()
    if (available) return true
    if (i < maxRetries - 1) {
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(1.5, i)))
    }
  }
  return false
}

/**
 * Call the Python scipy backend.
 *
 * Every POST requires `Authorization: Bearer <JWT>` (verified against Supabase
 * in api/stats.py). Without an active session we short-circuit and let the JS
 * fallback run — anon users never block on a 401 round-trip.
 *
 * Returns the raw scipy result (shaped per api/stats.py compute_*). The caller
 * normalizes it to the UI shape via normalizeScipy.js.
 */
async function callPythonBackend(method, data, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('scipy backend requires auth — no active session')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT)

  try {
    const response = await fetch(PYTHON_BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + session.access_token,
      },
      body: JSON.stringify({ method, data, options }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || 'Backend error')
    }

    // scipy compute_* signal invalid input by returning { error } inside a
    // 200/success:true envelope — surface it so the JS fallback can run.
    if (result.result && result.result.error) {
      throw new Error(result.result.error)
    }

    return result.result
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// ── Non-parametric ────────────────────────────────────────────────

/**
 * Wilcoxon Signed-Rank Test (paired samples)
 */
export async function wilcoxonSignedRank(before, after, alpha = 0.05) {
  if (await waitForPythonBackend()) {
    try {
      const scipy = await callPythonBackend('wilcoxon', { before, after }, { alpha })
      return normalizeWilcoxon(scipy, before, after, alpha)
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  return withJsBackend(wilcoxonJS(before, after, alpha))
}

/**
 * Mann-Whitney U Test (independent samples)
 */
export async function mannWhitneyU(group1, group2, alpha = 0.05) {
  if (await waitForPythonBackend()) {
    try {
      const scipy = await callPythonBackend('mannwhitney', { group1, group2 }, { alpha })
      return normalizeMannWhitney(scipy, group1, group2, alpha)
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  return withJsBackend(mannWhitneyJS(group1, group2, alpha))
}

/**
 * N-gain Analysis (Hake, 1998)
 */
export async function analyzeNGain({ pre, post, maxScore = 100, names = [] }) {
  if (await waitForPythonBackend()) {
    try {
      const scipy = await callPythonBackend('ngain', { pre, post }, { maxScore })
      return normalizeNGain(scipy, { pre, post, maxScore, names })
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  return withJsBackend(ngainJS({ pre, post, maxScore, names }))
}

// ── Correlation ───────────────────────────────────────────────────

export async function pearsonCorrelationBackend(x, y) {
  if (await waitForPythonBackend()) {
    try {
      const scipy = await callPythonBackend('correlation', { type: 'pearson', x, y })
      return normalizePearson(scipy, x, y)
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  return withJsBackend(pearsonJS(x, y))
}

export async function spearmanCorrelationBackend(x, y) {
  if (await waitForPythonBackend()) {
    try {
      const scipy = await callPythonBackend('correlation', { type: 'spearman', x, y })
      return normalizeSpearman(scipy, x, y)
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  return withJsBackend(spearmanJS(x, y))
}

// ── T-Tests ───────────────────────────────────────────────────────

export async function oneSampleTTestBackend(values, mu0) {
  if (await waitForPythonBackend()) {
    try {
      // scipy reads data['sample'] / data['popmean'] (not values/mu0)
      const scipy = await callPythonBackend('ttest', { mode: 'oneSample', sample: values, popmean: mu0 }, { alpha: 0.05 })
      return normalizeOneSampleT(scipy, values, mu0)
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  return withJsBackend(oneSampleTJS(values, mu0, 0.05))
}

export async function pairedTTestBackend(before, after) {
  if (await waitForPythonBackend()) {
    try {
      const scipy = await callPythonBackend('ttest', { mode: 'paired', before, after }, { alpha: 0.05 })
      return normalizePairedT(scipy, before, after)
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  return withJsBackend(pairedTJS(before, after))
}

export async function independentTTestBackend(group1, group2) {
  if (await waitForPythonBackend()) {
    try {
      const scipy = await callPythonBackend('ttest', { mode: 'independent', group1, group2 }, { alpha: 0.05 })
      return normalizeIndependentT(scipy, group1, group2)
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  return withJsBackend(independentTJS(group1, group2))
}

// ── Normality ─────────────────────────────────────────────────────

export async function normalityBackend(values) {
  if (await waitForPythonBackend()) {
    try {
      const scipy = await callPythonBackend('normality', { values }, { alpha: 0.05 })
      return normalizeNormality(scipy, values)
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  return withJsBackend(normalityJS(values, 0.05))
}

// ── ANOVA ─────────────────────────────────────────────────────────

export async function anOVABackend(groups, groupNames) {
  if (await waitForPythonBackend()) {
    try {
      const scipy = await callPythonBackend('anova', { groups, groupNames }, { alpha: 0.05 })
      return normalizeAnova(scipy, groups, groupNames)
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  return withJsBackend(anovaJS(groups, groupNames))
}

export async function twoWayANOVABackend(y, a, b, nameA, nameB) {
  if (await waitForPythonBackend()) {
    try {
      const scipy = await callPythonBackend('twowayanova', { y, factorA: a, factorB: b }, { alpha: 0.05 })
      return normalizeTwoWayAnova(scipy, y, a, b, nameA, nameB)
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  return withJsBackend(twoWayJS({ y, a, b, nameA, nameB }))
}

// ── Chi-Square ────────────────────────────────────────────────────

export async function chiSquareBackend(var1, var2) {
  if (await waitForPythonBackend()) {
    try {
      const scipy = await callPythonBackend('chisquare', { var1, var2 }, { alpha: 0.05 })
      return normalizeChiSquare(scipy, var1, var2)
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  return withJsBackend(chiSquareJS(var1, var2, 0.05))
}

// ── Validity & Reliability ────────────────────────────────────────

export async function validityBackend(matrix) {
  if (await waitForPythonBackend()) {
    try {
      const scipy = await callPythonBackend('validity', { matrix }, { alpha: 0.05 })
      return normalizeValidity(scipy, matrix)
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  return withJsBackend(validityJS(matrix))
}

export async function reliabilityBackend(matrix) {
  if (await waitForPythonBackend()) {
    try {
      const scipy = await callPythonBackend('reliability', { matrix }, { alpha: 0.05 })
      return normalizeReliability(scipy, matrix)
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  return withJsBackend(reliabilityJS(matrix))
}

// ── Kruskal-Wallis ────────────────────────────────────────────────

export async function kruskalWallisBackend(groups, groupNames) {
  if (await waitForPythonBackend()) {
    try {
      const scipy = await callPythonBackend('kruskal', { groups, groupNames }, { alpha: 0.05 })
      return normalizeKruskal(scipy, groups, groupNames, 0.05)
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  return withJsBackend(kruskalJS(groups, groupNames, 0.05))
}

// ── Regression ────────────────────────────────────────────────────

export async function regressionBackend(x, y) {
  if (await waitForPythonBackend()) {
    try {
      const scipy = await callPythonBackend('regression', { x, y }, { alpha: 0.05 })
      return normalizeRegression(scipy, x, y)
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  return withJsBackend(regressionJS(x, y))
}

export async function regressionMultipleBackend(X, y, predictors) {
  if (await waitForPythonBackend()) {
    try {
      const scipy = await callPythonBackend('regression_multiple', { X, y, predictors }, { alpha: 0.05 })
      return normalizeRegressionMultiple(scipy, X, y, predictors)
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  return withJsBackend(regressionMultipleJS(X, y, predictors, 0.05))
}

/**
 * Get backend status (for status UI / diagnostics).
 */
export async function getBackendStatus() {
  const available = await waitForPythonBackend()
  return {
    pythonAvailable: available,
    backend: available ? 'scipy' : 'javascript',
    recommendation: available ? 'Using scipy (scipy + statsmodels)' : 'Using JS fallback'
  }
}

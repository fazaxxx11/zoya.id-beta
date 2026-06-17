/**
 * Statistical Tests Backend Adapter
 *
 * Priority:
 * 1. Python scipy backend (100% SPSS accurate)
 * 2. JS fallback (offline mode)
 */

import { mannWhitneyU as mannWhitneyJS, wilcoxonSignedRank as wilcoxonJS } from './nonparametric.js'
import { analyzeNGain as ngainJS } from './ngain.js'

const PYTHON_BACKEND_URL = '/api/stats'
const BACKEND_TIMEOUT = 10000 // 10s (cold start can take 5-8s)

/**
 * Eager warm-up: fire a lightweight GET to keep the serverless function warm.
 * Runs once on module load — no user action needed.
 */
;(async function warmUpBackend() {
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 5000)
    await fetch(PYTHON_BACKEND_URL, { method: 'GET', signal: controller.signal })
  } catch { /* ignore — warm-up is best-effort */ }
})()

/**
 * Check if Python backend is available
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
 * Call Python backend
 */
async function callPythonBackend(method, data, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT)

  try {
    const response = await fetch(PYTHON_BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    return { ...result.result, backend: 'scipy' }
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Wilcoxon Signed-Rank Test (paired samples)
 *
 * @param {number[]} before - Pre-test scores
 * @param {number[]} after - Post-test scores
 * @param {number} alpha - Significance level (default 0.05)
 * @returns {Promise<Object>}
 */
export async function wilcoxonSignedRank(before, after, alpha = 0.05) {
  const usePython = await isPythonBackendAvailable()

  if (usePython) {
    try {
      return await callPythonBackend('wilcoxon', { before, after }, { alpha })
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }

  // Fallback to JS
  const result = wilcoxonJS(before, after, alpha)
  return { ...result, backend: 'javascript' }
}

/**
 * Mann-Whitney U Test (independent samples)
 *
 * @param {number[]} group1
 * @param {number[]} group2
 * @param {number} alpha
 * @returns {Promise<Object>}
 */
export async function mannWhitneyU(group1, group2, alpha = 0.05) {
  const usePython = await isPythonBackendAvailable()

  if (usePython) {
    try {
      return await callPythonBackend('mannwhitney', { group1, group2 }, { alpha })
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }

  // Fallback to JS
  const result = mannWhitneyJS(group1, group2, alpha)
  return { ...result, backend: 'javascript' }
}

/**
 * N-gain Analysis
 *
 * @param {Object} params
 * @param {number[]} params.pre - Pre-test scores
 * @param {number[]} params.post - Post-test scores
 * @param {number} params.maxScore - Maximum score (default 100)
 * @returns {Promise<Object>}
 */
export async function analyzeNGain({ pre, post, maxScore = 100, names = [] }) {
  const usePython = await isPythonBackendAvailable()

  if (usePython) {
    try {
      return await callPythonBackend('ngain', { pre, post }, { maxScore })
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }

  // Fallback to JS
  const result = ngainJS({ pre, post, maxScore, names })
  return { ...result, backend: 'javascript' }
}

export async function pearsonCorrelationBackend(x, y) {
  const usePython = await isPythonBackendAvailable()
  if (usePython) {
    try {
      return await callPythonBackend('correlation', { type: 'pearson', x, y })
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  throw new Error('Backend unavailable')
}

export async function spearmanCorrelationBackend(x, y) {
  const usePython = await isPythonBackendAvailable()
  if (usePython) {
    try {
      return await callPythonBackend('correlation', { type: 'spearman', x, y })
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  throw new Error('Backend unavailable')
}

export async function oneSampleTTestBackend(values, mu0) {
  const usePython = await isPythonBackendAvailable()
  if (usePython) {
    try {
      return await callPythonBackend('ttest', { mode: 'oneSample', values, mu0 })
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  throw new Error('Backend unavailable')
}

export async function pairedTTestBackend(before, after) {
  const usePython = await isPythonBackendAvailable()
  if (usePython) {
    try {
      return await callPythonBackend('ttest', { mode: 'paired', before, after })
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  throw new Error('Backend unavailable')
}

export async function independentTTestBackend(group1, group2) {
  const usePython = await isPythonBackendAvailable()
  if (usePython) {
    try {
      return await callPythonBackend('ttest', { mode: 'independent', group1, group2 })
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  throw new Error('Backend unavailable')
}

export async function normalityBackend(values) {
  const usePython = await isPythonBackendAvailable()
  if (usePython) {
    try {
      return await callPythonBackend('normality', { values })
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  throw new Error('Backend unavailable')
}

export async function anOVABackend(groups, groupNames) {
  const usePython = await isPythonBackendAvailable()
  if (usePython) {
    try {
      return await callPythonBackend('anova', { groups, groupNames })
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  throw new Error('Backend unavailable')
}

export async function twoWayANOVABackend(y, a, b, nameA, nameB) {
  const usePython = await isPythonBackendAvailable()
  if (usePython) {
    try {
      return await callPythonBackend('twowayanova', { y, factorA: a, factorB: b })
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  throw new Error('Backend unavailable')
}

export async function chiSquareBackend(var1, var2) {
  const usePython = await isPythonBackendAvailable()
  if (usePython) {
    try {
      return await callPythonBackend('chisquare', { var1, var2 })
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  throw new Error('Backend unavailable')
}

export async function validityBackend(matrix) {
  const usePython = await isPythonBackendAvailable()
  if (usePython) {
    try {
      return await callPythonBackend('validity', { matrix })
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  throw new Error('Backend unavailable')
}

export async function reliabilityBackend(matrix) {
  const usePython = await isPythonBackendAvailable()
  if (usePython) {
    try {
      return await callPythonBackend('reliability', { matrix })
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  throw new Error('Backend unavailable')
}

export async function kruskalWallisBackend(groups, groupNames) {
  const usePython = await isPythonBackendAvailable()
  if (usePython) {
    try {
      return await callPythonBackend('kruskal', { groups, groupNames })
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  throw new Error('Backend unavailable')
}

export async function regressionBackend(x, y) {
  const usePython = await isPythonBackendAvailable()
  if (usePython) {
    try {
      return await callPythonBackend('regression', { x, y })
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  throw new Error('Backend unavailable')
}

export async function regressionMultipleBackend(X, y, predictors) {
  const usePython = await isPythonBackendAvailable()
  if (usePython) {
    try {
      return await callPythonBackend('regression_multiple', { X, y, predictors })
    } catch (error) {
      console.warn('Python backend failed, falling back to JS:', error)
    }
  }
  throw new Error('Backend unavailable')
}

/**
 * Get backend status
 */
export async function getBackendStatus() {
  const available = await isPythonBackendAvailable()
  return {
    pythonAvailable: available,
    backend: available ? 'scipy' : 'javascript',
    recommendation: available ? 'Using scipy (100% SPSS accurate)' : 'Using JS fallback'
  }
}

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
const BACKEND_TIMEOUT = 5000 // 5s

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
    const timeoutId = setTimeout(() => controller.abort(), 1000)

    const response = await fetch(PYTHON_BACKEND_URL, {
      method: 'OPTIONS',
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

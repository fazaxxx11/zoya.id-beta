/**
 * statsWorkerClient.js — Clean client wrapper for statsWorker.js
 *
 * Each function creates a new Worker, sends data, waits for the result,
 * and terminates the worker. This keeps the interface simple and
 * avoids stale-state issues with long-lived workers.
 */

function createWorkerTask(type, data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./statsWorker.js', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (e) => {
      worker.terminate()
      if (e.data.success) {
        resolve(e.data.result)
      } else {
        reject(new Error(e.data.error || 'Worker computation failed'))
      }
    }

    worker.onerror = (err) => {
      worker.terminate()
      reject(new Error(err.message || 'Worker error'))
    }

    worker.postMessage({ type, data })
  })
}

/**
 * Run Exploratory Factor Analysis in a Web Worker.
 *
 * @param {object} params
 * @param {number[][]} params.X - data matrix [n × p]
 * @param {string[]} [params.itemNames]
 * @param {number|null} [params.nFactors]
 * @param {boolean} [params.rotate=true]
 * @returns {Promise<object>} EFA result
 */
export function runEFA({ X, itemNames, nFactors, rotate }) {
  return createWorkerTask('efa', { X, itemNames, nFactors, rotate })
}

/**
 * Run Binary Logistic Regression + derived metrics in a Web Worker.
 *
 * @param {object} params
 * @param {number[][]} params.X - predictor matrix
 * @param {number[]} params.y - binary outcome (0/1)
 * @param {string[]} [params.predictorNames]
 * @param {number} [params.threshold=0.5]
 * @returns {Promise<{ fit, cm, roc, hl }>}
 */
export function runLogistic({ X, y, predictorNames, threshold = 0.5 }) {
  return createWorkerTask('logistic', { X, y, predictorNames, threshold })
}

/**
 * Run Item Analysis in a Web Worker.
 *
 * @param {object} params - same shape as analyzeItems input
 * @returns {Promise<object>} item analysis result
 */
export function runItemAnalysis(params) {
  return createWorkerTask('itemAnalysis', params)
}

/**
 * statsWorker.js — Web Worker for heavy statistical computations
 *
 * Handles: EFA, Logistic Regression, Item Analysis
 * Runs off the main thread to keep the UI responsive.
 *
 * Message protocol:
 *   send: { type: 'efa' | 'logistic' | 'itemAnalysis', data: {...} }
 *   recv: { success: true, result } | { success: false, error: string }
 */

import { efa } from './efa'
import {
  fitLogistic,
  classificationTable,
  rocAUC,
  hosmerLemeshow,
} from './logisticRegression'
import { analyzeItems, scoreResponses } from './itemAnalysis'

self.onmessage = function (e) {
  const { type, data } = e.data
  try {
    let result
    switch (type) {
      case 'efa':
        result = efa(data.X, {
          itemNames: data.itemNames,
          nFactors: data.nFactors,
          rotate: data.rotate,
        })
        break

      case 'logistic': {
        const fit = fitLogistic(data.X, data.y, {
          predictorNames: data.predictorNames,
        })
        const cm = classificationTable(
          fit.yObserved,
          fit.predicted,
          data.threshold
        )
        const roc = rocAUC(fit.yObserved, fit.predicted)
        const hl = hosmerLemeshow(fit.yObserved, fit.predicted, 10)
        result = { fit, cm, roc, hl }
        break
      }

      case 'itemAnalysis': {
        if (data.mode === 'responses') {
          const scored = scoreResponses(data.responseMatrix, data.answerKey)
          result = analyzeItems({
            scoredMatrix: scored,
            responseMatrix: data.responseMatrix,
            answerKey: data.answerKey,
            options: data.options,
            fraction: data.fraction,
          })
        } else {
          result = analyzeItems({
            scoredMatrix: data.scoredMatrix,
            fraction: data.fraction,
          })
        }
        break
      }

      default:
        throw new Error('Unknown worker type: ' + type)
    }

    self.postMessage({ success: true, result })
  } catch (err) {
    self.postMessage({ success: false, error: err.message || String(err) })
  }
}

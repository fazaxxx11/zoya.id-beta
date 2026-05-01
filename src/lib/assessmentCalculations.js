/**
 * Assessment Calculations
 * 
 * Validasi Instrumen: CVR, CVI
 * Rubric Scoring: Weighted scores
 * Inter-rater reliability
 */

/**
 * Calculate Content Validity Ratio (CVR)
 * Formula: CVR = (Ne - N/2) / (N/2)
 * Where:
 *   Ne = number of experts who rated item as "essential"
 *   N = total number of experts
 * 
 * Threshold (Lawshe):
 *   N=5: CVR >= 0.99
 *   N=6: CVR >= 0.85
 *   N=7: CVR >= 0.78
 *   N=8: CVR >= 0.72
 *   N=9: CVR >= 0.67
 *   N=10: CVR >= 0.62
 *   N=11: CVR >= 0.59
 *   N=12+: CVR >= 0.56
 *   N=15: CVR >= 0.49
 *   N=20: CVR >= 0.42
 *   N=25: CVR >= 0.37
 *   N=30+: CVR >= 0.33
 */
export function calculateCVR(responses, N = null) {
  // responses: array of expert responses (-1, 0, 1)
  // -1 = not necessary, 0 = useful but not essential, 1 = essential
  const numExperts = N || responses.length
  const ne = responses.filter(r => r === 1).length
  
  const cvr = numExperts > 0 ? (ne - numExperts / 2) / (numExperts / 2) : 0
  
  // Get threshold based on number of experts
  const threshold = getCVRThreshold(numExperts)
  const isValid = cvr >= threshold
  
  return {
    cvr: parseFloat(cvr.toFixed(3)),
    ne,
    n: numExperts,
    threshold,
    isValid,
    interpretation: isValid 
      ? `Item LAYAK (CVR ${cvr.toFixed(2)} >= ${threshold})`
      : `Item GUGUR (CVR ${cvr.toFixed(2)} < ${threshold})`
  }
}

function getCVRThreshold(N) {
  const thresholds = {
    5: 0.99, 6: 0.85, 7: 0.78, 8: 0.72, 9: 0.67,
    10: 0.62, 11: 0.59, 12: 0.56, 13: 0.54, 14: 0.51,
    15: 0.49, 16: 0.47, 17: 0.45, 18: 0.44, 19: 0.43,
    20: 0.42, 21: 0.40, 22: 0.39, 23: 0.38, 24: 0.37, 25: 0.37
  }
  
  if (N >= 30) return 0.33
  return thresholds[N] || 0.33
}

/**
 * Calculate Content Validity Index (CVI)
 * Average of all items' CVR
 */
export function calculateCVI(cvrResults) {
  const validCVRs = cvrResults.map(r => r.cvr).filter(c => !isNaN(c))
  const cvi = validCVRs.length > 0 
    ? validCVRs.reduce((a, b) => a + b, 0) / validCVRs.length 
    : 0
  
  const itemCount = cvrResults.length
  const validItems = cvrResults.filter(r => r.isValid).length
  
  return {
    cvi: parseFloat(cvi.toFixed(3)),
    itemCount,
    validItems,
    itemValidityRate: parseFloat((validItems / itemCount).toFixed(2)),
    interpretation: cvi >= 0.80 
      ? 'Instrument EXCELLENT (CVI >= 0.80)'
      : cvi >= 0.70 
        ? 'Instrument GOOD (CVI >= 0.70)'
        : cvi >= 0.60 
          ? 'Instrument FAIR (CVI >= 0.60)'
          : 'Instrument POOR - perlu revisi'
  }
}

/**
 * Calculate rubric-based score
 * Formula: Total = Σ (score × weight) / Σ weights
 */
export function calculateRubricScore(dimensions, scores) {
  // dimensions: array of { id, name, weight }
  // scores: object { dimensionId: score (1-5) }
  
  let totalWeight = 0
  let weightedSum = 0
  const dimensionScores = []
  
  for (const dim of dimensions) {
    const score = scores[dim.id] || 0
    const weightedScore = score * dim.weight
    weightedSum += weightedScore
    totalWeight += dim.weight
    
    dimensionScores.push({
      id: dim.id,
      name: dim.name,
      weight: dim.weight,
      score,
      weightedScore
    })
  }
  
  const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 0
  
  return {
    finalScore: parseFloat(finalScore.toFixed(2)),
    maxScore: 5,
    percentage: parseFloat((finalScore / 5 * 100).toFixed(1)),
    dimensionScores,
    interpretation: finalScore >= 4.5 
      ? 'Sangat Baik'
      : finalScore >= 3.5 
        ? 'Baik'
        : finalScore >= 2.5 
          ? 'Cukup'
          : finalScore >= 1.5 
            ? 'Kurang'
            : 'Buruk'
  }
}

/**
 * Multi-rater aggregation
 * Calculate mean, standard deviation, and consensus
 */
export function aggregateMultiRater(dimensions, raterScores) {
  // raterScores: array of objects { raterId, scores: { dimId: score } }
  const results = []
  
  for (const dim of dimensions) {
    const scores = raterScores.map(r => r.scores[dim.id]).filter(s => s !== undefined)
    
    if (scores.length === 0) continue
    
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
    const stdDev = Math.sqrt(variance)
    
    results.push({
      id: dim.id,
      name: dim.name,
      mean: parseFloat(mean.toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2)),
      min: Math.min(...scores),
      max: Math.max(...scores),
      raterCount: scores.length
    })
  }
  
  return results
}

/**
 * Inter-Rater Reliability - Simple calculation
 * For more accurate: use Cohen's Kappa or ICC
 */
export function calculateInterRaterReliability(dimensions, raterScores) {
  // Return simple agreement metrics
  const results = []
  
  for (const dim of dimensions) {
    const scores = raterScores.map(r => r.scores[dim.id]).filter(s => s !== undefined)
    
    if (scores.length < 2) continue
    
    // Count agreements
    let agreements = 0
    for (let i = 0; i < scores.length; i++) {
      for (let j = i + 1; j < scores.length; j++) {
        if (scores[i] === scores[j]) agreements++
      }
    }
    
    const totalPairs = (scores.length * (scores.length - 1)) / 2
    const agreementRate = totalPairs > 0 ? agreements / totalPairs : 0
    
    results.push({
      id: dim.id,
      name: dim.name,
      agreementRate: parseFloat(agreementRate.toFixed(2)),
      consensus: agreementRate >= 0.8 ? 'Tinggi' : agreementRate >= 0.5 ? 'Sedang' : 'Rendah'
    })
  }
  
  return results
}

/**
 * Peer Review Recommendation based on total score
 */
export function calculatePeerReviewRecommendation(totalScore, dimensions) {
  const maxPossible = dimensions.reduce((sum, d) => sum + d.weight * 5, 0)
  const percentage = (totalScore / maxPossible) * 100
  
  let recommendation
  if (percentage >= 80) {
    recommendation = PEER_REVIEW_RECOMMENDATIONS.find(r => r.id === 'accept')
  } else if (percentage >= 65) {
    recommendation = PEER_REVIEW_RECOMMENDATIONS.find(r => r.id === 'minor_revision')
  } else if (percentage >= 50) {
    recommendation = PEER_REVIEW_RECOMMENDATIONS.find(r => r.id === 'major_revision')
  } else {
    recommendation = PEER_REVIEW_RECOMMENDATIONS.find(r => r.id === 'reject')
  }
  
  return {
    ...recommendation,
    totalScore,
    maxPossible,
    percentage: parseFloat(percentage.toFixed(1))
  }
}

// Import constants
const PEER_REVIEW_RECOMMENDATIONS = [
  { id: 'accept', label: 'Accept', color: 'green', description: 'Artikel dapat diterima tanpa revisi' },
  { id: 'minor_revision', label: 'Minor Revision', color: 'blue', description: 'Revisi kecil diperlukan' },
  { id: 'major_revision', label: 'Major Revision', color: 'orange', description: 'Revisi besar diperlukan' },
  { id: 'reject', label: 'Reject', color: 'red', description: 'Artikel tidak dapat diterima' }
]

export default {
  calculateCVR,
  calculateCVI,
  calculateRubricScore,
  aggregateMultiRater,
  calculateInterRaterReliability,
  calculatePeerReviewRecommendation
}
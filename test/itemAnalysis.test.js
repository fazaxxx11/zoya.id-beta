// Item Analysis unit tests
// =========================
// Validates difficulty (P), discrimination (D), point-biserial (r_pb),
// KR-20/KR-21, distractor analysis, and overall analyzeItems pipeline
// using textbook examples (Crocker & Algina, Ebel & Frisbie, Allen & Yen).

import { describe, it, expect } from 'vitest'
import {
  difficultyIndex, categorizeDifficulty,
  discriminationIndex, categorizeDiscrimination,
  pointBiserial, pointBiserialCorrected,
  kr20, kr21, categorizeReliability,
  distractorAnalysis,
  analyzeItems, decisionForItem, scoreResponses,
} from '../src/lib/itemAnalysis.js'

describe('difficultyIndex (P)', () => {
  it('all correct → P=1.0', () => {
    expect(difficultyIndex([1,1,1,1,1])).toBe(1)
  })
  it('all wrong → P=0', () => {
    expect(difficultyIndex([0,0,0,0])).toBe(0)
  })
  it('half correct → P=0.5', () => {
    expect(difficultyIndex([1,0,1,0])).toBe(0.5)
  })
  it('returns null for empty input', () => {
    expect(difficultyIndex([])).toBeNull()
  })
})

describe('categorizeDifficulty', () => {
  it('classifies into sukar / sedang / mudah', () => {
    expect(categorizeDifficulty(0.10)).toBe('sukar')
    expect(categorizeDifficulty(0.29)).toBe('sukar')
    expect(categorizeDifficulty(0.50)).toBe('sedang')
    expect(categorizeDifficulty(0.70)).toBe('sedang')
    expect(categorizeDifficulty(0.71)).toBe('mudah')
    expect(categorizeDifficulty(1.0)).toBe('mudah')
  })
})

describe('discriminationIndex (D)', () => {
  it('perfect discriminator: upper all correct, lower all wrong', () => {
    // 10 students, scores: top half all correct on item, bottom half all wrong
    const item   = [1,1,1,0,0,0,0,0,0,0]
    const totals = [10,9,8,7,6,5,4,3,2,1]
    // 27% of 10 = 2 (Math.floor)
    // upper indices (sorted by totals desc): 0,1 → both 1 → 2 correct
    // lower indices: 8,9 → both 0 → 0 correct
    // D = (2-0)/2 = 1.0
    expect(discriminationIndex(item, totals)).toBeCloseTo(1.0, 3)
  })

  it('zero discrimination: same correct rate top vs bottom', () => {
    const item   = [1,0,1,0,1,0,1,0,1,0]
    const totals = [10,9,8,7,6,5,4,3,2,1]
    // upper: 0,1 → 1+0=1, lower: 8,9 → 1+0=1, D=0
    expect(discriminationIndex(item, totals)).toBe(0)
  })

  it('negative discrimination (problem item): lower scores correct more', () => {
    const item   = [0,0,1,1,1,1,1,1,1,1]
    const totals = [10,9,8,7,6,5,4,3,2,1]
    // upper (idx 0,1): both 0 → 0
    // lower (idx 8,9): both 1 → 2
    // D = (0-2)/2 = -1.0
    expect(discriminationIndex(item, totals)).toBeCloseTo(-1.0, 3)
  })

  it('returns null when n < 4', () => {
    expect(discriminationIndex([1,0,1], [3,2,1])).toBeNull()
  })
})

describe('categorizeDiscrimination', () => {
  it('classifies per Ebel-Frisbie thresholds', () => {
    expect(categorizeDiscrimination(0.10)).toBe('jelek')
    expect(categorizeDiscrimination(0.20)).toBe('cukup')
    expect(categorizeDiscrimination(0.39)).toBe('cukup')
    expect(categorizeDiscrimination(0.40)).toBe('baik')
    expect(categorizeDiscrimination(0.70)).toBe('baik')
    expect(categorizeDiscrimination(0.71)).toBe('sangat_baik')
  })
})

describe('pointBiserial', () => {
  it('high correlation when correct-answerers have high totals', () => {
    // 6 students. Item: 1=correct, 0=wrong
    // Total scores aligned: correct → high totals, wrong → low totals
    const item   = [1,1,1,0,0,0]
    const totals = [9,8,7,3,2,1]
    const r = pointBiserial(item, totals)
    expect(r).toBeGreaterThan(0.9)
  })

  it('returns 0 (or near 0) when uncorrelated', () => {
    const item   = [1,0,1,0,1,0]
    const totals = [5,5,5,5,5,5]
    // SD = 0 → null (degenerate)
    expect(pointBiserial(item, totals)).toBeNull()
  })

  it('negative correlation', () => {
    const item   = [0,0,0,1,1,1]
    const totals = [9,8,7,3,2,1]
    const r = pointBiserial(item, totals)
    expect(r).toBeLessThan(-0.9)
  })

  it('returns null when all answer same', () => {
    expect(pointBiserial([1,1,1,1], [5,4,3,2])).toBeNull()
    expect(pointBiserial([0,0,0,0], [5,4,3,2])).toBeNull()
  })
})

describe('pointBiserialCorrected', () => {
  it('corrected r is slightly lower than uncorrected (item is part of total)', () => {
    const item   = [1,1,1,0,0,0]
    const totals = [9,8,7,3,2,1]
    const raw = pointBiserial(item, totals)
    const corr = pointBiserialCorrected(item, totals)
    expect(corr).toBeLessThan(raw)
    expect(corr).toBeGreaterThan(0.5)  // tetap tinggi
  })
})

describe('kr20', () => {
  it('classic Crocker & Algina example: 5 students × 5 items', () => {
    // Example data from textbook (approx KR-20 around 0.71)
    const matrix = [
      [1,1,1,1,1],  // 5
      [1,1,1,1,0],  // 4
      [1,1,1,0,0],  // 3
      [1,1,0,0,0],  // 2
      [1,0,0,0,0],  // 1
    ]
    const r = kr20(matrix)
    expect(r).toBeGreaterThan(0.7)
    expect(r).toBeLessThan(1.0)
  })

  it('all students same score → KR-20 returns null (var=0)', () => {
    const matrix = [
      [1,1,1],
      [1,1,1],
      [1,1,1],
    ]
    expect(kr20(matrix)).toBeNull()
  })

  it('returns null when k < 2', () => {
    const matrix = [[1],[0],[1]]
    expect(kr20(matrix)).toBeNull()
  })
})

describe('kr21 vs kr20', () => {
  it('KR-21 ≤ KR-20 (under heterogeneous difficulty)', () => {
    // Data dengan tingkat kesukaran berbeda-beda → KR-21 lebih rendah
    const matrix = [
      [1,1,0,0,0],
      [1,1,1,0,0],
      [1,1,1,1,0],
      [1,1,1,1,1],
      [1,0,0,0,0],
      [1,1,0,0,0],
    ]
    const r20 = kr20(matrix)
    const r21 = kr21(matrix)
    expect(r21).toBeLessThanOrEqual(r20 + 1e-9)
  })
})

describe('categorizeReliability', () => {
  it('Guilford classification', () => {
    expect(categorizeReliability(0.95)).toBe('sangat_tinggi')
    expect(categorizeReliability(0.80)).toBe('tinggi')
    expect(categorizeReliability(0.50)).toBe('sedang')
    expect(categorizeReliability(0.30)).toBe('rendah')
  })
})

describe('distractorAnalysis', () => {
  it('identifies key vs distractor and which distractors work', () => {
    // 10 students. Key = 'B'. Options = A,B,C,D
    const responses = ['B','B','B','B','A','C','D','A','D','C']
    const totals    = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
    const result = distractorAnalysis(responses, totals, 'B', ['A','B','C','D'])

    const keyOpt = result.find(r => r.option === 'B')
    expect(keyOpt.isKey).toBe(true)
    expect(keyOpt.total).toBe(4)

    // Distractor A: dipilih siswa idx 4 (skor 6) dan idx 7 (skor 3)
    const distA = result.find(r => r.option === 'A')
    expect(distA.isKey).toBe(false)
    expect(distA.total).toBe(2)
  })

  it('marks "working" distractors (lower > upper, ≥5% chosen)', () => {
    const n = 20
    // 5 atas semuanya pilih key 'B', 5 bawah semuanya pilih 'A' (distraktor)
    const responses = []
    const totals = []
    for (let i = 0; i < n; i++) {
      totals.push(n - i)
      if (i < 5) responses.push('B')        // atas: benar
      else if (i >= 15) responses.push('A') // bawah: pilih distraktor A
      else responses.push('B')
    }
    const result = distractorAnalysis(responses, totals, 'B', ['A','B','C','D'])
    const distA = result.find(r => r.option === 'A')
    expect(distA.working).toBe(true)
    expect(distA.upper).toBe(0)
    expect(distA.lower).toBeGreaterThan(0)
  })
})

describe('decisionForItem', () => {
  it('discrimination < 0.20 → buang', () => {
    expect(decisionForItem(0.5, 0.10)).toBe('buang')
  })
  it('extreme P (terlalu mudah/sukar) → buang', () => {
    expect(decisionForItem(0.96, 0.5)).toBe('buang')
    expect(decisionForItem(0.05, 0.5)).toBe('buang')
  })
  it('moderate D in [0.20, 0.30) → revisi', () => {
    expect(decisionForItem(0.5, 0.25)).toBe('revisi')
  })
  it('good item (P=0.6, D=0.5) → terima', () => {
    expect(decisionForItem(0.6, 0.5)).toBe('terima')
  })
  it('borderline P=0.81 with good D → revisi', () => {
    expect(decisionForItem(0.85, 0.5)).toBe('revisi')
  })
})

describe('scoreResponses', () => {
  it('converts letter responses to 0/1 matrix', () => {
    const resp = [
      ['A','B','C','D'],
      ['B','B','C','D'],
    ]
    const key = ['A','B','C','D']
    const scored = scoreResponses(resp, key)
    expect(scored[0]).toEqual([1,1,1,1])
    expect(scored[1]).toEqual([0,1,1,1])
  })

  it('case-insensitive', () => {
    expect(scoreResponses([['a']], ['A'])[0]).toEqual([1])
    expect(scoreResponses([['  b  ']], ['B'])[0]).toEqual([1])
  })
})

describe('analyzeItems — full pipeline', () => {
  it('computes all metrics + summary for a small test', () => {
    // 10 students × 5 items
    const matrix = [
      [1,1,1,1,1],
      [1,1,1,1,0],
      [1,1,1,0,0],
      [1,1,0,1,0],
      [1,1,0,0,1],
      [1,0,1,0,0],
      [0,1,0,1,0],
      [1,0,0,0,0],
      [0,0,1,0,0],
      [0,0,0,0,0],
    ]
    const result = analyzeItems({ scoredMatrix: matrix })

    expect(result.summary.n).toBe(10)
    expect(result.summary.k).toBe(5)
    expect(result.items).toHaveLength(5)

    result.items.forEach(item => {
      expect(item.p).toBeGreaterThanOrEqual(0)
      expect(item.p).toBeLessThanOrEqual(1)
      expect(['sukar','sedang','mudah']).toContain(item.categoryP)
      expect(['terima','revisi','buang']).toContain(item.decision)
    })

    expect(result.summary.kr20).toBeGreaterThan(0)
    expect(result.summary.kr20).toBeLessThan(1)
  })

  it('includes distractor analysis when responseMatrix + answerKey provided', () => {
    const responses = [
      ['A','B'],
      ['A','B'],
      ['A','C'],
      ['B','B'],
    ]
    const key = ['A','B']
    const scored = scoreResponses(responses, key)
    const result = analyzeItems({
      scoredMatrix: scored,
      responseMatrix: responses,
      answerKey: key,
      options: ['A','B','C','D'],
    })

    expect(result.items[0].distractors).toBeDefined()
    expect(result.items[0].distractors).toHaveLength(4)
    expect(result.items[0].distractors[0].option).toBe('A')
    expect(result.items[0].distractors[0].isKey).toBe(true)
  })

  it('decisions counts add up to k', () => {
    const matrix = [
      [1,1,1,1,1],
      [1,0,1,0,1],
      [0,1,0,1,0],
      [1,1,0,0,1],
      [0,0,1,1,0],
      [1,0,0,1,0],
      [0,1,1,0,1],
      [1,0,1,1,0],
    ]
    const result = analyzeItems({ scoredMatrix: matrix })
    const totalDecisions = Object.values(result.summary.decisions).reduce((s, c) => s + c, 0)
    expect(totalDecisions).toBe(result.summary.k)
  })

  it('throws on empty matrix', () => {
    expect(() => analyzeItems({ scoredMatrix: [] })).toThrow()
  })
})

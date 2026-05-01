// Qualitative Analysis unit tests
// ===============================
// Validates tokenization, word frequency, Cohen's kappa (with textbook
// example), bigrams, and code statistics.

import { describe, it, expect } from 'vitest'
import {
  tokenize, wordFrequency, bigramFrequency,
  cohensKappa, percentAgreement, interpretKappa,
  codeStats, coOccurrence,
} from '../src/lib/qualitative.js'

// ============================================================
// Tokenizer
// ============================================================
describe('tokenize', () => {
  it('lowercases + removes punctuation', () => {
    const tokens = tokenize('Hello, World! This is a TEST.', { removeStopwords: false })
    expect(tokens).toEqual(['hello', 'world', 'this', 'is', 'test'])
  })

  it('removes Indonesian stopwords by default', () => {
    const tokens = tokenize('Saya pergi ke sekolah dengan teman saya')
    expect(tokens).not.toContain('saya')
    expect(tokens).not.toContain('ke')
    expect(tokens).not.toContain('dengan')
    expect(tokens).toContain('pergi')
    expect(tokens).toContain('sekolah')
    expect(tokens).toContain('teman')
  })

  it('removes English stopwords when language en', () => {
    const tokens = tokenize('I am the king of the world', { languages: ['en'] })
    expect(tokens).not.toContain('the')
    expect(tokens).not.toContain('of')
    expect(tokens).toContain('king')
    expect(tokens).toContain('world')
  })

  it('respects minLength', () => {
    const tokens = tokenize('a I bb cc dd', { minLength: 3, removeStopwords: false })
    expect(tokens.every(t => t.length >= 3)).toBe(true)
  })

  it('handles custom stopwords', () => {
    const tokens = tokenize('learning is fun', {
      languages: [],
      customStopwords: ['fun'],
    })
    expect(tokens).not.toContain('fun')
    expect(tokens).toContain('learning')
  })

  it('returns empty for empty/null input', () => {
    expect(tokenize('')).toEqual([])
    expect(tokenize(null)).toEqual([])
  })

  it('preserves Unicode letters (Indonesian è, é, ç tidak lazim tapi OK)', () => {
    const tokens = tokenize('café résumé', { languages: [], minLength: 1 })
    expect(tokens).toContain('café')
    expect(tokens).toContain('résumé')
  })
})

// ============================================================
// Word frequency
// ============================================================
describe('wordFrequency', () => {
  it('counts and sorts descending', () => {
    const text = 'belajar belajar belajar matematika sains sains'
    const result = wordFrequency(text)
    expect(result[0]).toEqual(expect.objectContaining({ word: 'belajar', count: 3 }))
    expect(result[1]).toEqual(expect.objectContaining({ word: 'sains', count: 2 }))
    expect(result[2]).toEqual(expect.objectContaining({ word: 'matematika', count: 1 }))
  })

  it('percent sums to 100', () => {
    const result = wordFrequency('apple banana apple cherry banana apple')
    const sum = result.reduce((s, r) => s + r.percent, 0)
    expect(sum).toBeCloseTo(100, 5)
  })

  it('returns empty for no tokens', () => {
    expect(wordFrequency('')).toEqual([])
  })
})

describe('bigramFrequency', () => {
  it('counts adjacent pairs', () => {
    const text = 'motivasi belajar tinggi motivasi belajar'
    const result = bigramFrequency(text)
    const top = result[0]
    expect(top.bigram).toBe('motivasi belajar')
    expect(top.count).toBe(2)
  })

  it('returns empty when fewer than 2 tokens', () => {
    expect(bigramFrequency('halo')).toEqual([])
  })
})

// ============================================================
// Cohen's Kappa
// ============================================================
describe("cohensKappa", () => {
  it('perfect agreement → kappa = 1', () => {
    const a = ['yes', 'no', 'yes', 'no']
    const b = ['yes', 'no', 'yes', 'no']
    const result = cohensKappa(a, b)
    expect(result.kappa).toBe(1)
    expect(result.observedAgreement).toBe(1)
    expect(result.interpretation).toBe('almost_perfect')
  })

  it('zero kappa when agreement = chance', () => {
    // 50/50 split, agreement matches chance
    const a = ['A','A','A','A','B','B','B','B']
    const b = ['A','A','B','B','A','A','B','B']
    const result = cohensKappa(a, b)
    expect(result.kappa).toBeCloseTo(0, 5)
  })

  it('negative kappa when worse than chance', () => {
    // Systematic disagreement
    const a = ['A', 'A', 'B', 'B']
    const b = ['B', 'B', 'A', 'A']
    const result = cohensKappa(a, b)
    expect(result.kappa).toBeLessThan(0)
  })

  it('classic textbook example (Cohen 1960)', () => {
    // 100 cases: cell (1,1)=20, (1,2)=15, (2,1)=10, (2,2)=55
    // Po = 0.75, marginals: row=[35,65], col=[30,70]
    // Pe = (35*30 + 65*70)/100² = (1050+4550)/10000 = 0.56
    // κ = (0.75 - 0.56)/(1-0.56) = 0.19/0.44 ≈ 0.4318
    const a = []
    const b = []
    for (let i = 0; i < 20; i++) { a.push('Y'); b.push('Y') }
    for (let i = 0; i < 15; i++) { a.push('Y'); b.push('N') }
    for (let i = 0; i < 10; i++) { a.push('N'); b.push('Y') }
    for (let i = 0; i < 55; i++) { a.push('N'); b.push('N') }
    const result = cohensKappa(a, b)
    expect(result.observedAgreement).toBeCloseTo(0.75, 3)
    expect(result.expectedAgreement).toBeCloseTo(0.56, 3)
    expect(result.kappa).toBeCloseTo(0.4318, 3)
    expect(result.interpretation).toBe('moderate')
  })

  it('confusion matrix is correct shape', () => {
    const a = ['x', 'y', 'z', 'x']
    const b = ['x', 'y', 'x', 'z']
    const result = cohensKappa(a, b)
    expect(result.categories).toEqual(['x', 'y', 'z'])
    expect(result.confusionMatrix).toHaveLength(3)
    expect(result.confusionMatrix[0]).toHaveLength(3)
    expect(result.n).toBe(4)
  })

  it('throws on length mismatch', () => {
    expect(() => cohensKappa([1,2,3], [1,2])).toThrow()
  })

  it('throws on empty input', () => {
    expect(() => cohensKappa([], [])).toThrow()
  })
})

describe('interpretKappa', () => {
  it('Landis & Koch thresholds', () => {
    expect(interpretKappa(-0.1)).toBe('poor')
    expect(interpretKappa(0.10)).toBe('slight')
    expect(interpretKappa(0.30)).toBe('fair')
    expect(interpretKappa(0.50)).toBe('moderate')
    expect(interpretKappa(0.70)).toBe('substantial')
    expect(interpretKappa(0.90)).toBe('almost_perfect')
  })
})

describe('percentAgreement', () => {
  it('matches simple ratio', () => {
    expect(percentAgreement(['a','b','c'], ['a','b','d'])).toBeCloseTo(2/3, 5)
  })
  it('returns null on length mismatch', () => {
    expect(percentAgreement(['a'], ['a', 'b'])).toBeNull()
  })
})

// ============================================================
// Code stats / co-occurrence
// ============================================================
describe('codeStats', () => {
  it('counts occurrences and document spread', () => {
    const codes = [
      { id: 'c1', label: 'motivasi' },
      { id: 'c2', label: 'tantangan' },
    ]
    const codings = [
      { id: 'cd1', documentId: 'd1', codeId: 'c1' },
      { id: 'cd2', documentId: 'd1', codeId: 'c1' },
      { id: 'cd3', documentId: 'd2', codeId: 'c1' },
      { id: 'cd4', documentId: 'd1', codeId: 'c2' },
    ]
    const stats = codeStats(codes, codings)
    expect(stats[0].label).toBe('motivasi')
    expect(stats[0].occurrences).toBe(3)
    expect(stats[0].documentCount).toBe(2)
    expect(stats[1].occurrences).toBe(1)
  })
})

describe('coOccurrence', () => {
  it('counts pairs in same document', () => {
    const codes = [
      { id: 'c1', label: 'A' },
      { id: 'c2', label: 'B' },
      { id: 'c3', label: 'C' },
    ]
    const codings = [
      // doc1: A and B co-occur
      { documentId: 'd1', codeId: 'c1' },
      { documentId: 'd1', codeId: 'c2' },
      // doc2: B and C co-occur
      { documentId: 'd2', codeId: 'c2' },
      { documentId: 'd2', codeId: 'c3' },
      // doc3: A only
      { documentId: 'd3', codeId: 'c1' },
    ]
    const { matrix } = coOccurrence(codes, codings)
    // (A,B) should be 1
    expect(matrix[0][1]).toBe(1)
    expect(matrix[1][0]).toBe(1)
    // (B,C) should be 1
    expect(matrix[1][2]).toBe(1)
    // (A,C) should be 0 (never together)
    expect(matrix[0][2]).toBe(0)
    // Diagonal: (A,A) = 2 docs (d1, d3)
    expect(matrix[0][0]).toBe(2)
  })
})

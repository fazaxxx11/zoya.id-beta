// src/lib/ai/__tests__/reportNarrator.test.js
// Unit tests for AI narrative generator
// Part of Azezmen (zoya.id-beta) Phase 10

import { describe, it, expect } from 'vitest'
import { generateNarasi } from '../reportNarrator'

describe('reportNarrator', () => {
  it('should generate descriptive narrative', () => {
    const result = {
      type: 'descriptive',
      stats: [
        {
          column: 'Skor',
          n: 30,
          mean: '75.50',
          median: '76.00',
          mode: '78.00',
          stdDev: '8.20',
          variance: '67.24',
          min: '60.00',
          max: '90.00',
          skewness: '-0.15',
          kurtosis: '2.85'
        }
      ]
    }
    const { title, narasi } = generateNarasi(result)
    expect(title).toContain('Deskriptif')
    expect(narasi).toContain('Skor')
    expect(narasi).toContain('rata-rata')
    expect(narasi.length).toBeGreaterThan(100)
  })
  
  it('should generate normality narrative', () => {
    const result = {
      type: 'normality',
      alpha: 0.05,
      results: [
        { column: 'Skor', W: 0.972, p: 0.623, isNormal: true }
      ]
    }
    const { title, narasi } = generateNarasi(result)
    expect(title).toContain('Normalitas')
    expect(narasi).toContain('Shapiro-Wilk')
    expect(narasi).toContain('normal')
    expect(narasi.length).toBeGreaterThan(100)
  })
  
  it('should generate correlation narrative', () => {
    const result = {
      type: 'correlation',
      x: 'Motivasi',
      y: 'Prestasi',
      r: 0.65,
      p: 0.003,
      alpha: 0.05,
      significant: true
    }
    const { title, narasi } = generateNarasi(result)
    expect(title).toContain('Korelasi')
    expect(narasi).toContain('signifikan')
    expect(narasi).toContain('Motivasi')
    expect(narasi).toContain('Prestasi')
    expect(narasi.length).toBeGreaterThan(100)
  })
  
  it('should generate t-test independent narrative', () => {
    const result = {
      type: 'ttest',
      mode: 'independent',
      outcome: 'Skor',
      grouping: 'Kelas',
      t: 2.45,
      df: 58,
      p: 0.017,
      alpha: 0.05,
      significant: true
    }
    const { title, narasi } = generateNarasi(result)
    expect(title).toContain('t-Test')
    expect(narasi).toContain('signifikan')
    expect(narasi).toContain('H₀ ditolak')
    expect(narasi.length).toBeGreaterThan(100)
  })
  
  it('should generate ANOVA narrative', () => {
    const result = {
      type: 'anova',
      outcome: 'Skor',
      grouping: 'Metode',
      k: 3,
      F: 5.23,
      dfBetween: 2,
      dfWithin: 87,
      p: 0.007,
      alpha: 0.05,
      significant: true
    }
    const { title, narasi } = generateNarasi(result)
    expect(title).toContain('ANOVA')
    expect(narasi).toContain('signifikan')
    expect(narasi).toContain('H₀ ditolak')
    expect(narasi.length).toBeGreaterThan(100)
  })
  
  it('should generate simple regression narrative', () => {
    const result = {
      type: 'regression_simple',
      outcome: 'Y',
      predictors: ['X'],
      F: 12.45,
      pModel: 0.001,
      rSquared: 0.68,
      rSquaredAdj: 0.66,
      alpha: 0.05,
      significant: true
    }
    const { title, narasi } = generateNarasi(result)
    expect(title).toContain('Regresi')
    expect(narasi).toContain('signifikan')
    expect(narasi).toContain('R²')
    expect(narasi.length).toBeGreaterThan(100)
  })
  
  it('should generate chi-square narrative', () => {
    const result = {
      type: 'chisquare',
      var1: 'Jenis Kelamin',
      var2: 'Preferensi',
      chiSquare: 8.72,
      df: 3,
      p: 0.033,
      alpha: 0.05,
      significant: true
    }
    const { title, narasi } = generateNarasi(result)
    expect(title).toContain('Chi-Square')
    expect(narasi).toContain('signifikan')
    expect(narasi).toContain('hubungan')
    expect(narasi.length).toBeGreaterThan(100)
  })
  
  it('should generate Mann-Whitney narrative', () => {
    const result = {
      type: 'mannwhitney',
      outcome: 'Skor',
      grouping: 'Kelompok',
      U: 123.5,
      p: 0.042,
      alpha: 0.05,
      significant: true
    }
    const { title, narasi } = generateNarasi(result)
    expect(title).toContain('Mann-Whitney')
    expect(narasi).toContain('signifikan')
    expect(narasi).toContain('H₀ ditolak')
    expect(narasi.length).toBeGreaterThan(100)
  })
  
  it('should generate Wilcoxon narrative', () => {
    const result = {
      type: 'wilcoxon',
      column1: 'Pre',
      column2: 'Post',
      W: 45.5,
      p: 0.018,
      alpha: 0.05,
      significant: true
    }
    const { title, narasi } = generateNarasi(result)
    expect(title).toContain('Wilcoxon')
    expect(narasi).toContain('signifikan')
    expect(narasi).toContain('H₀ ditolak')
    expect(narasi.length).toBeGreaterThan(100)
  })
  
  it('should generate Kruskal-Wallis narrative', () => {
    const result = {
      type: 'kruskal',
      outcome: 'Skor',
      grouping: 'Kelas',
      H: 10.23,
      df: 2,
      p: 0.006,
      alpha: 0.05,
      significant: true
    }
    const { title, narasi } = generateNarasi(result)
    expect(title).toContain('Kruskal-Wallis')
    expect(narasi).toContain('signifikan')
    expect(narasi).toContain('H₀ ditolak')
    expect(narasi.length).toBeGreaterThan(100)
  })
  
  it('should generate validity narrative', () => {
    const result = {
      type: 'validity',
      alpha: 0.05,
      rTable: 0.361,
      items: [
        { item: 'Item1', r: 0.523, isValid: true },
        { item: 'Item2', r: 0.687, isValid: true },
        { item: 'Item3', r: 0.298, isValid: false }
      ]
    }
    const { title, narasi } = generateNarasi(result)
    expect(title).toContain('Validitas')
    expect(narasi).toContain('valid')
    expect(narasi).toContain('item')
    expect(narasi.length).toBeGreaterThan(100)
  })
  
  it('should generate reliability narrative', () => {
    const result = {
      type: 'reliability',
      alpha: 0.857,
      items: [
        { item: 'Item1' },
        { item: 'Item2' },
        { item: 'Item3' }
      ]
    }
    const { title, narasi } = generateNarasi(result)
    expect(title).toContain('Reliabilitas')
    expect(narasi).toContain('Cronbach')
    expect(narasi).toContain('reliabel')
    expect(narasi.length).toBeGreaterThan(100)
  })
  
  it('should generate N-Gain narrative', () => {
    const result = {
      type: 'ngain',
      column1: 'Pre',
      column2: 'Post',
      maxScore: 100,
      nGain: 0.65
    }
    const { title, narasi } = generateNarasi(result)
    expect(title).toContain('N-Gain')
    expect(narasi).toContain('efektif')
    expect(narasi).toContain('kategori')
    expect(narasi.length).toBeGreaterThan(100)
  })
  
  it('should handle multiple regression', () => {
    const result = {
      type: 'regression_multiple',
      outcome: 'Y',
      predictors: ['X1', 'X2', 'X3'],
      F: 18.52,
      pModel: 0.000,
      rSquared: 0.75,
      rSquaredAdj: 0.72,
      alpha: 0.05,
      significant: true
    }
    const { title, narasi } = generateNarasi(result)
    expect(title).toContain('Berganda')
    expect(narasi).toContain('signifikan')
    expect(narasi.length).toBeGreaterThan(100)
  })
  
  it('should handle non-significant result', () => {
    const result = {
      type: 'correlation',
      x: 'A',
      y: 'B',
      r: 0.12,
      p: 0.523,
      alpha: 0.05,
      significant: false
    }
    const { narasi } = generateNarasi(result)
    expect(narasi).toContain('tidak')
    expect(narasi).toContain('signifikan')
  })
  
  it('should return fallback for unknown test type', () => {
    const result = {
      type: 'unknown_test',
      p: 0.05,
      significant: true
    }
    const { title, narasi } = generateNarasi(result)
    expect(title).toBe('Hasil Analisis')
    expect(narasi).toContain('Analisis statistik')
    expect(narasi.length).toBeGreaterThan(30)
  })
})

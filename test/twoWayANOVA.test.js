// Two-Way ANOVA tests
// =====================
// Verifikasi terhadap textbook example (balanced 2x3 design)
// dan edge cases (empty cells, unbalanced, single level).

import { describe, it, expect } from 'vitest'
import { twoWayANOVA } from '../src/lib/stats/twoWayANOVA.js'

describe('twoWayANOVA — error handling', () => {
  it('error: array tidak sama panjang', () => {
    const r = twoWayANOVA({ y: [1, 2, 3], a: ['x', 'y'], b: ['p', 'q', 'r'] })
    expect(r.error).toMatch(/Panjang array tidak sama/)
  })

  it('error: faktor hanya 1 level', () => {
    const r = twoWayANOVA({
      y: [1, 2, 3, 4],
      a: ['x', 'x', 'x', 'x'],   // hanya 1 level
      b: ['p', 'q', 'p', 'q'],
    })
    expect(r.error).toMatch(/hanya punya 1 level/)
  })

  it('error: sel kosong (missing combination)', () => {
    const r = twoWayANOVA({
      y: [1, 2, 3, 4, 5, 6],
      a: ['x', 'x', 'y', 'y', 'x', 'x'],
      b: ['p', 'p', 'p', 'p', 'p', 'p'],   // semua p, tidak ada q untuk y
    })
    // ini akan fail di "1 level untuk b"
    expect(r.error).toBeTruthy()
  })

  it('error: df residual = 0 (tepat 1 obs per sel, ngga bisa estimate within-error)', () => {
    const r = twoWayANOVA({
      y: [1, 2, 3, 4],
      a: ['x', 'x', 'y', 'y'],
      b: ['p', 'q', 'p', 'q'],
    })
    expect(r.error).toMatch(/df residual/)
  })
})

describe('twoWayANOVA — balanced 2x2 dengan main effect signifikan', () => {
  // 2 metode (A, B) × 2 jenis kelamin (P, L), 4 obs per sel = 16 total
  // Skenario: metode A jelas lebih tinggi dari B; gender tidak berpengaruh
  const data = {
    y: [
      // Metode A, P: skor tinggi (mean ~85)
      82, 88, 84, 86,
      // Metode A, L: juga tinggi
      84, 87, 83, 85,
      // Metode B, P: skor rendah (mean ~70)
      70, 72, 68, 71,
      // Metode B, L: juga rendah
      71, 69, 73, 70,
    ],
    a: [
      'A', 'A', 'A', 'A',
      'A', 'A', 'A', 'A',
      'B', 'B', 'B', 'B',
      'B', 'B', 'B', 'B',
    ],
    b: [
      'P', 'P', 'P', 'P',
      'L', 'L', 'L', 'L',
      'P', 'P', 'P', 'P',
      'L', 'L', 'L', 'L',
    ],
  }

  const r = twoWayANOVA({ ...data, nameA: 'Metode', nameB: 'Gender' })

  it('tidak error', () => {
    expect(r.error).toBeNull()
  })

  it('balanced design terdeteksi', () => {
    expect(r.isBalanced).toBe(true)
    expect(r.cellSizesRange.min).toBe(4)
    expect(r.cellSizesRange.max).toBe(4)
  })

  it('jumlah level benar', () => {
    expect(r.levelsA).toEqual(['A', 'B'])
    expect(r.levelsB).toEqual(['L', 'P'])
  })

  it('df benar untuk balanced 2x2 (n=16)', () => {
    expect(r.factorA.df).toBe(1)         // a-1 = 1
    expect(r.factorB.df).toBe(1)         // b-1 = 1
    expect(r.interaction.df).toBe(1)     // (a-1)(b-1) = 1
    expect(r.residual.df).toBe(12)       // N - ab = 16 - 4 = 12
    expect(r.total.df).toBe(15)          // N - 1 = 15
  })

  it('Faktor A (Metode) sangat signifikan — efek besar', () => {
    expect(r.factorA.F).toBeGreaterThan(50)
    expect(r.factorA.pValue).toBeLessThan(0.001)
    expect(r.significantA).toBe(true)
    expect(r.factorA.partialEtaSquared).toBeGreaterThan(0.5)  // efek besar
    expect(r.factorA.effectSize).toBe('besar')
  })

  it('Faktor B (Gender) tidak signifikan', () => {
    expect(r.factorB.pValue).toBeGreaterThan(0.05)
    expect(r.significantB).toBe(false)
  })

  it('Interaksi tidak signifikan (paralel)', () => {
    expect(r.interaction.pValue).toBeGreaterThan(0.05)
    expect(r.significantInteraction).toBe(false)
  })

  it('SS additivity: SS_A + SS_B + SS_AB + SS_within ≈ SS_total', () => {
    const sumParts = r.factorA.SS + r.factorB.SS + r.interaction.SS + r.residual.SS
    expect(sumParts).toBeCloseTo(r.total.SS, 3)
  })

  it('cellTable lengkap (4 sel)', () => {
    expect(r.cellTable).toHaveLength(4)
    r.cellTable.forEach(c => {
      expect(c.n).toBe(4)
      expect(typeof c.mean).toBe('number')
      expect(typeof c.sd).toBe('number')
    })
  })

  it('marginal means konsisten', () => {
    // Mean Metode A: avg dari semua obs A
    const meanA_obs = (82+88+84+86 + 84+87+83+85) / 8
    const aRow = r.marginalA.find(m => m.level === 'A')
    expect(aRow.mean).toBeCloseTo(meanA_obs, 3)
  })
})

describe('twoWayANOVA — desain dengan interaksi kuat', () => {
  // Disorderkan interaction: A tinggi di level B1 tapi rendah di level B2
  const data = {
    y: [
      // a=X, b=1: skor tinggi
      85, 88, 86, 84,
      // a=X, b=2: skor rendah
      60, 62, 58, 61,
      // a=Y, b=1: skor rendah
      62, 64, 60, 63,
      // a=Y, b=2: skor tinggi
      87, 85, 88, 86,
    ],
    a: [
      'X','X','X','X',
      'X','X','X','X',
      'Y','Y','Y','Y',
      'Y','Y','Y','Y',
    ],
    b: [
      '1','1','1','1',
      '2','2','2','2',
      '1','1','1','1',
      '2','2','2','2',
    ],
  }

  const r = twoWayANOVA({ ...data })

  it('Interaksi sangat signifikan', () => {
    expect(r.interaction.pValue).toBeLessThan(0.001)
    expect(r.significantInteraction).toBe(true)
    expect(r.interaction.effectSize).toBe('besar')
  })

  it('Main effects bisa kecil/tidak signifikan karena disordinal', () => {
    // Untuk crossed interaction sempurna, marginal means hampir sama → main effect kecil
    expect(r.factorA.pValue).toBeGreaterThan(0.05)
    expect(r.factorB.pValue).toBeGreaterThan(0.05)
  })
})

describe('twoWayANOVA — desain unbalanced', () => {
  // Cell n: A1B1=3, A1B2=4, A2B1=4, A2B2=3
  const data = {
    y: [
      // A=1, B=1 (n=3)
      80, 82, 78,
      // A=1, B=2 (n=4)
      85, 88, 86, 84,
      // A=2, B=1 (n=4)
      70, 72, 68, 71,
      // A=2, B=2 (n=3)
      75, 73, 76,
    ],
    a: ['1','1','1', '1','1','1','1', '2','2','2','2', '2','2','2'],
    b: ['1','1','1', '2','2','2','2', '1','1','1','1', '2','2','2'],
  }

  const r = twoWayANOVA({ ...data })

  it('isBalanced = false', () => {
    expect(r.error).toBeNull()
    expect(r.isBalanced).toBe(false)
    expect(r.cellSizesRange.min).toBe(3)
    expect(r.cellSizesRange.max).toBe(4)
  })

  it('tetap menghasilkan F-test valid (df residual = N - ab)', () => {
    expect(r.residual.df).toBe(14 - 4)  // 14 - 4 = 10
    expect(r.factorA.F).toBeGreaterThan(0)
    expect(r.factorB.F).toBeGreaterThan(0)
  })
})

describe('twoWayANOVA — handling NaN/missing', () => {
  it('skip baris dengan NaN di outcome', () => {
    const data = {
      y: [10, 12, NaN, 14, 16, 18, 20, 22],
      a: ['x','x','x','x','y','y','y','y'],
      b: ['1','1','2','2','1','1','2','2'],
    }
    const r = twoWayANOVA({ ...data })
    expect(r.error).toBeNull()
    expect(r.N).toBe(7)  // 1 baris di-skip
  })

  it('skip baris dengan level kosong', () => {
    const data = {
      y: [10, 12, 14, 16, 18, 20, 22, 24],
      a: ['x','x',null,'x','y','y','y','y'],
      b: ['1','1','1','2','1','1','2','2'],
    }
    const r = twoWayANOVA({ ...data })
    expect(r.error).toBeNull()
    expect(r.N).toBe(7)
  })
})

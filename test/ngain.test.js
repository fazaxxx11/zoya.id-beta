// N-Gain (Hake, 1998) unit tests
// ================================
// Validates formula correctness, category boundaries, edge cases,
// and integration with paired t-test for significance testing.

import { describe, it, expect } from 'vitest'
import { calcNGain, categorizeNGain, analyzeNGain } from '../src/lib/stats/ngain.js'

const EPS = 1e-4

describe('calcNGain — formula Hake (1998)', () => {
  it('rumus standar: g = (post - pre) / (max - pre)', () => {
    // pre=40, post=70, max=100 → (70-40)/(100-40) = 30/60 = 0.5
    expect(calcNGain(40, 70, 100)).toBeCloseTo(0.5, 4)
    // pre=20, post=80, max=100 → 60/80 = 0.75 (Tinggi)
    expect(calcNGain(20, 80, 100)).toBeCloseTo(0.75, 4)
    // pre=60, post=66, max=100 → 6/40 = 0.15 (Rendah)
    expect(calcNGain(60, 66, 100)).toBeCloseTo(0.15, 4)
  })

  it('handle pre = max (tidak bisa naik) — return 1.0 jika post >= pre, else 0', () => {
    // pre=100, post=100 → tidak bisa naik, kembalikan 1.0 (tidak turun)
    expect(calcNGain(100, 100, 100)).toBe(1.0)
    // pre=100, post=90 → turun, kembalikan 0
    expect(calcNGain(100, 90, 100)).toBe(0.0)
  })

  it('post = pre → g = 0', () => {
    expect(calcNGain(50, 50, 100)).toBeCloseTo(0, 4)
  })

  it('post < pre (regresi belajar) → g negatif', () => {
    // pre=80, post=60, max=100 → -20/20 = -1.0
    expect(calcNGain(80, 60, 100)).toBeCloseTo(-1.0, 4)
  })

  it('post = max → g = 1.0', () => {
    // pre=50, post=100, max=100 → 50/50 = 1.0
    expect(calcNGain(50, 100, 100)).toBeCloseTo(1.0, 4)
  })

  it('skor maks selain 100 (mis. 10)', () => {
    // pre=4, post=8, max=10 → 4/6 ≈ 0.6667
    expect(calcNGain(4, 8, 10)).toBeCloseTo(0.6667, 3)
  })

  it('input invalid → null', () => {
    expect(calcNGain(NaN, 50, 100)).toBeNull()
    expect(calcNGain(50, NaN, 100)).toBeNull()
    expect(calcNGain('a', 50, 100)).toBeNull()
    expect(calcNGain(Infinity, 50, 100)).toBeNull()
  })
})

describe('categorizeNGain — boundary klasifikasi Hake', () => {
  it('Tinggi: g >= 0.7', () => {
    expect(categorizeNGain(0.7)).toBe('Tinggi')
    expect(categorizeNGain(0.85)).toBe('Tinggi')
    expect(categorizeNGain(1.0)).toBe('Tinggi')
  })

  it('Sedang: 0.3 <= g < 0.7', () => {
    expect(categorizeNGain(0.3)).toBe('Sedang')
    expect(categorizeNGain(0.5)).toBe('Sedang')
    expect(categorizeNGain(0.69999)).toBe('Sedang')
  })

  it('Rendah: g < 0.3', () => {
    expect(categorizeNGain(0.29999)).toBe('Rendah')
    expect(categorizeNGain(0.0)).toBe('Rendah')
    expect(categorizeNGain(-0.5)).toBe('Rendah')
  })

  it('invalid input → N/A', () => {
    expect(categorizeNGain(null)).toBe('N/A')
    expect(categorizeNGain(undefined)).toBe('N/A')
    expect(categorizeNGain(NaN)).toBe('N/A')
    expect(categorizeNGain(Infinity)).toBe('N/A')
  })
})

describe('analyzeNGain — full pipeline', () => {
  it('error: panjang array tidak sama', () => {
    const r = analyzeNGain({ pre: [1, 2, 3], post: [4, 5] })
    expect(r.error).toMatch(/tidak sama/i)
  })

  it('error: bukan array', () => {
    const r = analyzeNGain({ pre: 'foo', post: [1, 2] })
    expect(r.error).toMatch(/array/i)
  })

  it('error: kurang dari 2 pasangan valid', () => {
    const r = analyzeNGain({ pre: [50, NaN], post: [70, NaN] })
    expect(r.error).toMatch(/minimal 2/i)
  })

  it('case kelas TINGGI — semua siswa naik banyak', () => {
    // 5 siswa naik dari ~40 ke ~92 → mean g ≈ 0.87
    const pre  = [40, 45, 50, 35, 42]
    const post = [92, 94, 95, 90, 93]
    const r = analyzeNGain({ pre, post, maxScore: 100 })

    expect(r.error).toBeNull()
    expect(r.n).toBe(5)
    expect(r.maxScore).toBe(100)
    expect(r.nGainMean).toBeGreaterThan(0.7)
    expect(r.kategoriKelas).toBe('Tinggi')
    expect(r.distribusi.Tinggi).toBe(5)
    // efektivitas ≈ 87% → Efektif (>76%)
    expect(r.tafsiranEfektivitas).toBe('Efektif')
  })

  it('case kelas SEDANG — peningkatan moderat', () => {
    // pre 50-an, post 70-an → g ≈ 0.4
    const pre  = [50, 55, 60, 45, 50]
    const post = [70, 75, 78, 68, 72]
    const r = analyzeNGain({ pre, post, maxScore: 100 })

    expect(r.error).toBeNull()
    expect(r.nGainMean).toBeGreaterThanOrEqual(0.3)
    expect(r.nGainMean).toBeLessThan(0.7)
    expect(r.kategoriKelas).toBe('Sedang')
  })

  it('case kelas RENDAH — peningkatan kecil', () => {
    // pre 50-an, post 60-an → g ≈ 0.2
    const pre  = [50, 55, 60, 45, 50]
    const post = [60, 63, 65, 55, 60]
    const r = analyzeNGain({ pre, post, maxScore: 100 })

    expect(r.error).toBeNull()
    expect(r.nGainMean).toBeLessThan(0.3)
    expect(r.kategoriKelas).toBe('Rendah')
  })

  it('paired t-test signifikansi terisi & valid', () => {
    const pre  = [40, 45, 50, 35, 42, 48, 38, 44]
    const post = [70, 78, 80, 65, 72, 75, 68, 74]
    const r = analyzeNGain({ pre, post, maxScore: 100 })

    expect(r.signifTest).not.toBeNull()
    expect(r.signifTest.t).toBeGreaterThan(0)        // post > pre
    expect(r.signifTest.df).toBe(7)                  // n - 1
    expect(r.signifTest.pValue).toBeLessThan(0.05)   // peningkatan signifikan
    expect(r.signifTest.significant).toBe(true)
    expect(r.signifTest.cohensD).toBeGreaterThan(0)
  })

  it('skip pasangan invalid (NaN, di luar 0..maxScore)', () => {
    const pre  = [40, 50, NaN, 60, 200, -5, 45]   // 200 dan -5 di luar 0..100
    const post = [70, 75, 80,  85, 90,  60, 80]
    const r = analyzeNGain({ pre, post, maxScore: 100 })

    // Hanya 4 pasangan valid (idx 0,1,3,6)
    expect(r.n).toBe(4)
    expect(r.error).toBeNull()
  })

  it('distribusi & persentase konsisten', () => {
    const pre  = [10, 10, 10, 10, 10]
    const post = [85, 50, 25, 90, 40]   // g = 0.83, 0.44, 0.17, 0.89, 0.33
    const r = analyzeNGain({ pre, post, maxScore: 100 })

    // distribusi: 2 Tinggi, 2 Sedang, 1 Rendah
    expect(r.distribusi.Tinggi + r.distribusi.Sedang + r.distribusi.Rendah).toBe(5)
    expect(r.distribusi.Tinggi).toBe(2)
    expect(r.distribusi.Sedang).toBe(2)
    expect(r.distribusi.Rendah).toBe(1)

    // persen total ≈ 100%
    const totalPct = r.distribusiPersen.Tinggi + r.distribusiPersen.Sedang + r.distribusiPersen.Rendah
    expect(totalPct).toBeCloseTo(100, 1)
  })

  it('per-pair detail correct + nama default kalau tidak ada', () => {
    const pre  = [40, 50]
    const post = [70, 80]
    const r = analyzeNGain({ pre, post, maxScore: 100 })

    expect(r.pairs).toHaveLength(2)
    expect(r.pairs[0].pre).toBe(40)
    expect(r.pairs[0].post).toBe(70)
    expect(r.pairs[0].gain).toBe(30)
    expect(r.pairs[0].nGain).toBeCloseTo(0.5, 4)
    expect(r.pairs[0].kategori).toBe('Sedang')
    expect(r.pairs[0].name).toBe('Subjek 1')
  })

  it('per-pair detail pakai nama dari array names', () => {
    const pre  = [40, 50]
    const post = [70, 80]
    const names = ['Andi', 'Budi']
    const r = analyzeNGain({ pre, post, maxScore: 100, names })

    expect(r.pairs[0].name).toBe('Andi')
    expect(r.pairs[1].name).toBe('Budi')
  })

  it('efektivitas % konsisten dengan nGainMean × 100', () => {
    const pre  = [40, 50, 60]
    const post = [70, 80, 90]
    const r = analyzeNGain({ pre, post, maxScore: 100 })

    // efektivitasPersen ≈ nGainMean × 100
    expect(r.efektivitasPersen).toBeCloseTo(r.nGainMean * 100, 1)
  })

  it('skor maks 10 (skala 0-10)', () => {
    const pre  = [4, 5, 3, 6]
    const post = [8, 9, 7, 9]
    const r = analyzeNGain({ pre, post, maxScore: 10 })

    expect(r.error).toBeNull()
    expect(r.maxScore).toBe(10)
    // semua harus valid
    expect(r.n).toBe(4)
    expect(r.nGainMean).toBeGreaterThan(0)
  })
})

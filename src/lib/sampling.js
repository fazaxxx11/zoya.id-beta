// ============================================================
// Sample Size & Sampling — kalkulator untuk metodologi penelitian
// ============================================================
// Berisi rumus penentuan ukuran sampel yang umum dipakai di skripsi/tesis:
//
//   - Slovin              (populasi N diketahui, error e)
//   - Krejcie & Morgan    (tabel klasik 1970, derived from formula)
//   - Cochran             (populasi tidak diketahui / sangat besar)
//   - Yamane              (sederhana, mirip Slovin)
//   - Lemeshow            (untuk proporsi prevalensi/kesehatan)
//
// Plus utilitas sampling:
//   - stratifiedAllocation : proporsional & equal
//   - randomSample         : Fisher-Yates k-from-n (seed opsional)
//
// Semua fungsi murni — gampang di-test.

// ------------------------------------------------------------
// Z-score untuk confidence level
// ------------------------------------------------------------
/**
 * Mengembalikan Z α/2 untuk confidence level umum.
 * Default 95% → 1.96.
 */
export function zForConfidence(level = 0.95) {
  const map = {
    0.80: 1.282,
    0.85: 1.440,
    0.90: 1.645,
    0.95: 1.960,
    0.98: 2.326,
    0.99: 2.576,
  }
  // Round ke 2 desimal supaya 0.95000001 tetap match
  const k = Math.round(level * 100) / 100
  if (map[k] !== undefined) return map[k]
  // Fallback approx (Beasley-Springer-Moro inverse normal — pakai approx ringan):
  // Untuk level lain, hitung pakai Newton-Raphson sederhana di erfInv.
  return inverseNormalCDF(1 - (1 - level) / 2)
}

// Approx inverse standard normal CDF (Acklam algorithm)
function inverseNormalCDF(p) {
  if (p <= 0 || p >= 1) return NaN
  const a = [-3.969683028665376e+01,  2.209460984245205e+02,
             -2.759285104469687e+02,  1.383577518672690e+02,
             -3.066479806614716e+01,  2.506628277459239e+00]
  const b = [-5.447609879822406e+01,  1.615858368580409e+02,
             -1.556989798598866e+02,  6.680131188771972e+01,
             -1.328068155288572e+01]
  const c = [-7.784894002430293e-03, -3.223964580411365e-01,
             -2.400758277161838e+00, -2.549732539343734e+00,
              4.374664141464968e+00,  2.938163982698783e+00]
  const d = [ 7.784695709041462e-03,  3.224671290700398e-01,
              2.445134137142996e+00,  3.754408661907416e+00]
  const pLow = 0.02425, pHigh = 1 - pLow
  let q, r
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
  } else if (p <= pHigh) {
    q = p - 0.5
    r = q*q
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p))
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
  }
}

// ------------------------------------------------------------
// Rumus Slovin
//   n = N / (1 + N * e^2)
// ------------------------------------------------------------
/**
 * Slovin: untuk populasi yang diketahui (N), error e (mis. 0.05).
 * @param {number} N - populasi
 * @param {number} e - margin of error (proporsi, mis. 0.05 = 5%)
 * @returns {{ n: number, formula: string, note: string }}
 */
export function slovinSize(N, e) {
  if (N <= 0) throw new Error('Populasi (N) harus > 0')
  if (e <= 0 || e >= 1) throw new Error('Error (e) harus di antara 0 dan 1')
  const raw = N / (1 + N * e * e)
  return {
    n: Math.ceil(raw),
    formula: 'n = N / (1 + N·e²)',
    note: `Dengan N=${N}, e=${(e*100).toFixed(1)}% → n = ${N}/(1+${N}·${e}²) = ${raw.toFixed(2)} ≈ ${Math.ceil(raw)}.`,
  }
}

// ------------------------------------------------------------
// Yamane = Slovin (banyak buku Indo memakai keduanya bergantian)
// ------------------------------------------------------------
export const yamaneSize = slovinSize

// ------------------------------------------------------------
// Krejcie & Morgan (1970)
//   n = (Z² · N · p · (1-p)) / (e² · (N-1) + Z² · p · (1-p))
// Dengan Z=1.96, p=0.5, e=0.05 → tabel standar.
// ------------------------------------------------------------
/**
 * Krejcie & Morgan: rumus tabel klasik. Default Z=1.96 (95%), p=0.5, e=0.05.
 */
export function krejcieMorganSize(N, { confidence = 0.95, p = 0.5, e = 0.05 } = {}) {
  if (N <= 0) throw new Error('Populasi (N) harus > 0')
  if (p <= 0 || p >= 1) throw new Error('Proporsi (p) harus 0 < p < 1')
  if (e <= 0 || e >= 1) throw new Error('Error (e) harus 0 < e < 1')
  const Z = zForConfidence(confidence)
  const num = Z*Z * N * p * (1 - p)
  const den = e*e * (N - 1) + Z*Z * p * (1 - p)
  const raw = num / den
  return {
    n: Math.ceil(raw),
    Z, p, e,
    formula: 'n = (Z²·N·p·(1−p)) / (e²·(N−1) + Z²·p·(1−p))',
    note: `Z=${Z.toFixed(3)}, p=${p}, e=${e}. n raw = ${raw.toFixed(2)} ≈ ${Math.ceil(raw)}.`,
  }
}

// ------------------------------------------------------------
// Cochran — populasi tidak diketahui / sangat besar
//   n0 = Z² · p · (1-p) / e²
// Dengan koreksi populasi terbatas (FPC):
//   n  = n0 / (1 + (n0-1)/N)
// ------------------------------------------------------------
/**
 * Cochran: untuk populasi tidak terhingga atau sangat besar.
 * Jika N diberikan, hasil akan dikoreksi populasi terbatas.
 *
 * @param {object} opts
 * @param {number} opts.confidence - default 0.95
 * @param {number} opts.p          - proporsi yang diharapkan, default 0.5 (paling konservatif)
 * @param {number} opts.e          - margin of error, default 0.05
 * @param {number} [opts.N]        - populasi (opsional, untuk koreksi FPC)
 */
export function cochranSize({ confidence = 0.95, p = 0.5, e = 0.05, N = null } = {}) {
  if (p <= 0 || p >= 1) throw new Error('p harus 0 < p < 1')
  if (e <= 0 || e >= 1) throw new Error('e harus 0 < e < 1')
  const Z = zForConfidence(confidence)
  const n0 = (Z*Z * p * (1 - p)) / (e*e)
  let nFinal = n0
  let formula = 'n₀ = Z²·p·(1−p)/e²'
  let note = `Z=${Z.toFixed(3)}, p=${p}, e=${e}. n₀ = ${n0.toFixed(2)}.`
  if (N !== null && N > 0) {
    nFinal = n0 / (1 + (n0 - 1) / N)
    formula += ' ; n = n₀ / (1 + (n₀−1)/N)'
    note += ` Dengan koreksi populasi N=${N} → n = ${nFinal.toFixed(2)} ≈ ${Math.ceil(nFinal)}.`
  } else {
    note += ` (Tanpa koreksi populasi terbatas → n ≈ ${Math.ceil(n0)}.)`
  }
  return {
    n0: Math.ceil(n0),
    n: Math.ceil(nFinal),
    Z, p, e,
    formula,
    note,
  }
}

// ------------------------------------------------------------
// Lemeshow — sering dipakai di penelitian kesehatan
//   n = Z² · p · (1-p) / d²
// Identik dengan Cochran tanpa FPC, dipisah karena terminologi beda.
// ------------------------------------------------------------
/**
 * Lemeshow: rumus untuk prevalensi/proporsi (kesehatan masyarakat).
 * @param {number} p - prevalensi yang diharapkan
 * @param {number} d - presisi mutlak (mis. 0.05)
 * @param {number} [confidence=0.95]
 */
export function lemeshowSize({ p = 0.5, d = 0.05, confidence = 0.95 } = {}) {
  if (p <= 0 || p >= 1) throw new Error('p harus 0 < p < 1')
  if (d <= 0 || d >= 1) throw new Error('d harus 0 < d < 1')
  const Z = zForConfidence(confidence)
  const raw = (Z*Z * p * (1 - p)) / (d*d)
  return {
    n: Math.ceil(raw),
    Z, p, d,
    formula: 'n = Z²·p·(1−p)/d²',
    note: `Z=${Z.toFixed(3)}, p=${p}, d=${d}. n = ${raw.toFixed(2)} ≈ ${Math.ceil(raw)}.`,
  }
}

// ============================================================
// SAMPLING ALOKASI
// ============================================================

/**
 * Alokasi sampel proporsional ke strata.
 *
 * @param {Array<{name: string, N: number}>} strata - daftar strata dengan ukuran populasi-nya
 * @param {number} totalSampleSize - n total yang diinginkan
 * @param {'proportional'|'equal'} [mode='proportional']
 * @returns {Array<{name: string, N: number, n: number, fraction: number}>}
 */
export function stratifiedAllocation(strata, totalSampleSize, mode = 'proportional') {
  if (!Array.isArray(strata) || strata.length === 0) throw new Error('Daftar strata kosong')
  if (totalSampleSize <= 0) throw new Error('Sampel total harus > 0')

  const totalN = strata.reduce((s, x) => s + (x.N || 0), 0)
  if (totalN <= 0) throw new Error('Total populasi semua strata harus > 0')

  let result
  if (mode === 'equal') {
    const each = Math.floor(totalSampleSize / strata.length)
    let remainder = totalSampleSize - each * strata.length
    result = strata.map((s, i) => ({
      name: s.name,
      N: s.N,
      n: each + (i < remainder ? 1 : 0),
      fraction: 1 / strata.length,
    }))
  } else {
    // Largest-remainder method untuk memastikan sum = totalSampleSize
    const raw = strata.map(s => ({ ...s, exact: (s.N / totalN) * totalSampleSize }))
    const floors = raw.map(r => ({ ...r, n: Math.floor(r.exact), rem: r.exact - Math.floor(r.exact) }))
    let allocated = floors.reduce((s, r) => s + r.n, 0)
    let leftover = totalSampleSize - allocated
    floors.sort((a, b) => b.rem - a.rem)
    for (let i = 0; i < leftover; i++) floors[i].n += 1
    // Sort kembali ke urutan asli
    floors.sort((a, b) => strata.findIndex(s => s.name === a.name) -
                          strata.findIndex(s => s.name === b.name))
    result = floors.map(r => ({
      name: r.name,
      N: r.N,
      n: r.n,
      fraction: r.N / totalN,
    }))
  }
  return result
}

/**
 * Random sample k-from-n menggunakan Fisher-Yates.
 * Seed opsional untuk reproducibility (LCG sederhana).
 *
 * @template T
 * @param {T[]} items
 * @param {number} k
 * @param {number} [seed]
 * @returns {T[]}
 */
export function randomSample(items, k, seed) {
  if (!Array.isArray(items)) throw new Error('items harus array')
  if (k < 0) throw new Error('k harus >= 0')
  if (k > items.length) throw new Error(`k (${k}) > jumlah item (${items.length})`)

  const arr = items.slice()
  const rng = seed !== undefined ? mulberry32(seed) : Math.random

  // Partial Fisher-Yates: hanya k swap pertama
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (arr.length - i))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, k)
}

// Mulberry32 PRNG — kecil, cukup untuk sampling
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ============================================================
// Master entry — pilih rumus berdasarkan id
// ============================================================
export const SAMPLING_FORMULAS = [
  {
    id: 'slovin',
    name: 'Slovin',
    desc: 'Populasi diketahui, hanya butuh N dan margin error (e). Paling sering dipakai di skripsi.',
    requires: ['N', 'e'],
  },
  {
    id: 'krejcie_morgan',
    name: 'Krejcie & Morgan',
    desc: 'Tabel klasik 1970, mengandalkan Z, p=0.5, e=0.05. Sangat populer.',
    requires: ['N', 'confidence', 'p', 'e'],
  },
  {
    id: 'cochran',
    name: 'Cochran',
    desc: 'Populasi tidak diketahui / sangat besar. Dengan opsi koreksi populasi terbatas (FPC).',
    requires: ['confidence', 'p', 'e', 'N?'],
  },
  {
    id: 'lemeshow',
    name: 'Lemeshow',
    desc: 'Untuk prevalensi/proporsi (umum di penelitian kesehatan).',
    requires: ['confidence', 'p', 'd'],
  },
]

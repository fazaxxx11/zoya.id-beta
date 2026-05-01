// ============================================================
// Item Analysis (Analisis Butir Soal)
// ============================================================
// Untuk evaluasi kualitas butir tes pilihan ganda atau dichotomous (0/1):
//
//   - Difficulty Index   (P) — tingkat kesukaran
//   - Discrimination Index (D) — daya pembeda (upper-lower group)
//   - Point-Biserial      (r_pb) — korelasi butir-skor total
//   - Distractor Analysis — frekuensi tiap opsi pada kelompok atas vs bawah
//   - KR-20 / KR-21       — reliabilitas tes dichotomous
//
// Default kelompok atas/bawah memakai 27% top/bottom (Kelley, 1939).
// Semua fungsi murni, mudah di-test.

// ============================================================
// Tipe data
// ============================================================
// Input umum: matrix dichotomous (siswa × butir), nilai 0 atau 1.
//
//   scoredMatrix = [
//     [1, 0, 1, 1, 0],  // siswa 1: jawaban benar = butir 1, 3, 4
//     [1, 1, 0, 1, 0],  // siswa 2
//     ...
//   ]

// ============================================================
// Difficulty Index (P)
// ============================================================
/**
 * Tingkat kesukaran = proporsi jawaban benar.
 * P = jumlah_benar / total_siswa
 *
 * Klasifikasi (umum di Indonesia):
 *   P < 0.30        → sukar
 *   0.30 ≤ P ≤ 0.70 → sedang
 *   P > 0.70        → mudah
 */
export function difficultyIndex(itemColumn) {
  if (!Array.isArray(itemColumn) || itemColumn.length === 0) return null
  const correct = itemColumn.reduce((s, x) => s + (Number(x) === 1 ? 1 : 0), 0)
  return correct / itemColumn.length
}

export function categorizeDifficulty(p) {
  if (p === null || isNaN(p)) return null
  if (p < 0.30) return 'sukar'
  if (p > 0.70) return 'mudah'
  return 'sedang'
}

// ============================================================
// Discrimination Index (D)
// ============================================================
/**
 * Daya pembeda = (P_upper - P_lower) menggunakan kelompok atas & bawah
 * berdasarkan skor total. Default 27% atas dan 27% bawah (Kelley, 1939).
 *
 * D = (B_atas - B_bawah) / N_per_kelompok
 *
 * Klasifikasi (Ebel & Frisbie, 1991):
 *   D < 0.20        → jelek
 *   0.20–0.40       → cukup
 *   0.40–0.70       → baik
 *   D > 0.70        → sangat baik
 */
export function discriminationIndex(itemColumn, totalScores, fraction = 0.27) {
  if (!Array.isArray(itemColumn) || !Array.isArray(totalScores)) return null
  if (itemColumn.length !== totalScores.length) return null
  const n = itemColumn.length
  if (n < 4) return null  // butuh minimal 4 siswa untuk membuat 2 kelompok

  // Sort indices by totalScore descending
  const indices = totalScores
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s - a.s)
    .map(x => x.i)

  const groupSize = Math.max(1, Math.floor(n * fraction))
  const upper = indices.slice(0, groupSize)
  const lower = indices.slice(-groupSize)

  const correctIn = (idxs) => idxs.reduce((s, i) => s + (Number(itemColumn[i]) === 1 ? 1 : 0), 0)

  const upperCorrect = correctIn(upper)
  const lowerCorrect = correctIn(lower)

  return (upperCorrect - lowerCorrect) / groupSize
}

export function categorizeDiscrimination(d) {
  if (d === null || isNaN(d)) return null
  if (d < 0.20) return 'jelek'
  if (d < 0.40) return 'cukup'
  if (d <= 0.70) return 'baik'
  return 'sangat_baik'
}

// ============================================================
// Point-Biserial Correlation (r_pb)
// ============================================================
/**
 * Korelasi item-total: ukur seberapa baik butir membedakan
 * siswa skor tinggi vs rendah. Identik dengan Pearson r untuk
 * data dichotomous, tapi dipakai formula khusus (lebih stabil
 * secara numerik):
 *
 *   r_pb = (M1 - M0) / SD_total · sqrt(p · q)
 *
 * di mana:
 *   M1 = mean total score siswa yang menjawab benar
 *   M0 = mean total score siswa yang menjawab salah
 *   SD_total = stdev total score
 *   p = proporsi benar, q = 1 - p
 *
 * Catatan: butir yang ada di total skor membuat sedikit overestimasi.
 * Untuk koreksi, gunakan corrected point-biserial (item dikurangi dari total).
 */
export function pointBiserial(itemColumn, totalScores) {
  if (!Array.isArray(itemColumn) || !Array.isArray(totalScores)) return null
  if (itemColumn.length !== totalScores.length) return null
  const n = itemColumn.length
  if (n < 2) return null

  let n1 = 0, n0 = 0, sum1 = 0, sum0 = 0
  for (let i = 0; i < n; i++) {
    const v = Number(itemColumn[i])
    const t = Number(totalScores[i])
    if (v === 1) { n1++; sum1 += t }
    else         { n0++; sum0 += t }
  }
  if (n1 === 0 || n0 === 0) return null

  const m1 = sum1 / n1
  const m0 = sum0 / n0
  const meanT = totalScores.reduce((s, x) => s + Number(x), 0) / n
  const varT = totalScores.reduce((s, x) => s + (Number(x) - meanT) ** 2, 0) / n
  const sdT = Math.sqrt(varT)
  if (sdT === 0) return null

  const p = n1 / n
  const q = 1 - p
  return ((m1 - m0) / sdT) * Math.sqrt(p * q)
}

/**
 * Corrected point-biserial: butir dikurangi dari total skor sebelum
 * dihitung korelasinya. Lebih akurat untuk butir-butir dengan skor total
 * yang banyak dipengaruhi oleh butir tsb (mis. tes pendek).
 */
export function pointBiserialCorrected(itemColumn, totalScores) {
  if (itemColumn.length !== totalScores.length) return null
  const correctedTotal = totalScores.map((t, i) => Number(t) - Number(itemColumn[i]))
  return pointBiserial(itemColumn, correctedTotal)
}

// ============================================================
// KR-20 (Kuder-Richardson 20)
// ============================================================
/**
 * Reliabilitas internal untuk tes dichotomous (0/1).
 * Versi spesifik dari Cronbach α untuk butir dichotomous.
 *
 *   KR-20 = (k / (k-1)) · (1 - Σ(p_i · q_i) / σ²_total)
 *
 * di mana:
 *   k = jumlah butir
 *   p_i, q_i = proporsi benar / salah butir i
 *   σ²_total = varians skor total
 *
 * Interpretasi (Guilford):
 *   ≥ 0.90  sangat tinggi
 *   0.70–0.89 tinggi
 *   0.40–0.69 sedang
 *   < 0.40   rendah
 */
export function kr20(scoredMatrix) {
  if (!Array.isArray(scoredMatrix) || scoredMatrix.length < 2) return null
  const n = scoredMatrix.length         // jumlah siswa
  const k = scoredMatrix[0].length      // jumlah butir
  if (k < 2) return null

  // Total skor per siswa
  const totals = scoredMatrix.map(row => row.reduce((s, x) => s + Number(x), 0))
  const meanT = totals.reduce((s, t) => s + t, 0) / n
  const varT = totals.reduce((s, t) => s + (t - meanT) ** 2, 0) / n
  if (varT === 0) return null

  // Σ p·q
  let sumPQ = 0
  for (let j = 0; j < k; j++) {
    const col = scoredMatrix.map(row => Number(row[j]))
    const p = col.reduce((s, x) => s + x, 0) / n
    sumPQ += p * (1 - p)
  }

  return (k / (k - 1)) * (1 - sumPQ / varT)
}

/**
 * KR-21: versi penyederhanaan KR-20, asumsi tingkat kesukaran semua butir sama.
 * Hampir selalu menghasilkan estimasi lebih rendah dari KR-20.
 *
 *   KR-21 = (k / (k-1)) · (1 - M·(k-M) / (k·σ²))
 *
 * di mana M = mean skor total.
 */
export function kr21(scoredMatrix) {
  if (!Array.isArray(scoredMatrix) || scoredMatrix.length < 2) return null
  const n = scoredMatrix.length
  const k = scoredMatrix[0].length
  if (k < 2) return null

  const totals = scoredMatrix.map(row => row.reduce((s, x) => s + Number(x), 0))
  const meanT = totals.reduce((s, t) => s + t, 0) / n
  const varT = totals.reduce((s, t) => s + (t - meanT) ** 2, 0) / n
  if (varT === 0) return null

  return (k / (k - 1)) * (1 - (meanT * (k - meanT)) / (k * varT))
}

export function categorizeReliability(r) {
  if (r === null || isNaN(r)) return null
  if (r >= 0.90) return 'sangat_tinggi'
  if (r >= 0.70) return 'tinggi'
  if (r >= 0.40) return 'sedang'
  return 'rendah'
}

// ============================================================
// Distractor Analysis (untuk soal pilihan ganda)
// ============================================================
/**
 * Hitung frekuensi tiap opsi (A/B/C/D/E) pada kelompok atas vs bawah.
 *
 * @param {string[]} responses - jawaban tiap siswa, mis. ['A','B','A','C',...]
 * @param {number[]} totalScores - skor total tiap siswa
 * @param {string}   key - kunci jawaban (mis. 'B')
 * @param {string[]} options - daftar opsi yang valid (mis. ['A','B','C','D'])
 * @param {number}   fraction - proporsi atas/bawah (default 0.27)
 *
 * Output untuk tiap opsi:
 *   {
 *     option: 'A',
 *     isKey: false,
 *     upper: 3,    // # siswa atas yang pilih A
 *     lower: 8,    // # siswa bawah yang pilih A
 *     total: 15,
 *     working: true   // distraktor "berfungsi" jika dipilih ≥ 5% siswa, dan lower > upper
 *   }
 */
export function distractorAnalysis(responses, totalScores, key, options, fraction = 0.27) {
  if (!Array.isArray(responses) || !Array.isArray(totalScores)) return []
  if (responses.length !== totalScores.length) return []

  const n = responses.length
  if (n < 4) return []

  const indices = totalScores
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s - a.s)
    .map(x => x.i)

  const groupSize = Math.max(1, Math.floor(n * fraction))
  const upperSet = new Set(indices.slice(0, groupSize))
  const lowerSet = new Set(indices.slice(-groupSize))

  return options.map(opt => {
    let upper = 0, lower = 0, total = 0
    for (let i = 0; i < n; i++) {
      if (responses[i] === opt) {
        total++
        if (upperSet.has(i)) upper++
        if (lowerSet.has(i)) lower++
      }
    }
    const isKey = opt === key
    // "Berfungsi" untuk distraktor (bukan key) jika dipilih ≥5% dan lower > upper
    const working = !isKey && (total / n >= 0.05) && (lower > upper)
    return { option: opt, isKey, upper, lower, total, working }
  })
}

// ============================================================
// Master analysis — gabung semua per butir + ringkasan keseluruhan
// ============================================================
/**
 * Analisis menyeluruh sebuah tes.
 *
 * @param {object} input
 * @param {number[][]} input.scoredMatrix - matrix dichotomous (siswa × butir)
 * @param {string[][]} [input.responseMatrix] - matrix jawaban mentah (siswa × butir), untuk distractor
 * @param {string[]}   [input.answerKey]      - kunci jawaban per butir
 * @param {string[]}   [input.options]        - daftar opsi global (mis. ['A','B','C','D'])
 * @param {number}     [input.fraction=0.27]  - persentase atas/bawah
 *
 * @returns {{
 *   items: Array<itemAnalysis>,
 *   summary: { n: number, k: number, mean: number, sd: number,
 *              kr20: number|null, kr21: number|null, decisions: object }
 * }}
 */
export function analyzeItems({ scoredMatrix, responseMatrix, answerKey, options, fraction = 0.27 }) {
  if (!Array.isArray(scoredMatrix) || scoredMatrix.length === 0) {
    throw new Error('scoredMatrix kosong')
  }
  const n = scoredMatrix.length
  const k = scoredMatrix[0].length

  // Total skor per siswa
  const totalScores = scoredMatrix.map(row => row.reduce((s, x) => s + Number(x), 0))
  const meanT = totalScores.reduce((s, t) => s + t, 0) / n
  const varT = totalScores.reduce((s, t) => s + (t - meanT) ** 2, 0) / n
  const sdT = Math.sqrt(varT)

  const items = []
  for (let j = 0; j < k; j++) {
    const col = scoredMatrix.map(row => Number(row[j]))
    const p = difficultyIndex(col)
    const d = discriminationIndex(col, totalScores, fraction)
    const rpb = pointBiserial(col, totalScores)
    const rpbCorr = pointBiserialCorrected(col, totalScores)

    const item = {
      no: j + 1,
      p,
      d,
      rpb,
      rpbCorrected: rpbCorr,
      categoryP: categorizeDifficulty(p),
      categoryD: categorizeDiscrimination(d),
      decision: decisionForItem(p, d),
    }

    if (responseMatrix && answerKey && options) {
      const responses = responseMatrix.map(row => row[j])
      item.distractors = distractorAnalysis(responses, totalScores, answerKey[j], options, fraction)
    }

    items.push(item)
  }

  // Ringkasan
  const decisionCounts = items.reduce((acc, it) => {
    acc[it.decision] = (acc[it.decision] || 0) + 1
    return acc
  }, {})

  return {
    items,
    summary: {
      n, k,
      mean: meanT,
      sd: sdT,
      meanProportion: meanT / k,  // mean P keseluruhan
      kr20: kr20(scoredMatrix),
      kr21: kr21(scoredMatrix),
      decisions: decisionCounts,
    },
  }
}

/**
 * Aturan keputusan butir (umum di buku evaluasi pendidikan Indonesia):
 *   - "buang"   : daya pembeda jelek atau terlalu mudah/sukar ekstrem
 *   - "revisi"  : daya pembeda cukup tapi rendah, atau P di luar ideal
 *   - "terima"  : daya pembeda ≥ 0.30 dan P ∈ [0.30, 0.80]
 */
export function decisionForItem(p, d) {
  if (p === null || d === null) return 'buang'
  if (d < 0.20)               return 'buang'
  if (p < 0.10 || p > 0.95)   return 'buang'
  if (d < 0.30)               return 'revisi'
  if (p < 0.30 || p > 0.80)   return 'revisi'
  return 'terima'
}

// ============================================================
// Helper: skor mentah (huruf) → matrix dichotomous
// ============================================================
/**
 * Konversi response matrix ('A','B',...) + answer key → 0/1 matrix.
 */
export function scoreResponses(responseMatrix, answerKey) {
  return responseMatrix.map(row =>
    row.map((ans, j) => (String(ans).trim().toUpperCase() === String(answerKey[j]).trim().toUpperCase() ? 1 : 0))
  )
}

// Assessment Report Generator
// =============================
// Pure functions untuk bikin narasi laporan kelas (Bab IV-style) dari hasil
// penilaian. Tidak ada dependency UI — pure data → text supaya gampang
// diuji & dipakai ulang.
//
// Output yang di-generate:
// - generateClassReport()   → object lengkap untuk page report (stats, narasi, table data)
// - generateStudentCard()   → object untuk per-student report card

/**
 * Hitung total nilai siswa berdasarkan rubrik (relative weight).
 */
function calcTotal(scores, rubrik) {
  if (!scores) return 0
  let total = 0, tw = 0
  rubrik.forEach(k => {
    if (scores[k.id]?.skor != null) {
      total += scores[k.id].skor * k.bobot
      tw += k.bobot
    }
  })
  return tw > 0 ? Number((total / tw).toFixed(2)) : 0
}

/** Status kategori per APA 7 / scoring 0-10. */
function statusOf(score) {
  if (score >= 8.5) return 'Sangat Baik'
  if (score >= 7.5) return 'Baik'
  if (score >= 6.0) return 'Cukup'
  if (score >= 5.0) return 'Perlu Perbaikan'
  return 'Belum Memenuhi'
}

/** Compute mean, std dev, min, max. */
function stats(arr) {
  if (!arr.length) return { mean: 0, sd: 0, min: 0, max: 0, n: 0 }
  const n = arr.length
  const mean = arr.reduce((a, b) => a + b, 0) / n
  const variance = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / n
  const sd = Math.sqrt(variance)
  return {
    mean: Number(mean.toFixed(2)),
    sd: Number(sd.toFixed(2)),
    min: Math.min(...arr),
    max: Math.max(...arr),
    n,
  }
}

/**
 * Generate narrative paragraf untuk laporan kelas — gaya Bab IV skripsi/laporan.
 * Bahasa Indonesia formal, ngga bombastis.
 */
function buildNarrative({ title, context, totalSiswa, statsAll, distribusi, top, bottom, kriteriaStats }) {
  const lulus = (distribusi['Sangat Baik'] || 0) + (distribusi['Baik'] || 0) + (distribusi['Cukup'] || 0)
  const persenLulus = totalSiswa > 0 ? ((lulus / totalSiswa) * 100).toFixed(1) : '0'

  const paragraf1 = `Penilaian terhadap ${totalSiswa} siswa pada tugas "${title || 'Tugas'}" ${context ? `dalam konteks ${context.toLowerCase()} ` : ''}menghasilkan rata-rata kelas sebesar ${statsAll.mean} (SD = ${statsAll.sd}) pada skala 0–10. Nilai tertinggi yang dicapai adalah ${statsAll.max}, sedangkan nilai terendah adalah ${statsAll.min}. Sebaran data menunjukkan ${statsAll.sd < 1 ? 'kelas relatif homogen' : statsAll.sd < 2 ? 'variabilitas sedang antar siswa' : 'variabilitas tinggi antar siswa'}, dengan deviasi standar ${statsAll.sd}.`

  const paragraf2 = `Berdasarkan kategori kelulusan (skor ≥ 6.0), sebanyak ${lulus} siswa (${persenLulus}%) dinyatakan memenuhi standar minimum penilaian. Distribusi mendetail menunjukkan ${(distribusi['Sangat Baik'] || 0)} siswa berada pada kategori Sangat Baik, ${(distribusi['Baik'] || 0)} siswa Baik, ${(distribusi['Cukup'] || 0)} siswa Cukup, ${(distribusi['Perlu Perbaikan'] || 0)} siswa Perlu Perbaikan, dan ${(distribusi['Belum Memenuhi'] || 0)} siswa Belum Memenuhi standar.`

  // Identifikasi kriteria terlemah & terkuat (rata-rata terendah/tertinggi)
  const sortedKr = [...kriteriaStats].sort((a, b) => a.mean - b.mean)
  const terlemah = sortedKr[0]
  const terkuat = sortedKr[sortedKr.length - 1]

  const paragraf3 = kriteriaStats.length > 1
    ? `Analisis per kriteria menunjukkan bahwa aspek "${terkuat.nama}" memiliki rata-rata tertinggi (${terkuat.mean}), yang mengindikasikan kekuatan kelas pada dimensi ini. Sebaliknya, aspek "${terlemah.nama}" memiliki rata-rata terendah (${terlemah.mean}), sehingga perlu menjadi fokus pembelajaran berikutnya.`
    : `Analisis kriteria menunjukkan rata-rata pada aspek "${kriteriaStats[0]?.nama || '-'}" sebesar ${kriteriaStats[0]?.mean ?? '-'}.`

  const namaTop = top.slice(0, 3).map((s, i) => `${i + 1}) ${s.name} (${s.total})`).join(', ')
  const namaBottom = bottom.slice(0, 3).map((s, i) => `${i + 1}) ${s.name} (${s.total})`).join(', ')

  const paragraf4 = totalSiswa >= 3
    ? `Tiga siswa dengan capaian tertinggi adalah ${namaTop}. Sementara tiga siswa yang memerlukan perhatian khusus adalah ${namaBottom}. Bagi siswa pada kelompok kedua, direkomendasikan pendampingan tambahan terutama pada aspek "${terlemah?.nama || 'kriteria yang masih lemah'}".`
    : ''

  return [paragraf1, paragraf2, paragraf3, paragraf4].filter(Boolean).join('\n\n')
}

/**
 * Generate full class report — output siap dipakai di Report page.
 *
 * @param {object} args
 * @param {Array} args.results - hasil penilaian per siswa
 * @param {Array} args.rubrik - rubrik kriteria
 * @param {string} args.title - judul tugas
 * @param {string} args.context - konteks penilaian
 * @returns {object}
 */
export function generateClassReport({ results, rubrik, title = 'Tugas', context = '' }) {
  const scoredResults = results
    .filter(r => r.scores)
    .map(r => ({
      id: r.id,
      name: r.name || 'Tanpa Nama',
      total: calcTotal(r.scores, rubrik),
      scores: r.scores,
      kesimpulan: r.kesimpulan || '',
    }))

  const totals = scoredResults.map(s => s.total)
  const statsAll = stats(totals)

  // Distribusi 5 kategori
  const distribusi = {
    'Sangat Baik': 0, 'Baik': 0, 'Cukup': 0, 'Perlu Perbaikan': 0, 'Belum Memenuhi': 0,
  }
  scoredResults.forEach(s => { distribusi[statusOf(s.total)]++ })

  // Top & bottom (sort desc, take 3 from each end)
  const sorted = [...scoredResults].sort((a, b) => b.total - a.total)
  const top = sorted.slice(0, 3)
  const bottom = sorted.slice(-3).reverse()

  // Stats per kriteria
  const kriteriaStats = rubrik.map(k => {
    const skorList = scoredResults
      .map(r => r.scores[k.id]?.skor)
      .filter(s => s != null && !Number.isNaN(s))
    const st = stats(skorList)
    return {
      id: k.id,
      nama: k.nama,
      bobot: k.bobot,
      mean: st.mean,
      sd: st.sd,
      min: st.min,
      max: st.max,
    }
  })

  const narrative = buildNarrative({
    title,
    context,
    totalSiswa: scoredResults.length,
    statsAll,
    distribusi,
    top,
    bottom,
    kriteriaStats,
  })

  // Tabel data: row per siswa, kolom = kriteria + total + status
  const tableRows = scoredResults.map((s, i) => ({
    no: i + 1,
    name: s.name,
    perKriteria: rubrik.map(k => ({
      id: k.id,
      nama: k.nama,
      skor: s.scores[k.id]?.skor ?? null,
    })),
    total: s.total,
    status: statusOf(s.total),
  }))

  return {
    meta: {
      title,
      context,
      generatedAt: new Date().toISOString(),
      generatedAtLocal: new Date().toLocaleString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
    },
    summary: {
      totalSiswa: scoredResults.length,
      ...statsAll,
      lulus: distribusi['Sangat Baik'] + distribusi['Baik'] + distribusi['Cukup'],
      tidakLulus: distribusi['Perlu Perbaikan'] + distribusi['Belum Memenuhi'],
    },
    distribusi,
    kriteriaStats,
    top,
    bottom,
    tableRows,
    narrative,
    rubrik,
  }
}

/**
 * Generate per-student report card.
 */
export function generateStudentCard({ student, rubrik, title = 'Tugas', context = '' }) {
  if (!student?.scores) return null
  const total = calcTotal(student.scores, rubrik)
  const status = statusOf(total)

  const perKriteria = rubrik.map(k => {
    const s = student.scores[k.id] || {}
    return {
      nama: k.nama,
      bobot: k.bobot,
      deskripsi: k.deskripsi,
      skor: s.skor ?? null,
      komentar: s.komentar || '',
      kontribusi: s.skor != null ? Number(((s.skor * k.bobot) / 100).toFixed(2)) : 0,
    }
  })

  return {
    meta: {
      title,
      context,
      studentName: student.name || 'Tanpa Nama',
      generatedAtLocal: new Date().toLocaleString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
      }),
    },
    total,
    status,
    perKriteria,
    kesimpulan: student.kesimpulan || '',
  }
}

// Export internal helpers for test/reuse
export { calcTotal, statusOf, stats }

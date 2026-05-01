// Client untuk AI rubrik generation.
// Reuse legacy /api/assess endpoint dengan messages mode supaya tidak perlu
// bikin endpoint baru di Vercel. Output: array kriteria { nama, deskripsi, bobot }.
//
// Fallback: kalau API tidak respond, generate template lokal berdasarkan tipe tugas.

const API_ENDPOINTS = [
  '/api/assess',
  'http://localhost:3000/api/assess',
]

const SYSTEM_PROMPT = `Kamu adalah ahli pendidikan & asesmen. Tugasmu membuat rubrik penilaian holistik untuk tugas akademik.

Aturan output:
- Return HANYA JSON valid, tanpa markdown fence, tanpa komentar.
- Schema: {"kriteria": [{"nama": "...", "deskripsi": "...", "bobot": <number>}, ...]}
- Bobot adalah angka 0-100. Total seluruh bobot HARUS = 100.
- Jumlah kriteria: 3-5 (default 4) tergantung kompleksitas.
- Bahasa Indonesia formal, ringkas (deskripsi max 2 kalimat).
- Kriteria saling exclusive, tidak overlapping.
- Sesuaikan dengan level pendidikan (SD/SMP/SMA/Universitas).`

const buildUserPrompt = ({ topik, mataPelajaran, level, tipeTugas, jumlahKriteria }) => `
Buatkan rubrik penilaian untuk tugas berikut:
- Topik / Soal: ${topik || '(tidak disebutkan)'}
- Mata Pelajaran: ${mataPelajaran || 'umum'}
- Jenjang: ${level || 'SMA/Universitas'}
- Tipe Tugas: ${tipeTugas || 'essay'}
- Jumlah kriteria yang diinginkan: ${jumlahKriteria || 4}

Output JSON sesuai schema. Pastikan total bobot = 100.
`

/**
 * Generate rubrik via AI.
 * @param {Object} params - { topik, mataPelajaran, level, tipeTugas, jumlahKriteria }
 * @returns {Promise<{ ok: boolean, kriteria?: Array, error?: string, provider?: string, fallback?: boolean }>}
 */
export async function generateRubrik(params) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user',   content: buildUserPrompt(params) },
  ]

  let lastError
  for (const url of API_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, max_tokens: 1200 }),
      })
      const data = await res.json()
      if (!res.ok) {
        lastError = data.error || `HTTP ${res.status}`
        if (res.status === 503) break
        continue
      }
      // Legacy mode: { content: [{ type: 'text', text: '...' }], provider }
      const text = data.content?.[0]?.text || data.content || ''
      const parsed = parseRubrikJSON(text)
      if (!parsed) {
        lastError = 'Format JSON dari AI tidak bisa di-parse'
        continue
      }
      const validated = validateAndNormalize(parsed)
      if (!validated.ok) {
        lastError = validated.error
        continue
      }
      return { ok: true, kriteria: validated.kriteria, provider: data.provider }
    } catch (e) {
      lastError = e.message
    }
  }

  // Fallback: deterministic template berdasarkan tipe tugas
  const fallback = generateTemplate(params)
  if (fallback) {
    return { ok: true, kriteria: fallback, fallback: true, apiError: lastError }
  }
  return { ok: false, error: lastError || 'AI tidak merespons' }
}

// =====================================================================
// Helpers
// =====================================================================

function parseRubrikJSON(text) {
  if (!text) return null
  // Try direct parse
  try { return JSON.parse(text) } catch {}
  // Try strip markdown code fence
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/i)
  if (fenced) {
    try { return JSON.parse(fenced[1]) } catch {}
  }
  // Try first { ... last }
  const first = text.indexOf('{')
  const last  = text.lastIndexOf('}')
  if (first >= 0 && last > first) {
    try { return JSON.parse(text.slice(first, last + 1)) } catch {}
  }
  return null
}

function validateAndNormalize(parsed) {
  const arr = Array.isArray(parsed) ? parsed
            : Array.isArray(parsed.kriteria) ? parsed.kriteria
            : Array.isArray(parsed.rubrik) ? parsed.rubrik
            : null
  if (!arr || arr.length === 0) {
    return { ok: false, error: 'AI tidak mengembalikan array kriteria' }
  }

  const cleaned = arr
    .filter(k => k && (k.nama || k.name))
    .map(k => ({
      nama: String(k.nama || k.name || '').trim(),
      deskripsi: String(k.deskripsi || k.description || k.desc || '').trim(),
      bobot: Math.max(0, Math.min(100, Number(k.bobot ?? k.weight ?? 0))),
    }))

  if (cleaned.length === 0) {
    return { ok: false, error: 'Kriteria tidak valid (semua kosong)' }
  }

  // Normalize bobot ke total 100
  const totalBobot = cleaned.reduce((s, k) => s + k.bobot, 0)
  if (totalBobot === 0) {
    // Fallback: bagi rata
    const each = Math.floor(100 / cleaned.length)
    cleaned.forEach((k, i) => { k.bobot = i === cleaned.length - 1 ? 100 - each * (cleaned.length - 1) : each })
  } else if (Math.abs(totalBobot - 100) > 0.5) {
    // Scale ke 100
    const scale = 100 / totalBobot
    cleaned.forEach(k => { k.bobot = Math.round(k.bobot * scale) })
    // Fix rounding error
    const newTotal = cleaned.reduce((s, k) => s + k.bobot, 0)
    if (newTotal !== 100) {
      cleaned[cleaned.length - 1].bobot += (100 - newTotal)
    }
  }

  return { ok: true, kriteria: cleaned }
}

// Template fallback kalau AI mati
function generateTemplate({ tipeTugas = 'essay', level = 'SMA' }) {
  const templates = {
    essay: [
      { nama: 'Pemahaman Konten',   deskripsi: 'Akurasi & kedalaman pemahaman terhadap topik yang dibahas', bobot: 30 },
      { nama: 'Argumentasi & Logika', deskripsi: 'Kekuatan argumen, koherensi alur berpikir, & dukungan bukti', bobot: 30 },
      { nama: 'Struktur & Organisasi', deskripsi: 'Pengaturan paragraf, transisi antar ide, & alur penulisan', bobot: 20 },
      { nama: 'Bahasa & Mekanika',   deskripsi: 'Tata bahasa, ejaan, kosa kata, & gaya penulisan formal', bobot: 20 },
    ],
    presentasi: [
      { nama: 'Penguasaan Materi', deskripsi: 'Pemahaman mendalam & kemampuan menjawab pertanyaan',           bobot: 35 },
      { nama: 'Penyampaian',       deskripsi: 'Artikulasi, kontak mata, intonasi, & penggunaan visual aid',    bobot: 30 },
      { nama: 'Struktur Presentasi', deskripsi: 'Pembukaan, alur isi, kesimpulan, & manajemen waktu',           bobot: 20 },
      { nama: 'Kreativitas & Slide', deskripsi: 'Kualitas desain slide & kreativitas penyampaian',              bobot: 15 },
    ],
    laporan: [
      { nama: 'Konten & Akurasi',  deskripsi: 'Ketepatan data, fakta, & analisis yang disajikan',              bobot: 35 },
      { nama: 'Metodologi',        deskripsi: 'Kejelasan metode, instrumen, & prosedur yang digunakan',        bobot: 25 },
      { nama: 'Analisis & Pembahasan', deskripsi: 'Kedalaman interpretasi & keterkaitan dengan teori',         bobot: 25 },
      { nama: 'Format & Sistematika', deskripsi: 'Sistematika penulisan, sitasi, & format laporan',            bobot: 15 },
    ],
    proyek: [
      { nama: 'Hasil Akhir',       deskripsi: 'Kualitas & fungsionalitas produk/karya yang dihasilkan',        bobot: 40 },
      { nama: 'Proses Pengerjaan', deskripsi: 'Perencanaan, eksekusi, & pemecahan masalah selama proyek',      bobot: 25 },
      { nama: 'Kreativitas & Inovasi', deskripsi: 'Orisinalitas ide & nilai tambah yang ditawarkan',           bobot: 20 },
      { nama: 'Refleksi & Dokumentasi', deskripsi: 'Kemampuan refleksi diri & kelengkapan dokumentasi',         bobot: 15 },
    ],
  }
  return templates[String(tipeTugas).toLowerCase()] || templates.essay
}

export const TIPE_TUGAS = [
  { id: 'essay',       label: 'Essay / Uraian'    },
  { id: 'laporan',     label: 'Laporan / Makalah' },
  { id: 'presentasi',  label: 'Presentasi'        },
  { id: 'proyek',      label: 'Proyek / Karya'    },
]

export const LEVEL_PENDIDIKAN = [
  { id: 'SD',          label: 'SD'         },
  { id: 'SMP',         label: 'SMP'        },
  { id: 'SMA',         label: 'SMA / SMK'  },
  { id: 'Universitas', label: 'Universitas / S1+' },
]

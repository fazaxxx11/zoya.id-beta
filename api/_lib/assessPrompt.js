// Prompt builder & response validator untuk AI assessment.
// Dipakai oleh api/assess.js (Vercel) dan server.js (dev local).

/**
 * Build prompt terstruktur untuk minta AI nilai jawaban siswa.
 *
 * @param {object} payload
 * @param {Array<{id:string, nama:string, deskripsi?:string, bobot:number}>} payload.rubrik
 * @param {string} payload.jawaban
 * @param {string} payload.studentName
 * @param {string} payload.title
 * @param {string} [payload.context]
 * @returns {{ system:string, user:string }}
 */
export function buildAssessPrompt({ rubrik, jawaban, studentName, title, context }) {
  if (!Array.isArray(rubrik) || rubrik.length === 0) {
    throw new Error('Rubrik kosong')
  }
  if (typeof jawaban !== 'string' || !jawaban.trim()) {
    throw new Error('Jawaban kosong')
  }

  const rubrikStr = rubrik
    .map((k, i) => `${i + 1}. [${k.id}] ${k.nama}${k.deskripsi ? ` - ${k.deskripsi}` : ''} (bobot ${k.bobot}%)`)
    .join('\n')

  const schemaExample = {
    scores: rubrik.reduce((acc, k) => {
      acc[k.id] = { skor: 8, komentar: 'penjelasan kekuatan & kelemahan terkait kriteria ini' }
      return acc
    }, {}),
    kesimpulan: 'kesimpulan singkat 2-3 kalimat',
  }

  const system = [
    'Anda adalah asisten penilai (rater) yang adil, objektif, dan konsisten.',
    'Tugas: menilai jawaban tertulis siswa berdasarkan rubrik yang diberikan.',
    'PERATURAN PENTING:',
    '- Beri skor integer 1-10 untuk setiap kriteria (1 sangat buruk, 10 sempurna).',
    '- Komentar harus spesifik mengacu pada isi jawaban siswa, bukan generik.',
    '- Jangan menambah / mengurangi kriteria di luar yang diberikan.',
    '- Output HARUS valid JSON sesuai schema. Tidak ada teks lain di luar JSON.',
  ].join('\n')

  const user = [
    `Tugas: "${title || '(tanpa judul)'}"`,
    context ? `Konteks: ${context}` : null,
    '',
    'Rubrik (id wajib dipakai sebagai key di output):',
    rubrikStr,
    '',
    `Nama siswa: ${studentName || '(tanpa nama)'}`,
    'Jawaban siswa:',
    '"""',
    jawaban,
    '"""',
    '',
    'Output schema (contoh, isi sesuai jawaban siswa):',
    JSON.stringify(schemaExample, null, 2),
    '',
    'Return ONLY valid JSON, no other text.',
  ].filter(Boolean).join('\n')

  return { system, user }
}

/**
 * Validasi response AI: pastikan setiap kriteria di rubrik ada di scores,
 * skor integer 1-10, komentar string non-empty, kesimpulan string.
 *
 * @returns {{ valid:boolean, error?:string, scores?:object, kesimpulan?:string }}
 */
export function validateAssessResponse(parsed, rubrik) {
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'Response bukan object' }
  }
  if (!parsed.scores || typeof parsed.scores !== 'object') {
    return { valid: false, error: 'Field scores hilang' }
  }

  const scores = {}
  for (const kr of rubrik) {
    const item = parsed.scores[kr.id]
    if (!item || typeof item !== 'object') {
      return { valid: false, error: `Kriteria ${kr.id} (${kr.nama}) tidak dinilai` }
    }
    const skor = Number(item.skor)
    if (!Number.isFinite(skor) || skor < 1 || skor > 10) {
      return { valid: false, error: `Skor ${kr.id} di luar range 1-10: ${item.skor}` }
    }
    const komentar = typeof item.komentar === 'string' ? item.komentar.trim() : ''
    if (!komentar) {
      return { valid: false, error: `Komentar ${kr.id} kosong` }
    }
    scores[kr.id] = { skor: Math.round(skor * 10) / 10, komentar }
  }

  const kesimpulan = typeof parsed.kesimpulan === 'string' ? parsed.kesimpulan.trim() : ''
  return { valid: true, scores, kesimpulan }
}

/**
 * Coba parse JSON dari response yang mungkin ada wrapper markdown.
 */
export function parseJSONLoose(raw) {
  if (typeof raw !== 'string') return null
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  // Fallback: cari blok { ... } pertama
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch {}
  }
  return null
}

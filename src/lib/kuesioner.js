// Kuesioner Builder — Local-only (Tier A)
// =========================================
// Data model + CRUD via localStorage. JSON export/import. Helpers untuk
// scoring (reverse-coded items) dan konversi responses → tabular CSV.
//
// Storage keys:
//   kuesioner_surveys    → array<Survey>
//   kuesioner_responses  → record<surveyId, Response[]>

const SURVEYS_KEY = 'kuesioner_surveys'
const RESPONSES_KEY = 'kuesioner_responses'

// ============================================================
// Types (JSDoc)
// ============================================================
/**
 * @typedef {'likert'|'multichoice'|'checkbox'|'short_text'|'long_text'|'number'|'rating'} ItemType
 *
 * @typedef Item
 * @property {string} id
 * @property {ItemType} type
 * @property {string} label
 * @property {string} [description]
 * @property {boolean} required
 * @property {string[]} [options]      // untuk multichoice/checkbox
 * @property {number} [scale]          // untuk likert/rating: 5, 7, 10
 * @property {string[]} [scaleLabels]  // mis. ['STS','TS','N','S','SS']
 * @property {boolean} [reverseCoded]  // Likert reverse
 *
 * @typedef Section
 * @property {string} id
 * @property {string} title
 * @property {string} [description]    // dimensi/konstruk
 * @property {Item[]} items
 *
 * @typedef Survey
 * @property {string} id
 * @property {string} title
 * @property {string} [description]
 * @property {Section[]} sections
 * @property {number} createdAt
 * @property {number} updatedAt
 *
 * @typedef Response
 * @property {string} id
 * @property {string} surveyId
 * @property {string} [respondentName]
 * @property {Record<string, any>} answers   // itemId → value
 * @property {number} submittedAt
 */

// ============================================================
// ID helper
// ============================================================
export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// ============================================================
// Factories
// ============================================================
export function newSurvey(title = 'Kuesioner Baru') {
  const now = Date.now()
  return {
    id: uid('srv'),
    title,
    description: '',
    sections: [newSection('Bagian 1')],
    createdAt: now,
    updatedAt: now,
  }
}

export function newSection(title = 'Bagian Baru') {
  return {
    id: uid('sec'),
    title,
    description: '',
    items: [],
  }
}

export function newItem(type = 'likert') {
  /** @type {Item} */
  const base = {
    id: uid('itm'),
    type,
    label: '',
    description: '',
    required: false,
  }
  if (type === 'likert') {
    return { ...base, scale: 5, scaleLabels: ['STS', 'TS', 'N', 'S', 'SS'], reverseCoded: false }
  }
  if (type === 'rating') {
    return { ...base, scale: 5 }
  }
  if (type === 'multichoice' || type === 'checkbox') {
    return { ...base, options: ['Opsi 1', 'Opsi 2'] }
  }
  return base
}

// ============================================================
// Validation
// ============================================================
export function validateSurvey(survey) {
  if (!survey.title?.trim()) return 'Judul kuesioner wajib diisi'
  if (!Array.isArray(survey.sections) || survey.sections.length === 0)
    return 'Minimal 1 bagian/seksi'
  let totalItems = 0
  for (const sec of survey.sections) {
    if (!sec.title?.trim()) return `Bagian ada yang belum punya judul`
    for (const it of sec.items) {
      if (!it.label?.trim()) return `Ada pertanyaan tanpa label di "${sec.title}"`
      if ((it.type === 'multichoice' || it.type === 'checkbox') &&
          (!it.options || it.options.length < 2))
        return `Pertanyaan "${it.label}" butuh minimal 2 opsi`
    }
    totalItems += sec.items.length
  }
  if (totalItems === 0) return 'Belum ada pertanyaan'
  return null
}

export function validateResponse(survey, answers) {
  for (const sec of survey.sections) {
    for (const it of sec.items) {
      if (it.required) {
        const v = answers[it.id]
        const empty = v === null || v === undefined || v === '' ||
                      (Array.isArray(v) && v.length === 0)
        if (empty) return `"${it.label}" wajib diisi`
      }
    }
  }
  return null
}

// ============================================================
// LocalStorage CRUD — surveys
// ============================================================
export function listSurveys() {
  try {
    return JSON.parse(localStorage.getItem(SURVEYS_KEY) || '[]')
  } catch { return [] }
}

export function getSurvey(id) {
  return listSurveys().find(s => s.id === id) || null
}

export function saveSurvey(survey) {
  const all = listSurveys()
  const idx = all.findIndex(s => s.id === survey.id)
  const updated = { ...survey, updatedAt: Date.now() }
  if (idx >= 0) all[idx] = updated
  else all.push(updated)
  localStorage.setItem(SURVEYS_KEY, JSON.stringify(all))
  return updated
}

export function deleteSurvey(id) {
  const all = listSurveys().filter(s => s.id !== id)
  localStorage.setItem(SURVEYS_KEY, JSON.stringify(all))
  // Hapus juga responses-nya
  const r = listAllResponses()
  delete r[id]
  localStorage.setItem(RESPONSES_KEY, JSON.stringify(r))
}

// ============================================================
// LocalStorage CRUD — responses
// ============================================================
function listAllResponses() {
  try {
    return JSON.parse(localStorage.getItem(RESPONSES_KEY) || '{}')
  } catch { return {} }
}

export function listResponses(surveyId) {
  return listAllResponses()[surveyId] || []
}

export function addResponse(surveyId, answers, respondentName = '') {
  const all = listAllResponses()
  const list = all[surveyId] || []
  /** @type {Response} */
  const resp = {
    id: uid('resp'),
    surveyId,
    respondentName: respondentName.trim() || `Responden ${list.length + 1}`,
    answers,
    submittedAt: Date.now(),
  }
  list.push(resp)
  all[surveyId] = list
  localStorage.setItem(RESPONSES_KEY, JSON.stringify(all))
  return resp
}

export function deleteResponse(surveyId, responseId) {
  const all = listAllResponses()
  if (!all[surveyId]) return
  all[surveyId] = all[surveyId].filter(r => r.id !== responseId)
  localStorage.setItem(RESPONSES_KEY, JSON.stringify(all))
}

export function clearResponses(surveyId) {
  const all = listAllResponses()
  delete all[surveyId]
  localStorage.setItem(RESPONSES_KEY, JSON.stringify(all))
}

// ============================================================
// Scoring helpers
// ============================================================
/**
 * Skor item Likert; reverse-coded otomatis dibalik (skala 1..N → N+1−x).
 */
export function scoreLikertItem(item, value) {
  const v = Number(value)
  if (!isFinite(v)) return null
  if (item.reverseCoded && item.scale) return item.scale + 1 - v
  return v
}

/**
 * Total skor per dimensi (section) untuk satu response.
 * Hanya item likert/rating yg dihitung. Item kosong di-skip.
 */
export function scoreResponseBySections(survey, response) {
  const out = {}
  for (const sec of survey.sections) {
    let total = 0, n = 0
    for (const it of sec.items) {
      if (it.type !== 'likert' && it.type !== 'rating') continue
      const raw = response.answers[it.id]
      const s = scoreLikertItem(it, raw)
      if (s !== null) { total += s; n += 1 }
    }
    out[sec.title] = { total, n, mean: n > 0 ? total / n : null }
  }
  return out
}

// ============================================================
// Export helpers
// ============================================================
export function exportSurveyJSON(survey) {
  const blob = new Blob([JSON.stringify(survey, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kuesioner_${survey.title.replace(/[^\w-]+/g, '_')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importSurveyJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const obj = JSON.parse(e.target.result)
        // Re-id supaya tidak bentrok dengan existing
        obj.id = uid('srv')
        obj.sections = (obj.sections || []).map(s => ({
          ...s,
          id: uid('sec'),
          items: (s.items || []).map(it => ({ ...it, id: uid('itm') })),
        }))
        obj.createdAt = Date.now()
        obj.updatedAt = Date.now()
        resolve(obj)
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

/**
 * Konversi responses → matrix tabular (header + rows) yang siap di-paste
 * ke Statistik untuk uji validitas/reliabilitas.
 *
 * @param {Survey} survey
 * @param {Response[]} responses
 * @param {{ applyReverse?: boolean }} [opts]
 * @returns {{ headers: string[], rows: any[][], itemMap: Record<string,Item> }}
 */
export function responsesToMatrix(survey, responses, opts = {}) {
  const applyReverse = opts.applyReverse !== false
  const items = []
  const itemMap = {}
  for (const sec of survey.sections) {
    for (const it of sec.items) {
      items.push({ section: sec.title, item: it })
      itemMap[it.id] = it
    }
  }

  const headers = ['Responden', ...items.map((x, i) => `Q${i + 1}_${slug(x.item.label)}`)]
  const rows = responses.map(resp => {
    const row = [resp.respondentName]
    for (const { item } of items) {
      const v = resp.answers[item.id]
      if (item.type === 'likert' && applyReverse) {
        row.push(scoreLikertItem(item, v))
      } else if (item.type === 'checkbox') {
        row.push(Array.isArray(v) ? v.join('; ') : '')
      } else {
        row.push(v ?? '')
      }
    }
    return row
  })
  return { headers, rows, itemMap }
}

function slug(s) {
  return String(s || '').toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 24) || 'item'
}

export function matrixToCSV({ headers, rows }) {
  const esc = v => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
}

// ============================================================
// Templates — survei kosong yang sudah punya struktur item
// ============================================================
/**
 * Bikin template "Likert Sederhana" — 1 dimensi, 5 item Likert 5-skala.
 * Cocok untuk pengguna baru yang baru pertama kali bikin angket.
 */
export function templateLikertSimple(title = 'Kuesioner Likert (5 item)') {
  const s = newSurvey(title)
  s.description = 'Template sederhana: 1 dimensi, 5 pertanyaan skala Likert 1–5 (STS–SS).'
  const sec = newSection('Pertanyaan Utama')
  sec.items = Array.from({ length: 5 }, (_, i) => ({
    ...newItem('likert'),
    label: `Pertanyaan ${i + 1}`,
    required: true,
  }))
  s.sections = [sec]
  return s
}

/**
 * Template "Kepuasan Pembelajaran" — 2 dimensi (Materi & Pengajar).
 */
export function templateKepuasan() {
  const s = newSurvey('Survei Kepuasan Pembelajaran')
  s.description = 'Template untuk evaluasi pembelajaran. Ada 2 dimensi: kualitas materi dan kualitas pengajar.'

  const sec0 = newSection('Demografi')
  sec0.items = [
    { ...newItem('multichoice'), label: 'Jenis Kelamin', options: ['Laki-laki', 'Perempuan'], required: true },
    { ...newItem('short_text'), label: 'Kelas / Angkatan' },
  ]

  const sec1 = newSection('Kualitas Materi')
  sec1.description = 'Materi yang disampaikan'
  sec1.items = [
    'Materi mudah dipahami.',
    'Materi sesuai dengan kebutuhan saya.',
    'Materi disampaikan dengan terstruktur.',
    'Tugas/latihan membantu pemahaman.',
  ].map(lbl => ({ ...newItem('likert'), label: lbl, required: true }))

  const sec2 = newSection('Kualitas Pengajar')
  sec2.description = 'Penilaian terhadap pengajar'
  sec2.items = [
    'Pengajar menjelaskan dengan jelas.',
    'Pengajar memberi kesempatan bertanya.',
    'Pengajar responsif terhadap pertanyaan.',
    'Pengajar menguasai materi dengan baik.',
  ].map(lbl => ({ ...newItem('likert'), label: lbl, required: true }))

  s.sections = [sec0, sec1, sec2]
  return s
}

/**
 * Template "Pre-test / Post-test Sikap" — 1 item rating.
 */
export function templateSingleRating() {
  const s = newSurvey('Rating Cepat')
  s.description = 'Template super-singkat: 1 pertanyaan rating bintang. Cocok untuk feedback kilat.'
  const sec = newSection('Pertanyaan')
  sec.items = [
    { ...newItem('rating'), label: 'Berikan rating Anda', required: true, scale: 5 },
    { ...newItem('long_text'), label: 'Komentar (opsional)' },
  ]
  s.sections = [sec]
  return s
}

export const SURVEY_TEMPLATES = [
  {
    id: 'likert_simple',
    name: 'Likert Sederhana',
    desc: '1 dimensi, 5 pertanyaan skala 1–5. Pas untuk pemula.',
    factory: () => templateLikertSimple(),
  },
  {
    id: 'kepuasan',
    name: 'Kepuasan Pembelajaran',
    desc: '2 dimensi (Materi & Pengajar) + demografi.',
    factory: () => templateKepuasan(),
  },
  {
    id: 'rating_quick',
    name: 'Rating Cepat',
    desc: '1 rating bintang + kolom komentar.',
    factory: () => templateSingleRating(),
  },
]

// ============================================================
// Demo factory — survei + responses fake untuk testing
// ============================================================
const NAMA_DEMO = [
  'Andi Saputra', 'Bunga Lestari', 'Candra Wijaya', 'Dewi Maharani',
  'Eko Prasetyo', 'Fitri Anggraini', 'Galih Ramadhan', 'Hesti Pertiwi',
  'Indra Kusuma', 'Joko Susilo', 'Kartika Sari', 'Lukman Hakim',
  'Maya Putri', 'Nanda Pratama', 'Olivia Damayanti',
]

/**
 * Bikin survei demo "Motivasi Belajar" + 15 responses dengan distribusi
 * Likert yang realistis (mostly 3-5 dengan sedikit noise).
 *
 * @returns {{ survey: Survey, responses: Response[] }}
 */
export function createDemoSurvey() {
  const survey = newSurvey('Survei Motivasi Belajar (Demo)')
  survey.description = 'Kuesioner demo untuk uji coba fitur. Berisi 10 item Likert (2 dimensi) + data demografi.'

  // Section 1: Demografi
  const sec0 = newSection('Demografi')
  sec0.items = [
    { ...newItem('multichoice'), label: 'Jenis Kelamin', options: ['Laki-laki', 'Perempuan'], required: true },
    { ...newItem('number'), label: 'Tingkat Kelas (10/11/12)', required: true },
  ]

  // Section 2: Motivasi Intrinsik (5 item, item terakhir reverse)
  const sec1 = newSection('Motivasi Intrinsik')
  sec1.description = 'Dorongan belajar dari dalam diri'
  const intrinsicLabels = [
    'Saya belajar karena ingin memahami materi.',
    'Saya merasa puas saat berhasil mengerjakan soal sulit.',
    'Saya tertarik mengeksplorasi topik baru di luar pelajaran.',
    'Saya merasa belajar adalah hal yang menyenangkan.',
    'Saya hanya belajar kalau ada ujian saja.', // reverse
  ]
  sec1.items = intrinsicLabels.map((lbl, i) => ({
    ...newItem('likert'),
    label: lbl,
    required: true,
    reverseCoded: i === intrinsicLabels.length - 1,
  }))

  // Section 3: Motivasi Ekstrinsik (5 item)
  const sec2 = newSection('Motivasi Ekstrinsik')
  sec2.description = 'Dorongan belajar dari faktor luar'
  const extrinsicLabels = [
    'Saya belajar agar mendapat nilai bagus.',
    'Saya belajar supaya dipuji orang tua/guru.',
    'Saya belajar supaya bisa masuk PTN/sekolah favorit.',
    'Saya belajar karena takut dimarahi kalau nilai jelek.',
    'Saya belajar agar tidak kalah dari teman-teman.',
  ]
  sec2.items = extrinsicLabels.map(lbl => ({
    ...newItem('likert'),
    label: lbl,
    required: true,
  }))

  survey.sections = [sec0, sec1, sec2]

  // Generate 15 fake responses
  const responses = []
  for (let i = 0; i < 15; i++) {
    /** @type {Record<string, any>} */
    const answers = {}
    // Demografi
    answers[sec0.items[0].id] = i % 2 === 0 ? 'Laki-laki' : 'Perempuan'
    answers[sec0.items[1].id] = 10 + (i % 3)
    // Intrinsik: bias ke 3-5 (mean ~3.8, SD ~0.9)
    sec1.items.forEach((it, k) => {
      const base = 3.5 + Math.random() * 1.5 - 0.4
      const noise = (Math.random() - 0.5) * 1.4
      let v = Math.round(base + noise)
      v = Math.max(1, Math.min(5, v))
      // kalau reverse, jawab sebagai "saya cuma belajar saat ujian" — biased rendah (= setelah reverse-decode = tinggi)
      if (it.reverseCoded) v = Math.max(1, Math.min(5, Math.round(2 + Math.random() * 1.5)))
      // sedikit responden yang motivasinya rendah (3 dari 15)
      if (i < 3) v = Math.max(1, v - 2)
      answers[it.id] = v
    })
    // Ekstrinsik: bias ke 3-4 (mean ~3.4)
    sec2.items.forEach(it => {
      const v = Math.max(1, Math.min(5, Math.round(2.8 + Math.random() * 1.8)))
      answers[it.id] = v
    })

    responses.push({
      id: uid('resp'),
      surveyId: survey.id,
      respondentName: NAMA_DEMO[i] || `Responden ${i + 1}`,
      answers,
      submittedAt: Date.now() - (15 - i) * 60_000,
    })
  }

  return { survey, responses }
}

/** Persist demo ke localStorage. */
export function seedDemoSurvey() {
  const { survey, responses } = createDemoSurvey()
  saveSurvey(survey)
  const all = listAllResponsesPub()
  all[survey.id] = responses
  localStorage.setItem(RESPONSES_KEY, JSON.stringify(all))
  return survey
}

// expose private listAllResponses via wrapper
function listAllResponsesPub() {
  try { return JSON.parse(localStorage.getItem(RESPONSES_KEY) || '{}') } catch { return {} }
}

// ============================================================
// Import responses dari CSV
// ============================================================
/**
 * Header CSV template = "Responden", lalu Q1_<slug>, Q2_<slug>, ...
 * (sama format-nya dengan output `responsesToMatrix`).
 * Ini supaya user bisa download → isi → upload kembali.
 */
export function buildResponsesTemplateCSV(survey) {
  const items = []
  for (const sec of survey.sections) for (const it of sec.items) items.push(it)
  const headers = ['Responden', ...items.map((it, i) => `Q${i + 1}_${slug(it.label)}`)]
  // Tambah baris contoh kosong + 1 baris hint per kolom
  const hint = ['(nama, opsional)']
  for (const it of items) {
    if (it.type === 'likert') hint.push(`1-${it.scale || 5}`)
    else if (it.type === 'rating') hint.push(`1-${it.scale || 5}`)
    else if (it.type === 'multichoice') hint.push((it.options || []).join('|'))
    else if (it.type === 'checkbox') hint.push(`pisah ; (opsi: ${(it.options || []).join('|')})`)
    else if (it.type === 'number') hint.push('angka')
    else hint.push('teks')
  }
  return matrixToCSV({
    headers,
    rows: [hint, ['', ...items.map(() => '')]],
  })
}

function parseCSVLine(line) {
  const out = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (c === ',' && !inQ) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out
}

/**
 * Parse CSV text → simpan sebagai responses untuk survey ini.
 * Header: kolom pertama = "Responden" (opsional, otomatis di-skip jika tidak ada),
 * kolom selanjutnya = item dalam urutan yang sama dengan `responsesToMatrix`.
 *
 * Kalau ada baris hint dari template (mis. baris berisi "1-5", "(nama, opsional)"),
 * baris tersebut otomatis di-skip.
 *
 * @returns {{ added: number, skipped: number, errors: string[] }}
 */
export function importResponsesFromCSV(survey, csvText) {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length < 2) return { added: 0, skipped: 0, errors: ['CSV kosong atau hanya header'] }

  const items = []
  for (const sec of survey.sections) for (const it of sec.items) items.push(it)

  const headers = parseCSVLine(lines[0])
  const hasNameCol = /^respond?en/i.test(headers[0] || '')
  const itemCount = items.length
  const expectedCols = (hasNameCol ? 1 : 0) + itemCount

  const errors = []
  if (headers.length < expectedCols) {
    errors.push(`Header CSV punya ${headers.length} kolom, butuh ${expectedCols} (1 nama + ${itemCount} pertanyaan)`)
  }

  // Detect & skip "hint row" dari template (baris yang berisi marker khas)
  const isHintRow = (cells) => {
    const joined = cells.join(' ').toLowerCase()
    return joined.includes('(nama, opsional)') ||
           /\b1-\d+\b/.test(joined) ||
           joined.includes('(opsi:')
  }

  const all = listAllResponsesPub()
  const list = all[survey.id] || []
  let added = 0, skipped = 0

  for (let li = 1; li < lines.length; li++) {
    const cells = parseCSVLine(lines[li])
    if (cells.every(c => c === '')) { skipped++; continue }
    if (isHintRow(cells)) { skipped++; continue }

    let nameIdx = -1, startIdx = 0
    if (hasNameCol) { nameIdx = 0; startIdx = 1 }

    const respondentName = (nameIdx >= 0 ? cells[nameIdx] : '').trim() ||
                           `Responden ${list.length + added + 1}`

    const answers = {}
    for (let i = 0; i < itemCount; i++) {
      const it = items[i]
      const raw = (cells[startIdx + i] || '').trim()
      if (raw === '') continue
      if (it.type === 'likert' || it.type === 'rating' || it.type === 'number') {
        const n = Number(raw)
        if (isFinite(n)) answers[it.id] = n
      } else if (it.type === 'checkbox') {
        // pisah dengan ; atau ,
        answers[it.id] = raw.split(/[;|]/).map(x => x.trim()).filter(Boolean)
      } else {
        answers[it.id] = raw
      }
    }

    // Skip kalau benar-benar tidak ada jawaban
    if (Object.keys(answers).length === 0) { skipped++; continue }

    list.push({
      id: uid('resp'),
      surveyId: survey.id,
      respondentName,
      answers,
      submittedAt: Date.now() + added,  // pseudo-ordering
    })
    added++
  }

  all[survey.id] = list
  localStorage.setItem(RESPONSES_KEY, JSON.stringify(all))
  return { added, skipped, errors }
}

export function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

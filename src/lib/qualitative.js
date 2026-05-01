// ============================================================
// Qualitative Analysis Library
// ============================================================
// Untuk analisis data wawancara, observasi, atau dokumen kualitatif:
//   - Tokenisasi & word frequency (dengan stopwords ID + EN)
//   - Codebook management (skema kode + definisi)
//   - Inter-rater reliability: Cohen's kappa, percent agreement
//   - Co-occurrence sederhana antar kode

// ============================================================
// Stopwords (Indonesia + English umum)
// ============================================================
export const STOPWORDS_ID = new Set([
  'yang', 'di', 'dan', 'atau', 'tapi', 'tetapi', 'untuk', 'dengan', 'pada',
  'dari', 'ke', 'oleh', 'akan', 'sudah', 'telah', 'belum', 'tidak', 'bukan',
  'jika', 'kalau', 'maka', 'karena', 'sebab', 'agar', 'supaya', 'walau',
  'walaupun', 'meski', 'meskipun', 'saat', 'ketika', 'saya', 'aku', 'kamu',
  'anda', 'kita', 'kami', 'mereka', 'dia', 'ia', 'nya', 'mu', 'ku',
  'ini', 'itu', 'tersebut', 'adalah', 'ialah', 'merupakan', 'juga', 'pun',
  'lah', 'kah', 'tah', 'sangat', 'lebih', 'paling', 'sekali', 'banyak',
  'sedikit', 'beberapa', 'semua', 'setiap', 'masing', 'satu', 'dua',
  'pertama', 'sebagai', 'menjadi', 'apa', 'siapa', 'mana', 'kapan',
  'bagaimana', 'kenapa', 'mengapa', 'agak', 'hanya', 'cuma', 'saja',
  'masih', 'sedang', 'lagi', 'pula', 'serta', 'bahwa', 'jadi',
  'demikian', 'kemudian', 'lalu', 'setelah', 'sebelum', 'sambil',
  'antara', 'dalam', 'luar', 'tanpa', 'sama', 'lain',
])

export const STOPWORDS_EN = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
  'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
  'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
  'and', 'or', 'but', 'if', 'then', 'so', 'because', 'as', 'until',
  'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to',
  'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
  'again', 'further', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'not', 'only', 'own', 'same', 'than', 'too',
  'very', 'just', 'now', 'also',
])

// ============================================================
// Tokenizer
// ============================================================
/**
 * Tokenisasi sederhana: lowercase, hapus tanda baca, split per whitespace.
 * Buang token yang terlalu pendek (default <2) dan stopwords.
 */
export function tokenize(text, opts = {}) {
  const {
    minLength = 2,
    removeStopwords = true,
    languages = ['id', 'en'],
    customStopwords = [],
  } = opts

  if (!text || typeof text !== 'string') return []

  // Lowercase + hapus karakter non-alphanumeric (kecuali whitespace dan tanda hubung dalam kata)
  const cleaned = text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return []

  let tokens = cleaned.split(/\s+/).filter(t => t.length >= minLength)

  if (removeStopwords) {
    const stop = new Set([...customStopwords])
    if (languages.includes('id')) STOPWORDS_ID.forEach(w => stop.add(w))
    if (languages.includes('en')) STOPWORDS_EN.forEach(w => stop.add(w))
    tokens = tokens.filter(t => !stop.has(t))
  }

  return tokens
}

/**
 * Word frequency analysis. Returns Array<{word, count, percent}> sorted desc.
 */
export function wordFrequency(text, opts = {}) {
  const tokens = tokenize(text, opts)
  if (tokens.length === 0) return []

  const counts = new Map()
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1)

  const total = tokens.length
  const arr = Array.from(counts.entries()).map(([word, count]) => ({
    word,
    count,
    percent: (count / total) * 100,
  }))
  arr.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
  return arr
}

/**
 * Bigram frequency (frasa 2 kata berurutan, setelah stopwords removal).
 */
export function bigramFrequency(text, opts = {}) {
  const tokens = tokenize(text, opts)
  if (tokens.length < 2) return []

  const counts = new Map()
  for (let i = 0; i < tokens.length - 1; i++) {
    const bg = tokens[i] + ' ' + tokens[i + 1]
    counts.set(bg, (counts.get(bg) || 0) + 1)
  }

  const arr = Array.from(counts.entries()).map(([bigram, count]) => ({
    bigram, count,
  }))
  arr.sort((a, b) => b.count - a.count || a.bigram.localeCompare(b.bigram))
  return arr
}

// ============================================================
// Cohen's Kappa — inter-rater reliability
// ============================================================
/**
 * Cohen's kappa untuk dua coder pada n item.
 * Setiap item punya kategori dari coder1 dan coder2.
 *
 *   κ = (Po - Pe) / (1 - Pe)
 *
 * di mana:
 *   Po = observed agreement (proportion same)
 *   Pe = expected agreement by chance
 *
 * Interpretasi (Landis & Koch, 1977):
 *   < 0.00  : poor
 *   0.00-0.20: slight
 *   0.21-0.40: fair
 *   0.41-0.60: moderate
 *   0.61-0.80: substantial
 *   0.81-1.00: almost perfect
 *
 * @param {Array<string|number>} ratingsA - n labels dari coder A
 * @param {Array<string|number>} ratingsB - n labels dari coder B
 * @returns {{ kappa, observedAgreement, expectedAgreement, n,
 *             categories, confusionMatrix, interpretation }}
 */
export function cohensKappa(ratingsA, ratingsB) {
  if (!Array.isArray(ratingsA) || !Array.isArray(ratingsB)) {
    throw new Error('ratingsA dan ratingsB harus array')
  }
  if (ratingsA.length !== ratingsB.length) {
    throw new Error(`Panjang berbeda: A=${ratingsA.length}, B=${ratingsB.length}`)
  }
  const n = ratingsA.length
  if (n === 0) throw new Error('Array kosong')

  // Collect all unique categories
  const categories = Array.from(new Set([...ratingsA, ...ratingsB])).sort()
  const k = categories.length
  const idx = new Map(categories.map((c, i) => [c, i]))

  // Build confusion matrix
  const matrix = Array.from({ length: k }, () => new Array(k).fill(0))
  for (let i = 0; i < n; i++) {
    matrix[idx.get(ratingsA[i])][idx.get(ratingsB[i])]++
  }

  // Observed agreement
  let observedAgreementCount = 0
  for (let i = 0; i < k; i++) observedAgreementCount += matrix[i][i]
  const observedAgreement = observedAgreementCount / n

  // Marginal totals
  const rowTotals = matrix.map(row => row.reduce((s, x) => s + x, 0))
  const colTotals = categories.map((_, j) => matrix.reduce((s, row) => s + row[j], 0))

  // Expected agreement by chance
  let expectedAgreement = 0
  for (let i = 0; i < k; i++) {
    expectedAgreement += (rowTotals[i] / n) * (colTotals[i] / n)
  }

  const kappa = expectedAgreement === 1
    ? 1
    : (observedAgreement - expectedAgreement) / (1 - expectedAgreement)

  return {
    kappa,
    observedAgreement,
    expectedAgreement,
    n,
    categories,
    confusionMatrix: matrix,
    interpretation: interpretKappa(kappa),
  }
}

export function interpretKappa(k) {
  if (k < 0)        return 'poor'
  if (k <= 0.20)    return 'slight'
  if (k <= 0.40)    return 'fair'
  if (k <= 0.60)    return 'moderate'
  if (k <= 0.80)    return 'substantial'
  return 'almost_perfect'
}

export function interpretKappaID(k) {
  return {
    poor:           'sangat rendah / tidak ada kesepakatan',
    slight:         'rendah',
    fair:           'cukup',
    moderate:       'sedang',
    substantial:    'kuat',
    almost_perfect: 'hampir sempurna',
  }[interpretKappa(k)]
}

// ============================================================
// Percent agreement (simpler than kappa, useful for quick check)
// ============================================================
export function percentAgreement(ratingsA, ratingsB) {
  if (ratingsA.length !== ratingsB.length || ratingsA.length === 0) return null
  let agree = 0
  for (let i = 0; i < ratingsA.length; i++) {
    if (ratingsA[i] === ratingsB[i]) agree++
  }
  return agree / ratingsA.length
}

// ============================================================
// Codebook + Coding storage
// ============================================================
const CODEBOOK_KEY = 'qual_codebook_v1'
const DOCUMENTS_KEY = 'qual_documents_v1'
const CODINGS_KEY = 'qual_codings_v1'

export function newCode(label = '', color = '#6366f1') {
  return {
    id: 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    label,
    color,
    description: '',
    examples: [],
    createdAt: Date.now(),
  }
}

export function newDocument(title = '', text = '') {
  return {
    id: 'd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    title,
    text,
    source: '',
    interviewee: '',
    date: '',
    createdAt: Date.now(),
  }
}

export function listCodes() {
  if (typeof localStorage === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(CODEBOOK_KEY) || '[]') } catch { return [] }
}
export function saveCode(code) {
  const all = listCodes()
  const idx = all.findIndex(c => c.id === code.id)
  if (idx >= 0) all[idx] = code; else all.push(code)
  localStorage.setItem(CODEBOOK_KEY, JSON.stringify(all))
  return code
}
export function deleteCode(id) {
  const all = listCodes().filter(c => c.id !== id)
  localStorage.setItem(CODEBOOK_KEY, JSON.stringify(all))
}

export function listDocuments() {
  if (typeof localStorage === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || '[]') } catch { return [] }
}
export function saveDocument(doc) {
  const all = listDocuments()
  const idx = all.findIndex(d => d.id === doc.id)
  if (idx >= 0) all[idx] = doc; else all.push(doc)
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(all))
  return doc
}
export function deleteDocument(id) {
  const all = listDocuments().filter(d => d.id !== id)
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(all))
  // Also delete related codings
  const codings = listCodings().filter(c => c.documentId !== id)
  localStorage.setItem(CODINGS_KEY, JSON.stringify(codings))
}

/**
 * Codings: array of { id, documentId, codeId, segment (text), start, end, memo }
 */
export function listCodings(documentId = null) {
  if (typeof localStorage === 'undefined') return []
  try {
    const all = JSON.parse(localStorage.getItem(CODINGS_KEY) || '[]')
    return documentId ? all.filter(c => c.documentId === documentId) : all
  } catch { return [] }
}

export function saveCoding(coding) {
  const all = listCodings()
  const c = {
    id: coding.id || ('cd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6)),
    ...coding,
    createdAt: coding.createdAt || Date.now(),
  }
  const idx = all.findIndex(x => x.id === c.id)
  if (idx >= 0) all[idx] = c; else all.push(c)
  localStorage.setItem(CODINGS_KEY, JSON.stringify(all))
  return c
}

export function deleteCoding(id) {
  const all = listCodings().filter(c => c.id !== id)
  localStorage.setItem(CODINGS_KEY, JSON.stringify(all))
}

// ============================================================
// Code occurrence summary
// ============================================================
/**
 * Hitung berapa kali tiap code muncul, di berapa dokumen.
 */
export function codeStats(codes, codings) {
  return codes.map(code => {
    const related = codings.filter(c => c.codeId === code.id)
    const docSet = new Set(related.map(c => c.documentId))
    return {
      ...code,
      occurrences: related.length,
      documentCount: docSet.size,
      segments: related,
    }
  }).sort((a, b) => b.occurrences - a.occurrences)
}

/**
 * Co-occurrence matrix: berapa kali pasangan kode muncul di dokumen yang sama.
 */
export function coOccurrence(codes, codings) {
  const k = codes.length
  if (k === 0) return { codes: [], matrix: [] }
  const idx = new Map(codes.map((c, i) => [c.id, i]))
  const matrix = Array.from({ length: k }, () => new Array(k).fill(0))

  // Group codings by document
  const byDoc = new Map()
  for (const c of codings) {
    if (!byDoc.has(c.documentId)) byDoc.set(c.documentId, new Set())
    byDoc.get(c.documentId).add(c.codeId)
  }

  for (const codeIds of byDoc.values()) {
    const ids = Array.from(codeIds)
    for (let i = 0; i < ids.length; i++) {
      for (let j = 0; j < ids.length; j++) {
        const a = idx.get(ids[i]), b = idx.get(ids[j])
        if (a !== undefined && b !== undefined) matrix[a][b]++
      }
    }
  }

  return { codes, matrix }
}

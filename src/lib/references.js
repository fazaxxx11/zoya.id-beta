// ============================================================
// References Library — manajemen referensi & format sitasi
// ============================================================
// Skema referensi + formatter (APA 7, IEEE, Vancouver, Harvard),
// parser BibTeX & RIS, plus DOI lookup ke CrossRef.
//
// Storage: localStorage (kompatibel dengan pola lib/kuesioner.js).
// Semua formatter pure & deterministik — gampang di-test.

const STORAGE_KEY = 'lib_references_v1'

// ============================================================
// Skema
// ============================================================
// Ref = {
//   id: string,
//   type: 'article' | 'book' | 'chapter' | 'thesis' | 'website' | 'conference' | 'report',
//   title: string,
//   authors: Array<{family: string, given: string}>,  // given = nama depan, family = nama belakang
//   year: number | null,
//   journal: string,           // untuk article
//   volume: string,
//   issue: string,
//   pages: string,             // mis. "120-135"
//   publisher: string,         // untuk book/chapter
//   city: string,
//   bookTitle: string,         // untuk chapter (judul buku besarnya)
//   editors: Array<{family,given}>, // untuk chapter
//   doi: string,
//   url: string,
//   isbn: string,
//   accessedAt: string,        // YYYY-MM-DD untuk website
//   thesisType: string,        // 'Skripsi' | 'Tesis' | 'Disertasi'
//   institution: string,       // untuk thesis
//   tags: string[],            // tema: 'motivasi belajar', dst.
//   note: string,
//   createdAt: number,
//   updatedAt: number,
// }

export const REF_TYPES = [
  { id: 'article',    label: 'Artikel Jurnal',  icon: '📄' },
  { id: 'book',       label: 'Buku',            icon: '📚' },
  { id: 'chapter',    label: 'Bab Buku',        icon: '📖' },
  { id: 'thesis',     label: 'Skripsi/Tesis',   icon: '🎓' },
  { id: 'conference', label: 'Prosiding',       icon: '🎤' },
  { id: 'website',    label: 'Website',         icon: '🌐' },
  { id: 'report',     label: 'Laporan',         icon: '📋' },
]

export function newRef(type = 'article') {
  return {
    id: 'ref_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
    type,
    title: '',
    authors: [],
    year: null,
    journal: '',
    volume: '',
    issue: '',
    pages: '',
    publisher: '',
    city: '',
    bookTitle: '',
    editors: [],
    doi: '',
    url: '',
    isbn: '',
    accessedAt: '',
    thesisType: '',
    institution: '',
    tags: [],
    note: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

// ============================================================
// CRUD storage
// ============================================================
export function listRefs() {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveRef(ref) {
  const all = listRefs()
  const idx = all.findIndex(r => r.id === ref.id)
  const updated = { ...ref, updatedAt: Date.now() }
  if (idx >= 0) all[idx] = updated
  else all.push(updated)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  return updated
}

export function deleteRef(id) {
  const all = listRefs().filter(r => r.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function clearRefs() {
  localStorage.removeItem(STORAGE_KEY)
}

// ============================================================
// Helpers — author formatting
// ============================================================
/**
 * Format nama untuk sitasi.
 * mode:
 *   'apa'        : Family, F. M.
 *   'ieee'       : F. M. Family
 *   'vancouver'  : Family FM
 *   'harvard'    : Family, F.M.
 */
export function formatAuthor(author, mode = 'apa') {
  if (!author || !author.family) return ''
  const family = author.family.trim()
  const given = (author.given || '').trim()
  if (!given) return family

  // Get initials from given names (handle "John Robert" → "J. R." or "JR")
  const initials = given.split(/\s+/).filter(Boolean).map(p => p[0].toUpperCase())

  switch (mode) {
    case 'ieee':
      return initials.map(i => i + '.').join(' ') + ' ' + family
    case 'vancouver':
      return family + ' ' + initials.join('')
    case 'harvard':
      return family + ', ' + initials.map(i => i + '.').join('')
    case 'apa':
    default:
      return family + ', ' + initials.map(i => i + '.').join(' ')
  }
}

/**
 * Gabung daftar penulis sesuai gaya.
 */
export function joinAuthors(authors, mode = 'apa') {
  if (!authors || authors.length === 0) return ''
  const formatted = authors.map(a => formatAuthor(a, mode))

  // APA 7: up to 20 authors, ampersand before last; >20 → first 19, ..., last
  if (mode === 'apa') {
    if (formatted.length === 1) return formatted[0]
    if (formatted.length === 2) return formatted[0] + ', & ' + formatted[1]
    if (formatted.length <= 20) {
      return formatted.slice(0, -1).join(', ') + ', & ' + formatted[formatted.length - 1]
    }
    // > 20: first 19, ..., last
    return formatted.slice(0, 19).join(', ') + ', ... ' + formatted[formatted.length - 1]
  }

  // IEEE: comma-separated, "and" before last
  if (mode === 'ieee') {
    if (formatted.length === 1) return formatted[0]
    if (formatted.length === 2) return formatted[0] + ' and ' + formatted[1]
    return formatted.slice(0, -1).join(', ') + ', and ' + formatted[formatted.length - 1]
  }

  // Vancouver: comma-separated, et al if >6
  if (mode === 'vancouver') {
    if (formatted.length <= 6) return formatted.join(', ')
    return formatted.slice(0, 6).join(', ') + ', et al'
  }

  // Harvard: comma-separated, "and" before last
  if (mode === 'harvard') {
    if (formatted.length === 1) return formatted[0]
    if (formatted.length === 2) return formatted[0] + ' and ' + formatted[1]
    return formatted.slice(0, -1).join(', ') + ' and ' + formatted[formatted.length - 1]
  }

  return formatted.join(', ')
}

/**
 * Inline citation, mis. (Smith, 2020) atau [1] tergantung style.
 */
export function inlineCite(ref, mode = 'apa', index = 1) {
  if (!ref) return ''
  const year = ref.year || 'n.d.'

  if (mode === 'ieee' || mode === 'vancouver') {
    return '[' + index + ']'
  }

  // APA / Harvard: (Family, Year) or (Family et al., Year)
  const authors = ref.authors || []
  if (authors.length === 0) {
    const t = (ref.title || '').slice(0, 30)
    return `(${t || 'Anonim'}, ${year})`
  }
  if (authors.length === 1) return `(${authors[0].family}, ${year})`
  if (authors.length === 2) {
    const sep = mode === 'harvard' ? ' and ' : ' & '
    return `(${authors[0].family}${sep}${authors[1].family}, ${year})`
  }
  return `(${authors[0].family} et al., ${year})`
}

// ============================================================
// FORMATTERS — generate full daftar pustaka entry
// ============================================================

/**
 * APA 7th edition.
 * Article: Author, A. A., & Author, B. B. (Year). Title of article. Journal Name, Vol(Issue), pages. https://doi.org/xxxx
 * Book:    Author, A. A. (Year). Title of book (italicized). Publisher.
 */
export function formatAPA(ref) {
  if (!ref) return ''
  const authors = joinAuthors(ref.authors, 'apa')
  const year = ref.year ? `(${ref.year})` : '(n.d.)'
  const title = (ref.title || '').trim()

  switch (ref.type) {
    case 'article': {
      let s = `${authors} ${year}. ${title}.`
      if (ref.journal) s += ` *${ref.journal}*`
      if (ref.volume)  s += `, *${ref.volume}*`
      if (ref.issue)   s += `(${ref.issue})`
      if (ref.pages)   s += `, ${ref.pages}`
      s += '.'
      if (ref.doi)     s += ` https://doi.org/${ref.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')}`
      else if (ref.url) s += ` ${ref.url}`
      return s
    }
    case 'book': {
      let s = `${authors} ${year}. *${title}*.`
      if (ref.publisher) s += ` ${ref.publisher}.`
      return s
    }
    case 'chapter': {
      const editors = ref.editors && ref.editors.length > 0
        ? joinAuthors(ref.editors, 'ieee') + ' (Ed' + (ref.editors.length > 1 ? 's' : '') + '.)'
        : ''
      let s = `${authors} ${year}. ${title}.`
      if (editors) s += ` In ${editors},`
      if (ref.bookTitle) s += ` *${ref.bookTitle}*`
      if (ref.pages)     s += ` (pp. ${ref.pages})`
      s += '.'
      if (ref.publisher) s += ` ${ref.publisher}.`
      return s
    }
    case 'thesis': {
      const t = ref.thesisType || 'Skripsi'
      let s = `${authors} ${year}. *${title}* [${t}]. ${ref.institution || ''}.`.replace(/\s+/g, ' ').trim()
      return s
    }
    case 'website': {
      let s = `${authors} ${year}. *${title}*.`
      if (ref.publisher) s += ` ${ref.publisher}.`
      if (ref.accessedAt) s += ` Diakses ${ref.accessedAt}`
      if (ref.url) s += `, dari ${ref.url}`
      return s + '.'
    }
    case 'conference': {
      let s = `${authors} ${year}. ${title}.`
      if (ref.bookTitle) s += ` Dalam *${ref.bookTitle}*`
      if (ref.pages) s += ` (pp. ${ref.pages})`
      s += '.'
      if (ref.publisher) s += ` ${ref.publisher}.`
      return s
    }
    case 'report':
    default: {
      let s = `${authors} ${year}. *${title}*.`
      if (ref.publisher) s += ` ${ref.publisher}.`
      if (ref.url)       s += ` ${ref.url}`
      return s
    }
  }
}

/**
 * IEEE.
 * [1] F. M. Author and F. M. Author, "Title of article," Journal Name, vol. X, no. Y, pp. P-P, Year, doi: 10.xxxx/yyyy.
 */
export function formatIEEE(ref, index) {
  if (!ref) return ''
  const idx = index !== undefined ? `[${index}] ` : ''
  const authors = joinAuthors(ref.authors, 'ieee')
  const year = ref.year || 'n.d.'

  switch (ref.type) {
    case 'article': {
      let s = `${idx}${authors}, "${ref.title}," ${ref.journal || ''}`
      if (ref.volume) s += `, vol. ${ref.volume}`
      if (ref.issue)  s += `, no. ${ref.issue}`
      if (ref.pages)  s += `, pp. ${ref.pages}`
      s += `, ${year}.`
      if (ref.doi)    s += ` doi: ${ref.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')}.`
      return s
    }
    case 'book': {
      return `${idx}${authors}, *${ref.title}*. ${ref.city ? ref.city + ': ' : ''}${ref.publisher || ''}, ${year}.`
    }
    case 'chapter': {
      const editors = joinAuthors(ref.editors, 'ieee')
      let s = `${idx}${authors}, "${ref.title}," in *${ref.bookTitle || ''}*`
      if (editors) s += `, ${editors}, Ed${ref.editors.length > 1 ? 's' : ''}.`
      if (ref.publisher) s += ` ${ref.city ? ref.city + ': ' : ''}${ref.publisher},`
      s += ` ${year}`
      if (ref.pages) s += `, pp. ${ref.pages}`
      return s + '.'
    }
    case 'thesis': {
      return `${idx}${authors}, "${ref.title}," ${ref.thesisType || 'Skripsi'}, ${ref.institution || ''}, ${year}.`
    }
    case 'website': {
      return `${idx}${authors}, "${ref.title}," ${ref.publisher || ''}, ${year}. [Online]. Available: ${ref.url || ''}${ref.accessedAt ? ' (accessed ' + ref.accessedAt + ').' : ''}`
    }
    default:
      return `${idx}${authors}, *${ref.title}*. ${year}.`
  }
}

/**
 * Vancouver.
 * Author AA, Author BB. Title. Journal. Year;Vol(Issue):Pages.
 */
export function formatVancouver(ref, index) {
  if (!ref) return ''
  const idx = index !== undefined ? `${index}. ` : ''
  const authors = joinAuthors(ref.authors, 'vancouver')
  const year = ref.year || 'n.d.'

  switch (ref.type) {
    case 'article': {
      let s = `${idx}${authors}. ${ref.title}. ${ref.journal || ''}. ${year}`
      if (ref.volume) s += `;${ref.volume}`
      if (ref.issue)  s += `(${ref.issue})`
      if (ref.pages)  s += `:${ref.pages}`
      s += '.'
      if (ref.doi)    s += ` doi: ${ref.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')}`
      return s
    }
    case 'book': {
      return `${idx}${authors}. ${ref.title}. ${ref.city ? ref.city + ': ' : ''}${ref.publisher || ''}; ${year}.`
    }
    default:
      return `${idx}${authors}. ${ref.title}. ${year}.`
  }
}

/**
 * Harvard.
 * Author, A.A. and Author, B.B. (Year) 'Title', Journal, Vol(Issue), pp. Pages.
 */
export function formatHarvard(ref) {
  if (!ref) return ''
  const authors = joinAuthors(ref.authors, 'harvard')
  const year = ref.year ? `(${ref.year})` : '(n.d.)'

  switch (ref.type) {
    case 'article': {
      let s = `${authors} ${year} '${ref.title}', *${ref.journal || ''}*`
      if (ref.volume) s += `, ${ref.volume}`
      if (ref.issue)  s += `(${ref.issue})`
      if (ref.pages)  s += `, pp. ${ref.pages}`
      s += '.'
      if (ref.doi)    s += ` doi: ${ref.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')}.`
      return s
    }
    case 'book': {
      return `${authors} ${year} *${ref.title}*. ${ref.city ? ref.city + ': ' : ''}${ref.publisher || ''}.`
    }
    default:
      return `${authors} ${year} *${ref.title}*. ${year}.`
  }
}

export const STYLES = [
  { id: 'apa',       label: 'APA 7',     formatter: formatAPA },
  { id: 'ieee',      label: 'IEEE',      formatter: formatIEEE },
  { id: 'vancouver', label: 'Vancouver', formatter: formatVancouver },
  { id: 'harvard',   label: 'Harvard',   formatter: formatHarvard },
]

/**
 * Generate daftar pustaka utuh untuk semua refs.
 * IEEE & Vancouver pakai numbering; APA & Harvard pakai alphabetical sort.
 */
export function buildBibliography(refs, style = 'apa') {
  const formatter = STYLES.find(s => s.id === style)?.formatter
  if (!formatter) return ''

  let sorted
  if (style === 'apa' || style === 'harvard') {
    // Sort alphabetically by first author family name (or title if no author)
    sorted = [...refs].sort((a, b) => {
      const sa = a.authors?.[0]?.family || a.title || ''
      const sb = b.authors?.[0]?.family || b.title || ''
      return sa.localeCompare(sb)
    })
    return sorted.map(r => formatter(r)).join('\n\n')
  }

  // IEEE / Vancouver: numbered, in insertion order
  sorted = [...refs]
  return sorted.map((r, i) => formatter(r, i + 1)).join('\n\n')
}

// ============================================================
// DOI lookup → CrossRef API (free, no key required)
// ============================================================
/**
 * Lookup metadata referensi berdasarkan DOI dari CrossRef.
 *
 * @param {string} doi - DOI string, mis. "10.1037/0022-3514.51.6.1173" atau URL https://doi.org/...
 * @returns {Promise<Ref|null>}
 */
export async function lookupDOI(doi) {
  if (!doi) throw new Error('DOI kosong')
  const cleanDoi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '').trim()
  const url = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  })
  if (!res.ok) {
    if (res.status === 404) throw new Error('DOI tidak ditemukan di CrossRef')
    throw new Error(`CrossRef error: ${res.status}`)
  }
  const json = await res.json()
  return crossrefToRef(json.message)
}

/**
 * Convert CrossRef message → ref schema.
 */
export function crossrefToRef(msg) {
  if (!msg) return null
  const ref = newRef('article')
  ref.title = (msg.title && msg.title[0]) || ''
  ref.authors = (msg.author || []).map(a => ({
    family: a.family || '',
    given:  a.given  || '',
  }))
  // Year from issued or published
  const year = msg.issued?.['date-parts']?.[0]?.[0]
            || msg.published?.['date-parts']?.[0]?.[0]
            || msg['published-print']?.['date-parts']?.[0]?.[0]
  if (year) ref.year = year

  ref.journal = (msg['container-title'] && msg['container-title'][0]) || ''
  ref.volume = msg.volume || ''
  ref.issue  = msg.issue  || ''
  ref.pages  = msg.page   || ''
  ref.doi    = msg.DOI    || ''
  ref.url    = msg.URL    || (msg.DOI ? `https://doi.org/${msg.DOI}` : '')
  ref.publisher = msg.publisher || ''

  // Detect type
  if (msg.type === 'book' || msg.type === 'monograph') ref.type = 'book'
  else if (msg.type === 'book-chapter') ref.type = 'chapter'
  else if (msg.type === 'proceedings-article') ref.type = 'conference'
  else if (msg.type === 'thesis' || msg.type === 'dissertation') ref.type = 'thesis'

  return ref
}

// ============================================================
// BibTeX parser (basic, single-entry support per call)
// ============================================================
/**
 * Parse BibTeX string → array of refs.
 * Supports common entry types and fields.
 */
export function parseBibtex(text) {
  const refs = []
  // Match @type{key, ... }
  const entryRegex = /@(\w+)\s*\{([^,]+),([\s\S]*?)\n\}/g
  let m
  while ((m = entryRegex.exec(text)) !== null) {
    const type = m[1].toLowerCase()
    const fieldText = m[3]
    const fields = parseBibtexFields(fieldText)
    const ref = newRef(mapBibtexType(type))
    ref.title = fields.title || ''
    ref.year  = fields.year ? parseInt(fields.year, 10) : null
    ref.journal = fields.journal || fields.booktitle || ''
    ref.volume = fields.volume || ''
    ref.issue  = fields.number || ''
    ref.pages  = (fields.pages || '').replace(/--/g, '-')
    ref.publisher = fields.publisher || ''
    ref.doi    = fields.doi || ''
    ref.url    = fields.url || ''
    ref.isbn   = fields.isbn || ''
    if (fields.author) ref.authors = parseBibtexAuthors(fields.author)
    if (fields.editor) ref.editors = parseBibtexAuthors(fields.editor)
    if (fields.address) ref.city = fields.address
    if (fields.school)  ref.institution = fields.school
    if (fields.booktitle && type === 'inbook') ref.bookTitle = fields.booktitle
    refs.push(ref)
  }
  return refs
}

function parseBibtexFields(text) {
  const fields = {}
  // Match field = {value} or field = "value" or field = value
  const fieldRegex = /(\w+)\s*=\s*(?:\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}|"([^"]*)"|([^,\n]+))/g
  let m
  while ((m = fieldRegex.exec(text)) !== null) {
    const key = m[1].toLowerCase()
    const value = (m[2] || m[3] || m[4] || '').trim().replace(/[{}]/g, '')
    fields[key] = value
  }
  return fields
}

function parseBibtexAuthors(authorString) {
  // BibTeX separator is " and "
  return authorString.split(/\s+and\s+/i).map(name => {
    name = name.trim()
    if (name.includes(',')) {
      // "Family, Given"
      const [family, given] = name.split(',').map(s => s.trim())
      return { family, given }
    }
    // "Given Family"
    const parts = name.split(/\s+/)
    if (parts.length === 1) return { family: parts[0], given: '' }
    return { family: parts[parts.length - 1], given: parts.slice(0, -1).join(' ') }
  })
}

function mapBibtexType(t) {
  const map = {
    article: 'article',
    book: 'book',
    inbook: 'chapter',
    incollection: 'chapter',
    inproceedings: 'conference',
    conference: 'conference',
    phdthesis: 'thesis',
    mastersthesis: 'thesis',
    techreport: 'report',
    misc: 'website',
    online: 'website',
  }
  return map[t] || 'article'
}

// ============================================================
// RIS parser (basic)
// ============================================================
/**
 * Parse RIS format (Mendeley/Zotero/EndNote export).
 * Format: tag-value lines, entries separated by ER (End Reference).
 */
export function parseRIS(text) {
  const refs = []
  const entries = text.split(/^ER\s*-?\s*$/m)
  for (const entry of entries) {
    const lines = entry.split(/\r?\n/).filter(l => /^[A-Z][A-Z0-9]\s*-/.test(l))
    if (lines.length === 0) continue
    const ref = newRef('article')
    for (const line of lines) {
      const m = line.match(/^([A-Z][A-Z0-9])\s*-\s*(.*)$/)
      if (!m) continue
      const tag = m[1]
      const val = m[2].trim()
      switch (tag) {
        case 'TY':
          ref.type = mapRISType(val)
          break
        case 'TI':
        case 'T1':
          ref.title = val
          break
        case 'AU':
        case 'A1': {
          const parts = val.split(',').map(s => s.trim())
          if (parts.length >= 2) ref.authors.push({ family: parts[0], given: parts[1] })
          else ref.authors.push({ family: val, given: '' })
          break
        }
        case 'PY':
        case 'Y1':
          ref.year = parseInt(val.split('/')[0] || val, 10) || null
          break
        case 'JO':
        case 'JF':
        case 'T2':
          ref.journal = val
          break
        case 'VL': ref.volume = val; break
        case 'IS': ref.issue = val;  break
        case 'SP': ref.pages = ref.pages ? val + '-' + ref.pages : val; break
        case 'EP': ref.pages = ref.pages ? ref.pages + '-' + val : val; break
        case 'PB': ref.publisher = val; break
        case 'CY': ref.city = val; break
        case 'DO': ref.doi = val; break
        case 'UR': ref.url = val; break
        case 'SN': ref.isbn = val; break
        case 'N1':
        case 'AB': ref.note = val; break
      }
    }
    if (ref.title || ref.authors.length > 0) refs.push(ref)
  }
  return refs
}

function mapRISType(t) {
  const map = {
    JOUR: 'article',
    BOOK: 'book',
    CHAP: 'chapter',
    CONF: 'conference',
    THES: 'thesis',
    RPRT: 'report',
    ELEC: 'website',
    GEN:  'article',
  }
  return map[t] || 'article'
}

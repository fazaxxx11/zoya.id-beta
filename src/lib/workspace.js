// ============================================================
// Workspace Backup & Restore
// ============================================================
// Export-import semua data riset user (kuesioner, referensi, kualitatif, rubrik)
// dalam satu file .json. Berguna untuk:
//   - Pindah device / browser
//   - Backup sebelum clear cache
//   - Share workspace antar peneliti
//
// TIDAK diekspor: auth, wallet, theme, orders (data sistem/personal).

const RESEARCH_KEYS = [
  'kuesioner_surveys',
  'kuesioner_responses',
  'lib_references_v1',
  'qual_codebook_v1',
  'qual_documents_v1',
  'qual_codings_v1',
  'rubrik_templates',
]

const SCHEMA_VERSION = 1

/**
 * Hitung statistik isi workspace untuk display ke user.
 * Tidak melempar error meskipun localStorage corrupt.
 */
export function workspaceStats() {
  if (typeof localStorage === 'undefined') return makeEmptyStats()
  const safe = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : fallback
    } catch { return fallback }
  }

  const surveys = safe('kuesioner_surveys', [])
  const responses = safe('kuesioner_responses', {})
  const refs = safe('lib_references_v1', [])
  const codes = safe('qual_codebook_v1', [])
  const docs = safe('qual_documents_v1', [])
  const codings = safe('qual_codings_v1', [])
  const rubriks = safe('rubrik_templates', [])

  const responseCount = Object.values(responses || {}).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0
  )

  return {
    surveys:    Array.isArray(surveys) ? surveys.length : 0,
    responses:  responseCount,
    references: Array.isArray(refs) ? refs.length : 0,
    qualDocs:   Array.isArray(docs) ? docs.length : 0,
    qualCodes:  Array.isArray(codes) ? codes.length : 0,
    qualCodings: Array.isArray(codings) ? codings.length : 0,
    rubriks:    Array.isArray(rubriks) ? rubriks.length : 0,
  }
}

function makeEmptyStats() {
  return { surveys: 0, responses: 0, references: 0, qualDocs: 0, qualCodes: 0, qualCodings: 0, rubriks: 0 }
}

/**
 * Cek apakah workspace kosong sama sekali.
 */
export function isWorkspaceEmpty() {
  const s = workspaceStats()
  return s.surveys === 0 && s.references === 0 && s.qualDocs === 0
      && s.qualCodes === 0 && s.rubriks === 0 && s.responses === 0
}

/**
 * Export workspace ke object JSON-serializable.
 */
export function exportWorkspace() {
  const data = {}
  for (const key of RESEARCH_KEYS) {
    try {
      const raw = localStorage.getItem(key)
      data[key] = raw ? JSON.parse(raw) : null
    } catch {
      data[key] = null
    }
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appName: 'z-research-tools',
    stats: workspaceStats(),
    data,
  }
}

/**
 * Trigger download .json file dari workspace.
 */
export function downloadWorkspace(filename) {
  const ws = exportWorkspace()
  const json = JSON.stringify(ws, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  const date = new Date().toISOString().slice(0, 10)
  a.download = filename || `workspace_skripsi_${date}.json`
  a.click()
  URL.revokeObjectURL(url)
  return ws
}

/**
 * Validasi struktur file backup sebelum restore.
 * Return { valid: bool, error?: string, stats?: object }
 */
export function validateBackup(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'File bukan JSON yang valid' }
  }
  if (parsed.appName && parsed.appName !== 'z-research-tools') {
    return { valid: false, error: 'File dari aplikasi lain — tidak kompatibel' }
  }
  if (typeof parsed.data !== 'object' || parsed.data === null) {
    return { valid: false, error: 'Field "data" tidak valid' }
  }
  // Schema version forward-compat
  if (parsed.schemaVersion && parsed.schemaVersion > SCHEMA_VERSION) {
    return {
      valid: false,
      error: `File dari versi aplikasi yang lebih baru (v${parsed.schemaVersion}). Update aplikasi dulu.`,
    }
  }

  const keys = Object.keys(parsed.data)
  const validKeys = keys.filter(k => RESEARCH_KEYS.includes(k))
  if (validKeys.length === 0) {
    return { valid: false, error: 'Tidak ada data yang dikenali di file ini' }
  }

  return { valid: true, stats: parsed.stats || null, recognizedKeys: validKeys }
}

/**
 * Restore workspace dari object hasil parse.
 *
 * @param {object} parsed - hasil JSON.parse dari file backup
 * @param {object} [opts]
 * @param {'replace'|'merge'} [opts.mode='replace'] - replace overwrite total, merge gabung dengan yang ada
 * @returns {{ ok: boolean, error?: string, restored?: object }}
 */
export function restoreWorkspace(parsed, opts = {}) {
  const { mode = 'replace' } = opts
  const validation = validateBackup(parsed)
  if (!validation.valid) return { ok: false, error: validation.error }

  const restored = {}
  for (const key of RESEARCH_KEYS) {
    const incoming = parsed.data[key]
    if (incoming === undefined || incoming === null) continue

    if (mode === 'replace') {
      localStorage.setItem(key, JSON.stringify(incoming))
      restored[key] = countItems(incoming)
    } else if (mode === 'merge') {
      const merged = mergeData(key, incoming)
      localStorage.setItem(key, JSON.stringify(merged))
      restored[key] = countItems(merged)
    }
  }

  return { ok: true, restored }
}

function countItems(value) {
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') {
    return Object.values(value).reduce((s, v) => s + (Array.isArray(v) ? v.length : 1), 0)
  }
  return 0
}

/**
 * Merge incoming data into existing for given key.
 * Strategy:
 *   - Array of objects with `id`: dedupe by id (incoming wins)
 *   - Object map (e.g. responses): merge keys (incoming wins)
 */
function mergeData(key, incoming) {
  let existing
  try { existing = JSON.parse(localStorage.getItem(key) || 'null') } catch { existing = null }
  if (!existing) return incoming

  // Array of {id} → dedupe
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    if (existing.length > 0 && existing[0]?.id !== undefined) {
      const map = new Map(existing.map(x => [x.id, x]))
      for (const item of incoming) {
        if (item?.id !== undefined) map.set(item.id, item)
      }
      return Array.from(map.values())
    }
    return [...existing, ...incoming]
  }

  // Object map (mis. responses keyed by surveyId)
  if (existing && typeof existing === 'object' && !Array.isArray(existing)
      && incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
    return { ...existing, ...incoming }
  }

  return incoming
}

/**
 * Hapus semua data workspace (research keys saja, auth/wallet aman).
 * @returns {string[]} list of cleared keys
 */
export function clearWorkspace() {
  const cleared = []
  for (const key of RESEARCH_KEYS) {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key)
      cleared.push(key)
    }
  }
  return cleared
}

export const RESEARCH_KEYS_LIST = RESEARCH_KEYS

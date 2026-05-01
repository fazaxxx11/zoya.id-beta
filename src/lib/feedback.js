// Feedback / Kritik & Saran storage.
// =================================
// Strategy: ALWAYS persist to localStorage first (never lose user input),
// then optionally try Supabase if logged in. Admin email reads via mailto:
// fallback so user can also send manually.

import { ADMIN_EMAIL, BRAND_NAME } from './brand'

const KEY = 'zoya_feedback_v1'

/** @typedef {{ id:string, type:string, rating:number|null, message:string, email:string, page:string, ua:string, createdAt:number, sent:boolean }} FeedbackEntry */

export const FEEDBACK_TYPES = [
  { id: 'bug',         label: 'Bug / Error',           emoji: '🐛' },
  { id: 'fitur',       label: 'Permintaan Fitur',      emoji: '💡' },
  { id: 'ux',          label: 'Saran UX/UI',           emoji: '🎨' },
  { id: 'konten',      label: 'Konten / Akademik',     emoji: '📚' },
  { id: 'apresiasi',   label: 'Apresiasi',             emoji: '❤️' },
  { id: 'lainnya',     label: 'Lainnya',               emoji: '💬' },
]

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function writeAll(arr) {
  try { localStorage.setItem(KEY, JSON.stringify(arr.slice(-200))) } catch {}
}

/** @returns {FeedbackEntry[]} */
export function getFeedback() {
  return readAll().sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * Save a new feedback entry locally.
 * @returns {FeedbackEntry}
 */
export function saveFeedback({ type, rating = null, message, email = '' }) {
  const entry = {
    id: `fb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: type || 'lainnya',
    rating,
    message: String(message || '').trim(),
    email: String(email || '').trim(),
    page: typeof window !== 'undefined' ? (window.location?.pathname || '') : '',
    ua: typeof navigator !== 'undefined' ? (navigator.userAgent || '').slice(0, 200) : '',
    createdAt: Date.now(),
    sent: false,
  }
  writeAll([...readAll(), entry])
  return entry
}

/** Mark sent (after mailto opened or API success). */
export function markSent(id) {
  const all = readAll().map(f => f.id === id ? { ...f, sent: true } : f)
  writeAll(all)
}

/** Build a prefilled mailto URL for the given entry. */
export function buildMailto(entry) {
  const subject = `[${BRAND_NAME}] ${(FEEDBACK_TYPES.find(t => t.id === entry.type)?.label) || 'Feedback'}`
  const body = [
    `Tipe       : ${entry.type}`,
    entry.rating != null ? `Rating     : ${entry.rating}/5` : null,
    `Halaman    : ${entry.page}`,
    `Tanggal    : ${new Date(entry.createdAt).toLocaleString('id-ID')}`,
    entry.email ? `Email user : ${entry.email}` : null,
    '',
    '=== Pesan ===',
    entry.message,
    '',
    `--- meta ---`,
    `id: ${entry.id}`,
    `ua: ${entry.ua}`,
  ].filter(Boolean).join('\n')

  return `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function clearFeedback() {
  try { localStorage.removeItem(KEY) } catch {}
}

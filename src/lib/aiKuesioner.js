// Client helper untuk AI Kuesioner Generator.
// Memanggil /api/generate-kuesioner lalu mengonversi response → Survey
// object yang kompatibel dengan builder.

import { newSurvey, newSection, newItem } from './kuesioner'

const LIKERT_LABELS = {
  4: ['Tidak Sama Sekali Benar', 'Hampir Tidak Benar', 'Sedang-sedang Saja Benar', 'Sangat Benar'],
  5: ['STS', 'TS', 'N', 'S', 'SS'],
  6: ['STS', 'TS', 'ATS', 'AS', 'S', 'SS'],
  7: ['STS', 'TS', 'ATS', 'N', 'AS', 'S', 'SS'],
}

/**
 * Generate kuesioner via AI.
 * @param {object} params - { mode, topic, variable, dimensions, scale, itemsPerDimension, includeDemografi }
 * @returns {Promise<{ survey: import('./kuesioner').Survey, blueprint?: object, provider: string }>}
 */
export async function generateKuesionerAI(params) {
  const r = await fetch('/api/generate-kuesioner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  let data
  try { data = await r.json() } catch { data = {} }
  if (!r.ok) {
    throw new Error(data.error || data.detail || `Generate gagal (HTTP ${r.status})`)
  }

  const survey = aiResultToSurvey(data, params)
  return {
    survey,
    blueprint: data.blueprint || null,
    provider: data.provider || '',
  }
}

/**
 * Convert raw AI JSON response → Survey shape (with proper IDs & defaults).
 */
export function aiResultToSurvey(data, params = {}) {
  const sc = Number(params.scale) || 5

  const survey = newSurvey(data.title || 'Kuesioner (AI Generated)')
  survey.description = data.description || ''
  // Lampirkan blueprint sebagai metadata informatif (tidak masuk ke render builder)
  if (data.blueprint) {
    survey._blueprint = data.blueprint
  }

  survey.sections = (Array.isArray(data.sections) ? data.sections : [])
    .map((sec, si) => {
      const section = newSection(sec.title || `Bagian ${si + 1}`)
      section.description = sec.description || ''
      section.items = (Array.isArray(sec.items) ? sec.items : []).map((it, ii) => {
        const type = inferType(it)
        const base = newItem(type)
        base.label = String(it.label || it.question || `Item ${ii + 1}`).trim()
        base.required = it.required !== false
        if (type === 'likert') {
          // Selalu align scale dengan scaleLabels supaya render konsisten.
          // Kalau AI override scale, regenerate labels yang cocok dengan scale-nya.
          base.scale = Number(it.scale) || sc
          base.scaleLabels = labelsForScale(base.scale)
          base.reverseCoded = !!it.reverseCoded
        } else if (type === 'rating') {
          base.scale = Number(it.scale) || 5
        } else if (type === 'multichoice' || type === 'checkbox') {
          // validateSurvey butuh minimal 2 opsi. Override default hanya kalau
          // AI kasih array dengan ≥ 2 entri non-empty.
          if (Array.isArray(it.options)) {
            const cleaned = it.options.map(String).map(s => s.trim()).filter(Boolean)
            if (cleaned.length >= 2) base.options = cleaned
          }
          // else: pertahankan default ['Opsi 1', 'Opsi 2'] dari newItem()
        }
        return base
      })
      return section
    })
    // Drop section yang BENAR-BENAR kosong (no title + no items). Section
    // demografi yang AI lupa generate items-nya tetap kita keep biar user
    // bisa isi manual.
    .filter(sec => sec.items.length > 0 || (sec.title && sec.title.trim() !== ''))

  // Safety: kalau AI nge-blank total, kasih 1 section default
  if (survey.sections.length === 0) {
    survey.sections = [newSection('Bagian 1')]
  }
  return survey
}

/**
 * Generate scale labels yang cocok dengan jumlah poin Likert.
 * Untuk scale yang tidak ada di LIKERT_LABELS, fallback ke angka 1..N.
 */
function labelsForScale(scale) {
  if (LIKERT_LABELS[scale]) return [...LIKERT_LABELS[scale]]
  // Fallback: numeric labels supaya tidak ada mismatch panjang
  return Array.from({ length: scale }, (_, i) => String(i + 1))
}

function inferType(it) {
  const t = String(it.type || '').toLowerCase()
  if (t === 'likert' || t === 'multichoice' || t === 'checkbox' ||
      t === 'short_text' || t === 'long_text' || t === 'number' || t === 'rating') {
    return t
  }
  // Heuristik fallback
  if (Array.isArray(it.options) && it.options.length > 0) {
    return it.options.length > 4 ? 'multichoice' : 'checkbox'
  }
  return 'likert'
}

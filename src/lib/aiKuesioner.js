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
  const labels = LIKERT_LABELS[sc] || null

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
          base.scale = Number(it.scale) || sc
          if (labels && base.scale === sc) base.scaleLabels = labels
          base.reverseCoded = !!it.reverseCoded
        } else if (type === 'rating') {
          base.scale = Number(it.scale) || 5
        } else if ((type === 'multichoice' || type === 'checkbox') && Array.isArray(it.options)) {
          base.options = it.options.map(String)
        }
        return base
      })
      return section
    })
    .filter(sec => sec.items.length > 0)

  // Safety: kalau AI nge-blank, kasih 1 section default
  if (survey.sections.length === 0) {
    survey.sections = [newSection('Bagian 1')]
  }
  return survey
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

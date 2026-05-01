// AI assessment endpoint (Vercel serverless function).
// Mode baru (recommended): kirim {rubrik, jawaban, studentName, title, context}.
// Mode lama (backward compat): kirim {messages, max_tokens}.
import { buildAssessPrompt, validateAssessResponse, parseJSONLoose } from './_lib/assessPrompt.js'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const KIMI_URL = 'https://api.moonshot.ai/v1/chat/completions'

const GROQ_MODEL = 'llama-3.3-70b-versatile'
const KIMI_MODEL = 'moonshot-v1-8k'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const groqKey = process.env.GROQ_API_KEY
  const kimiKey = process.env.KIMI_API_KEY
  if (!groqKey && !kimiKey) {
    return res.status(500).json({ error: 'No API key. Set GROQ_API_KEY or KIMI_API_KEY.' })
  }

  const body = req.body || {}

  // ── Mode baru: data terstruktur ─────────────────────────────────
  if (body.rubrik && body.jawaban) {
    return handleStructuredAssess(req, res, { groqKey, kimiKey, body })
  }

  // ── Mode lama: messages array ───────────────────────────────────
  if (body.messages) {
    return handleLegacyMessages(req, res, { groqKey, kimiKey, body })
  }

  return res.status(400).json({ error: 'Invalid payload. Send {rubrik, jawaban, ...} or {messages}.' })
}

// =====================================================================
// MODE BARU: structured assess
// =====================================================================
async function handleStructuredAssess(req, res, { groqKey, kimiKey, body }) {
  const { rubrik, jawaban, studentName, title, context } = body

  let prompt
  try {
    prompt = buildAssessPrompt({ rubrik, jawaban, studentName, title, context })
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }

  // Try Groq first (cheaper, supports JSON mode)
  if (groqKey) {
    const result = await callGroqJSON({ key: groqKey, prompt, rubrik })
    if (result.ok) {
      return res.status(200).json({
        success: true,
        provider: 'groq',
        scores: result.scores,
        kesimpulan: result.kesimpulan,
        tokens: result.tokens,
      })
    }
    // log but don't fail; try Kimi next
    console.log('[assess] groq failed:', result.error)
  }

  if (kimiKey) {
    const result = await callKimiJSON({ key: kimiKey, prompt, rubrik })
    if (result.ok) {
      return res.status(200).json({
        success: true,
        provider: 'kimi',
        scores: result.scores,
        kesimpulan: result.kesimpulan,
        tokens: result.tokens,
      })
    }
    console.log('[assess] kimi failed:', result.error)
  }

  return res.status(502).json({ error: 'All AI providers failed', success: false })
}

async function callGroqJSON({ key, prompt, rubrik }) {
  // 2 attempts max — kalau JSON invalid, retry sekali dengan instruksi tambahan
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const messages = [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ]
      if (attempt > 0) {
        messages.push({
          role: 'user',
          content: 'Output JSON sebelumnya tidak valid. Return ulang HANYA JSON valid sesuai schema.',
        })
      }

      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0.3,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
        }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error?.message || `HTTP ${res.status}` }

      const raw = data.choices?.[0]?.message?.content || ''
      const parsed = parseJSONLoose(raw)
      const validation = validateAssessResponse(parsed, rubrik)
      if (validation.valid) {
        return {
          ok: true,
          scores: validation.scores,
          kesimpulan: validation.kesimpulan,
          tokens: data.usage?.total_tokens,
        }
      }
      if (attempt === 1) {
        return { ok: false, error: 'Validation failed: ' + validation.error }
      }
    } catch (e) {
      if (attempt === 1) return { ok: false, error: e.message }
    }
  }
  return { ok: false, error: 'unreachable' }
}

async function callKimiJSON({ key, prompt, rubrik }) {
  // Kimi: tidak semua model support response_format. Kita coba tanpa, validate manual.
  try {
    const res = await fetch(KIMI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error?.message || `HTTP ${res.status}` }

    const raw = data.choices?.[0]?.message?.content || ''
    const parsed = parseJSONLoose(raw)
    const validation = validateAssessResponse(parsed, rubrik)
    if (validation.valid) {
      return {
        ok: true,
        scores: validation.scores,
        kesimpulan: validation.kesimpulan,
        tokens: data.usage?.total_tokens,
      }
    }
    return { ok: false, error: 'Validation failed: ' + validation.error }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// =====================================================================
// MODE LAMA: passthrough messages array (backward compat)
// =====================================================================
async function handleLegacyMessages(req, res, { groqKey, kimiKey, body }) {
  const { messages, max_tokens } = body
  if (groqKey) {
    try {
      const r = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
        body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: max_tokens || 1000, temperature: 0.3 }),
      })
      const data = await r.json()
      if (r.ok) {
        return res.status(200).json({
          content: [{ type: 'text', text: data.choices?.[0]?.message?.content || '' }],
          provider: 'groq',
        })
      }
    } catch (e) { console.log('[legacy] groq error:', e.message) }
  }
  if (kimiKey) {
    try {
      const r = await fetch(KIMI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kimiKey}` },
        body: JSON.stringify({ model: KIMI_MODEL, messages, max_tokens: max_tokens || 1000, temperature: 0.3 }),
      })
      const data = await r.json()
      if (r.ok) {
        return res.status(200).json({
          content: [{ type: 'text', text: data.choices?.[0]?.message?.content || '' }],
          provider: 'kimi',
        })
      }
    } catch (e) { console.log('[legacy] kimi error:', e.message) }
  }
  return res.status(502).json({ error: 'AI providers failed' })
}

// AI assessment endpoint (Vercel serverless function).
// Mode baru (recommended): kirim {rubrik, jawaban, studentName, title, context}.
// Mode lama (backward compat): kirim {messages, max_tokens}.
import { buildAssessPrompt, validateAssessResponse, parseJSONLoose } from './_lib/assessPrompt.js'

const GC_URL = 'https://api.generalcompute.com/v1/chat/completions'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const KIMI_URL = 'https://api.moonshot.ai/v1/chat/completions'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const GC_MODEL = 'deepseek-v3.2'
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const KIMI_MODEL = 'moonshot-v1-8k'
// OpenRouter: default = Auto Router (OpenRouter pilih model terbaik per request).
// Override via OPENROUTER_MODEL env. Contoh:
//   openrouter/auto                              → Auto Router (default)
//   meta-llama/llama-3.3-70b-instruct:free       → free, fixed
//   deepseek/deepseek-chat-v3.1:free             → free, reasoning
//   anthropic/claude-3.5-sonnet                  → premium berbayar
const OPENROUTER_MODEL_DEFAULT = 'openrouter/auto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const gcKey = process.env.GENERALCOMPUTE_API_KEY
  const groqKey = process.env.GROQ_API_KEY
  const kimiKey = process.env.KIMI_API_KEY
  const orKey = process.env.OPENROUTER_API_KEY
  const orModel = process.env.OPENROUTER_MODEL || OPENROUTER_MODEL_DEFAULT
  if (!gcKey && !groqKey && !kimiKey && !orKey) {
    return res.status(500).json({ error: 'No API key. Set GENERALCOMPUTE_API_KEY, GROQ_API_KEY, KIMI_API_KEY, or OPENROUTER_API_KEY.' })
  }

  const body = req.body || {}
  const ctx = { gcKey, groqKey, kimiKey, orKey, orModel, body }

  // ── Mode baru: data terstruktur ─────────────────────────────────
  if (body.rubrik && body.jawaban) {
    return handleStructuredAssess(req, res, ctx)
  }

  // ── Mode lama: messages array ───────────────────────────────────
  if (body.messages) {
    return handleLegacyMessages(req, res, ctx)
  }

  return res.status(400).json({ error: 'Invalid payload. Send {rubrik, jawaban, ...} or {messages}.' })
}

// =====================================================================
// MODE BARU: structured assess
// =====================================================================
async function handleStructuredAssess(req, res, { gcKey, groqKey, kimiKey, orKey, orModel, body }) {
  const { rubrik, jawaban, studentName, title, context } = body

  let prompt
  try {
    prompt = buildAssessPrompt({ rubrik, jawaban, studentName, title, context })
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }

  // Try General Compute first (DeepSeek V3.2 — primary)
  if (gcKey) {
    const result = await callGeneralComputeJSON({ key: gcKey, prompt, rubrik })
    if (result.ok) {
      return res.status(200).json({
        success: true,
        provider: 'generalcompute:deepseek-v3.2',
        scores: result.scores,
        kesimpulan: result.kesimpulan,
        tokens: result.tokens,
      })
    }
    console.log('[assess] generalcompute failed:', result.error)
  }

  // Fallback: OpenRouter
  if (orKey) {
    const result = await callOpenRouterJSON({ key: orKey, model: orModel, prompt, rubrik })
    if (result.ok) {
      return res.status(200).json({
        success: true,
        provider: `openrouter:${orModel}`,
        scores: result.scores,
        kesimpulan: result.kesimpulan,
        tokens: result.tokens,
      })
    }
    console.log('[assess] openrouter failed:', result.error)
  }

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

async function callGeneralComputeJSON({ key, prompt, rubrik }) {
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
      const res = await fetch(GC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: GC_MODEL,
          messages,
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
      if (attempt === 1) {
        return { ok: false, error: 'Validation failed: ' + validation.error }
      }
    } catch (e) {
      if (attempt === 1) return { ok: false, error: e.message }
    }
  }
  return { ok: false, error: 'unreachable' }
}

async function callOpenRouterJSON({ key, model, prompt, rubrik }) {
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
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          // OpenRouter: HTTP-Referer & X-Title optional but good for leaderboard/attribution
          'HTTP-Referer': 'https://zoya-id-beta.vercel.app',
          'X-Title': 'zoya.id',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3,
          max_tokens: 1500,
          // response_format hanya didukung sebagian model di OpenRouter — set via "type":"json_object"
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
async function handleLegacyMessages(req, res, { gcKey, groqKey, kimiKey, body }) {
  const { messages, max_tokens } = body
  if (gcKey) {
    try {
      const r = await fetch(GC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gcKey}` },
        body: JSON.stringify({ model: GC_MODEL, messages, max_tokens: max_tokens || 1000, temperature: 0.3 }),
      })
      const data = await r.json()
      if (r.ok) {
        return res.status(200).json({
          content: [{ type: 'text', text: data.choices?.[0]?.message?.content || '' }],
          provider: 'generalcompute',
        })
      }
    } catch (e) { console.log('[legacy] generalcompute error:', e.message) }
  }
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

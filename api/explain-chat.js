// AI Explain Chat — pop-up "Belum Paham?" untuk hasil uji statistik.
// AI menjelaskan dengan bahasa santai (kayak ngobrol ke anak SMA).
// Provider chain: GeneralCompute -> OpenRouter -> Groq -> Kimi.
// Rate limit: max 5 user turns per session (server-side guard + client-side counter).

import { requireAuth, checkRateLimit, getClientIp, checkPayloadSize, sanitize } from './_lib/auth.js'
import { checkToolAccess, chargeForTool, createOrder } from './_lib/billing.js'
import { supabaseAdmin } from './_lib/auth.js'

const GC_URL          = 'https://api.generalcompute.com/v1/chat/completions'
const GROQ_URL       = 'https://api.groq.com/openai/v1/chat/completions'
const KIMI_URL       = 'https://api.moonshot.ai/v1/chat/completions'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const GC_MODEL = 'deepseek-v3.2'
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const KIMI_MODEL = 'moonshot-v1-8k'
const OPENROUTER_MODEL_DEFAULT = 'openrouter/auto'

const MAX_USER_TURNS = 5

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Security checks
  const user = await requireAuth(req, res);
  if (!user) return;

  // Billing check (free tool, but still log usage)
  const toolId = 'deskriptif'
  const sampleSize = 1
  const billingCheck = await checkToolAccess(supabaseAdmin, user.id, toolId, sampleSize)
  if (!billingCheck.allowed) {
    return res.status(402).json({
      error: billingCheck.error || 'Billing required',
      reason: billingCheck.reason,
      price: billingCheck.price,
      balance: billingCheck.balance
    })
  }

  const rl = checkRateLimit('explain:' + user.id, { maxRequests: 20, windowMs: 60000 });
  if (!rl.allowed) {
    return res.status(429).json({
      error: 'Terlalu banyak permintaan. Coba lagi nanti.',
      retryAfter: Math.ceil(rl.resetTime / 1000)
    });
  }

  if (!checkPayloadSize(req, res, 500 * 1024)) return;

  const body = req.body || {}
  const { resultContext = '', messages = [] } = body

  // Sanitize inputs
  const sanitizedResultContext = sanitize(resultContext);
  const sanitizedMessages = Array.isArray(messages) ? messages.map(m => ({
    role: m.role,
    content: sanitize(String(m.content || ''))
  })) : [];

  if (!sanitizedResultContext) {
    return res.status(400).json({ error: 'resultContext wajib diisi' })
  }
  if (!Array.isArray(sanitizedMessages) || sanitizedMessages.length === 0) {
    return res.status(400).json({ error: 'messages tidak boleh kosong' })
  }

  const userCount = sanitizedMessages.filter(m => m.role === 'user').length
  if (userCount > MAX_USER_TURNS) {
    return res.status(429).json({
      error: `Limit ${MAX_USER_TURNS} pertanyaan per hasil tercapai.`,
      limit: MAX_USER_TURNS,
    })
  }

  const gcKey  = process.env.GENERALCOMPUTE_API_KEY
  const groqKey = process.env.GROQ_API_KEY
  const kimiKey = process.env.KIMI_API_KEY
  const orKey   = process.env.OPENROUTER_API_KEY
  const orModel = process.env.OPENROUTER_MODEL || OPENROUTER_MODEL_DEFAULT
  if (!gcKey && !groqKey && !kimiKey && !orKey) {
    return res.status(500).json({ error: 'No API key configured' })
  }

  const systemPrompt = buildSystemPrompt(sanitizedResultContext)
  const cleanMsgs = sanitizedMessages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant'))
    .map(m => ({ role: m.role, content: String(m.content || '').slice(0, 2000) }))

  const remaining = Math.max(0, MAX_USER_TURNS - userCount)
  const errors = []

  // Charge wallet if price > 0 (though this tool is free, price should be 0)
  if (billingCheck.price > 0) {
    const chargeResult = await chargeForTool(supabaseAdmin, user.id, toolId, billingCheck.price, sampleSize)
    if (!chargeResult.success) {
      return res.status(402).json({
        error: chargeResult.error || 'Payment failed',
        reason: chargeResult.reason,
        price: billingCheck.price,
        balance: chargeResult.balance
      })
    }
  }

  if (gcKey) {
    const out = await callChat(GC_URL, GC_MODEL, gcKey, systemPrompt, cleanMsgs, false)
    if (out.ok) {
      // Log usage
      await createOrder(supabaseAdmin, user.id, toolId, billingCheck.price, sampleSize, 'success')
      return res.status(200).json({ reply: out.text, provider: `generalcompute:${GC_MODEL}`, remaining, maxTurns: MAX_USER_TURNS })
    }
    errors.push(`generalcompute/${GC_MODEL}: ${out.error}`)
    if (process.env.NODE_ENV !== 'production') console.log('[explain-chat]', errors.at(-1))
  }
  if (orKey) {
    const out = await callChat(OPENROUTER_URL, orModel, orKey, systemPrompt, cleanMsgs, true)
    if (out.ok) {
      // Log usage
      await createOrder(supabaseAdmin, user.id, toolId, billingCheck.price, sampleSize, 'success')
      return res.status(200).json({ reply: out.text, provider: `openrouter:${orModel}`, remaining, maxTurns: MAX_USER_TURNS })
    }
    errors.push(`openrouter/${orModel}: ${out.error}`)
    if (process.env.NODE_ENV !== 'production') console.log('[explain-chat]', errors.at(-1))
  }
  if (groqKey) {
    const out = await callChat(GROQ_URL, GROQ_MODEL, groqKey, systemPrompt, cleanMsgs, false)
    if (out.ok) {
      // Log usage
      await createOrder(supabaseAdmin, user.id, toolId, billingCheck.price, sampleSize, 'success')
      return res.status(200).json({ reply: out.text, provider: `groq:${GROQ_MODEL}`, remaining, maxTurns: MAX_USER_TURNS })
    }
    errors.push(`groq: ${out.error}`)
    if (process.env.NODE_ENV !== 'production') console.log('[explain-chat]', errors.at(-1))
  }
  if (kimiKey) {
    const out = await callChat(KIMI_URL, KIMI_MODEL, kimiKey, systemPrompt, cleanMsgs, false)
    if (out.ok) {
      // Log usage
      await createOrder(supabaseAdmin, user.id, toolId, billingCheck.price, sampleSize, 'success')
      return res.status(200).json({ reply: out.text, provider: 'kimi', remaining, maxTurns: MAX_USER_TURNS })
    }
    errors.push(`kimi: ${out.error}`)
    if (process.env.NODE_ENV !== 'production') console.log('[explain-chat]', errors.at(-1))
  }

  // Log failed usage
  await createOrder(supabaseAdmin, user.id, toolId, billingCheck.price, sampleSize, 'failed')
  return res.status(503).json({
    error: 'Semua provider AI sedang sibuk. Coba lagi 30 detik.',
    detail: errors.join(' | '),
  })
}

function buildSystemPrompt(resultContext) {
  return `Kamu adalah teman ngobrol yang sabar dan jago jelasin statistik dengan bahasa SANGAT SEDERHANA.

GAYA BICARA:
- Pakai bahasa Indonesia santai, kayak ngobrol sama temen atau adik kelas SMA.
- HINDARI istilah teknis tanpa penjelasan. Kalau pakai istilah, langsung kasih analogi sehari-hari.
- Pakai contoh konkret dari kehidupan nyata (mis. "anggap aja kayak ngebandingin nilai ulangan kelas A vs kelas B").
- Boleh pakai emoji secukupnya (1-2 per jawaban) buat ramah.
- Boleh sapa "Sip!", "Oke", "Gini ya..." di awal — tapi langsung ke poin.
- JANGAN kepanjangan. Maksimal 4-6 kalimat per jawaban (kecuali user minta detail).
- JANGAN pakai bullet point/heading kalau gak perlu — biar feel-nya kayak chat beneran.
- Pakai sapaan "kamu" (jangan "Anda").

KONTEKS HASIL UJI YANG SEDANG DIBAHAS:
${resultContext}

ATURAN:
1. Jawab pertanyaan user mengacu ke hasil uji di atas (jangan ngarang angka).
2. Kalau user nanya hal di luar konteks statistik/hasil ini, ingatkan dengan halus dan arahkan balik.
3. Kalau user nanya "jadi maksudnya gimana?" atau "p-value itu apa?", jelasin dari nol pakai analogi.
4. Kalau user bingung, akhiri jawaban dengan ajakan: "Mau dijelasin bagian mana lagi?" — tapi cuma sesekali, jangan tiap turn.
5. Tone: hangat, gak menggurui, sabar. Bukan dosen — tapi senior yang baik.`
}

async function callChat(url, model, key, systemPrompt, messages, isOpenRouter) {
  try {
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }
    if (isOpenRouter) {
      headers['HTTP-Referer'] = 'https://zoya-id-beta.vercel.app'
      headers['X-Title'] = 'zoya.id'
    }
    const payload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 600,
    }
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) })
    let data
    try { data = await r.json() } catch { data = {} }
    if (!r.ok) {
      return { ok: false, error: data.error?.message || `HTTP ${r.status}` }
    }
    const text = (data.choices?.[0]?.message?.content || '').trim()
    if (!text) return { ok: false, error: 'Empty response' }
    return { ok: true, text }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}
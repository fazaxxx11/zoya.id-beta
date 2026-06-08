// AI Kuesioner Generator
// =======================
// Mode:
//   "quick"     → topik + jumlah item → generate kuesioner langsung
//   "blueprint" → variable + dimensions → generate definisi operasional,
//                 indikator, dan items (kisi-kisi lengkap untuk skripsi)
// Provider chain (sama kayak assess.js): GeneralCompute → OpenRouter → Groq → Kimi.

import { requireAuth, checkRateLimit, checkPayloadSize } from './_lib/auth.js'
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Authentication
  const user = await requireAuth(req, res);
  if (!user) return;

  // Billing check
  const billing = await checkToolAccess(supabaseAdmin, user.id, 'kuesioner', 1)
  if (!billing.allowed) return res.status(402).json({ error: 'Saldo tidak cukup', reason: billing.reason, price: billing.price, balance: billing.balance })
  let orderId = null
  if (billing.price > 0) {
    const charge = await chargeForTool(supabaseAdmin, user.id, 'kuesioner', 1, null)
    if (!charge.success) return res.status(402).json({ error: charge.error })
    orderId = charge.orderId
  }

  // Rate limiting
  const rl = checkRateLimit('kuesioner:' + user.id, { maxRequests: 20, windowMs: 60000 });
  if (!rl.allowed) {
    return res.status(429).json({
      error: 'Terlalu banyak permintaan. Coba lagi dalam ' + Math.ceil(rl.retryAfter / 1000) + ' detik.'
    });
  }

  // Payload size check
  if (!checkPayloadSize(req, res, 500 * 1024)) return;

  const body = req.body || {}
  const {
    mode = 'quick',           // 'quick' | 'blueprint'
    topic = '',
    variable = '',
    dimensions = '',
    scale = 5,
    itemsPerDimension = 5,
    includeDemografi = false,
  } = body

  if (!topic && !variable) {
    return res.status(400).json({ error: 'topic atau variable wajib diisi' })
  }

  const gcKey  = process.env.GENERALCOMPUTE_API_KEY
  const groqKey = process.env.GROQ_API_KEY
  const kimiKey = process.env.KIMI_API_KEY
  const orKey   = process.env.OPENROUTER_API_KEY
  const orModel = process.env.OPENROUTER_MODEL || OPENROUTER_MODEL_DEFAULT
  if (!gcKey && !groqKey && !kimiKey && !orKey) {
    return res.status(500).json({ error: 'No API key configured' })
  }

  const prompt = buildPrompt({ mode, topic, variable, dimensions, scale, itemsPerDimension, includeDemografi })
  const errors = []

  if (gcKey) {
    const out = await callJSON(GC_URL, GC_MODEL, gcKey, prompt, false)
    if (out.ok) {
      // Log successful order
      await createOrder(supabaseAdmin, { userId: user.id, service: 'statistics', tier: 'kuesioner', amount: billing.price, status: 'completed' })
      return res.status(200).json({ success: true, provider: `generalcompute:${GC_MODEL}`, ...out.data })
    }
    errors.push(`generalcompute/${GC_MODEL}: ${out.error}`)
    if (process.env.NODE_ENV !== 'production') console.log('[gen-kuesioner]', errors.at(-1))
  }
  if (orKey) {
    const out = await callJSON(OPENROUTER_URL, orModel, orKey, prompt, true)
    if (out.ok) {
      // Log successful order
      await createOrder(supabaseAdmin, { userId: user.id, service: 'statistics', tier: 'kuesioner', amount: billing.price, status: 'completed' })
      return res.status(200).json({ success: true, provider: `openrouter:${orModel}`, ...out.data })
    }
    errors.push(`openrouter/${orModel}: ${out.error}`)
    if (process.env.NODE_ENV !== 'production') console.log('[gen-kuesioner]', errors.at(-1))
  }
  if (groqKey) {
    const out = await callJSON(GROQ_URL, GROQ_MODEL, groqKey, prompt, false)
    if (out.ok) {
      // Log successful order
      await createOrder(supabaseAdmin, { userId: user.id, service: 'statistics', tier: 'kuesioner', amount: billing.price, status: 'completed' })
      return res.status(200).json({ success: true, provider: `groq:${GROQ_MODEL}`, ...out.data })
    }
    errors.push(`groq: ${out.error}`)
    if (process.env.NODE_ENV !== 'production') console.log('[gen-kuesioner]', errors.at(-1))
  }
  if (kimiKey) {
    const out = await callJSON(KIMI_URL, KIMI_MODEL, kimiKey, prompt, false)
    if (out.ok) {
      // Log successful order
      await createOrder(supabaseAdmin, { userId: user.id, service: 'statistics', tier: 'kuesioner', amount: billing.price, status: 'completed' })
      return res.status(200).json({ success: true, provider: 'kimi', ...out.data })
    }
    errors.push(`kimi: ${out.error}`)
    if (process.env.NODE_ENV !== 'production') console.log('[gen-kuesioner]', errors.at(-1))
  }

  return res.status(503).json({
    error: 'Semua provider AI sedang sibuk. Coba lagi 30 detik.',
    detail: errors.join(' | '),
  })
}

// =====================================================================
// Prompt builder
// =====================================================================
function buildPrompt({ mode, topic, variable, dimensions, scale, itemsPerDimension, includeDemografi }) {
  const sc = [4, 5, 6, 7].includes(Number(scale)) ? Number(scale) : 5
  const npd = Math.max(3, Math.min(12, Number(itemsPerDimension) || 5))
  const reverseCount = Math.max(1, Math.floor(npd / 4))

  const blueprintSchema = mode === 'blueprint'
    ? `,
  "blueprint": {
    "definisiOperasional": "string — 2-3 kalimat definisi konstruk berbasis teori",
    "teoriRujukan": "string — nama teori/tokoh utama yang dijadikan rujukan",
    "dimensions": [
      {
        "name": "string — nama dimensi",
        "definition": "string — definisi singkat dimensi (1 kalimat)",
        "indicators": ["string — indikator perilaku/sikap yang teramati"]
      }
    ]
  }`
    : ''

  const system = `Anda adalah ahli psikometri yang menyusun instrumen penelitian (kuesioner) untuk skripsi/tesis Indonesia.
Output WAJIB JSON valid sesuai schema. JANGAN bungkus dengan markdown fence. JANGAN tambahkan penjelasan apapun di luar JSON.

SCHEMA:
{
  "title": "string — judul kuesioner",
  "description": "string — deskripsi singkat 1-2 kalimat"${blueprintSchema},
  "sections": [
    {
      "title": "string — nama dimensi/bagian",
      "description": "string — penjelasan singkat dimensi",
      "items": [
        {
          "label": "string — pernyataan lengkap (Bahasa Indonesia formal)",
          "type": "likert",
          "scale": ${sc},
          "reverseCoded": false
        }
      ]
    }
  ]
}

ATURAN PENYUSUNAN ITEM:
1. Bahasa Indonesia formal, jelas, mudah dipahami responden umum.
2. Format pernyataan orang pertama: "Saya..." atau "Menurut saya..." (bukan kalimat tanya).
3. Satu item = satu ide. Hindari double-barreled.
4. Hindari kata "tidak/bukan" ganda yang membingungkan.
5. Setiap dimensi WAJIB mengandung minimal ${reverseCount} item reverse-coded (set "reverseCoded": true) — biasanya pernyataan yang arahnya berlawanan dari konstruk positif.
6. Skala Likert ${sc} poin (Sangat Tidak Setuju – Sangat Setuju).
7. Item harus jelas-jelas mengukur dimensi yang ditargetkan, bukan hal lain.
8. ${npd} item per dimensi.`

  const demografiNote = includeDemografi
    ? '\n\nSertakan section pertama berjudul "Demografi" dengan items type "multichoice" atau "short_text"/"number" (BUKAN likert) untuk: Jenis Kelamin (multichoice: Laki-laki/Perempuan), Usia (number), Pendidikan terakhir (multichoice). Items demografi tidak butuh "reverseCoded" / "scale".'
    : ''

  const user = mode === 'blueprint'
    ? `Susun instrumen penelitian LENGKAP DENGAN BLUEPRINT untuk variabel: "${variable || topic}".

${dimensions
  ? `Dimensi yang sudah ditentukan oleh peneliti: ${dimensions}\nGunakan dimensi ini dan susun definisi + indikator + item untuk masing-masing.`
  : 'Tentukan 2-4 dimensi yang relevan secara teoretis. Sebutkan teori/tokoh rujukannya di field "teoriRujukan".'
}

Setiap dimensi berisi ${npd} item.${demografiNote}

Output: JSON sesuai schema (WAJIB sertakan field "blueprint").`
    : `Susun kuesioner untuk topik penelitian: "${topic}".

${variable ? `Variabel utama: ${variable}\n` : ''}${dimensions ? `Dimensi: ${dimensions}\n` : 'Tentukan 1-3 dimensi yang relevan.\n'}
Setiap dimensi berisi ${npd} item Likert ${sc}-skala.${demografiNote}

Output: JSON sesuai schema (TANPA field "blueprint").`

  return { system, user }
}

// =====================================================================
// Provider call — return parsed JSON
// =====================================================================
async function callJSON(url, model, key, prompt, isOpenRouter) {
  try {
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }
    if (isOpenRouter) {
      headers['HTTP-Referer'] = 'https://zoya-id-beta.vercel.app'
      headers['X-Title'] = 'zoya.id'
    }
    const payload = {
      model,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user',   content: prompt.user },
      ],
      temperature: 0.5,
      max_tokens: 4000,
    }
    // GeneralCompute, Groq, OpenRouter mendukung json_object. Kimi tidak.
    if (!url.includes('moonshot.ai')) {
      payload.response_format = { type: 'json_object' }
    }

    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) })
    let data
    try { data = await r.json() } catch { data = {} }
    if (!r.ok) {
      return { ok: false, error: data.error?.message || `HTTP ${r.status}` }
    }
    const text = (data.choices?.[0]?.message?.content || '').trim()
    if (!text) return { ok: false, error: 'Empty response' }

    const parsed = parseLooseJSON(text)
    if (!parsed) return { ok: false, error: 'JSON parse failed' }
    if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
      return { ok: false, error: 'Invalid response: missing sections' }
    }
    return { ok: true, data: parsed }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

function parseLooseJSON(text) {
  try { return JSON.parse(text) } catch { /* fallthrough */ }
  // Strip markdown fence kalau model masih bandel
  const stripped = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  try { return JSON.parse(stripped) } catch { /* fallthrough */ }
  // Cari blok JSON pertama { ... }
  const m = stripped.match(/\{[\s\S]*\}/)
  if (m) {
    try { return JSON.parse(m[0]) } catch { return null }
  }
  return null
}
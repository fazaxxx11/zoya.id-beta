// AI Explain Chat — pop-up "Belum Paham?" untuk hasil uji statistik.
// AI menjelaskan dengan bahasa santai (kayak ngobrol ke anak SMA).
// Provider chain: OpenRouter -> Groq -> Kimi.
// Rate limit: max 5 user turns per session (server-side guard + client-side counter).

const GROQ_URL       = 'https://api.groq.com/openai/v1/chat/completions'
const KIMI_URL       = 'https://api.moonshot.ai/v1/chat/completions'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const GROQ_MODEL = 'llama-3.3-70b-versatile'
const KIMI_MODEL = 'moonshot-v1-8k'
const OPENROUTER_MODEL_DEFAULT = 'openrouter/auto'

const MAX_USER_TURNS = 5

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body || {}
  const { resultContext = '', messages = [] } = body

  if (!resultContext) {
    return res.status(400).json({ error: 'resultContext wajib diisi' })
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages tidak boleh kosong' })
  }

  const userCount = messages.filter(m => m.role === 'user').length
  if (userCount > MAX_USER_TURNS) {
    return res.status(429).json({
      error: `Limit ${MAX_USER_TURNS} pertanyaan per hasil tercapai.`,
      limit: MAX_USER_TURNS,
    })
  }

  const groqKey = process.env.GROQ_API_KEY
  const kimiKey = process.env.KIMI_API_KEY
  const orKey   = process.env.OPENROUTER_API_KEY
  const orModel = process.env.OPENROUTER_MODEL || OPENROUTER_MODEL_DEFAULT
  if (!groqKey && !kimiKey && !orKey) {
    return res.status(500).json({ error: 'No API key configured' })
  }

  const systemPrompt = buildSystemPrompt(resultContext)
  const cleanMsgs = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant'))
    .map(m => ({ role: m.role, content: String(m.content || '').slice(0, 2000) }))

  const remaining = Math.max(0, MAX_USER_TURNS - userCount)
  const errors = []

  if (orKey) {
    const out = await callChat(OPENROUTER_URL, orModel, orKey, systemPrompt, cleanMsgs, true)
    if (out.ok) return res.status(200).json({ reply: out.text, provider: `openrouter:${orModel}`, remaining, maxTurns: MAX_USER_TURNS })
    errors.push(`openrouter/${orModel}: ${out.error}`)
    console.log('[explain-chat]', errors.at(-1))
  }
  if (groqKey) {
    const out = await callChat(GROQ_URL, GROQ_MODEL, groqKey, systemPrompt, cleanMsgs, false)
    if (out.ok) return res.status(200).json({ reply: out.text, provider: `groq:${GROQ_MODEL}`, remaining, maxTurns: MAX_USER_TURNS })
    errors.push(`groq: ${out.error}`)
    console.log('[explain-chat]', errors.at(-1))
  }
  if (kimiKey) {
    const out = await callChat(KIMI_URL, KIMI_MODEL, kimiKey, systemPrompt, cleanMsgs, false)
    if (out.ok) return res.status(200).json({ reply: out.text, provider: 'kimi', remaining, maxTurns: MAX_USER_TURNS })
    errors.push(`kimi: ${out.error}`)
    console.log('[explain-chat]', errors.at(-1))
  }

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

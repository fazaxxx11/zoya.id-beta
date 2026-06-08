// AI Kuesioner Generator
// Mode: "quick" → topik + jumlah item → generate kuesioner
//        "blueprint" → variable + dimensions → definisi operasional + indikator + items
// Provider chain: GeneralCompute → OpenRouter → Groq → Kimi.
// Middleware: JWT auth + dual rate limit + payload guard + AI timeout

import { aiMiddleware, callAIWithTimeout, getSupabaseAdmin } from './_lib/middleware.js'
import { checkToolAccess, chargeForTool, createOrder } from './_lib/billing.js'

const GC_URL          = 'https://api.generalcompute.com/v1/chat/completions'
const GROQ_URL       = 'https://api.groq.com/openai/v1/chat/completions'
const KIMI_URL       = 'https://api.moonshot.ai/v1/chat/completions'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const GC_MODEL = 'deepseek-v3.2'
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const KIMI_MODEL = 'moonshot-v1-8k'
const OPENROUTER_MODEL_DEFAULT = 'openrouter/auto'

export default async function handler(req, res) {
  // ── Middleware: auth + rate limit + payload + CORS ──
  const user = await aiMiddleware(req, res, 'kuesioner');
  if (!user) return;

  const supabaseAdmin = getSupabaseAdmin();

  // ── Billing check ──
  const billing = await checkToolAccess(supabaseAdmin, user.id, 'kuesioner', 1);
  if (!billing.allowed) {
    return res.status(402).json({ error: 'Saldo tidak cukup', reason: billing.reason, price: billing.price, balance: billing.balance });
  }

  let orderId = null;
  if (billing.price > 0) {
    const charge = await chargeForTool(supabaseAdmin, user.id, 'kuesioner', 1, null);
    if (!charge.success) return res.status(402).json({ error: charge.error || 'Pembayaran gagal' });
    orderId = charge.orderId;
  }

  const body = req.body || {};
  const {
    mode = 'quick',
    topic = '',
    variable = '',
    dimensions = '',
    scale = 5,
    itemsPerDimension = 5,
    includeDemografi = false,
  } = body;

  if (!topic && !variable) {
    return res.status(400).json({ error: 'topic atau variable wajib diisi' });
  }

  const gcKey  = process.env.GENERALCOMPUTE_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const kimiKey = process.env.KIMI_API_KEY;
  const orKey   = process.env.OPENROUTER_API_KEY;
  const orModel = process.env.OPENROUTER_MODEL || OPENROUTER_MODEL_DEFAULT;

  if (!gcKey && !groqKey && !kimiKey && !orKey) {
    return res.status(500).json({ error: 'Tidak ada API key yang dikonfigurasi' });
  }

  const prompt = buildPrompt({ mode, topic, variable, dimensions, scale, itemsPerDimension, includeDemografi });

  // Provider cascade
  const providers = [];
  if (gcKey)  providers.push({ url: GC_URL, model: GC_MODEL, key: gcKey, isOpenRouter: false });
  if (orKey)  providers.push({ url: OPENROUTER_URL, model: orModel, key: orKey, isOpenRouter: true });
  if (groqKey) providers.push({ url: GROQ_URL, model: GROQ_MODEL, key: groqKey, isOpenRouter: false });
  if (kimiKey) providers.push({ url: KIMI_URL, model: KIMI_MODEL, key: kimiKey, isOpenRouter: false });

  for (const p of providers) {
    const out = await callKuesionerProvider(p, prompt);
    if (out.ok) {
      await createOrder(supabaseAdmin, { userId: user.id, service: 'statistics', tier: 'kuesioner', amount: billing.price, status: 'completed' });
      return res.status(200).json({ success: true, provider: p.model, ...out.data });
    }
  }

  return res.status(503).json({ error: 'Semua provider AI sedang sibuk. Coba lagi 30 detik.' });
}

async function callKuesionerProvider(provider, prompt) {
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.key}` };
  if (provider.isOpenRouter) {
    headers['HTTP-Referer'] = 'https://zoya.id';
    headers['X-Title'] = 'zoya.id';
  }

  const body = {
    model: provider.model,
    messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }],
    temperature: 0.5,
    max_tokens: 4000,
  };
  if (!provider.url.includes('moonshot.ai')) {
    body.response_format = { type: 'json_object' };
  }

  const result = await callAIWithTimeout(provider.url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!result.ok) return { ok: false, error: result.error };

  const text = (result.data.choices?.[0]?.message?.content || '').trim();
  if (!text) return { ok: false, error: 'Empty response' };

  const parsed = parseLooseJSON(text);
  if (!parsed) return { ok: false, error: 'JSON parse failed' };
  if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
    return { ok: false, error: 'Invalid response: missing sections' };
  }
  return { ok: true, data: parsed };
}

function parseLooseJSON(text) {
  try { return JSON.parse(text); } catch { /* fallthrough */ }
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try { return JSON.parse(stripped); } catch { /* fallthrough */ }
  const m = stripped.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { return null; } }
  return null;
}

function buildPrompt({ mode, topic, variable, dimensions, scale, itemsPerDimension, includeDemografi }) {
  const sc = [4, 5, 6, 7].includes(Number(scale)) ? Number(scale) : 5;
  const npd = Math.max(3, Math.min(12, Number(itemsPerDimension) || 5));
  const reverseCount = Math.max(1, Math.floor(npd / 4));

  const blueprintSchema = mode === 'blueprint'
    ? `,"blueprint":{"definisiOperasional":"string","teoriRujukan":"string","dimensions":[{"name":"string","definition":"string","indicators":["string"]}]}`
    : '';

  return {
    system: `Anda adalah ahli psikometri Indonesia. Output WAJIB JSON valid sesuai schema.

SCHEMA:
{"title":"string","description":"string"${blueprintSchema},"sections":[{"title":"string","description":"string","items":[{"label":"string","type":"likert","scale":${sc},"reverseCoded":false}]}]}

ATURAN:
1. Bahasa Indonesia formal, orang pertama "Saya...".
2. Satu item = satu ide. Hindari double-barreled.
3. Minimal ${reverseCount} item reverse-coded per dimensi.
4. Skala Likert ${sc} poin.
5. ${npd} item per dimensi.`,
    user: mode === 'blueprint'
      ? `Susun instrumen LENGKAP DENGAN BLUEPRINT untuk: "${variable || topic}".${dimensions ? ` Dimensi: ${dimensions}` : ''} ${npd} item per dimensi.${includeDemografi ? ' Sertakan demografi.' : ''} Output: JSON (WAJIB field "blueprint").`
      : `Susun kuesioner untuk: "${topic}".${variable ? ` Variabel: ${variable}.` : ''}${dimensions ? ` Dimensi: ${dimensions}` : ''} ${npd} item Likert ${sc}-skala.${includeDemografi ? ' Sertakan demografi.' : ''} Output: JSON (TANPA "blueprint").`,
  };
}

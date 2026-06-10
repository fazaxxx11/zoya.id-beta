// AI Kuesioner Generator
// Mode: "quick" → topik + jumlah item → generate kuesioner
//        "blueprint" → variable + dimensions → definisi operasional + indikator + items
// Provider chain: centralized config + circuit breaker.
// Middleware: JWT auth + dual rate limit + payload guard + AI timeout

import { aiMiddleware, callAIWithTimeout, getSupabaseAdmin } from './_lib/middleware.js'
import { checkToolAccess, chargeForTool, createOrder } from './_lib/billing.js'
import { KuesionerSchema, validate } from './_lib/validate.js'
import { getProviders, buildHeaders, buildChatBody } from './_lib/ai-providers.js'
import { isAvailable, recordSuccess, recordFailure } from './_lib/circuit-breaker.js'

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

  // ── Zod validation ──
  const validation = validate(KuesionerSchema, body);
  if (!validation.valid) {
    return res.status(400).json({ error: 'Payload tidak valid', details: validation.errors });
  }
  const { mode, topic, variable, dimensions, scale, itemsPerDimension, includeDemografi } = validation.data;

  const providers = getProviders();
  if (providers.length === 0) {
    return res.status(500).json({ error: 'Tidak ada API key yang dikonfigurasi' });
  }

  const prompt = buildPrompt({ mode, topic, variable, dimensions, scale, itemsPerDimension, includeDemografi });

  // Provider cascade with circuit breaker
  for (const provider of providers) {
    if (!isAvailable(provider.id)) continue;

    const out = await callKuesionerProvider(provider, prompt);
    if (out.ok) {
      recordSuccess(provider.id);
      await createOrder(supabaseAdmin, { userId: user.id, service: 'statistics', tier: 'kuesioner', amount: billing.price, status: 'completed' });
      return res.status(200).json({ success: true, provider: `${provider.id}:${provider.model}`, ...out.data });
    }
    recordFailure(provider.id);
  }

  return res.status(503).json({ error: 'Semua provider AI sedang sibuk. Coba lagi 30 detik.' });
}

async function callKuesionerProvider(provider, prompt) {
  const headers = buildHeaders(provider);
  const messages = [
    { role: 'system', content: prompt.system },
    { role: 'user', content: prompt.user },
  ];
  const body = buildChatBody(provider, messages, { temperature: 0.5, maxTokens: 4000 });

  // Kimi doesn't support response_format
  if (provider.id !== 'kimi') {
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

// AI Explain Chat — "Belum Paham?" popup untuk hasil uji statistik.
// AI menjelaskan dengan bahasa santai (kayak ngobrol ke anak SMA).
// Provider chain: centralized config + circuit breaker.
// Rate limit: max 5 user turns per session (server-side guard).
// Middleware: JWT auth + dual rate limit + payload guard + AI timeout

import { aiMiddleware, callAIWithTimeout, getSupabaseAdmin } from './_lib/middleware.js'
import { checkToolAccess, chargeForTool, createOrder } from './_lib/billing.js'
import { ExplainSchema, validate } from './_lib/validate.js'
import { getProviders, buildHeaders, buildChatBody } from './_lib/ai-providers.js'
import { isAvailable, recordSuccess, recordFailure } from './_lib/circuit-breaker.js'

const MAX_USER_TURNS = 5

export default async function handler(req, res) {
  // ── Middleware: auth + rate limit + payload + CORS ──
  const user = await aiMiddleware(req, res, 'explain');
  if (!user) return;

  const supabaseAdmin = getSupabaseAdmin();
  const body = req.body || {};
  // ── Zod validation ──
  const validation = validate(ExplainSchema, body);
  if (!validation.valid) {
    return res.status(400).json({ error: 'Payload tidak valid', details: validation.errors });
  }
  const { resultContext, messages } = validation.data;

  // ── Billing check (free tool, but still check access) ──
  const toolId = 'deskriptif';
  const billingCheck = await checkToolAccess(supabaseAdmin, user.id, toolId, 1);
  if (!billingCheck.allowed) {
    return res.status(402).json({ error: 'Saldo tidak cukup', reason: billingCheck.reason });
  }

  const userCount = messages.filter(m => m.role === 'user').length;
  if (userCount > MAX_USER_TURNS) {
    return res.status(429).json({ error: `Limit ${MAX_USER_TURNS} pertanyaan per hasil tercapai.`, limit: MAX_USER_TURNS });
  }

  const providers = getProviders();
  if (providers.length === 0) {
    return res.status(500).json({ error: 'Tidak ada API key yang dikonfigurasi' });
  }

  const systemPrompt = buildSystemPrompt(resultContext);
  const cleanMsgs = messages.map(m => ({
    role: m.role,
    content: (m.content || '').substring(0, 2000)
  }));
  const remaining = Math.max(0, MAX_USER_TURNS - userCount);

  // Charge if needed
  if (billingCheck.price > 0) {
    const chargeResult = await chargeForTool(supabaseAdmin, user.id, toolId, billingCheck.price, 1);
    if (!chargeResult.success) {
      return res.status(402).json({ error: 'Pembayaran gagal', reason: chargeResult.reason });
    }
  }

  // Provider cascade with circuit breaker
  for (const provider of providers) {
    if (!isAvailable(provider.id)) continue;

    const out = await callChatProvider(provider, systemPrompt, cleanMsgs);
    if (out.ok) {
      recordSuccess(provider.id);
      await createOrder(supabaseAdmin, { userId: user.id, service: 'statistics', tier: 'explain', amount: 0, status: 'completed' });
      return res.status(200).json({ reply: out.text, provider: `${provider.id}:${provider.model}`, remaining, maxTurns: MAX_USER_TURNS });
    }
    recordFailure(provider.id);
  }

  return res.status(503).json({ error: 'Semua provider AI sedang sibuk. Coba lagi 30 detik.' });
}

async function callChatProvider(provider, systemPrompt, messages) {
  const headers = buildHeaders(provider);
  const allMessages = [{ role: 'system', content: systemPrompt }, ...messages];
  const body = buildChatBody(provider, allMessages, { temperature: 0.7, maxTokens: 600 });

  const result = await callAIWithTimeout(provider.url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!result.ok) return { ok: false, error: result.error };

  const text = (result.data.choices?.[0]?.message?.content || '').trim();
  if (!text) return { ok: false, error: 'Empty response' };
  return { ok: true, text };
}

function buildSystemPrompt(resultContext) {
  // Sanitize context to prevent prompt injection
  const safeContext = (resultContext || '')
    .replace(/ignore|disregard|forget|override|system prompt|you are now/gi, '[filtered]')
    .substring(0, 5000);

  return `Kamu adalah teman ngobrol yang sabar dan jago jelasin statistik dengan bahasa SANGAT SEDERHANA.

GAYA BICARA:
- Pakai bahasa Indonesia santai, kayak ngobrol sama temen atau adik kelas SMA.
- HINDARI istilah teknis tanpa penjelasan. Kalau pakai istilah, langsung kasih analogi sehari-hari.
- Pakai contoh konkret dari kehidupan nyata.
- Boleh pakai emoji secukupnya (1-2 per jawaban).
- Maksimal 4-6 kalimat per jawaban.
- Pakai sapaan "kamu" (jangan "Anda").

KONTEKS HASIL UJI:
${safeContext}

ATURAN:
1. Jawab mengacu ke hasil uji di atas (jangan ngarang angka).
2. Kalau user nanya di luar konteks statistik, ingatkan halus dan arahkan balik.
3. Tone: hangat, gak menggurui, sabar.`;
}

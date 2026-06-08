// AI assessment endpoint (Vercel serverless function).
// Mode baru: {rubrik, jawaban, studentName, title, context}
// Mode lama: {messages, max_tokens} (backward compat)
// Middleware: JWT auth + dual rate limit + payload guard + AI timeout

import { buildAssessPrompt, validateAssessResponse, parseJSONLoose } from './_lib/assessPrompt.js'
import { aiMiddleware, callAIWithTimeout, sanitizeError, getSupabaseAdmin } from './_lib/middleware.js'
import { checkToolAccess, chargeForTool, createOrder } from './_lib/billing.js'

const GC_URL = 'https://api.generalcompute.com/v1/chat/completions'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const KIMI_URL = 'https://api.moonshot.ai/v1/chat/completions'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const GC_MODEL = 'deepseek-v3.2'
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const KIMI_MODEL = 'moonshot-v1-8k'
const OPENROUTER_MODEL_DEFAULT = 'openrouter/auto'

export default async function handler(req, res) {
  // ── Middleware: auth + rate limit + payload + CORS ──
  const user = await aiMiddleware(req, res, 'assess');
  if (!user) return;

  const supabaseAdmin = getSupabaseAdmin();
  const body = req.body || {};

  // ── Billing check ──
  const toolId = 'assessment';
  const sampleSize = Array.isArray(body.jawaban) ? body.jawaban.length : 1;
  const billingCheck = await checkToolAccess(supabaseAdmin, user.id, toolId, sampleSize);
  if (!billingCheck.allowed) {
    return res.status(402).json({
      error: billingCheck.error || 'Saldo tidak cukup',
      reason: billingCheck.reason,
      price: billingCheck.price,
      balance: billingCheck.balance,
    });
  }

  const gcKey = process.env.GENERALCOMPUTE_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const kimiKey = process.env.KIMI_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;
  const orModel = process.env.OPENROUTER_MODEL || OPENROUTER_MODEL_DEFAULT;

  if (!gcKey && !groqKey && !kimiKey && !orKey) {
    return res.status(500).json({ error: 'Tidak ada API key yang dikonfigurasi' });
  }

  const ctx = { gcKey, groqKey, kimiKey, orKey, orModel, body };

  // ── Mode baru: structured assess ──
  if (body.rubrik && body.jawaban) {
    return handleStructuredAssess(req, res, ctx, user, toolId, billingCheck, sampleSize);
  }

  // ── Mode lama: messages array ──
  if (body.messages) {
    return handleLegacyMessages(req, res, ctx, user, toolId, billingCheck);
  }

  return res.status(400).json({ error: 'Payload tidak valid. Kirim {rubrik, jawaban, ...} atau {messages}.' });
}

// =====================================================================
// MODE BARU: structured assess
// =====================================================================
async function handleStructuredAssess(req, res, { gcKey, groqKey, kimiKey, orKey, orModel, body }, user, toolId, billingCheck, sampleSize) {
  const supabaseAdmin = getSupabaseAdmin();
  const { rubrik, jawaban, studentName, title, context } = body;

  let prompt;
  try {
    prompt = buildAssessPrompt({ rubrik, jawaban, studentName, title, context });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  // Charge wallet
  if (billingCheck.price > 0) {
    const chargeResult = await chargeForTool(supabaseAdmin, user.id, toolId, billingCheck.price, sampleSize);
    if (!chargeResult.success) {
      return res.status(402).json({
        error: chargeResult.error || 'Pembayaran gagal',
        reason: chargeResult.reason,
        price: billingCheck.price,
        balance: chargeResult.balance,
      });
    }
  }

  const providers = [];
  if (gcKey) providers.push({ name: 'generalcompute', url: GC_URL, model: GC_MODEL, key: gcKey, isOpenRouter: false });
  if (orKey) providers.push({ name: 'openrouter', url: OPENROUTER_URL, model: orModel, key: orKey, isOpenRouter: true });
  if (groqKey) providers.push({ name: 'groq', url: GROQ_URL, model: GROQ_MODEL, key: groqKey, isOpenRouter: false });
  if (kimiKey) providers.push({ name: 'kimi', url: KIMI_URL, model: KIMI_MODEL, key: kimiKey, isOpenRouter: false });

  for (const provider of providers) {
    const result = await callAssessProvider(provider, prompt, rubrik);
    if (result.ok) {
      await createOrder(supabaseAdmin, { userId: user.id, service: 'assessment', tier: 'assessment', amount: billingCheck.price, status: 'completed' });
      return res.status(200).json({
        success: true,
        provider: `${provider.name}:${provider.model}`,
        scores: result.scores,
        kesimpulan: result.kesimpulan,
        tokens: result.tokens,
      });
    }
  }

  await createOrder(supabaseAdmin, { userId: user.id, service: 'assessment', tier: 'assessment', amount: billingCheck.price, status: 'failed' });
  return res.status(503).json({ error: 'Semua provider AI sedang sibuk. Coba lagi 30 detik.' });
}

async function callAssessProvider(provider, prompt, rubrik) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ];
    if (attempt > 0) {
      messages.push({ role: 'user', content: 'Output JSON sebelumnya tidak valid. Return ulang HANYA JSON valid sesuai schema.' });
    }

    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.key}` };
    if (provider.isOpenRouter) {
      headers['HTTP-Referer'] = 'https://zoya.id';
      headers['X-Title'] = 'zoya.id';
    }

    const body = { model: provider.model, messages, temperature: 0.3, max_tokens: 1500 };
    if (provider.isOpenRouter) body.response_format = { type: 'json_object' };

    const result = await callAIWithTimeout(provider.url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!result.ok) continue;

    const raw = result.data.choices?.[0]?.message?.content || '';
    const parsed = parseJSONLoose(raw);
    const validation = validateAssessResponse(parsed, rubrik);
    if (validation.valid) {
      return { ok: true, scores: validation.scores, kesimpulan: validation.kesimpulan, tokens: result.data.usage?.total_tokens };
    }
    if (attempt === 1) return { ok: false, error: 'Validation failed' };
  }
  return { ok: false };
}

// =====================================================================
// MODE LAMA: passthrough messages array
// =====================================================================
async function handleLegacyMessages(req, res, { gcKey, groqKey, kimiKey, body }, user, toolId, billingCheck) {
  const supabaseAdmin = getSupabaseAdmin();
  const { messages, max_tokens } = body;

  if (billingCheck.price > 0) {
    const chargeResult = await chargeForTool(supabaseAdmin, user.id, toolId, billingCheck.price, 1);
    if (!chargeResult.success) {
      return res.status(402).json({ error: chargeResult.error || 'Pembayaran gagal', reason: chargeResult.reason });
    }
  }

  const providers = [];
  if (gcKey) providers.push({ url: GC_URL, model: GC_MODEL, key: gcKey });
  if (groqKey) providers.push({ url: GROQ_URL, model: GROQ_MODEL, key: groqKey });
  if (kimiKey) providers.push({ url: KIMI_URL, model: KIMI_MODEL, key: kimiKey });

  for (const p of providers) {
    const result = await callAIWithTimeout(p.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${p.key}` },
      body: JSON.stringify({ model: p.model, messages, max_tokens: max_tokens || 1000, temperature: 0.3 }),
    });
    if (result.ok) {
      await createOrder(supabaseAdmin, { userId: user.id, service: 'assessment', tier: 'assessment', amount: billingCheck.price, status: 'completed' });
      return res.status(200).json({
        content: [{ type: 'text', text: result.data.choices?.[0]?.message?.content || '' }],
        provider: p.model,
      });
    }
  }

  await createOrder(supabaseAdmin, { userId: user.id, service: 'assessment', tier: 'assessment', amount: billingCheck.price, status: 'failed' });
  return res.status(503).json({ error: 'Semua provider AI sedang sibuk. Coba lagi 30 detik.' });
}

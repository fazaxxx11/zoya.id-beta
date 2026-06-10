// AI assessment endpoint (Vercel serverless function).
// Mode baru: {rubrik, jawaban, studentName, title, context}
// Mode lama: {messages, max_tokens} (backward compat)
// Middleware: JWT auth + dual rate limit + payload guard + AI timeout
// Provider: centralized config + circuit breaker

import { buildAssessPrompt, validateAssessResponse, parseJSONLoose } from './_lib/assessPrompt.js'
import { aiMiddleware, callAIWithTimeout, sanitizeError, getSupabaseAdmin } from './_lib/middleware.js'
import { checkToolAccess, chargeForTool, createOrder } from './_lib/billing.js'
import { AssessSchema, validate } from './_lib/validate.js'
import { getProviders, buildHeaders, buildChatBody } from './_lib/ai-providers.js'
import { isAvailable, recordSuccess, recordFailure } from './_lib/circuit-breaker.js'

export default async function handler(req, res) {
  // ── Middleware: auth + rate limit + payload + CORS ──
  const user = await aiMiddleware(req, res, 'assess');
  if (!user) return;

  const supabaseAdmin = getSupabaseAdmin();
  const body = req.body || {};

  // ── Zod validation (before billing to reject garbage early) ──
  const validation = validate(AssessSchema, body);
  if (!validation.valid) {
    return res.status(400).json({ error: 'Payload tidak valid', details: validation.errors });
  }

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

  const providers = getProviders();
  if (providers.length === 0) {
    return res.status(500).json({ error: 'Tidak ada API key yang dikonfigurasi' });
  }

  // ── Mode baru: structured assess ──
  if (body.rubrik && body.jawaban) {
    return handleStructuredAssess(req, res, providers, body, user, toolId, billingCheck, sampleSize);
  }

  // ── Mode lama: messages array ──
  if (body.messages) {
    return handleLegacyMessages(req, res, providers, body, user, toolId, billingCheck);
  }

  return res.status(400).json({ error: 'Payload tidak valid. Kirim {rubrik, jawaban, ...} atau {messages}.' });
}

// =====================================================================
// MODE BARU: structured assess
// =====================================================================
async function handleStructuredAssess(req, res, providers, body, user, toolId, billingCheck, sampleSize) {
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

  for (const provider of providers) {
    if (!isAvailable(provider.id)) continue;

    const result = await callAssessProvider(provider, prompt, rubrik);
    if (result.ok) {
      recordSuccess(provider.id);
      await createOrder(supabaseAdmin, { userId: user.id, service: 'assessment', tier: 'assessment', amount: billingCheck.price, status: 'completed' });
      return res.status(200).json({
        success: true,
        provider: `${provider.id}:${provider.model}`,
        scores: result.scores,
        kesimpulan: result.kesimpulan,
        tokens: result.tokens,
      });
    }
    recordFailure(provider.id);
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

    const headers = buildHeaders(provider);
    const body = buildChatBody(provider, messages, { temperature: 0.3, maxTokens: 1500 });

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
async function handleLegacyMessages(req, res, providers, body, user, toolId, billingCheck) {
  const supabaseAdmin = getSupabaseAdmin();
  const { messages, max_tokens } = body;

  if (billingCheck.price > 0) {
    const chargeResult = await chargeForTool(supabaseAdmin, user.id, toolId, billingCheck.price, 1);
    if (!chargeResult.success) {
      return res.status(402).json({ error: chargeResult.error || 'Pembayaran gagal', reason: chargeResult.reason });
    }
  }

  for (const p of providers) {
    if (!isAvailable(p.id)) continue;

    const result = await callAIWithTimeout(p.url, {
      method: 'POST',
      headers: buildHeaders(p),
      body: JSON.stringify(buildChatBody(p, messages, { maxTokens: max_tokens || 1000 })),
    });
    if (result.ok) {
      recordSuccess(p.id);
      await createOrder(supabaseAdmin, { userId: user.id, service: 'assessment', tier: 'assessment', amount: billingCheck.price, status: 'completed' });
      return res.status(200).json({
        content: [{ type: 'text', text: result.data.choices?.[0]?.message?.content || '' }],
        provider: p.model,
      });
    }
    recordFailure(p.id);
  }

  await createOrder(supabaseAdmin, { userId: user.id, service: 'assessment', tier: 'assessment', amount: billingCheck.price, status: 'failed' });
  return res.status(503).json({ error: 'Semua provider AI sedang sibuk. Coba lagi 30 detik.' });
}

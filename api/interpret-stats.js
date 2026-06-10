// AI Interpretation untuk hasil analisis statistik.
// Menerima result object → return paragraf interpretasi akademik Bahasa Indonesia.
// Providers: centralized config + circuit breaker.
// Middleware: JWT auth + dual rate limit + payload guard + AI timeout

import { aiMiddleware, callAIWithTimeout, sanitizeError, getSupabaseAdmin } from './_lib/middleware.js'
import { checkToolAccess, chargeForTool, createOrder } from './_lib/billing.js'
import { InterpretSchema, validate } from './_lib/validate.js'
import { getProviders, getGroqCascadeModels, buildHeaders, buildChatBody } from './_lib/ai-providers.js'
import { isAvailable, recordSuccess, recordFailure } from './_lib/circuit-breaker.js'

export default async function handler(req, res) {
  // ── Middleware: auth + rate limit + payload + CORS ──
  const user = await aiMiddleware(req, res, 'interpret');
  if (!user) return;

  const supabaseAdmin = getSupabaseAdmin();
  const body = req.body || {};
  const { result } = body;

  // ── Zod validation ──
  const validation = validate(InterpretSchema, { result });
  if (!validation.valid) {
    return res.status(400).json({ error: 'Payload tidak valid', details: validation.errors });
  }

  // ── Billing check ──
  const toolIdMap = {
    descriptive: 'deskriptif', normality: 'normalitas', correlation: 'korelasi',
    ttest: 'ttest', anova: 'anova', regression_simple: 'regresi',
    regression_multiple: 'regresiganda', chisquare: 'chisquare',
    mannwhitney: 'mannwhitney', wilcoxon: 'wilcoxon', kruskal: 'kruskal',
    validity_reliability: 'validitas', mediation: 'mediation',
    logistic: 'logistic', efa: 'efa',
  };
  const toolId = toolIdMap[result.type] || 'deskriptif';
  const sampleSize = 1;

  const billingCheck = await checkToolAccess(supabaseAdmin, user.id, toolId, sampleSize);
  if (!billingCheck.allowed) {
    return res.status(402).json({
      error: billingCheck.error || 'Saldo tidak cukup',
      reason: billingCheck.reason,
      price: billingCheck.price,
      balance: billingCheck.balance,
    });
  }

  // Charge wallet
  if (billingCheck.price > 0) {
    const chargeResult = await chargeForTool(supabaseAdmin, user.id, toolId, billingCheck.price, sampleSize);
    if (!chargeResult.success) {
      return res.status(402).json({ error: chargeResult.error || 'Pembayaran gagal', reason: chargeResult.reason });
    }
  }

  const providers = getProviders();
  if (providers.length === 0) {
    return res.status(500).json({ error: 'Tidak ada API key yang dikonfigurasi' });
  }

  const prompt = buildPrompt(result);
  const errors = [];

  // ── Provider cascade with circuit breaker ──
  for (const provider of providers) {
    // Special handling for Groq: try model cascade
    if (provider.id === 'groq') {
      const groqModels = getGroqCascadeModels();
      for (const model of groqModels) {
        if (!isAvailable(provider.id)) break;
        const groqProvider = { ...provider, model };
        const out = await callInterpretProvider(groqProvider, prompt);
        if (out.ok) {
          recordSuccess(provider.id);
          await createOrder(supabaseAdmin, { userId: user.id, service: 'statistics', tier: toolId, amount: billingCheck.price, status: 'completed' });
          return res.status(200).json({ success: true, provider: `groq:${model}`, interpretation: out.text, tokens: out.tokens });
        }
        errors.push(`groq/${model}: ${out.error}`);
        recordFailure(provider.id);
      }
      continue;
    }

    if (!isAvailable(provider.id)) {
      errors.push(`${provider.id}: circuit open`);
      continue;
    }

    const out = await callInterpretProvider(provider, prompt);
    if (out.ok) {
      recordSuccess(provider.id);
      await createOrder(supabaseAdmin, { userId: user.id, service: 'statistics', tier: toolId, amount: billingCheck.price, status: 'completed' });
      return res.status(200).json({ success: true, provider: `${provider.id}:${provider.model}`, interpretation: out.text, tokens: out.tokens });
    }
    errors.push(`${provider.id}/${provider.model}: ${out.error}`);
    recordFailure(provider.id);
  }

  await createOrder(supabaseAdmin, { userId: user.id, service: 'statistics', tier: toolId, amount: billingCheck.price, status: 'failed' });
  return res.status(503).json({ error: 'Semua provider AI sedang sibuk. Coba lagi 30 detik.' });
}

async function callInterpretProvider(provider, prompt) {
  const headers = buildHeaders(provider);
  const body = buildChatBody(provider, [
    { role: 'system', content: prompt.system },
    { role: 'user', content: prompt.user },
  ], { temperature: 0.3, maxTokens: 1500 });

  const result = await callAIWithTimeout(provider.url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!result.ok) return { ok: false, error: result.error, transient: true };

  const text = (result.data.choices?.[0]?.message?.content || '').trim();
  if (!text) return { ok: false, error: 'Empty response' };
  return { ok: true, text, tokens: result.data.usage?.total_tokens };
}

function buildPrompt(result) {
  const facts = formatFacts(result);
  return {
    system: `Anda adalah konsultan statistik akademik Indonesia. Tugas Anda menulis interpretasi hasil analisis statistik untuk skripsi/tesis dalam Bahasa Indonesia formal-akademik.

ATURAN:
1. Tulis 3-4 paragraf, total 200-350 kata.
2. Paragraf 1: tujuan analisis, metode, dan jumlah sampel.
3. Paragraf 2: hasil utama dengan angka (format APA).
4. Paragraf 3: interpretasi praktis-substansif.
5. Paragraf 4 (opsional): catatan asumsi/keterbatasan.
6. JANGAN emoji, bullet, atau heading. Hanya prosa paragraf.
7. Gunakan istilah teknis Indonesia: "signifikan", "berpengaruh", dll.
8. Hindari kata "kami", "saya", "aku". Pakai impersonal.
9. Output langsung paragraf interpretasi.`,
    user: `Berikut data hasil analisis. Tuliskan interpretasi akademik.\n\n${facts}`,
  };
}

function formatFacts(r) {
  const lines = [];
  lines.push(`Jenis analisis: ${r.toolName || r.type}`);
  if (r.sampleSize) lines.push(`Jumlah sampel: ${r.sampleSize}`);
  const fmt = (v, d = 3) => v == null ? '—' : typeof v === 'number' ? Number(v).toFixed(d) : String(v);
  const pf = (p) => p == null ? '—' : (p < 0.001 ? '< 0.001' : Number(p).toFixed(4));

  switch (r.type) {
    case 'descriptive':
      r.stats?.forEach(s => lines.push(`- ${s.column}: M = ${fmt(s.mean)}, SD = ${fmt(s.stdDev)}, n = ${s.n}`));
      break;
    case 'normality':
      r.results?.forEach(row => lines.push(`- ${row.column}: p = ${pf(row.pValue)}, ${row.isNormal ? 'normal' : 'tidak normal'}`));
      break;
    case 'correlation':
      lines.push(`r = ${fmt(r.r ?? r.rho)}, p = ${pf(r.pValue)}, n = ${r.n}`);
      break;
    case 'ttest':
      lines.push(`t = ${fmt(r.t)}, df = ${fmt(r.df, 2)}, p = ${pf(r.pValue)}`);
      if (r.cohensD != null) lines.push(`Cohen's d = ${fmt(r.cohensD)}`);
      break;
    case 'anova':
      lines.push(`F(${r.dfBetween}, ${r.dfWithin}) = ${fmt(r.F)}, p = ${pf(r.pValue)}, η² = ${fmt(r.etaSquared)}`);
      break;
    case 'regression_simple':
      lines.push(`R² = ${fmt(r.rSquared)}, F = ${fmt(r.F)}, p = ${pf(r.pF)}`);
      break;
    case 'regression_multiple':
      lines.push(`R² = ${fmt(r.rSquared)}, Adj. R² = ${fmt(r.adjustedR2)}, F = ${fmt(r.F)}, p = ${pf(r.pF)}`);
      break;
    case 'chisquare':
      lines.push(`χ² = ${fmt(r.chi2)}, df = ${r.df}, p = ${pf(r.pValue)}, Cramer's V = ${fmt(r.cramersV)}`);
      break;
    default:
      lines.push(JSON.stringify(r).substring(0, 500));
  }
  return lines.join('\n');
}

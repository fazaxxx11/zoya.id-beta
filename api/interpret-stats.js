// AI Interpretation untuk hasil analisis statistik.
// Menerima result object → return paragraf interpretasi akademik Bahasa Indonesia.
// Providers: GeneralCompute → OpenRouter → Groq → Kimi.
// Middleware: JWT auth + dual rate limit + payload guard + AI timeout

import { aiMiddleware, callAIWithTimeout, sanitizeError, getSupabaseAdmin } from './_lib/middleware.js'
import { checkToolAccess, chargeForTool, createOrder } from './_lib/billing.js'

const GC_URL = 'https://api.generalcompute.com/v1/chat/completions'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const KIMI_URL = 'https://api.moonshot.ai/v1/chat/completions'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const GC_MODEL = 'deepseek-v3.2'
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']
const KIMI_MODEL = 'moonshot-v1-8k'
const OPENROUTER_MODEL_DEFAULT = 'openrouter/auto'

export default async function handler(req, res) {
  // ── Middleware: auth + rate limit + payload + CORS ──
  const user = await aiMiddleware(req, res, 'interpret');
  if (!user) return;

  const supabaseAdmin = getSupabaseAdmin();
  const body = req.body || {};
  const { result } = body;

  if (!result || !result.type) {
    return res.status(400).json({ error: 'Payload result tidak valid.' });
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

  const gcKey = process.env.GENERALCOMPUTE_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const kimiKey = process.env.KIMI_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;
  const orModel = process.env.OPENROUTER_MODEL || OPENROUTER_MODEL_DEFAULT;

  if (!gcKey && !groqKey && !kimiKey && !orKey) {
    return res.status(500).json({ error: 'Tidak ada API key yang dikonfigurasi' });
  }

  const prompt = buildPrompt(result);
  const errors = [];

  // GeneralCompute (primary)
  if (gcKey) {
    const out = await callInterpretProvider(GC_URL, GC_MODEL, gcKey, prompt);
    if (out.ok) {
      await createOrder(supabaseAdmin, { userId: user.id, service: 'statistics', tier: toolId, amount: billingCheck.price, status: 'completed' });
      return res.status(200).json({ success: true, provider: `generalcompute:${GC_MODEL}`, interpretation: out.text, tokens: out.tokens });
    }
    errors.push(`${GC_MODEL}: ${out.error}`);
  }

  // OpenRouter
  if (orKey) {
    const out = await callInterpretProvider(OPENROUTER_URL, orModel, orKey, prompt, true);
    if (out.ok) {
      await createOrder(supabaseAdmin, { userId: user.id, service: 'statistics', tier: toolId, amount: billingCheck.price, status: 'completed' });
      return res.status(200).json({ success: true, provider: `openrouter:${orModel}`, interpretation: out.text, tokens: out.tokens });
    }
    errors.push(`openrouter/${orModel}: ${out.error}`);
  }

  // Groq (model cascade)
  if (groqKey) {
    for (const model of GROQ_MODELS) {
      const out = await callInterpretProvider(GROQ_URL, model, groqKey, prompt);
      if (out.ok) {
        await createOrder(supabaseAdmin, { userId: user.id, service: 'statistics', tier: toolId, amount: billingCheck.price, status: 'completed' });
        return res.status(200).json({ success: true, provider: `groq:${model}`, interpretation: out.text, tokens: out.tokens });
      }
      errors.push(`groq/${model}: ${out.error}`);
      if (!out.transient) break;
    }
  }

  // Kimi
  if (kimiKey) {
    const out = await callInterpretProvider(KIMI_URL, KIMI_MODEL, kimiKey, prompt);
    if (out.ok) {
      await createOrder(supabaseAdmin, { userId: user.id, service: 'statistics', tier: toolId, amount: billingCheck.price, status: 'completed' });
      return res.status(200).json({ success: true, provider: 'kimi', interpretation: out.text, tokens: out.tokens });
    }
    errors.push(`kimi: ${out.error}`);
  }

  await createOrder(supabaseAdmin, { userId: user.id, service: 'statistics', tier: toolId, amount: billingCheck.price, status: 'failed' });
  return res.status(503).json({ error: 'Semua provider AI sedang sibuk. Coba lagi 30 detik.' });
}

async function callInterpretProvider(url, model, key, prompt, isOpenRouter = false) {
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` };
  if (isOpenRouter) {
    headers['HTTP-Referer'] = 'https://zoya.id';
    headers['X-Title'] = 'zoya.id';
  }

  const body = { model, messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }], temperature: 0.3, max_tokens: 1500 };

  const result = await callAIWithTimeout(url, { method: 'POST', headers, body: JSON.stringify(body) });
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

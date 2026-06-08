// AI Interpretation untuk hasil analisis statistik.
// Menerima result object → return paragraf interpretasi akademik Bahasa Indonesia.
// Providers (prioritas): GeneralCompute → OpenRouter → Groq → Kimi.

import { requireAuth, checkRateLimit, getClientIp, checkPayloadSize, sanitize } from './_lib/auth.js'
import { corsMiddleware, securityHeaders, sanitizeError } from './_lib/security.js'
import { checkToolAccess, chargeForTool, createOrder } from './_lib/billing.js'
import { supabaseAdmin } from './_lib/auth.js'

const GC_URL = 'https://api.generalcompute.com/v1/chat/completions'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const KIMI_URL = 'https://api.moonshot.ai/v1/chat/completions'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const GC_MODEL = 'deepseek-v3.2'
// Cascade: large model first, fall back to small instant model when overloaded.
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']
const KIMI_MODEL = 'moonshot-v1-8k'
// Default = Auto Router. Override via env OPENROUTER_MODEL kalau mau model spesifik.
const OPENROUTER_MODEL_DEFAULT = 'openrouter/auto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Security checks
  const user = await requireAuth(req, res);
  if (!user) return;

  // Security headers + CORS
  corsMiddleware(req, res)
  securityHeaders(res)

  // Billing check
  const body = req.body || {}
  const { result } = body
  if (!result || !result.type) {
    return res.status(400).json({ error: 'Missing result payload' })
  }
  const toolIdMap = {
    descriptive: 'deskriptif',
    normality: 'normalitas',
    correlation: 'korelasi',
    ttest: 'ttest',
    anova: 'anova',
    regression_simple: 'regresi',
    regression_multiple: 'regresiganda',
    chisquare: 'chisquare',
    mannwhitney: 'mannwhitney',
    wilcoxon: 'wilcoxon',
    kruskal: 'kruskal',
    validity_reliability: 'validitas',
    mediation: 'mediation',
    logistic: 'logistic',
    efa: 'efa'
  }
  const toolId = toolIdMap[result.type] || 'deskriptif'
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

  const rl = await checkRateLimit('interpret:' + user.id, { maxRequests: 20, windowMs: 60000 });
  if (!rl.allowed) {
    return res.status(429).json({
      error: 'Terlalu banyak permintaan. Coba lagi dalam 1 menit.',
      retryAfter: Math.ceil(rl.retryAfter / 1000)
    });
  }

  if (!checkPayloadSize(req, res, 500 * 1024)) return;

  // Sanitize input
  const sanitizedResult = sanitize(result);

  const gcKey = process.env.GENERALCOMPUTE_API_KEY
  const groqKey = process.env.GROQ_API_KEY
  const kimiKey = process.env.KIMI_API_KEY
  const orKey = process.env.OPENROUTER_API_KEY
  const orModel = process.env.OPENROUTER_MODEL || OPENROUTER_MODEL_DEFAULT
  if (!gcKey && !groqKey && !kimiKey && !orKey) {
    return res.status(500).json({ error: 'No API key configured' })
  }

  // Charge wallet if price > 0
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

  const prompt = buildPrompt(sanitizedResult)
  const errors = []

  // Try General Compute first (DeepSeek V3.2 — primary)
  if (gcKey) {
    const out = await callWithRetry(GC_URL, GC_MODEL, gcKey, prompt)
    if (out.ok) {
      // Log usage
      await createOrder(supabaseAdmin, user.id, toolId, billingCheck.price, sampleSize, 'success')
      return res.status(200).json({
        success: true,
        provider: `generalcompute:${GC_MODEL}`,
        interpretation: out.text,
        tokens: out.tokens,
      })
    }
    const errMsg = `generalcompute/${GC_MODEL}: ${out.error}`
    if (process.env.NODE_ENV !== 'production') console.log('[interpret]', errMsg)
    errors.push(errMsg)
  }

  // Fallback: OpenRouter
  if (orKey) {
    const out = await callWithRetry(OPENROUTER_URL, orModel, orKey, prompt, 2, true)
    if (out.ok) {
      // Log usage
      await createOrder(supabaseAdmin, user.id, toolId, billingCheck.price, sampleSize, 'success')
      return res.status(200).json({
        success: true,
        provider: `openrouter:${orModel}`,
        interpretation: out.text,
        tokens: out.tokens,
      })
    }
    const errMsg = `openrouter/${orModel}: ${out.error}`
    if (process.env.NODE_ENV !== 'production') console.log('[interpret]', errMsg)
    errors.push(errMsg)
  }

  // Try Groq with model cascade (large → small instant fallback)
  if (groqKey) {
    for (const model of GROQ_MODELS) {
      const out = await callWithRetry(GROQ_URL, model, groqKey, prompt)
      if (out.ok) {
        // Log usage
        await createOrder(supabaseAdmin, user.id, toolId, billingCheck.price, sampleSize, 'success')
        return res.status(200).json({
          success: true,
          provider: `groq:${model}`,
          interpretation: out.text,
          tokens: out.tokens,
        })
      }
      const errMsg = `groq/${model}: ${out.error}`
      if (process.env.NODE_ENV !== 'production') console.log('[interpret]', errMsg)
      errors.push(errMsg)
      // Kalau bukan rate-limit/overload, no point coba model Groq lain — langsung Kimi
      if (!out.transient) break
    }
  }

  if (kimiKey) {
    const out = await callWithRetry(KIMI_URL, KIMI_MODEL, kimiKey, prompt)
    if (out.ok) {
      // Log usage
      await createOrder(supabaseAdmin, user.id, toolId, billingCheck.price, sampleSize, 'success')
      return res.status(200).json({
        success: true,
        provider: 'kimi',
        interpretation: out.text,
        tokens: out.tokens,
      })
    }
    const errMsg = `kimi: ${out.error}`
    if (process.env.NODE_ENV !== 'production') console.log('[interpret]', errMsg)
    errors.push(errMsg)
  }

  // Log failed usage
  await createOrder(supabaseAdmin, user.id, toolId, billingCheck.price, sampleSize, 'failed')
  return res.status(503).json({
    error: 'Semua provider AI sedang sibuk. Coba lagi 30 detik atau tulis interpretasi manual.',
    detail: errors.join(' | '),
  })
}

// =====================================================================
// Retry wrapper — coba 2x untuk error transient (429, 5xx, network)
// =====================================================================
async function callWithRetry(url, model, key, prompt, maxAttempts = 2, isOpenRouter = false) {
  let last
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    last = await callLLM(url, model, key, prompt, isOpenRouter)
    if (last.ok) return last
    if (!last.transient) return last
    if (attempt < maxAttempts) {
      // Backoff: 800ms, 1600ms
      await new Promise(r => setTimeout(r, 800 * attempt))
    }
  }
  return last
}

// =====================================================================
// Prompt builder
// =====================================================================
function buildPrompt(result) {
  const facts = formatFacts(result)

  const system = `Anda adalah konsultan statistik akademik Indonesia. Tugas Anda menulis interpretasi hasil analisis statistik untuk skripsi/tesis dalam Bahasa Indonesia formal-akademik.

ATURAN:
1. Tulis 3-4 paragraf, total 200-350 kata.
2. Paragraf 1: tujuan analisis, metode, dan jumlah sampel.
3. Paragraf 2: hasil utama dengan angka (gunakan format APA: misal "t(48) = 2.13, p = 0.038", "F(2, 147) = 119.26, p < 0.001", "r = 0.82, p < 0.001").
4. Paragraf 3: interpretasi praktis-substansif (apa artinya untuk peneliti). Jelaskan effect size jika tersedia (small/medium/large).
5. Paragraf 4 (opsional): catatan asumsi atau keterbatasan singkat.
6. JANGAN gunakan emoji, bullet, atau heading. Hanya prosa paragraf.
7. JANGAN mengulang angka yang sama berkali-kali. Sebut sekali, lanjut interpretasi.
8. Gunakan istilah teknis Indonesia: "signifikan", "berpengaruh", "ditolak/diterima", "berbeda secara nyata", "korelasi positif/negatif", dll.
9. Hindari kata "kami", "saya", "aku". Pakai impersonal: "hasil menunjukkan...", "ditemukan bahwa...", "dapat disimpulkan...".
10. Bila hasil tidak signifikan, jangan paksa kesimpulan signifikan.
11. Output langsung paragraf interpretasi (tanpa kalimat pembuka seperti "Berikut interpretasinya:").`

  const user = `Berikut data hasil analisis. Tuliskan interpretasi akademik untuk skripsi.

${facts}`

  return { system, user }
}

function formatFacts(r) {
  const lines = []
  lines.push(`Jenis analisis: ${r.toolName || r.type}`)
  if (r.sampleSize) lines.push(`Jumlah sampel: ${r.sampleSize}`)

  const fmt = (v, d = 3) => {
    if (v === null || v === undefined) return '—'
    if (typeof v === 'number') {
      if (Math.abs(v) < 0.0001 && v !== 0) return v.toExponential(2)
      return Number(v).toFixed(d)
    }
    return String(v)
  }
  const pf = (p) => p == null ? '—' : (p < 0.001 ? '< 0.001' : Number(p).toFixed(4))

  switch (r.type) {
    case 'descriptive':
      lines.push('\nStatistik deskriptif per variabel:')
      r.stats?.forEach(s => {
        lines.push(`- ${s.column}: M = ${fmt(s.mean)}, SD = ${fmt(s.stdDev)}, Med = ${fmt(s.median)}, n = ${s.n}, skewness = ${fmt(s.skewness)}, kurtosis = ${fmt(s.kurtosis)}`)
      })
      break

    case 'normality':
      lines.push('\nUji normalitas:')
      r.results?.forEach(row => {
        lines.push(`- ${row.column} (${row.method}): statistik = ${fmt(row.W ?? row.D)}, p = ${pf(row.pValue)}, status = ${row.isNormal ? 'normal' : 'tidak normal'}`)
      })
      break

    case 'correlation':
      lines.push(`Metode: Korelasi ${r.method === 'spearman' ? 'Spearman (non-parametrik)' : 'Pearson (parametrik)'}`)
      lines.push(`Variabel: ${r.x} dan ${r.y}`)
      lines.push(`Koefisien: ${r.method === 'spearman' ? 'rho' : 'r'} = ${fmt(r.r ?? r.rho)}`)
      lines.push(`p-value = ${pf(r.pValue)}, t = ${fmt(r.t)}, df = ${r.df}, n = ${r.n}`)
      lines.push(`Kekuatan: ${r.strength || '—'}, arah: ${r.direction || '—'}`)
      break

    case 'ttest':
      lines.push(`Mode: ${r.test || r.mode}`)
      lines.push(`t = ${fmt(r.t)}, df = ${fmt(r.df, 2)}, p = ${pf(r.pValue)}`)
      if (r.cohensD != null) lines.push(`Cohen's d = ${fmt(r.cohensD)} (${r.effectSize})`)
      if (r.ci95) lines.push(`95% CI: [${fmt(r.ci95[0])}, ${fmt(r.ci95[1])}]`)
      lines.push(`Signifikan: ${r.significant ? 'YA' : 'TIDAK'}`)
      if (r.group1 && r.group2) {
        lines.push(`Grup 1 (${r.groupNames?.[0]}): n = ${r.group1.n}, M = ${fmt(r.group1.mean)}, SD = ${fmt(r.group1.sd)}`)
        lines.push(`Grup 2 (${r.groupNames?.[1]}): n = ${r.group2.n}, M = ${fmt(r.group2.mean)}, SD = ${fmt(r.group2.sd)}`)
      }
      if (r.meanDiff != null) lines.push(`Mean difference = ${fmt(r.meanDiff)}`)
      break

    case 'anova':
      lines.push(`F(${r.dfBetween}, ${r.dfWithin}) = ${fmt(r.F)}, p = ${pf(r.pValue)}`)
      lines.push(`η² = ${fmt(r.etaSquared)}, ω² = ${fmt(r.omegaSquared)}`)
      lines.push(`N total = ${r.N}, signifikan: ${r.significant ? 'YA' : 'TIDAK'}`)
      lines.push('Per grup:')
      r.groupStats?.forEach(g => {
        lines.push(`- ${g.label}: n = ${g.n}, M = ${fmt(g.mean)}, SD = ${fmt(g.sd)}`)
      })
      if (r.posthoc?.length) {
        lines.push('Post-hoc (Tukey HSD):')
        r.posthoc.forEach(p => {
          lines.push(`- ${p.group1} vs ${p.group2}: mean diff = ${fmt(p.meanDiff)}, p = ${pf(p.pValue)}, ${p.significant ? 'signifikan' : 'tidak'}`)
        })
      }
      break

    case 'regression_simple':
      lines.push(`Predictor: ${r.x} → Outcome: ${r.y}`)
      lines.push(`R² = ${fmt(r.rSquared)}, Adj. R² = ${fmt(r.adjustedR2)}`)
      lines.push(`F(1, ${r.n - 2}) = ${fmt(r.F)}, p = ${pf(r.pF)}`)
      lines.push(`Intercept = ${fmt(r.intercept)} (SE = ${fmt(r.intercept_se)}, p = ${pf(r.intercept_p)})`)
      lines.push(`Slope = ${fmt(r.slope)} (SE = ${fmt(r.slope_se)}, p = ${pf(r.slope_p)})`)
      lines.push(`β standardized = ${fmt(r.standardizedBeta)}`)
      lines.push(`Persamaan: ${r.equation}`)
      lines.push(`n = ${r.n}, signifikan: ${r.significant ? 'YA' : 'TIDAK'}`)
      break

    case 'regression_multiple':
      lines.push(`Predictors: ${r.predictors?.join(', ')} → Outcome: ${r.outcome}`)
      lines.push(`R² = ${fmt(r.rSquared)}, Adj. R² = ${fmt(r.adjustedR2)}`)
      lines.push(`F = ${fmt(r.F)}, p = ${pf(r.pF)}`)
      lines.push('Koefisien:')
      r.coefficients?.forEach(c => {
        lines.push(`- ${c.name}: b = ${fmt(c.b)}, SE = ${fmt(c.se)}, t = ${fmt(c.t)}, p = ${pf(c.p)}`)
      })
      if (r.vifs?.length) {
        lines.push(`VIF: ${r.vifs.map(v => `${v.predictor} = ${fmt(v.vif)}`).join('; ')}`)
        lines.push(`Multikolinearitas: ${r.multicollinearity}`)
      }
      lines.push(`Persamaan: ${r.equation}`)
      lines.push(`n = ${r.n}`)
      break

    case 'chisquare':
      lines.push(`Variabel: ${r.var1} × ${r.var2}`)
      lines.push(`χ² = ${fmt(r.chi2)}, df = ${r.df}, p = ${pf(r.pValue)}, N = ${r.N}`)
      if (r.phi != null) lines.push(`Phi (φ) = ${fmt(r.phi)}`)
      lines.push(`Cramer's V = ${fmt(r.cramersV)} (${r.effectSizeLabel})`)
      lines.push(`Signifikan: ${r.isSignificant ? 'YA' : 'TIDAK'}`)
      if (r.assumptionWarning) lines.push(`PERINGATAN ASUMSI: ${r.assumptionWarning}`)
      lines.push(`Tabel kontingensi:`)
      r.observed?.forEach((row, i) => {
        lines.push(`- ${r.rowLabels[i]}: ${row.map((v, j) => `${r.colLabels[j]}=${v}`).join(', ')}`)
      })
      break

    case 'mannwhitney':
      lines.push(`Outcome: ${r.outcome}, Grouping: ${r.grouping}`)
      lines.push(`U = ${fmt(r.U)}, z = ${fmt(r.z)}, p = ${pf(r.pValue)}`)
      lines.push(`Effect size r = ${fmt(r.effectSize)} (${r.effectSizeLabel})`)
      lines.push(`Grup 1 (${r.groupNames?.[0]}): n = ${r.n1}, mean rank = ${fmt(r.meanRank1, 2)}, sum rank = ${fmt(r.R1, 1)}`)
      lines.push(`Grup 2 (${r.groupNames?.[1]}): n = ${r.n2}, mean rank = ${fmt(r.meanRank2, 2)}, sum rank = ${fmt(r.R2, 1)}`)
      lines.push(`Signifikan: ${r.isSignificant ? 'YA' : 'TIDAK'}`)
      break

    case 'wilcoxon':
      lines.push(`Variabel: ${r.column1} vs ${r.column2}`)
      lines.push(`W = ${fmt(r.W)}, z = ${fmt(r.z)}, p = ${pf(r.pValue)}`)
      lines.push(`W+ = ${fmt(r.Wpos, 1)}, W- = ${fmt(r.Wneg, 1)}`)
      lines.push(`Mean diff = ${fmt(r.meanDiff)}, n pasangan = ${r.n}`)
      lines.push(`Effect size r = ${fmt(r.effectSize)}`)
      lines.push(`Signifikan: ${r.isSignificant ? 'YA' : 'TIDAK'}`)
      break

    case 'kruskal':
      lines.push(`Outcome: ${r.outcome}, Grouping: ${r.grouping}`)
      lines.push(`H = ${fmt(r.H)}, df = ${r.df}, p = ${pf(r.pValue)}`)
      lines.push(`η² = ${fmt(r.etaSquared)} (${r.effectSizeLabel})`)
      lines.push(`N total = ${r.N}, k grup = ${r.k}`)
      r.groupStats?.forEach(g => {
        lines.push(`- ${g.name}: n = ${g.n}, median = ${fmt(g.median, 2)}, mean rank = ${fmt(g.meanRank, 2)}`)
      })
      lines.push(`Signifikan: ${r.isSignificant ? 'YA' : 'TIDAK'}`)
      break

    case 'batch_anova':
    case 'batch_kruskal':
      lines.push(`Konteks: Batch analysis lintas ${r.fileCount} file/dataset, kolom dianalisis "${r.column}".`)
      lines.push(`Tiap file diperlakukan sebagai grup independen.`)
      if (r.assumptions) {
        const a = r.assumptions
        lines.push(`Cek asumsi: ${a.allNormal ? 'semua file normal (Shapiro-Wilk)' : 'minimal satu file menyimpang dari distribusi normal'}; varians ${a.homogeneous == null ? 'tidak diketahui' : (a.homogeneous ? 'homogen' : 'tidak homogen')} (Levene). Rekomendasi metode: ${a.recommendation === 'kruskal' ? 'Kruskal-Wallis' : 'One-way ANOVA'}.`)
      }
      lines.push('Statistik deskriptif per file:')
      r.groups?.forEach(g => {
        lines.push(`- ${g.name}: n = ${g.n}, M = ${fmt(g.mean)}, SD = ${fmt(g.sd)}, Med = ${fmt(g.median)}`)
      })
      if (r.type === 'batch

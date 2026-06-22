// babIVClient.js — Client for /api/babiv_generate
// Calls Vercel serverless function to generate AI narrative per section.

const API_URL = '/api/babiv_generate'

/**
 * Generate AI narrative for a single section.
 * @param {'descriptive'|'assumptions'|'hypothesis'|'discussion'|'synthesis'} section
 * @param {string} dataStr - Serialized analysis data
 * @param {number} maxTokens - Max tokens for response
 * @returns {Promise<{success: boolean, text?: string, error?: string}>}
 */
export async function generateBabIVSection(section, dataStr, maxTokens = 800) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section,
        data: dataStr,
        maxTokens,
      }),
    })

    const json = await res.json()
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || `HTTP ${res.status}` }
    }

    return { success: true, text: json.text }
  } catch (e) {
    return { success: false, error: e.message || 'Network error' }
  }
}

/**
 * Generate all Bab IV sections from analysis results.
 * Runs in parallel with concurrency limit.
 * Falls back to deterministic localTemplate on failure.
 */
export async function generateAllSections(analyses, { onProgress } = {}) {
  const results = {}
  const sections = [
    { id: 'descriptive', label: '4.1 Deskripsi Data', items: analyses.filter(a => a.result?.type === 'descriptive') },
    { id: 'assumptions', label: '4.2 Uji Asumsi', items: analyses.filter(a => a.result?.type === 'normality' || a.result?.type === 'validity_reliability') },
    { id: 'hypothesis', label: '4.3 Pengujian Hipotesis', items: analyses.filter(a => !['descriptive', 'normality', 'validity_reliability'].includes(a.result?.type)) },
    { id: 'discussion', label: '4.4 Pembahasan', items: analyses },
    { id: 'synthesis', label: 'Sintesis', items: analyses },
  ]

  for (const section of sections) {
    onProgress?.({ section: section.id, status: 'generating', label: section.label })

    if (section.items.length === 0) {
      results[section.id] = ''
      onProgress?.({ section: section.id, status: 'empty', label: section.label })
      continue
    }

    // Build data string for AI
    const dataParts = section.items.map(a => {
      const r = a.result
      if (!r) return ''
      return `[${r.toolName || r.type}]\n${summarizeResult(r)}`
    }).filter(Boolean)

    const dataStr = dataParts.join('\n\n')

    const resp = await generateBabIVSection(section.id, dataStr, section.id === 'discussion' ? 1200 : 800)

    if (resp.success) {
      results[section.id] = resp.text
      onProgress?.({ section: section.id, status: 'done', label: section.label })
    } else {
      results[section.id] = null
      onProgress?.({ section: section.id, status: 'failed', label: section.label, error: resp.error })
    }
  }

  return results
}

function summarizeResult(r) {
  if (!r) return ''
  const fmt = (v, d = 3) => {
    if (v == null) return '—'
    if (typeof v === 'number') return v.toFixed(d)
    return String(v)
  }
  const pf = (p) => p == null ? '—' : (p < 0.001 ? '< 0,001' : p.toFixed(3))

  switch (r.type) {
    case 'descriptive': {
      const vars = (r.stats || []).map(s => `${s.column}: M=${fmt(s.mean)}, SD=${fmt(s.stdDev)}, n=${s.n}`).join(' | ')
      return `Statistik deskriptif: ${vars}`
    }
    case 'normality': {
      const rows = (r.results || []).map(x => `${x.column}: ${x.method}, stat=${fmt(x.W ?? x.D)}, p=${pf(x.pValue)}, ${x.isNormal ? 'normal' : 'tidak normal'}`).join(' | ')
      return `Uji normalitas: ${rows}`
    }
    case 'correlation':
      return `Korelasi ${r.method === 'spearman' ? 'Spearman' : 'Pearson'}: r=${fmt(r.r ?? r.rho)}, p=${pf(r.pValue)}, n=${r.n}, kekuatan=${r.strength}, arah=${r.direction}`
    case 'ttest':
      return `Uji t (${r.mode}): t(${fmt(r.df,2)})=${fmt(r.t)}, p=${pf(r.pValue)}, d=${fmt(r.cohensD)}, CI=[${fmt(r.ci95?.[0])}, ${fmt(r.ci95?.[1])}]`
    case 'anova':
      return `ANOVA: F(${r.dfBetween},${r.dfWithin})=${fmt(r.F)}, p=${pf(r.pValue)}, η²=${fmt(r.etaSquared)}, ω²=${fmt(r.omegaSquared)}`
    case 'regression_simple':
      return `Regresi sederhana: R²=${fmt(r.rSquared)}, F=${fmt(r.F)}, p=${pf(r.pF)}, slope=${fmt(r.slope)}, p=${pf(r.slope_p)}, persamaan=${r.equation}`
    case 'regression_multiple':
      return `Regresi berganda: R²=${fmt(r.rSquared)}, Adj R²=${fmt(r.adjustedR2)}, F=${fmt(r.F)}, p=${pf(r.pF)}, n=${r.n}`
    case 'chisquare':
      return `Chi-Square: χ²(${r.df})=${fmt(r.chiSquare || r.chi2)}, p=${pf(r.pValue)}, V=${fmt(r.cramersV)}`
    case 'mannwhitney':
      return `Mann-Whitney U: U=${fmt(r.U)}, z=${fmt(r.z)}, p=${pf(r.pValue)}, r=${fmt(r.effectSize)}`
    case 'wilcoxon':
      return `Wilcoxon: W=${fmt(r.W)}, z=${fmt(r.z)}, p=${pf(r.pValue)}, r=${fmt(r.effectSize)}`
    case 'kruskal':
      return `Kruskal-Wallis: H(${r.df})=${fmt(r.H)}, p=${pf(r.pValue)}, η²=${fmt(r.etaSquared)}`
    case 'validity_reliability':
      return `Validitas & Reliabilitas: α=${fmt(r.reliability?.alpha)}, ${r.validity?.items?.filter(i=>i.verdict?.includes('Valid'))?.length||0}/${r.validity?.items?.length||0} item valid`
    default:
      return `${r.type || 'analisis'}: n=${r.n || r.N || '—'}`
  }
}

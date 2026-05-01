// Extract key metrics from a saved_analyses.result jsonb for side-by-side comparison.
// Returns: { groups: [{ title, metrics: [{label, value, hint?}] }] }

const fmt = (v, d = 3) => {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') {
    if (!isFinite(v)) return '—'
    if (Math.abs(v) < 0.0001 && v !== 0) return v.toExponential(2)
    return Number(v).toFixed(d)
  }
  return String(v)
}
const pf = (p) => p == null ? '—' : (p < 0.001 ? '< 0.001' : Number(p).toFixed(4))

/**
 * @param {object} result - the result jsonb from saved_analyses
 * @returns {Array<{section: string, items: Array<{label: string, value: string, sig?: boolean, hint?: string}>}>}
 */
export function extractCompareMetrics(result) {
  if (!result || !result.type) return []

  switch (result.type) {
    case 'descriptive':
      return descriptive(result)
    case 'normality':
      return normality(result)
    case 'correlation':
      return correlation(result)
    case 'ttest':
      return ttest(result)
    case 'anova':
      return anova(result)
    case 'regression_simple':
      return regressionSimple(result)
    case 'regression_multiple':
      return regressionMultiple(result)
    case 'chisquare':
      return chisquare(result)
    case 'mannwhitney':
      return mannwhitney(result)
    case 'wilcoxon':
      return wilcoxon(result)
    case 'kruskal':
      return kruskal(result)
    case 'validity_reliability':
      return validity(result)
    default:
      return [{ section: 'Data', items: [{ label: 'Tipe', value: result.type }] }]
  }
}

// =====================================================================
// Per-tool extractors
// =====================================================================
function descriptive(r) {
  const sections = []
  r.stats?.forEach(s => {
    sections.push({
      section: s.column,
      items: [
        { label: 'Mean', value: fmt(s.mean) },
        { label: 'SD', value: fmt(s.stdDev) },
        { label: 'Median', value: fmt(s.median) },
        { label: 'Min / Max', value: `${fmt(s.min, 2)} / ${fmt(s.max, 2)}` },
        { label: 'n', value: String(s.n) },
        { label: 'Skewness', value: fmt(s.skewness) },
        { label: 'Kurtosis', value: fmt(s.kurtosis) },
      ],
    })
  })
  return sections
}

function normality(r) {
  return [{
    section: 'Uji Normalitas',
    items: (r.results || []).flatMap(row => [
      { label: `${row.column} — Statistik`, value: fmt(row.W ?? row.D, 4) },
      { label: `${row.column} — p-value`, value: pf(row.pValue), sig: row.pValue < 0.05 },
      { label: `${row.column} — Status`, value: row.isNormal ? 'Normal' : 'Tidak Normal' },
    ]),
  }]
}

function correlation(r) {
  const coef = r.r ?? r.rho
  return [{
    section: `Korelasi (${r.method})`,
    items: [
      { label: 'Variabel', value: `${r.x} × ${r.y}` },
      { label: r.method === 'spearman' ? 'rho (ρ)' : 'r (Pearson)', value: fmt(coef, 4), sig: r.pValue < 0.05 },
      { label: 'p-value', value: pf(r.pValue), sig: r.pValue < 0.05 },
      { label: 't', value: fmt(r.t) },
      { label: 'df', value: String(r.df ?? '—') },
      { label: 'n', value: String(r.n ?? '—') },
      { label: 'Kekuatan', value: r.strength || '—' },
      { label: 'Arah', value: r.direction || '—' },
    ],
  }]
}

function ttest(r) {
  const items = [
    { label: 'Mode', value: r.test || r.mode || '—' },
    { label: 't', value: fmt(r.t), sig: r.significant },
    { label: 'df', value: fmt(r.df, 2) },
    { label: 'p-value', value: pf(r.pValue), sig: r.significant },
    { label: 'Cohen\u2019s d', value: fmt(r.cohensD), hint: r.effectSize },
    { label: 'Signifikan', value: r.significant ? 'Ya' : 'Tidak' },
  ]
  if (r.meanDiff != null) items.push({ label: 'Mean diff', value: fmt(r.meanDiff) })
  if (r.ci95) items.push({ label: '95% CI', value: `[${fmt(r.ci95[0])}, ${fmt(r.ci95[1])}]` })

  const sections = [{ section: 'T-Test', items }]
  if (r.group1 && r.group2) {
    sections.push({
      section: 'Statistik per Grup',
      items: [
        { label: `${r.groupNames?.[0] || 'Grup 1'} — n`, value: String(r.group1.n) },
        { label: `${r.groupNames?.[0] || 'Grup 1'} — M`, value: fmt(r.group1.mean) },
        { label: `${r.groupNames?.[0] || 'Grup 1'} — SD`, value: fmt(r.group1.sd) },
        { label: `${r.groupNames?.[1] || 'Grup 2'} — n`, value: String(r.group2.n) },
        { label: `${r.groupNames?.[1] || 'Grup 2'} — M`, value: fmt(r.group2.mean) },
        { label: `${r.groupNames?.[1] || 'Grup 2'} — SD`, value: fmt(r.group2.sd) },
      ],
    })
  }
  return sections
}

function anova(r) {
  const sections = [{
    section: 'ANOVA',
    items: [
      { label: 'F', value: fmt(r.F), sig: r.significant },
      { label: 'df', value: `(${r.dfBetween}, ${r.dfWithin})` },
      { label: 'p-value', value: pf(r.pValue), sig: r.significant },
      { label: 'η² (eta-squared)', value: fmt(r.etaSquared) },
      { label: 'ω² (omega-squared)', value: fmt(r.omegaSquared) },
      { label: 'N total', value: String(r.N ?? '—') },
      { label: 'Signifikan', value: r.significant ? 'Ya' : 'Tidak' },
    ],
  }]
  if (r.groupStats?.length) {
    sections.push({
      section: 'Per Grup',
      items: r.groupStats.flatMap(g => [
        { label: `${g.label} — n`, value: String(g.n) },
        { label: `${g.label} — M (SD)`, value: `${fmt(g.mean)} (${fmt(g.sd)})` },
      ]),
    })
  }
  return sections
}

function regressionSimple(r) {
  return [{
    section: 'Regresi Sederhana',
    items: [
      { label: 'Predictor → Outcome', value: `${r.x} → ${r.y}` },
      { label: 'Persamaan', value: r.equation || '—' },
      { label: 'R²', value: fmt(r.rSquared) },
      { label: 'Adj. R²', value: fmt(r.adjustedR2) },
      { label: 'F', value: fmt(r.F), sig: r.significant },
      { label: 'p (F)', value: pf(r.pF), sig: r.significant },
      { label: 'Slope (b₁)', value: fmt(r.slope), sig: r.slope_p < 0.05 },
      { label: 'p (slope)', value: pf(r.slope_p) },
      { label: 'Intercept (b₀)', value: fmt(r.intercept) },
      { label: 'β standardized', value: fmt(r.standardizedBeta) },
      { label: 'n', value: String(r.n ?? '—') },
    ],
  }]
}

function regressionMultiple(r) {
  const sections = [{
    section: 'Regresi Berganda',
    items: [
      { label: 'Predictors', value: (r.predictors || []).join(', ') },
      { label: 'Outcome', value: r.outcome || '—' },
      { label: 'R²', value: fmt(r.rSquared) },
      { label: 'Adj. R²', value: fmt(r.adjustedR2) },
      { label: 'F', value: fmt(r.F) },
      { label: 'p (F)', value: pf(r.pF) },
      { label: 'n', value: String(r.n ?? '—') },
      { label: 'Multikolinearitas', value: r.multicollinearity || '—' },
    ],
  }]
  if (r.coefficients?.length) {
    sections.push({
      section: 'Koefisien',
      items: r.coefficients.map(c => ({
        label: c.name,
        value: `b=${fmt(c.b)}, p=${pf(c.p)}`,
        sig: c.p < 0.05,
      })),
    })
  }
  return sections
}

function chisquare(r) {
  return [{
    section: 'Chi-Square',
    items: [
      { label: 'Variabel', value: `${r.var1} × ${r.var2}` },
      { label: 'χ²', value: fmt(r.chi2), sig: r.isSignificant },
      { label: 'df', value: String(r.df ?? '—') },
      { label: 'p-value', value: pf(r.pValue), sig: r.isSignificant },
      { label: 'N', value: String(r.N ?? '—') },
      { label: 'Phi (φ)', value: fmt(r.phi) },
      { label: 'Cramer\u2019s V', value: fmt(r.cramersV), hint: r.effectSizeLabel },
      { label: 'Signifikan', value: r.isSignificant ? 'Ya' : 'Tidak' },
    ],
  }]
}

function mannwhitney(r) {
  return [{
    section: 'Mann-Whitney U',
    items: [
      { label: 'Outcome × Grouping', value: `${r.outcome} × ${r.grouping}` },
      { label: 'U', value: fmt(r.U, 1), sig: r.isSignificant },
      { label: 'z', value: fmt(r.z) },
      { label: 'p-value', value: pf(r.pValue), sig: r.isSignificant },
      { label: 'Effect size r', value: fmt(r.effectSize), hint: r.effectSizeLabel },
      { label: `n₁ / n₂`, value: `${r.n1} / ${r.n2}` },
      { label: 'Mean Rank 1 / 2', value: `${fmt(r.meanRank1, 2)} / ${fmt(r.meanRank2, 2)}` },
      { label: 'Signifikan', value: r.isSignificant ? 'Ya' : 'Tidak' },
    ],
  }]
}

function wilcoxon(r) {
  return [{
    section: 'Wilcoxon Signed-Rank',
    items: [
      { label: 'Variabel', value: `${r.column1} vs ${r.column2}` },
      { label: 'W', value: fmt(r.W, 1), sig: r.isSignificant },
      { label: 'W+ / W−', value: `${fmt(r.Wpos, 1)} / ${fmt(r.Wneg, 1)}` },
      { label: 'z', value: fmt(r.z) },
      { label: 'p-value', value: pf(r.pValue), sig: r.isSignificant },
      { label: 'Mean diff', value: fmt(r.meanDiff) },
      { label: 'n pasangan', value: String(r.n ?? '—') },
      { label: 'Effect size r', value: fmt(r.effectSize) },
      { label: 'Signifikan', value: r.isSignificant ? 'Ya' : 'Tidak' },
    ],
  }]
}

function kruskal(r) {
  const sections = [{
    section: 'Kruskal-Wallis',
    items: [
      { label: 'Outcome × Grouping', value: `${r.outcome} × ${r.grouping}` },
      { label: 'H', value: fmt(r.H), sig: r.isSignificant },
      { label: 'df', value: String(r.df ?? '—') },
      { label: 'p-value', value: pf(r.pValue), sig: r.isSignificant },
      { label: 'η² (eta-squared)', value: fmt(r.etaSquared), hint: r.effectSizeLabel },
      { label: 'N total / k grup', value: `${r.N} / ${r.k}` },
      { label: 'Signifikan', value: r.isSignificant ? 'Ya' : 'Tidak' },
    ],
  }]
  if (r.groupStats?.length) {
    sections.push({
      section: 'Per Grup (median, mean rank)',
      items: r.groupStats.map(g => ({
        label: g.name,
        value: `Md=${fmt(g.median, 2)}, MR=${fmt(g.meanRank, 2)}, n=${g.n}`,
      })),
    })
  }
  return sections
}

function validity(r) {
  const items = [
    { label: 'Cronbach α', value: fmt(r.reliability?.alpha), sig: r.reliability?.alpha >= 0.7 },
    { label: 'k item', value: String(r.reliability?.k ?? '—') },
    { label: 'n responden', value: String(r.reliability?.n ?? '—') },
    { label: 'Reliabel?', value: r.reliability?.alpha >= 0.7 ? 'Ya' : 'Tidak' },
  ]
  return [{ section: 'Reliabilitas', items }]
}

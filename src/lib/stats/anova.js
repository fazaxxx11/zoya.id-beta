// One-way ANOVA dengan:
// - Levene's test untuk homogeneity of variance
// - Welch's ANOVA (parallel run, robust untuk heteroscedasticity)
// - Tukey HSD post-hoc (proper, studentized range)
// - η² + ω² + 95% CI (APA 7 compliant)

import jstat from 'jstat'
import { leveneTest, welchANOVA, tukeyHSD } from './assumptions'
import { etaSquared_CI, omegaSquared, interpretEtaSquared } from './effectSize'

/**
 * One-way ANOVA.
 * @param {Array<Array<number>>} groups - array of groups, tiap grup array of numbers
 * @param {string[]} groupLabels - label untuk tiap grup
 */
export function oneWayANOVA(groups, groupLabels = null, alpha = 0.05) {
  const cleanGroups = groups.map(g => g.filter(v => typeof v === 'number' && !isNaN(v)))
  const k = cleanGroups.length
  if (k < 2) return { error: 'Minimal 2 grup' }
  if (cleanGroups.some(g => g.length < 2)) {
    return { error: 'Setiap grup minimal 2 sampel' }
  }

  const labels = groupLabels || cleanGroups.map((_, i) => `Group ${i + 1}`)
  const ns = cleanGroups.map(g => g.length)
  const N = ns.reduce((a, b) => a + b, 0)
  const means = cleanGroups.map(g => g.reduce((a, b) => a + b, 0) / g.length)
  const grandMean = cleanGroups.flat().reduce((a, b) => a + b, 0) / N

  // Sum of Squares
  const ssb = cleanGroups.reduce((s, g, i) => s + ns[i] * (means[i] - grandMean) ** 2, 0)
  const ssw = cleanGroups.reduce((s, g, i) =>
    s + g.reduce((ss, v) => ss + (v - means[i]) ** 2, 0), 0)
  const sst = ssb + ssw

  const dfBetween = k - 1
  const dfWithin = N - k
  const dfTotal = N - 1

  const msBetween = ssb / dfBetween
  const msWithin = ssw / dfWithin
  const F = msBetween / msWithin
  const pValue = 1 - jstat.centralF.cdf(F, dfBetween, dfWithin)

  // Effect size with CI
  const etaInfo = etaSquared_CI(F, dfBetween, dfWithin, alpha)
  const omegaSq = omegaSquared(F, dfBetween, dfWithin)

  // Group statistics
  const groupStats = cleanGroups.map((g, i) => {
    const m = means[i]
    const v = g.reduce((s, x) => s + (x - m) ** 2, 0) / (g.length - 1)
    return {
      label: labels[i],
      n: ns[i],
      mean: m,
      sd: Math.sqrt(v),
      variance: v,
    }
  })

  // Levene's test (homogeneity of variance)
  const levene = leveneTest(cleanGroups, alpha)

  // Welch's ANOVA (parallel run for robustness)
  const welch = welchANOVA(cleanGroups, labels, alpha)

  // Recommended F-test based on Levene
  const recommended = levene.error || levene.homogeneous ? 'classic' : 'welch'

  // Post-hoc Tukey HSD (Tukey-Kramer for unequal n)
  let postHoc = null
  if (pValue < alpha) {
    postHoc = tukeyHSD(cleanGroups, msWithin, dfWithin, labels, alpha)
  }

  return {
    test: 'One-way ANOVA',
    k, N,
    groupStats,
    grandMean,
    ssBetween: ssb, ssWithin: ssw, ssTotal: sst,
    dfBetween, dfWithin, dfTotal,
    msBetween, msWithin,
    F, pValue, alpha,

    // Effect size + CI (APA 7)
    etaSquared: etaInfo.etaSq,
    etaSquared_CI: etaInfo.ci,
    omegaSquared: omegaSq,
    effectSize: interpretEtaSquared(etaInfo.etaSq),

    // Assumption checks
    levene,
    welch,
    recommended,

    significant: pValue < alpha,
    postHoc,
    interpretation: buildANOVAInterpretation({
      F, dfBetween, dfWithin, pValue,
      eta: etaInfo.etaSq, etaCI: etaInfo.ci, omegaSq,
      k, alpha, postHoc, levene, welch, recommended,
    }),
  }
}

function buildANOVAInterpretation({ F, dfBetween, dfWithin, pValue, eta, etaCI, omegaSq, k, alpha, postHoc, levene, welch, recommended }) {
  const sig = pValue < alpha
  let txt = `One-way ANOVA: F(${dfBetween}, ${dfWithin.toFixed(0)}) = ${F.toFixed(3)}, p = ${pValue.toFixed(4)} `
        + `→ ${sig ? 'TERDAPAT PERBEDAAN SIGNIFIKAN' : 'TIDAK ADA PERBEDAAN SIGNIFIKAN'} antara ${k} grup. `
        + `η² = ${eta.toFixed(3)} 95% CI [${etaCI[0].toFixed(3)}, ${etaCI[1].toFixed(3)}], `
        + `ω² = ${omegaSq.toFixed(3)} (effect ${interpretEtaSquared(eta)}). `

  if (!levene.error) {
    txt += `Levene: W(${levene.df1}, ${levene.df2}) = ${levene.W.toFixed(3)}, p = ${levene.pValue.toFixed(4)} `
         + `→ variansi ${levene.homogeneous ? 'HOMOGEN' : 'TIDAK HOMOGEN'}. `
    if (recommended === 'welch' && !welch.error) {
      txt += `Recommended Welch's ANOVA: F(${welch.df1}, ${welch.df2.toFixed(2)}) = ${welch.F.toFixed(3)}, p = ${welch.pValue.toFixed(4)}. `
    }
  }

  if (sig && postHoc) {
    const sigPairs = postHoc.comparisons.filter(c => c.significant)
    txt += `Post-hoc Tukey HSD: ${sigPairs.length} pasangan grup berbeda signifikan`
    if (sigPairs.length > 0) {
      txt += `: ${sigPairs.map(c => `${c.group1} vs ${c.group2}`).join(', ')}.`
    } else {
      txt += `.`
    }
  }
  return txt
}

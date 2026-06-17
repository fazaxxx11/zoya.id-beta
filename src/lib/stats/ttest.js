// T-Test: One-sample, Independent (Student & Welch), Paired
// APA 7 compliant: setiap test menyertakan effect size + 95% CI.
// Independent t-test sekarang menjalankan Student's & Welch's bersamaan,
// plus Levene's test untuk homogeneity of variance.

import jstat from 'jstat'
import { leveneTest } from './assumptions'
import {
  cohensD_CI_independent, cohensD_CI_paired, hedgesG, interpretCohensD,
} from './effectSize'

/**
 * One-sample t-test.
 */
export function oneSampleTTest(values, mu0 = 0, alpha = 0.05) {
  const x = values.filter(v => typeof v === 'number' && !isNaN(v))
  const n = x.length
  if (n < 2) return { error: 'Sampel minimal 2' }

  const mean = x.reduce((a, b) => a + b, 0) / n
  const variance = x.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
  const sd = Math.sqrt(variance)
  const sem = sd / Math.sqrt(n)
  const t = (mean - mu0) / sem
  const df = n - 1
  const pValue = 2 * (1 - jstat.studentt.cdf(Math.abs(t), df))

  const d = (mean - mu0) / sd
  const dCI = cohensD_CI_paired(d, n, alpha)

  const tCrit = jstat.studentt.inv(1 - alpha / 2, df)
  const ci = [mean - tCrit * sem, mean + tCrit * sem]

  return {
    test: 'One-sample t-test',
    n, mean, sd, sem,
    mu0, t, df, pValue, alpha,
    cohensD: d,
    cohensD_CI: dCI,
    effectSize: interpretCohensD(d),
    ci95: ci,
    significant: pValue < alpha,
    interpretation: buildOneSampleInterpretation(mean, mu0, t, df, pValue, d, dCI, alpha),
  }
}

/**
 * Independent samples t-test.
 * Menjalankan BOTH Student's (pooled variance) AND Welch's (heteroscedastic-robust)
 * bersamaan, plus Levene's test untuk homogeneity of variance.
 *
 * APA 7 recommendation: report Welch's by default unless variances homogen
 * (Levene p ≥ .05). Result mengandung kedua versi untuk transparansi.
 */
export function independentTTest(group1, group2, { alpha = 0.05 } = {}) {
  const x1 = group1.filter(v => typeof v === 'number' && !isNaN(v))
  const x2 = group2.filter(v => typeof v === 'number' && !isNaN(v))
  const n1 = x1.length, n2 = x2.length
  if (n1 < 2 || n2 < 2) return { error: 'Tiap grup minimal 2 sampel' }

  const m1 = x1.reduce((a, b) => a + b, 0) / n1
  const m2 = x2.reduce((a, b) => a + b, 0) / n2
  const v1 = x1.reduce((s, v) => s + (v - m1) ** 2, 0) / (n1 - 1)
  const v2 = x2.reduce((s, v) => s + (v - m2) ** 2, 0) / (n2 - 1)
  const sd1 = Math.sqrt(v1), sd2 = Math.sqrt(v2)
  const meanDiff = m1 - m2

  // Levene's test (Brown-Forsythe variant)
  const levene = leveneTest([x1, x2], alpha)

  // === Student's t (pooled variance) ===
  const pooledVar = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2)
  const sePooled = Math.sqrt(pooledVar * (1 / n1 + 1 / n2))
  const tStudent = meanDiff / sePooled
  const dfStudent = n1 + n2 - 2
  const pStudent = 2 * (1 - jstat.studentt.cdf(Math.abs(tStudent), dfStudent))
  const tCritStudent = jstat.studentt.inv(1 - alpha / 2, dfStudent)
  const ciStudent = [meanDiff - tCritStudent * sePooled, meanDiff + tCritStudent * sePooled]

  // === Welch's t (heteroscedastic) ===
  const seWelch = Math.sqrt(v1 / n1 + v2 / n2)
  const tWelch = meanDiff / seWelch
  const dfWelch = (v1 / n1 + v2 / n2) ** 2
                / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1))
  const pWelch = 2 * (1 - jstat.studentt.cdf(Math.abs(tWelch), dfWelch))
  const tCritWelch = jstat.studentt.inv(1 - alpha / 2, dfWelch)
  const ciWelch = [meanDiff - tCritWelch * seWelch, meanDiff + tCritWelch * seWelch]

  // === Effect size ===
  const pooledSD = Math.sqrt(pooledVar)
  const d = meanDiff / pooledSD
  const dCI = cohensD_CI_independent(d, n1, n2, alpha)
  const g = hedgesG(d, n1, n2)

  // Recommended test based on Levene
  const recommended = levene.error || levene.homogeneous ? 'student' : 'welch'

  return {
    test: 'Independent Samples t-test',
    group1: { n: n1, mean: m1, sd: sd1, variance: v1 },
    group2: { n: n2, mean: m2, sd: sd2, variance: v2 },
    meanDiff,
    alpha,

    // Both versions reported
    student: {
      label: "Student's t-test (pooled variance)",
      t: tStudent, df: dfStudent, pValue: pStudent,
      se: sePooled, ci95: ciStudent,
      significant: pStudent < alpha,
    },
    welch: {
      label: "Welch's t-test (heteroscedastic)",
      t: tWelch, df: dfWelch, pValue: pWelch,
      se: seWelch, ci95: ciWelch,
      significant: pWelch < alpha,
    },

    // Levene assumption check
    levene,
    recommended, // 'student' or 'welch'

    // Effect size (APA 7)
    cohensD: d,
    cohensD_CI: dCI,
    hedgesG: g,
    effectSize: interpretCohensD(d),

    // Convenience legacy fields — defaults to recommended version
    t: recommended === 'student' ? tStudent : tWelch,
    df: recommended === 'student' ? dfStudent : dfWelch,
    pValue: recommended === 'student' ? pStudent : pWelch,
    ci95: recommended === 'student' ? ciStudent : ciWelch,
    significant: (recommended === 'student' ? pStudent : pWelch) < alpha,

    interpretation: buildIndependentInterpretation({
      m1, m2, n1, n2, meanDiff, d, dCI,
      student: { t: tStudent, df: dfStudent, p: pStudent },
      welch: { t: tWelch, df: dfWelch, p: pWelch },
      levene, recommended, alpha,
    }),
  }
}

/**
 * Paired samples t-test.
 */
export function pairedTTest(before, after, alpha = 0.05) {
  const pairs = before.map((v, i) => [v, after[i]])
                      .filter(([a, b]) => typeof a === 'number' && typeof b === 'number'
                                          && !isNaN(a) && !isNaN(b))
  const n = pairs.length
  if (n < 2) return { error: 'Sampel minimal 2 pasang' }

  const diff = pairs.map(([a, b]) => b - a)  // after - before (convention: positive = improvement)
  const meanDiff = diff.reduce((a, b) => a + b, 0) / n
  const varDiff = diff.reduce((s, d) => s + (d - meanDiff) ** 2, 0) / (n - 1)
  const sdDiff = Math.sqrt(varDiff)
  const seDiff = sdDiff / Math.sqrt(n)
  const t = meanDiff / seDiff
  const df = n - 1
  const pValue = 2 * (1 - jstat.studentt.cdf(Math.abs(t), df))

  // Cohen's dz for paired
  const d = meanDiff / sdDiff
  const dCI = cohensD_CI_paired(d, n, alpha)

  const m1 = pairs.reduce((s, [a]) => s + a, 0) / n
  const m2 = pairs.reduce((s, [, b]) => s + b, 0) / n

  const tCrit = jstat.studentt.inv(1 - alpha / 2, df)
  const ci = [meanDiff - tCrit * seDiff, meanDiff + tCrit * seDiff]

  return {
    test: 'Paired Samples t-test',
    n,
    mean1: m1, mean2: m2,
    meanDiff, sdDiff, seDiff,
    t, df, pValue, alpha,
    cohensD: d,
    cohensD_CI: dCI,
    effectSize: interpretCohensD(d),
    ci95: ci,
    significant: pValue < alpha,
    interpretation: buildPairedInterpretation(m1, m2, meanDiff, t, df, pValue, d, dCI, n, alpha),
  }
}

// ===== Interpretations =====

function buildOneSampleInterpretation(mean, mu0, t, df, p, d, dCI, alpha) {
  const sig = p < alpha
  return `Rata-rata sampel (M = ${mean.toFixed(3)}) `
       + `${sig ? 'BERBEDA SIGNIFIKAN' : 'TIDAK BERBEDA SIGNIFIKAN'} `
       + `dengan nilai hipotesis (μ₀ = ${mu0}), `
       + `t(${df.toFixed(0)}) = ${t.toFixed(3)}, p = ${p.toFixed(4)}, `
       + `Cohen's d = ${d.toFixed(3)} 95% CI [${dCI[0].toFixed(3)}, ${dCI[1].toFixed(3)}] `
       + `(effect size ${interpretCohensD(d)}).`
}

function buildIndependentInterpretation({ m1, m2, n1, n2, meanDiff, d, dCI, student, welch, levene, recommended, alpha }) {
  const r = recommended === 'welch' ? welch : student
  const sig = r.p < alpha
  let txt = `Independent samples t-test: Grup 1 (M = ${m1.toFixed(3)}, n = ${n1}) `
       + `vs Grup 2 (M = ${m2.toFixed(3)}, n = ${n2}), selisih = ${meanDiff.toFixed(3)}. `
  if (!levene.error) {
    txt += `Uji Levene: W(${levene.df1}, ${levene.df2}) = ${levene.W.toFixed(3)}, p = ${levene.pValue.toFixed(4)} `
         + `→ variansi ${levene.homogeneous ? 'HOMOGEN' : 'TIDAK HOMOGEN'}. `
  }
  txt += `Recommended: ${recommended === 'welch' ? "Welch's t" : "Student's t (pooled)"}, `
       + `t(${r.df.toFixed(2)}) = ${r.t.toFixed(3)}, p = ${r.p.toFixed(4)} `
       + `→ ${sig ? 'BERBEDA SIGNIFIKAN' : 'TIDAK BERBEDA SIGNIFIKAN'}. `
       + `Cohen's d = ${d.toFixed(3)} 95% CI [${dCI[0].toFixed(3)}, ${dCI[1].toFixed(3)}] `
       + `(effect ${interpretCohensD(d)}).`
  return txt
}

function buildPairedInterpretation(m1, m2, md, t, df, p, d, dCI, n, alpha) {
  const sig = p < alpha
  return `Paired t-test: ${sig ? 'PERBEDAAN SIGNIFIKAN' : 'TIDAK ADA PERBEDAAN SIGNIFIKAN'} `
       + `antara pengukuran pertama (M = ${m1.toFixed(3)}) dan kedua (M = ${m2.toFixed(3)}), `
       + `selisih = ${md.toFixed(3)}, t(${df}) = ${t.toFixed(3)}, p = ${p.toFixed(4)}, `
       + `Cohen's dz = ${d.toFixed(3)} 95% CI [${dCI[0].toFixed(3)}, ${dCI[1].toFixed(3)}] `
       + `(effect ${interpretCohensD(d)}). n = ${n} pasang.`
}

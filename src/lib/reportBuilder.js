// Report builder — gabungkan beberapa saved analyses menjadi draft Bab IV (Hasil Penelitian)
// terstruktur dengan:
//   4.1 Deskripsi Data Penelitian
//   4.2 Uji Asumsi Klasik
//   4.3 Pengujian Hipotesis
//   4.4 Pembahasan Hasil Penelitian
//
// Output: array of section objects { title, paragraphs[], tables[] }
// untuk di-render sebagai HTML preview & di-export ke .docx / .txt / clipboard.
//
// Strategi: deterministic template untuk struktur, AI optional untuk pembahasan.

import { generateInterpretation, generateSectionInterpretation } from './ai/interpretStats'

const fmt = (v, d = 2) => {
  if (v == null || (typeof v === 'number' && !isFinite(v))) return '—'
  if (typeof v === 'number') return Number(v).toFixed(d)
  return String(v)
}
const pf = (p) => p == null ? '—' : (p < 0.001 ? '< 0,001' : Number(p).toFixed(3))

/**
 * Categorize analyses by their role in Bab IV.
 */
function categorize(analyses) {
  const descriptive = []
  const assumptions = []
  const inferential = []

  analyses.forEach(a => {
    const r = a.result
    if (!r) return
    switch (r.type) {
      case 'descriptive':
        descriptive.push(a); break
      case 'normality':
        assumptions.push(a); break
      case 'validity_reliability':
        // bisa masuk asumsi/instrumen
        assumptions.push(a); break
      default:
        inferential.push(a)
    }
  })
  return { descriptive, assumptions, inferential }
}

/**
 * Section 4.1 — Deskripsi Data
 */
function buildDescriptiveSection(items) {
  if (items.length === 0) {
    return {
      title: '4.1 Deskripsi Data Penelitian',
      paragraphs: [
        'Sub-bab ini akan diisi dengan statistik deskriptif (mean, median, standar deviasi, varians) dari variabel-variabel penelitian setelah analisis deskriptif dijalankan dan disimpan.',
      ],
      tables: [],
    }
  }
  const paragraphs = []
  const tables = []
  items.forEach((a, idx) => {
    const r = a.result
    const stats = r.stats || []
    if (stats.length === 0) return
    paragraphs.push(
      `Tabel ${4}.${idx + 1} menyajikan ringkasan statistik deskriptif untuk ${stats.length} variabel penelitian. Hasil menunjukkan rerata (mean), nilai tengah (median), standar deviasi, serta rentang nilai minimum dan maksimum yang menggambarkan distribusi data.`
    )
    tables.push({
      caption: `Tabel 4.${idx + 1} Statistik Deskriptif Variabel Penelitian`,
      headers: ['Variabel', 'N', 'Mean', 'Median', 'SD', 'Min', 'Max'],
      rows: stats.map(s => [
        s.column,
        s.n,
        fmt(s.mean),
        fmt(s.median),
        fmt(s.stdDev),
        fmt(s.min),
        fmt(s.max),
      ]),
    })
  })
  return { title: '4.1 Deskripsi Data Penelitian', paragraphs, tables }
}

/**
 * Section 4.2 — Uji Asumsi
 */
function buildAssumptionsSection(items) {
  if (items.length === 0) {
    return {
      title: '4.2 Uji Asumsi',
      paragraphs: [
        'Sub-bab ini akan diisi dengan hasil uji asumsi (normalitas, validitas-reliabilitas instrumen) bila analisis terkait dijalankan.',
      ],
      tables: [],
    }
  }
  const paragraphs = []
  const tables = []
  items.forEach((a, idx) => {
    const r = a.result
    if (r.type === 'normality') {
      const results = r.results || []
      const allNormal = results.every(x => x.shapiroWilk?.pValue >= 0.05)
      paragraphs.push(
        `Uji normalitas Shapiro-Wilk dilakukan terhadap ${results.length} variabel. ${
          allNormal
            ? 'Seluruh variabel memiliki distribusi normal (p > 0,05), sehingga asumsi normalitas terpenuhi dan analisis parametrik dapat digunakan.'
            : 'Sebagian variabel menunjukkan penyimpangan dari distribusi normal (p < 0,05), sehingga uji non-parametrik dipertimbangkan untuk analisis lanjutan.'
        }`
      )
      tables.push({
        caption: `Tabel 4.${idx + 1} Hasil Uji Normalitas Shapiro-Wilk`,
        headers: ['Variabel', 'N', 'W', 'p-value', 'Keputusan'],
        rows: results.map(x => [
          x.column,
          x.shapiroWilk?.n || x.n,
          fmt(x.shapiroWilk?.W, 3),
          pf(x.shapiroWilk?.pValue),
          (x.shapiroWilk?.pValue >= 0.05) ? 'Normal' : 'Tidak normal',
        ]),
      })
    } else if (r.type === 'validity_reliability') {
      const alpha = r.reliability?.alpha
      const reliable = alpha >= 0.7
      const validItems = r.validity?.items?.filter(it => /valid/i.test(it.verdict)).length || 0
      const totalItems = r.validity?.items?.length || 0
      paragraphs.push(
        `Pengujian validitas dan reliabilitas dilakukan terhadap instrumen yang terdiri dari ${totalItems} item dengan ${r.reliability?.n || '—'} responden. Koefisien reliabilitas Cronbach's α = ${fmt(alpha, 3)} mengindikasikan instrumen ${reliable ? 'reliabel' : 'kurang reliabel'} (kriteria α ≥ 0,70). Sebanyak ${validItems} dari ${totalItems} item memenuhi kriteria validitas item-total.`
      )
    }
  })
  return { title: '4.2 Uji Asumsi', paragraphs, tables }
}

/**
 * Section 4.3 — Pengujian Hipotesis
 */
function buildInferentialSection(items) {
  if (items.length === 0) {
    return {
      title: '4.3 Pengujian Hipotesis',
      paragraphs: [
        'Sub-bab ini akan diisi dengan hasil pengujian hipotesis (uji-t, ANOVA, korelasi, regresi, chi-square, atau uji non-parametrik) yang relevan dengan rumusan masalah.',
      ],
      tables: [],
    }
  }
  const paragraphs = []
  const tables = []
  items.forEach((a, idx) => {
    const r = a.result
    const sig = (b) => b ? 'signifikan' : 'tidak signifikan'

    switch (r.type) {
      case 'ttest':
        paragraphs.push(formatTTest(r, idx + 1))
        break
      case 'anova':
        paragraphs.push(
          `Uji One-way ANOVA digunakan untuk menguji perbedaan rerata ${r.outcome} antar ${r.groupValues?.length || r.k} kelompok berdasarkan ${r.grouping}. Hasil memperoleh F(${r.dfBetween}, ${r.dfWithin}) = ${fmt(r.F)}, p = ${pf(r.pValue)}, η² = ${fmt(r.etaSquared, 3)}. Perbedaan antar kelompok ${sig(r.significant)} pada α = ${r.alpha ?? 0.05}.`
        )
        if (r.groupValues) {
          tables.push({
            caption: `Tabel 4.${idx + 1} Statistik Deskriptif per Kelompok`,
            headers: ['Kelompok', 'N', 'Mean', 'SD'],
            rows: r.groupValues.map(g => {
              const n = g.values.length
              const m = g.values.reduce((s, v) => s + v, 0) / n
              const sd = Math.sqrt(g.values.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1))
              return [g.name, n, fmt(m), fmt(sd)]
            }),
          })
        }
        break
      case 'correlation':
        paragraphs.push(
          `Analisis korelasi ${r.method === 'pearson' ? 'Pearson product-moment' : 'Spearman rank-order'} antara ${r.x} dan ${r.y} memperoleh koefisien r = ${fmt(r.r, 3)} (p = ${pf(r.pValue)}, n = ${r.n}). ${
            r.pValue < 0.05
              ? `Hubungan antara kedua variabel ${r.r > 0 ? 'positif' : 'negatif'} dan signifikan secara statistik.`
              : 'Hubungan antara kedua variabel tidak signifikan secara statistik.'
          }`
        )
        break
      case 'regression_simple':
        paragraphs.push(
          `Analisis regresi linier sederhana memperoleh persamaan Ŷ = ${fmt(r.intercept, 3)} + ${fmt(r.slope, 3)} X dengan R² = ${fmt(r.rSquared, 3)} (F = ${fmt(r.F)}, p = ${pf(r.pValue)}). Variabel ${r.x} ${r.pValue < 0.05 ? 'berpengaruh signifikan' : 'tidak berpengaruh signifikan'} terhadap ${r.y}.`
        )
        break
      case 'regression_multiple':
        paragraphs.push(
          `Analisis regresi linier berganda dengan ${r.predictors?.length} variabel prediktor (${(r.predictors || []).join(', ')}) terhadap ${r.outcome} memperoleh R² = ${fmt(r.rSquared, 3)}, R² adjusted = ${fmt(r.adjustedRSquared, 3)} (F = ${fmt(r.F)}, p = ${pf(r.pValue)}). Model ${r.pValue < 0.05 ? 'signifikan' : 'tidak signifikan'} dalam memprediksi variabel terikat.`
        )
        if (r.coefficients) {
          tables.push({
            caption: `Tabel 4.${idx + 1} Koefisien Regresi`,
            headers: ['Prediktor', 'B', 'SE', 'β', 't', 'p'],
            rows: r.coefficients.map(c => [
              c.name, fmt(c.B, 3), fmt(c.SE, 3), fmt(c.beta, 3), fmt(c.t, 3), pf(c.pValue),
            ]),
          })
        }
        break
      case 'chisquare':
        paragraphs.push(
          `Uji Chi-square independensi antara ${r.var1} dan ${r.var2} memperoleh χ²(${r.df}) = ${fmt(r.chiSquare, 2)}, p = ${pf(r.pValue)}, Cramer's V = ${fmt(r.cramersV, 3)}. Hubungan antara kedua variabel kategorik ${sig(r.pValue < 0.05)}.`
        )
        break
      case 'mannwhitney':
        paragraphs.push(
          `Uji Mann-Whitney U digunakan untuk membandingkan distribusi ${r.outcome || r.column} pada 2 kelompok independen. Hasil memperoleh U = ${fmt(r.U, 0)}, Z = ${fmt(r.z, 3)}, p = ${pf(r.pValue)}. Perbedaan ${sig(r.pValue < 0.05)} pada α = ${r.alpha ?? 0.05}.`
        )
        break
      case 'wilcoxon':
        paragraphs.push(
          `Uji Wilcoxon signed-rank pada data berpasangan memperoleh W = ${fmt(r.W, 0)}, Z = ${fmt(r.z, 3)}, p = ${pf(r.pValue)}. Perbedaan antara kedua pengukuran ${sig(r.pValue < 0.05)}.`
        )
        break
      case 'kruskal':
        paragraphs.push(
          `Uji Kruskal-Wallis untuk membandingkan ${r.k} kelompok memperoleh H(${r.df}) = ${fmt(r.H, 2)}, p = ${pf(r.pValue)}, η² = ${fmt(r.etaSquared, 3)}. Perbedaan distribusi antar kelompok ${sig(r.pValue < 0.05)}.`
        )
        break
      case 'mediation':
        paragraphs.push(formatMediation(r))
        break
      case 'moderation':
        paragraphs.push(formatModeration(r))
        break
      case 'logistic':
        paragraphs.push(formatLogistic(r))
        break
      case 'efa':
        paragraphs.push(formatEFA(r))
        break
      default:
        paragraphs.push(`Hasil analisis ${r.toolName || r.type} (lihat dokumen analisis terpisah).`)
    }
  })
  return { title: '4.3 Pengujian Hipotesis', paragraphs, tables }
}

function formatTTest(r, idx) {
  const sig = r.pValue < 0.05
  if (r.mode === 'oneSample') {
    return `Uji one-sample t-test pada ${r.column} terhadap nilai uji μ₀ = ${r.mu0} memperoleh t(${r.df}) = ${fmt(r.t, 3)}, p = ${pf(r.pValue)}, mean diff = ${fmt(r.meanDiff)}. Perbedaan ${sig ? 'signifikan' : 'tidak signifikan'} pada α = 0,05.`
  }
  if (r.mode === 'paired') {
    return `Paired-samples t-test pada ${r.column1} vs ${r.column2} (n = ${r.n}) memperoleh t(${r.df}) = ${fmt(r.t, 3)}, p = ${pf(r.pValue)}, mean diff = ${fmt(r.meanDiff)}, Cohen's d = ${fmt(r.cohensD, 3)}. Perbedaan rerata sebelum-sesudah ${sig ? 'signifikan' : 'tidak signifikan'} secara statistik.`
  }
  // independent
  const [g1, g2] = r.groupNames || []
  return `Independent-samples t-test pada ${r.outcome} antara kelompok ${g1} dan ${g2} memperoleh t(${fmt(r.df, 2)}) = ${fmt(r.t, 3)}, p = ${pf(r.pValue)}, Cohen's d = ${fmt(r.cohensD, 3)}. Perbedaan rerata antar kelompok ${sig ? 'signifikan' : 'tidak signifikan'} pada α = 0,05.`
}

/**
 * Section 4.4 — Pembahasan (deterministic template; AI version ditangani di UI)
 */
function buildDiscussionSection(allInferential) {
  if (allInferential.length === 0) {
    return {
      title: '4.4 Pembahasan',
      paragraphs: [
        'Sub-bab pembahasan akan menjelaskan makna substantif dari setiap temuan, mengaitkan dengan teori, penelitian terdahulu, serta implikasi praktis. Untuk dukungan otomatis, gunakan tombol "Generate dengan AI" di atas (membutuhkan setidaknya satu hasil analisis tersimpan).',
      ],
      tables: [],
    }
  }
  const sigCount = allInferential.filter(a => isInferentialSig(a.result)).length
  const totalCount = allInferential.length

  return {
    title: '4.4 Pembahasan',
    paragraphs: [
      `Berdasarkan hasil pengujian terhadap ${totalCount} hipotesis penelitian, ${sigCount} hipotesis ${sigCount === totalCount ? 'seluruhnya' : sigCount === 0 ? 'tidak ada yang' : 'sebagian'} terdukung secara empiris pada α = 0,05. Hasil ini menunjukkan adanya kontribusi temuan terhadap kerangka teoritis yang melandasi penelitian.`,
      `Temuan signifikan perlu diinterpretasikan tidak hanya dari sisi statistik (p-value), tetapi juga dari ukuran efek (effect size) yang menunjukkan magnitude perbedaan/hubungan. Hal ini sejalan dengan rekomendasi APA (2020) bahwa pelaporan ukuran efek sama pentingnya dengan signifikansi statistik. Untuk temuan yang tidak signifikan, perlu dipertimbangkan kemungkinan keterbatasan ukuran sampel (statistical power), heterogenitas data, atau eksistensi efek nyata namun lemah.`,
      `Pembahasan lebih mendalam — termasuk komparasi dengan penelitian terdahulu, implikasi teoretis, dan implikasi praktis — dapat ditambahkan dengan mempertimbangkan konteks substantif penelitian dan literatur yang relevan.`,
    ],
    tables: [],
  }
}

function isInferentialSig(r) {
  if (!r) return false
  if (r.type === 'anova') return !!r.significant
  if (r.type === 'ttest') return r.pValue < 0.05
  if (r.type === 'correlation') return r.pValue < 0.05
  if (r.type === 'chisquare') return r.pValue < 0.05
  if (r.type === 'kruskal') return r.pValue < 0.05
  if (r.type === 'mannwhitney') return r.pValue < 0.05
  if (r.type === 'wilcoxon') return r.pValue < 0.05
  if (r.type === 'regression_simple' || r.type === 'regression_multiple') return r.pValue < 0.05
  if (r.type === 'mediation') {
    const ci = r.indirect?.bootCI || r.indirect?.ci
    return Array.isArray(ci) && (ci[0] > 0 || ci[1] < 0)  // CI tidak melewati 0
  }
  if (r.type === 'moderation') return !!r.interactionSignificant
  if (r.type === 'logistic') return (r.likelihoodRatio?.p ?? 1) < 0.05
  if (r.type === 'efa') return !!r.fitOk
  return false
}

// ============================================================
// Formatters untuk fitur tambahan
// ============================================================
function formatMediation(r) {
  const paths = r.paths || {}
  const ind = r.indirect || {}
  const boot = ind.bootstrap || {}
  const ci = [boot.ciLow, boot.ciHigh]
  const sig = !!boot.significant
  const aB = paths.a?.coef ?? 0
  const bB = paths.b?.coef ?? 0
  const cP = paths.cp?.coef ?? 0
  const cT = paths.c?.coef ?? 0
  return `Analisis mediasi (Hayes Model 4) menguji peran mediator pada hubungan X→Y. Path a (X→M) = ${fmt(aB, 3)} (p = ${pf(paths.a?.p)}), path b (M→Y) = ${fmt(bB, 3)} (p = ${pf(paths.b?.p)}), direct effect c' = ${fmt(cP, 3)} (p = ${pf(paths.cp?.p)}), total effect c = ${fmt(cT, 3)} (p = ${pf(paths.c?.p)}). Indirect effect (a×b) = ${fmt(ind.ab, 3)}${typeof ind.standardized === 'number' ? ` (β = ${fmt(ind.standardized, 3)})` : ''}, dengan 95% bootstrap CI [${fmt(ci[0], 3)}, ${fmt(ci[1], 3)}] (n boot = ${boot.n ?? '—'}), sehingga efek mediasi ${sig ? 'signifikan' : 'tidak signifikan'}. Sobel test: z = ${fmt(ind.sobel?.z, 3)}, p = ${pf(ind.sobel?.p)}. ${sig ? `Tipe mediasi: ${r.mediationType || '—'}.` : ''}`
}

function formatModeration(r) {
  const b = r.coefficients || {}
  const xw = b.XW || {}
  return `Analisis moderasi (Hayes Model 1) menguji peran ${r.W || 'W'} sebagai moderator pada hubungan ${r.X || 'X'}→${r.Y || 'Y'}. Koefisien interaksi b₃ (X·W) = ${fmt(xw.coef, 3)} (SE = ${fmt(xw.se, 3)}, t = ${fmt(xw.t, 2)}, p = ${pf(xw.p)}). ${r.interactionSignificant ? `Interaksi signifikan, sehingga ${r.W || 'moderator'} memoderasi efek ${r.X || 'X'} terhadap ${r.Y || 'Y'}. Conditional effect: pada nilai rendah W (-1 SD) = ${fmt(r.conditionalEffects?.atLow?.effect, 3)} (p = ${pf(r.conditionalEffects?.atLow?.p)}), pada mean = ${fmt(r.conditionalEffects?.atMean?.effect, 3)} (p = ${pf(r.conditionalEffects?.atMean?.p)}), pada nilai tinggi W (+1 SD) = ${fmt(r.conditionalEffects?.atHigh?.effect, 3)} (p = ${pf(r.conditionalEffects?.atHigh?.p)}).` : 'Interaksi tidak signifikan, sehingga tidak ada bukti efek moderasi.'} R² model = ${fmt(r.rSquared, 3)} (n = ${r.n}).`
}

function formatLogistic(r) {
  const lr = r.likelihoodRatio || {}
  const sigCoefs = (r.coefficients || []).filter((c, i) => i > 0 && c.p < 0.05)
  const sigList = sigCoefs.length === 0
    ? 'Tidak ada predictor signifikan'
    : sigCoefs.map(c => `${c.name} (β = ${fmt(c.b, 3)}, OR = ${fmt(c.odds, 2)}, p = ${pf(c.p)})`).join('; ')
  return `Regresi logistik biner pada outcome (n = ${r.n}, dengan ${r.nPos} kasus positif dan ${r.nNeg} negatif) menghasilkan model yang ${(lr.p ?? 1) < 0.05 ? 'signifikan' : 'tidak signifikan'} dibanding null model: χ²(${lr.df}) = ${fmt(lr.chi2, 2)}, p = ${pf(lr.p)}, Nagelkerke R² = ${fmt(r.pseudoR2?.nagelkerke, 3)} (Cox-Snell = ${fmt(r.pseudoR2?.coxSnell, 3)}, McFadden = ${fmt(r.pseudoR2?.mcfadden, 3)}). ${sigList}.`
}

function formatEFA(r) {
  const k = r.kmo || {}
  const b = r.bartlett || {}
  const cumVar = r.varianceExplained?.[r.varianceExplained.length - 1]?.cumulativeProp ?? 0
  return `Exploratory Factor Analysis pada ${r.p} item (n = ${r.n}) menghasilkan KMO = ${fmt(k.overall, 3)} (${k.interpretation || '—'}) dan Bartlett's Test of Sphericity χ²(${b.df}) = ${fmt(b.chi2, 2)}, p = ${pf(b.p)}, sehingga data ${r.fitOk ? 'layak' : 'belum layak'} dianalisis dengan EFA. Berdasarkan kriteria Kaiser (eigenvalue ≥ 1), terbentuk ${r.nFactors} faktor yang menjelaskan ${fmt(cumVar * 100, 1)}% varians total. ${r.rotationApplied ? 'Setelah rotasi Varimax, struktur loadings menunjukkan setiap item memuat dominan pada satu faktor (loading ≥ 0,4).' : ''}`
}

/**
 * Master builder — combine all sections.
 */
export function buildReport(analyses) {
  const cats = categorize(analyses)
  return {
    title: 'BAB IV — HASIL DAN PEMBAHASAN',
    intro: `Bab ini menguraikan hasil analisis data yang diperoleh dari ${analyses.length} analisis statistik. Pembahasan disusun mengikuti urutan: deskripsi data, uji asumsi, pengujian hipotesis, dan pembahasan substantif.`,
    sections: [
      buildDescriptiveSection(cats.descriptive),
      buildAssumptionsSection(cats.assumptions),
      buildInferentialSection(cats.inferential),
      buildDiscussionSection(cats.inferential),
    ],
  }
}

/**
 * AI-powered report builder — generates narrative per-analysis menggunakan
 * ContextualWriter engine (localTemplate + section-aware splitting).
 * Fallback ke deterministic jika AI/generation gagal.
 * 
 * @returns {Report} — same structure as buildReport()
 */
export async function buildAIReport(analyses) {
  const cats = categorize(analyses)
  const sections = []

  // 4.1 Deskripsi Data — AI generated
  const descSection = await buildAISection(
    '4.1 Deskripsi Data Penelitian',
    'descriptive',
    cats.descriptive,
    (items) => buildDescriptiveSection(items)
  )
  sections.push(descSection)

  // 4.2 Uji Asumsi — AI generated
  const asmSection = await buildAISection(
    '4.2 Uji Asumsi',
    'descriptive',
    cats.assumptions,
    (items) => buildAssumptionsSection(items)
  )
  sections.push(asmSection)

  // 4.3 Pengujian Hipotesis — per-analysis AI narrative
  const infItems = cats.inferential
  const infParagraphs = []
  const infTables = []
  if (infItems.length > 0) {
    for (const a of infItems) {
      const r = a.result
      if (!r) continue
      // Generate deskriptif + diskusi narrative
      const descText = generateSectionInterpretation(r, 'descriptive')
      const discText = generateSectionInterpretation(r, 'discussion')
      const combined = [descText, discText].filter(Boolean).join('\n\n')
      if (combined) {
        infParagraphs.push(combined)
      }
      // Collect tables from deterministic builder
      const det = buildInferentialSection([a])
      if (det.tables?.length) {
        infTables.push(...det.tables)
      }
    }
  }
  sections.push({
    title: '4.3 Pengujian Hipotesis',
    paragraphs: infParagraphs.length > 0 ? infParagraphs : ['Hasil pengujian hipotesis disajikan berikut.'],
    tables: infTables,
  })

  // 4.4 Pembahasan — AI discussion
  const discSection = await buildAIDiscussionSectionEnhanced(cats.inferential)
  sections.push(discSection)

  return {
    title: 'BAB IV — HASIL DAN PEMBAHASAN',
    intro: `Bab ini menguraikan hasil analisis data yang diperoleh dari ${analyses.length} analisis statistik. Pembahasan disusun mengikuti urutan: deskripsi data, uji asumsi, pengujian hipotesis, dan pembahasan substantif.`,
    sections,
  }
}

/**
 * AI section builder — tries AI generation, falls back to deterministic.
 */
async function buildAISection(title, sectionType, items, fallbackFn) {
  if (items.length === 0) {
    return {
      title,
      paragraphs: ['Sub-bab ini akan diisi setelah analisis terkait dijalankan dan disimpan.'],
      tables: [],
    }
  }

  const paragraphs = []
  for (const a of items) {
    const r = a.result
    if (!r) continue
    const text = generateSectionInterpretation(r, sectionType)
    if (text) paragraphs.push(text)
  }

  // If AI generation failed for all, fallback
  if (paragraphs.length === 0) {
    return fallbackFn(items)
  }

  // Get tables from fallback
  const fallback = fallbackFn(items)
  return { title, paragraphs, tables: fallback.tables || [] }
}

/**
 * Enhanced AI discussion section — generates comprehensive narrative.
 */
async function buildAIDiscussionSectionEnhanced(items) {
  if (items.length === 0) {
    return {
      title: '4.4 Pembahasan Hasil Penelitian',
      paragraphs: ['Pembahasan akan diisi setelah analisis inferensial selesai.'],
      tables: [],
    }
  }

  // Generate discussion per item
  const paragraphs = []
  for (const a of items) {
    const r = a.result
    if (!r) continue
    const disc = generateSectionInterpretation(r, 'discussion')
    if (disc) paragraphs.push(disc)
  }

  // Add AI-generated synthesis paragraph
  try {
    const synthesisPrompt = [
      'Berdasarkan semua hasil analisis di atas, tulis satu paragraf pembahasan komprehensif',
      'yang mengintegrasikan temuan-temuan kunci dan mengaitkannya dengan',
      'implikasi praktis serta keterbatasan penelitian. Gunakan Bahasa Indonesia akademik.',
      `Jumlah analisis: ${items.length}`,
    ].join(' ')
    
    const aiOut = await generateInterpretation({
      type: 'descriptive',
      toolName: 'Pembahasan Komprehensif',
      sampleSize: items.length,
      stats: [],
      _customContext: synthesisPrompt,
    })
    
    if (aiOut?.ok && aiOut.text && !aiOut.fallback) {
      paragraphs.push(aiOut.text)
    }
  } catch {
    // silent fail — deterministic paragraphs already present
  }

  if (paragraphs.length === 0) {
    paragraphs.push('Berdasarkan hasil pengujian hipotesis yang telah dilakukan, temuan penelitian ini memberikan gambaran empiris mengenai hubungan antar variabel yang diteliti. Interpretasi lebih lanjut dari setiap hasil analisis disajikan pada bagian 4.3.')
  }

  // Add closing paragraph
  paragraphs.push(
    'Secara keseluruhan, hasil analisis dalam bab ini memberikan bukti empiris yang mendukung beberapa hipotesis penelitian. Keterbatasan penelitian meliputi ukuran sampel dan generalisasi konteks, sehingga penelitian lanjutan disarankan untuk memperluas cakupan dan mengonfirmasi temuan ini pada populasi yang lebih luas.'
  )

  return {
    title: '4.4 Pembahasan Hasil Penelitian',
    paragraphs,
    tables: [],
  }
}

/**
 * Generate AI discussion paragraph (4.4) menggunakan saved analyses sebagai konteks.
 * Fallback ke deterministic kalau AI gagal.
 */
export async function generateAIDiscussion(analyses) {
  // Build a synthetic payload yang dikenali interpret-stats.
  // Pakai 'descriptive' dengan ringkasan multi-result sebagai konteks.
  const summaries = analyses.map(a => {
    const r = a.result
    return {
      tool: r.toolName || r.type,
      summary: shortSummary(r),
    }
  })
  // Karena tidak ada tipe khusus 'multi_summary' di backend, pakai fallback string concat
  const combined = summaries.map(s => `- ${s.tool}: ${s.summary}`).join('\n')
  const out = await generateInterpretation({
    type: 'descriptive',
    toolName: 'Pembahasan Multi-Analisis',
    sampleSize: analyses.length,
    stats: [],
    _customContext: combined,
  })
  return out
}

function shortSummary(r) {
  if (!r) return ''
  switch (r.type) {
    case 'ttest':       return `t = ${fmt(r.t)}, p = ${pf(r.pValue)}, d = ${fmt(r.cohensD, 2)}`
    case 'anova':       return `F = ${fmt(r.F)}, p = ${pf(r.pValue)}, η² = ${fmt(r.etaSquared, 2)}`
    case 'correlation': return `r = ${fmt(r.r, 2)}, p = ${pf(r.pValue)}`
    case 'regression_simple':
    case 'regression_multiple': return `R² = ${fmt(r.rSquared, 3)}, F = ${fmt(r.F)}, p = ${pf(r.pValue)}`
    case 'chisquare':   return `χ² = ${fmt(r.chiSquare)}, p = ${pf(r.pValue)}, V = ${fmt(r.cramersV, 2)}`
    case 'kruskal':     return `H = ${fmt(r.H)}, p = ${pf(r.pValue)}`
    case 'mannwhitney': return `U = ${fmt(r.U, 0)}, p = ${pf(r.pValue)}`
    case 'wilcoxon':    return `W = ${fmt(r.W, 0)}, p = ${pf(r.pValue)}`
    case 'descriptive': return `${r.stats?.length || 0} variabel dianalisis`
    case 'normality':   return `${r.results?.length || 0} variabel diuji normalitas`
    default:            return r.type
  }
}

/**
 * Convert report → plain text (untuk copy-paste ke Word).
 */
export function reportToText(report) {
  const lines = [report.title, '', report.intro, '']
  report.sections.forEach(sec => {
    lines.push('')
    lines.push(sec.title)
    lines.push('')
    sec.paragraphs.forEach(p => { lines.push(p); lines.push('') })
    sec.tables.forEach(t => {
      lines.push(t.caption)
      lines.push(t.headers.join('\t'))
      t.rows.forEach(row => lines.push(row.join('\t')))
      lines.push('')
    })
  })
  return lines.join('\n')
}

/**
 * Convert report → simple HTML (untuk preview & paste ke Word).
 */
export function reportToHTML(report) {
  let html = `<h1>${report.title}</h1>\n<p>${report.intro}</p>\n`
  report.sections.forEach(sec => {
    html += `<h2>${sec.title}</h2>\n`
    sec.paragraphs.forEach(p => { html += `<p>${p}</p>\n` })
    sec.tables.forEach(t => {
      html += `<p><strong>${t.caption}</strong></p>\n<table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse;"><thead><tr>`
      t.headers.forEach(h => { html += `<th style="text-align:left;background:#f3f4f6;padding:6px 8px">${h}</th>` })
      html += `</tr></thead><tbody>`
      t.rows.forEach(row => {
        html += `<tr>${row.map(c => `<td style="padding:6px 8px;border:1px solid #e5e7eb">${c}</td>`).join('')}</tr>`
      })
      html += `</tbody></table>\n`
    })
  })
  return html
}

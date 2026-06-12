// Client untuk AI Interpretation endpoint.
// Cascade: relative endpoint -> localhost dev -> deterministic local template.

const API_ENDPOINTS = [
  '/api/interpret-stats',
  'http://localhost:3000/api/interpret-stats',
]

export async function generateInterpretation(result) {
  let lastError
  for (const url of API_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success && data.interpretation) {
        return { ok: true, text: data.interpretation, provider: data.provider }
      }
      lastError = data.error || `HTTP ${res.status}`
      // 503 = semua provider overload. Tidak perlu coba endpoint lain.
      if (res.status === 503) break
    } catch (e) {
      lastError = e.message
    }
  }

  // Last-resort: deterministic local template (no API).
  const text = localTemplate(result)
  if (text) {
    return {
      ok: true,
      text,
      provider: 'local-template',
      fallback: true,
      apiError: lastError,
    }
  }
  return { ok: false, error: lastError || 'Tidak ada endpoint yang merespons' }
}

// =====================================================================
// Local template — generates an APA-styled Indonesian interpretation
// purely from the result object. Always available offline.
// =====================================================================
function localTemplate(r) {
  if (!r || !r.type) return null
  // Indonesian thesis convention: comma as decimal separator
  const fmt = (v, d = 3) => {
    if (v == null || (typeof v === 'number' && !isFinite(v))) return '—'
    if (typeof v === 'number') return Number(v).toFixed(d).replace('.', ',')
    return String(v)
  }
  const pf = (p) => p == null ? '—' : (p < 0.001 ? '< 0,001' : Number(p).toFixed(3).replace('.', ','))
  const sig = (b) => b ? 'signifikan secara statistik' : 'tidak signifikan secara statistik'
  const concl = (b, alt) => b
    ? `Dengan demikian, hipotesis nol ditolak dan ${alt} didukung oleh data.`
    : `Dengan demikian, hipotesis nol tidak dapat ditolak; bukti empiris belum cukup untuk mendukung dugaan adanya efek.`

  switch (r.type) {
    case 'descriptive': {
      const stats = r.stats || []
      if (!stats.length) return null
      const vars = stats.map(s => `${s.column} (M = ${fmt(s.mean)}, SD = ${fmt(s.stdDev)}, n = ${s.n})`).join('; ')
      return [
        `Analisis statistik deskriptif dilakukan untuk merangkum karakteristik distribusi pada ${stats.length} variabel kuantitatif. Ringkasan tendensi sentral dan dispersi disajikan untuk memperoleh gambaran awal sebaran data sebelum dilakukan uji inferensial lanjutan.`,
        `Hasil menunjukkan bahwa ${vars}. Nilai median dan rentang interkuartil mengindikasikan derajat kemiringan distribusi pada masing-masing variabel; nilai skewness dan kurtosis dapat digunakan sebagai indikator awal apakah asumsi normalitas perlu diverifikasi melalui uji formal.`,
        `Secara substantif, ringkasan ini menjadi dasar untuk memilih prosedur statistik lanjutan. Variabel dengan sebaran mendekati simetris memungkinkan penggunaan prosedur parametrik, sedangkan variabel dengan kemiringan tinggi disarankan diuji menggunakan prosedur non-parametrik atau ditransformasi terlebih dahulu.`,
      ].join('\n\n')
    }

    case 'normality': {
      const rows = r.results || []
      if (!rows.length) return null
      const lines = rows.map(x => `${x.column} (${x.method}: stat = ${fmt(x.W ?? x.D)}, p = ${pf(x.pValue)}) ${x.isNormal ? 'memenuhi' : 'tidak memenuhi'} asumsi normalitas`).join('; ')
      return [
        `Uji asumsi normalitas dilakukan untuk memverifikasi apakah data setiap variabel mengikuti distribusi normal, sebagai syarat penggunaan prosedur statistik parametrik.`,
        `Hasil pengujian menunjukkan bahwa ${lines}. Keputusan didasarkan pada nilai p dengan ambang signifikansi 0,05; nilai p > 0,05 mengindikasikan tidak adanya bukti penyimpangan terhadap distribusi normal.`,
        `Variabel yang memenuhi asumsi normalitas dapat dianalisis menggunakan prosedur parametrik (mis. uji t, ANOVA, regresi). Sebaliknya, variabel yang tidak memenuhi asumsi disarankan dianalisis menggunakan prosedur non-parametrik (mis. Mann-Whitney, Kruskal-Wallis, Wilcoxon) atau dilakukan transformasi data terlebih dahulu.`,
      ].join('\n\n')
    }

    case 'correlation': {
      const coef = r.r ?? r.rho
      const method = r.method === 'spearman' ? 'Spearman (rho)' : 'Pearson (r)'
      const symbol = r.method === 'spearman' ? 'rho' : 'r'
      return [
        `Analisis korelasi ${method} dilakukan untuk menguji keeratan hubungan linier antara variabel ${r.x} dan ${r.y} pada ${r.n} subjek.`,
        `Hasil menunjukkan ${symbol} = ${fmt(coef)}, t(${r.df}) = ${fmt(r.t)}, p = ${pf(r.pValue)}, yang berarti hubungan antar variabel ${sig(r.significant)}. Arah hubungan tergolong ${r.direction || '—'} dengan kekuatan ${r.strength || '—'}.`,
        `${concl(r.significant, `adanya hubungan ${r.direction || ''} antara kedua variabel`)} Secara praktis, ${r.significant ? `peningkatan satu variabel cenderung disertai ${r.direction === 'positif' ? 'peningkatan' : 'penurunan'} pada variabel lain` : 'kedua variabel dapat dipandang relatif independen dalam sampel ini'}.`,
      ].join('\n\n')
    }

    case 'ttest': {
      const g1 = r.group1, g2 = r.group2
      const groupTxt = g1 && g2
        ? ` Grup ${r.groupNames?.[0] || 1} (n = ${g1.n}, M = ${fmt(g1.mean)}, SD = ${fmt(g1.sd)}) dibandingkan dengan grup ${r.groupNames?.[1] || 2} (n = ${g2.n}, M = ${fmt(g2.mean)}, SD = ${fmt(g2.sd)}).`
        : ''
      return [
        `Uji t (${r.test || r.mode}) dilakukan untuk menguji perbedaan rata-rata antar kelompok.${groupTxt}`,
        `Hasil pengujian memperoleh t(${fmt(r.df, 2)}) = ${fmt(r.t)}, p = ${pf(r.pValue)}${r.cohensD != null ? `, Cohen's d = ${fmt(r.cohensD)} (efek ${r.effectSize || '—'})` : ''}. Perbedaan rata-rata sebesar ${fmt(r.meanDiff)} ${sig(r.significant)}.`,
        `${concl(r.significant, 'adanya perbedaan rata-rata antar kelompok')} ${r.significant ? 'Effect size memberi gambaran besarnya perbedaan secara praktis, yang penting dipertimbangkan di samping signifikansi statistik.' : 'Hasil ini bukan berarti kedua kelompok identik, melainkan bukti perbedaan belum cukup kuat pada ukuran sampel saat ini.'}`,
      ].join('\n\n')
    }

    case 'anova': {
      const groups = (r.groupStats || []).map(g => `${g.label} (n = ${g.n}, M = ${fmt(g.mean)}, SD = ${fmt(g.sd)})`).join('; ')
      const posthoc = r.posthoc?.length
        ? ` Uji post-hoc Tukey HSD mengidentifikasi pasangan grup yang berbeda secara nyata (lihat tabel post-hoc).`
        : ''
      return [
        `Analisis varians satu jalur (one-way ANOVA) dilakukan untuk membandingkan rata-rata pada ${r.k || (r.groupStats?.length)} kelompok dengan total N = ${r.N}.`,
        `Hasil memperoleh F(${r.dfBetween}, ${r.dfWithin}) = ${fmt(r.F)}, p = ${pf(r.pValue)}, η² = ${fmt(r.etaSquared)}, ω² = ${fmt(r.omegaSquared)}. Statistik per kelompok: ${groups}. Perbedaan rata-rata antar kelompok ${sig(r.significant)}.${posthoc}`,
        `${concl(r.significant, 'adanya perbedaan rata-rata di antara kelompok')} Eta squared mencerminkan proporsi varians outcome yang dapat dijelaskan oleh keanggotaan kelompok dan dapat ditafsirkan sebagai ukuran efek praktis.`,
      ].join('\n\n')
    }

    case 'regression_simple': {
      const r2pct = r.rSquared != null ? (r.rSquared * 100).toFixed(1) : '—'
      return [
        `Analisis regresi linier sederhana dilakukan untuk memprediksi ${r.y} dari prediktor ${r.x} pada n = ${r.n} observasi.`,
        `Model menghasilkan persamaan ${r.equation}, dengan koefisien determinasi R² = ${fmt(r.rSquared)} (Adj. R² = ${fmt(r.adjustedR2)}); F(1, ${r.n - 2}) = ${fmt(r.F)}, p = ${pf(r.pF)}. Slope sebesar ${fmt(r.slope)} (SE = ${fmt(r.slope_se)}, p = ${pf(r.slope_p)}) ${sig(r.significant)}, dengan koefisien beta terstandardisasi β = ${fmt(r.standardizedBeta)}.`,
        `${concl(r.significant, `pengaruh ${r.x} terhadap ${r.y}`)} Model menjelaskan sekitar ${r2pct}% varians ${r.y}; sisanya berasal dari faktor lain di luar model yang perlu diakomodasi pada penelitian lanjutan.`,
      ].join('\n\n')
    }

    case 'regression_multiple': {
      const coefs = (r.coefficients || []).map(c => `${c.name}: b = ${fmt(c.b)}, t = ${fmt(c.t)}, p = ${pf(c.p)}`).join('; ')
      return [
        `Analisis regresi linier berganda dilakukan untuk memprediksi ${r.outcome} dari ${r.predictors?.length || 0} prediktor (${r.predictors?.join(', ')}) pada n = ${r.n} observasi.`,
        `Model secara keseluruhan memperoleh R² = ${fmt(r.rSquared)} (Adj. R² = ${fmt(r.adjustedR2)}), F = ${fmt(r.F)}, p = ${pf(r.pF)}. Koefisien per prediktor: ${coefs}.${r.multicollinearity ? ` Diagnosa VIF mengindikasikan ${r.multicollinearity}.` : ''}`,
        `Secara praktis, prediktor dengan p < 0,05 memberi kontribusi unik signifikan terhadap variasi ${r.outcome} setelah mengontrol prediktor lain dalam model. Persamaan akhir: ${r.equation}.`,
      ].join('\n\n')
    }

    case 'chisquare': {
      return [
        `Uji chi-square independensi dilakukan untuk menguji asosiasi antara variabel kategorikal ${r.var1} dan ${r.var2} (N = ${r.N}).`,
        `Hasil pengujian memperoleh χ²(${r.df}) = ${fmt(r.chi2)}, p = ${pf(r.pValue)}, dengan ukuran efek Cramer's V = ${fmt(r.cramersV)} (${r.effectSizeLabel || '—'}). Asosiasi antar variabel ${sig(r.isSignificant)}.${r.assumptionWarning ? ` Catatan: ${r.assumptionWarning}.` : ''}`,
        `${concl(r.isSignificant, 'adanya asosiasi antar variabel kategorikal')} Cramer's V memberi gambaran kekuatan asosiasi yang independen terhadap ukuran sampel sehingga dapat dibandingkan antar studi.`,
      ].join('\n\n')
    }

    case 'mannwhitney': {
      return [
        `Uji Mann-Whitney U (non-parametrik) dilakukan untuk membandingkan distribusi ${r.outcome} antara dua kelompok berdasarkan ${r.grouping}.`,
        `Hasil memperoleh U = ${fmt(r.U)}, z = ${fmt(r.z)}, p = ${pf(r.pValue)}, dengan effect size r = ${fmt(r.effectSize)} (${r.effectSizeLabel || '—'}). Mean rank kelompok ${r.groupNames?.[0]} = ${fmt(r.meanRank1, 2)} (n = ${r.n1}); kelompok ${r.groupNames?.[1]} = ${fmt(r.meanRank2, 2)} (n = ${r.n2}). Perbedaan distribusi ${sig(r.isSignificant)}.`,
        `${concl(r.isSignificant, 'adanya perbedaan distribusi antar kelompok')} Karena uji ini berbasis peringkat, hasilnya robust terhadap pelanggaran asumsi normalitas dan kehadiran outlier.`,
      ].join('\n\n')
    }

    case 'wilcoxon': {
      return [
        `Uji Wilcoxon Signed-Rank dilakukan untuk menguji perbedaan median pada dua pengukuran berpasangan (${r.column1} vs ${r.column2}) dengan n = ${r.n} pasangan.`,
        `Hasil memperoleh W = ${fmt(r.W)}, z = ${fmt(r.z)}, p = ${pf(r.pValue)}, dengan effect size r = ${fmt(r.effectSize)}. Selisih rata-rata pasangan = ${fmt(r.meanDiff)}. Perbedaan ${sig(r.isSignificant)}.`,
        `${concl(r.isSignificant, 'adanya perubahan antar dua kondisi pengukuran')} Sebagai uji non-parametrik, prosedur ini tepat digunakan ketika asumsi normalitas selisih pasangan tidak terpenuhi.`,
      ].join('\n\n')
    }

    case 'kruskal': {
      const groups = (r.groupStats || []).map(g => `${g.name} (n = ${g.n}, Mdn = ${fmt(g.median, 2)}, mean rank = ${fmt(g.meanRank, 2)})`).join('; ')
      return [
        `Uji Kruskal-Wallis (non-parametrik) dilakukan untuk membandingkan distribusi ${r.outcome} pada ${r.k} kelompok berdasarkan ${r.grouping} (N = ${r.N}).`,
        `Hasil memperoleh H(${r.df}) = ${fmt(r.H)}, p = ${pf(r.pValue)}, η² = ${fmt(r.etaSquared)} (${r.effectSizeLabel || '—'}). Statistik kelompok: ${groups}. Perbedaan distribusi antar kelompok ${sig(r.isSignificant)}.`,
        `${concl(r.isSignificant, 'adanya perbedaan distribusi antar kelompok')} Untuk mengidentifikasi pasangan kelompok yang berbeda nyata, dapat dilakukan analisis post-hoc lanjutan (mis. Dunn dengan koreksi Bonferroni).`,
      ].join('\n\n')
    }

    case 'batch_anova':
    case 'batch_kruskal': {
      const groups = (r.groups || []).map(g => `${g.name} (n = ${g.n}, M = ${fmt(g.mean)}, SD = ${fmt(g.sd)})`).join('; ')
      const isANOVA = r.type === 'batch_anova'
      const sig = isANOVA ? r.significant : r.isSignificant
      const a = r.assumptions || {}
      const assumeLine = a.recommendation
        ? `Pemeriksaan asumsi menunjukkan ${a.allNormal ? 'distribusi normal pada semua file' : 'penyimpangan normalitas pada minimal satu file'} (Shapiro-Wilk) dan varians ${a.homogeneous == null ? 'tidak terdiagnosa' : (a.homogeneous ? 'homogen' : 'tidak homogen')} (Levene Brown-Forsythe), sehingga prosedur ${a.recommendation === 'kruskal' ? 'Kruskal-Wallis' : 'one-way ANOVA'} digunakan.`
        : ''
      const stat = isANOVA
        ? `F(${r.dfBetween}, ${r.dfWithin}) = ${fmt(r.F)}, p = ${pf(r.pValue)}, η² = ${fmt(r.etaSquared)} (${r.effectSize || '—'}), ω² = ${fmt(r.omegaSquared)}`
        : `H(${r.df}) = ${fmt(r.H)}, p = ${pf(r.pValue)}, η²_H = ${fmt(r.etaSquared)} (${r.effectSizeLabel || '—'})`
      const posthocTxt = isANOVA && r.posthoc?.length
        ? ` Uji lanjutan (post-hoc Bonferroni) mengidentifikasi pasangan file yang berbeda secara nyata, antara lain: ${r.posthoc.filter(p => p.significant).slice(0, 3).map(p => `${p.group1} vs ${p.group2} (p = ${pf(p.pValue)})`).join('; ') || 'tidak ada pasangan signifikan'}.`
        : ''
      return [
        `Analisis komparatif lintas ${r.fileCount || (r.groups?.length)} dataset dilakukan untuk membandingkan variabel ${r.column} antar file. Tiap file diperlakukan sebagai grup independen, dengan total observasi gabungan ${r.N || (r.groups?.reduce((s, g) => s + g.n, 0))}.`,
        `${assumeLine} Statistik deskriptif per file: ${groups}. Hasil pengujian memperoleh ${stat}; perbedaan distribusi antar file ${sig ? 'signifikan secara statistik' : 'tidak signifikan secara statistik'} pada α = ${r.alpha ?? 0.05}.${posthocTxt}`,
        `${sig
          ? `Dengan demikian, hipotesis nol ditolak dan terdapat bukti bahwa variabel ${r.column} berbeda di antara file/dataset yang dibandingkan. Ukuran efek ${isANOVA ? 'eta-squared' : 'eta-squared H'} memberi gambaran kekuatan praktis perbedaan tersebut, yang dapat menjadi dasar interpretasi substansif lanjutan (mis. perbandingan kelas, kohort, periode, atau kondisi penelitian).`
          : `Dengan demikian, hipotesis nol tidak dapat ditolak; bukti empiris belum cukup untuk menyatakan adanya perbedaan ${r.column} antar file pada ukuran sampel saat ini. Hal ini bukan berarti tidak ada perbedaan sama sekali, melainkan sinyalnya belum cukup kuat dibandingkan variasi within-grup.`}`,
      ].join('\n\n')
    }

    case 'dunn': {
      const pairs = r.significantPairs || []
      const comps = (r.comparisons || []).slice(0, 5).map(c =>
        `${c.group1} vs ${c.group2}: z = ${fmt(c.z)}, p = ${pf(c.pBonferroni)} ${c.significant ? '(signifikan)' : '(tidak signifikan)'}`
      ).join('; ')
      const meanRanks = (r.meanRanks || []).map(m => `${m.group} (mean rank = ${fmt(m.meanRank, 2)}, n = ${m.n})`).join('; ')
      return [
        `Analisis post-hoc Dunn dengan koreksi Bonferroni dilakukan untuk mengidentifikasi pasangan kelompok yang berbeda signifikan setelah uji Kruskal-Wallis (N = ${r.N}, k = ${r.k}).`,
        `Mean rank per kelompok: ${meanRanks}. Dari ${r.numPairs} perbandingan berpasangan, ditemukan ${pairs.length} pasangan yang signifikan pada α = ${r.alpha ?? '0,05'} setelah koreksi Bonferroni.`,
        `${pairs.length > 0
          ? `Pasangan signifikan meliputi: ${comps}. Kelompok dengan mean rank lebih tinggi memiliki kecenderungan nilai lebih besar pada variabel dependen.`
          : `Tidak ditemukan pasangan yang berbeda signifikan setelah koreksi, menunjukkan bahwa perbedaan yang teramati pada uji omnibus Kruskal-Wallis berasal dari kombinasi pasangan yang tidak cukup kuat setelah disesuaikan untuk jumlah perbandingan.`}`,
      ].join('\n\n')
    }

    case 'friedman': {
      const conds = (r.conditionStats || []).map(c => `${c.name} (sum rank = ${fmt(c.sumRank, 1)}, mean rank = ${fmt(c.meanRank, 2)}, Mdn = ${fmt(c.median)})`).join('; ')
      return [
        `Uji Friedman dilakukan sebagai alternatif non-parametrik one-way ANOVA repeated measures pada ${r.n} blok/subjek dengan ${r.k} kondisi pengukuran berulang.`,
        `Hasil memperoleh χ²(${r.df}) = ${fmt(r.chi2)}, p = ${pf(r.pValue)}, Kendall's W = ${fmt(r.W)} (${r.WLabel?.toLowerCase() || '—'}). Statistik per kondisi: ${conds}. Perbedaan antar kondisi ${sig(r.isSignificant)}.`,
        `${concl(r.isSignificant, 'adanya perbedaan peringkat antar kondisi')} Kendall's W sebesar ${fmt(r.W)} mengindikasikan tingkat keselarasan ${r.WLabel?.toLowerCase() || '—'} antar subjek dalam memberikan peringkat pada kondisi.`,
      ].join('\n\n')
    }

    case 'mcnemar': {
      const or = typeof r.oddsRatio === 'string' ? r.oddsRatio : fmt(r.oddsRatio)
      return [
        `Uji McNemar dilakukan untuk menguji perubahan proporsi pada data dikotomi berpasangan (sebelum–sesudah) pada N = ${r.N} subjek.`,
        `Tabel kontingensi 2×2: a (sebelum+, sesudah+) = ${r.a}, b (sebelum+, sesudah−) = ${r.b}, c (sebelum−, sesudah+) = ${r.c}, d (sebelum−, sesudah−) = ${r.d}. Pasangan diskordan b + c = ${r.discordant}.`,
        `Hasil memperoleh χ²(1) = ${fmt(r.chi2)}, p = ${pf(r.exactP != null ? r.exactP : r.pValue)}${r.exactP != null ? ' (eksak binomial)' : ''} dengan koreksi kontinuitas. Odds ratio b/c = ${or}. Perubahan proporsi ${sig(r.isSignificant)}.${r.note ? ` Catatan: ${r.note}.` : ''}`,
        `${concl(r.isSignificant, 'adanya perubahan proporsi yang signifikan')} Arah perubahan dapat dilihat dari sel b (sebelum+ menjadi sesudah−) dan c (sebelum− menjadi sesudah+).`,
      ].join('\n\n')
    }

    case 'partial_correlation': {
      const zc = r.r_xy != null && r.r_xz != null && r.r_yz != null
        ? ` Korelasi zero-order: r_xy = ${fmt(r.r_xy)}, r_xz = ${fmt(r.r_xz)}, r_yz = ${fmt(r.r_yz)}.`
        : ''
      return [
        `Analisis korelasi parsial orde-${r.order || 0} dilakukan untuk menguji hubungan antara variabel utama setelah mengontrol ${r.order || 0} variabel pengganggu (n = ${r.n}).`,
        `Hasil memperoleh r parsial = ${fmt(r.rPartial)}, r² = ${fmt(r.r2)}, t(${fmt(r.df, 2)}) = ${fmt(r.t)}, p = ${pf(r.pValue)}.${zc} Hubungan parsial ${sig(r.pValue < (r.alpha || 0.05))} dengan arah ${r.direction || '—'} dan kekuatan ${r.strength || '—'}.`,
        `${concl(r.pValue < (r.alpha || 0.05), 'adanya hubungan linier antara kedua variabel setelah mengontrol variabel pengganggu')} Koefisien korelasi parsial mengisolasi hubungan murni antara dua variabel dengan menghilangkan pengaruh bersama dari variabel kontrol.`,
      ].join('\n\n')
    }

    case 'validity_reliability': {
      const alpha = r.reliability?.alpha
      const reliable = alpha != null && alpha >= 0.7
      const validItems = r.validity?.items?.filter(it => it.verdict?.toLowerCase().includes('valid')).length || 0
      const totalItems = r.validity?.items?.length || 0
      return [
        `Uji validitas dan reliabilitas instrumen dilakukan pada ${totalItems} item dengan ${r.reliability?.n || '—'} responden.`,
        `Koefisien reliabilitas Cronbach's α = ${fmt(alpha)} mengindikasikan instrumen ${reliable ? 'reliabel' : 'kurang reliabel'} berdasarkan ambang konvensional α ≥ 0,70. Sebanyak ${validItems} dari ${totalItems} item memenuhi kriteria validitas item-total.`,
        `${reliable ? 'Instrumen layak digunakan untuk pengukuran konstruk yang sama pada studi lanjutan.' : 'Disarankan meninjau ulang item dengan korelasi item-total rendah, karena dapat menurunkan reliabilitas keseluruhan instrumen.'} Item yang tidak valid dapat dipertimbangkan untuk direvisi atau dieliminasi.`,
      ].join('\n\n')
    }

    default:
      return null
  }
}

/**
 * reportNarrator.js — AI-powered narrative generator for statistical results
 * Generates academic Indonesian prose for Chapter IV reports
 * Part of Azezmen (zoya.id-beta) Phase 10
 */

const num = (v, d = 3) => typeof v === 'number' ? v.toFixed(d) : (v ?? '—')
const pVal = (p) => typeof p === 'number' ? (p < 0.001 ? '< 0.001' : p.toFixed(4)) : '—'

export function generateNarasi(result) {
  const { type, significant, p, alpha = 0.05 } = result
  
  const handlers = {
    descriptive: () => narrateDescriptive(result),
    normality: () => narrateNormality(result),
    correlation: () => narrateCorrelation(result),
    ttest: () => narrateTTest(result),
    anova: () => narrateANOVA(result),
    regression_simple: () => narrateRegression(result),
    regression_multiple: () => narrateRegression(result),
    chisquare: () => narrateChiSquare(result),
    mannwhitney: () => narrateMannWhitney(result),
    wilcoxon: () => narrateWilcoxon(result),
    kruskal: () => narrateKruskal(result),
    validity: () => narrateValidity(result),
    reliability: () => narrateReliability(result),
    validity_reliability: () => narrateValidityReliability(result),
    ngain: () => narrateNGain(result)
  }
  
  const handler = handlers[type]
  if (!handler) {
    return {
      title: 'Hasil Analisis',
      narasi: `Analisis statistik telah dilakukan untuk uji "${type}". Hasil lengkap dapat dilihat pada tabel di atas.`
    }
  }
  
  return handler()
}

function narrateDescriptive(r) {
  const stats = r.stats || []
  if (stats.length === 0) {
    return { title: 'Statistik Deskriptif', narasi: 'Tidak ada data untuk dianalisis.' }
  }
  
  const paragraphs = stats.map(s => {
    return `Variabel ${s.column} memiliki nilai rata-rata (mean) sebesar ${s.mean} dengan standar deviasi ${s.stdDev}. Nilai median adalah ${s.median}, sedangkan modus berada pada ${s.mode}. Rentang data berada antara nilai minimum ${s.min} hingga maksimum ${s.max}. Berdasarkan nilai skewness sebesar ${s.skewness}, data ${Math.abs(parseFloat(s.skewness)) < 0.5 ? 'cenderung simetris' : parseFloat(s.skewness) > 0 ? 'miring ke kanan (positif)' : 'miring ke kiri (negatif)'}. Nilai kurtosis sebesar ${s.kurtosis} menunjukkan distribusi ${Math.abs(parseFloat(s.kurtosis)) < 3 ? 'relatif normal' : parseFloat(s.kurtosis) > 3 ? 'lebih runcing (leptokurtic)' : 'lebih datar (platykurtic)'} dibandingkan distribusi normal.`
  })
  
  return {
    title: 'Hasil Analisis Statistik Deskriptif',
    narasi: paragraphs.join('\n\n')
  }
}

function narrateNormality(r) {
  const rows = r.results || [{ column: r.column, ...r }]
  const paragraphs = rows.map(row => {
    const sig = row.isNormal ? 'tidak signifikan' : 'signifikan'
    const conclusion = row.isNormal
      ? 'tidak cukup bukti untuk menolak H₀, sehingga dapat disimpulkan bahwa data berdistribusi normal'
      : 'H₀ ditolak, yang berarti data tidak berdistribusi normal'
    
    return `Uji normalitas untuk variabel ${row.column} menggunakan metode Shapiro-Wilk menghasilkan nilai statistik W = ${row.W} dengan nilai p = ${pVal(row.p)}. Dengan tingkat signifikansi α = ${r.alpha || 0.05}, hasil uji menunjukkan nilai p yang ${sig} (p ${row.isNormal ? '>' : '<'} α). Hal ini berarti ${conclusion}. ${row.isNormal ? 'Data dapat digunakan untuk analisis parametrik.' : 'Disarankan menggunakan uji non-parametrik untuk analisis lebih lanjut.'}`
  })
  
  return {
    title: 'Hasil Uji Normalitas',
    narasi: paragraphs.join('\n\n')
  }
}

function narrateCorrelation(r) {
  const method = r.method === 'spearman' ? 'Spearman' : r.tau !== undefined ? 'Kendall Tau-b' : 'Pearson'
  const coef = r.r || r.rho || r.tau || 0
  const strength = Math.abs(coef) < 0.3 ? 'lemah' : Math.abs(coef) < 0.7 ? 'sedang' : 'kuat'
  const direction = coef > 0 ? 'positif' : 'negatif'
  const sig = r.significant ? 'signifikan' : 'tidak signifikan'
  const conclusion = r.significant
    ? `terdapat hubungan yang ${sig} antara ${r.x} dan ${r.y}`
    : `tidak terdapat hubungan yang ${sig} antara ${r.x} dan ${r.y}`
  
  return {
    title: `Hasil Uji Korelasi ${method}`,
    narasi: `Analisis korelasi menggunakan metode ${method} dilakukan untuk menguji hubungan antara variabel ${r.x} dan ${r.y}. Hasil analisis menunjukkan nilai koefisien korelasi sebesar ${num(coef, 3)} dengan nilai p = ${pVal(r.p)}. Pada tingkat signifikansi α = ${r.alpha || 0.05}, nilai p ${r.significant ? '<' : '>'} α, yang berarti ${conclusion}. Kekuatan hubungan tergolong ${strength} dengan arah korelasi ${direction}. ${r.significant ? `Artinya, perubahan pada variabel ${r.x} akan ${direction === 'positif' ? 'berbanding lurus' : 'berbanding terbalik'} dengan perubahan pada variabel ${r.y}.` : 'Dengan demikian, kedua variabel tidak memiliki hubungan linear yang bermakna secara statistik.'}`
  }
}

function narrateTTest(r) {
  const mode = r.mode || 'independent'
  const title = mode === 'independent' ? 'Independent Samples t-Test' : mode === 'paired' ? 'Paired Samples t-Test' : 'One Sample t-Test'
  const sig = r.significant ? 'signifikan' : 'tidak signifikan'
  const conclusion = r.significant ? 'H₀ ditolak' : 'H₀ tidak ditolak'
  
  let context = ''
  if (mode === 'independent') {
    context = `Uji dilakukan untuk membandingkan rata-rata variabel ${r.outcome || 'dependen'} antara dua kelompok ${r.grouping || 'independen'}.`
  } else if (mode === 'paired') {
    context = `Uji dilakukan untuk membandingkan rata-rata berpasangan antara ${r.column1} dan ${r.column2}.`
  } else {
    context = `Uji dilakukan untuk membandingkan rata-rata variabel ${r.column} dengan nilai hipotesis μ₀ = ${r.mu0 || 0}.`
  }
  
  return {
    title: `Hasil Uji ${title}`,
    narasi: `${context} Hasil analisis menunjukkan nilai t-statistik sebesar ${num(r.t, 3)} dengan derajat kebebasan (df) = ${r.df}, dan nilai p = ${pVal(r.p)}. Pada tingkat signifikansi α = ${r.alpha || 0.05}, hasil uji ${sig} (p ${r.significant ? '<' : '>'} α), sehingga ${conclusion}. ${r.significant ? `Hal ini menunjukkan bahwa terdapat perbedaan yang signifikan secara statistik ${mode === 'independent' ? 'antara kedua kelompok' : mode === 'paired' ? 'antara kedua pengukuran' : 'antara rata-rata sampel dengan nilai hipotesis'}.` : `Artinya, tidak terdapat perbedaan yang signifikan secara statistik ${mode === 'independent' ? 'antara kedua kelompok' : mode === 'paired' ? 'antara kedua pengukuran' : 'antara rata-rata sampel dengan nilai hipotesis'}.`}`
  }
}

function narrateANOVA(r) {
  const sig = r.significant ? 'signifikan' : 'tidak signifikan'
  const conclusion = r.significant ? 'H₀ ditolak' : 'H₀ tidak ditolak'
  
  return {
    title: 'Hasil Uji ANOVA One-Way',
    narasi: `Analisis varians (ANOVA) satu arah dilakukan untuk menguji perbedaan rata-rata variabel ${r.outcome || 'dependen'} di antara ${r.k || 3} kelompok ${r.grouping || 'independen'}. Hasil analisis menunjukkan nilai F-statistik sebesar ${num(r.F, 3)} dengan derajat kebebasan df₁ = ${r.dfBetween}, df₂ = ${r.dfWithin}, dan nilai p = ${pVal(r.p)}. Pada tingkat signifikansi α = ${r.alpha || 0.05}, hasil uji ${sig} (p ${r.significant ? '<' : '>'} α), sehingga ${conclusion}. ${r.significant ? 'Hal ini menunjukkan bahwa setidaknya terdapat satu kelompok yang memiliki rata-rata berbeda secara signifikan dari kelompok lainnya. Untuk mengetahui kelompok mana yang berbeda, dapat dilakukan uji lanjut (post-hoc) seperti Tukey HSD.' : 'Artinya, tidak terdapat perbedaan yang signifikan di antara rata-rata kelompok-kelompok tersebut.'}`
  }
}

function narrateRegression(r) {
  const isMultiple = r.type === 'regression_multiple'
  const sig = r.significant ? 'signifikan' : 'tidak signifikan'
  const conclusion = r.significant ? 'model regresi layak digunakan' : 'model regresi tidak layak digunakan'
  
  return {
    title: `Hasil Analisis Regresi ${isMultiple ? 'Linear Berganda' : 'Linear Sederhana'}`,
    narasi: `Analisis regresi ${isMultiple ? 'berganda' : 'sederhana'} dilakukan untuk menguji pengaruh variabel ${isMultiple ? 'prediktor' : `prediktor ${r.predictors?.[0] || 'X'}`} terhadap variabel ${r.outcome || 'Y'}. Hasil analisis menunjukkan nilai F-statistik sebesar ${num(r.F, 3)} dengan nilai p = ${pVal(r.pModel)}. Koefisien determinasi (R²) sebesar ${num(r.rSquared, 3)} menunjukkan bahwa ${(r.rSquared * 100).toFixed(1)}% variansi variabel ${r.outcome || 'Y'} dapat dijelaskan oleh variabel ${isMultiple ? 'prediktor dalam model' : `prediktor ${r.predictors?.[0] || 'X'}`}. Pada tingkat signifikansi α = ${r.alpha || 0.05}, model regresi ${sig} (p ${r.significant ? '<' : '>'} α), sehingga ${conclusion}. ${r.significant ? `Nilai R² adjusted sebesar ${num(r.rSquaredAdj, 3)} menunjukkan daya prediksi model yang ${r.rSquaredAdj > 0.7 ? 'kuat' : r.rSquaredAdj > 0.5 ? 'moderat' : 'lemah'}.` : 'Dengan demikian, variabel prediktor tidak memiliki pengaruh yang bermakna terhadap variabel outcome.'}`
  }
}

function narrateChiSquare(r) {
  const sig = r.significant ? 'signifikan' : 'tidak signifikan'
  const conclusion = r.significant ? 'terdapat hubungan' : 'tidak terdapat hubungan'
  
  return {
    title: 'Hasil Uji Chi-Square',
    narasi: `Uji Chi-Square dilakukan untuk menguji hubungan antara variabel ${r.var1} dan ${r.var2}. Hasil analisis menunjukkan nilai χ² sebesar ${num(r.chiSquare, 3)} dengan derajat kebebasan (df) = ${r.df}, dan nilai p = ${pVal(r.p)}. Pada tingkat signifikansi α = ${r.alpha || 0.05}, hasil uji ${sig} (p ${r.significant ? '<' : '>'} α), yang berarti ${conclusion} yang bermakna secara statistik antara kedua variabel kategorikal tersebut. ${r.significant ? 'Dengan demikian, distribusi frekuensi variabel-variabel tersebut tidak independen satu sama lain.' : 'Artinya, kedua variabel bersifat independen atau tidak saling memengaruhi.'}`
  }
}

function narrateMannWhitney(r) {
  const sig = r.significant ? 'signifikan' : 'tidak signifikan'
  const conclusion = r.significant ? 'H₀ ditolak' : 'H₀ tidak ditolak'
  
  return {
    title: 'Hasil Uji Mann-Whitney U',
    narasi: `Uji Mann-Whitney U dilakukan sebagai alternatif non-parametrik untuk membandingkan dua kelompok independen pada variabel ${r.outcome || 'dependen'} berdasarkan ${r.grouping || 'kelompok'}. Hasil analisis menunjukkan nilai U-statistik sebesar ${num(r.U, 3)} dengan nilai p = ${pVal(r.p)}. Pada tingkat signifikansi α = ${r.alpha || 0.05}, hasil uji ${sig} (p ${r.significant ? '<' : '>'} α), sehingga ${conclusion}. ${r.significant ? 'Hal ini menunjukkan bahwa terdapat perbedaan yang signifikan pada median atau peringkat antara kedua kelompok.' : 'Artinya, tidak terdapat perbedaan yang signifikan pada median atau peringkat antara kedua kelompok.'}`
  }
}

function narrateWilcoxon(r) {
  const sig = r.significant ? 'signifikan' : 'tidak signifikan'
  const conclusion = r.significant ? 'H₀ ditolak' : 'H₀ tidak ditolak'
  
  return {
    title: 'Hasil Uji Wilcoxon Signed-Rank',
    narasi: `Uji Wilcoxon Signed-Rank dilakukan sebagai alternatif non-parametrik untuk membandingkan dua pengukuran berpasangan antara ${r.column1} dan ${r.column2}. Hasil analisis menunjukkan nilai statistik W sebesar ${num(r.W, 3)} dengan nilai p = ${pVal(r.p)}. Pada tingkat signifikansi α = ${r.alpha || 0.05}, hasil uji ${sig} (p ${r.significant ? '<' : '>'} α), sehingga ${conclusion}. ${r.significant ? 'Hal ini menunjukkan bahwa terdapat perbedaan yang signifikan antara kedua pengukuran berpasangan tersebut.' : 'Artinya, tidak terdapat perbedaan yang signifikan antara kedua pengukuran berpasangan tersebut.'}`
  }
}

function narrateKruskal(r) {
  const sig = r.significant ? 'signifikan' : 'tidak signifikan'
  const conclusion = r.significant ? 'H₀ ditolak' : 'H₀ tidak ditolak'
  
  return {
    title: 'Hasil Uji Kruskal-Wallis',
    narasi: `Uji Kruskal-Wallis dilakukan sebagai alternatif non-parametrik untuk membandingkan lebih dari dua kelompok independen pada variabel ${r.outcome || 'dependen'} berdasarkan ${r.grouping || 'kelompok'}. Hasil analisis menunjukkan nilai H-statistik sebesar ${num(r.H, 3)} dengan derajat kebebasan (df) = ${r.df}, dan nilai p = ${pVal(r.p)}. Pada tingkat signifikansi α = ${r.alpha || 0.05}, hasil uji ${sig} (p ${r.significant ? '<' : '>'} α), sehingga ${conclusion}. ${r.significant ? 'Hal ini menunjukkan bahwa setidaknya terdapat satu kelompok yang memiliki median atau peringkat berbeda secara signifikan dari kelompok lainnya. Uji lanjut dapat dilakukan untuk mengidentifikasi kelompok mana yang berbeda.' : 'Artinya, tidak terdapat perbedaan yang signifikan pada median atau peringkat di antara kelompok-kelompok tersebut.'}`
  }
}

function narrateValidity(r) {
  const items = r.items || []
  const validCount = items.filter(i => i.isValid).length
  const invalidCount = items.length - validCount
  
  return {
    title: 'Hasil Uji Validitas',
    narasi: `Uji validitas dilakukan terhadap ${items.length} item instrumen menggunakan korelasi Product Moment Pearson dengan nilai r-tabel = ${num(r.rTable, 3)} pada α = ${r.alpha || 0.05}. Hasil analisis menunjukkan bahwa ${validCount} item dinyatakan valid (r-hitung > r-tabel) dan ${invalidCount} item tidak valid. Item yang valid memiliki nilai korelasi berkisar antara ${num(Math.min(...items.filter(i => i.isValid).map(i => i.r)), 3)} hingga ${num(Math.max(...items.filter(i => i.isValid).map(i => i.r)), 3)}. ${validCount === items.length ? 'Semua item instrumen layak digunakan untuk pengukuran.' : `Terdapat ${invalidCount} item yang perlu diperbaiki atau dihapus karena tidak memenuhi kriteria validitas.`}`
  }
}

function narrateReliability(r) {
  const level = r.alpha >= 0.9 ? 'sangat tinggi (excellent)' : r.alpha >= 0.8 ? 'tinggi (good)' : r.alpha >= 0.7 ? 'dapat diterima (acceptable)' : r.alpha >= 0.6 ? 'dipertanyakan (questionable)' : 'rendah (poor)'
  
  return {
    title: 'Hasil Uji Reliabilitas',
    narasi: `Uji reliabilitas dilakukan menggunakan metode Cronbach's Alpha terhadap ${r.items?.length || 0} item instrumen. Hasil analisis menunjukkan nilai Cronbach's Alpha sebesar ${num(r.alpha, 3)}. Berdasarkan kriteria interpretasi reliabilitas, nilai ini tergolong ${level}. ${r.alpha >= 0.7 ? 'Instrumen dinyatakan reliabel dan konsisten untuk digunakan dalam pengukuran.' : 'Instrumen perlu diperbaiki karena tingkat konsistensi internal yang rendah. Disarankan untuk meninjau ulang atau menghapus item-item yang menurunkan reliabilitas.'}`
  }
}

function narrateValidityReliability(r) {
  const validity = narrateValidity(r)
  const reliability = narrateReliability(r)
  
  return {
    title: 'Hasil Uji Validitas dan Reliabilitas',
    narasi: `${validity.narasi}\n\n${reliability.narasi}`
  }
}

function narrateNGain(r) {
  const category = r.nGain >= 0.7 ? 'tinggi' : r.nGain >= 0.3 ? 'sedang' : 'rendah'
  
  return {
    title: 'Hasil Analisis N-Gain',
    narasi: `Analisis N-Gain dilakukan untuk mengukur efektivitas peningkatan skor dari pre-test (${r.column1}) ke post-test (${r.column2}) dengan skor maksimal ${r.maxScore || 100}. Hasil perhitungan menunjukkan nilai N-Gain sebesar ${num(r.nGain, 3)} atau ${(r.nGain * 100).toFixed(1)}%. Berdasarkan kriteria interpretasi Hake (1999), nilai N-Gain ini tergolong kategori ${category}. ${r.nGain >= 0.7 ? 'Hal ini menunjukkan bahwa intervensi atau perlakuan yang diberikan sangat efektif dalam meningkatkan pemahaman atau kemampuan subjek.' : r.nGain >= 0.3 ? 'Artinya, intervensi atau perlakuan yang diberikan cukup efektif dalam meningkatkan pemahaman atau kemampuan subjek, namun masih dapat dioptimalkan.' : 'Hal ini menunjukkan bahwa intervensi atau perlakuan yang diberikan kurang efektif dalam meningkatkan pemahaman atau kemampuan subjek. Perlu evaluasi dan perbaikan strategi.'}`
  }
}

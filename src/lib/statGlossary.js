// Glossary istilah statistik — penjelasan singkat dan akademik untuk
// menjadi konten tooltip edukatif di hasil analisis.
//
// Setiap entry: { title, description, threshold? (panduan interpretasi),
// formula? (notasi matematis singkat), reference? }
//
// Tujuan: web ini bukan hanya tool, tapi juga bahan belajar — mahasiswa skripsi
// bisa langsung paham apa arti angka yang dilihatnya.

export const STAT_GLOSSARY = {
  // ---------- p-value & signifikansi ----------
  p_value: {
    title: 'p-value',
    description: 'Probabilitas memperoleh hasil sama atau lebih ekstrem dari yang diamati, jika hipotesis nol (H0) benar. Bila p < α (umumnya 0,05), H0 ditolak.',
    threshold: 'p < 0,05 → signifikan; p < 0,01 → sangat signifikan; p ≥ 0,05 → tidak signifikan.',
  },
  alpha: {
    title: 'Alpha (α)',
    description: 'Tingkat signifikansi yang ditetapkan peneliti — batas toleransi kesalahan Tipe I (menolak H0 padahal benar). Konvensi umum: α = 0,05.',
  },

  // ---------- Effect size ----------
  cohens_d: {
    title: "Cohen's d",
    description: 'Ukuran efek untuk perbedaan dua rerata, distandardisasi terhadap standar deviasi gabungan. Tidak bergantung pada ukuran sampel, sehingga lebih informatif daripada p-value untuk magnitudo perbedaan.',
    threshold: 'd ≈ 0,2 → kecil; d ≈ 0,5 → sedang; d ≈ 0,8 → besar (Cohen, 1988).',
    formula: 'd = (M₁ − M₂) / SD_pooled',
  },
  eta_squared: {
    title: 'Eta-squared (η²)',
    description: 'Ukuran efek untuk ANOVA — proporsi varians outcome yang dijelaskan oleh variabel grup. Semakin besar, semakin kuat efek grouping.',
    threshold: 'η² ≈ 0,01 → kecil; η² ≈ 0,06 → sedang; η² ≈ 0,14 → besar.',
    formula: 'η² = SS_between / SS_total',
  },
  omega_squared: {
    title: 'Omega-squared (ω²)',
    description: 'Versi η² yang lebih kurang bias (less biased) untuk estimasi populasi. Cenderung sedikit lebih kecil dari η². Direkomendasikan APA untuk pelaporan ANOVA.',
    formula: 'ω² = (SS_between − (k−1)MS_within) / (SS_total + MS_within)',
  },
  cramers_v: {
    title: "Cramér's V",
    description: 'Ukuran kekuatan asosiasi untuk uji chi-square. Range 0 (tidak ada asosiasi) hingga 1 (asosiasi sempurna). Tidak bergantung pada ukuran sampel.',
    threshold: 'V < 0,1 → lemah; 0,1–0,3 → sedang; > 0,3 → kuat.',
  },

  // ---------- Korelasi & Regresi ----------
  pearson_r: {
    title: 'Korelasi Pearson (r)',
    description: 'Mengukur kekuatan dan arah hubungan linier antara dua variabel kontinu. Range −1 hingga +1. Asumsi: hubungan linier, kedua variabel berdistribusi normal.',
    threshold: '|r| < 0,3 → lemah; 0,3–0,5 → sedang; 0,5–0,7 → kuat; > 0,7 → sangat kuat.',
  },
  spearman_rho: {
    title: 'Spearman ρ (rho)',
    description: 'Korelasi non-parametrik berdasarkan rank, cocok untuk data ordinal atau ketika asumsi normalitas tidak terpenuhi.',
    threshold: 'Interpretasi sama dengan Pearson, namun mengukur hubungan monotonik (tidak harus linier).',
  },
  r_squared: {
    title: 'R² (Koefisien Determinasi)',
    description: 'Proporsi varians variabel terikat yang dapat dijelaskan oleh model regresi. R² = 0,40 berarti model menjelaskan 40% variasi outcome.',
    threshold: 'R² > 0,5 dianggap baik untuk skripsi sosial; > 0,7 untuk eksak. Tergantung bidang penelitian.',
  },
  adjusted_r_squared: {
    title: 'Adjusted R²',
    description: 'R² yang sudah disesuaikan dengan jumlah prediktor. Selalu ≤ R². Lebih akurat untuk membandingkan model dengan jumlah prediktor berbeda.',
  },
  vif: {
    title: 'VIF (Variance Inflation Factor)',
    description: 'Mendeteksi multikolinieritas antar prediktor dalam regresi berganda. VIF tinggi → prediktor saling tumpang-tindih → koefisien tidak stabil.',
    threshold: 'VIF < 5 → aman; 5–10 → perlu perhatian; > 10 → multikolinieritas serius.',
  },
  beta: {
    title: 'Beta (β) — koefisien standardized',
    description: 'Koefisien regresi yang sudah distandardisasi (skor-z). Memungkinkan perbandingan kekuatan relatif antar prediktor pada skala yang sama, terlepas dari unit asalnya.',
  },

  // ---------- T-test & ANOVA ----------
  t_statistic: {
    title: 'Statistik t',
    description: 'Rasio antara perbedaan rerata dan standard error. Semakin besar |t|, semakin jauh data dari H0.',
    formula: 't = (M − μ₀) / (SD/√n)  (one-sample)',
  },
  f_statistic: {
    title: 'Statistik F',
    description: 'Rasio varians antar-grup terhadap varians dalam-grup. F besar → perbedaan antar grup signifikan dibanding noise dalam grup.',
    formula: 'F = MS_between / MS_within',
  },
  df: {
    title: 'Derajat Kebebasan (df)',
    description: 'Jumlah nilai yang bebas bervariasi dalam perhitungan statistik. Untuk t-test 1 sampel: df = n−1. Untuk ANOVA: df_between = k−1, df_within = N−k.',
  },
  welch_correction: {
    title: 'Welch Correction',
    description: 'Modifikasi t-test independen yang TIDAK mengasumsikan varians sama antar kelompok. Lebih robust dan direkomendasikan ketika ukuran sampel atau varians antar grup berbeda.',
  },

  // ---------- Asumsi ----------
  shapiro_wilk: {
    title: 'Shapiro-Wilk Test',
    description: 'Uji formal normalitas data. H0: data berdistribusi normal. Bila p ≥ 0,05 → asumsi normalitas terpenuhi (gagal tolak H0). Akurat untuk n ≤ 50.',
    threshold: 'p ≥ 0,05 → distribusi normal. p < 0,05 → bukan normal, pertimbangkan uji non-parametrik.',
  },
  kolmogorov_smirnov: {
    title: 'Kolmogorov-Smirnov Test',
    description: 'Alternatif uji normalitas, lebih cocok untuk sampel besar (n > 50). Membandingkan distribusi empiris dengan distribusi normal teoritis.',
  },
  levene_test: {
    title: 'Levene\'s Test (Brown-Forsythe)',
    description: 'Uji homogenitas varians antar kelompok. H0: varians antar grup sama. Bila p ≥ 0,05 → varians homogen, ANOVA klasik dapat digunakan.',
    threshold: 'p ≥ 0,05 → homogen; p < 0,05 → tidak homogen, gunakan Welch ANOVA atau Kruskal-Wallis.',
  },

  // ---------- Reliability ----------
  cronbach_alpha: {
    title: "Cronbach's Alpha (α)",
    description: 'Estimasi reliabilitas internal consistency instrumen Likert. Mengukur seberapa konsisten item-item mengukur konstruk yang sama.',
    threshold: 'α ≥ 0,9 → excellent; 0,8–0,9 → good; 0,7–0,8 → acceptable; < 0,7 → kurang reliabel (revisi item).',
  },
  item_total_correlation: {
    title: 'Korelasi Item-Total',
    description: 'Korelasi setiap item terhadap skor total instrumen (dikurangi item itu sendiri). Item dengan korelasi rendah perlu direvisi atau dieliminasi.',
    threshold: 'r > 0,3 → item valid; r < 0,3 → item kurang valid, pertimbangkan eliminasi.',
  },

  // ---------- Non-parametric ----------
  mann_whitney_u: {
    title: 'Mann-Whitney U',
    description: 'Versi non-parametrik dari independent t-test. Membandingkan distribusi 2 grup tanpa asumsi normalitas. Berbasis ranking.',
  },
  wilcoxon_signed_rank: {
    title: 'Wilcoxon Signed-Rank',
    description: 'Versi non-parametrik dari paired t-test. Untuk data berpasangan ketika distribusi selisih tidak normal.',
  },
  kruskal_wallis_h: {
    title: 'Kruskal-Wallis H',
    description: 'Versi non-parametrik dari one-way ANOVA. Membandingkan distribusi ≥ 3 grup tanpa asumsi normalitas.',
  },

  // ---------- Descriptive ----------
  skewness: {
    title: 'Skewness',
    description: 'Ukuran kemiringan distribusi. Skewness > 0 → ekor kanan panjang (right-skewed); < 0 → ekor kiri panjang.',
    threshold: '|skewness| < 1 → distribusi cukup simetris; |skewness| ≥ 1 → kemiringan substansial.',
  },
  kurtosis: {
    title: 'Kurtosis',
    description: 'Ukuran ke-runcingan distribusi. Kurtosis > 0 (excess) → lebih runcing dari normal (leptokurtic); < 0 → lebih datar (platykurtic).',
    threshold: '|kurtosis| < 1 → mendekati normal.',
  },
  standard_deviation: {
    title: 'Standar Deviasi (SD)',
    description: 'Akar dari varians. Mengukur seberapa jauh data tersebar dari rerata. Memiliki satuan yang sama dengan variabel asli.',
  },
  median: {
    title: 'Median',
    description: 'Nilai tengah ketika data diurutkan. Lebih robust terhadap outlier dibanding mean. Direkomendasikan untuk data skewed atau ordinal.',
  },

  // ---------- Power Analysis ----------
  statistical_power: {
    title: 'Statistical Power (1 − β)',
    description: 'Probabilitas menolak H0 ketika H0 memang salah (mendeteksi efek yang nyata ada). Power rendah → risiko Tipe II tinggi (gagal mendeteksi efek).',
    threshold: 'Power ≥ 0,80 → cukup (standar konvensional); ≥ 0,90 → kuat.',
  },

  // ---------- Tier 1: Assumption checks ----------
  levene: {
    title: "Levene's Test (Brown-Forsythe)",
    description: 'Uji homogenitas variansi antar grup. H0: variansi grup-grup sama. Jika p < 0,05 → variansi tidak homogen, gunakan Welch\'s t-test atau Welch\'s ANOVA.',
    threshold: 'p ≥ 0,05 → variansi homogen (asumsi terpenuhi); p < 0,05 → tidak homogen.',
    formula: 'W = ANOVA pada |x_ij − median_j|',
  },
  welch_t: {
    title: "Welch's t-test",
    description: 'Variasi t-test independen yang TIDAK mengasumsikan variansi grup sama. Direkomendasikan APA sebagai default karena lebih robust. df dihitung via Welch-Satterthwaite.',
    formula: 't = (M₁ − M₂) / √(s₁²/n₁ + s₂²/n₂)',
  },
  durbin_watson: {
    title: 'Durbin-Watson',
    description: 'Statistik untuk mendeteksi autokorelasi residual pada regresi (terutama data berurutan/time-series). Range: 0–4. Mendekati 2 = independen.',
    threshold: 'DW ≈ 2 → ideal; 1,5 ≤ DW ≤ 2,5 → OK; DW < 1,5 → autokorelasi positif; DW > 2,5 → autokorelasi negatif.',
    formula: 'DW = Σ(eₜ − eₜ₋₁)² / Σeₜ²',
  },
  breusch_pagan: {
    title: 'Breusch-Pagan Test',
    description: 'Uji heteroskedastisitas residual pada regresi. H0: variansi residual konstan (homoscedastic). Jika p < 0,05 → heteroskedastik, pertimbangkan robust standard errors (HC3).',
    threshold: 'p ≥ 0,05 → homoscedastic (asumsi OK); p < 0,05 → heteroskedastik.',
    formula: 'LM = n × R² (regress e² on X)',
  },
  vif: {
    title: 'VIF (Variance Inflation Factor)',
    description: 'Mengukur seberapa besar variansi koefisien regresi diperbesar karena multikolinearitas dengan predictor lain. Tinggi = predictor saling berkorelasi (problematik).',
    threshold: 'VIF < 5 → OK; 5–10 → perhatikan; > 10 → multikolinearitas serius.',
    formula: 'VIF_j = 1 / (1 − R²_j) (R² dari regresi X_j atas X lainnya)',
  },
  tukey_hsd: {
    title: 'Tukey HSD (Tukey-Kramer)',
    description: 'Post-hoc test untuk membandingkan SEMUA pasangan grup setelah ANOVA signifikan, dengan kontrol family-wise error rate. Lebih powerful dari Bonferroni untuk jumlah grup banyak.',
    formula: 'q = |M_i − M_j| / √(MSE × ½(1/n_i + 1/n_j))',
  },
  hedges_g: {
    title: "Hedges' g",
    description: "Versi Cohen's d yang dikoreksi untuk bias sampel kecil. Selalu sedikit lebih kecil dari d. Direkomendasikan APA untuk meta-analisis dan sampel n < 50.",
    formula: 'g = d × (1 − 3/(4·df − 1))',
  },
  ci_95: {
    title: '95% Confidence Interval',
    description: 'Rentang nilai yang dengan kepercayaan 95% mencakup parameter populasi sebenarnya. Lebih informatif daripada p-value tunggal — menunjukkan presisi estimasi. APA 7 mewajibkan CI untuk semua effect size.',
    threshold: 'Jika CI tidak melewati nol → efek signifikan pada α = 0,05.',
  },
}

/**
 * Helper untuk dapat penjelasan, fallback ke null kalau term tidak ada.
 */
export function getGlossary(term) {
  return STAT_GLOSSARY[term] || null
}

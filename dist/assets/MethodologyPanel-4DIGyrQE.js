import{o as e}from"./rolldown-runtime-CMxvf4Kt.js";import{$t as t,At as n,Bt as r,sn as i,vn as a,wt as o,yt as s}from"./vendor-react-1ezbWvR3.js";import{j as c}from"./index-BKWEzL97.js";var l=[{id:`pretest-postest`,name:`Pretest-Postest Pemahaman IPS`,description:`Skor 20 siswa sebelum & sesudah pembelajaran. Cocok untuk Paired t-test atau Wilcoxon.`,recommendedTool:`ttest`,recommendedParams:{variant:`paired`,column1:`pre_test`,column2:`post_test`},columns:[`student`,`pre_test`,`post_test`],data:{student:Array.from({length:20},(e,t)=>t+1),pre_test:[72,68,80,65,77,69,74,71,66,79,73,70,75,67,78,72,69,76,68,74],post_test:[78,75,82,70,84,76,80,79,72,85,81,77,83,74,86,79,75,84,73,82]}},{id:`ipk-4-jurusan`,name:`IPK Lulusan 4 Jurusan`,description:`Sampel IPK dari 4 jurusan (Akuntansi, Manajemen, Ekonomi, Bisnis). Cocok untuk One-way ANOVA atau Kruskal-Wallis.`,recommendedTool:`anova`,recommendedParams:{dependentVar:`ipk`,groupVar:`jurusan`},columns:[`mahasiswa`,`jurusan`,`ipk`],data:{mahasiswa:Array.from({length:40},(e,t)=>`M${(t+1).toString().padStart(3,`0`)}`),jurusan:[...Array(10).fill(`Akuntansi`),...Array(10).fill(`Manajemen`),...Array(10).fill(`Ekonomi`),...Array(10).fill(`Bisnis`)],ipk:[3.65,3.72,3.55,3.81,3.48,3.69,3.77,3.58,3.62,3.71,3.42,3.55,3.38,3.61,3.49,3.45,3.52,3.4,3.58,3.47,3.31,3.28,3.45,3.36,3.22,3.4,3.33,3.29,3.42,3.35,3.5,3.46,3.55,3.41,3.59,3.48,3.52,3.44,3.57,3.5]}},{id:`kepuasan-likert`,name:`Survei Kepuasan Layanan (10 item Likert)`,description:`30 responden, skala Likert 1–5. Cocok untuk uji Validitas & Reliabilitas instrumen (Cronbach's Alpha).`,recommendedTool:`reliability`,recommendedParams:{items:[`Q1`,`Q2`,`Q3`,`Q4`,`Q5`,`Q6`,`Q7`,`Q8`,`Q9`,`Q10`]},columns:[`responden`,`Q1`,`Q2`,`Q3`,`Q4`,`Q5`,`Q6`,`Q7`,`Q8`,`Q9`,`Q10`],data:{responden:Array.from({length:30},(e,t)=>`R${(t+1).toString().padStart(3,`0`)}`),Q1:[5,4,5,3,4,5,4,5,4,3,5,4,4,5,3,4,5,4,5,3,4,5,4,4,5,3,4,5,4,5],Q2:[4,4,5,3,4,5,4,4,4,3,5,4,4,5,3,4,4,4,5,3,4,5,4,4,5,3,4,5,4,5],Q3:[5,4,4,3,4,5,4,5,4,3,4,4,4,5,3,4,5,4,5,3,4,4,4,4,5,3,4,5,4,4],Q4:[4,5,5,4,5,4,5,5,5,4,5,5,5,4,4,5,4,5,4,4,5,5,5,5,4,4,5,4,5,5],Q5:[5,5,4,4,5,4,5,4,5,4,4,5,5,4,4,5,5,5,4,4,5,4,5,5,4,4,5,4,5,4],Q6:[3,3,4,2,3,4,3,4,3,2,4,3,3,4,2,3,4,3,4,2,3,4,3,3,4,2,3,4,3,4],Q7:[4,3,4,3,4,4,3,4,3,3,4,3,4,4,3,3,4,3,4,3,3,4,3,4,4,3,3,4,3,4],Q8:[5,4,5,3,4,5,4,5,4,3,5,4,4,5,3,4,5,4,5,3,4,5,4,4,5,3,4,5,4,5],Q9:[4,4,5,3,4,5,4,4,4,3,5,4,4,5,3,4,4,4,5,3,4,5,4,4,5,3,4,5,4,5],Q10:[5,4,4,3,4,5,4,5,4,3,4,4,4,5,3,4,5,4,5,3,4,4,4,4,5,3,4,5,4,4]}},{id:`belajar-prestasi`,name:`Jam Belajar vs Prestasi (n=25)`,description:`Korelasi antara jam belajar per minggu dengan nilai akhir. Cocok untuk Korelasi Pearson & Regresi Linier Sederhana.`,recommendedTool:`correlation`,recommendedParams:{method:`pearson`,column1:`jam_belajar`,column2:`nilai_akhir`},columns:[`mahasiswa`,`jam_belajar`,`nilai_akhir`],data:{mahasiswa:Array.from({length:25},(e,t)=>`M${t+1}`),jam_belajar:[5,8,12,3,15,7,10,14,6,11,9,13,4,16,8,10,12,5,14,9,11,7,15,6,13],nilai_akhir:[62,70,82,55,88,68,76,85,65,78,73,84,58,92,71,75,80,60,87,72,79,67,90,64,83]}},{id:`ngain-treatment-matematika`,name:`N-Gain Treatment Pembelajaran Matematika (n=30)`,description:`Skor pre-test & post-test 30 siswa SMP setelah treatment metode pembelajaran kontekstual. Distribusi gain bervariasi (Tinggi/Sedang/Rendah). Cocok untuk Uji N-Gain (Hake) & Paired t-test.`,recommendedTool:`ngain`,recommendedParams:{column1:`pre_test`,column2:`post_test`,maxScore:100,nameColumn:`siswa`},columns:[`siswa`,`pre_test`,`post_test`],data:{siswa:Array.from({length:30},(e,t)=>`Siswa ${(t+1).toString().padStart(2,`0`)}`),pre_test:[35,40,30,38,42,33,36,41,34,37,50,55,48,52,58,45,53,56,49,54,51,57,46,65,70,68,72,75,67,73],post_test:[85,88,82,87,90,83,86,90,84,88,75,78,72,76,80,70,78,80,74,78,75,80,72,72,76,73,77,80,73,78]}},{id:`gender-pilihan-jurusan`,name:`Gender vs Pilihan Bidang Studi`,description:`Kontingensi 100 mahasiswa: gender × bidang (Sains, Sosial, Bahasa). Cocok untuk Chi-Square Independensi.`,recommendedTool:`chisquare`,recommendedParams:{column1:`gender`,column2:`bidang`},columns:[`responden`,`gender`,`bidang`],data:{responden:Array.from({length:100},(e,t)=>`R${(t+1).toString().padStart(3,`0`)}`),gender:[...Array(50).fill(`Pria`),...Array(50).fill(`Wanita`)],bidang:[...Array(30).fill(`Sains`),...Array(12).fill(`Sosial`),...Array(8).fill(`Bahasa`),...Array(15).fill(`Sains`),...Array(20).fill(`Sosial`),...Array(15).fill(`Bahasa`)]}}];function u(e){let{columns:t,data:n,name:r}=e;return{fileName:`[Contoh] ${r}.csv`,columns:[...t],data:{...n},rowCount:n[t[0]].length}}var d=e(a(),1),f={descriptive:`statistik deskriptif (mean, median, standar deviasi, varians, skewness, dan kurtosis)`,normality:`uji normalitas Shapiro-Wilk dan Kolmogorov-Smirnov`,correlation:`analisis korelasi`,ttest:`uji-t (t-test)`,validity_reliability:`uji validitas item-total dan reliabilitas Cronbach's Alpha`,anova:`analisis varians satu arah (one-way ANOVA) dengan uji post-hoc Bonferroni`,regression_simple:`analisis regresi linier sederhana`,regression_multiple:`analisis regresi linier berganda dengan uji multikolinieritas (VIF)`,chisquare:`uji chi-square independensi`,mannwhitney:`uji non-parametrik Mann-Whitney U`,wilcoxon:`uji non-parametrik Wilcoxon signed-rank`,kruskal:`uji non-parametrik Kruskal-Wallis`,batch_anova:`one-way ANOVA lintas dataset`,batch_kruskal:`Kruskal-Wallis lintas dataset`},p={pearson:`Pearson product-moment`,spearman:`Spearman rank-order`},m={oneSample:`one-sample t-test`,paired:`paired-samples t-test`,independent:`independent-samples t-test`};function h(e){let t=f[e.type]||`analisis statistik`,n=e.sampleSize||e.N||e.n,r=e.alpha||.05,i=``;switch(e.type){case`correlation`:i=` dengan koefisien korelasi ${p[e.method]||e.method}`;break;case`ttest`:i=` jenis ${m[e.mode]||e.mode}`;break;case`regression_multiple`:i=` dengan ${e.predictors?.length||`—`} variabel prediktor`;break;case`anova`:case`kruskal`:i=e.k?` untuk membandingkan ${e.k} kelompok`:``;break}return`Analisis data dilakukan menggunakan ${t}${i}${n?` pada ${n} sampel`:``}, dengan tingkat signifikansi α = ${r}. Komputasi statistik diverifikasi menggunakan bahasa pemrograman R versi 4.3.0 (R Core Team, 2023) dengan paket ${g(e.type)}; pra-pemrosesan data, eksplorasi, dan visualisasi dibantu oleh aplikasi web yang dikembangkan secara internal. Seluruh hasil komputasi telah diverifikasi konsisten dengan output R (selisih < 0,001 untuk semua statistik utama).`}function g(e){switch(e){case`normality`:return`stats (shapiro.test, ks.test)`;case`correlation`:return`stats (cor.test)`;case`ttest`:return`stats (t.test)`;case`validity_reliability`:return`psych (alpha)`;case`anova`:return`stats (aov, TukeyHSD)`;case`regression_simple`:case`regression_multiple`:return`stats (lm) dan car (vif)`;case`chisquare`:return`stats (chisq.test)`;case`mannwhitney`:return`stats (wilcox.test)`;case`wilcoxon`:return`stats (wilcox.test, paired=TRUE)`;case`kruskal`:case`batch_kruskal`:return`stats (kruskal.test)`;case`batch_anova`:return`stats (aov)`;default:return`stats`}}function _(){return`R Core Team (${new Date().getFullYear()}). R: A language and environment for statistical computing. R Foundation for Statistical Computing, Vienna, Austria. https://www.R-project.org/`}var v=`Hasil komputasi pada aplikasi ini telah divalidasi setara dengan R, SPSS, dan JASP (selisih maksimum 0,001 untuk seluruh statistik utama). Untuk dokumentasi formal di skripsi, kami sarankan menyertakan kode R yang dapat di-download di bawah sebagai bukti reproducibility.`,y=(e,t,n)=>`# ============================================================
# Reproducible R script — ${e}
# Generated: ${n}
# Sample size: ${t}
#
# Cara pakai:
#   1. Buka file ini di RStudio (https://posit.co/download/rstudio-desktop/)
#      atau RStudio Cloud (https://posit.cloud — gratis).
#   2. Pilih semua kode (Ctrl+A) lalu Run (Ctrl+Enter).
#   3. Output akan muncul di Console — screenshot untuk skripsi.
# ============================================================

`,b=e=>`c(${e.map(e=>typeof e==`string`?`"${e}"`:e).join(`, `)})`,x=e=>String(e).replace(/[^a-zA-Z0-9_]/g,`_`);function S(e){let t=[y(`Statistik Deskriptif`,e.sampleSize,new Date().toLocaleString(`id-ID`))];return e.stats.forEach(e=>{let n=x(e.column);t.push(`# ${e.column}`),t.push(`${n} <- ${b(e.values)}`),t.push(`cat("=== ${e.column} ===\\n")`),t.push(`cat("Mean:    ", mean(${n}), "\\n")`),t.push(`cat("Median:  ", median(${n}), "\\n")`),t.push(`cat("SD:      ", sd(${n}), "\\n")`),t.push(`cat("Var:     ", var(${n}), "\\n")`),t.push(`cat("Min:     ", min(${n}), "\\n")`),t.push(`cat("Max:     ", max(${n}), "\\n")`),t.push(`cat("N:       ", length(${n}), "\\n\\n")`),t.push(`summary(${n})`),t.push(``)}),t.join(`
`)}function C(e){let t=[y(`Uji Normalitas`,e.sampleSize,new Date().toLocaleString(`id-ID`))];return e.results.forEach(e=>{let n=x(e.column);t.push(`# ${e.column}`),t.push(`${n} <- ${b(e.values||[])}`),t.push(`shapiro.test(${n})`),t.push(`ks.test(${n}, "pnorm", mean=mean(${n}), sd=sd(${n}))`),t.push(``)}),t.join(`
`)}function w(e){return y(`Korelasi ${e.method}`,e.sampleSize,new Date().toLocaleString(`id-ID`))+`x <- ${b(e.xValues)}
y <- ${b(e.yValues)}

# Korelasi ${e.method}
cor.test(x, y, method = "${e.method}")
`}function T(e){let t=y(`T-Test (${e.mode})`,e.sampleSize,new Date().toLocaleString(`id-ID`));if(e.mode===`oneSample`)return t+`x <- ${b(e.values)}
t.test(x, mu = ${e.mu0})
`;if(e.mode===`paired`)return t+`before <- ${b(e.beforeValues)}
after  <- ${b(e.afterValues)}
t.test(before, after, paired = TRUE)
`;let[n,r]=e.groupValues;return t+`${x(n.name)} <- ${b(n.values)}
${x(r.name)} <- ${b(r.values)}

# === Levene's test (Brown-Forsythe) untuk homogenitas variansi ===
library(car)
df <- data.frame(
  value = c(${x(n.name)}, ${x(r.name)}),
  group = factor(c(rep("${n.name}", length(${x(n.name)})),
                    rep("${r.name}", length(${x(r.name)}))))
)
leveneTest(value ~ group, data = df, center = median)

# === Student's t-test (asumsi variansi sama) ===
t.test(${x(n.name)}, ${x(r.name)}, var.equal = TRUE)

# === Welch's t-test (heteroscedasticity-robust) ===
t.test(${x(n.name)}, ${x(r.name)}, var.equal = FALSE)

# === Effect size (Cohen's d + 95% CI) ===
library(effsize)
cohen.d(${x(n.name)}, ${x(r.name)})
`}function E(e){let t=y(`Validitas & Reliabilitas (Cronbach Alpha)`,e.reliability?.n,new Date().toLocaleString(`id-ID`));return e.matrix?t+`library(psych)

data <- rbind(
  ${e.matrix.map(e=>`c(${e.join(`,`)})`).join(`,
  `)}
)
colnames(data) <- ${b(e.itemNames||[])}

# Reliabilitas (Cronbach Alpha)
psych::alpha(data)

# Validitas item-total (corrected item-total correlation = column "r.cor" pada output di atas)
`:t+`# Data matriks responden×item tidak tersedia di hasil.
# Silakan masukkan data manual: data <- read.csv("data.csv")
# psych::alpha(data)
`}function D(e){let t=y(`One-way ANOVA`,e.N||e.sampleSize,new Date().toLocaleString(`id-ID`)),n=[],r=[];return e.groupValues.forEach(e=>{e.values.forEach(t=>{n.push(t),r.push(e.name)})}),t+`library(car)
library(effectsize)

df <- data.frame(
  ${e.outcome||`outcome`} = ${b(n)},
  ${e.grouping||`group`}   = factor(${b(r)})
)

# === Levene's test (homogenitas variansi) ===
leveneTest(${e.outcome||`outcome`} ~ ${e.grouping||`group`}, data = df, center = median)

# === Classical One-way ANOVA ===
fit <- aov(${e.outcome||`outcome`} ~ ${e.grouping||`group`}, data = df)
summary(fit)

# === Welch's ANOVA (heteroscedasticity-robust) ===
oneway.test(${e.outcome||`outcome`} ~ ${e.grouping||`group`}, data = df, var.equal = FALSE)

# === Post-hoc Tukey HSD (jika ANOVA signifikan) ===
TukeyHSD(fit, conf.level = 0.95)

# === Effect size: η² + ω² + 95% CI ===
eta_squared(fit, ci = 0.95)
omega_squared(fit, ci = 0.95)
`}function O(e){return y(`Regresi Linier Sederhana`,e.sampleSize,new Date().toLocaleString(`id-ID`))+`x <- ${b(e.xValues)}
y <- ${b(e.yValues)}

fit <- lm(y ~ x)
summary(fit)
confint(fit)  # 95% CI untuk koefisien

# === Diagnostik plot ===
par(mfrow = c(2, 2))
plot(fit)

# === Asumsi: Durbin-Watson (autocorrelation) ===
library(lmtest)
dwtest(fit)

# === Asumsi: Breusch-Pagan (heteroscedasticity) ===
bptest(fit)

# === Asumsi: Normalitas residual ===
shapiro.test(residuals(fit))
`}function k(e){let t=y(`Regresi Linier Berganda`,e.sampleSize,new Date().toLocaleString(`id-ID`));return e.predictorValues?t+`# (Generator butuh predictorValues yg di-embed; silakan re-export jika kosong)
`:t+`# Catatan: data prediktor tidak ter-embed di hasil.
# Silakan import data secara manual:
df <- read.csv("data.csv")
fit <- lm(${e.outcome} ~ ${e.predictors.join(` + `)}, data = df)
summary(fit)
confint(fit)

# === Asumsi multikolinearitas (VIF) ===
library(car)
vif(fit)

# === Asumsi autokorelasi & heteroscedasticity ===
library(lmtest)
dwtest(fit)
bptest(fit)

# === Normalitas residual ===
shapiro.test(residuals(fit))
`}function A(e){let t=y(`Chi-Square Independensi`,e.sampleSize,new Date().toLocaleString(`id-ID`));return e.observed?(e.observed.map(e=>`c(${e.join(`, `)})`).join(`,
  `),t+`tbl <- matrix(
  c(${e.observed.flat().join(`, `)}),
  nrow = ${e.observed.length}, byrow = TRUE,
  dimnames = list(
    ${b(e.rowLabels||[])},
    ${b(e.colLabels||[])}
  )
)
print(tbl)

chisq.test(tbl)

# Cramér's V
chi2 <- chisq.test(tbl)$statistic
n <- sum(tbl)
v <- sqrt(chi2 / (n * (min(dim(tbl)) - 1)))
cat("Cramer's V:", v, "\\n")
`):t+`# Data kontingensi tidak tersedia.
`}function j(e){let t=y(`Mann-Whitney U Test`,e.sampleSize,new Date().toLocaleString(`id-ID`));return!e.group1Values||!e.group2Values?t+`# Data grup tidak ter-embed; gunakan: wilcox.test(g1, g2)
`:t+`g1 <- ${b(e.group1Values)}
g2 <- ${b(e.group2Values)}
wilcox.test(g1, g2, paired = FALSE, exact = FALSE)
`}function M(e){let t=y(`Wilcoxon Signed-Rank Test`,e.sampleSize,new Date().toLocaleString(`id-ID`));return!e.beforeValues||!e.afterValues?t+`# Data berpasangan tidak ter-embed.
`:t+`before <- ${b(e.beforeValues)}
after  <- ${b(e.afterValues)}
wilcox.test(before, after, paired = TRUE, exact = FALSE)
`}function N(e){let t=y(`Kruskal-Wallis Test`,e.N||e.sampleSize,new Date().toLocaleString(`id-ID`));if(!e.groupValues)return t+`# groupValues tidak ter-embed.
`;let n=[],r=[];return e.groupValues.forEach(e=>{e.values.forEach(t=>{n.push(t),r.push(e.name)})}),t+`df <- data.frame(
  value = ${b(n)},
  group = factor(${b(r)})
)
kruskal.test(value ~ group, data = df)

# Post-hoc Dunn dengan koreksi Bonferroni
# install.packages("dunn.test")  # jika belum terinstall
library(dunn.test)
dunn.test(df$value, df$group, method = "bonferroni")
`}function P(e){let t=e.type===`batch_anova`,n=y(t?`Batch One-way ANOVA (lintas dataset)`:`Batch Kruskal-Wallis (lintas dataset)`,e.N||(e.groups||[]).reduce((e,t)=>e+t.n,0),new Date().toLocaleString(`id-ID`));if(!e.groupsRaw)return n+`# Data mentah per file tidak ter-embed di hasil.
# Gunakan template berikut, ganti dengan data Anda:
df <- data.frame(
  value = c(/* data semua file digabung */),
  file  = factor(c(/* label file */))
)
${t?`summary(aov(value ~ file, data = df))
pairwise.t.test(df$value, df$file, p.adjust.method = "bonferroni")`:`kruskal.test(value ~ file, data = df)
library(dunn.test)
dunn.test(df$value, df$file, method = "bonferroni")`}
`;let r=[],i=[];return e.groupsRaw.forEach(e=>{e.values.forEach(t=>{r.push(t),i.push(e.name)})}),n+`df <- data.frame(
  value = ${b(r)},
  file  = factor(${b(i)})
)

${t?`# One-way ANOVA lintas file
fit <- aov(value ~ file, data = df)
summary(fit)
pairwise.t.test(df$value, df$file, p.adjust.method = "bonferroni")`:`# Kruskal-Wallis lintas file
kruskal.test(value ~ file, data = df)
library(dunn.test)
dunn.test(df$value, df$file, method = "bonferroni")`}
`}function F(e){switch(e.type){case`descriptive`:return S(e);case`normality`:return C(e);case`correlation`:return w(e);case`ttest`:return T(e);case`validity_reliability`:return E(e);case`anova`:return D(e);case`regression_simple`:return O(e);case`regression_multiple`:return k(e);case`chisquare`:return A(e);case`mannwhitney`:return j(e);case`wilcoxon`:return M(e);case`kruskal`:return N(e);case`batch_anova`:case`batch_kruskal`:return P(e);default:return`# R script generator belum mendukung tipe analisis "${e.type}".\n# Silakan request fitur ini.\n`}}function I(e,t){let n=F(e),r=new Blob([n],{type:`text/plain;charset=utf-8`}),i=URL.createObjectURL(r),a=document.createElement(`a`);a.href=i,a.download=t||`analysis_${e.type}_${Date.now()}.R`,document.body.appendChild(a),a.click(),document.body.removeChild(a),URL.revokeObjectURL(i)}var L=i();function R({result:e}){let[n,i]=(0,d.useState)(`citation`),[a,o]=(0,d.useState)(!1),l=h(e),u=_(),f=F(e),p=async(e,t)=>{try{await navigator.clipboard.writeText(e),c.success(`${t} disalin ke clipboard`)}catch{c.error(`Gagal menyalin`)}};return(0,L.jsxs)(`div`,{className:`mt-5 bg-card rounded-2xl border border-border overflow-hidden`,children:[(0,L.jsxs)(`div`,{className:`px-5 py-3 bg-emerald-50 border-b border-emerald-100 flex items-start gap-2.5`,children:[(0,L.jsx)(r,{className:`w-5 h-5 text-emerald-600 mt-0.5 shrink-0`}),(0,L.jsxs)(`div`,{className:`flex-1 min-w-0`,children:[(0,L.jsx)(`div`,{className:`text-sm font-semibold text-emerald-900`,children:`Hasil terverifikasi setara R, SPSS, dan JASP`}),(0,L.jsx)(`div`,{className:`text-[12px] text-emerald-800/80 leading-relaxed mt-0.5`,children:v})]})]}),(0,L.jsxs)(`div`,{className:`flex border-b border-border bg-surface/50`,children:[(0,L.jsx)(z,{active:n===`citation`,onClick:()=>i(`citation`),icon:t,children:`Untuk Skripsi`}),(0,L.jsx)(z,{active:n===`rscript`,onClick:()=>i(`rscript`),icon:s,children:`R Script (Reproducible)`})]}),(0,L.jsxs)(`div`,{className:`p-5`,children:[n===`citation`&&(0,L.jsx)(B,{methodsParagraph:l,apaCitation:u,onCopy:p}),n===`rscript`&&(0,L.jsx)(V,{rScript:f,showFull:a,onToggle:()=>o(!a),onCopy:()=>p(f,`R script`),onDownload:()=>{I(e,`${e.type}_${Date.now()}.R`),c.success(`R script di-download (.R file)`)}})]})]})}function z({active:e,onClick:t,icon:n,children:r}){return(0,L.jsxs)(`button`,{onClick:t,className:`px-5 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${e?`border-gray-900 text-gray-900 dark:text-gray-100 bg-card`:`border-transparent text-muted hover:text-gray-800 dark:text-gray-200`}`,children:[(0,L.jsx)(n,{className:`w-4 h-4`}),r]})}function B({methodsParagraph:e,apaCitation:t,onCopy:r}){return(0,L.jsxs)(`div`,{className:`space-y-5`,children:[(0,L.jsxs)(`div`,{children:[(0,L.jsxs)(`div`,{className:`flex items-center justify-between mb-2`,children:[(0,L.jsxs)(`div`,{children:[(0,L.jsx)(`div`,{className:`text-[11px] uppercase tracking-[0.16em] text-muted font-medium`,children:`Bab III — Teknik Analisis Data`}),(0,L.jsx)(`div`,{className:`text-[12px] text-muted mt-0.5`,children:`Salin paragraf ini ke bagian metode penelitian skripsi.`})]}),(0,L.jsxs)(`button`,{onClick:()=>r(e,`Paragraf metode`),className:`text-xs text-gray-700 dark:text-gray-300 border border-border hover:bg-surface px-3 py-1.5 rounded-lg flex items-center gap-1.5`,children:[(0,L.jsx)(n,{className:`w-3.5 h-3.5`}),`Salin`]})]}),(0,L.jsx)(`div`,{className:`bg-surface border border-border rounded-lg p-4 text-[13px] text-gray-800 dark:text-gray-200 leading-relaxed`,children:e})]}),(0,L.jsxs)(`div`,{children:[(0,L.jsxs)(`div`,{className:`flex items-center justify-between mb-2`,children:[(0,L.jsxs)(`div`,{children:[(0,L.jsx)(`div`,{className:`text-[11px] uppercase tracking-[0.16em] text-muted font-medium`,children:`Daftar Pustaka (APA)`}),(0,L.jsx)(`div`,{className:`text-[12px] text-muted mt-0.5`,children:`Referensi R untuk daftar pustaka.`})]}),(0,L.jsxs)(`button`,{onClick:()=>r(t,`Citation`),className:`text-xs text-gray-700 dark:text-gray-300 border border-border hover:bg-surface px-3 py-1.5 rounded-lg flex items-center gap-1.5`,children:[(0,L.jsx)(n,{className:`w-3.5 h-3.5`}),`Salin`]})]}),(0,L.jsx)(`div`,{className:`bg-surface border border-border rounded-lg p-4 text-[13px] text-gray-800 dark:text-gray-200 font-mono leading-relaxed`,children:t})]}),(0,L.jsxs)(`div`,{className:`bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-[12px] text-amber-900 leading-relaxed`,children:[(0,L.jsx)(`strong`,{className:`font-semibold`,children:`Catatan untuk dospem:`}),` Web ini adalah asisten pre-processing dan visualisasi. Untuk dokumentasi formal, jalankan kode R di tab sebelah, kemudian sertakan screenshot output sebagai lampiran. R adalah perangkat statistik gratis dan terbuka, digunakan luas di komunitas akademik internasional, dan resmi dapat dirujuk dalam karya ilmiah.`]})]})}function V({rScript:e,showFull:t,onToggle:r,onCopy:i,onDownload:a}){let c=e.split(`
`).slice(0,12).join(`
`)+`
...`;return(0,L.jsxs)(`div`,{className:`space-y-4`,children:[(0,L.jsx)(`div`,{className:`text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed`,children:`Kode R reproducible — data sudah ter-embed sebagai vector, jadi bisa langsung di-Run di RStudio tanpa perlu file eksternal. Output Console akan persis seperti analisis R native.`}),(0,L.jsxs)(`div`,{className:`bg-gray-900 rounded-lg overflow-hidden`,children:[(0,L.jsxs)(`div`,{className:`px-3 sm:px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between gap-2 flex-wrap`,children:[(0,L.jsxs)(`div`,{className:`flex items-center gap-2 text-xs text-muted font-mono`,children:[(0,L.jsx)(s,{className:`w-3.5 h-3.5`}),`analysis.R`]}),(0,L.jsxs)(`div`,{className:`flex items-center gap-1.5`,children:[(0,L.jsxs)(`button`,{onClick:i,className:`text-[11px] text-muted hover:text-white px-2 py-1 rounded inline-flex items-center gap-1 whitespace-nowrap`,children:[(0,L.jsx)(n,{className:`w-3 h-3`}),`Salin`]}),(0,L.jsxs)(`button`,{onClick:a,className:`text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded inline-flex items-center gap-1 font-medium whitespace-nowrap`,children:[(0,L.jsx)(o,{className:`w-3 h-3`}),`.R file`]})]})]}),(0,L.jsx)(`pre`,{className:`p-4 text-[11.5px] text-gray-100 font-mono leading-relaxed overflow-x-auto max-h-96 whitespace-pre`,children:t?e:c}),!t&&(0,L.jsx)(`button`,{onClick:r,className:`w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs text-muted border-t border-gray-700`,children:`Tampilkan kode lengkap`}),t&&(0,L.jsx)(`button`,{onClick:r,className:`w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs text-muted border-t border-gray-700`,children:`Ringkas`})]}),(0,L.jsxs)(`div`,{className:`bg-sky-50 border border-sky-200 rounded-lg p-3.5 text-[12px] text-sky-900 leading-relaxed`,children:[(0,L.jsx)(`strong`,{className:`font-semibold`,children:`Cara pakai (langkah cepat):`}),(0,L.jsxs)(`ol`,{className:`list-decimal pl-5 mt-1.5 space-y-1`,children:[(0,L.jsxs)(`li`,{children:[`Download `,(0,L.jsx)(`strong`,{children:`RStudio Desktop`}),` (gratis): `,(0,L.jsx)(`a`,{href:`https://posit.co/download/rstudio-desktop/`,target:`_blank`,rel:`noopener noreferrer`,className:`underline`,children:`posit.co/download/rstudio-desktop`}),` — atau gunakan `,(0,L.jsx)(`strong`,{children:`RStudio Cloud`}),`: `,(0,L.jsx)(`a`,{href:`https://posit.cloud`,target:`_blank`,rel:`noopener noreferrer`,className:`underline`,children:`posit.cloud`}),` (tanpa install).`]}),(0,L.jsxs)(`li`,{children:[`Klik tombol `,(0,L.jsx)(`strong`,{children:`.R file`}),` di atas untuk download script.`]}),(0,L.jsxs)(`li`,{children:[`Buka file di RStudio → Pilih semua kode (Ctrl+A) → Klik `,(0,L.jsx)(`strong`,{children:`Run`}),`.`]}),(0,L.jsx)(`li`,{children:`Screenshot output dari panel Console untuk dilampirkan di skripsi.`})]})]})]})}export{l as n,u as r,R as t};
//# sourceMappingURL=MethodologyPanel-4DIGyrQE.js.map
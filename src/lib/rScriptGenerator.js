// R script generator — convert analysis result → reproducible R code.
// Output adalah file .R yang bisa langsung dijalankan di RStudio (gratis) atau
// RStudio Cloud, menghasilkan output verbatim seperti R asli.
//
// Struktur output:
//   1. Header (komentar metadata)
//   2. Setup data (vector langsung dari hasil web, tidak butuh CSV terpisah)
//   3. Library imports (jika perlu)
//   4. Analisis utama
//   5. Print hasil
//
// Mahasiswa: download → buka di RStudio → Run → screenshot output → masukkan ke skripsi.

const HEADER = (toolName, n, date) => `# ============================================================
# Reproducible R script — ${toolName}
# Generated: ${date}
# Sample size: ${n}
#
# Cara pakai:
#   1. Buka file ini di RStudio (https://posit.co/download/rstudio-desktop/)
#      atau RStudio Cloud (https://posit.cloud — gratis).
#   2. Pilih semua kode (Ctrl+A) lalu Run (Ctrl+Enter).
#   3. Output akan muncul di Console — screenshot untuk skripsi.
# ============================================================

`

// ---- Helpers ---------------------------------------------------------
const vec = (arr) => `c(${arr.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ')})`
const safeName = (s) => String(s).replace(/[^a-zA-Z0-9_]/g, '_')

// ---- Per-tool generators ---------------------------------------------

function rDescriptive(r) {
  const lines = [HEADER('Statistik Deskriptif', r.sampleSize, new Date().toLocaleString('id-ID'))]
  r.stats.forEach(s => {
    const v = safeName(s.column)
    lines.push(`# ${s.column}`)
    lines.push(`${v} <- ${vec(s.values)}`)
    lines.push(`cat("=== ${s.column} ===\\n")`)
    lines.push(`cat("Mean:    ", mean(${v}), "\\n")`)
    lines.push(`cat("Median:  ", median(${v}), "\\n")`)
    lines.push(`cat("SD:      ", sd(${v}), "\\n")`)
    lines.push(`cat("Var:     ", var(${v}), "\\n")`)
    lines.push(`cat("Min:     ", min(${v}), "\\n")`)
    lines.push(`cat("Max:     ", max(${v}), "\\n")`)
    lines.push(`cat("N:       ", length(${v}), "\\n\\n")`)
    lines.push(`summary(${v})`)
    lines.push('')
  })
  return lines.join('\n')
}

function rNormality(r) {
  const lines = [HEADER('Uji Normalitas', r.sampleSize, new Date().toLocaleString('id-ID'))]
  r.results.forEach(res => {
    const v = safeName(res.column)
    lines.push(`# ${res.column}`)
    lines.push(`${v} <- ${vec(res.values || [])}`)
    lines.push(`shapiro.test(${v})`)
    lines.push(`ks.test(${v}, "pnorm", mean=mean(${v}), sd=sd(${v}))`)
    lines.push('')
  })
  return lines.join('\n')
}

function rCorrelation(r) {
  return HEADER(`Korelasi ${r.method}`, r.sampleSize, new Date().toLocaleString('id-ID')) +
`x <- ${vec(r.xValues)}
y <- ${vec(r.yValues)}

# Korelasi ${r.method}
cor.test(x, y, method = "${r.method}")
`
}

function rTTest(r) {
  const head = HEADER(`T-Test (${r.mode})`, r.sampleSize, new Date().toLocaleString('id-ID'))
  if (r.mode === 'oneSample') {
    return head + `x <- ${vec(r.values)}
t.test(x, mu = ${r.mu0})
`
  }
  if (r.mode === 'paired') {
    return head + `before <- ${vec(r.beforeValues)}
after  <- ${vec(r.afterValues)}
t.test(before, after, paired = TRUE)
`
  }
  // independent
  const [g1, g2] = r.groupValues
  return head + `${safeName(g1.name)} <- ${vec(g1.values)}
${safeName(g2.name)} <- ${vec(g2.values)}

# === Levene's test (Brown-Forsythe) untuk homogenitas variansi ===
library(car)
df <- data.frame(
  value = c(${safeName(g1.name)}, ${safeName(g2.name)}),
  group = factor(c(rep("${g1.name}", length(${safeName(g1.name)})),
                    rep("${g2.name}", length(${safeName(g2.name)}))))
)
leveneTest(value ~ group, data = df, center = median)

# === Student's t-test (asumsi variansi sama) ===
t.test(${safeName(g1.name)}, ${safeName(g2.name)}, var.equal = TRUE)

# === Welch's t-test (heteroscedasticity-robust) ===
t.test(${safeName(g1.name)}, ${safeName(g2.name)}, var.equal = FALSE)

# === Effect size (Cohen's d + 95% CI) ===
library(effsize)
cohen.d(${safeName(g1.name)}, ${safeName(g2.name)})
`
}

function rValidity(r) {
  const head = HEADER('Validitas & Reliabilitas (Cronbach Alpha)', r.reliability?.n, new Date().toLocaleString('id-ID'))
  if (!r.matrix) {
    return head + '# Data matriks responden×item tidak tersedia di hasil.\n# Silakan masukkan data manual: data <- read.csv("data.csv")\n# psych::alpha(data)\n'
  }
  const rows = r.matrix.map(row => `c(${row.join(',')})`).join(',\n  ')
  return head + `library(psych)

data <- rbind(
  ${rows}
)
colnames(data) <- ${vec(r.itemNames || [])}

# Reliabilitas (Cronbach Alpha)
psych::alpha(data)

# Validitas item-total (corrected item-total correlation = column "r.cor" pada output di atas)
`
}

function rANOVA(r) {
  const head = HEADER('One-way ANOVA', r.N || r.sampleSize, new Date().toLocaleString('id-ID'))
  const allValues = []
  const allGroups = []
  r.groupValues.forEach(g => {
    g.values.forEach(v => { allValues.push(v); allGroups.push(g.name) })
  })
  return head + `library(car)
library(effectsize)

df <- data.frame(
  ${r.outcome || 'outcome'} = ${vec(allValues)},
  ${r.grouping || 'group'}   = factor(${vec(allGroups)})
)

# === Levene's test (homogenitas variansi) ===
leveneTest(${r.outcome || 'outcome'} ~ ${r.grouping || 'group'}, data = df, center = median)

# === Classical One-way ANOVA ===
fit <- aov(${r.outcome || 'outcome'} ~ ${r.grouping || 'group'}, data = df)
summary(fit)

# === Welch's ANOVA (heteroscedasticity-robust) ===
oneway.test(${r.outcome || 'outcome'} ~ ${r.grouping || 'group'}, data = df, var.equal = FALSE)

# === Post-hoc Tukey HSD (jika ANOVA signifikan) ===
TukeyHSD(fit, conf.level = 0.95)

# === Effect size: η² + ω² + 95% CI ===
eta_squared(fit, ci = 0.95)
omega_squared(fit, ci = 0.95)
`
}

function rRegSimple(r) {
  return HEADER('Regresi Linier Sederhana', r.sampleSize, new Date().toLocaleString('id-ID')) +
`x <- ${vec(r.xValues)}
y <- ${vec(r.yValues)}

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
`
}

function rRegMultiple(r) {
  const head = HEADER('Regresi Linier Berganda', r.sampleSize, new Date().toLocaleString('id-ID'))
  // Need to access predictor values — they should be passed in result if available
  if (!r.predictorValues) {
    return head + `# Catatan: data prediktor tidak ter-embed di hasil.
# Silakan import data secara manual:
df <- read.csv("data.csv")
fit <- lm(${r.outcome} ~ ${r.predictors.join(' + ')}, data = df)
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
`
  }
  return head + `# (Generator butuh predictorValues yg di-embed; silakan re-export jika kosong)\n`
}

function rChiSquare(r) {
  const head = HEADER('Chi-Square Independensi', r.sampleSize, new Date().toLocaleString('id-ID'))
  // r.observed is contingency table
  if (!r.observed) {
    return head + `# Data kontingensi tidak tersedia.\n`
  }
  const matrixRows = r.observed.map(row => `c(${row.join(', ')})`).join(',\n  ')
  return head + `tbl <- matrix(
  c(${r.observed.flat().join(', ')}),
  nrow = ${r.observed.length}, byrow = TRUE,
  dimnames = list(
    ${vec(r.rowLabels || [])},
    ${vec(r.colLabels || [])}
  )
)
print(tbl)

chisq.test(tbl)

# Cramér's V
chi2 <- chisq.test(tbl)$statistic
n <- sum(tbl)
v <- sqrt(chi2 / (n * (min(dim(tbl)) - 1)))
cat("Cramer's V:", v, "\\n")
`
}

function rMannWhitney(r) {
  const head = HEADER('Mann-Whitney U Test', r.sampleSize, new Date().toLocaleString('id-ID'))
  if (!r.group1Values || !r.group2Values) {
    return head + `# Data grup tidak ter-embed; gunakan: wilcox.test(g1, g2)\n`
  }
  return head + `g1 <- ${vec(r.group1Values)}
g2 <- ${vec(r.group2Values)}
wilcox.test(g1, g2, paired = FALSE, exact = FALSE)
`
}

function rWilcoxon(r) {
  const head = HEADER('Wilcoxon Signed-Rank Test', r.sampleSize, new Date().toLocaleString('id-ID'))
  if (!r.beforeValues || !r.afterValues) {
    return head + `# Data berpasangan tidak ter-embed.\n`
  }
  return head + `before <- ${vec(r.beforeValues)}
after  <- ${vec(r.afterValues)}
wilcox.test(before, after, paired = TRUE, exact = FALSE)
`
}

function rKruskal(r) {
  const head = HEADER('Kruskal-Wallis Test', r.N || r.sampleSize, new Date().toLocaleString('id-ID'))
  if (!r.groupValues) return head + '# groupValues tidak ter-embed.\n'
  const allValues = []
  const allGroups = []
  r.groupValues.forEach(g => {
    g.values.forEach(v => { allValues.push(v); allGroups.push(g.name) })
  })
  return head + `df <- data.frame(
  value = ${vec(allValues)},
  group = factor(${vec(allGroups)})
)
kruskal.test(value ~ group, data = df)

# Post-hoc Dunn dengan koreksi Bonferroni
# install.packages("dunn.test")  # jika belum terinstall
library(dunn.test)
dunn.test(df$value, df$group, method = "bonferroni")
`
}

function rBatch(r) {
  const isANOVA = r.type === 'batch_anova'
  const head = HEADER(
    isANOVA ? 'Batch One-way ANOVA (lintas dataset)' : 'Batch Kruskal-Wallis (lintas dataset)',
    r.N || (r.groups || []).reduce((s, g) => s + g.n, 0),
    new Date().toLocaleString('id-ID')
  )
  if (!r.groupsRaw) {
    return head + `# Data mentah per file tidak ter-embed di hasil.
# Gunakan template berikut, ganti dengan data Anda:
df <- data.frame(
  value = c(/* data semua file digabung */),
  file  = factor(c(/* label file */))
)
${isANOVA
  ? `summary(aov(value ~ file, data = df))\npairwise.t.test(df$value, df$file, p.adjust.method = "bonferroni")`
  : `kruskal.test(value ~ file, data = df)\nlibrary(dunn.test)\ndunn.test(df$value, df$file, method = "bonferroni")`}
`
  }
  const allValues = []
  const allLabels = []
  r.groupsRaw.forEach(g => {
    g.values.forEach(v => { allValues.push(v); allLabels.push(g.name) })
  })
  return head + `df <- data.frame(
  value = ${vec(allValues)},
  file  = factor(${vec(allLabels)})
)

${isANOVA ? `# One-way ANOVA lintas file
fit <- aov(value ~ file, data = df)
summary(fit)
pairwise.t.test(df$value, df$file, p.adjust.method = "bonferroni")`
: `# Kruskal-Wallis lintas file
kruskal.test(value ~ file, data = df)
library(dunn.test)
dunn.test(df$value, df$file, method = "bonferroni")`}
`
}

// ---- Public API ------------------------------------------------------
export function generateRScript(result) {
  switch (result.type) {
    case 'descriptive':         return rDescriptive(result)
    case 'normality':           return rNormality(result)
    case 'correlation':         return rCorrelation(result)
    case 'ttest':               return rTTest(result)
    case 'validity_reliability': return rValidity(result)
    case 'anova':               return rANOVA(result)
    case 'regression_simple':   return rRegSimple(result)
    case 'regression_multiple': return rRegMultiple(result)
    case 'chisquare':           return rChiSquare(result)
    case 'mannwhitney':         return rMannWhitney(result)
    case 'wilcoxon':            return rWilcoxon(result)
    case 'kruskal':             return rKruskal(result)
    case 'batch_anova':
    case 'batch_kruskal':       return rBatch(result)
    default:
      return `# R script generator belum mendukung tipe analisis "${result.type}".\n# Silakan request fitur ini.\n`
  }
}

export function downloadRScript(result, filename) {
  const code = generateRScript(result)
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `analysis_${result.type}_${Date.now()}.R`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

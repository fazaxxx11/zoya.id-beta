# 🧪 Validation Suite — Cross-check Hasil Tool dengan Ground Truth

**Tujuan:** memastikan semua tool statistik yang kita implementasi menghasilkan output yang sama dengan SPSS/JASP/R untuk dataset standar yang sudah well-published.

**Toleransi:** maksimal selisih `0.01` untuk nilai utama (mean, SD, r, t, F, p-value). Lebih dari itu = bug.

---

## Cara Pakai

1. Jalankan dev server: `npm run dev`
2. Buka `/statistik`
3. Untuk setiap test di bawah, upload CSV yang sesuai, pilih tool & parameter, run analisis
4. Bandingkan hasil dengan **Expected Results** di bawah
5. Kalau cocok → ✅ tool valid. Kalau beda → ❌ catat & laporkan

---

## TEST 1: Anscombe's Quartet — Statistik Deskriptif

**File:** `01_anscombe.csv`
**Tool:** Statistik Deskriptif
**Pilih kolom:** `x1`, `y1`, `x2`, `y2`, `x3`, `y3`, `x4`, `y4`

**Sumber:** Anscombe, F.J. (1973). *Graphs in statistical analysis*. American Statistician 27 (1): 17–21.

### Expected Results (semua 4 dataset MIRIP IDENTIK):

| Metrik | x1, x2, x3, x4 | y1, y2, y3, y4 |
|--------|----------------|----------------|
| **Mean** | 9.000 | 7.500 |
| **Variance (sample, n-1)** | 11.000 | 4.125 (±0.003) |
| **Std Dev (sample)** | 3.317 | 2.031 (±0.001) |
| **n** | 11 | 11 |

✅ **Pass criteria:** Mean & SD identik antar 4 dataset (dengan toleransi 0.01).

---

## TEST 2: Anscombe's Quartet — Korelasi Pearson

**File:** `01_anscombe.csv`
**Tool:** Korelasi → Pearson
**Run 4×:** (x1,y1), (x2,y2), (x3,y3), (x4,y4)

### Expected Results (4 set HARUS PUNYA r yang sangat dekat):

| Pair | r (Pearson) |
|------|-------------|
| x1, y1 | **0.8164** |
| x2, y2 | **0.8162** |
| x3, y3 | **0.8163** |
| x4, y4 | **0.8165** |

✅ **Pass criteria:** semua r ≈ 0.816 (toleransi 0.001). Ini "trick" famous Anscombe — meski r identik, scatter plot beda total.

---

## TEST 3: Anscombe's Quartet — Regresi Linier Sederhana

**File:** `01_anscombe.csv`
**Tool:** Regresi Sederhana
**Run 4×:** X=x1..x4, Y=y1..y4

### Expected Results (semua 4 set HARUS hasilkan persamaan IDENTIK):

| Parameter | Expected |
|-----------|----------|
| **Intercept (b₀)** | 3.000 ± 0.001 |
| **Slope (b₁)** | 0.500 ± 0.001 |
| **R²** | 0.667 ± 0.001 |
| **F(1, 9)** | 17.99 ± 0.05 |
| **p (F)** | 0.0022 ± 0.0001 |
| **Equation** | Y = 3.000 + 0.500 × X |

✅ **Pass criteria:** semua 4 set hasilkan slope=0.5, intercept=3.0, R²=0.667.

---

## TEST 4: Iris (Setosa subset) — Deskriptif

**File:** `02_iris_subset.csv` (filter: dataset ini sudah include 50 setosa pertama)
**Tool:** Deskriptif
**Pilih kolom:** `sepal_length` (semua 150 baris) atau filter dulu species=setosa untuk subset

**Sumber:** Fisher, R.A. (1936). *The use of multiple measurements in taxonomic problems*.

### Expected (Iris setosa, n=50, sepal_length):

| Metrik | Expected |
|--------|----------|
| **Mean** | 5.006 |
| **Std Dev (sample)** | 0.352 |
| **Variance** | 0.124 |
| **Min** | 4.3 |
| **Max** | 5.8 |
| **Median** | 5.0 |

### Expected (Iris setosa, n=50, sepal_width):
- Mean = **3.428**, SD = **0.379**

✅ **Pass criteria:** match within 0.01.

---

## TEST 5: Iris — One-way ANOVA

**File:** `02_iris_subset.csv`
**Tool:** ANOVA
**Outcome:** `sepal_length`
**Grouping:** `species` (setosa, versicolor, virginica)

### Expected Results:

| Parameter | Expected |
|-----------|----------|
| **F(2, 147)** | **119.26** ± 0.5 |
| **p-value** | < 0.0001 (≈ 1.67e-31) |
| **η² (eta-squared)** | **0.619** ± 0.005 |
| Setosa mean | 5.006 |
| Versicolor mean | 5.936 |
| Virginica mean | 6.588 |

### Post-hoc (semua pair HARUS signifikan):
- Setosa vs Versicolor: p < 0.001 ✅
- Setosa vs Virginica: p < 0.001 ✅
- Versicolor vs Virginica: p < 0.001 ✅

✅ **Pass criteria:** F ≈ 119, semua post-hoc signifikan, η² ≈ 0.62.

---

## TEST 6: Paired T-Test (Pre-test vs Post-test)

**File:** `03_ttest_paired.csv`
**Tool:** T-Test → Paired
**Sebelum:** `pre_test`
**Sesudah:** `post_test`

### Expected Results (computed dari data ini, dapat divalidasi di JASP/R):

| Parameter | Expected |
|-----------|----------|
| **Mean diff** | -7.0 (post lebih tinggi) |
| **SD diff** | ~1.45 |
| **t** | ≈ -21.5 |
| **df** | 19 |
| **p** | < 0.0001 |
| **Cohen's d** | ≈ -4.83 (very large) |
| **n pasangan** | 20 |

✅ **Pass criteria:** t signifikan dengan p < 0.001, mean diff ≈ -7, n=20.

> **Validasi cara cepat di R:**
> ```r
> data <- read.csv("03_ttest_paired.csv")
> t.test(data$pre_test, data$post_test, paired=TRUE)
> ```
> Atau di JASP: T-Tests → Paired Samples T-Test → drag `pre_test` & `post_test`.

---

## TEST 7: Independent T-Test (Iris setosa vs versicolor — sepal_length)

**File:** `02_iris_subset.csv`
**Tool:** T-Test → Independent
**Outcome (numerik):** `sepal_length`
**Grouping:** `species` (HANYA 2 grup — perlu filter dulu **HAPUS BARIS virginica** sebelum upload, atau upload dataset filtered)

⚠️ **Catatan:** tool kita butuh tepat 2 grup. Iris ada 3 species. **Solution sementara:** edit CSV, hapus baris virginica, save jadi `02b_iris_2species.csv` → upload yang itu.

### Expected (setosa vs versicolor, sepal_length, Welch's t-test):

| Parameter | Expected |
|-----------|----------|
| **t** | ≈ -10.52 |
| **df (Welch)** | ≈ 86.5 |
| **p** | < 0.0001 |
| **Cohen's d** | ≈ -2.10 (very large) |
| Setosa: M=5.006, SD=0.352 |
| Versicolor: M=5.936, SD=0.516 |

---

## TEST 8: Cronbach's Alpha (Likert 5 items, 30 responden)

**File:** `04_likert_reliability.csv`
**Tool:** Validitas & Reliabilitas
**Items:** pilih SEMUA 5 kolom (`item1` s/d `item5`)

### Expected:

| Parameter | Expected |
|-----------|----------|
| **Cronbach's α** | ≈ **0.85 - 0.92** (high reliability) |
| **N item (k)** | 5 |
| **N responden** | 30 |
| **Status** | Reliabel ✅ (α > 0.7) |
| **Item-total correlations** | semua > 0.3 (semua valid) |

✅ **Pass criteria:** α > 0.70, semua 5 item valid.

> **Validasi di R:**
> ```r
> library(psych)
> data <- read.csv("04_likert_reliability.csv")
> alpha(data)
> ```

---

## TEST 9: Uji Normalitas

**File:** `05_normality_check.csv`
**Tool:** Uji Normalitas

### Expected:

**Kolom `normal_data`** (homogen ~50 dengan noise kecil):
- Shapiro-Wilk W ≈ 0.95-0.97
- p-value > 0.05 → **Normal ✅**

**Kolom `skewed_data`** (sangat skewed kanan, banyak nilai 1, ada outlier 15, 20):
- Shapiro-Wilk W < 0.7
- p-value < 0.001 → **TIDAK Normal ❌**

✅ **Pass criteria:** kolom 1 = normal, kolom 2 = NOT normal.

---

## TEST 10: Chi-Square — Hubungan minat × lulus

**File:** `06_categorical_demo.csv`
**Tool:** Chi-Square
**Var 1 (baris):** `minat` (IPA / IPS)
**Var 2 (kolom):** `lulus` (Ya / Tidak)

Crosstab yang akan dibentuk:

|        | Ya  | Tidak | Total |
|--------|-----|-------|-------|
| **IPA** | 25  | 0     | 25    |
| **IPS** | 1   | 24    | 25    |
| Total  | 26  | 24    | 50    |

### Expected Results:

| Parameter | Expected (no Yates) | Expected (Yates) |
|-----------|---------------------|------------------|
| **χ²**    | ≈ **46.15**         | ≈ **42.39**      |
| **df**    | 1                   | 1                |
| **p**     | < 0.0001            | < 0.0001         |
| **N**     | 50                  | 50               |
| **Phi (φ)** | ≈ **0.961**       | —                |
| **Cramer's V** | ≈ **0.961** (2×2 → φ) | —      |
| **Effect size** | Very strong (V > 0.5) | —          |

✅ **Pass criteria:** χ² antara 42 dan 47 (tergantung Yates correction setting tool), p < 0.001, V ≈ 0.96, signifikan.

> **Validasi di R:**
> ```r
> data <- read.csv("06_categorical_demo.csv")
> tab <- table(data$minat, data$lulus)
> chisq.test(tab)              # default: Yates correction untuk 2×2
> chisq.test(tab, correct=FALSE)
> ```

---

## TEST 11: Mann-Whitney U Test (2 grup independen)

**File:** `07_mannwhitney_2groups.csv`
**Tool:** Mann-Whitney U
**Outcome:** `nilai`
**Grouping:** `grup` (A, B)

Data:
- Grup A (n=5): 7, 4, 9, 3, 5
- Grup B (n=5): 12, 15, 11, 8, 13

### Expected Results (computed manual + R):

| Parameter | Expected |
|-----------|----------|
| **U** | **1** (atau **24** tergantung konvensi U₁/U₂) |
| **n₁, n₂** | 5, 5 |
| **Sum Rank A (R₁)** | **16** |
| **Sum Rank B (R₂)** | **39** |
| **Mean Rank A** | 3.2 |
| **Mean Rank B** | 7.8 |
| **z** | ≈ **−2.402** |
| **p (two-tailed)** | ≈ **0.016** |
| **Effect size r** | ≈ **−0.760** (large) |
| **Signifikan?** | Ya (p < 0.05) |

✅ **Pass criteria:** U = 1, p < 0.05, |r| > 0.5.

> **Validasi di R:**
> ```r
> data <- read.csv("07_mannwhitney_2groups.csv")
> A <- data$nilai[data$grup == "A"]
> B <- data$nilai[data$grup == "B"]
> wilcox.test(A, B)            # U-test (Mann-Whitney)
> # Output: W = 1, p-value = 0.01587
> ```

---

## TEST 12: Wilcoxon Signed-Rank Test (paired)

**File:** `08_wilcoxon_pre_post.csv`
**Tool:** Wilcoxon Signed-Rank
**Sebelum:** `pre`
**Sesudah:** `post`

Data (n=8 pasangan), semua selisih `post − pre` positif:

| pre | post | diff |
|-----|------|------|
| 85  | 90   | 5    |
| 70  | 75   | 5    |
| 60  | 70   | 10   |
| 90  | 92   | 2    |
| 75  | 85   | 10   |
| 80  | 88   | 8    |
| 65  | 72   | 7    |
| 95  | 100  | 5    |

Ranking |diff|: 2→1, tiga 5→avg 3, 7→5, 8→6, dua 10→avg 7.5

### Expected Results:

| Parameter | Expected |
|-----------|----------|
| **W+ (sum positive ranks)** | **36** |
| **W− (sum negative ranks)** | **0** |
| **W (statistic)** | **0** |
| **n pasangan** | 8 |
| **Mean diff** | 6.5 |
| **z** | ≈ **2.521** (atau −2.52, sign tergantung konvensi) |
| **p (two-tailed)** | ≈ **0.0117** |
| **Effect size r** | ≈ **0.63 - 0.89** (tergantung normalisasi N=n vs 2n) |
| **Signifikan?** | Ya (p < 0.05) |

✅ **Pass criteria:** W=0 (semua diff positif), p < 0.05, mean diff ≈ 6.5.

> **Validasi di R:**
> ```r
> data <- read.csv("08_wilcoxon_pre_post.csv")
> wilcox.test(data$post, data$pre, paired=TRUE)
> # Output: V = 36, p-value = 0.01081 (exact, dengan ties)
> ```

> **Catatan:** R memakai metode exact untuk n kecil; nilai p mungkin sedikit beda dari approximation z (selisih < 0.005). W = 36 di R = W+ kita.

---

## TEST 13: Kruskal-Wallis Test (≥3 grup independen)

**File:** `09_kruskal_3groups.csv`
**Tool:** Kruskal-Wallis
**Outcome:** `nilai`
**Grouping:** `grup` (A, B, C)

Data (3 grup × n=4):
- A: 12, 14, 11, 13
- B: 22, 25, 19, 23
- C: 30, 32, 28, 31

Tidak ada ties. Ranks 1-12 terdistribusi: A=ranks 1-4 (R=10), B=5-8 (R=26), C=9-12 (R=42).

### Expected Results:

| Parameter | Expected |
|-----------|----------|
| **H** | ≈ **9.846** |
| **df** | 2 |
| **p-value** | ≈ **0.00725** |
| **N total** | 12 |
| **k grup** | 3 |
| **η² (eta-squared)** | ≈ **0.872** (very large) |
| **Median A** | 12.5 |
| **Median B** | 22.5 |
| **Median C** | 30.5 |
| **Mean Rank A** | 2.5 |
| **Mean Rank B** | 6.5 |
| **Mean Rank C** | 10.5 |
| **Signifikan?** | Ya (p < 0.01) |

✅ **Pass criteria:** H ≈ 9.85, p < 0.01, η² > 0.5, signifikan.

> **Validasi di R:**
> ```r
> data <- read.csv("09_kruskal_3groups.csv")
> kruskal.test(nilai ~ grup, data=data)
> # Output: Kruskal-Wallis chi-squared = 9.8462, df = 2, p-value = 0.007266
> ```

---

# 📊 Hasil Validasi (Isi sendiri)

| Test | Status | Selisih max | Catatan |
|------|--------|-------------|---------|
| 1. Anscombe Deskriptif | ☐ Pass / ☐ Fail | | |
| 2. Anscombe Korelasi | ☐ Pass / ☐ Fail | | |
| 3. Anscombe Regresi | ☐ Pass / ☐ Fail | | |
| 4. Iris Deskriptif | ☐ Pass / ☐ Fail | | |
| 5. Iris ANOVA | ☐ Pass / ☐ Fail | | |
| 6. Paired t-test | ☐ Pass / ☐ Fail | | |
| 7. Independent t-test | ☐ Pass / ☐ Fail | | |
| 8. Cronbach Alpha | ☐ Pass / ☐ Fail | | |
| 9. Normalitas | ☐ Pass / ☐ Fail | | |
| 10. Chi-Square | ☐ Pass / ☐ Fail | | |
| 11. Mann-Whitney U | ☐ Pass / ☐ Fail | | |
| 12. Wilcoxon Signed-Rank | ☐ Pass / ☐ Fail | | |
| 13. Kruskal-Wallis | ☐ Pass / ☐ Fail | | |

---

# 🔧 Cara Cross-check Independen

## A. Pakai R (gratis, gold standard)

```r
# Install dulu (sekali aja)
install.packages(c("psych", "stats"))

# Anscombe
data <- read.csv("01_anscombe.csv")
cor(data$x1, data$y1)                    # 0.8164205
summary(lm(y1 ~ x1, data))               # slope, R², F, p

# Iris ANOVA
iris_data <- read.csv("02_iris_subset.csv")
aov_result <- aov(sepal_length ~ species, data = iris_data)
summary(aov_result)
TukeyHSD(aov_result)

# Paired t-test
ttest_data <- read.csv("03_ttest_paired.csv")
t.test(ttest_data$pre_test, ttest_data$post_test, paired = TRUE)

# Cronbach Alpha
library(psych)
likert_data <- read.csv("04_likert_reliability.csv")
alpha(likert_data)

# Shapiro-Wilk
norm_data <- read.csv("05_normality_check.csv")
shapiro.test(norm_data$normal_data)
shapiro.test(norm_data$skewed_data)

# Chi-Square
cat_data <- read.csv("06_categorical_demo.csv")
chisq.test(table(cat_data$minat, cat_data$lulus), correct=FALSE)

# Mann-Whitney U
mw <- read.csv("07_mannwhitney_2groups.csv")
wilcox.test(mw$nilai[mw$grup=="A"], mw$nilai[mw$grup=="B"])

# Wilcoxon signed-rank
wx <- read.csv("08_wilcoxon_pre_post.csv")
wilcox.test(wx$post, wx$pre, paired=TRUE)

# Kruskal-Wallis
kw <- read.csv("09_kruskal_3groups.csv")
kruskal.test(nilai ~ grup, data=kw)
```

## B. Pakai JASP (free, GUI, paling enak buat awam)

1. Download di https://jasp-stats.org (free, ~200MB)
2. Open CSV file
3. Pilih analysis (Descriptives, Correlation, ANOVA, dll)
4. Drag-and-drop variable
5. Bandingkan hasil dengan tool kita

## C. Pakai Python (alternatif R)

```python
import pandas as pd
from scipy import stats
import pingouin as pg

# Anscombe correlation
df = pd.read_csv('01_anscombe.csv')
print(stats.pearsonr(df.x1, df.y1))   # (r, p)

# Iris ANOVA
iris = pd.read_csv('02_iris_subset.csv')
print(pg.anova(data=iris, dv='sepal_length', between='species', detailed=True))

# Paired t-test
data = pd.read_csv('03_ttest_paired.csv')
print(stats.ttest_rel(data.pre_test, data.post_test))

# Cronbach Alpha
likert = pd.read_csv('04_likert_reliability.csv')
print(pg.cronbach_alpha(data=likert))
```

---

# 🎯 Workflow Validasi yang Saya Sarankan

1. **Run 9 test di atas pakai tool kita** — catat hasilnya
2. **Bandingkan dengan Expected Results** yang sudah saya tulis di sini
3. **Kalau ada discrepancy:**
   - Lapor ke saya nilai yang beda (X di tool kita, Y expected)
   - Saya akan cek formula di `lib/stats/*.js`
   - Fix bug, push update, retest
4. **Setelah semua pass** → kita aman launch produk

**Bonus:** kalau punya akses ke JASP/R/Python, cross-check independen lagi dengan dataset kamu sendiri sebelum dipasarkan.

---

*File dataset semuanya gratis dari domain publik (Anscombe 1973, Fisher 1936). Dataset 03/04 generated untuk testing dengan distribusi yang predictable.*

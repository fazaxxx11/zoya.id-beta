# Spec: Mockup Tabel Output SPSS di StatistikGuide

**Tanggal:** 2026-07-02
**Status:** Approved (user: "gas dulu, ntar ubah saat aku lihat hasil")
**Goal:** Ganti placeholder kosong "Output SPSS" di 3 tab StatistikGuide (Deskriptif, Inferensial, Regresi) dengan mockup tabel output SPSS yang di-render React/CSS — frontend-only, gak perlu aset gambar.

## Konteks
3 tab StatistikGuide punya toggle "📊 Lihat di SPSS" yang expand ke panel berisi placeholder kotak kosong (`spssPlaceholder`, 120px, border putus-putus, teks "Output SPSS — ...") + langkah menu + highlight. Placeholder itu kosong — student gak bisa lihat bentuk output SPSS beneran.

## Scope — 6 tabel (2 per tab)

| Tab | Tabel 1 | Tabel 2 |
|---|---|---|
| Deskriptif | Descriptive Statistics (N, Min, Max, Mean, Std.Dev, Variance) | Tests of Normality (K-S + S-W, grouped 2-level header) |
| Inferensial | Independent Samples Test (Levene's + t-test, grouped 2-level) | ANOVA (Sum Sq, df, Mean Sq, F, Sig. + row groups Between/Within/Total) |
| Regresi | Model Summary (R, R², Adj R², Std.Error) | Coefficients (Unstd B/SE + Std Beta + t + Sig., grouped 2-level) |

Data angka realistis (n=30, hasil masuk akal) — static hardcoded, tujuan edukatif.

## Arsitektur: A. Reusable + data-driven

- `src/components/StatistikGuide/SpssTable.jsx` — 1 komponen reusable, render dari struktur data
- `src/components/StatistikGuide/spssTableData.js` — 6 objek data tabel + pure helper `fmt(v, decimals)`, testable node-env
- `StatistikGuide.module.css` — class baru `.spssTable*`; class lama `.spssPlaceholder` di-replace
- 3 tab: ganti `<div className={styles.spssPlaceholder}>` → `<SpssTable data={...} />`

### Data model
```js
{
  title: "Descriptive Statistics",
  headerRows: [
    // optional row 1: group labels with colSpan
    [{ label: "Kolmogorov-Smirnov", colSpan: 3 }, { label: "Shapiro-Wilk", colSpan: 3 }],
    // row 2 (always present): column labels
    [{ label: "" }, { label: "Statistic", num: true }, { label: "df", num: true }, ...]
  ],
  rows: [
    ["Skor_Pre", 0.124, 30, 0.200, 0.965, 30, 0.387],
    ["Skor_Post", 0.098, 30, 0.200, 0.971, 30, 0.521],
  ],
  notes: ["a. Lilliefors Significance Correction"]
}
```
- `headerRows.length` 1 → simple; 2 → grouped (SPSS 2-level)
- `num: true` → kolom right-aligned + tabular-nums
- Cell: string apa adanya; number auto-format via `fmt(v, decimals)` (pure, testable)

### Pure helper `fmt(value, decimals)`
- null/undefined → "—"
- number → toFixed(decimals), trim trailing zeros untuk integer
- string → apa adanya
- Di-test node-env (pola sub-proyek B/C)

## Visual styling (SPSS fidelity via theme tokens)
- Struktur SPSS dipertahankan: title bold left-aligned, header row shaded, **horizontal rules only** (top double border + bawah header + bawah tabel — NO vertical borders), footnote italic "a. ..." di bawah
- Angka: `font-variant-numeric: tabular-nums`, right-aligned
- Warna pakai theme tokens (`--surface`, `--border`, `--fg`, `--muted`, `--accent`) — BUKAN gray-blue SPSS asli, biar cocok scholarly ivory
- Yang bikin recognizable sebagai "output SPSS" = strukturnya (rules, grouped header, tabular numbers, footnotes), bukan shade-nya
- ANTI-AI-VIBE: gak ada border vertikal (SPSS asli juga gak ada), spacing lapang, type hierarchy jelas

## Testing
- `fmt(v, decimals)` testable node-env (~4 test)
- Komponen presentational → gak perlu jsdom (sama kayak BellCurve/PValueViz)
- Suite existing tetap 385/394, 0 regresi

// Pricing config — single source of truth.
// Saat mau ubah harga, edit file ini saja.
// Untuk diskon, lihat ./discount.js (terpisah biar bisa di-toggle tanpa ngubah pricing).

import { applyDiscount } from './discount'

// Beta free mode: aktif kecuali VITE_BETA_FREE secara eksplisit di-set 'false'.
// Default (env kosong/missing) = true supaya dev local tidak terkena paywall.
// SAAT LAUNCH: set VITE_BETA_FREE=false eksplisit di Vercel, jangan andalkan default.
export const BETA_FREE = import.meta.env.VITE_BETA_FREE !== 'false'

/** Pricing per jumlah siswa untuk service Assessment */
export const ASSESSMENT_TIERS = [
  { maxStudents: 5,  price: 5000,  label: '1-5 siswa' },
  { maxStudents: 15, price: 10000, label: '6-15 siswa' },
  { maxStudents: 30, price: 18000, label: '16-30 siswa' },
]

/** Untuk >30 siswa: harga base + per siswa tambahan */
export const ASSESSMENT_OVERFLOW = {
  startsAt: 30,
  basePrice: 25000,
  perStudent: 500,
}

/**
 * Hitung harga assessment.
 * @param {number} studentCount jumlah siswa
 * @returns {{ price:number, label:string, breakdown:string }}
 */
export function calculateAssessmentPrice(studentCount) {
  const n = Math.max(0, Number(studentCount) || 0)
  if (n === 0) return { price: 0, label: 'Tidak ada siswa', breakdown: '' }

  for (const tier of ASSESSMENT_TIERS) {
    if (n <= tier.maxStudents) {
      return {
        price: tier.price,
        label: tier.label,
        breakdown: `${n} siswa × Rp ${(tier.price / n).toFixed(0)} (paket ${tier.label})`,
      }
    }
  }

  const overflow = n - ASSESSMENT_OVERFLOW.startsAt
  const price = ASSESSMENT_OVERFLOW.basePrice + overflow * ASSESSMENT_OVERFLOW.perStudent
  return {
    price,
    label: `${n} siswa`,
    breakdown: `Rp ${ASSESSMENT_OVERFLOW.basePrice.toLocaleString('id-ID')} + Rp ${ASSESSMENT_OVERFLOW.perStudent} × ${overflow} siswa tambahan`,
  }
}

// ───────────────────────────────────────────────────────────────────
// Statistik service pricing
// ───────────────────────────────────────────────────────────────────

/** Harga per tool statistik. ID di sini cocok dengan id di Statistik.jsx tools array
 *  + halaman uji terpisah (Mediasi, Logistik, EFA, ItemAnalysis). */
export const STATISTICS_PRICES = {
  // ── Statistik dasar ─────────────────────────────────────
  deskriptif:    { price: 5000,  tier: 'dasar',    name: 'Statistik Deskriptif' },
  normalitas:    { price: 5000,  tier: 'dasar',    name: 'Uji Normalitas' },
  korelasi:      { price: 5000,  tier: 'dasar',    name: 'Korelasi' },
  ttest:         { price: 5000,  tier: 'dasar',    name: 'T-Test' },

  // ── Statistik menengah ──────────────────────────────────
  validitas:     { price: 7000,  tier: 'menengah', name: 'Validitas & Reliabilitas' },
  regresi:       { price: 8000,  tier: 'menengah', name: 'Regresi Sederhana' },
  anova:         { price: 8000,  tier: 'menengah', name: 'One-way ANOVA' },
  chisquare:     { price: 6000,  tier: 'menengah', name: 'Chi-Square' },
  mannwhitney:   { price: 6000,  tier: 'menengah', name: 'Mann-Whitney U' },
  wilcoxon:      { price: 6000,  tier: 'menengah', name: 'Wilcoxon Signed-Rank' },
  kruskal:       { price: 7000,  tier: 'menengah', name: 'Kruskal-Wallis' },
  ngain:         { price: 6000,  tier: 'menengah', name: 'Uji N-Gain (Hake)' },
  itemanalysis:  { price: 7000,  tier: 'menengah', name: 'Analisis Butir Soal' },

  // ── Statistik lanjutan ──────────────────────────────────
  regresiganda:  { price: 12000, tier: 'lanjutan', name: 'Regresi Berganda' },
  twowayanova:   { price: 12000, tier: 'lanjutan', name: 'Two-way ANOVA' },
  mediation:     { price: 12000, tier: 'lanjutan', name: 'Analisis Mediasi (Hayes)' },
  logistic:      { price: 12000, tier: 'lanjutan', name: 'Regresi Logistik' },
  efa:           { price: 12000, tier: 'lanjutan', name: 'Analisis Faktor (EFA)' },

  // ── Tools pendukung (analisis non-statistik) ────────────
  qualitative:   { price: 8000,  tier: 'menengah', name: 'Analisis Kualitatif (Coding)' },
  sampling:      { price: 5000,  tier: 'dasar',    name: 'Kalkulator Sampel' },
  kuesioner:     { price: 5000,  tier: 'dasar',    name: 'Generator Kuesioner' },
}

/**
 * Hitung harga analisis statistik.
 * @param {string} toolId
 * @param {number} sampleSize jumlah baris data (untuk breakdown info)
 */
export function calculateStatisticsPrice(toolId, sampleSize = 0) {
  const cfg = STATISTICS_PRICES[toolId]
  if (!cfg) return { price: 0, label: 'Tidak diketahui', breakdown: '', tier: '' }
  return {
    price: cfg.price,
    label: cfg.name,
    tier: cfg.tier,
    breakdown: sampleSize > 0
      ? `Analisis ${cfg.name} untuk ${sampleSize} sampel (paket ${cfg.tier})`
      : `Analisis ${cfg.name} (paket ${cfg.tier})`,
  }
}

// ───────────────────────────────────────────────────────────────────
// AI service pricing (per call)
// ───────────────────────────────────────────────────────────────────

/**
 * AI tiers — semua butuh login. Free tier = OpenRouter free models, rate-limited.
 * Paid tiers = real API call ke Gemini / Claude / GPT-4o.
 */
export const AI_PRICES = {
  free:     { price: 0,     name: 'AI Dasar',    model: 'DeepSeek V3 / Llama 3.3', limit: '3 call/hari', tier: 'gratis (login)' },
  standard: { price: 2000,  name: 'AI Standar',  model: 'Gemini 2.0 Flash',         limit: 'unlimited (saldo)', tier: 'standar' },
  premium:  { price: 5000,  name: 'AI Premium',  model: 'Claude Haiku / GPT-4o-mini', limit: 'unlimited (saldo)', tier: 'premium' },
  pro:      { price: 15000, name: 'AI Pro',      model: 'Claude 3.5 Sonnet / GPT-4o', limit: 'unlimited (saldo)', tier: 'pro' },
}

/**
 * Hitung harga AI call dengan diskon otomatis.
 * @param {'free'|'standard'|'premium'|'pro'} tier
 */
export function calculateAIPrice(tier) {
  const cfg = AI_PRICES[tier]
  if (!cfg) return { price: 0, original: 0, ...AI_PRICES.free }
  const d = applyDiscount(cfg.price)
  return {
    price: d.discounted,
    original: d.original,
    savings: d.savings,
    discounted: d.active,
    name: cfg.name,
    model: cfg.model,
    limit: cfg.limit,
    tier: cfg.tier,
  }
}

// ───────────────────────────────────────────────────────────────────
// Top-up saldo packages
// Bonus 2x untuk paket Hemat ke atas, dengan max bonus Rp 250.000
// (jadi saldo total maksimum yang dijual = Rp 500.000 dengan bayar Rp 250.000)
// ───────────────────────────────────────────────────────────────────

/** @type {{ id:string, label:string, pay:number, base:number, bonus:number, total:number, recommended?:boolean }[]} */
export const TOPUP_PACKAGES = [
  { id: 'coba',    label: 'Coba',    pay: 10000,  base: 10000,  bonus: 0,      total: 10000  },
  { id: 'hemat',   label: 'Hemat',   pay: 25000,  base: 25000,  bonus: 25000,  total: 50000, recommended: true },
  { id: 'skripsi', label: 'Skripsi', pay: 50000,  base: 50000,  bonus: 50000,  total: 100000 },
  { id: 'allin',   label: 'All-in',  pay: 100000, base: 100000, bonus: 100000, total: 200000 },
  { id: 'power',   label: 'Power',   pay: 250000, base: 250000, bonus: 250000, total: 500000 },
]

// ───────────────────────────────────────────────────────────────────
// Discount-aware wrappers
// ───────────────────────────────────────────────────────────────────

/** Get discounted price for a statistik tool */
export function getStatisticsPriceWithDiscount(toolId, sampleSize = 0) {
  const base = calculateStatisticsPrice(toolId, sampleSize)
  if (!base.price) return { ...base, original: 0, discounted: false, savings: 0 }
  if (BETA_FREE) {
    return {
      ...base,
      price: 0,
      original: base.price,
      savings: base.price,
      discounted: false,
      betaFree: true,
      breakdown: `${base.breakdown} — gratis selama beta`,
    }
  }
  const d = applyDiscount(base.price)
  return {
    ...base,
    price: d.discounted,
    original: d.original,
    savings: d.savings,
    discounted: d.active,
  }
}

/** Get discounted price for assessment */
export function getAssessmentPriceWithDiscount(studentCount) {
  const base = calculateAssessmentPrice(studentCount)
  if (!base.price) return { ...base, original: 0, discounted: false, savings: 0 }
  if (BETA_FREE) {
    return {
      ...base,
      price: 0,
      original: base.price,
      savings: base.price,
      discounted: false,
      betaFree: true,
      breakdown: `${base.breakdown} — gratis selama beta`,
    }
  }
  const d = applyDiscount(base.price)
  return {
    ...base,
    price: d.discounted,
    original: d.original,
    savings: d.savings,
    discounted: d.active,
  }
}

// ───────────────────────────────────────────────────────────────────

/** Format Rupiah */
export const formatIDR = (n) =>
  'Rp ' + (Number(n) || 0).toLocaleString('id-ID')

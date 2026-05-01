// Lightweight i18n — no external deps.
// Supported: 'id' (default) & 'en'.
// Usage:
//   import { useT, useLang } from '../lib/i18n'
//   const t = useT()
//   <h1>{t('home.hero.title')}</h1>
//
// Dotted keys → strings.dict[lang][key]; missing keys auto-fallback to 'id', then key itself.

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'

const KEY = 'zoya_lang'
export const SUPPORTED = ['id', 'en']
export const LANG_LABELS = { id: 'Bahasa Indonesia', en: 'English' }

// ============================================================
// TRANSLATIONS
// ============================================================
// Keep keys consistent. Avoid HTML in values; format inline in components.
// For interpolation use {var} placeholders.
// ============================================================
const dict = {
  id: {
    // ----- Common shell -----
    'common.home':        'Beranda',
    'common.back':        'Kembali',
    'common.close':       'Tutup',
    'common.cancel':      'Batal',
    'common.save':        'Simpan',
    'common.send':        'Kirim',
    'common.search':      'Cari',
    'common.loading':     'Memuat…',
    'common.required':    'wajib diisi',
    'common.optional':    'opsional',
    'common.email':       'Email',
    'common.message':     'Pesan',

    // ----- Header / Footer -----
    'header.checkOrder':  'Cek Pesanan',
    'header.settings':    'Pengaturan & Backup',
    'header.login':       'Masuk',
    'footer.wizard':      'Wizard',
    'footer.help':        'Bantuan',
    'footer.feedback':    'Kritik & Saran',
    'footer.settings':    'Pengaturan',
    'footer.privacy':     'Kebijakan Privasi',
    'footer.terms':       'Syarat Penggunaan',
    'footer.copyright':   '© 2026 {brand} — {tagline}',

    // ----- Home hero -----
    'home.hero.title':       'Tools Penelitian & Assessment Akademis',
    'home.hero.subtitle':    'Satu platform untuk seluruh alur penelitian: kuesioner, sampling, statistik, mediasi, faktor, kualitatif, sampai penilaian tulisan.',
    'home.hero.cta.wizard':  'Mulai dengan Skripsi Wizard',
    'home.hero.cta.explore': 'Atau jelajahi tools',

    // Categories
    'home.cat.statistik.title':   'Analisis Statistik',
    'home.cat.statistik.tagline': 'Uji hipotesis, regresi, ANOVA — SPSS-style di browser',
    'home.cat.persiapan.title':   'Persiapan Penelitian',
    'home.cat.persiapan.tagline': 'Kuesioner, sampling, validasi instrumen, kelola referensi',
    'home.cat.lanjut.title':      'Analisis Lanjutan',
    'home.cat.lanjut.tagline':    'Mediasi, regresi logistik, EFA, kualitatif, assessment AI',

    // ----- Help -----
    'help.title':        'Bantuan & FAQ',
    'help.subtitle':     'Pertanyaan umum tentang penggunaan platform',
    'help.searchPh':     'Cari pertanyaan… (mis: \'p value\', \'mediasi\', \'sample size\')',
    'help.cat.all':      'Semua',
    'help.cat.mulai':    'Memulai',
    'help.cat.pilih':    'Memilih Analisis',
    'help.cat.hasil':    'Membaca Hasil',
    'help.cat.asumsi':   'Asumsi & Batasan',
    'help.cat.data':     'Data & Privasi',
    'help.cat.akun':     'Akun & Bayar',
    'help.empty':        'Tidak ada FAQ yang cocok dengan pencarian Anda.',
    'help.contactCta':   'Pertanyaan tidak ada di sini?',
    'help.contactDesc':  'Kirim email — biasanya dibalas dalam 1–2 hari kerja.',

    // ----- Feedback -----
    'fb.title':            'Kritik & Saran',
    'fb.subtitle':         'Suara Anda menentukan arah pengembangan platform',
    'fb.heroTitle':        'Bantu {brand} jadi lebih baik',
    'fb.heroDesc':         'Saya membaca semua masukan secara pribadi. Bug, ide fitur baru, kritik tampilan, bahkan apresiasi singkat — semua diterima.',
    'fb.category':         'Kategori',
    'fb.rating':           'Rating pengalaman',
    'fb.message':          'Pesan',
    'fb.messagePh':        'Ceritakan dengan detail. Contoh: \'Saat saya unggah file CSV di halaman regresi, kolom angka terbaca sebagai teks. Browser: Chrome 120.\'',
    'fb.replyEmail':       'Email balasan',
    'fb.replyEmailPh':     'email@anda.com — kosongkan jika tidak ingin dibalas',
    'fb.submit':           'Kirim Feedback',
    'fb.minChars':         'Minimal 5 karakter',
    'fb.thanks':           'Terima kasih sudah meluangkan waktu! 💜',
    'fb.thanksDesc':       'Feedback Anda tersimpan di perangkat ini. Klik tombol di bawah untuk mengirim ke {email} — wajib agar kami bisa membaca dan menindaklanjuti.',
    'fb.sendEmail':        'Kirim Email',
    'fb.sendAnother':      'Kirim lagi',
    'fb.history':          'Riwayat feedback Anda',
    'fb.clearHistory':     'Hapus semua riwayat',
    'fb.confirmClear':     'Hapus semua riwayat feedback dari perangkat ini?',
    'fb.btnTooltip':       'Kirim Kritik & Saran',
    'fb.modalSubtitle':    'Bantu kami jadi lebih baik 💜',
    // types
    'fb.type.bug':         'Bug / Error',
    'fb.type.fitur':       'Permintaan Fitur',
    'fb.type.ux':          'Saran UX/UI',
    'fb.type.konten':      'Konten / Akademik',
    'fb.type.apresiasi':   'Apresiasi',
    'fb.type.lainnya':     'Lainnya',

    // ----- Legal common -----
    'legal.lastUpdate':    'Terakhir diperbarui',
    'legal.contact':       'Pertanyaan tentang dokumen ini? Email {email}.',

    // ----- Lang switcher -----
    'lang.switch':         'Bahasa',
    'lang.id':             'Indonesia',
    'lang.en':             'English',
  },

  en: {
    // ----- Common shell -----
    'common.home':        'Home',
    'common.back':        'Back',
    'common.close':       'Close',
    'common.cancel':      'Cancel',
    'common.save':        'Save',
    'common.send':        'Send',
    'common.search':      'Search',
    'common.loading':     'Loading…',
    'common.required':    'required',
    'common.optional':    'optional',
    'common.email':       'Email',
    'common.message':     'Message',

    // ----- Header / Footer -----
    'header.checkOrder':  'Check Order',
    'header.settings':    'Settings & Backup',
    'header.login':       'Sign In',
    'footer.wizard':      'Wizard',
    'footer.help':        'Help',
    'footer.feedback':    'Feedback',
    'footer.settings':    'Settings',
    'footer.privacy':     'Privacy Policy',
    'footer.terms':       'Terms of Use',
    'footer.copyright':   '© 2026 {brand} — {tagline}',

    // ----- Home hero -----
    'home.hero.title':       'Research & Academic Assessment Tools',
    'home.hero.subtitle':    'One platform for the entire research workflow: surveys, sampling, statistics, mediation, factor analysis, qualitative coding, and rubric-based writing assessment.',
    'home.hero.cta.wizard':  'Start with the Thesis Wizard',
    'home.hero.cta.explore': 'Or explore the tools',

    'home.cat.statistik.title':   'Statistical Analysis',
    'home.cat.statistik.tagline': 'Hypothesis tests, regression, ANOVA — SPSS-style in your browser',
    'home.cat.persiapan.title':   'Research Preparation',
    'home.cat.persiapan.tagline': 'Surveys, sampling, instrument validation, reference manager',
    'home.cat.lanjut.title':      'Advanced Analysis',
    'home.cat.lanjut.tagline':    'Mediation, logistic regression, EFA, qualitative, AI assessment',

    // ----- Help -----
    'help.title':        'Help & FAQ',
    'help.subtitle':     'Common questions about using the platform',
    'help.searchPh':     'Search questions… (e.g. \'p value\', \'mediation\', \'sample size\')',
    'help.cat.all':      'All',
    'help.cat.mulai':    'Getting Started',
    'help.cat.pilih':    'Choosing Analysis',
    'help.cat.hasil':    'Reading Results',
    'help.cat.asumsi':   'Assumptions & Limits',
    'help.cat.data':     'Data & Privacy',
    'help.cat.akun':     'Account & Billing',
    'help.empty':        'No FAQ matches your search.',
    'help.contactCta':   'Question not listed?',
    'help.contactDesc':  'Email us — usually replied within 1–2 business days.',

    // ----- Feedback -----
    'fb.title':            'Feedback',
    'fb.subtitle':         'Your voice shapes the platform\'s direction',
    'fb.heroTitle':        'Help us make {brand} better',
    'fb.heroDesc':         'I personally read all feedback. Bugs, new feature ideas, design critique, even a quick thank-you — all welcome.',
    'fb.category':         'Category',
    'fb.rating':           'Experience rating',
    'fb.message':          'Message',
    'fb.messagePh':        'Be specific. Example: \'When I upload a CSV on the regression page, numeric columns are read as text. Browser: Chrome 120.\'',
    'fb.replyEmail':       'Reply email',
    'fb.replyEmailPh':     'your@email.com — leave blank if no reply needed',
    'fb.submit':           'Send Feedback',
    'fb.minChars':         'At least 5 characters',
    'fb.thanks':           'Thanks for taking the time! 💜',
    'fb.thanksDesc':       'Your feedback is saved on this device. Click below to send to {email} — required so we can actually read and act on it.',
    'fb.sendEmail':        'Send Email',
    'fb.sendAnother':      'Send another',
    'fb.history':          'Your feedback history',
    'fb.clearHistory':     'Clear all history',
    'fb.confirmClear':     'Delete all feedback history from this device?',
    'fb.btnTooltip':       'Send Feedback',
    'fb.modalSubtitle':    'Help us improve 💜',
    'fb.type.bug':         'Bug / Error',
    'fb.type.fitur':       'Feature Request',
    'fb.type.ux':          'UX/UI Suggestion',
    'fb.type.konten':      'Content / Academic',
    'fb.type.apresiasi':   'Appreciation',
    'fb.type.lainnya':     'Other',

    // ----- Legal common -----
    'legal.lastUpdate':    'Last updated',
    'legal.contact':       'Questions about this document? Email {email}.',

    // ----- Lang switcher -----
    'lang.switch':         'Language',
    'lang.id':             'Bahasa Indonesia',
    'lang.en':             'English',
  },
}

// ============================================================
// Translate helper
// ============================================================
export function translate(lang, key, vars) {
  const tableId = dict.id[key]
  const tableLang = dict[lang]?.[key]
  let s = tableLang ?? tableId ?? key
  if (vars && typeof s === 'string') {
    s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`))
  }
  return s
}

// ============================================================
// Context + Provider + hooks
// ============================================================
const LangCtx = createContext({ lang: 'id', setLang: () => {}, t: (k) => k })

function readInitialLang() {
  if (typeof window === 'undefined') return 'id'
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && SUPPORTED.includes(saved)) return saved
  } catch {}
  // First visit: prefer browser language if it's English
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'id'
  return nav.toLowerCase().startsWith('en') ? 'en' : 'id'
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(readInitialLang)

  const setLang = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return
    setLangState(next)
    try { localStorage.setItem(KEY, next) } catch {}
    if (typeof document !== 'undefined') document.documentElement.lang = next
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>
}

export function useLang() {
  return useContext(LangCtx)
}

/** Shortcut: returns the t() function. */
export function useT() {
  return useContext(LangCtx).t
}

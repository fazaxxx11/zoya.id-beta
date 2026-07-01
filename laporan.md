# Laporan Progress — Frontend Redesign

> **WAJIB BACA DULU** sebelum lanjut kerja frontend. Lihat bagian "Status Saat Ini" & "Yang Dilarang".
> Terakhir diperbarui: 2026-06-30

---

## Konteks

Project `zoya.id-beta` (brand: **Azezmen**) — platform bantuan skripsi/analisis statistik.
Frontend sebelumnya terkesan "AI-vibe": font heading gak pernah ke-load (bug `font-heading`
tidak terdefinisi di tailwind config), warna inkonsisten (oranye `#f99f1e` clash dengan
token gold), efek dekoratif menumpuk tanpa hierarki (aurora, glow-pulse, glassmorphism).

User minta **re-build total Home**: gaya, warna, spacing, tempat — semua boleh dirombak.
Arah estetik: **Scholarly Editorial** (gold + serif EB Garamond).

---

## Status Saat Ini

### ✅ Selesai (Fase 1 — Foundation + Home)

1. **`tailwind.config.js`**
   - Tambah `fontHeading`/`serif`/`body`/`mono` aliases (EB Garamond, IBM Plex Sans/Mono)
   - `primary` value diubah dari oranye `#f99f1e` → `rgb(var(--accent))` (gold). **Jangan balik ke oranye** — dipakai di panel components (PanelConfig, HausmanCard, dll).
   - Expose token baru sebagai utility: `surface`, `muted`, `accent-soft`, `accent-fg`, `teal`, `terracotta`
   - Buang animasi glow/aurora (0 usage): `aurora-1/2/3`, `glow-pulse`
   - Pertahankan: `fade-in-up`, `fade-in`, `shimmer`, `float`, `float-delayed`

2. **`src/index.css`** — light mode token dioptimalkan:
   - `--bg: #F5F1EB` (warm paper, BUKAN putih steril — putih bikin sakit mata)
   - `--surface: #EDE9E3` (distinct dari bg, bukan putih)
   - `--card: #FAF7F2` (slightly lifted dari bg)
   - `--border: #D4CFC7` (beneran visible)
   - `--accent: #A8782A` (richer gold, kontras di atas paper)
   - `.glass`, `.card-interactive`, `.stat-card`, `.btn-primary`, `.hover-lift`, `.text-gradient` — semua glow/gradien di-netralkan jadi solid scholarly

3. **`src/pages/Home.jsx`** — re-build total:
   - Header compact (h-14), **border bawah selalu ada** (bukan cuma saat scroll), hamburger garis animasi
   - Nav: Layanan / Alur / Contoh / **Harga** (modal "Segera hadir")
   - Hero: ruled-lines pattern (notebook), warm gradient wash, 8 FloatingShapes, headline serif italic
   - Services: border-framed container, alternating accent (gold/teal/terracotta)
   - **CAPABILITIES** (section baru): 6 kapabilitas grid, framed, fills empty space
   - Demo: 2-col split, inline feature checklist, typing effect interpretasi
   - Flow: 3-col framed cards, accent terracotta
   - Quote: dot grid + warm vignette + FloatingShapes
   - Closing CTA: warm gradient
   - Footer: compact, 3-col grid, hapus "Dibuat dengan hati untuk..."
   - **Section backgrounds variatif** (perbaikan iterasi ke-3): tiap section punya background berbeda + gradasi transisi antar section, supaya gak monoton (bukan `bg-bg` polos di mana-mana):
     - Hero: `surface` solid + ruled lines pattern
     - Services: `bg` solid
     - Capabilities: `linear-gradient(bg → surface)`
     - Demo: `surface` solid
     - Flow: `linear-gradient(surface → bg)`
     - Quote: `surface` solid + dot grid
     - Closing CTA: `linear-gradient(bg → surface)`
     - Footer: `bg` solid

### ✅ Selesai (Cleanup Pass — 2026-06-28)

Design-system cleanup pass menyeluruh di seluruh frontend (di atas Fase 1):
- `ui/Button.jsx` indigo → accent; palet chart (BoxPlot/Histogram/QQ/Scatter/StatCharts) purple → gold/teal
- Glassmorphism dihapus dari 8 sticky header + OnboardingTour card/icon-chip
- Ikon AI-vibe `Sparkles` dihapus total (6 file) → scholarly icons (BookOpen/Gift/Layers/Activity/ClipboardCheck)
- Dead CSS: `.glass-solid` + semua legacy purple dark-remap block dihapus dari `index.css`
- Audit 0 sisa di JSX: `text-gray-300/400`, `bg-gray-50/100`, `Sparkles`, `BarChart3`, `ClipboardList`, `aurora`, `glow`, gradient-text, `purple-*`, `indigo-*`
- Primitif baru (diekstrak dari Home.jsx): `AmbientBlobs` (blur orbs), `Flourish` (gold motif), `statistikNav` (SSoT sub-nav Statistik)

### ✅ Selesai (Sub-proyek A — Audit Quick Wins, 2026-06-30)

Quick wins dari audit frontend (commit `9322ffb`):
- **#6** Font loading: `@import` CSS → `<link rel=preconnect>` di `index.html` (lebih cepat)
- **#19** `aria-label` di icon-only buttons (a11y)
- **#16** Hapus `deductWallet` sync dead code (wallet.js + Assessment/Statistik/Payment)
- **#3-clean** Hapus baris mati `VITE_AI_API_KEY` di `.env.example`
- **#20** `VITE_BETA_FREE` default → keep free + bersihkan `.env.example`
- **#14** `vite.config` console drop → pure (keep error/warn, bukan drop semua)
- **#10** Hapus dead CSS (float anims + noise-texture)

Verifikasi 2026-06-30: build OK (2.81s, PWA precache 19), 354/363 test (9 pre-existing di `ttest.js`, 0 regresi).

### ✅ Status Statistik & Dashboard (dipastikan 2026-06-30)

> **Koreksi penting:** sebelumnya bagian ini ditulis "sudah restyle, **belum re-build total**".
> Framing itu menyesatkan. Setelah dicek langsung ke file, **kedua halaman SUDAH berada
> penuh di design system scholarly** — bukan "belum diapa-apain".

- `Statistik.jsx` (2118 baris): 132 pemakaian token scholarly, **0 anti-AI-vibe** (1 "hit" cuma kata `glass` di dalam komentar, bukan class). Pakai `PageHeader` bersama (solid `bg-card`, border-b, breadcrumb, subtitle `uppercase tracking-[0.18em]`, subNav pill), body `bg-bg paper-texture`, sticky TOC.
- `UserDashboard.jsx` (396 baris): fully token-based, status badge teal/accent/terracotta per-status, lucide bersih, layout app fungsional.
- Yang tidak mereka punya vs Home: ornamen editorial marketing (FloatingShapes, ruled-lines, Flourish, gradasi transisi). **Tapi itu ornamen halaman marketing** — naruh ke halaman tool/dashboard yang padat justru anti-pattern (noisy, ganggu readability data).

### ⏸️ Fase 2 — DIBATALKAN (2026-06-30)

Keputusan user: **Fase 2 (deep redesign Statistik & Dashboard) dibatalkan.** Kedua halaman sudah cukup scholarly; re-build total hanya churn berlebihan di halaman app yang stabil & bekerja. Jangan ditawarkan lagi kecuali user explicit minta.

### ⏳ Berikutnya

- **Sub-proyek A v2 sudah di-merge ke `main` & di-push** (commit `42feb8f`, 2026-06-30). Branch `feat/copy-variasi-desain` lokal sudah dihapus. Vercel auto-deploy ter-trigger.
- **Repo cleanup 2026-06-30**: 5 remote branch stale dihapus — `feat/statistik-guide-polish` (regresi: warna terlarang `#3b82f6`/`#6366f1` + struktur header lama, di-DISCARD), `capy/fix-quick-win-issues` (PR #1 merged), `capy/remove-redundant-auth-helper` (PR #2 merged), `feat/exceljs-migration` (exceljs sudah di main), `feat/visualisasi-export` (ExportChartButton sudah di main). Sekarang hanya `main` di remote.
- **Sub-proyek B di-merge ke `main` & di-push** (commit `7b42a5e`, 2026-07-01, fast-forward). Branch `feat/statistikguide-a11y-stepper` lokal sudah dihapus. A11y WAI-ARIA tabs penuh (roving tabindex + arrow/Home/End + focus) di tab utama + 3 sub-tab via hook `useTabsKeyboard`. Ekstrak komponen `Stepper` bersama (indicator dots + "Step X / Y") ganti 3 stepper inline (-66 baris). Build OK, 370/379 test (9 pre-existing, 0 regresi).
- **Ide tersisa dari brainstorming 2026-06-30**:
  - ~~#3 Output SPSS real di Panduan (screenshot tabel SPSS)~~ — ✅ dikerjakan (mockup tabel SPSS di-render React/CSS, gak perlu aset gambar)
  - ~~#4 Gambaran/animasi real saat AI interpretasi hasil~~ — ✅ dikerjakan sub-proyek C (staged progress + typing effect)
  - ~~#5 Video panduan (embed)~~ — ✅ dikerjakan sub-proyek C (animated walkthrough, bukan file video beneran)
  - #7 AI chat room skripsi interaktif — ⚠️ butuh endpoint backend baru (di luar batas frontend-only; mundur sampai backend siap)
- ~~Kandidat lain: code-split chunk `Statistik.jsx` 1.15 MB~~ — ✅ dikerjakan (extract `ResultDisplay` → lazy-load, chunk 1,151 kB → 1,031 kB + lazy 118 kB)

---

## Yang Dilarang (Jangan Diubah Kecuali User Bilang)

1. **`primary` color di tailwind config** — JANGAN balik ke oranye. Sekarang gold scholarly. 5+ panel components andalkan ini.
2. **Font family aliases** (`heading`, `body`, `mono`) — baru saja diperbaiki, jangan break.
3. **`accent-2`** — dipakai di 3 file JSX (ConfirmPaymentModal, OnboardingTour, Kuesioner).
4. **Backend**: `api/`, `*.py`, `requirements.txt`, `vercel.json` — FRONTEND ONLY.
5. **`package.json` dependencies** — jangan tambah/kurang.

---

## Catatan Teknis

### Test suite
- 354/363 pass. **9 fail adalah pre-existing** di `src/lib/stats/ttest.js` (Cohen's d & CI95 undefined).
- Diverifikasi via `git stash` + run di clean `main`: hasil identik. Bukan regresi.
- AGENTS.md klaim "366/366" tapi realita 354/363. Bug math ini belum di-fix (di luar scope frontend).

### Cara kerja frontend
- **Pnpm** lewat `npx pnpm` (corepack butuh admin, gak bisa install global di env ini).
- Dev server: `npx pnpm dev` → `http://localhost:5173/`
- Build: `npx pnpm run build`
- Test: `npx pnpm test -- --run`

### Design tokens (light mode final)
```
--bg:      #F5F1EB  (warm paper)
--card:    #FAF7F2
--surface: #EDE9E3
--border:  #D4CFC7
--muted:   #736F67
--accent:  #A8782A  (gold)
--teal:    #0D645F
--terracotta: #B4645A
```

### Prinsip design (ranah frontend, AGENTS.md design system di-override)
- **Scholarly Editorial** — bukan SaaS template.
- Palette terbatas: gold + teal + terracotta (bukan 4+ warna ramai).
- Serif EB Garamond untuk heading, italic untuk aksen kata.
- **Section backgrounds VARIATIF & ada gradasi transisi** — JANGAN buat semua section warna sama (monoton). Bergantian antara `bg` ↔ `surface`, dan gunakan `linear-gradient` di section transisi supaya gak hard-cut. Header WAJIB punya border bawah.
- Border frames (`border border-border rounded-xl`) di container penting.
- Efek dekoratif: floating shapes + ruled lines + dot grid + warm gradient. **Tanpa glow, aurora, glassmorphism, gradient text.**
- **Light mode WAJIB warm paper** (`#F5F1EB`), BUKAN putih steril — putih bikin sakit mata. Dark mode warm charcoal, bukan hitam pekat.

---

## Log Perubahan

- **2026-06-23 (iterasi 4)**: Header border selalu ada. Section backgrounds dibuat variatif dengan gradasi transisi (`linear-gradient` bg↔surface) supaya gak monoton.
- **2026-06-23 (iterasi 3)**: Capabilities section baru (fills empty space), inline feature checklist di demo, hapus "Dibuat dengan hati...", nav Pricing + modal.
- **2026-06-23 (iterasi 2)**: Compact sizing (semua dikecilkan), ruled lines ganti kawung, FloatingShapes, pricing modal.
- **2026-06-23 (iterasi 1)**: Fase 1 selesai. Foundation + Home re-build. 9 test pre-existing diidentifikasi.
- **2026-06-28 (cleanup pass)**: Cross-cutting design-system cleanup — indigo→accent, glassmorphism removal, Sparkles purge, dead CSS. 0 anti-AI-vibe pattern tersisa di JSX. Build OK, 354/363 test (9 pre-existing, 0 regresi).
- **2026-06-30 (sub-proyek A)**: Audit quick wins (#6,#19,#16,#3,#20,#14,#10), commit `9322ffb`. Build OK, 354/363 test.
- **2026-06-30 (assessment)**: Dicek langsung — Statistik & Dashboard ternyata sudah penuh di design system scholarly (0 anti-AI-vibe). Fase 2 re-build total **dibatalkan** oleh user (churn berlebihan, halaman sudah stabil).
- **2026-06-30 (sub-proyek A v2 — copy & variasi desain)**: Hero Editorial header (3 DNA layout berbeda: Statistik=HeroFlow flow horizontal, Assessment=HeroStepper vertikal, Kuesioner=HeroPreview struktur) di 9 halaman scope via `PageHeader variant="hero"` opt-in (halaman luar scope tetap compact). Copy action-oriented, hapus subtitle generik "Modul Statistik" + tagline marketing "Dari data mentah...". Wizard skripsi jadi popup tombol top bar Home "Ingin dibantu skripsi?" (reuse GuidedWizardModal + CTA header), hapus nav/card/footer/trigger wizard lama di Home, keep fallback Help.jsx (5 link) + route `/wizard`. Branch `feat/copy-variasi-desain`. Build OK, 357/366 test (+3 accent-tokens test, 9 pre-existing, 0 regresi). Spec: `docs/superpowers/specs/2026-06-30-copy-variasi-desain-design.md`. Plan: `docs/superpowers/plans/2026-06-30-copy-variasi-desain.md`.
- **2026-06-30 (merge + repo cleanup)**: Sub-proyek A v2 di-merge ke `main` (fast-forward) & di-push — commit `42feb8f`, branch feat dihapus. Review `feat/statistik-guide-polish`: DISCARD (regresi — pakai warna terlarang `#3b82f6`/`#6366f1` + struktur header lama pra-redesign; tapi 2 ide bagus disimpan: a11y tab nav + stepper indicator, re-implementasi pakai theme tokens). 5 remote branch stale dihapus total. Sekarang hanya `main` di remote.
- **2026-06-30 (sub-proyek B — a11y + stepper)**: StatistikGuide a11y WAI-ARIA tabs penuh (roving tabindex + arrow Left/Right/Up/Down + Home/End + focus management) di tab utama + 3 sub-tab via hook `useTabsKeyboard` (pure logic `getNextTab` di-test node-env karena jsdom tidak terinstall, AGENTS.md larang tambah deps). Ekstrak komponen `Stepper` bersama (indicator dots + "Step X / Y" + progress bar) ganti 3 stepper inline identik (-66 baris, DRY). CSS pakai theme tokens. Spec: `docs/superpowers/specs/2026-06-30-statistikguide-a11y-stepper-design.md`. Plan: `docs/superpowers/plans/2026-06-30-statistikguide-a11y-stepper.md`. Build OK, 370/379 test (+13 baru: 9 hook + 4 stepper, 9 pre-existing ttest, 0 regresi).
- **2026-07-01 (merge sub-proyek B)**: Branch `feat/statistikguide-a11y-stepper` di-merge ke `main` (fast-forward) & di-push — commit `7b42a5e`, branch feat dihapus. Remote kembali hanya `main`.
- **2026-07-02 (sub-proyek C — video panduan + animasi interpretasi)**: Animated walkthrough player (`WalkthroughPlayer`) — modal overlay 5 scene end-to-end (upload → pilih uji → hasil → interpretasi AI → export Bab IV) dengan simulated cursor + ripple + auto-play + progress bar + controls (play/pause/replay/next/prev/seek). Mockup inline rendered React (bukan screenshot), CSS theme tokens only. Entry point: tombol "Tonton Panduan Cepat" di Help hero + CTA "Lihat video panduan" di StatistikGuide. AIInterpretationPanel di-enhance: staged progress 3 langkah (analisis → susun → finalisasi) + typing effect kata-per-kata + tombol "Tampilkan sekaligus". Pure logic di-extract (`getTimelineProgress`, `revealNextChunk`, `getProgressStage`) — testable node-env tanpa jsdom (pola sub-proyek B). Spec: `docs/superpowers/specs/2026-07-02-walkthrough-animasi-interpretasi-design.md`. Plan: `docs/superpowers/plans/2026-07-02-walkthrough-animasi-interpretasi.md`. Build OK, 385/394 test (+15 baru: 6 timeline + 5 typing + 4 stage, 9 pre-existing ttest, 0 regresi).
- **2026-07-02 (code-split Statistik)**: Extract `ResultDisplay` (+ `SaveAnalysisModal`, `ExplainChatPanel`, `QaEntry`, `buildResultContext`) dari `src/pages/Statistik.jsx` (2123 → 1518 baris) ke `src/components/statistik/ResultDisplay.jsx`, di-lazy-load via `React.lazy` + `Suspense`. recharts + 14 ResultCards + panel-panel hasil (Assumptions/ContextualWriter/StatEducation/Methodology/AIInterpretation/ExplainChat) sekarang hanya dimuat setelah analisis selesai. Chunk `Statistik` 1,151.77 kB → 1,031.52 kB (gzip 312.77 → 282.85 kB, −30 kB); chunk lazy `ResultDisplay` 118.29 kB (gzip 30.22 kB). Dead imports dihapus: `exportToExcel`, `exportToPDF`, `preprocessMessyData`, + 6 icon lucide tidak terpakai (`Upload`, `FileSpreadsheet`, `Download`, `FileType`, `FileIcon`, `AlertCircle`). Inline `AIInterpretationPanel` versi lama (pulse dot + teks statis) di-drop — sekarang pakai versi enhanced (staged progress + typing effect) dari sub-proyek C, sama seperti EFA/ItemAnalysis/Logistic/Mediation. Build OK, 385/394 test (9 pre-existing ttest, 0 regresi).
- **2026-07-02 (mockup tabel SPSS)**: Ganti placeholder kosong "Output SPSS" di 3 tab StatistikGuide (Deskriptif/Inferensial/Regresi) dengan 6 mockup tabel output SPSS yang di-render React/CSS — frontend-only, gak perlu aset gambar. Komponen reusable `SpssTable` (data-driven: 1-2 row header dengan `colSpan` untuk grouped header, auto-detect kolom numerik dari data, angka right-aligned + tabular-nums). Data 6 tabel di `spssTableData.js` (Descriptive Statistics, Tests of Normality, Independent Samples Test, ANOVA, Model Summary, Coefficients) — angka realistis n=30, static hardcoded. Visual SPSS fidelity: horizontal rules only (no vertical borders), header shaded, title bold-left, footnotes italic — warna theme tokens (scholarly ivory, bukan gray-blue SPSS asli). Pure helper `fmt(v, decimals)` di-test node-env (+5 test). CSS class lama `.spssPlaceholder` di-replace dengan `.spssTable*`. Spec: `docs/superpowers/specs/2026-07-02-spss-mockup-tables-design.md`. Build OK, 390/399 test (+5 baru, 9 pre-existing ttest, 0 regresi).
- **2026-07-02 (fix UX: scroll-to-top + pb-bottomnav)**: Dua bug UX diperbaiki. (1) **Scroll-to-top saat pindah page** — React Router v6 gak auto-scroll; `RouteTracker` di `App.jsx` sekarang panggil `window.scrollTo(0,0)` saat `location.pathname` berubah (sebelumnya cuma `trackPageview`). (2) **BottomNav border menghalangi konten di mobile** — `BottomNav` (fixed `bottom-0`, `border-t`, `lg:hidden`) muncul di banyak route tapi 17 page gak punya class `pb-bottomnav` (mobile-only bottom padding 72px + safe-area) jadi border-nya overlap konten bawah. Ditambahkan ke: Kuesioner, Sampling, ItemAnalysis, References, Mediation, Qualitative, Settings, Logistic, EFA, SkripsiWizard, Legal, Help, Feedback, UserDashboard, NotFound, OnboardingStatistik, StatistikCompare. Build OK, 390/399 test (9 pre-existing ttest, 0 regresi).
- **2026-07-02 (fix UX: hero overlap di mobile)**: Lanjutan fix UX — user laporkan Kuesioner "masih overlap" setelah fix pb-bottomnav. Root cause: `PageHeader variant="hero"` render `heroExtra` (box tinggi `HeroPreview` "Struktur/Bagian 1/Bagian 2" di Kuesioner; juga `HeroFlow` di Statistik, `HeroStepper` di Assessment) **di dalam** `<header sticky top-0 z-30 border-b>`. Di mobile, box tinggi itu menempel & memakan viewport + `border-b` nutup konten (overlap). Fix: wrapper `heroExtra` dikasih `hidden sm:block` — box dekoratif disembunyikan di mobile (space sempit), tetap tampil di desktop (space cukup). Nav fungsional (back/home/breadcrumbs/subNav/stepIndicator) tetap sticky & slim di mobile; konten kritis ada di body page. Build OK, 390/399 test (9 pre-existing ttest, 0 regresi).
- **2026-07-02 (audit UI/UX lanjutan — FeedbackButton + StatistikHistory)**: Audit fixed/sticky/z-index antar komponen global nemu 2 masalah. (1) **FeedbackButton overlap BottomNav + pelanggaran design system** — FAB `fixed bottom-5` (20px) masuk ke area BottomNav (~72px) di mobile, z-40 vs z-40 saling overlap. Selain itu FAB & modal pakai `linear-gradient(135deg, #3b82f6, #a855f7, #ec4899)` (blue→purple→pink), shadow glow ungu, `focus:ring-violet-300`, emoji 💜 — semua melanggar AGENTS.md (NO purple/gradients, pakai theme tokens). Fix: posisi FAB `bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-5` (di atas BottomNav mobile, pola sama `StatistikFlow:960`); semua warna gradient ungu/pink diganti `rgb(var(--warm-rose))` (terracotta) solid — FAB, modal header, selected type, submit button; `focus:ring-violet-300` → `focus:ring-accent/40`; hapus emoji 💜. (2) **StatistikHistory compare bar ketutup header** — bar `sticky top-2 z-10` saat select mode, PageHeader `sticky top-0 z-30`; `top-2` (8px) bikin bar nempel di atas viewport, ketutup header (z-10 < z-30) saat scroll → tombol "Bandingkan →" hilang. Fix: ukur tinggi header (`document.querySelector(\"header\")` + resize listener, pola `ResultDisplay.jsx`) lalu `style={{ top: headerH + 8 }}` biar bar nempel persis di bawah header. Build OK, 390/399 test (9 pre-existing ttest, 0 regresi).
- **2026-07-02 (hapus HeroPreview dari Kuesioner)**: User komplain box "Struktur/Bagian 1/Bagian 2" di Kuesioner "gajelas, menghalangi, kalau di scroll tetep disitu, buat apa". Fix `hidden sm:block` sebelumnya gak mempan karena di desktop (≥640px) `sm:block` tetap nampilin box, & karena di-dalam `<header sticky top-0>` box nempel terus. HeroPreview itu purely dekoratif (bar placeholder kosong, gak ada data real) → hapus prop `heroExtra` dari PageHeader Kuesioner + hapus import + delete file `src/components/hero/HeroPreview.jsx` (dead code, cuma Kuesioner pakai). Hero Kuesioner sekarang slim & informatif: eyebrow KUESIONER + title "Susun instrumen survei" + tagline, tanpa kotak dekoratif nempel. Page lain (Statistik=HeroFlow kecil, Assessment=HeroStepper kecil) gak dikomplain & kecil → dibiarkan. Build OK, 390/399 test (9 pre-existing ttest, 0 regresi).
- **2026-07-02 (dedup tutor: hapus flow/stepper dobel)**: User komplain Statistik "kebanyakan tutor" — ada box "Upload→Analisis→Interpretasi→Export DOCX" + "Mulai dari upload file Excel/CSV..." yang numpuk. Audit nemu root cause: di Statistik (saat belum upload) ada **3 indikator flow bertumpuk** — (1) PageHeader hero HeroFlow pills "Upload→Pilih uji→Hasil" + tagline, (2) `StatistikHero` section di `StatistikFlow.jsx:754` (FLOW pills "Upload→Analisis→Interpretasi→Export DOCX" + ruled-line texture + AmbientBlobs + teks "Mulai dari..."), (3) `StepIndicator` live "Upload/Cek Data/Analisis/Hasil". #2 purely dekoratif & duplikat #1+#3. Assessment punya pola sama: `heroExtra={HeroStepper}` static 3-step box "Alur: Rubrik/Jawaban/Hasil" duplikat dgn `stepIndicator` live di `right` slot (progress real Rubrik/Jawaban/Hasil). Fix (scope: dedup flow/stepper doang, video panduan + onboarding tour tetap): (1) hapus function `StatistikHero` + render `{!file && <StatistikHero />}` di StatistikFlow + cleanup import unused (`ScrollReveal`, `AmbientBlobs`, `Flourish`) — sekarang Statistik: PageHeader hero (tagline 1 baris + HeroFlow) → subNav → StepIndicator live → dropzone. (2) hapus prop `heroExtra={HeroStepper}` dari Assessment PageHeader + import + delete file `src/components/hero/HeroStepper.jsx` (dead code, cuma Assessment pakai) — sekarang Assessment: hero (tagline + stepIndicator live di kanan). Comment JSDoc PageHeader di-update (heroExtra sekarang cuma HeroFlow). Tiap page kini punya 1 tutor simpel, bukan 2-3 tumpuk. Build OK, 390/399 test (9 pre-existing ttest, 0 regresi).

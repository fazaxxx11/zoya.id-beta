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

- **Sub-proyek A v2 selesai** di branch `feat/copy-variasi-desain` (belum merge ke main — tunggu user review/merge).
- **Ide tersisa dari brainstorming 2026-06-30** (belum dikerjakan, butuh spec terpisah):
  - #3 Output SPSS real di Panduan (screenshot tabel SPSS)
  - #4 Gambaran/animasi real saat AI interpretasi hasil
  - #5 Video panduan (embed)
  - #7 AI chat room skripsi interaktif — ⚠️ butuh endpoint backend baru (di luar batas frontend-only; mundur sampai backend siap)
- Kandidat lain: code-split chunk `Statistik.jsx` 1.15 MB (warning build). Tapi tunggu user yang putuskan arah berikutnya.

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

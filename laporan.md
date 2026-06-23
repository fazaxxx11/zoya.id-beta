# Laporan Progress — Frontend Redesign

> **WAJIB BACA DULU** sebelum lanjut kerja frontend. Lihat bagian "Status Saat Ini" & "Yang Dilarang".
> Terakhir diperbarui: 2026-06-23

---

## Konteks

Project `zoya.id-beta` (brand: **Azezmen**) — platform bantuan skripsi/analisis statistik.
Frontend sebelumnya terkesan "AI-vibe": font heading gak pernah ke-load (bug `font-heading`
tidak terdefinisi di tailwind config), warna inkonsisten (oranye `#f99f1e` clash dengan
token gold), efek dekoratif menumpuk tanpa hierarki (aurora, glow-pulse, glassmorphism).

User minta **re-build total Home**: gaya, warna, spacing, tempat — semua boleh dirombak.
Arah estetik: **Scholarly Editorial** (gold + serif Source Serif 4).

---

## Status Saat Ini

### ✅ Selesai (Fase 1 — Foundation + Home)

1. **`tailwind.config.js`**
   - Tambah `fontHeading`/`serif`/`body`/`mono` aliases (Source Serif 4, IBM Plex Sans/Mono)
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

### 🔄 Berjalan

- **Iterasi visual Home**: user masih kritisi. Cek preview di `http://localhost:5173/`.
- Dev server berjalan di background (Vite, port 5173).

### ⏳ Berikutnya

- Fase 2: Redesign halaman inti lain (Statistik, Dashboard) pakai pola yang sama
- Spec doc belum ditulis (user prefer "coba dulu, kritisi" — skip ceremony)

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
- Serif Source Serif 4 untuk heading, italic untuk aksen kata.
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

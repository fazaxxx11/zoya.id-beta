# Spec — Sub-proyek C: Video Panduan (Animated Walkthrough) + Animasi Interpretasi AI

**Tanggal:** 2026-07-02
**Status:** Draft → menunggu user review
**Scope:** Frontend only. 0 deps baru, 0 file backend, theme tokens only.

---

## 1. Konteks & Motivasi

Dari brainstorming 2026-06-30, dua ide tersisa yang bisa dikerjakan otonom tanpa aset eksternal:

- **#5 Video panduan** — user pemula butuh onboarding visual cara pakai app. Tidak ada file video MP4 (tidak ada kapabilitas render video), jadi dibuat sebagai **animated walkthrough**: auto-playing sequence of rendered mini-screens dengan simulated cursor, klik ripple, transisi, dan caption — jalan di browser, kelihatan seperti video tutorial.
- **#4 Animasi interpretasi AI** — `AIInterpretationPanel.jsx` saat ini hanya menampilkan pulse dot + teks statis saat loading. Ditingkatkan dengan **staged progress indicator** (3 langkah) + **typing effect** (text muncul kata-per-kata).

Kedua fitur saling terkait: scene 4 walkthrough (Generate interpretasi AI) mereuse komponen AIInterpretationPanel yang sudah dianimasikan.

---

## 2. Pendekatan

**Dipilih: A — Component-scene system.**

Walkthrough adalah `<WalkthroughPlayer>` modal berisi sequence of scene. Tiap scene adalah React-rendered mini-screen (bukan screenshot), dengan:
- Simulated cursor (CSS `transform` transition bergerak ke target koordinat, lalu "klik" dengan ripple animation)
- Mini UI mockup (upload area, dropdown, results table, dll — rendered inline, bukan gambar)
- Caption text (deskripsi naratif apa yang lagi terjadi)
- Durasi tetap per scene, auto-advance ke scene berikutnya

Alternatif yang ditolak:
- **B. CSS keyframe-only**: satu animasi `@keyframes` panjang. Susah tambah/ubah scene, susah pause/replay, gak adaptif.
- **C. SVG SMIL**: bagus buat ilustrasi vektor, tapi gak cocok buat mockup UI kompleks.

---

## 3. Bagian 1 — WalkthroughPlayer (Video Panduan)

### 3.1 File baru

| File | Isi |
|------|-----|
| `src/components/WalkthroughPlayer/index.jsx` | Modal player overlay. Auto-play, progress bar, play/pause/replay, next/prev scene. Portal via `createPortal` (pola sama dengan `OnboardingTour.jsx`). |
| `src/components/WalkthroughPlayer/scenes.js` | Definisi 5 scene: `{ id, caption, durationMs, cursor: {x, y, clickAt}, mockup: ReactNode }`. Mockup adalah rendered mini-screen per scene. |
| `src/components/WalkthroughPlayer/useTimeline.js` | Pure logic `getTimelineProgress(elapsedMs, durations)` + hook `useTimeline({durations, playing})` → `{elapsed, currentScene, sceneProgress, totalProgress, advance, reset, seek}`. |
| `src/components/WalkthroughPlayer/WalkthroughPlayer.module.css` | Styles — theme tokens only (`rgb(var(--accent))`, `rgb(var(--border))`, `var(--muted)`, `rgb(var(--bg))`, `rgb(var(--card))`, `rgb(var(--surface))`). Cursor transition, ripple keyframe, mockup styling, progress bar. |

### 3.2 Player behavior

- **Auto-play** saat modal buka (default `playing = true`).
- **Progress bar**: menampilkan scene X/5 + elapsed bar per scene + total bar. Klik bar = seek.
- **Controls**: play/pause toggle, replay (reset ke scene 0), next/prev scene (skip).
- **Caption**: text naratif per scene di bawah mockup (mis. "Upload file CSV atau Excel Anda...").
- **Simulated cursor**: lingkaran kecil gold (`rgb(var(--accent))`) dengan transition `transform 0.8s ease`. Pada `clickAt` timestamp dalam scene, cursor "klik" → ripple animation (scale + fade). Lalu cursor pindah ke target scene berikutnya.
- **Mini UI mockup**: tiap scene me-render mockup UI yang merepresentasikan layar app di step itu. Bukan screenshot — inline React element dengan styling CSS module (skala kecil, border `rgb(var(--border))`, bg `rgb(var(--card))`).
- **Modal overlay**: `createPortal(..., document.body)`, `fixed inset-0 z-[200]`, backdrop `bg-black/60 backdrop-blur-sm` (sama dengan `OnboardingTour`). Esc = close. Klik backdrop = close.
- **Selesai**: setelah scene 5 selesai, tampil "Selesai ✓ — Coba sekarang" CTA yang navigate ke `/statistik` + close modal. Plus tombol "Tonton ulang".

### 3.3 5 Scene end-to-end (~75 detik total)

| # | Scene | Durasi | Caption | Mockup | Cursor action |
|---|-------|--------|---------|--------|---------------|
| 1 | Upload data | 15s | "Mulai dengan mengupload file CSV atau Excel Anda." | Upload area (dashed border, icon FileUp, "Drag file atau klik untuk pilih"). Saat klik → nama file "data_prepost.csv" muncul dengan checkmark. | Bergerak ke upload area → klik → ripple |
| 2 | Pilih analisis | 10s | "Pilih jenis analisis yang sesuai pertanyaan penelitian Anda." | Dropdown / list pilihan analisis (Deskriptif, T-Test, ANOVA, Regresi...). Cursor hover → klik "T-Test Independent" → highlight. | Bergerak ke opsi "T-Test Independent" → klik → ripple |
| 3 | Jalankan uji | 15s | "Hasil uji muncul otomatis: statistik, p-value, dan effect size." | Results panel: tabel mini (kolom: Statistik, Nilai) row draw-in satu per satu (mean, t-stat, p-value, effect size). Nilai muncul dengan fade-in. | Tetap di tengah (mode "watch results appear") |
| 4 | Generate interpretasi AI | 15s | "Klik Generate untuk interpretasi siap-paste berbahasa akademik." | AIInterpretationPanel mini: tombol "Generate" di-klik → staged progress (3 langkah reuse Bagian 2) → typing effect text interpretasi muncul kata-per-kata. | Bergerak ke tombol "Generate" → klik → ripple |
| 5 | Export Bab IV | 15s | "Export draft Hasil & Pembahasan siap-paste ke skripsi Anda." | Tombol "Export DOCX" → klik → indikator download ("data_hasil.docx terunduh"). | Bergerak ke tombol "Export DOCX" → klik → ripple |

### 3.4 Entry points (file diubah)

**`src/pages/Help.jsx`** — hero section (baris ~362):
- Tambah tombol "▶ Tonton Panduan Cepat" di kelompok tombol (sebelah "Panduan Skripsi" & "Email Admin").
- Klik → `setWalkthroughOpen(true)` → render `<WalkthroughPlayer onClose={...} />`.
- State lokal `const [showWalkthrough, setShowWalkthrough] = useState(false)`.

**`src/components/StatistikGuide/index.jsx`** — di bawah `<p className={styles.subtitle}>` (baris ~45), sebelum `<nav role="tablist">`:
- CTA kecil: `<button className={styles.walkthroughCta}>▶ Lihat video panduan</button>`.
- Klik → `setShowWalkthrough(true)` → render `<WalkthroughPlayer onClose={...} />`.
- State lokal `const [showWalkthrough, setShowWalkthrough] = useState(false)`.

### 3.5 CSS module — kelas baru

`.walkthroughCta` ditambahkan ke `StatistikGuide.module.css` (CTA kecil di guide). Sisa styling walkthrough ada di `WalkthroughPlayer.module.css`:

- `.overlay` — fixed inset-0 z-200, backdrop
- `.modal` — max-w-2xl, bg `rgb(var(--card))`, border `rgb(var(--border))`, rounded-lg, shadow
- `.playerArea` — aspect-ratio ~16:10, bg `rgb(var(--surface))`, relative (mockup + cursor)
- `.cursor` — w-3 h-3 rounded-full, bg `rgb(var(--accent))`, `position: absolute`, `transform: translate(x,y)`, `transition: transform 0.8s ease`
- `.cursor::after` — ripple (pseudo, scale 0→2.5, opacity 0.6→0, keyframe 0.6s)
- `.caption` — text-sm, `var(--muted)`, italic, center
- `.progressBar` — h-1, bg `rgb(var(--border))`, inner fill `rgb(var(--accent))` width = totalProgress
- `.controls` — flex, play/pause/replay/next/prev buttons (lucide: Play, Pause, RotateCcw, ChevronLeft, ChevronRight)
- `.mockup*` — styling per mini-screen (upload, dropdown, table, panel, export)
- `.sceneLabel` — "Scene X / 5" badge top-left player area

---

## 4. Bagian 2 — Animasi Interpretasi AI

### 4.1 File diubah: `src/components/AIInterpretationPanel.jsx`

**Loading state** (baris 73-78, ganti pulse-dot block):
- Ganti single pulse dot → **staged progress 3 langkah**:
  1. "Menganalisis hasil uji..." (spinner)
  2. "Menyusun interpretasi akademik..." (spinner)
  3. "Finalisasi paragraf..." (spinner)
- Tiap stage muncul berurutan dengan delay simulasi (~2-4s per stage, hardcoded timing — bukan tied ke backend karena backend call tidak punya stage info).
- Stage aktif: spinner + text bold. Stage selesai: checkmark + text muted. Stage belum: text muted + circle outline.

**Result state** (baris 86-101, ganti static text reveal):
- Setelah loading selesai (`loading` false, `text` ada): **typing effect** — text muncul kata-per-kata.
- Speed: ~3-4 kata per tick, tick interval ~60ms (cukup cepat supaya gak lama, tapi kelihatan "diketik").
- Cursor blinking `▍` di akhir text yang sudah ter-reveal.
- User bisa klik "Tampilkan sekaligus" untuk skip typing → reveal full text.

### 4.2 File baru (pure logic, testable node-env)

| File | Isi |
|------|-----|
| `src/components/AIInterpretationPanel/useTypingEffect.js` | Pure `revealNextChunk(fullText, revealedCount, wordsPerTick)` → `{text, nextCount, done}`. Hook `useTypingEffect({text, playing, speed})` → `{visibleText, done, skip}`. |
| `src/components/AIInterpretationPanel/useProgressStage.js` | Pure `getProgressStage(elapsedMs, stageThresholds)` → `{stageIndex, stageState: 'active'|'done'|'pending'[]}`. Hook `useProgressStage({stages, active})` → `{currentStage, stageStates}`. |

### 4.3 Reuse di walkthrough scene 4

Scene 4 mockup me-render mini AIInterpretationPanel yang menggunakan `useProgressStage` + `useTypingEffect` dengan timing yang lebih cepat (supaya muat 15s scene). Logic function sama, parameter beda.

---

## 5. Testing (jsdom constraint — pola sub-proyek B)

Pure logic functions di-extract, test di node-env (tanpa jsdom, tanpa `@testing-library/react`):

### 5.1 `useTimeline.js` → `getTimelineProgress(elapsedMs, durations[])`

Tests (~6):
- Scene 0 di elapsed 0 → `{currentScene: 0, sceneProgress: 0, totalProgress: 0}`
- Scene 0 mid → sceneProgress = elapsed/duration[0]
- Boundary: elapsed = duration[0] → currentScene = 1, sceneProgress = 0
- Scene terakhir selesai → currentScene = last, totalProgress = 1
- Elapsed melebihi total → clamp di scene terakhir, totalProgress = 1
- Empty durations → safe (currentScene = 0, all 0)

### 5.2 `useTypingEffect.js` → `revealNextChunk(fullText, revealedCount, wordsPerTick)`

Tests (~5):
- Count 0 → text = '', done = false
- Count < total words → text = first N words, done = false
- Count >= total → text = full, done = true
- wordsPerTick = 3 → reveal 3 kata per tick
- Empty text → done = true immediately

### 5.3 `useProgressStage.js` → `getProgressStage(elapsedMs, stageThresholds[])`

Tests (~4):
- Elapsed 0 → stageIndex 0, semua active/pending sesuai threshold
- Elapsed di antara threshold[0] dan threshold[1] → stage 0 done, stage 1 active
- Elapsed melebihi semua threshold → semua done
- Empty thresholds → safe (stageIndex 0, empty states)

**Estimasi total: ~15-18 test baru.**

---

## 6. Constraints & Yang Dilarang

- **Frontend only** — tidak sentuh `api/`, `*.py`, `requirements.txt`, `vercel.json`.
- **0 deps baru** — tidak ubah `package.json`. lucide-react icons yang sudah ada: `Play, Pause, RotateCcw, ChevronLeft, ChevronRight, FileUp, Check, Download`. Tidak import icon terlarang.
- **Theme tokens only** — semua warna pakai CSS var (`rgb(var(--accent))`, `rgb(var(--border))`, `var(--muted)`, dll). NO hardcoded hex. NO `#3b82f6`, NO `#6366f1`, NO `text-gray-*`, NO `bg-gray-*`.
- **Design system** — scholarly editorial. Serif EB Garamond heading. No glassmorphism, no gradients (kecuali yang sudah ada di design system), no sparkles, no purple.
- **Help.jsx hero gradient**: catatan — hero Help.jsx saat ini pakai `rgb(99 102 241)` (indigo) + `rgb(168 85 247)` (purple). Ini pre-existing violation. **Di luar scope sub-proyek C** — jangan sentuh kecuali user minta. Tombol walkthrough baru pakai theme tokens, BUKAN ikut gradient indigo/purple itu.

---

## 7. Scope / YAGNI

- 1 flow end-to-end (5 scene), bukan multi-flow per fitur. ✓
- Typing + staged progress, bukan full chart draw-in animation. ✓
- Mockup inline rendered React, bukan screenshot/gambar eksternal. ✓
- Walkthrough player = modal overlay, bukan halaman/route terpisah. ✓
- 0 deps baru, 0 file backend. ✓

---

## 8. Urutan Implementasi (ringkasan — detail di plan doc)

1. Pure logic: `useTimeline.js`, `useTypingEffect.js`, `useProgressStage.js` + tests
2. CSS module `WalkthroughPlayer.module.css` + `.walkthroughCta` di `StatistikGuide.module.css`
3. `scenes.js` (5 scene definition + mockup)
4. `WalkthroughPlayer/index.jsx` (modal player)
5. Enhance `AIInterpretationPanel.jsx` (staged progress + typing)
6. Entry points: `Help.jsx` + `StatistikGuide/index.jsx`
7. Verifikasi: build + test (target 370 + 15-18 baru = ~385-388 passed, 9 pre-existing fail, 0 regresi)
8. Update `laporan.md` + merge ke main

# Sub-proyek A: Copy & Variasi Desain Per-Halaman

> **Status:** Approved design — 2026-06-30
> **Scope:** Frontend only. Tidak sentuh `api/`, `*.py`, `requirements.txt`, `vercel.json`, `package.json` deps.
> **Baseline:** commit `9322ffb` — build OK, 354/363 test (9 pre-existing di `ttest.js`, 0 regresi).

## Konteks & Masalah

User mengeluh:
1. Copy subtitle Statistik ("Modul Statistik / Dari data mentah menjadi kesimpulan yang siap ditulis") tidak penting, prefer yang praktis.
2. Desain per-halaman (Statistik, Assessment, Kuesioner) "sama persis dengan Home/Dashboard, gaada kreativitasnya" — semua pakai `PageHeader` compact identik.
3. Wizard skripsi ("Panduan Skripsi") jangan jadi pilihan/menu — jadikan popup di top bar dengan teks "Ingin dibantu skripsi?".

## Keputusan (locked via brainstorming)

1. **Arah desain: A — Hero Editorial** (eyebrow label + judul serif italic aksen + tagline), via prop `variant="hero"` di `PageHeader` (opt-in, default tetap compact).
2. **DNA per modul: 3 layout struktur berbeda** (mockup `layout-berbeda.html` yang user acc) — bukan ornamen human/AmbientBlobs (v2 ditolak, "masih AI vibe"), tapi perbedaan struktural layout.
3. **Arah copy: 1 — Action-oriented** — tagline bilang apa yang user LAKUKAN + hasil, hapus subtitle generik & tagline marketing.
4. **Wizard: A — ghost button accent kanan top bar Home** (sebelum Masuk/Dashboard), reuse `GuidedWizardModal`, popup CTA "Ingin dibantu skripsi?" + "Ya, mulai" → `/wizard` + "Lain kali".

## Section 1 — Hero Editorial Header Pattern

### Komponen: `src/components/PageHeader.jsx`

Tambah prop `variant="hero"` (opt-in). Default render tetap compact (tidak break 15+ halaman luar scope: EFA, Sampling, Settings, Legal, Help, dll).

**Render hero** (jika `variant="hero"`):
```
┌─────────────────────────────────────────────┐
│ ← Beranda  /  [EYEBROW]           [Home]   │   top row: back + breadcrumb + home (tetap)
│                                              │
│ [EYEBROW]                                    │   text-[10px] sm:text-[11px] uppercase tracking-[0.18em]
│                                              │   font-semibold, warna accent modul
│ [JUDUL serif, 1 kata italic accent]          │   font-heading text-2xl sm:text-3xl font-bold
│                                              │   leading-tight
│ [TAGLINE action-oriented, text-sm muted]     │
│                                              │
│ [subNav pills — tetap]                       │
└─────────────────────────────────────────────┘
```

Props baru:
- `variant`: `"compact"` (default) | `"hero"`
- `eyebrow`: string label modul uppercase (cth: `"STATISTIK"`) — menggantikan `subtitle` generik
- `tagline`: string action-oriented
- `accent`: `"gold"` (default) | `"teal"` | `"terracotta"` — menentukan warna eyebrow + kata italic + flow pills

Prop lama `subtitle` tetap didukung untuk compact default (backward-compat, halaman luar scope tidak perlu diubah).

### DNA per modul (3 layout struktur berbeda)

**Statistik — single-column + flow horizontal inline**
- Layout: full-width single column, judul kiri-rata
- Komponen unik di hero: **flow horizontal** (Upload → Pilih uji → Hasil) sebagai pill inline di area hero — visualisasi alur tool
- Accent: `gold` (#A8782A)
- SubNav pills di paling bawah hero

**Assessment — 2-kolom asimetris + stepper vertikal**
- Layout: grid 2-kolom (kiri identitas | kanan stepper)
- Komponen unik di hero: **stepper 3-step vertikal** (1 Rubrik → 2 Jawaban siswa → 3 Skor + komentar) di kolom kanan
- Accent: `teal` (#0D645F)
- Rasio kiri:kanan ~1.1:0.9
- SubNav pills di paling bawah (full-width)

**Kuesioner — 2-kolom asimetris + preview struktur**
- Layout: grid 2-kolom (kiri judul+CTA | kanan preview)
- Komponen unik di hero: **preview mini struktur kuesioner** (Bagian 1 · Demografi, Bagian 2 · Likert, item bars) di kolom kanan
- Accent: `terracotta` (#B4645A)
- Rasio kiri:kanan ~1.3:0.7 (beda dari Assessment)
- CTA "+ Bagian baru" di kolom kiri
- SubNav pills di paling bawah (full-width)

### Sub-page Statistik (pewarisan DNA parent)
Sub-page (History, Bab IV, Power, Batch, Compare, Dokumentasi) pewarisan layout Statistik (single-column + flow) tapi:
- Flow horizontal disesuaikan/disembunyikan kalau tidak relevan (cth: History tidak punya flow upload)
- Eyebrow + tagline beda per sub-page (lihat Section 2)
- Accent tetap `gold`

### Halaman opt-in `variant="hero"` (9 file)
- `src/pages/Statistik.jsx`
- `src/pages/StatistikHistory.jsx`
- `src/pages/StatistikReport.jsx` (Bab IV)
- `src/pages/StatistikPower.jsx`
- `src/pages/StatistikBatch.jsx`
- `src/pages/StatistikCompare.jsx`
- `src/pages/StatistikGuide.jsx` (Dokumentasi)
- `src/pages/Assessment.jsx`
- `src/pages/Kuesioner.jsx`

Halaman luar scope (EFA, Sampling, Settings, Legal, Help, ItemAnalysis, Logistic, Mediation, Qualitative, References, EViews, Feedback, SkripsiWizard) tetap compact default — TIDAK diubah.

## Section 2 — Copy Action-Oriented Per Halaman

Template: **Eyebrow** (label modul uppercase, accent) + **Judul** (serif, 1 kata italic aksen) + **Tagline** (action-oriented: bilang apa yang user LAKUKAN + hasil).

### Statistik (parent + sub)

| File | Eyebrow | Judul | Tagline (action) |
|---|---|---|---|
| `Statistik.jsx` | STATISTIK | *Uji* data kamu | Upload Excel → pilih uji → dapat angka + interpretasi siap kutip. |
| `StatistikHistory.jsx` | STATISTIK · RIWAYAT | *Riwayat* analisis | Buka ulang, bandingkan, atau lanjutkan analisis tersimpan. |
| `StatistikReport.jsx` | STATISTIK · BAB IV | *Draft* Bab IV | Pilih analisis tersimpan → generate narasi siap tempel. |
| `StatistikPower.jsx` | STATISTIK · POWER | *Hitung* ukuran sampel | Estimasi daya & jumlah responden minimal sebelum survei. |
| `StatistikBatch.jsx` | STATISTIK · BATCH | *Batch* banyak file | Jalankan uji yang sama untuk banyak file sekaligus. |
| `StatistikCompare.jsx` | STATISTIK · BANDING | *Bandingkan* analisis | Tarik dua analisis berdampingan — lihat bedanya. |
| `StatistikGuide.jsx` | STATISTIK · PANDUAN | *Pelajari* tiap uji | Referensi: kapan pakai, rumus, & bacaan output. |

### Assessment & Kuesioner

| File | Eyebrow | Judul | Tagline (action) |
|---|---|---|---|
| `Assessment.jsx` | ASSESSMENT | *Nilai* tugas pakai AI | Buat rubrik → upload jawaban siswa → dapat skor + komentar otomatis. |
| `Kuesioner.jsx` | KUESIONER | *Susun* instrumen survei | Buat butir → generate pakai AI → kumpulkan respons langsung. |

### Yang dihapus
- `subtitle="Modul Statistik"` (diulang di Statistik, History, Report, Power, Batch, Compare) → ganti `eyebrow`
- `subtitle="Power Analysis"` → ganti `eyebrow="STATISTIK · POWER"`
- `subtitle="Batch Analysis"` → ganti `eyebrow="STATISTIK · BATCH"`
- Tagline marketing "Dari data mentah menjadi kesimpulan yang siap ditulis" di `StatistikFlow.jsx:785` → hapus (PageHeader hero sudah jelas)
- `subtitle={title \|\| 'Penilaian tugas dengan AI'}` di Assessment.jsx:1516 → ganti `eyebrow="ASSESSMENT"` + `tagline` action

## Section 3 — Wizard Popup (Top Bar Home)

### Tombol di top bar Home (`src/pages/Home.jsx`)
- **Placement:** kanan top bar, antara `ThemeToggle` (baris 271) & `Masuk`/`Dashboard` Link (baris 273-285)
- **Style:** ghost button accent — `border border-accent/40 text-accent bg-accent/5 hover:bg-accent/10 rounded-lg text-xs font-semibold`, ikon `Compass` + teks "Ingin dibantu skripsi?"
- **Mobile:** tampil di mobile menu (baris 302-329), sebelum Masuk/Dashboard
- **Aksi:** `onClick={() => setWizardOpen(true)}` (state `wizardOpen` sudah ada baris 228)

### Popup — reuse `GuidedWizardModal` (`src/components/statistik/GuidedWizardModal.jsx`)
Komponen sudah ada & berfungsi. Yang diubah:
- Tambah header CTA copy: judul "Ingin dibantu skripsi?" (serif), deskripsi "Checklist terstruktur dari Bab 1 sampai sidang — pilih jenis penelitian, ikuti langkahnya."
- Tombol "Ya, mulai" → `onComplete` tetap navigate `/statistik` dengan `wizardIntent` (perilaku saat ini baris 742) — **tidak ubah**. (Catatan: mockup browser menulis "arah /wizard" untuk simplicitas visual, tapi implementasi mengikuti perilaku `GuidedWizardModal` existing: `/statistik` + `wizardIntent` state. Route `/wizard` tetap ada sebagai fallback deep-link yang diakses via Help/footer, **bukan** via popup.)
- Tombol "Lain kali" → `handleDismiss` (sudah ada baris 22, simpan `localStorage` `azezmen_wizard_dismissed`)

### Yang dihapus (entry point wizard lama di Home)
- **Nav "Panduan"** — cek menu Home (baris ~245-267), hapus item yang link ke `/wizard` atau "Panduan Skripsi"
- **Card "03 Panduan Skripsi"** di array `SERVICES` (baris 176-185) — hapus entire object
- **Trigger "Bingung? Pilihkan untuk saya"** di hero (baris 380-386) — hapus button, gantikan tombol top bar

### Yang TETAP (fallback deep-link, tidak dihapus)
- Route `/wizard` di router (SkripsiWizard.jsx tetap accessible via URL)
- Link `/wizard` di `Help.jsx` (4 tempat)
- Link "Panduan Skripsi" di footer (kalau ada)

## Yang TIDAK Termasuk Scope

- Ide #3 output SPSS real, #4 animasi interpretasi, #5 video panduan → sub-proyek terpisah (B)
- Ide #7 AI chat room skripsi → butuh endpoint backend baru, di luar batas frontend-only. Mundur sampai backend siap.
- Home.jsx hero, UserDashboard.jsx, halaman luar scope PageHeader → tidak diubah

## Verifikasi

- `pnpm run build` → OK
- `pnpm test -- --run` → 354/363 (9 pre-existing di `ttest.js`, 0 regresi baru)
- Visual cek manual: 9 halaman scope tampil Hero Editorial, 15+ halaman luar scope tetap compact
- Wizard: tombol top bar Home buka popup, "Ya, mulai" arah `/statistik` (atau `/wizard`), "Lain kali" dismiss + localStorage

## Risiko & Mitigasi

- **PageHeader change break halaman luar scope** → mitigasi: `variant="hero"` opt-in, default compact tidak berubah
- **3 layout DNA berbeda = 3x kode render di PageHeader** → mitigasi: pakai switch `accent` + `variant`, sub-komponen kecil (`HeroFlow`, `HeroStepper`, `HeroPreview`) untuk bagian unik, bukan fork penuh
- **Hapus nav/card wizard di Home = user tidak nemu wizard kecuali popup** → mitigasi: keep `/wizard` route + link Help + footer sebagai fallback deep-link

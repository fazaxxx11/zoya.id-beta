# StatistikGuide — A11y Tab Nav + Stepper Indicator

> **Status:** Approved design — 2026-06-30
> **Scope:** Frontend only. Tidak sentuh `api/`, `*.py`, `requirements.txt`, `vercel.json`, `package.json` deps.
> **Baseline:** commit `34bce3b` (main) — build OK, 357/366 test (9 pre-existing di `ttest.js`, 0 regresi).
> **Asal:** 2 ide bagus dari review `feat/statistik-guide-polish` (commit `5150bbd` di-DISCARD karena pakai warna terlarang `#3b82f6`/`#6366f1` + struktur header pra-redesign). Ide bagusnya disimpan, di-reimplementasi bersih pakai theme tokens.

## Konteks & Masalah

`StatistikGuide` (halaman Panduan Statistik) punya 2 jenis tab nav, keduanya **0 a11y**:
1. **Tab utama** (`index.jsx`): 5 tab (Ringkasan/Deskriptif/Inferensial/Regresi/FAQ) — tanpa `role`/`aria-selected`/keyboard nav.
2. **Sub-tab** (`DeskriptifTab`/`InferensialTab`/`RegresiTab`): 2 sub-tab (Materi/Tutorial) — tanpa a11y juga.

Selain itu, 3 file tutorial (`DeskriptifTutorial`/`InferensialTutorial`/`RegresiTutorial`) punya stepper yang **struktur identik** (hanya array `steps` beda, masing-masing 5 step) — cuma ada progress bar polos, tanpa indikator posisi (dots/"Step X / Y"). Kode ter-tripel.

## Keputusan (locked via brainstorming 2026-06-30)

1. **Scope a11y:** tab utama + sub-tab (4 file: `index.jsx` + 3 Tab). Konsisten — semua tab nav di StatistikGuide accessible.
2. **Depth a11y:** pattern penuh WAI-ARIA tabs (roving tabindex + arrow Left/Right/Up/Down + Home/End + focus management).
3. **Stepper:** ekstrak komponen `Stepper` bersama — DRY, 1 tempat perubahan.
4. **Indicator:** progress bar (existing, dipertahankan) + dots + label "Step X / Y".
5. **Approach keyboard:** custom hook `useTabsKeyboard` reusable (bukan inline per file, bukan wrapper component).

## Section 1 — Arsitektur & File

### Create (4 file)
- `src/components/StatistikGuide/useTabsKeyboard.js` — hook roving tabindex + arrow keys + Home/End + focus management. Dipakai tab utama + 3 sub-tab.
- `src/components/StatistikGuide/Stepper.jsx` — komponen stepper bersama (progress bar + dots + "Step X / Y" + card + Back/Next). Prop `steps`.
- `tests/unit/useTabsKeyboard.test.jsx` — unit test hook keyboard.
- `tests/unit/Stepper.test.jsx` — render test Stepper.

### Modify (7 file)
- `src/components/StatistikGuide/index.jsx` — tab utama: pakai hook + attrs ARIA.
- `src/components/StatistikGuide/tabs/DeskriptifTab.jsx`, `InferensialTab.jsx`, `RegresiTab.jsx` — sub-tab: pakai hook + attrs ARIA (pola sama, id prefix `subtab-`/`subpanel-`).
- `src/components/StatistikGuide/tabs/tutorials/DeskriptifTutorial.jsx`, `InferensialTutorial.jsx`, `RegresiTutorial.jsx` — ganti body stepper inline → `<Stepper steps={steps} />`.
- `src/components/StatistikGuide/StatistikGuide.module.css` — tambah class dots/indicator (theme tokens).

### Tidak disentuh
`OverviewTab.jsx`, `FAQTab.jsx` (tidak punya sub-tab/stepper), semuanya di luar `StatistikGuide/`.

### Constraint
- FRONTEND only, tidak ubah `package.json` deps.
- **Pakai theme tokens** (`rgb(var(--accent))`, `rgb(var(--border))`, `var(--muted)`) — NO hardcoded `#3b82f6`/`#6366f1`/`#eef2ff`/indigo/gray (itulah yang membuat `5150bbd` kena discard).
- CSS stepper tetap di `StatistikGuide.module.css` (pola saat ini), bukan Tailwind utility inline.

## Section 2 — Hook `useTabsKeyboard`

### Signature
```js
function useTabsKeyboard({ count, activeIndex, onChange })
// returns: { tabRefs, onKeyDown, getTabIndex }
```

### Behavior (WAI-ARIA Authoring Practices — tabs, automatic activation)
- **Roving tabindex:** hanya tab aktif `tabIndex={0}`, sisanya `tabIndex={-1}`. User Tab masuk sekali → langsung ke tab aktif, lalu arrow keys pindah.
- **ArrowRight / ArrowDown:** pindah ke tab berikutnya (wrap ke awal kalau di akhir).
- **ArrowLeft / ArrowUp:** pindah ke tab sebelumnya (wrap ke akhir kalau di awal).
- **Home:** pindah ke tab pertama.
- **End:** pindah ke tab terakhir.
- **Focus management:** saat pindah via arrow, tab baru jadi `activeIndex` (via `onChange`) **dan** langsung di-focus (`tabRefs.current[newIndex].focus()`). Automatic activation — cocok karena tiap tab ganti konten panel.
- **Enter/Space:** tidak perlu handler — tab adalah `<button>`, default trigger `onClick` yang set activeIndex. Tidak double-trigger.
- `e.preventDefault()` dipanggil untuk arrow/Home/End (supaya page tidak scroll).

### Ref management
- `useRef([])` array refs, isi via callback ref: `ref={el => (tabRefs.current[i] = el)}`.
- `getTabIndex(i)` return `i === activeIndex ? 0 : -1`.

### Batasan
- Tidak handle `aria-orientation` dinamis — default horizontal, tapi arrow Up/Down juga jalan (tidak eksklusif). Sederhana, cukup untuk kasus ini (semua tab horizontal).
- Tidak handle focus trap — tab nav satu baris, Tab key keluar ke panel wajar.

### Pemakaian (tab utama, `index.jsx`)
```jsx
const activeIdx = tabs.findIndex(t => t.id === activeTab);
const { tabRefs, onKeyDown, getTabIndex } = useTabsKeyboard({
  count: tabs.length, activeIndex: activeIdx,
  onChange: (i) => setActiveTab(tabs[i].id),
});

<nav role="tablist" aria-orientation="horizontal" className={styles.tabNav} onKeyDown={onKeyDown}>
  {tabs.map((tab, i) => (
    <button key={tab.id} role="tab" id={`tab-${tab.id}`} aria-selected={activeTab === tab.id}
      aria-controls={`panel-${tab.id}`} tabIndex={getTabIndex(i)}
      ref={el => (tabRefs.current[i] = el)}
      className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabActive : ''}`}
      onClick={() => setActiveTab(tab.id)}>
      {tab.label}
    </button>
  ))}
</nav>
<div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} tabIndex={0}>
  <ActiveComponent />
</div>
```

Sub-tab (`DeskriptifTab` dll) pakai pola sama, id prefix `subtab-`/`subpanel-` (cth `id="subtab-desk-materi"`, `aria-controls="subpanel-desk-materi"`) supaya tidak bentrok dengan tab utama di DOM yang sama.

## Section 3 — Komponen `Stepper`

```jsx
// src/components/StatistikGuide/Stepper.jsx
import { useState } from 'react';
import styles from './StatistikGuide.module.css';

export default function Stepper({ steps = [] }) {
  const [step, setStep] = useState(0);
  const total = steps.length;
  if (!total) return null;
  return (
    <div className={styles.tutorialStepper}>
      {/* Indicator: counter + dots */}
      <div className={styles.stepIndicator}>
        <span className={styles.stepCounter}>Step {step + 1} / {total}</span>
        <div className={styles.stepDots}>
          {steps.map((_, i) => (
            <div key={i} className={
              i === step ? styles.stepDotActive
              : i < step ? styles.stepDotDone
              : styles.stepDot
            } />
          ))}
        </div>
      </div>
      {/* Progress bar (existing) */}
      <div className={styles.stepProgress}>
        <div style={{ width: `${((step + 1) / total) * 100}%` }} />
      </div>
      {/* Step card (existing) */}
      <div className={styles.stepCard} key={step}>
        <h3>{steps[step].title}</h3>
        <p>{steps[step].desc}</p>
      </div>
      {/* Navigation (existing) */}
      <div className={styles.stepBtnRow}>
        <button className={styles.stepBtn} onClick={() => setStep(s => s - 1)} disabled={step === 0}>← Back</button>
        {step < total - 1
          ? <button className={styles.stepBtn} onClick={() => setStep(s => s + 1)}>Next →</button>
          : <span className={styles.stepDone}>✅ Selesai!</span>}
      </div>
    </div>
  );
}
```

- State `step` internal (self-contained, sama seperti 3 file sekarang).
- 3 file tutorial: hapus body inline, ganti `<Stepper steps={steps} />`. Array `steps` tetap di file masing-masing (konten beda per tutorial).

## Section 4 — CSS, Testing, Verifikasi

### CSS baru di `StatistikGuide.module.css` (theme tokens)
```css
.stepIndicator {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.stepCounter {
  font-size: 0.8rem;
  color: var(--muted);
  font-weight: 500;
}
.stepDots {
  display: flex;
  gap: 0.4rem;
}
.stepDot {
  width: 8px;
  height: 8px;
  border-radius: 99px;
  background: rgb(var(--border));
}
.stepDotActive {
  width: 8px;
  height: 8px;
  border-radius: 99px;
  background: rgb(var(--accent));
}
.stepDotDone {
  width: 8px;
  height: 8px;
  border-radius: 99px;
  background: rgb(var(--accent) / 0.4);
}
```
Class existing (`.tutorialStepper`/`.stepProgress`/`.stepCard`/`.stepBtnRow`/`.stepBtn`/`.stepDone`) tetap dipakai, tidak diubah.

### Testing
- `tests/unit/useTabsKeyboard.test.jsx` (`// @vitest-environment jsdom`):
  - ArrowRight pada activeIndex=0 → onChange dipanggil dengan 1.
  - ArrowRight pada activeIndex terakhir → wrap ke 0.
  - ArrowLeft pada activeIndex=0 → wrap ke terakhir.
  - Home → onChange(0); End → onChange(count-1).
  - `getTabIndex`: activeIndex → 0, lainnya → -1.
  - Tab key (Tab) tidak dipanggil onChange (bukan arrow) — tidak intercept.
- `tests/unit/Stepper.test.jsx` (`// @vitest-environment jsdom`):
  - Render "Step 1 / 5" + 5 dots saat 5 steps.
  - Klik Next → counter jadi "Step 2 / 5".
  - Back disabled saat step 0.
  - "Selesai" tampil saat step terakhir (Next hilang).
  - Empty steps → render null.

### Verifikasi
- `pnpm run build` → OK, no error.
- `pnpm test -- --run` → 357 + test baru pass, 9 pre-existing ttest tetap fail (0 regresi baru). Total naik sesuai jumlah test baru.
- Visual cek manual: tab utama & sub-tab bisa di-navigate pakai arrow keys, tab aktif dapat focus. Stepper tampil dots + counter.

## Yang TIDAK Termasuk Scope

- Ide #3 output SPSS real, #4 animasi interpretasi, #5 video panduan → sub-proyek terpisah.
- Home.jsx, UserDashboard, halaman lain → tidak diubah.
- `OverviewTab.jsx`/`FAQTab.jsx` → tidak punya sub-tab/stepper, tidak disentuh.
- Tidak ubah dark mode token, tidak ubah backend.

## Risiko & Mitigasi

- **Hook break tab nav existing** → mitigasi: hook opt-in (cuma dipanggil di 4 file), default onClick tetap jalan untuk mouse user. Test hook isolate.
- **`id` bentrok tab utama vs sub-tab** → mitigasi: prefix berbeda (`tab-` vs `subtab-`).
- **Stepper ekstrak ubah behavior** → mitigasi: state internal identik dengan 3 file sekarang (useState(0), Back/Next/selesai), cuma tambah indicator. CSS class existing dipakai ulang.

# Copy & Variasi Desain Per-Halaman — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Terapkan Hero Editorial header (3 DNA layout berbeda) + copy action-oriented di 9 halaman scope + ubah wizard skripsi jadi popup tombol top bar Home.

**Architecture:** Tambah prop `variant="hero"` opt-in ke `PageHeader` (default compact tetap, 15+ halaman luar scope tidak tersentuh). 3 sub-komponen kecil untuk bagian unik DNA per modul (`HeroFlow`, `HeroStepper`, `HeroPreview`). Wizard: reuse `GuidedWizardModal`, pindah trigger ke top bar Home, hapus entry point lama di Home (nav, card, trigger hero, footer link), keep fallback Help.jsx.

**Tech Stack:** Vite + React 18, Tailwind CSS 3, vitest + @testing-library/react, react-router-dom, lucide-react.

**Spec:** `docs/superpowers/specs/2026-06-30-copy-variasi-desain-design.md`

**Baseline:** commit `9322ffb` — build OK, 354/363 test (9 pre-existing di `ttest.js`, 0 regresi). Verifikasi baseline sebelum mulai Task 1.

**Critical constraints (AGENTS.md):**
- FRONTEND ONLY — NEVER touch `api/`, `*.py`, `requirements.txt`, `vercel.json`
- DO NOT change `package.json` dependencies
- Tests must stay green: `pnpm test -- --run` → 354/363 (9 pre-existing OK, 0 regresi baru)
- Design tokens: `rgb(var(--accent))` (gold), `rgb(var(--deep-teal))` (teal), `rgb(var(--warm-rose))` (terracotta). NO purple/gradient/glass/sparkles.

**Test environment note:** Codebase tidak punya component render test (354 test = unit test logik). Plan ini menambah component test baru — perlu setup vitest jsdom environment per-file via `// @vitest-environment jsdom` comment di tiap test file (codebase pakai vitest default node env, tidak ada global setup). Jangan ubah vite.config global env (bisa break 354 test lain).

---

## File Structure

**Create:**
- `src/components/hero/HeroFlow.jsx` — flow horizontal pill (Upload → Pilih uji → Hasil), dipakai Statistik
- `src/components/hero/HeroStepper.jsx` — stepper 3-step vertikal, dipakai Assessment
- `src/components/hero/HeroPreview.jsx` — preview mini struktur kuesioner, dipakai Kuesioner
- `tests/unit/PageHeader-hero.test.jsx` — render test PageHeader variant hero
- `tests/unit/HeroFlow.test.jsx`, `tests/unit/HeroStepper.test.jsx`, `tests/unit/HeroPreview.test.jsx`
- `tests/unit/GuidedWizardModal.test.jsx` — render test popup CTA

**Modify:**
- `src/components/PageHeader.jsx` — tambah `variant`, `eyebrow`, `tagline`, `accent` props + render hero
- `src/components/statistik/GuidedWizardModal.jsx` — upgrade header copy CTA
- `src/pages/Home.jsx` — tambah tombol top bar, hapus nav/card/trigger/footer wizard
- 9 halaman scope: `Statistik.jsx`, `StatistikHistory.jsx`, `StatistikReport.jsx`, `StatistikPower.jsx`, `StatistikBatch.jsx`, `StatistikCompare.jsx`, `StatistikGuide.jsx`, `Assessment.jsx`, `Kuesioner.jsx` — opt-in `variant="hero"` + props copy

---

## Task 1: Setup & Verifikasi Baseline

**Files:** (none modified)

- [ ] **Step 1: Verifikasi baseline bersih**

Run:
```bash
cd "C:\Users\User\Documents\Project Assesment\zoya.id-beta"
npx pnpm test -- --run 2>&1 | tail -5
```
Expected: `354 passed, 9 failed` (363 total). 9 failed = `tests/statistics/ttest.test.js` (pre-existing, di luar scope). Bukan 0 failed — kalau 0 failed berarti baseline sudah berubah, hentikan & cek.

- [ ] **Step 2: Verifikasi build**

Run:
```bash
npx pnpm run build 2>&1 | tail -5
```
Expected: `✓ built` + PWA precache entries. Tidak ada error.

- [ ] **Step 3: Buat branch kerja**

```bash
git checkout -b feat/copy-variasi-desain
```

---

## Task 2: HeroFlow Komponen (Statistik DNA)

**Files:**
- Create: `src/components/hero/HeroFlow.jsx`
- Test: `tests/unit/HeroFlow.test.jsx`

- [ ] **Step 1: Tulis failing test**

Create `tests/unit/HeroFlow.test.jsx`:
```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HeroFlow from '../../src/components/hero/HeroFlow';

describe('HeroFlow', () => {
  it('render semua step dengan label', () => {
    render(
      <MemoryRouter>
        <HeroFlow steps={['Upload', 'Pilih uji', 'Hasil + interpretasi']} />
      </MemoryRouter>
    );
    expect(screen.getByText('Upload')).toBeTruthy();
    expect(screen.getByText('Pilih uji')).toBeTruthy();
    expect(screen.getByText('Hasil + interpretasi')).toBeTruthy();
  });

  it('render arrow antar step', () => {
    const { container } = render(
      <MemoryRouter>
        <HeroFlow steps={['Upload', 'Pilih uji', 'Hasil']} />
      </MemoryRouter>
    );
    // arrow = → karakter; 2 arrow untuk 3 step
    const arrows = container.querySelectorAll('[data-testid="flow-arrow"]');
    expect(arrows.length).toBe(2);
  });

  it('first step aktif (accent border), sisanya netral', () => {
    const { container } = render(
      <MemoryRouter>
        <HeroFlow steps={['Upload', 'Pilih uji', 'Hasil']} />
      </MemoryRouter>
    );
    const pills = container.querySelectorAll('[data-testid="flow-step"]');
    expect(pills[0].getAttribute('data-active')).toBe('true');
    expect(pills[1].getAttribute('data-active')).toBe('false');
  });
});
```

- [ ] **Step 2: Run test, verifikasi fail**

Run:
```bash
npx pnpm test -- --run tests/unit/HeroFlow.test.jsx 2>&1 | tail -10
```
Expected: FAIL — `Cannot find module '../../src/components/hero/HeroFlow'`

- [ ] **Step 3: Implementasi HeroFlow**

Create `src/components/hero/HeroFlow.jsx`:
```jsx
// HeroFlow — flow horizontal pill inline di hero Statistik.
// Visualisasi alur tool: Upload → Pilih uji → Hasil.
// Step pertama aktif (accent border), sisanya netral (border default).
import { ArrowRight } from 'lucide-react';

/**
 * @param {object} props
 * @param {string[]} props.steps - label tiap step (cth: ['Upload', 'Pilih uji', 'Hasil'])
 */
export default function HeroFlow({ steps = [] }) {
  if (!steps.length) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span
            data-testid="flow-step"
            data-active={i === 0 ? 'true' : 'false'}
            className="px-2.5 py-1 rounded-full text-xs font-medium border"
            style={
              i === 0
                ? { borderColor: 'rgb(var(--accent) / 0.5)', background: 'rgb(var(--accent) / 0.08)', color: 'rgb(var(--accent))' }
                : { borderColor: 'rgb(var(--border))', color: 'rgb(var(--muted))' }
            }
          >
            {label}
          </span>
          {i < steps.length - 1 && (
            <ArrowRight
              data-testid="flow-arrow"
              className="w-3 h-3"
              style={{ color: 'rgb(var(--accent))' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test, verifikasi pass**

Run:
```bash
npx pnpm test -- --run tests/unit/HeroFlow.test.jsx 2>&1 | tail -10
```
Expected: PASS — 3 test passed

- [ ] **Step 5: Commit**

```bash
git add src/components/hero/HeroFlow.jsx tests/unit/HeroFlow.test.jsx
git commit -m "feat(hero): add HeroFlow komponen — flow horizontal Statistik DNA"
```

---

## Task 3: HeroStepper Komponen (Assessment DNA)

**Files:**
- Create: `src/components/hero/HeroStepper.jsx`
- Test: `tests/unit/HeroStepper.test.jsx`

- [ ] **Step 1: Tulis failing test**

Create `tests/unit/HeroStepper.test.jsx`:
```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HeroStepper from '../../src/components/hero/HeroStepper';

describe('HeroStepper', () => {
  it('render semua step dengan nomor + label', () => {
    render(
      <MemoryRouter>
        <HeroStepper steps={['Rubrik', 'Jawaban siswa', 'Skor + komentar']} />
      </MemoryRouter>
    );
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('Rubrik')).toBeTruthy();
    expect(screen.getByText('Jawaban siswa')).toBeTruthy();
    expect(screen.getByText('Skor + komentar')).toBeTruthy();
  });

  it('first step aktif (filled), sisanya outlined', () => {
    const { container } = render(
      <MemoryRouter>
        <HeroStepper steps={['Rubrik', 'Jawaban', 'Skor']} />
      </MemoryRouter>
    );
    const circles = container.querySelectorAll('[data-testid="step-circle"]');
    expect(circles[0].getAttribute('data-active')).toBe('true');
    expect(circles[1].getAttribute('data-active')).toBe('false');
  });

  it('render connector line antar step', () => {
    const { container } = render(
      <MemoryRouter>
        <HeroStepper steps={['Rubrik', 'Jawaban', 'Skor']} />
      </MemoryRouter>
    );
    const connectors = container.querySelectorAll('[data-testid="step-connector"]');
    expect(connectors.length).toBe(2); // 2 connector untuk 3 step
  });
});
```

- [ ] **Step 2: Run test, verifikasi fail**

Run:
```bash
npx pnpm test -- --run tests/unit/HeroStepper.test.jsx 2>&1 | tail -10
```
Expected: FAIL — module not found

- [ ] **Step 3: Implementasi HeroStepper**

Create `src/components/hero/HeroStepper.jsx`:
```jsx
// HeroStepper — stepper 3-step vertikal di kolom kanan hero Assessment.
// Step pertama aktif (filled teal), sisanya outlined.
// Connector: garis vertikal tipis antar step.
export default function HeroStepper({ steps = [] }) {
  if (!steps.length) return null;
  return (
    <div
      className="rounded-lg border p-2.5"
      style={{
        borderColor: 'rgb(var(--border))',
        background: 'rgb(var(--card))',
      }}
    >
      <div
        className="text-[10px] uppercase tracking-wider mb-1.5"
        style={{ color: 'rgb(var(--muted))' }}
      >
        Alur
      </div>
      <div className="flex flex-col gap-1.5">
        {steps.map((label, i) => (
          <div key={i}>
            <div className="flex items-center gap-1.5 text-xs">
              <span
                data-testid="step-circle"
                data-active={i === 0 ? 'true' : 'false'}
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-semibold"
                style={
                  i === 0
                    ? { background: 'rgb(var(--deep-teal))', color: 'rgb(var(--card))' }
                    : { border: '1px solid rgb(var(--deep-teal) / 0.5)', color: 'rgb(var(--deep-teal))' }
                }
              >
                {i + 1}
              </span>
              <span style={{ color: 'rgb(var(--fg))' }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                data-testid="step-connector"
                className="w-px h-1.5 ml-[7px]"
                style={{ background: 'rgb(var(--deep-teal) / 0.4)' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test, verifikasi pass**

Run:
```bash
npx pnpm test -- --run tests/unit/HeroStepper.test.jsx 2>&1 | tail -10
```
Expected: PASS — 3 test passed

- [ ] **Step 5: Commit**

```bash
git add src/components/hero/HeroStepper.jsx tests/unit/HeroStepper.test.jsx
git commit -m "feat(hero): add HeroStepper komponen — stepper vertikal Assessment DNA"
```

---

## Task 4: HeroPreview Komponen (Kuesioner DNA)

**Files:**
- Create: `src/components/hero/HeroPreview.jsx`
- Test: `tests/unit/HeroPreview.test.jsx`

- [ ] **Step 1: Tulis failing test**

Create `tests/unit/HeroPreview.test.jsx`:
```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HeroPreview from '../../src/components/hero/HeroPreview';

describe('HeroPreview', () => {
  it('render label "Struktur" + tiap section', () => {
    render(
      <MemoryRouter>
        <HeroPreview sections={[
          { title: 'Bagian 1 · Demografi', items: 3 },
          { title: 'Bagian 2 · Likert', items: 5 },
        ]} />
      </MemoryRouter>
    );
    expect(screen.getByText('Struktur')).toBeTruthy();
    expect(screen.getByText('Bagian 1 · Demografi')).toBeTruthy();
    expect(screen.getByText('Bagian 2 · Likert')).toBeTruthy();
  });

  it('render item bars sesuai jumlah items per section', () => {
    const { container } = render(
      <MemoryRouter>
        <HeroPreview sections={[
          { title: 'Bagian 1', items: 3 },
          { title: 'Bagian 2', items: 2 },
        ]} />
      </MemoryRouter>
    );
    const bars = container.querySelectorAll('[data-testid="preview-bar"]');
    expect(bars.length).toBe(5); // 3 + 2
  });
});
```

- [ ] **Step 2: Run test, verifikasi fail**

Run:
```bash
npx pnpm test -- --run tests/unit/HeroPreview.test.jsx 2>&1 | tail -10
```
Expected: FAIL — module not found

- [ ] **Step 3: Implementasi HeroPreview**

Create `src/components/hero/HeroPreview.jsx`:
```jsx
// HeroPreview — preview mini struktur kuesioner di kolom kanan hero Kuesioner.
// Tampilkan section + item bars (placeholder visual struktur).
export default function HeroPreview({ sections = [] }) {
  if (!sections.length) return null;
  return (
    <div
      className="rounded-lg border p-2"
      style={{
        borderColor: 'rgb(var(--border))',
        background: 'rgb(var(--card))',
      }}
    >
      <div
        className="text-[10px] mb-1.5"
        style={{ color: 'rgb(var(--muted))' }}
      >
        Struktur
      </div>
      {sections.map((sec, i) => (
        <div key={i} className="mb-1.5 last:mb-0">
          <div
            className="text-xs font-semibold mb-1"
            style={{ color: 'rgb(var(--fg))' }}
          >
            {sec.title}
          </div>
          {Array.from({ length: sec.items }).map((_, j) => (
            <div
              key={j}
              data-testid="preview-bar"
              className="h-1 rounded mb-0.5 last:mb-0"
              style={{
                background: 'rgb(var(--warm-rose) / 0.25)',
                width: j === sec.items - 1 ? '55%' : '100%',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test, verifikasi pass**

Run:
```bash
npx pnpm test -- --run tests/unit/HeroPreview.test.jsx 2>&1 | tail -10
```
Expected: PASS — 2 test passed

- [ ] **Step 5: Commit**

```bash
git add src/components/hero/HeroPreview.jsx tests/unit/HeroPreview.test.jsx
git commit -m "feat(hero): add HeroPreview komponen — preview struktur Kuesioner DNA"
```

---

## Task 5: PageHeader `variant="hero"` + props baru

**Files:**
- Modify: `src/components/PageHeader.jsx` (tambah render hero block)
- Test: `tests/unit/PageHeader-hero.test.jsx`

- [ ] **Step 1: Tulis failing test**

Create `tests/unit/PageHeader-hero.test.jsx`:
```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PageHeader from '../../src/components/PageHeader';

const wrap = (props) => render(<MemoryRouter><PageHeader {...props} /></MemoryRouter>);

describe('PageHeader variant="hero"', () => {
  it('render eyebrow + judul + tagline saat variant hero', () => {
    wrap({
      variant: 'hero',
      eyebrow: 'STATISTIK',
      title: 'Uji data kamu',
      tagline: 'Upload Excel → pilih uji → dapat hasil.',
    });
    expect(screen.getByText('STATISTIK')).toBeTruthy();
    expect(screen.getByText('Uji data kamu')).toBeTruthy();
    expect(screen.getByText('Upload Excel → pilih uji → dapat hasil.')).toBeTruthy();
  });

  it('compact default tidak render tagline (backward-compat)', () => {
    wrap({ title: 'Analisis', subtitle: 'Modul Statistik' });
    expect(screen.getByText('Modul Statistik')).toBeTruthy(); // subtitle tetap
    expect(screen.queryByText('Upload Excel → pilih uji → dapat hasil.')).toBeNull();
  });

  it('accent gold default untuk eyebrow', () => {
    const { container } = wrap({
      variant: 'hero', eyebrow: 'STATISTIK', title: 'T', tagline: 'x',
    });
    const eyebrow = container.querySelector('[data-testid="hero-eyebrow"]');
    expect(eyebrow.style.color).toContain('accent'); // rgb(var(--accent))
  });

  it('accent teal mengubah warna eyebrow', () => {
    const { container } = wrap({
      variant: 'hero', eyebrow: 'ASSESSMENT', title: 'T', tagline: 'x', accent: 'teal',
    });
    const eyebrow = container.querySelector('[data-testid="hero-eyebrow"]');
    expect(eyebrow.style.color).toContain('deep-teal');
  });
});
```

- [ ] **Step 2: Run test, verifikasi fail**

Run:
```bash
npx pnpm test -- --run tests/unit/PageHeader-hero.test.jsx 2>&1 | tail -10
```
Expected: FAIL — tagline/eyebrow tidak render (props belum ada)

- [ ] **Step 3: Implementasi render hero di PageHeader**

Modify `src/components/PageHeader.jsx`. Tambah import di atas:
```jsx
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ChevronLeft, Home } from 'lucide-react'

// Accent token map: gold default, teal, terracotta
const ACCENT_TOKEN = {
  gold: 'rgb(var(--accent))',
  teal: 'rgb(var(--deep-teal))',
  terracotta: 'rgb(var(--warm-rose))',
}
```

Ganti signature destructure (baris setelah `export default function PageHeader(`) jadi:
```jsx
export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  tagline,
  accent = 'gold',
  variant = 'compact',
  parentPath = '/',
  parentLabel = 'Beranda',
  breadcrumbs,
  subNav,
  right,
  actions,
  heroExtra,  // ReactNode: HeroFlow / HeroStepper / HeroPreview
}) {
```

Ganti block `{/* Title row */}` (yang mulai `(title || subtitle) &&`) dengan logic conditional variant. Ganti seluruh block itu dengan:
```jsx
        {/* Title row — compact (default) */}
        {variant === 'compact' && (title || subtitle) && (
          <div className="mt-2">
            {subtitle && (
              <div
                className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] font-semibold mb-0.5"
                style={{ color: 'rgb(var(--muted) / 0.9)' }}
              >
                {subtitle}
              </div>
            )}
            {title && (
              <h1
                className="text-lg sm:text-xl font-bold leading-tight"
                style={{ color: 'rgb(var(--fg))' }}
              >
                {title}
              </h1>
            )}
          </div>
        )}

        {/* Title row — hero (opt-in) */}
        {variant === 'hero' && (eyebrow || title || tagline) && (
          <div className="mt-3">
            {eyebrow && (
              <div
                data-testid="hero-eyebrow"
                className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] font-semibold mb-1"
                style={{ color: ACCENT_TOKEN[accent] }}
              >
                {eyebrow}
              </div>
            )}
            {title && (
              <h1
                className="font-heading text-2xl sm:text-3xl font-bold leading-tight"
                style={{ color: 'rgb(var(--fg))' }}
              >
                {title}
              </h1>
            )}
            {tagline && (
              <p
                className="text-sm mt-1"
                style={{ color: 'rgb(var(--muted))' }}
              >
                {tagline}
              </p>
            )}
            {heroExtra && (
              <div className="mt-3">{heroExtra}</div>
            )}
          </div>
        )}
```

- [ ] **Step 4: Run test, verifikasi pass**

Run:
```bash
npx pnpm test -- --run tests/unit/PageHeader-hero.test.jsx 2>&1 | tail -10
```
Expected: PASS — 4 test passed

- [ ] **Step 5: Verifikasi tidak break halaman luar scope**

Run full test suite:
```bash
npx pnpm test -- --run 2>&1 | tail -5
```
Expected: `357 passed, 9 failed` (363 → 366 total, +4 baru dari Task 2-5). 9 failed tetap pre-existing ttest.js. Tidak ada fail baru.

- [ ] **Step 6: Commit**

```bash
git add src/components/PageHeader.jsx tests/unit/PageHeader-hero.test.jsx
git commit -m "feat(PageHeader): add variant=hero + eyebrow/tagline/accent/heroExtra props"
```

---

## Task 6: Opt-in Statistik + sub-pages (7 file) ke variant hero

**Files:**
- Modify: `src/pages/Statistik.jsx`, `StatistikHistory.jsx`, `StatistikReport.jsx`, `StatistikPower.jsx`, `StatistikBatch.jsx`, `StatistikCompare.jsx`, `StatistikGuide.jsx`

- [ ] **Step 1: Statistik.jsx — opt-in hero + HeroFlow**

Modify `src/pages/Statistik.jsx` sekitar baris 782-786. Ganti block `<PageHeader` yang ada `title="Analisis Statistik" subtitle="Modul Statistik"` jadi:
```jsx
      <PageHeader
        title="Uji data kamu"
        eyebrow="STATISTIK"
        tagline="Upload Excel → pilih uji → dapat angka + interpretasi siap kutip."
        variant="hero"
        accent="gold"
        parentPath="/"
        parentLabel="Beranda"
        heroExtra={<HeroFlow steps={['Upload', 'Pilih uji', 'Hasil + interpretasi']} />}
```
Tambah import di atas file: `import HeroFlow from '../components/hero/HeroFlow'`
Pertahankan props lain yang sudah ada (`subNav`, `breadcrumbs`, dll) — hanya ganti/title/subtitle + tambah props hero.

- [ ] **Step 2: Hapus tagline marketing di StatistikFlow.jsx**

Find di `src/components/statistik/StatistikFlow.jsx` sekitar baris 785 teks "Dari data mentah menjadi kesimpulan yang siap ditulis". Hapus element JSX yang berisi teks itu (ganti dengan `null` atau hapus block). PageHeader hero sudah jelas, tagline marketing redundan.

- [ ] **Step 3: StatistikHistory.jsx — opt-in hero**

Ganti `<PageHeader title="..." subtitle="...">` jadi:
```jsx
      <PageHeader
        title="Riwayat analisis"
        eyebrow="STATISTIK · RIWAYAT"
        tagline="Buka ulang, bandingkan, atau lanjutkan analisis tersimpan."
        variant="hero"
        accent="gold"
        parentPath="/statistik"
        parentLabel="Statistik"
```
(Pertahankan props lain. Jangan tambah HeroFlow — History tidak punya flow upload.)

- [ ] **Step 4: StatistikReport.jsx (Bab IV) — opt-in hero**

Ganti `<PageHeader` jadi:
```jsx
      <PageHeader
        title="Draft Bab IV"
        eyebrow="STATISTIK · BAB IV"
        tagline="Pilih analisis tersimpan → generate narasi siap tempel."
        variant="hero"
        accent="gold"
        parentPath="/statistik"
        parentLabel="Statistik"
```

- [ ] **Step 5: StatistikPower.jsx — opt-in hero**

Ganti `<PageHeader` jadi:
```jsx
      <PageHeader
        title="Hitung ukuran sampel"
        eyebrow="STATISTIK · POWER"
        tagline="Estimasi daya & jumlah responden minimal sebelum survei."
        variant="hero"
        accent="gold"
        parentPath="/statistik"
        parentLabel="Statistik"
```

- [ ] **Step 6: StatistikBatch.jsx — opt-in hero**

Ganti `<PageHeader` jadi:
```jsx
      <PageHeader
        title="Batch banyak file"
        eyebrow="STATISTIK · BATCH"
        tagline="Jalankan uji yang sama untuk banyak file sekaligus."
        variant="hero"
        accent="gold"
        parentPath="/statistik"
        parentLabel="Statistik"
```

- [ ] **Step 7: StatistikCompare.jsx — opt-in hero**

Ganti `<PageHeader` jadi:
```jsx
      <PageHeader
        title="Bandingkan analisis"
        eyebrow="STATISTIK · BANDING"
        tagline="Tarik dua analisis berdampingan — lihat bedanya."
        variant="hero"
        accent="gold"
        parentPath="/statistik"
        parentLabel="Statistik"
```

- [ ] **Step 8: StatistikGuide.jsx (Dokumentasi) — opt-in hero**

Ganti `<PageHeader` jadi:
```jsx
      <PageHeader
        title="Pelajari tiap uji"
        eyebrow="STATISTIK · PANDUAN"
        tagline="Referensi: kapan pakai, rumus, & bacaan output."
        variant="hero"
        accent="gold"
        parentPath="/statistik"
        parentLabel="Statistik"
```

- [ ] **Step 9: Build & visual cek**

Run:
```bash
npx pnpm run build 2>&1 | tail -5
```
Expected: `✓ built`, no error. Lalu `npx pnpm run dev` & cek manual 7 halaman: hero tampil, halaman luar scope (Settings, Legal) tetap compact.

- [ ] **Step 10: Run full test suite**

Run:
```bash
npx pnpm test -- --run 2>&1 | tail -5
```
Expected: `357 passed, 9 failed` (tidak ada regresi baru).

- [ ] **Step 11: Commit**

```bash
git add src/pages/Statistik.jsx src/pages/StatistikHistory.jsx src/pages/StatistikReport.jsx src/pages/StatistikPower.jsx src/pages/StatistikBatch.jsx src/pages/StatistikCompare.jsx src/pages/StatistikGuide.jsx src/components/statistik/StatistikFlow.jsx
git commit -m "feat(statistik): opt-in hero editorial + copy action-oriented di 7 halaman"
```

---

## Task 7: Opt-in Assessment.jsx ke variant hero + HeroStepper

**Files:**
- Modify: `src/pages/Assessment.jsx` (sekitar baris 1514)

- [ ] **Step 1: Assessment.jsx — opt-in hero + HeroStepper**

Ganti block `<PageHeader` di baris ~1514 (yang ada `subtitle={title || 'Penilaian tugas dengan AI'}`) jadi:
```jsx
      <PageHeader
        title="Nilai tugas pakai AI"
        eyebrow="ASSESSMENT"
        tagline="Buat rubrik → upload jawaban siswa → dapat skor + komentar otomatis."
        variant="hero"
        accent="teal"
        parentPath="/"
        parentLabel="Beranda"
        heroExtra={<HeroStepper steps={['Rubrik', 'Jawaban siswa', 'Skor + komentar']} />}
        right={stepIndicator}
        actions={
          <Link
            to="/kuesioner"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-card hover:bg-accent/10 text-accent border-border transition-colors active:scale-95"
            title="Buka Kuesioner Builder"
          >
            <ListChecks className="w-3.5 h-3.5" /> Kuesioner
          </Link>
        }
```
Tambah import: `import HeroStepper from '../components/hero/HeroStepper'`
Pertahankan `right={stepIndicator}` & `actions` yang sudah ada — hanya ganti subtitle→eyebrow+tagline + tambah variant/heroExtra.

- [ ] **Step 2: Build & visual cek**

Run:
```bash
npx pnpm run build 2>&1 | tail -5
```
Expected: `✓ built`. Cek manual: hero Assessment tampil stepper 3-step vertikal di kanan, accent teal.

- [ ] **Step 3: Run test suite**

Run:
```bash
npx pnpm test -- --run 2>&1 | tail -5
```
Expected: `357 passed, 9 failed` (0 regresi).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Assessment.jsx
git commit -m "feat(assessment): opt-in hero editorial + HeroStepper, accent teal"
```

---

## Task 8: Opt-in Kuesioner.jsx ke variant hero + HeroPreview

**Files:**
- Modify: `src/pages/Kuesioner.jsx` (sekitar baris 197)

- [ ] **Step 1: Kuesioner.jsx — opt-in hero + HeroPreview**

Ganti block `<PageHeader` di baris ~197 jadi:
```jsx
      <PageHeader
        title="Susun instrumen survei"
        eyebrow="KUESIONER"
        tagline="Buat butir → generate pakai AI → kumpulkan respons langsung."
        variant="hero"
        accent="terracotta"
        parentPath="/"
        parentLabel="Beranda"
        heroExtra={
          <HeroPreview sections={[
            { title: 'Bagian 1 · Demografi', items: 3 },
            { title: 'Bagian 2 · Likert', items: 5 },
          ]} />
        }
```
Tambah import: `import HeroPreview from '../components/hero/HeroPreview'`
Pertahankan props lain yang sudah ada.

- [ ] **Step 2: Build & visual cek**

Run:
```bash
npx pnpm run build 2>&1 | tail -5
```
Expected: `✓ built`. Cek manual: hero Kuesioner tampil preview struktur di kanan, accent terracotta.

- [ ] **Step 3: Run test suite**

Run:
```bash
npx pnpm test -- --run 2>&1 | tail -5
```
Expected: `357 passed, 9 failed` (0 regresi).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Kuesioner.jsx
git commit -m "feat(kuesioner): opt-in hero editorial + HeroPreview, accent terracotta"
```

---

## Task 9: GuidedWizardModal — upgrade header copy CTA

**Files:**
- Modify: `src/components/statistik/GuidedWizardModal.jsx`
- Test: `tests/unit/GuidedWizardModal.test.jsx`

- [ ] **Step 1: Tulis failing test**

Create `tests/unit/GuidedWizardModal.test.jsx`:
```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GuidedWizardModal from '../../src/components/statistik/GuidedWizardModal';

describe('GuidedWizardModal', () => {
  it('render header CTA "Ingin dibantu skripsi?" saat open', () => {
    render(
      <MemoryRouter>
        <GuidedWizardModal open={true} onClose={() => {}} onComplete={() => {}} onSkip={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Ingin dibantu skripsi/i)).toBeTruthy();
  });

  it('render deskripsi checklist Bab 1-sidang', () => {
    render(
      <MemoryRouter>
        <GuidedWizardModal open={true} onClose={() => {}} onComplete={() => {}} onSkip={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Bab 1/i)).toBeTruthy();
  });

  it('tidak render apa-apa saat open=false', () => {
    const { container } = render(
      <MemoryRouter>
        <GuidedWizardModal open={false} onClose={() => {}} onComplete={() => {}} onSkip={() => {}} />
      </MemoryRouter>
    );
    expect(container.innerHTML).toBe('');
  });
});
```

- [ ] **Step 2: Run test, verifikasi fail**

Run:
```bash
npx pnpm test -- --run tests/unit/GuidedWizardModal.test.jsx 2>&1 | tail -10
```
Expected: FAIL — text "Ingin dibantu skripsi?" tidak ditemukan (copy lama beda)

- [ ] **Step 3: Upgrade header copy GuidedWizardModal**

Modify `src/components/statistik/GuidedWizardModal.jsx`. Baca file dulu, lalu cari block header/judul modal (render bagian atas, sebelum `intents` map). Ganti judul lama dengan:
```jsx
        <h2 className="font-heading text-xl font-bold" style={{ color: 'rgb(var(--fg))' }}>
          Ingin dibantu skripsi?
        </h2>
        <p className="text-sm mt-1" style={{ color: 'rgb(var(--muted))' }}>
          Checklist terstruktur dari Bab 1 sampai sidang — pilih jenis penelitian, ikuti langkahnya.
        </p>
```
Pertahankan logic `intents` map, `handleComplete`, `handleDismiss` — tidak ubah behavior, hanya copy header.

- [ ] **Step 4: Run test, verifikasi pass**

Run:
```bash
npx pnpm test -- --run tests/unit/GuidedWizardModal.test.jsx 2>&1 | tail -10
```
Expected: PASS — 3 test passed

- [ ] **Step 5: Commit**

```bash
git add src/components/statistik/GuidedWizardModal.jsx tests/unit/GuidedWizardModal.test.jsx
git commit -m "feat(wizard): upgrade GuidedWizardModal header CTA 'Ingin dibantu skripsi?'"
```

---

## Task 10: Home — tambah tombol top bar + hapus entry wizard lama

**Files:**
- Modify: `src/pages/Home.jsx`

- [ ] **Step 1: Tambah tombol ghost accent di top bar desktop**

Modify `src/pages/Home.jsx` sekitar baris 270-286 (block `<div className="flex items-center gap-2">` yang berisi ThemeToggle + Masuk/Dashboard). Sisipkan tombol wizard **setelah** ThemeToggle & **sebelum** Masuk/Dashboard Link:
```jsx
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setWizardOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/40 text-accent bg-accent/5 hover:bg-accent/10 text-xs font-semibold transition-all"
              >
                <Compass className="w-3.5 h-3.5" />
                Ingin dibantu skripsi?
              </button>
              {user ? (
```
Pertahankan `{user ? ... : ...}` block & mobile menu button di bawahnya — hanya sisip tombol wizard.

- [ ] **Step 2: Tambah tombol di mobile menu**

Modify block mobile menu (baris ~302-329). Sebelum `<Link to={user ? "/dashboard" : "/auth"} ...>` terakhir, sisipkan:
```jsx
              <button
                onClick={() => { setWizardOpen(true); setMobileOpen(false); }}
                className="flex items-center gap-1.5 py-2 text-sm font-semibold text-accent"
              >
                <Compass className="w-3.5 h-3.5" />
                Ingin dibantu skripsi?
              </button>
```

- [ ] **Step 3: Hapus trigger "Bingung? Pilihkan untuk saya" di hero**

Hapus block button di baris 380-386 (button dengan `onClick={() => setWizardOpen(true)}` + teks "Bingung? Pilihkan untuk saya"). Gantikan tombol top bar. Pertahankan button "Mulai analisis" & button "Lihat layanan" di sekitarnya.

- [ ] **Step 4: Hapus card "03 Panduan Skripsi" dari SERVICES**

Hapus object ke-3 di array `SERVICES` (baris 176-185, object dengan `title: "Panduan Skripsi"`, `path: "/wizard"`, `accent: "terracotta"`). Setelah hapus, card "04 Assessment & Rubrik" jadi no "03" — ganti field `no: "04"` jadi `no: "03"`. Pastikan sisa array valid (koma, bracket).

- [ ] **Step 5: Hapus link "Panduan" di footer Home**

Hapus baris 707: `<Link to="/wizard" ...>Panduan</Link>`. (Footer Home = bagian Home, konsisten dihapus. Fallback deep-link tetap di Help.jsx — cek Task 11.)

- [ ] **Step 6: Build & visual cek**

Run:
```bash
npx pnpm run build 2>&1 | tail -5
```
Expected: `✓ built`. Cek manual Home: tombol "Ingin dibantu skripsi?" di top bar, klik → popup muncul dengan copy baru. Card "Panduan Skripsi" hilang dari services. Nav footer "Panduan" hilang.

- [ ] **Step 7: Run test suite**

Run:
```bash
npx pnpm test -- --run 2>&1 | tail -5
```
Expected: `360 passed, 9 failed` (366 → 369 total, +3 dari Task 9). 0 regresi.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Home.jsx
git commit -m "feat(home): tambah tombol wizard top bar + hapus entry wizard lama (nav/card/footer)"
```

---

## Task 11: Verifikasi fallback Help.jsx tetap intact

**Files:** (read-only verification — tidak modifikasi)

- [ ] **Step 1: Konfirmasi link /wizard di Help.jsx tetap ada**

Run:
```bash
grep -n "/wizard\|Panduan Skripsi" src/pages/Help.jsx
```
Expected: ada 4 hasil (link fallback deep-link tetap, tidak tersentuh). Ini sesuai spec: keep Help.jsx + footer (Help) sebagai fallback. Kalau 0 hasil, fallback hilang — hentikan & restore.

- [ ] **Step 2: Konfirmasi route /wizard tetap ada di router**

Run:
```bash
grep -n "SkripsiWizard\|/wizard" src/App.jsx src/router.jsx src/main.jsx 2>/dev/null
```
Expected: route `/wizard` → `SkripsiWizard` tetap terdaftar (fallback URL accessible).

---

## Task 12: Final verifikasi + update laporan.md

**Files:**
- Modify: `laporan.md`

- [ ] **Step 1: Full build**

Run:
```bash
npx pnpm run build 2>&1 | tail -5
```
Expected: `✓ built`, PWA precache entries. Tidak ada error.

- [ ] **Step 2: Full test suite**

Run:
```bash
npx pnpm test -- --run 2>&1 | tail -5
```
Expected: `360 passed, 9 failed` (369 total). 9 failed = pre-existing ttest.js. 0 regresi baru.

- [ ] **Step 3: Visual cek manual 9 halaman scope**

Jalankan `npx pnpm run dev`, cek:
- Statistik: hero gold + HeroFlow (Upload→Pilih uji→Hasil)
- 6 sub-statistik: hero gold, eyebrow "STATISTIK · X", tanpa HeroFlow
- Assessment: hero teal + HeroStepper vertikal
- Kuesioner: hero terracotta + HeroPreview struktur
- Home: tombol top bar "Ingin dibantu skripsi?" → popup copy baru
- Halaman luar scope (Settings, Legal, EFA): tetap compact, tidak berubah

- [ ] **Step 4: Update laporan.md**

Tambah entry di section progress:
```markdown
- **2026-06-30 (sub-proyek A v2)**: Copy & variasi desain — Hero Editorial (3 DNA layout: Statistik flow / Assessment stepper / Kuesioner preview) di 9 halaman scope, copy action-oriented, wizard jadi popup top bar Home. PageHeader `variant="hero"` opt-in (halaman luar scope tetap compact). Build OK, 360/369 test (9 pre-existing, 0 regresi).
```

- [ ] **Step 5: Commit final**

```bash
git add laporan.md
git commit -m "docs: update laporan — sub-proyek A v2 (copy & variasi desain) selesai"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Section 1 Hero Editorial → Task 5 (PageHeader) + Task 6-8 (opt-in 9 halaman)
- ✅ Section 1 DNA 3 layout → Task 2 (HeroFlow), Task 3 (HeroStepper), Task 4 (HeroPreview)
- ✅ Section 2 copy action → Task 6 (7 halaman statistik) + Task 7-8 (Assessment/Kuesioner)
- ✅ Section 2 hapus subtitle generik → Task 6 Step 1, Task 7 Step 1, Task 8 Step 1
- ✅ Section 2 hapus tagline marketing → Task 6 Step 2
- ✅ Section 3 wizard tombol top bar → Task 10 Step 1-2
- ✅ Section 3 reuse GuidedWizardModal + copy → Task 9
- ✅ Section 3 hapus nav/card/trigger/footer → Task 10 Step 3-5
- ✅ Section 3 keep fallback → Task 11 (verifikasi Help.jsx + route)

**Type consistency:** props `variant`, `eyebrow`, `tagline`, `accent`, `heroExtra` konsisten di Task 5 (definisi) → Task 6-8 (pakai). `HeroFlow`/`HeroStepper`/`HeroPreview` prop `steps`/`sections` konsisten.

**Tidak ada placeholder/TBD** — semua step punya kode konkret.

# StatistikGuide A11y + Stepper Indicator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah a11y WAI-ARIA tabs pattern penuh (roving tabindex + arrow keys + Home/End + focus) ke tab utama + 3 sub-tab StatistikGuide, dan ekstrak komponen `Stepper` bersama dengan indicator (dots + "Step X / Y") untuk 3 file tutorial.

**Architecture:** Custom hook `useTabsKeyboard` reusable untuk logic keyboard (dipakai 4 tempat). Komponen `Stepper` self-contained menggantikan 3 stepper inline identik. CSS baru di `StatistikGuide.module.css` pakai theme tokens (NO hardcoded warna). ARIA attrs (`role="tablist"/"tab"/"tabpanel"`, `aria-selected`/`aria-controls`/`aria-labelledby`, roving `tabIndex`) ditambah ke nav existing.

**Tech Stack:** Vite + React 18, CSS Modules, vitest + @testing-library/react v16.3.2 (renderHook tersedia), jsdom via `// @vitest-environment jsdom` per-file.

**Spec:** `docs/superpowers/specs/2026-06-30-statistikguide-a11y-stepper-design.md`

**Baseline:** commit `34bce3b` (main) — build OK, 357/366 test (9 pre-existing di `ttest.js`, 0 regresi). Branch kerja: `feat/statistikguide-a11y-stepper` (sudah dibuat, spec sudah di-commit).

**Critical constraints (AGENTS.md):**
- FRONTEND ONLY — NEVER touch `api/`, `*.py`, `requirements.txt`, `vercel.json`
- DO NOT change `package.json` dependencies
- Tests must stay green: 9 pre-existing fail OK, 0 regresi baru
- **Pakai theme tokens** (`rgb(var(--accent))`, `rgb(var(--border))`, `var(--muted)`) — NO hardcoded `#3b82f6`/`#6366f1`/indigo/gray

**Test environment note:** Codebase pakai vitest default node env. Test file baru WAJIB diawali `// @vitest-environment jsdom` (pola dari sub-proyek A: `tests/unit/PageHeader-hero.test.jsx` dll). Jangan ubah vite.config global env.

---

## File Structure

**Create (4 file):**
- `src/components/StatistikGuide/useTabsKeyboard.js` — hook roving tabindex + arrow/Home/End + focus management
- `src/components/StatistikGuide/Stepper.jsx` — komponen stepper bersama (indicator + bar + card + nav)
- `tests/unit/useTabsKeyboard.test.jsx` — unit test hook
- `tests/unit/Stepper.test.jsx` — render test Stepper

**Modify (7 file):**
- `src/components/StatistikGuide/index.jsx` — tab utama a11y
- `src/components/StatistikGuide/tabs/DeskriptifTab.jsx`, `InferensialTab.jsx`, `RegresiTab.jsx` — sub-tab a11y
- `src/components/StatistikGuide/tabs/tutorials/DeskriptifTutorial.jsx`, `InferensialTutorial.jsx`, `RegresiTutorial.jsx` — ganti stepper inline → `<Stepper steps={steps} />`
- `src/components/StatistikGuide/StatistikGuide.module.css` — tambah class indicator/dots

---

## Task 1: Verifikasi Baseline

**Files:** (none modified)

- [ ] **Step 1: Verifikasi baseline bersih**

Run:
```bash
cd "C:\Users\User\Documents\Project Assesment\zoya.id-beta"
npx pnpm test -- --run 2>&1 | grep -E "Tests |Test Files "
```
Expected: `9 failed | 357 passed` (366 total). 9 failed = pre-existing `ttest.test.js`. Bukan 0 failed — kalau 0 failed berarti baseline sudah berubah, hentikan & cek.

- [ ] **Step 2: Verifikasi build**

Run:
```bash
npx pnpm run build 2>&1 | tail -3
```
Expected: `✓ built` + PWA precache entries. Tidak ada error.

- [ ] **Step 3: Konfirmasi branch kerja**

Run:
```bash
git branch --show-current
```
Expected: `feat/statistikguide-a11y-stepper`. (Sudah dibuat saat commit spec. Kalau belum, `git checkout -b feat/statistikguide-a11y-stepper`.)

---

## Task 2: useTabsKeyboard Hook (TDD)

**Files:**
- Create: `tests/unit/useTabsKeyboard.test.jsx`
- Create: `src/components/StatistikGuide/useTabsKeyboard.js`

- [ ] **Step 1: Tulis failing test**

Create `tests/unit/useTabsKeyboard.test.jsx`:
```jsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useTabsKeyboard from '../../src/components/StatistikGuide/useTabsKeyboard';

const mkEvent = (key) => ({ key, preventDefault: () => {} });

describe('useTabsKeyboard', () => {
  it('ArrowRight advances to next tab', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTabsKeyboard({ count: 3, activeIndex: 0, onChange }));
    act(() => { result.current.onKeyDown(mkEvent('ArrowRight')); });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('ArrowRight wraps from last to first', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTabsKeyboard({ count: 3, activeIndex: 2, onChange }));
    act(() => { result.current.onKeyDown(mkEvent('ArrowRight')); });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('ArrowLeft wraps from first to last', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTabsKeyboard({ count: 3, activeIndex: 0, onChange }));
    act(() => { result.current.onKeyDown(mkEvent('ArrowLeft')); });
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('ArrowDown/ArrowUp also navigate', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTabsKeyboard({ count: 3, activeIndex: 0, onChange }));
    act(() => { result.current.onKeyDown(mkEvent('ArrowDown')); });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('Home goes to first tab', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTabsKeyboard({ count: 3, activeIndex: 1, onChange }));
    act(() => { result.current.onKeyDown(mkEvent('Home')); });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('End goes to last tab', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTabsKeyboard({ count: 3, activeIndex: 0, onChange }));
    act(() => { result.current.onKeyDown(mkEvent('End')); });
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('non-navigation key does not call onChange', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTabsKeyboard({ count: 3, activeIndex: 0, onChange }));
    act(() => { result.current.onKeyDown(mkEvent('Enter')); });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('getTabIndex: active tab is 0, others -1 (roving)', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTabsKeyboard({ count: 3, activeIndex: 1, onChange }));
    expect(result.current.getTabIndex(0)).toBe(-1);
    expect(result.current.getTabIndex(1)).toBe(0);
    expect(result.current.getTabIndex(2)).toBe(-1);
  });

  it('count=0 is safe (no crash)', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTabsKeyboard({ count: 0, activeIndex: -1, onChange }));
    act(() => { result.current.onKeyDown(mkEvent('ArrowRight')); });
    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.getTabIndex(0)).toBe(-1);
  });
});
```

- [ ] **Step 2: Run test, verifikasi fail**

Run:
```bash
npx pnpm test -- --run tests/unit/useTabsKeyboard.test.jsx 2>&1 | tail -10
```
Expected: FAIL — `Cannot find module '../../src/components/StatistikGuide/useTabsKeyboard'`

- [ ] **Step 3: Implementasi hook**

Create `src/components/StatistikGuide/useTabsKeyboard.js`:
```js
import { useRef } from 'react';

/**
 * WAI-ARIA tabs keyboard helper (automatic activation).
 * Roving tabindex + Arrow Left/Right/Up/Down + Home/End + focus management.
 *
 * @param {object} opts
 * @param {number} opts.count       - jumlah tab
 * @param {number} opts.activeIndex - index tab aktif saat ini
 * @param {(i:number)=>void} opts.onChange - dipanggil saat tab berubah via keyboard
 * @returns {{tabRefs: React.MutableRefObject<Array>, onKeyDown: Function, getTabIndex: Function}}
 */
export default function useTabsKeyboard({ count, activeIndex, onChange }) {
  const tabRefs = useRef([]);

  if (!count) {
    return { tabRefs, onKeyDown: () => {}, getTabIndex: () => -1 };
  }

  const focusTab = (i) => {
    tabRefs.current[i]?.focus?.();
  };

  const onKeyDown = (e) => {
    const key = e.key;
    let next = null;
    if (key === 'ArrowRight' || key === 'ArrowDown') {
      next = (activeIndex + 1) % count;
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      next = (activeIndex - 1 + count) % count;
    } else if (key === 'Home') {
      next = 0;
    } else if (key === 'End') {
      next = count - 1;
    } else {
      return; // jangan intercept key lain (Enter/Space/Tab dll)
    }
    e.preventDefault();
    if (next !== activeIndex) {
      onChange(next);
      focusTab(next);
    }
  };

  const getTabIndex = (i) => (i === activeIndex ? 0 : -1);

  return { tabRefs, onKeyDown, getTabIndex };
}
```

- [ ] **Step 4: Run test, verifikasi pass**

Run:
```bash
npx pnpm test -- --run tests/unit/useTabsKeyboard.test.jsx 2>&1 | tail -10
```
Expected: PASS — 9 test passed

- [ ] **Step 5: Commit**

```bash
git add src/components/StatistikGuide/useTabsKeyboard.js tests/unit/useTabsKeyboard.test.jsx
git commit -m "feat(a11y): add useTabsKeyboard hook — WAI-ARIA tabs roving tabindex + arrow keys"
```

---

## Task 3: Stepper Komponen (TDD)

**Files:**
- Create: `tests/unit/Stepper.test.jsx`
- Create: `src/components/StatistikGuide/Stepper.jsx`

- [ ] **Step 1: Tulis failing test**

Create `tests/unit/Stepper.test.jsx`:
```jsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Stepper from '../../src/components/StatistikGuide/Stepper';

const steps = [
  { title: '1. A', desc: 'aaa' },
  { title: '2. B', desc: 'bbb' },
  { title: '3. C', desc: 'ccc' },
  { title: '4. D', desc: 'ddd' },
  { title: '5. E', desc: 'eee' },
];

describe('Stepper', () => {
  it('render counter "Step 1 / 5" + 5 dots', () => {
    render(<Stepper steps={steps} />);
    expect(screen.getByTestId('step-counter').textContent).toBe('Step 1 / 5');
    expect(screen.getAllByTestId('step-dot').length).toBe(5);
  });

  it('first dot active, others pending', () => {
    render(<Stepper steps={steps} />);
    const dots = screen.getAllByTestId('step-dot');
    expect(dots[0].getAttribute('data-state')).toBe('active');
    expect(dots[1].getAttribute('data-state')).toBe('pending');
  });

  it('Next advances counter + dot state', () => {
    render(<Stepper steps={steps} />);
    fireEvent.click(screen.getByTestId('step-next'));
    expect(screen.getByTestId('step-counter').textContent).toBe('Step 2 / 5');
    const dots = screen.getAllByTestId('step-dot');
    expect(dots[0].getAttribute('data-state')).toBe('done');
    expect(dots[1].getAttribute('data-state')).toBe('active');
  });

  it('Back disabled at step 0', () => {
    render(<Stepper steps={steps} />);
    expect(screen.getByTestId('step-back').hasAttribute('disabled')).toBe(true);
  });

  it('last step: "Selesai" shown, Next gone', () => {
    render(<Stepper steps={steps} />);
    // advance to last (4 clicks)
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByTestId('step-next'));
    expect(screen.getByText(/Selesai/)).toBeTruthy();
    expect(screen.queryByTestId('step-next')).toBeNull();
  });

  it('empty steps renders null', () => {
    const { container } = render(<Stepper steps={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
```

- [ ] **Step 2: Run test, verifikasi fail**

Run:
```bash
npx pnpm test -- --run tests/unit/Stepper.test.jsx 2>&1 | tail -10
```
Expected: FAIL — `Cannot find module '../../src/components/StatistikGuide/Stepper'`

- [ ] **Step 3: Implementasi Stepper**

Create `src/components/StatistikGuide/Stepper.jsx`:
```jsx
import { useState } from 'react';
import styles from './StatistikGuide.module.css';

/**
 * Stepper bersama untuk tutorial StatistikGuide.
 * Indicator: counter "Step X / Y" + dots (active/done/pending) + progress bar.
 * @param {object} props
 * @param {{title:string, desc:string}[]} props.steps
 */
export default function Stepper({ steps = [] }) {
  const [step, setStep] = useState(0);
  const total = steps.length;
  if (!total) return null;

  const dotState = (i) => (i === step ? 'active' : i < step ? 'done' : 'pending');
  const dotClass = (i) =>
    i === step ? styles.stepDotActive : i < step ? styles.stepDotDone : styles.stepDot;

  return (
    <div className={styles.tutorialStepper}>
      <div className={styles.stepIndicator}>
        <span data-testid="step-counter" className={styles.stepCounter}>
          Step {step + 1} / {total}
        </span>
        <div className={styles.stepDots}>
          {steps.map((_, i) => (
            <div
              key={i}
              data-testid="step-dot"
              data-state={dotState(i)}
              className={dotClass(i)}
            />
          ))}
        </div>
      </div>

      <div className={styles.stepProgress}>
        <div style={{ width: `${((step + 1) / total) * 100}%` }} />
      </div>

      <div className={styles.stepCard} key={step}>
        <h3>{steps[step].title}</h3>
        <p>{steps[step].desc}</p>
      </div>

      <div className={styles.stepBtnRow}>
        <button
          data-testid="step-back"
          className={styles.stepBtn}
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          ← Back
        </button>
        {step < total - 1 ? (
          <button
            data-testid="step-next"
            className={styles.stepBtn}
            onClick={() => setStep((s) => s + 1)}
          >
            Next →
          </button>
        ) : (
          <span className={styles.stepDone}>✅ Selesai!</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test, verifikasi pass**

Run:
```bash
npx pnpm test -- --run tests/unit/Stepper.test.jsx 2>&1 | tail -10
```
Expected: PASS — 6 test passed. (CSS class `styles.stepIndicator` dll belum ada — tapi CSS Modules return empty string untuk missing class, tidak crash. Test pass karena cek testid/text, bukan class. CSS ditambah di Task 4.)

- [ ] **Step 5: Commit**

```bash
git add src/components/StatistikGuide/Stepper.jsx tests/unit/Stepper.test.jsx
git commit -m "feat(stepper): add Stepper komponen bersama — indicator dots + counter"
```

---

## Task 4: CSS Indicator & Dots

**Files:**
- Modify: `src/components/StatistikGuide/StatistikGuide.module.css`

- [ ] **Step 1: Tambah class indicator/dots**

Di `src/components/StatistikGuide/StatistikGuide.module.css`, tambahkan block ini **sebelum** comment `/* Tutorial stepper */` (sekitar baris 281), tepat setelah block `.subTabActive`:

```css
/* Stepper indicator (dots + counter) */
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
  transition: background 0.2s ease;
}

.stepDotActive {
  width: 8px;
  height: 8px;
  border-radius: 99px;
  background: rgb(var(--accent));
  transition: background 0.2s ease;
}

.stepDotDone {
  width: 8px;
  height: 8px;
  border-radius: 99px;
  background: rgb(var(--accent) / 0.4);
  transition: background 0.2s ease;
}
```

Catatan: class existing (`.tutorialStepper`/`.stepProgress`/`.stepCard`/`.stepBtnRow`/`.stepBtn`/`.stepDone`) TIDAK diubah — hanya pakai ulang.

- [ ] **Step 2: Verifikasi build**

Run:
```bash
npx pnpm run build 2>&1 | tail -3
```
Expected: `✓ built`, no error.

- [ ] **Step 3: Commit**

```bash
git add src/components/StatistikGuide/StatistikGuide.module.css
git commit -m "style(statistik-guide): add stepIndicator/stepDots CSS — theme tokens"
```

---

## Task 5: Tab Utama A11y (index.jsx)

**Files:**
- Modify: `src/components/StatistikGuide/index.jsx`

- [ ] **Step 1: Tambah import hook**

Di `src/components/StatistikGuide/index.jsx`, setelah baris `import styles from './StatistikGuide.module.css';` (baris 4), tambahkan:
```jsx
import useTabsKeyboard from './useTabsKeyboard';
```

- [ ] **Step 2: Pakai hook di komponen**

Ganti block `const StatistikGuide = () => {` sampai `const ActiveComponent = ...` (baris 20-22) jadi:
```jsx
const StatistikGuide = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const activeIdx = tabs.findIndex((t) => t.id === activeTab);
  const ActiveComponent = tabs[activeIdx]?.component || OverviewTab;
  const { tabRefs, onKeyDown, getTabIndex } = useTabsKeyboard({
    count: tabs.length,
    activeIndex: activeIdx,
    onChange: (i) => setActiveTab(tabs[i].id),
  });
```

- [ ] **Step 3: Tambah ARIA attrs ke tab nav + tabpanel**

Ganti block `<nav className={styles.tabNav}>` sampai `</nav>` + `<ActiveComponent />` (baris 40-52) jadi:
```jsx
        <nav
          role="tablist"
          aria-orientation="horizontal"
          className={styles.tabNav}
          onKeyDown={onKeyDown}
        >
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={getTabIndex(i)}
              ref={(el) => (tabRefs.current[i] = el)}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
        >
          <ActiveComponent />
        </div>
```

(Pertahankan `<p className={styles.subtitle}>` di atas nav — tidak diubah.)

- [ ] **Step 4: Build & test**

Run:
```bash
npx pnpm run build 2>&1 | tail -3 && echo "===TEST===" && npx pnpm test -- --run 2>&1 | grep -E "Tests |Test Files "
```
Expected: build OK. Test: `9 failed | 366 passed` (357 + 9 hook test dari Task 2; 366 total sebelum Stepper test — lihat Step 4 Task 3 sebelumnya sudah add 6). Catatan: jalankan setelah Task 2 & 3 sudah committed. 0 regresi (9 fail tetap pre-existing).

- [ ] **Step 5: Commit**

```bash
git add src/components/StatistikGuide/index.jsx
git commit -m "feat(a11y): tab utama StatistikGuide — WAI-ARIA tablist + keyboard nav"
```

---

## Task 6: Sub-tab A11y (3 Tab files)

**Files:**
- Modify: `src/components/StatistikGuide/tabs/DeskriptifTab.jsx`, `InferensialTab.jsx`, `RegresiTab.jsx`

Setiap file punya struktur sub-tab identik (2 button: Materi/Tutorial, state `activeSubTab`). Id prefix per file: `desk`/`inf`/`reg`.

- [ ] **Step 1: DeskriptifTab.jsx — import + hook + ARIA**

Tambah import setelah `import styles from '../StatistikGuide.module.css';`:
```jsx
import useTabsKeyboard from '../useTabsKeyboard';
```

Ganti block `const DeskriptifTab = () => {` ... `const [activeSubTab, setActiveSubTab] = useState('materi');` jadi:
```jsx
const DeskriptifTab = () => {
  const [showSpss, setShowSpss] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('materi');
  const subTabs = ['materi', 'tutorial'];
  const subIdx = subTabs.indexOf(activeSubTab);
  const { tabRefs, onKeyDown, getTabIndex } = useTabsKeyboard({
    count: subTabs.length,
    activeIndex: subIdx,
    onChange: (i) => setActiveSubTab(subTabs[i]),
  });
```

Ganti block `<div className={styles.subTabRow}>` sampai `</div>` (sub-tab toggle, baris 13-26) jadi:
```jsx
      <div
        role="tablist"
        aria-orientation="horizontal"
        className={styles.subTabRow}
        onKeyDown={onKeyDown}
      >
        <button
          role="tab"
          id="subtab-desk-materi"
          aria-selected={activeSubTab === 'materi'}
          aria-controls="subpanel-desk"
          tabIndex={getTabIndex(0)}
          ref={(el) => (tabRefs.current[0] = el)}
          onClick={() => setActiveSubTab('materi')}
          className={activeSubTab === 'materi' ? styles.subTabActive : styles.subTab}
        >
          📖 Materi
        </button>
        <button
          role="tab"
          id="subtab-desk-tutorial"
          aria-selected={activeSubTab === 'tutorial'}
          aria-controls="subpanel-desk"
          tabIndex={getTabIndex(1)}
          ref={(el) => (tabRefs.current[1] = el)}
          onClick={() => setActiveSubTab('tutorial')}
          className={activeSubTab === 'tutorial' ? styles.subTabActive : styles.subTab}
        >
          🎬 Tutorial
        </button>
      </div>

      <div
        role="tabpanel"
        id="subpanel-desk"
        aria-labelledby={`subtab-desk-${activeSubTab}`}
        tabIndex={0}
      >
```

Lalu **tutup tabpanel** — tambahkan `</div>` sebelum `</div>` penutup komponen terakhir. Cari baris terakhir:
```jsx
      {activeSubTab === 'tutorial' && <DeskriptifTutorial />}
    </div>
  );
```
Ganti jadi:
```jsx
        {activeSubTab === 'tutorial' && <DeskriptifTutorial />}
      </div>
    </div>
  );
```

Catatan indentasi: dua conditional block (`{activeSubTab === 'materi' && (...)}` dan `{activeSubTab === 'tutorial' && ...}`) sekarang berada DI DALAM `<div role="tabpanel">`. Tambahkan `</div>` penutup tabpanel sebelum `</div>` penutup root.

- [ ] **Step 2: InferensialTab.jsx — sama, prefix `inf`**

Ulangi Step 1 tapi:
- import: `import useTabsKeyboard from '../useTabsKeyboard';`
- id: `subtab-inf-materi`, `subtab-inf-tutorial`, `subpanel-inf`
- `aria-labelledby={`subtab-inf-${activeSubTab}`}`
- komponen tutorial di akhir: `<InferensialTutorial />`

- [ ] **Step 3: RegresiTab.jsx — sama, prefix `reg`**

Ulangi Step 1 tapi:
- import: `import useTabsKeyboard from '../useTabsKeyboard';`
- id: `subtab-reg-materi`, `subtab-reg-tutorial`, `subpanel-reg`
- `aria-labelledby={`subtab-reg-${activeSubTab}`}`
- komponen tutorial di akhir: `<RegresiTutorial />`

- [ ] **Step 4: Build & test**

Run:
```bash
npx pnpm run build 2>&1 | tail -3 && echo "===TEST===" && npx pnpm test -- --run 2>&1 | grep -E "Tests |Test Files "
```
Expected: build OK, 0 regresi (9 fail pre-existing tetap).

- [ ] **Step 5: Commit**

```bash
git add src/components/StatistikGuide/tabs/DeskriptifTab.jsx src/components/StatistikGuide/tabs/InferensialTab.jsx src/components/StatistikGuide/tabs/RegresiTab.jsx
git commit -m "feat(a11y): sub-tab StatistikGuide — WAI-ARIA tablist + keyboard nav (3 file)"
```

---

## Task 7: Ganti Stepper Inline → <Stepper /> (3 tutorial files)

**Files:**
- Modify: `src/components/StatistikGuide/tabs/tutorials/DeskriptifTutorial.jsx`, `InferensialTutorial.jsx`, `RegresiTutorial.jsx`

3 file struktur identik: `import { useState } from 'react'` + array `steps` + komponen dengan stepper inline.

- [ ] **Step 1: DeskriptifTutorial.jsx — pakai Stepper**

Ganti seluruh isi file jadi:
```jsx
import Stepper from '../../Stepper';

const steps = [
  { title: "1. Kumpulkan Data", desc: "Susun data mentah ke dalam tabel atau daftar nilai." },
  { title: "2. Hitung Mean", desc: "Jumlahkan semua nilai lalu bagi dengan n. Contoh: (4+6+8)/3 = 6" },
  { title: "3. Cari Median", desc: "Urutkan data, ambil nilai tengah. Jika n genap, rata-rata 2 nilai tengah." },
  { title: "4. Tentukan mode", desc: "Nilai yang paling sering muncul dalam data." },
  { title: "5. Interpretasi", desc: "Bandingkan mean/median/mode untuk memahami distribusi data." },
];

export default function DeskriptifTutorial() {
  return <Stepper steps={steps} />;
}
```

- [ ] **Step 2: InferensialTutorial.jsx — pakai Stepper**

Ganti seluruh isi file jadi:
```jsx
import Stepper from '../../Stepper';

const steps = [
  { title: "1. Rumuskan H₀ & H₁", desc: "H₀ = tidak ada perbedaan. H₁ = ada perbedaan/pengaruh." },
  { title: "2. Pilih Uji Statistik", desc: "t-test untuk 2 kelompok, ANOVA untuk 3+, chi-square untuk kategorik." },
  { title: "3. Hitung Nilai Uji", desc: "Masukkan data ke rumus atau SPSS untuk dapat nilai t/F/χ²." },
  { title: "4. Bandingkan p-value & α", desc: "Jika p < 0.05 → tolak H₀. Jika p ≥ 0.05 → gagal tolak H₀." },
  { title: "5. Kesimpulan", desc: "Nyatakan hasil dalam kalimat: 'Terdapat perbedaan signifikan...'" },
];

export default function InferensialTutorial() {
  return <Stepper steps={steps} />;
}
```

- [ ] **Step 3: RegresiTutorial.jsx — pakai Stepper**

Ganti seluruh isi file jadi:
```jsx
import Stepper from '../../Stepper';

const steps = [
  { title: "1. Plot Data (Scatter)", desc: "Gambar scatter plot variabel X (independen) vs Y (dependen)." },
  { title: "2. Hitung Koefisien β", desc: "β = Σ(X-X̄)(Y-Ȳ) / Σ(X-X̄)². Intercept a = Ȳ - β·X̄" },
  { title: "3. Tulis Persamaan", desc: "Y = a + bX. Contoh: Y = 2.1 + 0.75X" },
  { title: "4. Cek R²", desc: "R² mendekati 1 = model fit bagus. R² = 0.94 → 94% variansi dijelaskan." },
  { title: "5. Prediksi", desc: "Masukkan nilai X baru ke persamaan untuk prediksi Y." },
];

export default function RegresiTutorial() {
  return <Stepper steps={steps} />;
}
```

- [ ] **Step 4: Build & test**

Run:
```bash
npx pnpm run build 2>&1 | tail -3 && echo "===TEST===" && npx pnpm test -- --run 2>&1 | grep -E "Tests |Test Files "
```
Expected: build OK, 0 regresi.

- [ ] **Step 5: Commit**

```bash
git add src/components/StatistikGuide/tabs/tutorials/DeskriptifTutorial.jsx src/components/StatistikGuide/tabs/tutorials/InferensialTutorial.jsx src/components/StatistikGuide/tabs/tutorials/RegresiTutorial.jsx
git commit -m "refactor(tutorial): ganti stepper inline dengan komponen <Stepper /> bersama (3 file)"
```

---

## Task 8: Final Verifikasi + Update laporan.md

**Files:**
- Modify: `laporan.md`

- [ ] **Step 1: Full build**

Run:
```bash
npx pnpm run build 2>&1 | tail -3
```
Expected: `✓ built`, PWA precache entries. Tidak ada error.

- [ ] **Step 2: Full test suite**

Run:
```bash
npx pnpm test -- --run 2>&1 | grep -E "Tests |Test Files "
```
Expected: `9 failed | 372 passed` (366 baseline + 9 hook + 6 stepper = 381 total; 9 pre-existing fail, 372 passed). 0 regresi baru. (Angka passed pastikan naik 15 dari 357 → 372.)

- [ ] **Step 3: Update laporan.md**

Tambah entry di section "Berikutnya" dan "Log Perubahan". Di "Berikutnya", hapus/tandai 2 ide a11y+stepper yang sudah dikerjakan. Tambah di Log Perubahan:
```markdown
- **2026-06-30 (sub-proyek B — a11y + stepper)**: StatistikGuide a11y WAI-ARIA tabs penuh (roving tabindex + arrow/Home/End + focus) di tab utama + 3 sub-tab via hook `useTabsKeyboard`. Ekstrak komponen `Stepper` bersama (indicator dots + "Step X / Y") ganti 3 stepper inline. CSS pakai theme tokens. Build OK, 372/381 test (9 pre-existing, 0 regresi). Spec: `docs/superpowers/specs/2026-06-30-statistikguide-a11y-stepper-design.md`.
```

- [ ] **Step 4: Commit**

```bash
git add laporan.md
git commit -m "docs: update laporan — sub-proyek B (a11y + stepper) selesai"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Section 1 arsitektur/file → Task 2-7 (create 4, modify 7)
- ✅ Section 2 hook useTabsKeyboard → Task 2
- ✅ Section 2 ARIA tablist/tab/tabpanel + roving → Task 5 (tab utama), Task 6 (sub-tab)
- ✅ Section 3 Stepper komponen → Task 3
- ✅ Section 4 CSS indicator/dots → Task 4
- ✅ Section 4 testing → Task 2 (hook), Task 3 (stepper)
- ✅ Section 4 verifikasi → Task 8

**Type consistency:** `useTabsKeyboard({count, activeIndex, onChange})` → `{tabRefs, onKeyDown, getTabIndex}` konsisten di Task 2 (definisi) → Task 5 & 6 (pakai). `Stepper` prop `steps` konsisten Task 3 → Task 7. Id prefix `tab-`/`panel-` (utama) vs `subtab-{desk,inf,reg}-`/`subpanel-{desk,inf,reg}` (sub) — eksplisit per file.

**No placeholder:** semua step punya kode konkret + command + expected output.

**Tidak ubah dark mode / backend / deps.** CSS class existing dipakai ulang (tidak diubah), hanya tambah class baru.

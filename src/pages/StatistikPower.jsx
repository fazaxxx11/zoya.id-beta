// Power Analysis (a priori) — kalkulator sample size & statistical power.
// Memberikan estimasi N minimum atau power untuk uji-uji utama:
// independent t-test, paired t-test, Pearson correlation, one-way ANOVA, chi-square.
// Konvensi Cohen disediakan via tombol cepat (small/medium/large).

import { useState, useMemo } from 'react'
import {
  powerIndependentT, powerPairedT, powerCorrelation,
  powerANOVA, powerChiSquare, COHEN_CONVENTIONS,
} from '../lib/stats'
import PageHeader from '../components/PageHeader'

const TESTS = [
  { id: 'indep_t',    name: 'Independent t-test',     esLabel: "Cohen's d", esKey: 'd', conv: 'd' },
  { id: 'paired_t',   name: 'Paired / One-sample t-test', esLabel: "Cohen's d", esKey: 'd', conv: 'd' },
  { id: 'correlation', name: 'Pearson Correlation',   esLabel: 'r',          esKey: 'r', conv: 'r' },
  { id: 'anova',      name: 'One-way ANOVA',          esLabel: "Cohen's f",  esKey: 'f', conv: 'f' },
  { id: 'chisquare',  name: 'Chi-Square',             esLabel: "Cohen's w",  esKey: 'w', conv: 'w' },
]

const SOLVE_OPTIONS = [
  { id: 'n',     label: 'Cari Sample Size (n)' },
  { id: 'power', label: 'Cari Power (1 − β)' },
  { id: 'es',    label: 'Cari Effect Size minimum' },
]

export default function StatistikPower() {
  const [testId, setTestId] = useState('indep_t')
  const [solve, setSolve] = useState('n')
  const [es, setEs] = useState(0.5)
  const [n, setN] = useState(30)
  const [alpha, setAlpha] = useState(0.05)
  const [power, setPower] = useState(0.80)
  const [twoTailed, setTwoTailed] = useState(true)
  const [k, setK] = useState(3)       // ANOVA only
  const [df, setDf] = useState(2)     // chi-square only

  const test = TESTS.find(t => t.id === testId)

  const result = useMemo(() => {
    try {
      const args = { alpha, power, twoTailed, solve }
      if (solve !== 'es') args[test.esKey] = es
      if (solve !== 'n') args.n = n
      switch (testId) {
        case 'indep_t':    return powerIndependentT({ d: es, ...args })
        case 'paired_t':   return powerPairedT({ d: es, ...args })
        case 'correlation': return powerCorrelation({ r: es, ...args })
        case 'anova':      return powerANOVA({ f: es, k, ...args })
        case 'chisquare':  return powerChiSquare({ w: es, df, ...args })
        default: return null
      }
    } catch (e) {
      return { error: e.message }
    }
  }, [testId, solve, es, n, alpha, power, twoTailed, k, df, test.esKey])

  const conv = COHEN_CONVENTIONS[test.conv] || {}
  const setConvEs = (level) => setEs(conv[level])

  return (
    <div className="min-h-screen bg-[#fafafa] pb-bottomnav">
      <PageHeader
        title="Kalkulator Sampel & Power"
        subtitle="Power Analysis"
        parentPath="/statistik"
        parentLabel="Statistik"
        breadcrumbs={[
          { path: '/statistik', label: 'Statistik' },
          { label: 'Power Analysis' },
        ]}
      />

      <main className="max-w-5xl mx-auto px-5 py-6 grid lg:grid-cols-2 gap-5">
        {/* Input column */}
        <div className="space-y-4">
          {/* Test picker */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-3">Jenis Uji</div>
            <div className="flex flex-wrap gap-2">
              {TESTS.map(t => (
                <button key={t.id} onClick={() => setTestId(t.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          testId === t.id
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-700 border-border hover:border-gray-400'
                        }`}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* What to solve */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-3">Hitung Apa?</div>
            <div className="grid grid-cols-3 gap-2">
              {SOLVE_OPTIONS.map(s => (
                <button key={s.id} onClick={() => setSolve(s.id)}
                        className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                          solve === s.id
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-700 border-border hover:border-gray-400'
                        }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Parameters */}
          <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium">Parameter</div>

            {/* Effect size (hide if solving for it) */}
            {solve !== 'es' && (
              <div>
                <Label>{test.esLabel} (effect size)</Label>
                <NumberInput value={es} onChange={setEs} step={0.05} min={0} />
                <div className="flex gap-2 mt-2">
                  {['small', 'medium', 'large'].map(level => (
                    <button key={level} onClick={() => setConvEs(level)}
                            className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-surface hover:bg-gray-200 text-gray-600 font-medium">
                      {level} ({conv[level]})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* n (hide if solving for it) */}
            {solve !== 'n' && (
              <div>
                <Label>{testId === 'indep_t' || testId === 'anova' ? 'n per grup' : 'Total n'}</Label>
                <NumberInput value={n} onChange={(v) => setN(Math.max(2, Math.round(v)))} step={1} min={2} />
              </div>
            )}

            {/* power (hide if solving for it) */}
            {solve !== 'power' && (
              <div>
                <Label>Power (1 − β)</Label>
                <NumberInput value={power} onChange={setPower} step={0.05} min={0.5} max={0.999} />
                <div className="text-[11px] text-muted mt-1">Konvensi umum: 0.80 (cukup), 0.90 (kuat).</div>
              </div>
            )}

            {/* alpha */}
            <div>
              <Label>Alpha (α)</Label>
              <NumberInput value={alpha} onChange={setAlpha} step={0.01} min={0.001} max={0.2} />
              <div className="text-[11px] text-muted mt-1">Konvensi: 0.05 (default), 0.01 (lebih ketat).</div>
            </div>

            {/* Tail toggle (not relevant for ANOVA / chi-square) */}
            {(testId === 'indep_t' || testId === 'paired_t' || testId === 'correlation') && (
              <div>
                <Label>Hipotesis</Label>
                <div className="flex gap-2">
                  <button onClick={() => setTwoTailed(true)}
                          className={`text-xs px-3 py-1.5 rounded-lg border ${twoTailed ? 'bg-gray-900 text-white border-gray-900' : 'border-border text-gray-700'}`}>
                    Two-tailed
                  </button>
                  <button onClick={() => setTwoTailed(false)}
                          className={`text-xs px-3 py-1.5 rounded-lg border ${!twoTailed ? 'bg-gray-900 text-white border-gray-900' : 'border-border text-gray-700'}`}>
                    One-tailed
                  </button>
                </div>
              </div>
            )}

            {/* Extra: k for ANOVA */}
            {testId === 'anova' && (
              <div>
                <Label>Jumlah grup (k)</Label>
                <NumberInput value={k} onChange={(v) => setK(Math.max(2, Math.round(v)))} step={1} min={2} />
              </div>
            )}

            {/* Extra: df for chi-square */}
            {testId === 'chisquare' && (
              <div>
                <Label>Derajat kebebasan (df)</Label>
                <NumberInput value={df} onChange={(v) => setDf(Math.max(1, Math.round(v)))} step={1} min={1} />
                <div className="text-[11px] text-muted mt-1">Untuk tabel R×C: df = (R−1)(C−1). Goodness-of-fit: df = kategori − 1.</div>
              </div>
            )}
          </div>
        </div>

        {/* Output column */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-border p-5 sticky top-20">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-1">Hasil</div>
            <div className="text-base font-semibold text-gray-900 mb-4">{test.name}</div>

            {result?.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {result.error}
              </div>
            ) : result ? (
              <ResultDisplay result={result} solve={solve} test={test} />
            ) : null}

            <div className="mt-5 pt-4 border-t border-border">
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium mb-2">Catatan</div>
              <p className="text-[12px] text-muted leading-relaxed">
                Power dihitung dengan aproksimasi normal (Patnaik-style untuk noncentral F/χ²).
                Akurasi tipikal ±5% dibandingkan G*Power untuk effect size sedang—besar.
                Untuk perencanaan publikasi penting, verifikasi dengan G*Power atau R <code>pwr</code>.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-2">Tabel Konvensi Cohen</div>
            <ConventionsTable />
          </div>
        </div>
      </main>
    </div>
  )
}

// ============================================================
// Subcomponents
// ============================================================
function ResultDisplay({ result, solve, test }) {
  // Pull out the "primary answer" depending on solve mode
  let primaryLabel, primaryValue
  if (solve === 'n') {
    if (result.nPerGroup != null) {
      primaryLabel = 'n per grup (total ' + result.nTotal + ')'
      primaryValue = result.nPerGroup
    } else {
      primaryLabel = 'Total n'
      primaryValue = result.n
    }
  } else if (solve === 'power') {
    primaryLabel = 'Power (1 − β)'
    primaryValue = (result.power * 100).toFixed(1) + '%'
  } else { // es
    const k = test.esKey
    primaryLabel = `${test.esLabel} minimum`
    primaryValue = result[k]?.toFixed(3)
  }

  return (
    <div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4 mb-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-700 font-medium mb-1">{primaryLabel}</div>
        <div className="text-3xl font-bold text-emerald-900 tabular-nums">{primaryValue}</div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {result[test.esKey] != null && (
          <Row label={test.esLabel} value={fmt(result[test.esKey], 3)} />
        )}
        {result.nPerGroup != null && (
          <Row label="n per grup" value={result.nPerGroup} />
        )}
        {result.nTotal != null && (
          <Row label="n total" value={result.nTotal} />
        )}
        {result.n != null && result.nPerGroup == null && (
          <Row label="n" value={result.n} />
        )}
        {result.power != null && (
          <Row label="Power" value={(result.power * 100).toFixed(1) + '%'} />
        )}
        <Row label="α" value={result.alpha} />
        {result.twoTailed != null && (
          <Row label="Tail" value={result.twoTailed ? 'two-tailed' : 'one-tailed'} />
        )}
        {result.k != null && (
          <Row label="k grup" value={result.k} />
        )}
        {result.df != null && (
          <Row label="df" value={result.df} />
        )}
      </dl>

      <div className="mt-4 pt-3 border-t border-border">
        <button
          onClick={() => navigator.clipboard.writeText(buildAPAReport(result, solve, test))}
          className="text-xs text-gray-600 hover:text-gray-900 border border-border hover:bg-surface px-3 py-1.5 rounded-lg"
        >
          Salin laporan APA
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-gray-800 tabular-nums">{value}</dd>
    </>
  )
}

function Label({ children }) {
  return <div className="text-[12px] font-medium text-gray-700 mb-1.5">{children}</div>
}

function NumberInput({ value, onChange, step = 0.01, min, max }) {
  return (
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      max={max}
      onChange={e => {
        const v = parseFloat(e.target.value)
        if (!isNaN(v)) onChange(v)
      }}
      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-gray-400 tabular-nums"
    />
  )
}

function ConventionsTable() {
  const rows = [
    { label: "Cohen's d (mean diff)", small: 0.20, medium: 0.50, large: 0.80 },
    { label: 'r (correlation)',       small: 0.10, medium: 0.30, large: 0.50 },
    { label: "f (ANOVA)",             small: 0.10, medium: 0.25, large: 0.40 },
    { label: 'f² (regression)',       small: 0.02, medium: 0.15, large: 0.35 },
    { label: "w (chi-square)",        small: 0.10, medium: 0.30, large: 0.50 },
  ]
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-muted uppercase tracking-wider">
          <tr>
            <th className="text-left py-1.5 pr-2 font-medium">Effect size</th>
            <th className="text-right py-1.5 px-2 font-medium">Small</th>
            <th className="text-right py-1.5 px-2 font-medium">Medium</th>
            <th className="text-right py-1.5 pl-2 font-medium">Large</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(r => (
            <tr key={r.label}>
              <td className="py-1.5 pr-2 text-gray-700">{r.label}</td>
              <td className="py-1.5 px-2 text-right tabular-nums text-gray-700">{r.small}</td>
              <td className="py-1.5 px-2 text-right tabular-nums text-gray-700">{r.medium}</td>
              <td className="py-1.5 pl-2 text-right tabular-nums text-gray-700">{r.large}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================
const fmt = (v, d = 3) => {
  if (v == null || (typeof v === 'number' && !isFinite(v))) return '—'
  if (typeof v === 'number') return Number(v).toFixed(d)
  return String(v)
}

function buildAPAReport(result, solve, test) {
  const esVal = result[test.esKey]
  const esStr = esVal != null ? `${test.esKey} = ${esVal.toFixed(2)}` : ''
  const pStr = result.power != null ? `power = ${(result.power * 100).toFixed(0)}%` : `power = ${(result.power * 100).toFixed(0)}%`
  const aStr = `α = ${result.alpha}`
  const nStr = result.nPerGroup
    ? `n = ${result.nPerGroup} per grup (total N = ${result.nTotal})`
    : `N = ${result.n}`
  return `Power analysis ${test.name}: ${esStr}, ${aStr}, ${pStr}, ${nStr}.`
}

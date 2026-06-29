// src/components/statistik/ResultCards.jsx
// Result display components for all statistical tests — Scholarly Editorial redesign.

import React, { useRef } from 'react';
import { BookOpen } from 'lucide-react';
import { Histogram, QQPlot, ScatterPlot, BoxPlot, ChartGrid } from '../charts/StatCharts'
import { HistogramChart, QQPlotChart } from '../charts'
import { ExportChartButton } from '../charts/ExportChartButton'
import { processHistogramData, processQQPlot, processScatterData } from '../../lib/chartUtils'
import StatTooltip from '../StatTooltip'

const num = (v, d = 3) => typeof v === 'number' ? v.toFixed(d) : (v ?? '—')
const pct = (p) => typeof p === 'number' ? (p < 0.001 ? '< 0.001' : p.toFixed(4)) : '—'

// ============================================================
// Shared primitives — scholarly, consistent
// ============================================================

// Status color helper — consistent mapping across all cards
function statusColor(ok) {
  return ok ? 'text-accent' : 'text-terracotta'
}

export const Stat = ({ label, value, accent, term }) => (
  <div className="rounded-lg p-2.5 bg-surface border border-border">
    <div className="text-[10px] text-muted tracking-wide uppercase font-heading">
      {term ? <StatTooltip term={term}>{label}</StatTooltip> : label}
    </div>
    <div className={`text-sm font-semibold font-mono mt-1 ${accent || 'text-fg'}`}>{value}</div>
  </div>
)

export const InterpBox = ({ children }) => (
  <div className="mt-5 p-4 bg-accent/5 border-l-2 border-accent rounded-r-lg">
    <div className="flex items-center gap-1.5 mb-1.5">
      <BookOpen className="w-3 h-3 text-accent" />
      <p className="text-[10px] font-heading font-semibold text-accent tracking-wider uppercase">Interpretasi</p>
    </div>
    <p className="text-sm text-fg leading-relaxed">{children}</p>
  </div>
)

export const ResultHeader = ({ title, significant, testLabel }) => (
  <div className={`flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl mb-5 border ${
    significant ? 'bg-accent/5 border-accent/30' : 'bg-surface border-border'
  }`}>
    <div className="flex items-center gap-2.5">
      <div className={`w-1.5 h-8 rounded-full ${significant ? 'bg-accent' : 'bg-muted/30'}`} />
      <div>
        <h3 className="font-heading font-bold text-base tracking-tight">{title}</h3>
        {testLabel && (
          <span className="text-[11px] text-muted">{testLabel}</span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className={`text-[11px] font-heading font-semibold px-3 py-1 rounded-full ${
        significant ? 'bg-accent text-accent-fg' : 'bg-muted/10 text-muted'
      }`}>
        {significant ? 'Signifikan' : 'Tidak Signifikan'}
      </span>
    </div>
  </div>
)

export const KeyMetric = ({ label, value, highlight }) => (
  <div className={`text-center px-4 py-3 rounded-lg border ${
    highlight ? 'bg-accent/8 border-accent/30' : 'bg-surface border-border'
  }`}>
    <div className="text-[10px] text-muted tracking-wider uppercase mb-1 font-heading">{label}</div>
    <div className={`text-xl font-heading font-bold font-mono ${highlight ? 'text-accent' : 'text-fg'}`}>{value}</div>
  </div>
)

// Reusable table wrapper — scholarly frame
const TableFrame = ({ children, note }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm border-collapse">
      {children}
    </table>
    {note && <p className="text-[11px] text-muted mt-2">{note}</p>}
  </div>
)

// Table header cell — scholarly serif
const Th = ({ children, className = '' }) => (
  <th className={`px-3 py-2 text-left font-heading font-semibold text-muted text-xs uppercase tracking-wider border-b border-border bg-surface/50 ${className}`}>
    {children}
  </th>
)

// Table data cell
const Td = ({ children, className = '' }) => (
  <td className={`px-3 py-2 border-b border-border/40 ${className}`}>{children}</td>
)

// Section sub-heading
const SubHeading = ({ children }) => (
  <div className="flex items-center gap-2 mb-2 mt-1">
    <h4 className="font-heading font-semibold text-sm tracking-tight">{children}</h4>
    <span className="flex-1 h-px bg-border" />
  </div>
)

// ============================================================
// 1. Descriptive
// ============================================================
export function DescriptiveResult({ r }) {
  return (
    <div>
      <div className="overflow-x-auto border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface/60">
          <tr>
            {['Variabel','N','Mean','Median','Modus','SD','Var','Min','Max','Skew','Kurt','SEM'].map(h => (
              <th key={h} className="px-3 py-2 text-left font-heading font-semibold text-muted text-xs uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {r.stats.map((s, i) => (
            <tr key={i} className="hover:bg-surface/30">
              <td className="px-3 py-2 font-medium">{s.column}</td>
              <td className="px-3 py-2">{s.n}</td>
              <td className="px-3 py-2 font-semibold text-accent font-mono">{s.mean}</td>
              <td className="px-3 py-2">{s.median}</td>
              <td className="px-3 py-2">{s.mode}</td>
              <td className="px-3 py-2">{s.stdDev}</td>
              <td className="px-3 py-2">{s.variance}</td>
              <td className="px-3 py-2">{s.min}</td>
              <td className="px-3 py-2">{s.max}</td>
              <td className="px-3 py-2">{s.skewness}</td>
              <td className="px-3 py-2">{s.kurtosis}</td>
              <td className="px-3 py-2">{s.sem}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <p className="text-[11px] text-muted mt-3">SD &amp; Variance dihitung dengan formula sample (n−1).</p>
      <ChartGrid>
        {r.stats.map((s, i) => (
          <Histogram key={i} values={s.values} title={`Histogram: ${s.column}`} xLabel={s.column} />
        ))}
      </ChartGrid>
    </div>
  )
}

// ============================================================
// 2. Normality
// ============================================================
export function NormalityResult({ r }) {
  const rows = r.results || [{ column: r.column, ...r }]
  const anyNotNormal = rows.some(row => !row.isNormal)

  const histogramRef = useRef(null)
  const qqPlotRef = useRef(null)

  return (
    <div>
      <ResultHeader title="Uji Normalitas" significant={anyNotNormal} />
      <div className="overflow-x-auto border border-border rounded-lg overflow-hidden mb-4">
      <table className="w-full text-sm">
        <thead className="bg-surface/60">
          <tr>
            {['Variabel', 'Metode', 'Statistik', 'p-value', 'Status', 'Kesimpulan'].map(h => (
              <th key={h} className="px-3 py-2 text-left font-heading font-semibold text-muted text-xs uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-surface/30 align-top">
              <td className="px-3 py-2 font-medium">{row.column}</td>
              <td className="px-3 py-2">{row.method}</td>
              <td className="px-3 py-2 font-mono">{num(row.W ?? row.D, 4)}</td>
              <td className="px-3 py-2 font-semibold font-mono">{pct(row.pValue)}</td>
              <td className={'px-3 py-2 font-semibold ' + statusColor(row.isNormal)}>
                {row.isNormal ? 'Normal' : 'Tidak Normal'}
              </td>
              <td className="px-3 py-2 text-xs text-muted max-w-md">{row.interpretation}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <p className="text-[11px] text-muted mb-4">
        H₀: data berdistribusi normal. Jika p &gt; 0.05 → tidak ada bukti tolak H₀ → data dianggap normal.
      </p>

      {rows.map((row, i) => row.values && (
        <div key={i} className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <SubHeading>Visualisasi: {row.column}</SubHeading>
            <div className="flex gap-2">
              <ExportChartButton chartRef={histogramRef} filename={`histogram-${row.column}`} />
              <ExportChartButton chartRef={qqPlotRef} filename={`qqplot-${row.column}`} />
            </div>
          </div>

          <div ref={histogramRef} className="bg-card p-3 rounded-lg border border-border">
            <HistogramChart
              data={processHistogramData(row.values)}
              title={`Histogram: ${row.column}`}
            />
          </div>

          <div ref={qqPlotRef} className="bg-card p-3 rounded-lg border border-border">
            <QQPlotChart
              data={processQQPlot(row.values)}
              title="Q-Q Plot (Normalitas)"
            />
          </div>

          <ChartGrid>
            <Histogram values={row.values} title="Histogram + kurva normal" xLabel={row.column} overlayNormal />
            <QQPlot values={row.values} title="Q-Q Plot (Normal)" />
          </ChartGrid>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// 3. Correlation
// ============================================================
export function CorrelationResult({ r }) {
  const methodLabel = r.method === 'spearman' ? 'Spearman' : r.method === 'kendall' ? "Kendall's τ" : 'Pearson'
  return (
    <div>
      <ResultHeader title="Korelasi" significant={r.significant} testLabel={r.tau !== undefined ? "Kendall's τ-b" : undefined} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KeyMetric label="p-value" value={pct(r.pValue)} highlight={r.significant} />
        <KeyMetric label={r.method === 'spearman' ? 'ρ' : r.tau !== undefined ? 'τb' : 'r'} value={num(r.r ?? r.rho ?? r.tau, 3)} highlight={r.significant} />
        <KeyMetric label="n" value={r.n} />
        <Stat label="Metode" value={methodLabel} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {r.t !== undefined && <Stat label="t" value={num(r.t)} />}
        {r.z !== undefined && <Stat label="z" value={num(r.z, 3)} />}
        {r.df !== undefined && <Stat label="df" value={r.df} />}
        <Stat label="Kekuatan" value={r.strength} accent={r.significant ? 'text-accent' : 'text-muted'} />
        <Stat label="Arah" value={r.direction} />
        {r.ci95 && <Stat label="95% CI" value={`[${num(r.ci95[0])}, ${num(r.ci95[1])}]`} />}
      </div>
      {r.xValues && r.yValues && (
        <div className="mt-4">
          <ScatterPlot x={r.xValues} y={r.yValues}
                       title={`Scatter: ${r.x} vs ${r.y}`} xLabel={r.x} yLabel={r.y} />
        </div>
      )}
      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

// ============================================================
// 4. T-Test
// ============================================================
export function TTestResult({ r }) {
  return (
    <div>
      <ResultHeader title="T-Test" significant={r.significant} testLabel={r.test} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KeyMetric label="p-value" value={pct(r.pValue)} highlight={r.significant} />
        <KeyMetric label="t" value={num(r.t)} />
        <KeyMetric label="df" value={typeof r.df === 'number' ? r.df.toFixed(2) : r.df} />
        <KeyMetric label="Cohen's d" value={num(r.cohensD)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Effect Size" value={r.effectSize} />
        {r.ci95 && <Stat label="95% CI" value={`[${num(r.ci95[0])}, ${num(r.ci95[1])}]`} />}
        <Stat label="Signifikan?" value={r.significant ? 'Ya' : 'Tidak'} accent={statusColor(r.significant)} />
      </div>
      {r.mode === 'independent' && r.group1 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Stat label={`Grup 1 (${r.groupNames?.[0] ?? 'A'})`} value={`M=${num(r.group1.mean)}, SD=${num(r.group1.sd)}, n=${r.group1.n}`} />
          <Stat label={`Grup 2 (${r.groupNames?.[1] ?? 'B'})`} value={`M=${num(r.group2.mean)}, SD=${num(r.group2.sd)}, n=${r.group2.n}`} />
        </div>
      )}
      {r.note && <p className="text-xs text-muted italic mb-3">{r.note}</p>}
      {r.mode === 'oneSample' && r.values && (
        <div className="mt-3">
          <Histogram values={r.values} title={`Histogram: ${r.column} (μ₀ = ${r.mu0})`} xLabel={r.column} overlayNormal />
        </div>
      )}
      {r.mode === 'independent' && r.groupValues && (
        <div className="mt-3">
          <BoxPlot groups={r.groupValues} title={`Boxplot: ${r.outcome} per ${r.grouping}`} yLabel={r.outcome} />
        </div>
      )}
      {r.mode === 'paired' && r.beforeValues && r.afterValues && (
        <div className="mt-3">
          <BoxPlot groups={[
            { name: r.column1 || 'Sebelum', values: r.beforeValues },
            { name: r.column2 || 'Sesudah', values: r.afterValues },
          ]} title="Boxplot: Sebelum vs Sesudah" />
        </div>
      )}
      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

// ============================================================
// 5. Validity & Reliability
// ============================================================
export function ValidityResult({ r }) {
  return (
    <div className="space-y-6">
      <div>
        <ResultHeader title="Reliabilitas" significant={r.reliability.alpha >= 0.7} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <KeyMetric label="Cronbach's α" value={num(r.reliability.alpha)} highlight={r.reliability.alpha >= 0.7} />
          <KeyMetric label="N item" value={r.reliability.k} />
          <Stat label="N responden" value={r.reliability.n} />
          <Stat label="Status" value={r.reliability.alpha >= 0.7 ? 'Reliabel' : 'Kurang Reliabel'}
                accent={statusColor(r.reliability.alpha >= 0.7)} />
        </div>
        <InterpBox>{r.reliability.interpretation}</InterpBox>
      </div>

      <div>
        <SubHeading>Validitas Item (Pearson item-total)</SubHeading>
        <p className="text-[11px] text-muted mb-2">Kriteria: r ≥ {num(r.validity.rCritical)} dan p &lt; 0.05</p>
        <div className="overflow-x-auto border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface/60">
              <tr>
                <Th>Item</Th>
                <Th>r (corrected)</Th>
                <Th>r (simple)</Th>
                <Th>p</Th>
                <Th>α jika dihapus</Th>
                <Th>Verdict</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {r.validity.items.map((it, i) => {
                const alphaRaw = r.reliability.itemStats?.[i]?.alphaIfDeleted
                const alpha = (typeof alphaRaw === 'number' && !isNaN(alphaRaw)) ? alphaRaw : null
                return (
                  <tr key={i} className={it.isValid ? '' : 'bg-terracotta/5'}>
                    <td className="px-3 py-2 font-medium">{r.items[i]}</td>
                    <td className="px-3 py-2 font-mono">{num(it.r)}</td>
                    <td className="px-3 py-2 text-muted font-mono">{num(it.rSimple)}</td>
                    <td className="px-3 py-2 font-mono">{pct(it.pValue)}</td>
                    <td className="px-3 py-2 font-mono">{num(alpha)}</td>
                    <td className={'px-3 py-2 font-semibold ' + statusColor(it.isValid)}>
                      {it.verdict}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted mt-2">
          <strong>r (corrected)</strong> = korelasi item vs total tanpa item tsb (standar R/SPSS RELIABILITY).
          <strong> r (simple)</strong> = korelasi item vs total termasuk item tsb (SPSS CORRELATIONS).
        </p>
        <p className="text-sm mt-3 text-fg">{r.validity.summary}</p>
      </div>
    </div>
  )
}

// ============================================================
// 6. ANOVA
// ============================================================
export function ANOVAResult({ r }) {
  return (
    <div>
      <ResultHeader title="ANOVA" significant={r.significant} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KeyMetric label="p-value" value={pct(r.pValue)} highlight={r.significant} />
        <KeyMetric label="F" value={num(r.F)} highlight={r.significant} />
        <KeyMetric label="η²" value={num(r.etaSquared)} />
        <Stat label="Signifikan?" value={r.significant ? 'Ya' : 'Tidak'} accent={statusColor(r.significant)} />
      </div>

      <SubHeading>Statistik Per Grup</SubHeading>
      <div className="overflow-x-auto mb-4 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/60">
            <tr>{['Grup','n','Mean','SD'].map(h => <Th key={h}>{h}</Th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {r.groupStats.map((g, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-medium">{g.label}</td>
                <td className="px-3 py-2">{g.n}</td>
                <td className="px-3 py-2 font-semibold text-accent font-mono">{num(g.mean)}</td>
                <td className="px-3 py-2 font-mono">{num(g.sd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SubHeading>Tabel ANOVA</SubHeading>
      <div className="overflow-x-auto mb-4 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/60">
            <tr>{['Sumber','SS','df','MS','F','p'].map(h => <Th key={h}>{h}</Th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            <tr><td className="px-3 py-2">Antar grup</td><td className="px-3 py-2 font-mono">{num(r.ssBetween)}</td><td className="px-3 py-2">{r.dfBetween}</td><td className="px-3 py-2 font-mono">{num(r.msBetween)}</td><td className="px-3 py-2 font-semibold text-accent font-mono">{num(r.F)}</td><td className="px-3 py-2 font-mono">{pct(r.pValue)}</td></tr>
            <tr><td className="px-3 py-2">Dalam grup</td><td className="px-3 py-2 font-mono">{num(r.ssWithin)}</td><td className="px-3 py-2">{r.dfWithin}</td><td className="px-3 py-2 font-mono">{num(r.msWithin)}</td><td colSpan="2" /></tr>
            <tr className="font-semibold bg-surface/30"><td className="px-3 py-2">Total</td><td className="px-3 py-2 font-mono">{num(r.ssTotal)}</td><td className="px-3 py-2">{r.dfTotal}</td><td colSpan="3" /></tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="ω² (Omega-squared)" value={num(r.omegaSquared)} term="omega_squared" />
        <Stat label="Effect Size" value={r.effectSize} />
      </div>

      {r.postHoc && (
        <div className="mb-4">
          <SubHeading>Post-hoc: {r.postHoc.method}</SubHeading>
          <div className="overflow-x-auto border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface/60">
                <tr>{['Pasangan','Mean Diff','t','p (Bonferroni)','Signifikan'].map(h => <Th key={h}>{h}</Th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {r.postHoc.comparisons.map((c, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{c.group1} vs {c.group2}</td>
                    <td className="px-3 py-2 font-mono">{num(c.meanDiff)}</td>
                    <td className="px-3 py-2 font-mono">{num(c.t)}</td>
                    <td className="px-3 py-2 font-mono">{pct(c.pBonferroni)}</td>
                    <td className={'px-3 py-2 font-semibold ' + (c.significant ? 'text-accent' : 'text-muted')}>
                      {c.significant ? 'Ya' : 'Tidak'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {r.groupValues && (
        <div className="mb-4">
          <BoxPlot groups={r.groupValues} title={`Boxplot: ${r.outcome} per ${r.grouping}`} yLabel={r.outcome} />
        </div>
      )}
      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

// ============================================================
// 7. Simple Regression
// ============================================================
export function SimpleRegressionResult({ r }) {
  return (
    <div>
      <ResultHeader title="Regresi Linear Sederhana" significant={r.significant} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KeyMetric label="p-value" value={pct(r.pF)} highlight={r.significant} />
        <KeyMetric label="R²" value={num(r.rSquared)} highlight={r.significant} />
        <KeyMetric label="F" value={num(r.F)} />
        <KeyMetric label="N" value={r.n} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Adj. R²" value={num(r.adjustedR2)} term="adjusted_r_squared" />
        <Stat label="SE Estimate" value={num(r.standardErrorOfEstimate)} />
        <Stat label="β (standardized)" value={num(r.standardizedBeta)} />
        <Stat label="Signifikan?" value={r.significant ? 'Ya' : 'Tidak'} accent={statusColor(r.significant)} />
      </div>

      <div className="overflow-x-auto mb-4 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/60">
            <tr>{['Koefisien','b','SE','t','p','95% CI'].map(h => <Th key={h}>{h}</Th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            <tr><td className="px-3 py-2">Intercept (b₀)</td><td className="px-3 py-2 font-semibold font-mono">{num(r.intercept)}</td><td className="px-3 py-2 font-mono">{num(r.intercept_se)}</td><td className="px-3 py-2 font-mono">{num(r.intercept_t)}</td><td className="px-3 py-2 font-mono">{pct(r.intercept_p)}</td><td className="px-3 py-2 font-mono">[{num(r.intercept_ci?.[0])}, {num(r.intercept_ci?.[1])}]</td></tr>
            <tr><td className="px-3 py-2">Slope ({r.x})</td><td className="px-3 py-2 font-semibold text-accent font-mono">{num(r.slope)}</td><td className="px-3 py-2 font-mono">{num(r.slope_se)}</td><td className="px-3 py-2 font-mono">{num(r.slope_t)}</td><td className="px-3 py-2 font-mono">{pct(r.slope_p)}</td><td className="px-3 py-2 font-mono">[{num(r.slope_ci?.[0])}, {num(r.slope_ci?.[1])}]</td></tr>
          </tbody>
        </table>
      </div>

      <p className="text-sm bg-surface border border-border rounded-lg p-3 font-mono">{r.equation}</p>
      {r.xValues && r.yValues && (
        <div className="mt-4">
          <ScatterPlot x={r.xValues} y={r.yValues}
                       title={`Regresi: ${r.y} vs ${r.x}`}
                       xLabel={r.x} yLabel={r.y}
                       regressionLine={{ slope: r.slope, intercept: r.intercept }} />
        </div>
      )}
      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

// ============================================================
// 8. Multiple Regression
// ============================================================
export function MultipleRegressionResult({ r }) {
  return (
    <div>
      <ResultHeader title="Regresi Linear Berganda" significant={r.significant} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KeyMetric label="p-value" value={pct(r.pF)} highlight={r.significant} />
        <KeyMetric label="R²" value={num(r.rSquared)} highlight={r.significant} />
        <KeyMetric label="F" value={num(r.F)} />
        <KeyMetric label="Adj. R²" value={num(r.adjustedR2)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="SE Estimate" value={num(r.standardErrorOfEstimate)} />
        <Stat label="N" value={r.n} />
        <Stat label="p (predictors)" value={r.p} />
        <Stat label="Multikolinearitas" value={r.multicollinearity} accent={r.multicollinearity.includes('TERDETEKSI') ? 'text-terracotta' : 'text-accent'} />
      </div>

      <SubHeading>Koefisien</SubHeading>
      <div className="overflow-x-auto mb-4 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/60">
            <tr>{['Variabel','b','SE','t','p'].map(h => <Th key={h}>{h}</Th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {r.coefficients.map((c, i) => (
              <tr key={i} className={c.p < 0.05 ? 'bg-accent/5' : ''}>
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2 font-semibold font-mono">{num(c.b)}</td>
                <td className="px-3 py-2 font-mono">{num(c.se)}</td>
                <td className="px-3 py-2 font-mono">{num(c.t)}</td>
                <td className="px-3 py-2 font-mono">{pct(c.p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {r.vifs?.length > 0 && (
        <div className="mb-4">
          <SubHeading>VIF (Multikolinearitas)</SubHeading>
          <p className="text-[11px] text-muted mb-2">VIF &gt; 10 mengindikasikan masalah multikolinearitas berat.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {r.vifs.map((v, i) => (
              <Stat key={i} label={v.predictor} value={num(v.vif)}
                    accent={v.vif > 10 ? 'text-terracotta' : v.vif > 5 ? 'text-accent' : 'text-teal'} />
            ))}
          </div>
        </div>
      )}

      <p className="text-sm bg-surface border border-border rounded-lg p-3 font-mono">{r.equation}</p>
      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

// ============================================================
// 9. Chi-Square
// ============================================================
export function ChiSquareResult({ r }) {
  return (
    <div>
      <ResultHeader title="Chi-Square" significant={r.isSignificant} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KeyMetric label="p-value" value={pct(r.pValue)} highlight={r.isSignificant} />
        <KeyMetric label="χ²" value={num(r.chi2)} highlight={r.isSignificant} />
        <KeyMetric label="Cramér's V" value={num(r.cramersV)} />
        <KeyMetric label="N" value={r.N} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="df" value={r.df} term="df" />
        {r.phi !== null && <Stat label="Phi (φ)" value={num(r.phi)} />}
        <Stat label="Effect Size" value={r.effectSizeLabel} />
        <Stat label="Status" value={r.isSignificant ? 'Signifikan' : 'Tidak signifikan'}
              accent={r.isSignificant ? 'text-accent' : 'text-fg'} />
      </div>

      <SubHeading>Tabel Kontingensi (Observed)</SubHeading>
      <div className="overflow-x-auto mb-4 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-surface/60">
            <tr>
              <th className="px-3 py-2 text-left font-heading font-semibold text-muted text-xs uppercase tracking-wider border border-border">{r.var1} \ {r.var2}</th>
              {r.colLabels.map(c => <th key={c} className="px-3 py-2 text-left font-heading font-semibold text-muted text-xs uppercase tracking-wider border border-border">{c}</th>)}
              <th className="px-3 py-2 text-left font-heading font-semibold text-muted text-xs uppercase tracking-wider border border-border bg-surface">Total</th>
            </tr>
          </thead>
          <tbody>
            {r.observed.map((row, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-medium border border-border bg-surface/30">{r.rowLabels[i]}</td>
                {row.map((v, j) => (
                  <td key={j} className="px-3 py-2 border border-border">
                    {v}
                    <span className="text-xs text-muted ml-1">(E={r.expected[i][j].toFixed(1)})</span>
                  </td>
                ))}
                <td className="px-3 py-2 border border-border bg-surface/30 font-semibold">{r.rowTotals[i]}</td>
              </tr>
            ))}
            <tr>
              <td className="px-3 py-2 font-semibold border border-border bg-surface/30">Total</td>
              {r.colTotals.map((c, j) => <td key={j} className="px-3 py-2 border border-border bg-surface/30 font-semibold">{c}</td>)}
              <td className="px-3 py-2 border border-border bg-surface/30 font-bold">{r.N}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-[11px] text-muted mt-2 px-1">Angka dalam kurung = expected frequency.</p>
      </div>

      {r.assumptionWarning && (
        <div className="mb-3 p-3 bg-accent/5 border-l-2 border-accent rounded-r text-sm text-accent">
          {r.assumptionWarning}
        </div>
      )}

      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

// ============================================================
// 10. Mann-Whitney U
// ============================================================
export function MannWhitneyResult({ r }) {
  return (
    <div>
      <ResultHeader title="Mann-Whitney U" significant={r.isSignificant} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KeyMetric label="p-value" value={pct(r.pValue)} highlight={r.isSignificant} />
        <KeyMetric label="U" value={num(r.U, 2)} highlight={r.isSignificant} />
        <KeyMetric label="z" value={num(r.z, 3)} />
        <KeyMetric label="Effect r" value={num(r.effectSize, 3)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="N total" value={r.N} />
        <Stat label="Magnitude" value={r.effectSizeLabel} />
        <Stat label="Status" value={r.isSignificant ? 'Signifikan' : 'Tidak signifikan'}
              accent={r.isSignificant ? 'text-accent' : 'text-fg'} />
      </div>

      <SubHeading>Statistik per Grup</SubHeading>
      <div className="overflow-x-auto mb-4 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/60">
            <tr>{['Grup', 'n', 'Mean Rank', 'Sum Rank'].map(h => <Th key={h}>{h}</Th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            <tr><td className="px-3 py-2 font-medium">{r.groupNames[0]}</td><td className="px-3 py-2">{r.n1}</td><td className="px-3 py-2 font-mono">{num(r.meanRank1, 2)}</td><td className="px-3 py-2 font-mono">{num(r.R1, 1)}</td></tr>
            <tr><td className="px-3 py-2 font-medium">{r.groupNames[1]}</td><td className="px-3 py-2">{r.n2}</td><td className="px-3 py-2 font-mono">{num(r.meanRank2, 2)}</td><td className="px-3 py-2 font-mono">{num(r.R2, 1)}</td></tr>
          </tbody>
        </table>
      </div>

      {r.groupValues && (
        <div className="mb-4">
          <BoxPlot groups={r.groupValues} title={`Boxplot: ${r.outcome} per ${r.grouping}`} yLabel={r.outcome} />
        </div>
      )}
      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

// ============================================================
// 11. Wilcoxon
// ============================================================
export function WilcoxonResult({ r }) {
  return (
    <div>
      <ResultHeader title="Wilcoxon Signed-Rank" significant={r.isSignificant} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KeyMetric label="p-value" value={pct(r.pValue)} highlight={r.isSignificant} />
        <KeyMetric label="W" value={num(r.W, 2)} highlight={r.isSignificant} />
        <KeyMetric label="z" value={num(r.z, 3)} />
        <KeyMetric label="Effect r" value={num(r.effectSize, 3)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="N pasangan" value={r.n} />
        <Stat label="W+ (positif)" value={num(r.Wpos, 1)} />
        <Stat label="W− (negatif)" value={num(r.Wneg, 1)} />
        <Stat label="Mean diff" value={num(r.meanDiff, 3)} />
      </div>
      {r.beforeValues && r.afterValues && (
        <div className="mb-4">
          <BoxPlot groups={[
            { name: r.column1 || 'Sebelum', values: r.beforeValues },
            { name: r.column2 || 'Sesudah', values: r.afterValues },
          ]} title="Boxplot: Sebelum vs Sesudah" />
        </div>
      )}
      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

// ============================================================
// 12. Kruskal-Wallis
// ============================================================
export function KruskalResult({ r }) {
  return (
    <div>
      <ResultHeader title="Kruskal-Wallis" significant={r.isSignificant} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KeyMetric label="p-value" value={pct(r.pValue)} highlight={r.isSignificant} />
        <KeyMetric label="H" value={num(r.H, 3)} highlight={r.isSignificant} />
        <KeyMetric label="η²" value={num(r.etaSquared, 3)} />
        <KeyMetric label="N" value={r.N} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="df" value={r.df} />
        <Stat label="k grup" value={r.k} />
        <Stat label="Magnitude" value={r.effectSizeLabel} />
        <Stat label="Status" value={r.isSignificant ? 'Signifikan' : 'Tidak signifikan'}
              accent={r.isSignificant ? 'text-accent' : 'text-fg'} />
      </div>

      <SubHeading>Statistik per Grup</SubHeading>
      <div className="overflow-x-auto mb-4 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/60">
            <tr>{['Grup', 'n', 'Median', 'Mean Rank'].map(h => <Th key={h}>{h}</Th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {r.groupStats.map((g, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-medium">{g.name}</td>
                <td className="px-3 py-2">{g.n}</td>
                <td className="px-3 py-2 font-mono">{num(g.median, 2)}</td>
                <td className="px-3 py-2 font-mono">{num(g.meanRank, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {r.groupValues && (
        <div className="mb-4">
          <BoxPlot groups={r.groupValues} title={`Boxplot: ${r.outcome} per ${r.grouping}`} yLabel={r.outcome} />
        </div>
      )}
      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

// ============================================================
// 13. N-Gain
// ============================================================
export function NGainResult({ r }) {
  const sig = r.signifTest
  const totalKategori = r.distribusi.Tinggi + r.distribusi.Sedang + r.distribusi.Rendah
  const isHigh = r.kategoriKelas === 'Tinggi'
  return (
    <div>
      <ResultHeader title="N-Gain" significant={isHigh} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KeyMetric label="N-Gain Mean" value={num(r.nGainMean, 3)} highlight={isHigh} />
        <KeyMetric label="Efektivitas" value={`${num(r.efektivitasPersen, 2)}%`} highlight={isHigh} />
        <KeyMetric label="N" value={r.n} />
        <Stat label="Skor Maks" value={r.maxScore} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="SD N-Gain" value={num(r.nGainSD, 3)} />
        <Stat label="Min" value={num(r.nGainMin, 3)} />
        <Stat label="Max" value={num(r.nGainMax, 3)} />
        <Stat
          label="Kategori Kelas"
          value={r.kategoriKelas}
          accent={r.kategoriKelas === 'Tinggi' ? 'text-accent' : r.kategoriKelas === 'Sedang' ? 'text-teal' : 'text-terracotta'}
        />
      </div>

      <div className={`rounded-lg p-3 mb-4 text-sm border-l-2 ${
        r.tafsiranEfektivitas === 'Efektif'        ? 'bg-accent/5 border-accent text-accent' :
        r.tafsiranEfektivitas === 'Cukup Efektif'  ? 'bg-teal/5 border-teal text-teal' :
        r.tafsiranEfektivitas === 'Kurang Efektif' ? 'bg-accent/5 border-accent text-accent' :
                                                     'bg-terracotta/8 border-terracotta text-terracotta'
      }`}>
        <strong>Tafsiran Efektivitas:</strong> {r.tafsiranEfektivitas} ({num(r.efektivitasPersen, 2)}%) ·
        kategori klasifikasi Hake (1998).
      </div>

      <SubHeading>Statistik Pre-test vs Post-test</SubHeading>
      <div className="overflow-x-auto mb-4 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/60">
            <tr>{['Variabel', 'Mean', 'SD', 'Min', 'Max'].map(h => <Th key={h}>{h}</Th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            <tr>
              <td className="px-3 py-2 font-medium">Pre-test ({r.column1})</td>
              <td className="px-3 py-2 font-mono">{num(r.preStats.mean, 2)}</td>
              <td className="px-3 py-2 font-mono">{num(r.preStats.sd, 2)}</td>
              <td className="px-3 py-2 font-mono">{num(r.preStats.min, 2)}</td>
              <td className="px-3 py-2 font-mono">{num(r.preStats.max, 2)}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium">Post-test ({r.column2})</td>
              <td className="px-3 py-2 font-mono">{num(r.postStats.mean, 2)}</td>
              <td className="px-3 py-2 font-mono">{num(r.postStats.sd, 2)}</td>
              <td className="px-3 py-2 font-mono">{num(r.postStats.min, 2)}</td>
              <td className="px-3 py-2 font-mono">{num(r.postStats.max, 2)}</td>
            </tr>
            <tr className="bg-accent/5">
              <td className="px-3 py-2 font-medium">Rata-rata Selisih</td>
              <td className="px-3 py-2 font-bold text-accent font-mono" colSpan={4}>
                {num(r.postStats.mean - r.preStats.mean, 2)} poin
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <SubHeading>Distribusi Kategori N-Gain</SubHeading>
      <div className="overflow-x-auto mb-4 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/60">
            <tr>{['Kategori', 'Rentang', 'Jumlah', '%', 'Visualisasi'].map(h => <Th key={h}>{h}</Th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {[
              { kat: 'Tinggi',  range: 'g ≥ 0.7',           color: 'bg-accent' },
              { kat: 'Sedang',  range: '0.3 ≤ g < 0.7',     color: 'bg-teal' },
              { kat: 'Rendah',  range: 'g < 0.3',           color: 'bg-terracotta' },
            ].map(({ kat, range, color }) => {
              const n = r.distribusi[kat] || 0
              const pctVal = totalKategori > 0 ? (n / totalKategori) * 100 : 0
              return (
                <tr key={kat}>
                  <td className="px-3 py-2 font-medium">{kat}</td>
                  <td className="px-3 py-2 text-muted">{range}</td>
                  <td className="px-3 py-2 font-bold">{n}</td>
                  <td className="px-3 py-2 font-mono">{pctVal.toFixed(1)}%</td>
                  <td className="px-3 py-2">
                    <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pctVal}%` }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {sig && (
        <div className={`rounded-lg p-4 mb-4 border ${
          sig.significant ? 'bg-accent/5 border-accent/30' : 'bg-surface border-border'
        }`}>
          <h4 className="font-heading font-semibold mb-2 text-sm">Uji Signifikansi (Paired t-test)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div><span className="text-muted">t:</span> <strong className="font-mono">{num(sig.t, 3)}</strong></div>
            <div><span className="text-muted">df:</span> <strong className="font-mono">{sig.df}</strong></div>
            <div><span className="text-muted">p-value:</span> <strong className="font-mono">{pct(sig.pValue)}</strong></div>
            <div><span className="text-muted">Cohen's d:</span> <strong className="font-mono">{num(sig.cohensD, 3)}</strong></div>
          </div>
          <p className={`text-xs mt-2 ${sig.significant ? 'text-accent' : 'text-muted'}`}>
            {sig.significant
              ? `Peningkatan signifikan secara statistik (p < 0.05). Selisih rata-rata: ${num(sig.meanDiff, 2)} poin.`
              : `Peningkatan TIDAK signifikan secara statistik (p ≥ 0.05). Selisih rata-rata: ${num(sig.meanDiff, 2)} poin.`
            }
          </p>
        </div>
      )}

      <details className="border border-border rounded-lg overflow-hidden mb-4">
        <summary className="px-4 py-2.5 bg-surface hover:bg-surface/70 cursor-pointer text-sm font-heading font-medium">
          Detail per Subjek ({r.pairs.length}) — klik untuk buka
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-surface/60 sticky top-0">
              <tr>{['No', 'Nama', 'Pre', 'Post', 'Gain', 'N-Gain', 'Kategori'].map(h =>
                <th key={h} className="px-3 py-2 text-left font-heading font-semibold text-muted uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {r.pairs.map((p, i) => (
                <tr key={i}>
                  <td className="px-3 py-1.5">{i + 1}</td>
                  <td className="px-3 py-1.5 font-medium">{p.name}</td>
                  <td className="px-3 py-1.5 font-mono">{p.pre}</td>
                  <td className="px-3 py-1.5 font-mono">{p.post}</td>
                  <td className={`px-3 py-1.5 font-mono ${p.gain > 0 ? 'text-accent' : p.gain < 0 ? 'text-terracotta' : ''}`}>
                    {p.gain > 0 ? '+' : ''}{p.gain}
                  </td>
                  <td className="px-3 py-1.5 font-bold font-mono">{num(p.nGain, 3)}</td>
                  <td className="px-3 py-1.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                      p.kategori === 'Tinggi' ? 'bg-accent/10 text-accent' :
                      p.kategori === 'Sedang' ? 'bg-teal/10 text-teal' :
                                                'bg-terracotta/10 text-terracotta'
                    }`}>{p.kategori}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <InterpBox>
        <strong>Interpretasi:</strong> Berdasarkan klasifikasi Hake (1998), rata-rata N-gain kelas
        sebesar <strong>{num(r.nGainMean, 3)}</strong> termasuk kategori <strong>{r.kategoriKelas}</strong>.
        Tingkat efektivitas pembelajaran/treatment mencapai <strong>{num(r.efektivitasPersen, 2)}%</strong> ({r.tafsiranEfektivitas}).
        Dari {r.n} subjek, terdapat {r.distribusi.Tinggi} ({r.distribusiPersen.Tinggi}%) kategori Tinggi,
        {' '}{r.distribusi.Sedang} ({r.distribusiPersen.Sedang}%) Sedang, dan
        {' '}{r.distribusi.Rendah} ({r.distribusiPersen.Rendah}%) Rendah.
        {sig && (sig.significant
          ? ` Uji paired t-test menunjukkan peningkatan signifikan (t = ${num(sig.t, 2)}, p ${sig.pValue < 0.001 ? '< 0.001' : `= ${num(sig.pValue, 3)}`}).`
          : ` Uji paired t-test belum menunjukkan peningkatan signifikan secara statistik (p = ${num(sig.pValue, 3)}).`
        )}
      </InterpBox>
    </div>
  )
}

// ============================================================
// 14. Two-Way ANOVA
// ============================================================
export function TwoWayANOVAResult({ r }) {
  if (r.error) {
    return (
      <div className="bg-terracotta/8 border-l-2 border-terracotta rounded-r-lg p-4 text-sm text-terracotta">
        <strong>Error:</strong> {r.error}
      </div>
    )
  }
  const anySignificant = r.significantA || r.significantB || r.significantInteraction
  const fmtP = (p) => p === null ? '—' : (p < 0.001 ? '< 0.001' : num(p, 4))
  const verdict = (sig, name) => sig
    ? `Pengaruh ${name} signifikan`
    : `Pengaruh ${name} tidak signifikan`
  return (
    <div>
      <ResultHeader title="Two-Way ANOVA" significant={anySignificant} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KeyMetric label={`F ${r.nameA}`} value={num(r.factorA.F, 3)} highlight={r.significantA} />
        <KeyMetric label={`F ${r.nameB}`} value={num(r.factorB.F, 3)} highlight={r.significantB} />
        <KeyMetric label={`F ${r.nameA}×${r.nameB}`} value={num(r.interaction.F, 3)} highlight={r.significantInteraction} />
        <KeyMetric label="N" value={r.N} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={`p ${r.nameA}`} value={fmtP(r.factorA.pValue)} accent={r.significantA ? 'text-accent' : 'text-muted'} />
        <Stat label={`p ${r.nameB}`} value={fmtP(r.factorB.pValue)} accent={r.significantB ? 'text-accent' : 'text-muted'} />
        <Stat label="Grand Mean" value={num(r.grandMean, 3)} />
        <Stat label="Desain" value={r.isBalanced ? 'Balanced' : 'Unbalanced'} accent={r.isBalanced ? 'text-teal' : 'text-accent'} />
      </div>

      <div className={`rounded-lg p-3.5 mb-4 text-sm border-l-2 ${
        r.significantInteraction ? 'bg-accent/5 border-accent text-accent' : 'bg-surface border-border text-fg'
      }`}>
        <strong>Ringkasan:</strong>
        <ul className="mt-1 space-y-0.5 list-disc list-inside">
          <li>{verdict(r.significantA, r.nameA)} (partial η² = {num(r.factorA.partialEtaSquared, 3)} · {r.factorA.effectSize})</li>
          <li>{verdict(r.significantB, r.nameB)} (partial η² = {num(r.factorB.partialEtaSquared, 3)} · {r.factorB.effectSize})</li>
          <li>{verdict(r.significantInteraction, `interaksi ${r.nameA}×${r.nameB}`)} (partial η² = {num(r.interaction.partialEtaSquared, 3)} · {r.interaction.effectSize})</li>
        </ul>
        {r.significantInteraction && (
          <p className="mt-2 text-xs italic">
            Karena interaksi signifikan, efek utama harus diinterpretasikan dengan hati-hati — efek satu faktor bergantung pada level faktor lain (lihat tabel cell means).
          </p>
        )}
      </div>

      <SubHeading>Tabel ANOVA</SubHeading>
      <div className="overflow-x-auto mb-4 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/60">
            <tr>{['Source', 'SS', 'df', 'MS', 'F', 'p-value', 'partial η²', 'Effect'].map(h =>
              <Th key={h}>{h}</Th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {r.anovaTable.map((row, i) => (
              <tr key={i} className={row.significant ? 'bg-accent/5' : ''}>
                <td className="px-3 py-2 font-medium">{row.source}</td>
                <td className="px-3 py-2 font-mono">{num(row.SS, 3)}</td>
                <td className="px-3 py-2">{row.df}</td>
                <td className="px-3 py-2 font-mono">{row.MS === null ? '—' : num(row.MS, 3)}</td>
                <td className="px-3 py-2 font-bold font-mono">{row.F === null ? '—' : num(row.F, 3)}</td>
                <td className="px-3 py-2 font-mono">{fmtP(row.pValue)}</td>
                <td className="px-3 py-2 font-mono">{row.partialEtaSquared === null ? '—' : num(row.partialEtaSquared, 3)}</td>
                <td className="px-3 py-2 text-xs text-muted">{row.effectSize || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SubHeading>Cell Means ({r.nameA} × {r.nameB})</SubHeading>
      <div className="overflow-x-auto mb-4 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/60">
            <tr>{[r.nameA, r.nameB, 'n', 'Mean', 'SD'].map(h =>
              <Th key={h}>{h}</Th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {r.cellTable.map((c, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-medium">{c.levelA}</td>
                <td className="px-3 py-2 font-medium">{c.levelB}</td>
                <td className="px-3 py-2">{c.n}</td>
                <td className="px-3 py-2 font-bold font-mono">{num(c.mean, 3)}</td>
                <td className="px-3 py-2 font-mono">{num(c.sd, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!r.isBalanced && (
          <p className="text-[11px] text-accent mt-2 px-1">
            Desain unbalanced (n sel: {r.cellSizesRange.min}–{r.cellSizesRange.max}). F-test menggunakan pendekatan cell-means (mendekati Type III). Untuk inference ketat, verifikasi di R/SPSS.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <SubHeading>Marginal Means: {r.nameA}</SubHeading>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface/60"><tr><Th>Level</Th><Th>n</Th><Th>Mean</Th></tr></thead>
              <tbody className="divide-y divide-border/40">
                {r.marginalA.map((m, i) => (
                  <tr key={i}><td className="px-3 py-2 font-medium">{m.level}</td><td className="px-3 py-2">{m.n}</td><td className="px-3 py-2 font-bold font-mono">{num(m.mean, 3)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <SubHeading>Marginal Means: {r.nameB}</SubHeading>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface/60"><tr><Th>Level</Th><Th>n</Th><Th>Mean</Th></tr></thead>
              <tbody className="divide-y divide-border/40">
                {r.marginalB.map((m, i) => (
                  <tr key={i}><td className="px-3 py-2 font-medium">{m.level}</td><td className="px-3 py-2">{m.n}</td><td className="px-3 py-2 font-bold font-mono">{num(m.mean, 3)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <InterpBox>
        <strong>Interpretasi:</strong> Two-way ANOVA pada outcome <strong>{r.outcome}</strong> dengan
        faktor <strong>{r.nameA}</strong> ({r.levelsA.length} level) dan <strong>{r.nameB}</strong> ({r.levelsB.length} level).
        {' '}Efek utama {r.nameA}: F({r.factorA.df}, {r.residual.df}) = {num(r.factorA.F, 2)}, p {r.factorA.pValue < 0.001 ? '< 0.001' : `= ${num(r.factorA.pValue, 3)}`} ({r.significantA ? 'signifikan' : 'tidak signifikan'}).
        {' '}Efek utama {r.nameB}: F({r.factorB.df}, {r.residual.df}) = {num(r.factorB.F, 2)}, p {r.factorB.pValue < 0.001 ? '< 0.001' : `= ${num(r.factorB.pValue, 3)}`} ({r.significantB ? 'signifikan' : 'tidak signifikan'}).
        {' '}Interaksi {r.nameA}×{r.nameB}: F({r.interaction.df}, {r.residual.df}) = {num(r.interaction.F, 2)}, p {r.interaction.pValue < 0.001 ? '< 0.001' : `= ${num(r.interaction.pValue, 3)}`} ({r.significantInteraction ? 'signifikan' : 'tidak signifikan'}).
      </InterpBox>
    </div>
  )
}

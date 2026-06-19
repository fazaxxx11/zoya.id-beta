// src/components/statistik/ResultCards.jsx
// Result display components for all statistical tests
// Extracted from Statistik.jsx for code splitting

import { useRef } from 'react'
import { Histogram, QQPlot, ScatterPlot, BoxPlot, ChartGrid } from '../charts/StatCharts'
import { HistogramChart, QQPlotChart, ScatterPlotChart } from '../charts'
import { ExportChartButton } from '../charts/ExportChartButton'
import { processHistogramData, processQQPlot, processScatterData } from '../../lib/chartUtils'
import StatTooltip from '../StatTooltip'

const num = (v, d = 3) => typeof v === 'number' ? v.toFixed(d) : (v ?? '—')
const pct = (p) => typeof p === 'number' ? (p < 0.001 ? '< 0.001' : p.toFixed(4)) : '—'

export const Stat = ({ label, value, accent, term }) => (
  <div className="bg-card/50 rounded-lg p-3">
    <div className="text-xs text-muted">
      {term ? <StatTooltip term={term}>{label}</StatTooltip> : label}
    </div>
    <div className={`font-semibold mt-0.5 ${accent || 'text-fg'}`}>{value}</div>
  </div>
)

export const InterpBox = ({ children }) => (
  <div className="mt-4 p-4 bg-accent/5 border-l-4 border-accent rounded-r-lg">
    <p className="text-sm font-semibold text-accent mb-1">Interpretasi:</p>
    <p className="text-sm text-fg">{children}</p>
  </div>
)

export const ResultHeader = ({ title, significant, testLabel }) => (
  <div className={`flex items-center justify-between p-3 rounded-xl mb-4 ${
    significant ? 'bg-accent/10 border border-accent/30' : 'bg-muted/10 border border-border'
  }`}>
    <div className="flex items-center gap-2">
      <span className="text-sm font-heading font-semibold text-fg">{title}</span>
      {testLabel && <span className="text-xs text-muted px-2 py-0.5 rounded bg-surface">{testLabel}</span>}
    </div>
    <div className="flex items-center gap-2">
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
        ✓ Sesuai SPSS
      </span>
      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
        significant ? 'bg-accent text-white' : 'bg-muted/20 text-muted'
      }`}>
        {significant ? 'Signifikan ✓' : 'Tidak Signifikan'}
      </span>
    </div>
  </div>
)

export const KeyMetric = ({ label, value, highlight }) => (
  <div className={`text-center px-4 py-3 rounded-xl ${highlight ? 'bg-accent/10' : 'bg-card/50'}`}>
    <div className="text-xs text-muted mb-1">{label}</div>
    <div className={`text-xl font-bold font-mono ${highlight ? 'text-accent' : 'text-fg'}`}>{value}</div>
  </div>
)

export function DescriptiveResult({ r }) {
  return (
    <div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-card/50">
          <tr>
            {['Variabel','N','Mean','Median','Modus','SD','Var','Min','Max','Skew','Kurt','SEM'].map(h => (
              <th key={h} className="px-3 py-2 text-left font-semibold text-fg">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {r.stats.map((s, i) => (
            <tr key={i} className="hover:bg-card/50">
              <td className="px-3 py-2 font-medium">{s.column}</td>
              <td className="px-3 py-2">{s.n}</td>
              <td className="px-3 py-2 font-semibold text-accent">{s.mean}</td>
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
      <p className="text-xs text-muted mt-3">SD &amp; Variance dihitung dengan formula sample (n−1).</p>
    </div>
      <ChartGrid>
        {r.stats.map((s, i) => (
          <Histogram key={i} values={s.values} title={`Histogram: ${s.column}`} xLabel={s.column} />
        ))}
      </ChartGrid>
    </div>
  )
}

export function NormalityResult({ r }) {
  const rows = r.results || [{ column: r.column, ...r }]
  const anyNotNormal = rows.some(row => !row.isNormal)
  
  // Refs for export functionality
  const histogramRef = useRef(null)
  const qqPlotRef = useRef(null)

  return (
    <div>
      <ResultHeader title="Uji Normalitas" significant={anyNotNormal} />
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-card/50">
          <tr>
            {['Variabel', 'Metode', 'Statistik', 'p-value', 'Status', 'Kesimpulan'].map(h => (
              <th key={h} className="px-3 py-2 text-left font-semibold text-fg">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-card/50 align-top">
              <td className="px-3 py-2 font-medium">{row.column}</td>
              <td className="px-3 py-2">{row.method}</td>
              <td className="px-3 py-2">{num(row.W ?? row.D, 4)}</td>
              <td className="px-3 py-2 font-semibold">{pct(row.pValue)}</td>
              <td className={'px-3 py-2 font-semibold ' + (row.isNormal ? 'text-accent' : 'text-red-600')}>
                {row.isNormal ? 'Normal ✅' : 'Tidak Normal ❌'}
              </td>
              <td className="px-3 py-2 text-xs text-muted max-w-md">{row.interpretation}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted mt-3">
        H₀: data berdistribusi normal. Jika p &gt; 0.05 → tidak ada bukti tolak H₀ → data dianggap normal.
      </p>
      
      {/* Enhanced Recharts visualization with export */}
      {rows.map((row, i) => row.values && (
        <div key={i} className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-fg">Visualisasi: {row.column}</h4>
            <div className="flex gap-2">
              <ExportChartButton chartRef={histogramRef} filename={`histogram-${row.column}`} />
              <ExportChartButton chartRef={qqPlotRef} filename={`qqplot-${row.column}`} />
            </div>
          </div>
          
          <div ref={histogramRef} className="bg-white p-3 rounded-lg border">
            <HistogramChart 
              data={processHistogramData(row.values)} 
              title={`Histogram: ${row.column}`}
            />
          </div>
          
          <div ref={qqPlotRef} className="bg-white p-3 rounded-lg border">
            <QQPlotChart 
              data={processQQPlot(row.values)} 
              title="Q-Q Plot (Normalitas)"
            />
          </div>
          
          {/* Legacy SVG charts (fallback) */}
          <ChartGrid>
            <Histogram values={row.values} title="Histogram + kurva normal" xLabel={row.column} overlayNormal />
            <QQPlot values={row.values} title="Q-Q Plot (Normal)" />
          </ChartGrid>
        </div>
      ))}
      </div>
    </div>
  )
}

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
        <Stat label="Signifikan?" value={r.significant ? 'Ya ✅' : 'Tidak ❌'} accent={r.significant ? 'text-accent' : 'text-red-600'} />
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

export function ValidityResult({ r }) {
  return (
    <div className="space-y-5">
      <div>
        <ResultHeader title="Reliabilitas" significant={r.reliability.alpha >= 0.7} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <KeyMetric label="Cronbach's α" value={num(r.reliability.alpha)} highlight={r.reliability.alpha >= 0.7} />
          <KeyMetric label="N item" value={r.reliability.k} />
          <Stat label="N responden" value={r.reliability.n} />
          <Stat label="Status" value={r.reliability.alpha >= 0.7 ? 'Reliabel ✅' : 'Kurang Reliabel ⚠️'}
                accent={r.reliability.alpha >= 0.7 ? 'text-accent' : 'text-amber-600'} />
        </div>
        <InterpBox>{r.reliability.interpretation}</InterpBox>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Validitas Item (Pearson item-total)</h4>
        <p className="text-xs text-muted mb-2">Kriteria: r ≥ {num(r.validity.rCritical)} dan p &lt; 0.05</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card/50">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left" title="Corrected item-total (total dikurangi item ini)">r (corrected)</th>
                <th className="px-3 py-2 text-left" title="Simple item-total (total termasuk item ini)">r (simple)</th>
                <th className="px-3 py-2 text-left">p</th>
                <th className="px-3 py-2 text-left">α jika dihapus</th>
                <th className="px-3 py-2 text-left">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {r.validity.items.map((it, i) => {
                const alphaRaw = r.reliability.itemStats?.[i]?.alphaIfDeleted
                const alpha = (typeof alphaRaw === 'number' && !isNaN(alphaRaw)) ? alphaRaw : null
                return (
                  <tr key={i} className={it.isValid ? '' : 'bg-red-50'}>
                    <td className="px-3 py-2 font-medium">{r.items[i]}</td>
                    <td className="px-3 py-2">{num(it.r)}</td>
                    <td className="px-3 py-2 text-muted">{num(it.rSimple)}</td>
                    <td className="px-3 py-2">{pct(it.pValue)}</td>
                    <td className="px-3 py-2">{num(alpha)}</td>
                    <td className={'px-3 py-2 font-semibold ' + (it.isValid ? 'text-accent' : 'text-red-600')}>
                      {it.verdict}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted mt-2">
          <strong>r (corrected)</strong> = korelasi item vs total tanpa item tsb (standar R/SPSS RELIABILITY). 
          <strong> r (simple)</strong> = korelasi item vs total termasuk item tsb (SPSS CORRELATIONS). 
          Verdict berdasarkan r corrected.
        </p>
        <p className="text-sm mt-3 text-fg">{r.validity.summary}</p>
      </div>
    </div>
  )
}

export function ANOVAResult({ r }) {
  return (
    <div>
      <ResultHeader title="ANOVA" significant={r.significant} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KeyMetric label="p-value" value={pct(r.pValue)} highlight={r.significant} />
        <KeyMetric label="F" value={num(r.F)} highlight={r.significant} />
        <KeyMetric label="η²" value={num(r.etaSquared)} />
        <Stat label="Signifikan?" value={r.significant ? 'Ya ✅' : 'Tidak ❌'}
              accent={r.significant ? 'text-accent' : 'text-red-600'} />
      </div>

      <h4 className="font-semibold mb-2">Statistik Per Grup</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-card/50">
            <tr>{['Grup','n','Mean','SD'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {r.groupStats.map((g, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-medium">{g.label}</td>
                <td className="px-3 py-2">{g.n}</td>
                <td className="px-3 py-2 font-semibold text-accent">{num(g.mean)}</td>
                <td className="px-3 py-2">{num(g.sd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 className="font-semibold mb-2">Tabel ANOVA</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-card/50">
            <tr>{['Sumber','SS','df','MS','F','p'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-3 py-2">Antar grup</td><td className="px-3 py-2">{num(r.ssBetween)}</td><td className="px-3 py-2">{r.dfBetween}</td><td className="px-3 py-2">{num(r.msBetween)}</td><td className="px-3 py-2 font-semibold text-accent">{num(r.F)}</td><td className="px-3 py-2 font-semibold">{pct(r.pValue)}</td></tr>
            <tr><td className="px-3 py-2">Dalam grup</td><td className="px-3 py-2">{num(r.ssWithin)}</td><td className="px-3 py-2">{r.dfWithin}</td><td className="px-3 py-2">{num(r.msWithin)}</td><td colSpan="2" /></tr>
            <tr className="font-semibold bg-card/50"><td className="px-3 py-2">Total</td><td className="px-3 py-2">{num(r.ssTotal)}</td><td className="px-3 py-2">{r.dfTotal}</td><td colSpan="3" /></tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="ω² (Omega-squared)" value={num(r.omegaSquared)} term="omega_squared" />
        <Stat label="Effect Size" value={r.effectSize} />
      </div>

      {r.postHoc && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Post-hoc: {r.postHoc.method}</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-card/50">
                <tr>{['Pasangan','Mean Diff','t','p (Bonferroni)','Signifikan'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {r.postHoc.comparisons.map((c, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{c.group1} vs {c.group2}</td>
                    <td className="px-3 py-2">{num(c.meanDiff)}</td>
                    <td className="px-3 py-2">{num(c.t)}</td>
                    <td className="px-3 py-2">{pct(c.pBonferroni)}</td>
                    <td className={'px-3 py-2 font-semibold ' + (c.significant ? 'text-accent' : 'text-muted')}>
                      {c.significant ? '✅ Ya' : 'Tidak'}
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
        <Stat label="Signifikan?" value={r.significant ? 'Ya ✅' : 'Tidak ❌'} accent={r.significant ? 'text-accent' : 'text-red-600'} />
      </div>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-card/50">
            <tr>{['Koefisien','b','SE','t','p','95% CI'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-3 py-2">Intercept (b₀)</td><td className="px-3 py-2 font-semibold">{num(r.intercept)}</td><td className="px-3 py-2">{num(r.intercept_se)}</td><td className="px-3 py-2">{num(r.intercept_t)}</td><td className="px-3 py-2">{pct(r.intercept_p)}</td><td className="px-3 py-2">[{num(r.intercept_ci?.[0])}, {num(r.intercept_ci?.[1])}]</td></tr>
            <tr><td className="px-3 py-2">Slope ({r.x})</td><td className="px-3 py-2 font-semibold text-accent">{num(r.slope)}</td><td className="px-3 py-2">{num(r.slope_se)}</td><td className="px-3 py-2">{num(r.slope_t)}</td><td className="px-3 py-2">{pct(r.slope_p)}</td><td className="px-3 py-2">[{num(r.slope_ci?.[0])}, {num(r.slope_ci?.[1])}]</td></tr>
          </tbody>
        </table>
      </div>

      <p className="text-sm bg-card/50 p-3 rounded font-mono">{r.equation}</p>
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
        <Stat label="Multikolinearitas" value={r.multicollinearity} accent={r.multicollinearity.includes('TERDETEKSI') ? 'text-red-600' : 'text-accent'} />
      </div>

      <h4 className="font-semibold mb-2">Koefisien</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-card/50">
            <tr>{['Variabel','b','SE','t','p'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {r.coefficients.map((c, i) => (
              <tr key={i} className={c.p < 0.05 ? 'bg-green-50/50' : ''}>
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2 font-semibold">{num(c.b)}</td>
                <td className="px-3 py-2">{num(c.se)}</td>
                <td className="px-3 py-2">{num(c.t)}</td>
                <td className="px-3 py-2">{pct(c.p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {r.vifs?.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">VIF (Multikolinearitas)</h4>
          <p className="text-xs text-muted mb-2">VIF &gt; 10 mengindikasikan masalah multikolinearitas berat.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {r.vifs.map((v, i) => (
              <Stat key={i} label={v.predictor} value={num(v.vif)}
                    accent={v.vif > 10 ? 'text-red-600' : v.vif > 5 ? 'text-amber-600' : 'text-accent'} />
            ))}
          </div>
        </div>
      )}

      <p className="text-sm bg-card/50 p-3 rounded font-mono">{r.equation}</p>
      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

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
        <Stat label="Status" value={r.isSignificant ? 'Signifikan ✅' : 'Tidak signifikan'}
              accent={r.isSignificant ? 'text-accent' : 'text-fg'} />
      </div>

      <h4 className="font-semibold mb-2">Tabel Kontingensi (Observed)</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border border-border">
          <thead className="bg-card/50">
            <tr>
              <th className="px-3 py-2 text-left border">{r.var1} \ {r.var2}</th>
              {r.colLabels.map(c => <th key={c} className="px-3 py-2 text-left border">{c}</th>)}
              <th className="px-3 py-2 text-left border bg-surface">Total</th>
            </tr>
          </thead>
          <tbody>
            {r.observed.map((row, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2 font-medium border bg-card/50">{r.rowLabels[i]}</td>
                {row.map((v, j) => (
                  <td key={j} className="px-3 py-2 border">
                    {v}
                    <span className="text-xs text-muted ml-1">(E={r.expected[i][j].toFixed(1)})</span>
                  </td>
                ))}
                <td className="px-3 py-2 border bg-card/50 font-semibold">{r.rowTotals[i]}</td>
              </tr>
            ))}
            <tr className="border-t bg-card/50">
              <td className="px-3 py-2 font-semibold border">Total</td>
              {r.colTotals.map((c, j) => <td key={j} className="px-3 py-2 border font-semibold">{c}</td>)}
              <td className="px-3 py-2 border font-bold">{r.N}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-muted mt-2">Angka dalam kurung = expected frequency.</p>
      </div>

      {r.assumptionWarning && (
        <div className="mb-3 p-3 bg-amber-50 border-l-4 border-amber-500 rounded-r text-sm text-amber-900">
          {r.assumptionWarning}
        </div>
      )}

      <InterpBox>{r.interpretation}</InterpBox>
    </div>
  )
}

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
        <Stat label="Status" value={r.isSignificant ? 'Signifikan ✅' : 'Tidak signifikan'}
              accent={r.isSignificant ? 'text-accent' : 'text-fg'} />
      </div>

      <h4 className="font-semibold mb-2">Statistik per Grup</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-card/50">
            <tr>{['Grup', 'n', 'Mean Rank', 'Sum Rank'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-3 py-2 font-medium">{r.groupNames[0]}</td><td className="px-3 py-2">{r.n1}</td><td className="px-3 py-2">{num(r.meanRank1, 2)}</td><td className="px-3 py-2">{num(r.R1, 1)}</td></tr>
            <tr><td className="px-3 py-2 font-medium">{r.groupNames[1]}</td><td className="px-3 py-2">{r.n2}</td><td className="px-3 py-2">{num(r.meanRank2, 2)}</td><td className="px-3 py-2">{num(r.R2, 1)}</td></tr>
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
        <Stat label="Status" value={r.isSignificant ? 'Signifikan ✅' : 'Tidak signifikan'}
              accent={r.isSignificant ? 'text-accent' : 'text-fg'} />
      </div>

      <h4 className="font-semibold mb-2">Statistik per Grup</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-card/50">
            <tr>{['Grup', 'n', 'Median', 'Mean Rank'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {r.groupStats.map((g, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-medium">{g.name}</td>
                <td className="px-3 py-2">{g.n}</td>
                <td className="px-3 py-2">{num(g.median, 2)}</td>
                <td className="px-3 py-2">{num(g.meanRank, 2)}</td>
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
          accent={r.kategoriKelas === 'Tinggi' ? 'text-accent' : r.kategoriKelas === 'Sedang' ? 'text-amber-600' : 'text-red-600'}
        />
      </div>

      <div className={`rounded-xl p-3 mb-4 text-sm border ${
        r.tafsiranEfektivitas === 'Efektif'        ? 'bg-green-50 border-green-200 text-green-800' :
        r.tafsiranEfektivitas === 'Cukup Efektif'  ? 'bg-accent/5 border-sky-200 text-accent' :
        r.tafsiranEfektivitas === 'Kurang Efektif' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                                     'bg-red-50 border-red-200 text-red-800'
      }`}>
        <strong>Tafsiran Efektivitas:</strong> {r.tafsiranEfektivitas} ({num(r.efektivitasPersen, 2)}%) ·
        kategori klasifikasi Hake (1998).
      </div>

      <h4 className="font-semibold mb-2">Statistik Pre-test vs Post-test</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-card/50">
            <tr>{['Variabel', 'Mean', 'SD', 'Min', 'Max'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-3 py-2 font-medium">Pre-test ({r.column1})</td>
              <td className="px-3 py-2">{num(r.preStats.mean, 2)}</td>
              <td className="px-3 py-2">{num(r.preStats.sd, 2)}</td>
              <td className="px-3 py-2">{num(r.preStats.min, 2)}</td>
              <td className="px-3 py-2">{num(r.preStats.max, 2)}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium">Post-test ({r.column2})</td>
              <td className="px-3 py-2">{num(r.postStats.mean, 2)}</td>
              <td className="px-3 py-2">{num(r.postStats.sd, 2)}</td>
              <td className="px-3 py-2">{num(r.postStats.min, 2)}</td>
              <td className="px-3 py-2">{num(r.postStats.max, 2)}</td>
            </tr>
            <tr className="bg-accent/5/50">
              <td className="px-3 py-2 font-medium">Rata-rata Selisih</td>
              <td className="px-3 py-2 font-bold text-sky-700" colSpan={4}>
                {num(r.postStats.mean - r.preStats.mean, 2)} poin
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h4 className="font-semibold mb-2">Distribusi Kategori N-Gain</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-card/50">
            <tr>{['Kategori', 'Rentang', 'Jumlah', '%', 'Visualisasi'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { kat: 'Tinggi',  range: 'g ≥ 0.7',           color: 'bg-green-500' },
              { kat: 'Sedang',  range: '0.3 ≤ g < 0.7',     color: 'bg-amber-500' },
              { kat: 'Rendah',  range: 'g < 0.3',           color: 'bg-red-500' },
            ].map(({ kat, range, color }) => {
              const n = r.distribusi[kat] || 0
              const pct = totalKategori > 0 ? (n / totalKategori) * 100 : 0
              return (
                <tr key={kat}>
                  <td className="px-3 py-2 font-medium">{kat}</td>
                  <td className="px-3 py-2 text-muted">{range}</td>
                  <td className="px-3 py-2 font-bold">{n}</td>
                  <td className="px-3 py-2">{pct.toFixed(1)}%</td>
                  <td className="px-3 py-2">
                    <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {sig && (
        <div className={`rounded-xl p-4 mb-4 border ${
          sig.significant ? 'bg-green-50 border-green-200' : 'bg-card/50 border-border'
        }`}>
          <h4 className="font-semibold mb-2 text-sm">Uji Signifikansi (Paired t-test)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div><span className="text-muted">t:</span> <strong>{num(sig.t, 3)}</strong></div>
            <div><span className="text-muted">df:</span> <strong>{sig.df}</strong></div>
            <div><span className="text-muted">p-value:</span> <strong>{pct(sig.pValue)}</strong></div>
            <div><span className="text-muted">Cohen's d:</span> <strong>{num(sig.cohensD, 3)}</strong></div>
          </div>
          <p className="text-xs mt-2 text-fg">
            {sig.significant
              ? `✅ Peningkatan signifikan secara statistik (p < 0.05). Selisih rata-rata: ${num(sig.meanDiff, 2)} poin.`
              : `❌ Peningkatan TIDAK signifikan secara statistik (p ≥ 0.05). Selisih rata-rata: ${num(sig.meanDiff, 2)} poin.`
            }
          </p>
        </div>
      )}

      <details className="border border-border rounded-xl overflow-hidden mb-4">
        <summary className="px-4 py-2.5 bg-card/50 hover:bg-surface cursor-pointer text-sm font-medium">
          Detail per Subjek ({r.pairs.length}) — klik untuk buka
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-card/50 sticky top-0">
              <tr>{['No', 'Nama', 'Pre', 'Post', 'Gain', 'N-Gain', 'Kategori'].map(h =>
                <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {r.pairs.map((p, i) => (
                <tr key={i}>
                  <td className="px-3 py-1.5">{i + 1}</td>
                  <td className="px-3 py-1.5 font-medium">{p.name}</td>
                  <td className="px-3 py-1.5">{p.pre}</td>
                  <td className="px-3 py-1.5">{p.post}</td>
                  <td className={`px-3 py-1.5 ${p.gain > 0 ? 'text-accent' : p.gain < 0 ? 'text-red-600' : ''}`}>
                    {p.gain > 0 ? '+' : ''}{p.gain}
                  </td>
                  <td className="px-3 py-1.5 font-bold">{num(p.nGain, 3)}</td>
                  <td className="px-3 py-1.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                      p.kategori === 'Tinggi' ? 'bg-green-100 text-green-700' :
                      p.kategori === 'Sedang' ? 'bg-amber-100 text-amber-700' :
                                                'bg-red-100 text-red-700'
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

export function TwoWayANOVAResult({ r }) {
  if (r.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        <strong>Error:</strong> {r.error}
      </div>
    )
  }
  const anySignificant = r.significantA || r.significantB || r.significantInteraction
  const fmtP = (p) => p === null ? '—' : (p < 0.001 ? '< 0.001' : num(p, 4))
  const verdict = (sig, name) => sig
    ? `✅ Pengaruh ${name} signifikan`
    : `❌ Pengaruh ${name} tidak signifikan`
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
        <Stat label="Desain" value={r.isBalanced ? 'Balanced' : 'Unbalanced'} accent={r.isBalanced ? 'text-accent' : 'text-amber-600'} />
      </div>

      <div className={`rounded-xl p-3 mb-4 text-sm border ${
        r.significantInteraction ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-card/50 border-border text-fg'
      }`}>
        <strong>Ringkasan:</strong>
        <ul className="mt-1 space-y-0.5 list-disc list-inside">
          <li>{verdict(r.significantA, r.nameA)} (partial η² = {num(r.factorA.partialEtaSquared, 3)} · {r.factorA.effectSize})</li>
          <li>{verdict(r.significantB, r.nameB)} (partial η² = {num(r.factorB.partialEtaSquared, 3)} · {r.factorB.effectSize})</li>
          <li>{verdict(r.significantInteraction, `interaksi ${r.nameA}×${r.nameB}`)} (partial η² = {num(r.interaction.partialEtaSquared, 3)} · {r.interaction.effectSize})</li>
        </ul>
        {r.significantInteraction && (
          <p className="mt-2 text-xs italic">
            ⚠️ Karena interaksi signifikan, efek utama harus diinterpretasikan dengan hati-hati — efek satu faktor bergantung pada level faktor lain (lihat tabel cell means).
          </p>
        )}
      </div>

      <h4 className="font-semibold mb-2">Tabel ANOVA</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-card/50">
            <tr>{['Source', 'SS', 'df', 'MS', 'F', 'p-value', 'partial η²', 'Effect'].map(h =>
              <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {r.anovaTable.map((row, i) => (
              <tr key={i} className={row.significant ? 'bg-green-50/40' : ''}>
                <td className="px-3 py-2 font-medium">{row.source}</td>
                <td className="px-3 py-2">{num(row.SS, 3)}</td>
                <td className="px-3 py-2">{row.df}</td>
                <td className="px-3 py-2">{row.MS === null ? '—' : num(row.MS, 3)}</td>
                <td className="px-3 py-2 font-bold">{row.F === null ? '—' : num(row.F, 3)}</td>
                <td className="px-3 py-2">{fmtP(row.pValue)}</td>
                <td className="px-3 py-2">{row.partialEtaSquared === null ? '—' : num(row.partialEtaSquared, 3)}</td>
                <td className="px-3 py-2 text-xs text-muted">{row.effectSize || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 className="font-semibold mb-2">Cell Means ({r.nameA} × {r.nameB})</h4>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-card/50">
            <tr>{[r.nameA, r.nameB, 'n', 'Mean', 'SD'].map(h =>
              <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {r.cellTable.map((c, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-medium">{c.levelA}</td>
                <td className="px-3 py-2 font-medium">{c.levelB}</td>
                <td className="px-3 py-2">{c.n}</td>
                <td className="px-3 py-2 font-bold">{num(c.mean, 3)}</td>
                <td className="px-3 py-2">{num(c.sd, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!r.isBalanced && (
          <p className="text-xs text-amber-700 mt-2">
            ⚠️ Desain unbalanced (n sel: {r.cellSizesRange.min}–{r.cellSizesRange.max}). F-test menggunakan pendekatan cell-means (mendekati Type III). Untuk inference ketat, verifikasi di R/SPSS.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="font-semibold mb-2 text-sm">Marginal Means: {r.nameA}</h4>
          <table className="w-full text-sm">
            <thead className="bg-card/50"><tr><th className="px-3 py-2 text-left">Level</th><th className="px-3 py-2 text-left">n</th><th className="px-3 py-2 text-left">Mean</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {r.marginalA.map((m, i) => (
                <tr key={i}><td className="px-3 py-2 font-medium">{m.level}</td><td className="px-3 py-2">{m.n}</td><td className="px-3 py-2 font-bold">{num(m.mean, 3)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-sm">Marginal Means: {r.nameB}</h4>
          <table className="w-full text-sm">
            <thead className="bg-card/50"><tr><th className="px-3 py-2 text-left">Level</th><th className="px-3 py-2 text-left">n</th><th className="px-3 py-2 text-left">Mean</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {r.marginalB.map((m, i) => (
                <tr key={i}><td className="px-3 py-2 font-medium">{m.level}</td><td className="px-3 py-2">{m.n}</td><td className="px-3 py-2 font-bold">{num(m.mean, 3)}</td></tr>
              ))}
            </tbody>
          </table>
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

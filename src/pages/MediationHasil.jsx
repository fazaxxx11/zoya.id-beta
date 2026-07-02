// MediationHasil — page terpisah buat nampilin hasil Mediasi/Moderasi.
// Sebelumnya result dirender inline di /mediasi (numpuk dgn form input).
// Sekarang Mediation.jsx persist result ke localStorage + navigate ke sini.
//
// Result components di-pindah dari Mediation.jsx (tool page sekarang cuma
// form input + persist + navigate). Branch pada result._model:
// 'mediation' → MediationResult, 'moderation' → ModerationResult.

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Info, Wand2, RotateCcw, ArrowRight,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SaveAnalysisButton from '../components/SaveAnalysisButton'
import AIInterpretationPanel from '../components/AIInterpretationPanel'
import { usePersist } from '../hooks/usePersist'
import { toast } from '../lib/toast'

export default function MediationHasil() {
  const navigate = useNavigate()
  const [result] = usePersist('mediation_result', null)
  const [aiInterpretation, setAiInterpretation] = useState('')

  const handleBack = useCallback(() => {
    navigate('/mediasi')
  }, [navigate])

  const handleReset = useCallback(() => {
    try { localStorage.removeItem('mediation_result') } catch {}
    navigate('/mediasi')
  }, [navigate])

  if (!result) {
    return (
      <div className="min-h-screen pb-bottomnav" style={{ backgroundColor: 'rgb(var(--bg))' }}>
        <PageHeader
          title="Hasil Mediasi/Moderasi"
          subtitle="MEDIASI · HASIL"
          parentPath="/mediasi"
          parentLabel="Mediasi/Moderasi"
        />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-sm text-muted mb-4">Belum ada hasil analisis. Jalankan analisis dulu di halaman Mediasi/Moderasi.</p>
          <button onClick={() => navigate('/mediasi')}
            className="px-5 py-2.5 bg-accent hover:bg-accent/90 text-accent-fg text-sm font-medium rounded-lg">
            Ke Mediasi/Moderasi
          </button>
        </div>
      </div>
    )
  }

  const modelLabel = result._model === 'mediation' ? 'Mediasi' : 'Moderasi'

  return (
    <div className="min-h-screen pb-bottomnav" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title={`Hasil ${modelLabel}`}
        subtitle="MEDIASI · HASIL"
        parentPath="/mediasi"
        parentLabel="Mediasi/Moderasi"
        breadcrumbs={[
          { path: '/mediasi', label: 'Mediasi/Moderasi' },
          { label: 'Hasil' },
        ]}
        actions={
          <button onClick={handleReset}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border flex items-center gap-1.5 bg-card text-fg border-border hover:bg-surface">
            <RotateCcw className="w-3.5 h-3.5" /> Analisis Baru
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-4 space-y-4">
        <div className="flex justify-end">
          <SaveAnalysisButton result={result} defaultTitle={modelLabel} />
        </div>

        {result._model === 'mediation' && <MediationResult r={result} />}
        {result._model === 'moderation' && <ModerationResult r={result} />}

        <AIInterpretationPanel
          result={result}
          value={aiInterpretation}
          onChange={setAiInterpretation}
        />

        <div className="flex justify-center pt-2">
          <button onClick={handleBack}
            className="px-5 py-2.5 rounded-lg text-sm font-heading font-semibold bg-accent text-accent-fg hover:bg-accent/90 transition-colors flex items-center gap-2">
            <ArrowRight className="w-4 h-4" /> Analisis Lain
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Mediation result panel — dipindah dari Mediation.jsx
// ============================================================
function MediationResult({ r }) {
  return (
    <>
      <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-accent" /> Hasil Mediasi (Model 4)
        </h3>

        {/* Path diagram */}
        <PathDiagram paths={r.paths} indirect={r.indirect.ab} />

        {/* Paths table */}
        <table className="w-full text-xs mt-4">
          <thead className="bg-surface">
            <tr>
              <th className="px-2 py-1.5 text-left">Path</th>
              <th className="px-2 py-1.5 text-right">Coef</th>
              <th className="px-2 py-1.5 text-right">SE</th>
              <th className="px-2 py-1.5 text-right">t</th>
              <th className="px-2 py-1.5 text-right">p</th>
              <th className="px-2 py-1.5 text-center">Sig</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <PathRow name="a (X→M)" data={r.paths.a} />
            <PathRow name="b (M→Y | X)" data={r.paths.b} />
            <PathRow name="c (X→Y total)" data={r.paths.c} />
            <PathRow name="c' (X→Y direct)" data={r.paths.cp} />
          </tbody>
        </table>

        {/* Indirect effect */}
        <div className="mt-3 bg-accent/10 border border-accent/30 rounded-lg p-3">
          <div className="text-xs font-semibold text-fg mb-1">Indirect Effect (a · b)</div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-muted">Estimate</div>
              <div className="font-mono text-base font-bold">{r.indirect.ab.toFixed(4)}</div>
              {r.indirect.standardized !== null && (
                <div className="text-[10px] text-muted">
                  Standardized: {r.indirect.standardized.toFixed(4)}
                </div>
              )}
            </div>
            <div>
              <div className="text-muted">
                Bootstrap {((1 - r.indirect.bootstrap.alpha) * 100).toFixed(0)}% CI
              </div>
              <div className="font-mono text-base">
                [{r.indirect.bootstrap.ciLow.toFixed(4)}, {r.indirect.bootstrap.ciHigh.toFixed(4)}]
              </div>
              <div className="text-[10px]">
                {r.indirect.bootstrap.significant ? (
                  <span className="text-green-700">✓ Signifikan (CI tidak melewati 0)</span>
                ) : (
                  <span className="text-muted">CI mencakup 0 → tidak signifikan</span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-accent/30 text-[11px] text-fg">
            <strong>Sobel test:</strong> z = {r.indirect.sobel.z.toFixed(3)}, p = {r.indirect.sobel.p.toFixed(4)}
          </div>
        </div>

        {/* Mediation type */}
        <div className="mt-3 bg-accent-soft border border-accent/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />
            <div className="text-xs text-fg">
              <div className="font-semibold mb-1">Interpretasi: {r.mediationType}</div>
              <div className="leading-relaxed">
                {r.mediationType.includes('penuh') && 'Efek X terhadap Y sepenuhnya melalui M. Setelah M dikontrol, X tidak lagi berpengaruh signifikan terhadap Y.'}
                {r.mediationType.includes('parsial') && 'M memediasi sebagian efek X ke Y. X masih punya efek langsung yang signifikan setelah M dikontrol.'}
                {r.mediationType.includes('inconsistent') && 'Efek tidak langsung dan langsung berlawanan arah (suppression effect). Perlu interpretasi hati-hati.'}
                {r.mediationType.includes('tidak ada') && 'Tidak ada bukti mediasi yang signifikan dari data ini.'}
                {r.mediationType.includes('kemungkinan') && 'Ada indikasi mediasi tapi bootstrap CI belum membuktikan secara ketat. Pertimbangkan ukuran sampel.'}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-muted">
          n = {r.n} · R² (M) = {r.rSquaredM.toFixed(3)} · R² (Y total) = {r.rSquaredYTotal.toFixed(3)} · R² (Y direct) = {r.rSquaredYDirect.toFixed(3)}
        </div>
      </div>

      <ReportTextMediation r={r} />
    </>
  )
}

function PathRow({ name, data }) {
  const sig = data.p < 0.001 ? '***' : data.p < 0.01 ? '**' : data.p < 0.05 ? '*' : ''
  return (
    <tr className="hover:bg-surface">
      <td className="px-2 py-1.5 font-medium">{name}</td>
      <td className="px-2 py-1.5 text-right font-mono">{data.coef.toFixed(4)}</td>
      <td className="px-2 py-1.5 text-right font-mono">{data.se.toFixed(4)}</td>
      <td className="px-2 py-1.5 text-right font-mono">{data.t.toFixed(2)}</td>
      <td className="px-2 py-1.5 text-right font-mono">{data.p.toFixed(4)}</td>
      <td className="px-2 py-1.5 text-center text-accent font-bold">{sig}</td>
    </tr>
  )
}

function PathDiagram({ paths, indirect }) {
  return (
    <div className="bg-surface rounded-lg p-4 my-2">
      <div className="flex items-center justify-around gap-2">
        <Box label="X" />
        <PathArrow label={`a = ${paths.a.coef.toFixed(2)}`} sig={paths.a.p < 0.05} />
        <Box label="M" highlight />
        <PathArrow label={`b = ${paths.b.coef.toFixed(2)}`} sig={paths.b.p < 0.05} />
        <Box label="Y" />
      </div>
      <div className="text-center mt-2 text-xs text-muted">
        <span>c' (direct) = </span>
        <span className={`font-mono font-bold ${paths.cp.p < 0.05 ? 'text-green-700' : ''}`}>
          {paths.cp.coef.toFixed(3)}
        </span>
        <span className="mx-2">·</span>
        <span>indirect (a·b) = </span>
        <span className="font-mono font-bold text-accent">{indirect.toFixed(3)}</span>
      </div>
    </div>
  )
}

function Box({ label, highlight }) {
  return (
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
      highlight ? 'bg-accent/15 border-2 border-accent text-accent' : 'bg-card border-2 border-border'
    }`}>
      {label}
    </div>
  )
}

function PathArrow({ label, sig }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`text-[10px] font-mono ${sig ? 'text-green-700 font-bold' : 'text-muted'}`}>
        {label}
      </div>
      <div className="text-xl text-muted">→</div>
    </div>
  )
}

function ReportTextMediation({ r }) {
  const text = `Hasil analisis mediasi (Hayes Model 4) menunjukkan bahwa jalur a (X→M) sebesar ${r.paths.a.coef.toFixed(3)} (SE = ${r.paths.a.se.toFixed(3)}, p = ${r.paths.a.p.toFixed(3)}), dan jalur b (M→Y, mengontrol X) sebesar ${r.paths.b.coef.toFixed(3)} (SE = ${r.paths.b.se.toFixed(3)}, p = ${r.paths.b.p.toFixed(3)}). Efek total c sebesar ${r.paths.c.coef.toFixed(3)} (p = ${r.paths.c.p.toFixed(3)}); efek langsung c' sebesar ${r.paths.cp.coef.toFixed(3)} (p = ${r.paths.cp.p.toFixed(3)}). Efek tidak langsung (a·b) = ${r.indirect.ab.toFixed(3)} dengan ${((1 - r.indirect.bootstrap.alpha)*100).toFixed(0)}% bootstrap CI [${r.indirect.bootstrap.ciLow.toFixed(3)}, ${r.indirect.bootstrap.ciHigh.toFixed(3)}] berdasarkan ${r.indirect.bootstrap.n} resamples. ${r.indirect.bootstrap.significant ? 'Mediasi signifikan' : 'Mediasi tidak signifikan'}: ${r.mediationType}.`

  return (
    <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">Teks untuk Bab IV</h3>
        <button onClick={() => { navigator.clipboard.writeText(text); toast.success('Disalin') }} className="text-xs text-accent hover:text-accent">
          Salin
        </button>
      </div>
      <p className="text-xs leading-relaxed text-fg/80 whitespace-pre-wrap">{text}</p>
    </div>
  )
}

// ============================================================
// Moderation result panel — dipindah dari Mediation.jsx
// ============================================================
function ModerationResult({ r }) {
  return (
    <>
      <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-accent" /> Hasil Moderasi (Model 1)
        </h3>

        <div className="text-xs text-muted mb-3">
          Y = b₀ + b₁·X + b₂·W + b₃·(X·W){r.centered ? ' — variabel di-mean-center' : ''}
        </div>

        <table className="w-full text-xs">
          <thead className="bg-surface">
            <tr>
              <th className="px-2 py-1.5 text-left">Term</th>
              <th className="px-2 py-1.5 text-right">Coef</th>
              <th className="px-2 py-1.5 text-right">SE</th>
              <th className="px-2 py-1.5 text-right">t</th>
              <th className="px-2 py-1.5 text-right">p</th>
              <th className="px-2 py-1.5 text-center">Sig</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <PathRow name="(Intercept)" data={r.coefficients.intercept} />
            <PathRow name="X" data={r.coefficients.X} />
            <PathRow name="W" data={r.coefficients.W} />
            <PathRow name="X · W (interaction)" data={r.coefficients.XW} />
          </tbody>
        </table>

        {/* Interaction status */}
        <div className={`mt-3 rounded-lg p-3 text-xs ${
          r.interactionSignificant
            ? 'bg-green-50 border border-green-200 text-green-900'
            : 'bg-surface border border-border text-fg/80'
        }`}>
          <div className="font-semibold mb-1">
            {r.interactionSignificant
              ? '✓ Interaksi X·W signifikan'
              : '✗ Interaksi X·W TIDAK signifikan'}
          </div>
          <p>
            {r.interactionSignificant
              ? `b₃ = ${r.coefficients.XW.coef.toFixed(3)} (p = ${r.coefficients.XW.p.toFixed(3)}). W memoderasi efek X→Y. Lihat conditional effects untuk detail.`
              : `b₃ = ${r.coefficients.XW.coef.toFixed(3)} (p = ${r.coefficients.XW.p.toFixed(3)}). Tidak ada bukti W memoderasi efek X→Y.`}
          </p>
        </div>

        {/* Simple slope plot */}
        <div className="mt-3">
          <div className="text-xs font-semibold mb-2">Simple Slope Plot</div>
          <SimpleSlopePlot r={r} />
          <p className="text-[11px] text-muted mt-1">
            Plot menunjukkan hubungan X→Y pada 3 level moderator W. Garis yang divergen = bukti interaksi.
          </p>
        </div>

        {/* Conditional effects (Aiken & West) */}
        <div className="mt-3">
          <div className="text-xs font-semibold mb-2">Conditional Effect of X (pick-a-point: -1 SD, Mean, +1 SD)</div>
          <table className="w-full text-xs">
            <thead className="bg-surface">
              <tr>
                <th className="px-2 py-1.5 text-left">Pada W =</th>
                <th className="px-2 py-1.5 text-right">Effect</th>
                <th className="px-2 py-1.5 text-right">SE</th>
                <th className="px-2 py-1.5 text-right">t</th>
                <th className="px-2 py-1.5 text-right">p</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <CondRow label={`Low (M − 1SD = ${r.conditionalEffects.atLow.wValue.toFixed(2)})`} data={r.conditionalEffects.atLow} />
              <CondRow label={`Mean (${r.conditionalEffects.atMean.wValue.toFixed(2)})`} data={r.conditionalEffects.atMean} />
              <CondRow label={`High (M + 1SD = ${r.conditionalEffects.atHigh.wValue.toFixed(2)})`} data={r.conditionalEffects.atHigh} />
            </tbody>
          </table>
        </div>

        {/* Johnson-Neyman */}
        <div className="mt-3 bg-accent-soft border border-accent/20 rounded-lg p-3 text-xs">
          <div className="font-semibold text-fg mb-1">Johnson-Neyman</div>
          <p className="text-fg">{r.johnsonNeyman.note}</p>
        </div>

        <div className="mt-3 text-[11px] text-muted">
          n = {r.n} · R² = {r.rSquared.toFixed(3)} · df = {r.df}
        </div>
      </div>

      <ReportTextModeration r={r} />
    </>
  )
}

// Simple slope plot — 3 lines (low/mean/high W) on Y vs X plane
// =============================================================
// Predicted Y at fixed W = w*:
//   Y(X) = (b0 + b2·w*) + (b1 + b3·w*)·X
// where W and X here are in centered scale (since lib runs with center=true).
// X axis range: ±2·SD around mean (covers ~95% of normal data).
function SimpleSlopePlot({ r }) {
  const b = r.coefficients
  const meanX = r.means.X
  const meanW = r.means.W
  const sdX = r.sdX || 1
  const sdW = r.sdW || 1
  const isCentered = r.centered

  // X range in raw scale (display) and centered scale (compute)
  const xMinRaw = meanX - 2 * sdX
  const xMaxRaw = meanX + 2 * sdX

  // 3 levels of W: low, mean, high — in centered scale for compute
  const levels = [
    { label: '−1 SD',     wCentered: -sdW,  raw: meanW - sdW, color: '#3b82f6', dash: '4,4' },
    { label: 'Mean',      wCentered: 0,     raw: meanW,        color: '#6366f1', dash: '0' },
    { label: '+1 SD',     wCentered: sdW,   raw: meanW + sdW, color: '#ef4444', dash: '4,4' },
  ]

  // Predict Y at X for given W (centered)
  const predict = (xRaw, wCentered) => {
    const xCentered = isCentered ? (xRaw - meanX) : xRaw
    return b.intercept.coef
         + b.X.coef  * xCentered
         + b.W.coef  * wCentered
         + b.XW.coef * xCentered * wCentered
  }

  // Compute lines (X axis: 20 points)
  const lines = levels.map(L => {
    const points = []
    for (let i = 0; i <= 20; i++) {
      const x = xMinRaw + (xMaxRaw - xMinRaw) * (i / 20)
      points.push({ x, y: predict(x, L.wCentered) })
    }
    return { ...L, points, slope: b.X.coef + b.XW.coef * L.wCentered }
  })

  // Y range: take min and max across all lines
  const allY = lines.flatMap(l => l.points.map(p => p.y))
  const yMin = Math.min(...allY)
  const yMax = Math.max(...allY)
  const yPad = (yMax - yMin) * 0.1 || 1
  const yLo = yMin - yPad
  const yHi = yMax + yPad

  // SVG dimensions
  const width = 480
  const height = 280
  const margin = { top: 16, right: 110, bottom: 36, left: 44 }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  const xScale = (x) => margin.left + ((x - xMinRaw) / (xMaxRaw - xMinRaw)) * innerW
  const yScale = (y) => margin.top + (1 - (y - yLo) / (yHi - yLo)) * innerH

  // Tick generation
  const xTicks = [xMinRaw, meanX - sdX, meanX, meanX + sdX, xMaxRaw]
  const yTicks = [yLo, (yLo + yHi) / 2, yHi]

  return (
    <div className="bg-surface rounded-lg p-3 overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="max-w-full h-auto">
        {/* Background grid */}
        {yTicks.map((yt, i) => (
          <line
            key={'gy' + i}
            x1={margin.left} x2={margin.left + innerW}
            y1={yScale(yt)} y2={yScale(yt)}
            stroke="#e5e7eb" strokeDasharray="2,3"
          />
        ))}

        {/* X axis */}
        <line x1={margin.left} x2={margin.left + innerW}
              y1={margin.top + innerH} y2={margin.top + innerH}
              stroke="#9ca3af" />
        {xTicks.map((xt, i) => (
          <g key={'xt' + i}>
            <line x1={xScale(xt)} x2={xScale(xt)}
                  y1={margin.top + innerH} y2={margin.top + innerH + 4}
                  stroke="#9ca3af" />
            <text x={xScale(xt)} y={margin.top + innerH + 16}
                  textAnchor="middle" fontSize="10" fill="#6b7280">
              {xt.toFixed(2)}
            </text>
          </g>
        ))}
        <text x={margin.left + innerW / 2} y={height - 4}
              textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600">
          X (predictor)
        </text>

        {/* Y axis */}
        <line x1={margin.left} x2={margin.left}
              y1={margin.top} y2={margin.top + innerH}
              stroke="#9ca3af" />
        {yTicks.map((yt, i) => (
          <g key={'yt' + i}>
            <line x1={margin.left - 4} x2={margin.left}
                  y1={yScale(yt)} y2={yScale(yt)}
                  stroke="#9ca3af" />
            <text x={margin.left - 6} y={yScale(yt) + 3}
                  textAnchor="end" fontSize="10" fill="#6b7280">
              {yt.toFixed(2)}
            </text>
          </g>
        ))}
        <text x={12} y={margin.top + innerH / 2}
              textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600"
              transform={`rotate(-90, 12, ${margin.top + innerH / 2})`}>
          Y (predicted)
        </text>

        {/* Mean X marker */}
        <line x1={xScale(meanX)} x2={xScale(meanX)}
              y1={margin.top} y2={margin.top + innerH}
              stroke="#d1d5db" strokeDasharray="2,4" />

        {/* Lines */}
        {lines.map((L, i) => (
          <polyline
            key={i}
            fill="none"
            stroke={L.color}
            strokeWidth={L.label === 'Mean' ? 2.5 : 2}
            strokeDasharray={L.dash}
            points={L.points.map(p => `${xScale(p.x)},${yScale(p.y)}`).join(' ')}
          />
        ))}

        {/* Legend (right side) */}
        <g transform={`translate(${margin.left + innerW + 8}, ${margin.top + 4})`}>
          {lines.map((L, i) => (
            <g key={i} transform={`translate(0, ${i * 32})`}>
              <line x1={0} x2={20} y1={6} y2={6}
                    stroke={L.color} strokeWidth={2}
                    strokeDasharray={L.dash} />
              <text x={26} y={9} fontSize="10" fill="#374151" fontWeight="600">
                W: {L.label}
              </text>
              <text x={26} y={22} fontSize="9" fill="#6b7280">
                slope = {L.slope.toFixed(3)}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

function CondRow({ label, data }) {
  return (
    <tr>
      <td className="px-2 py-1.5">{label}</td>
      <td className="px-2 py-1.5 text-right font-mono">{data.effect.toFixed(4)}</td>
      <td className="px-2 py-1.5 text-right font-mono">{data.se.toFixed(4)}</td>
      <td className="px-2 py-1.5 text-right font-mono">{data.t.toFixed(2)}</td>
      <td className="px-2 py-1.5 text-right font-mono">
        <span className={data.p < 0.05 ? 'font-bold text-accent' : ''}>{data.p.toFixed(4)}</span>
      </td>
    </tr>
  )
}

function ReportTextModeration({ r }) {
  const text = `Hasil analisis moderasi (Hayes Model 1) menunjukkan koefisien interaksi X·W sebesar ${r.coefficients.XW.coef.toFixed(3)} (SE = ${r.coefficients.XW.se.toFixed(3)}, t = ${r.coefficients.XW.t.toFixed(2)}, p = ${r.coefficients.XW.p.toFixed(3)}). ${r.interactionSignificant ? 'W secara signifikan memoderasi efek X terhadap Y.' : 'W tidak signifikan memoderasi efek X→Y.'} Efek X pada level rendah W adalah ${r.conditionalEffects.atLow.effect.toFixed(3)} (p = ${r.conditionalEffects.atLow.p.toFixed(3)}); pada rata-rata W: ${r.conditionalEffects.atMean.effect.toFixed(3)} (p = ${r.conditionalEffects.atMean.p.toFixed(3)}); pada level tinggi W: ${r.conditionalEffects.atHigh.effect.toFixed(3)} (p = ${r.conditionalEffects.atHigh.p.toFixed(3)}). Model menjelaskan ${(r.rSquared * 100).toFixed(1)}% varians Y (R² = ${r.rSquared.toFixed(3)}, n = ${r.n}).`

  return (
    <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">Teks untuk Bab IV</h3>
        <button onClick={() => { navigator.clipboard.writeText(text); toast.success('Disalin') }} className="text-xs text-accent hover:text-accent">
          Salin
        </button>
      </div>
      <p className="text-xs leading-relaxed text-fg/80 whitespace-pre-wrap">{text}</p>
    </div>
  )
}

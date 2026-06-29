// Logistic Regression UI
// ======================
// Halaman analisis regresi logistik biner: prediksi outcome 0/1 dari
// satu atau lebih predictor.

import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, Play, Upload, AlertTriangle, Info,
  TrendingUp, Target, BarChart2,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SaveAnalysisButton from '../components/SaveAnalysisButton'
import ConfirmPaymentModal from '../components/ConfirmPaymentModal'
import AIInterpretationPanel from '../components/AIInterpretationPanel'
import {
  classificationTable,
} from '../lib/logisticRegression'
import { runLogistic } from '../lib/statsWorkerClient'
import { checkPaywall, chargeForTool } from '../lib/paywall'
import { getWallet } from '../lib/wallet'
import { getStatisticsPriceWithDiscount } from '../lib/pricing'
import { toast } from '../lib/toast'

export default function LogisticPage() {
  const navigate = useNavigate()
  const [csvText, setCsvText] = useState(SAMPLE_CSV)
  const [yColumn, setYColumn] = useState('lulus')
  const [xColumns, setXColumns] = useState(['nilai_un', 'jam_belajar', 'kehadiran'])
  const [threshold, setThreshold] = useState(0.5)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [running, setRunning] = useState(false)
  const [aiInterpretation, setAiInterpretation] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const fileRef = useRef(null)

  const parsed = useMemo(() => parseCSV(csvText), [csvText])
  const pricing = getStatisticsPriceWithDiscount('logistic', parsed.rows.length)
  const wallet = getWallet()

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = ev => { setCsvText(String(ev.target.result || '')); toast.info(`File "${f.name}" dimuat`) }
    r.readAsText(f)
    e.target.value = ''
  }

  const toggleX = (col) => {
    setXColumns(xs => xs.includes(col) ? xs.filter(c => c !== col) : [...xs, col])
  }

  const handleRunClick = () => {
    const gate = checkPaywall('logistic', parsed.rows.length, navigate)
    if (!gate.allowed) {
      gate.action?.()
      return
    }
    setShowPayment(true)
  }

  const run = async () => {
    setError(null)
    setRunning(true)
    try {
      if (!parsed.headers.length) throw new Error('Data kosong')
      const yIdx = parsed.headers.indexOf(yColumn)
      if (yIdx < 0) throw new Error(`Kolom outcome "${yColumn}" tidak ada`)
      if (xColumns.length === 0) throw new Error('Pilih minimal 1 predictor')
      const xIdxs = xColumns.map(c => {
        const i = parsed.headers.indexOf(c)
        if (i < 0) throw new Error(`Predictor "${c}" tidak ada`)
        return i
      })

      const X = parsed.rows.map(r => xIdxs.map(i => Number(r[i])))
      const y = parsed.rows.map(r => Number(r[yIdx]))

      const { fit, cm, roc, hl } = await runLogistic({
        X, y, predictorNames: xColumns, threshold,
      })
      const payment = chargeForTool('logistic', parsed.rows.length)
      if (!payment.success) throw new Error(payment.error || 'Pembayaran gagal')

      setResult({ fit, cm, roc, hl, paid: payment.paid || 0 })
      setShowPayment(false)
      toast.success('Analisis selesai')
    } catch (err) {
      setError(err.message)
      setResult(null)
      toast.error(err.message)
    } finally {
      setRunning(false)
    }
  }

  // Recompute classification table when threshold changes
  const cmAtThreshold = useMemo(() => {
    if (!result) return null
    return classificationTable(result.fit.yObserved, result.fit.predicted, threshold)
  }, [result, threshold])

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title="Regresi Logistik"
        subtitle="Prediksi outcome biner (0/1) dari predictor numerik"
        breadcrumbs={[
          { path: '/', label: 'Beranda' },
          { path: '/statistik', label: 'Statistik' },
          { path: '/logistik', label: 'Logistik' },
        ]}
      />

      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-4 space-y-4">
        {/* Hero */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-amber-900 mb-1">Regresi Logistik Biner</h2>
              <p className="text-xs text-amber-800">
                Untuk outcome <strong>0/1</strong> seperti: lulus/tidak, beli/tidak, sehat/sakit, diterima/ditolak.
                Output: koefisien β + odds ratio + classification accuracy + ROC/AUC + Hosmer-Lemeshow goodness-of-fit.
              </p>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Data (CSV dengan header)</span>
            <button onClick={() => fileRef.current?.click()} className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1">
              <Upload className="w-3.5 h-3.5" /> Upload CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
          </div>
          <textarea
            value={csvText} onChange={e => setCsvText(e.target.value)}
            rows={8} className="w-full font-mono text-xs border border-border rounded-lg p-2"
          />
          {parsed.headers.length > 0 && (
            <p className="text-[11px] text-muted">
              {parsed.rows.length} baris × {parsed.headers.length} kolom: {parsed.headers.join(', ')}
            </p>
          )}

          {/* Column mapping */}
          {parsed.headers.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div>
                <label className="block text-xs font-medium text-fg/80 mb-1">Outcome (Y, harus 0/1)</label>
                <select value={yColumn} onChange={e => setYColumn(e.target.value)}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                  {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-fg/80">Predictors (X)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const others = parsed.headers.filter(h => h !== yColumn)
                      setXColumns(xColumns.length === others.length ? [] : others)
                    }}
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                  >
                    {xColumns.length === parsed.headers.filter(h => h !== yColumn).length ? 'Hapus Semua' : 'Pilih Semua'}
                  </button>
                </div>
                <div className="border border-border rounded-lg p-2 grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-32 overflow-y-auto">
                  {parsed.headers.filter(h => h !== yColumn).map(h => (
                    <label key={h} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-surface px-1.5 py-1 rounded">
                      <input type="checkbox" checked={xColumns.includes(h)} onChange={() => toggleX(h)} />
                      <span className="truncate">{h}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-muted mt-1">{xColumns.length} predictor dipilih</p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button onClick={handleRunClick} disabled={running} className="btn-primary text-sm disabled:opacity-50">
              <Play className="w-4 h-4" /> {running ? 'Memproses...' : 'Jalankan Analisis'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <>
            <div className="flex justify-end">
              <SaveAnalysisButton result={result.fit} defaultTitle={`Logistik — ${yColumn}`} />
            </div>
            <CoefficientsTable fit={result.fit} />
            <ModelFitSection fit={result.fit} />
            <ClassificationSection cm={cmAtThreshold} threshold={threshold} setThreshold={setThreshold} />
            <ROCSection roc={result.roc} />
            <HosmerLemeshowSection hl={result.hl} />
            <ReportText fit={result.fit} cm={cmAtThreshold} roc={result.roc} hl={result.hl} threshold={threshold} />
            
            <AIInterpretationPanel
              result={result}
              value={aiInterpretation}
              onChange={setAiInterpretation}
            />
          </>
        )}
      </div>

      <ConfirmPaymentModal
        open={showPayment}
        loading={running}
        title="Bayar & Jalankan Regresi Logistik"
        description={pricing.betaFree ? 'Gratis selama beta. Pricing paywall coming soon.' : 'Saldo dipotong setelah analisis berhasil diproses.'}
        price={pricing.price}
        originalPrice={pricing.original}
        priceBreakdown={pricing.breakdown}
        wallet={wallet}
        onConfirm={run}
        onClose={() => setShowPayment(false)}
      />
    </div>
  )
}

// ============================================================
// Coefficients table with odds ratios
// ============================================================
function CoefficientsTable({ fit }) {
  return (
    <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4 text-amber-600" /> Koefisien & Odds Ratio
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-surface">
            <tr>
              <th className="px-2 py-1.5 text-left">Variabel</th>
              <th className="px-2 py-1.5 text-right">β</th>
              <th className="px-2 py-1.5 text-right">SE</th>
              <th className="px-2 py-1.5 text-right">Wald z</th>
              <th className="px-2 py-1.5 text-right">p</th>
              <th className="px-2 py-1.5 text-right">Odds Ratio</th>
              <th className="px-2 py-1.5 text-center">95% CI</th>
              <th className="px-2 py-1.5 text-center">Sig</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fit.coefficients.map((c, i) => {
              const sig = c.p < 0.001 ? '***' : c.p < 0.01 ? '**' : c.p < 0.05 ? '*' : ''
              return (
                <tr key={i} className={i === 0 ? 'bg-surface/50' : ''}>
                  <td className="px-2 py-1.5 font-medium">{c.name}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{c.b.toFixed(4)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{c.se.toFixed(4)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{c.z.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{c.p.toFixed(4)}</td>
                  <td className="px-2 py-1.5 text-right font-mono font-semibold">{c.odds.toFixed(3)}</td>
                  <td className="px-2 py-1.5 text-center font-mono text-[11px]">[{c.oddsLow.toFixed(2)}, {c.oddsHigh.toFixed(2)}]</td>
                  <td className="px-2 py-1.5 text-center text-amber-600 font-bold">{sig}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted mt-2">
        <strong>Interpretasi OR:</strong> &gt; 1 = predictor naik 1 unit → odds outcome=1 naik;
        &lt; 1 = predictor naik 1 unit → odds outcome=1 turun. Sig: * p&lt;.05, ** p&lt;.01, *** p&lt;.001
      </p>
    </div>
  )
}

// ============================================================
// Model fit indices
// ============================================================
function ModelFitSection({ fit }) {
  return (
    <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
      <h3 className="font-semibold text-sm mb-3">Goodness of Fit Model</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <Metric label="McFadden R²"   value={fit.pseudoR2.mcfadden.toFixed(4)} />
        <Metric label="Cox-Snell R²"  value={fit.pseudoR2.coxSnell.toFixed(4)} />
        <Metric label="Nagelkerke R²" value={fit.pseudoR2.nagelkerke.toFixed(4)} highlight />
        <Metric label="Deviance"      value={fit.deviance.toFixed(2)} />
        <Metric label="AIC"           value={fit.aic.toFixed(2)} />
        <Metric label="BIC"           value={fit.bic.toFixed(2)} />
        <Metric label="-2LL"          value={(-2 * fit.logLikelihood).toFixed(2)} />
        <Metric label="Iterasi"       value={fit.iterations} />
      </div>

      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
        <div className="font-medium mb-0.5">Likelihood Ratio (vs null model)</div>
        <div>χ²({fit.likelihoodRatio.df}) = {fit.likelihoodRatio.chi2.toFixed(2)}, p = {fit.likelihoodRatio.p.toFixed(4)}</div>
        <div className="mt-1 text-[11px]">
          {fit.likelihoodRatio.p < 0.05
            ? '✓ Model signifikan lebih baik dari null model (intercept saja)'
            : '✗ Model tidak lebih baik secara signifikan dari null model'}
        </div>
      </div>

      <p className="text-[11px] text-muted mt-2">
        Pedoman: Nagelkerke R² 0.2-0.4 = cukup baik, 0.4+ = baik. McFadden R² 0.2-0.4 sudah dianggap excellent untuk logistik.
      </p>
    </div>
  )
}

// ============================================================
// Classification table
// ============================================================
function ClassificationSection({ cm, threshold, setThreshold }) {
  if (!cm) return null
  return (
    <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Target className="w-4 h-4 text-amber-600" /> Classification Table
      </h3>
      <div className="mb-3">
        <label className="block text-xs font-medium text-fg/80 mb-1">
          Threshold: <span className="text-amber-700 font-bold">{threshold.toFixed(2)}</span>
        </label>
        <input
          type="range" min={0.05} max={0.95} step={0.05}
          value={threshold} onChange={e => setThreshold(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <table className="w-full text-xs">
            <thead className="bg-surface">
              <tr>
                <th className="px-2 py-1.5"></th>
                <th className="px-2 py-1.5">Predicted: 0</th>
                <th className="px-2 py-1.5">Predicted: 1</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="px-2 py-1.5 bg-surface text-left">Actual: 0</th>
                <td className="px-2 py-1.5 text-center bg-green-50 font-mono font-bold">{cm.tn}</td>
                <td className="px-2 py-1.5 text-center bg-red-50/50 font-mono">{cm.fp}</td>
              </tr>
              <tr>
                <th className="px-2 py-1.5 bg-surface text-left">Actual: 1</th>
                <td className="px-2 py-1.5 text-center bg-red-50/50 font-mono">{cm.fn}</td>
                <td className="px-2 py-1.5 text-center bg-green-50 font-mono font-bold">{cm.tp}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Metric label="Akurasi"     value={(cm.accuracy * 100).toFixed(1) + '%'} highlight />
          <Metric label="Sensitivitas" value={(cm.sensitivity * 100).toFixed(1) + '%'} />
          <Metric label="Spesifisitas" value={(cm.specificity * 100).toFixed(1) + '%'} />
          <Metric label="Precision"   value={(cm.precision * 100).toFixed(1) + '%'} />
          <Metric label="F1 Score"    value={cm.f1.toFixed(3)} />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// ROC curve
// ============================================================
function ROCSection({ roc }) {
  const w = 360, h = 280, m = { top: 12, right: 12, bottom: 38, left: 44 }
  const innerW = w - m.left - m.right, innerH = h - m.top - m.bottom
  const sx = (x) => m.left + x * innerW
  const sy = (y) => m.top + (1 - y) * innerH
  const aucCat = roc.auc >= 0.9 ? 'excellent' : roc.auc >= 0.8 ? 'good' : roc.auc >= 0.7 ? 'fair' : roc.auc >= 0.6 ? 'poor' : 'fail'
  const aucColor = roc.auc >= 0.8 ? '#059669' : roc.auc >= 0.7 ? '#0891b2' : roc.auc >= 0.6 ? '#d97706' : '#dc2626'

  return (
    <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-amber-600" /> ROC Curve
        </h3>
        <div className="text-right">
          <div className="text-[10px] text-muted uppercase tracking-wide">AUC</div>
          <div className="text-2xl font-bold" style={{ color: aucColor }}>{roc.auc.toFixed(3)}</div>
          <div className="text-[10px] uppercase font-medium" style={{ color: aucColor }}>{aucCat}</div>
        </div>
      </div>

      <div className="bg-surface rounded-lg p-2">
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="max-w-full h-auto">
          {/* Diagonal reference */}
          <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} stroke="#cbd5e1" strokeDasharray="3,3" />

          {/* Axes */}
          <line x1={m.left} x2={m.left + innerW} y1={m.top + innerH} y2={m.top + innerH} stroke="#9ca3af" />
          <line x1={m.left} x2={m.left} y1={m.top} y2={m.top + innerH} stroke="#9ca3af" />
          {[0, 0.25, 0.5, 0.75, 1].map(t => (
            <g key={'x' + t}>
              <text x={sx(t)} y={m.top + innerH + 14} textAnchor="middle" fontSize="9" fill="#6b7280">{t.toFixed(2)}</text>
              <text x={m.left - 6} y={sy(t) + 3} textAnchor="end" fontSize="9" fill="#6b7280">{t.toFixed(2)}</text>
            </g>
          ))}
          <text x={m.left + innerW / 2} y={h - 4} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600">
            False Positive Rate (1 − Spesifisitas)
          </text>
          <text x={12} y={m.top + innerH / 2} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600"
                transform={`rotate(-90, 12, ${m.top + innerH / 2})`}>
            True Positive Rate (Sensitivitas)
          </text>

          {/* ROC line */}
          <polyline
            fill={aucColor + '20'}
            stroke={aucColor}
            strokeWidth={2}
            points={[
              `${sx(0)},${sy(0)}`,
              ...roc.points.map(p => `${sx(p.fpr)},${sy(p.tpr)}`),
              `${sx(1)},${sy(0)}`,
            ].join(' ')}
          />
          <polyline
            fill="none" stroke={aucColor} strokeWidth={2}
            points={roc.points.map(p => `${sx(p.fpr)},${sy(p.tpr)}`).join(' ')}
          />
        </svg>
      </div>

      <p className="text-[11px] text-muted mt-2">
        Pedoman AUC: 0.9+ = excellent, 0.8-0.9 = good, 0.7-0.8 = fair, 0.6-0.7 = poor, &lt;0.6 = gagal.
        Diagonal abu-abu = prediksi acak.
      </p>
    </div>
  )
}

// ============================================================
// Hosmer-Lemeshow
// ============================================================
function HosmerLemeshowSection({ hl }) {
  const goodFit = hl.p > 0.05
  return (
    <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
      <h3 className="font-semibold text-sm mb-2">Hosmer-Lemeshow Goodness-of-Fit</h3>
      <div className={`rounded-lg p-3 text-xs ${goodFit ? 'bg-green-50 border border-green-200 text-green-900' : 'bg-amber-50 border border-amber-200 text-amber-900'}`}>
        <div className="font-medium mb-1">
          χ²({hl.df}) = {hl.chi2.toFixed(2)}, p = {hl.p.toFixed(4)}
        </div>
        <div className="text-[11px]">
          {goodFit
            ? '✓ Model fit baik (p > 0.05). Prediksi probabilitas konsisten dengan observasi aktual.'
            : '⚠ Model fit kurang baik (p ≤ 0.05). Pertimbangkan tambah/ganti predictor atau cek outlier.'}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Auto-generated Bab IV text
// ============================================================
function ReportText({ fit, cm, roc, hl, threshold }) {
  const sigCoefs = fit.coefficients.filter((c, i) => i > 0 && c.p < 0.05)
  const sigText = sigCoefs.length === 0
    ? 'Tidak ada predictor yang signifikan.'
    : sigCoefs.map(c => `${c.name} (β = ${c.b.toFixed(3)}, OR = ${c.odds.toFixed(2)}, p = ${c.p.toFixed(3)})`).join('; ')

  const text = `Hasil analisis regresi logistik biner menunjukkan model secara keseluruhan signifikan, χ²(${fit.likelihoodRatio.df}) = ${fit.likelihoodRatio.chi2.toFixed(2)}, p = ${fit.likelihoodRatio.p.toFixed(3)}, dengan Nagelkerke R² = ${fit.pseudoR2.nagelkerke.toFixed(3)} (Cox-Snell R² = ${fit.pseudoR2.coxSnell.toFixed(3)}, McFadden R² = ${fit.pseudoR2.mcfadden.toFixed(3)}). ${sigCoefs.length > 0 ? 'Predictor signifikan: ' + sigText : sigText}

Pada threshold ${threshold.toFixed(2)}, model mencapai akurasi ${(cm.accuracy*100).toFixed(1)}% (sensitivitas ${(cm.sensitivity*100).toFixed(1)}%, spesifisitas ${(cm.specificity*100).toFixed(1)}%). Area Under the ROC Curve (AUC) = ${roc.auc.toFixed(3)}, mengindikasikan kemampuan diskriminasi model ${roc.auc>=0.8?'baik':roc.auc>=0.7?'cukup':'kurang'}. Hosmer-Lemeshow goodness-of-fit test χ²(${hl.df}) = ${hl.chi2.toFixed(2)}, p = ${hl.p.toFixed(3)} ${hl.p>0.05?'menunjukkan model fit baik':'menunjukkan model fit kurang baik'}.`

  return (
    <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">Teks untuk Bab IV</h3>
        <button onClick={() => { navigator.clipboard.writeText(text); toast.success('Disalin') }}
                className="text-xs text-amber-600 hover:text-amber-700">Salin</button>
      </div>
      <p className="text-xs leading-relaxed text-fg/80 whitespace-pre-wrap">{text}</p>
    </div>
  )
}

function Metric({ label, value, highlight }) {
  return (
    <div className={`rounded-lg p-2 text-center ${highlight ? 'bg-amber-50 border border-amber-200' : 'bg-surface'}`}>
      <div className="text-[10px] text-muted uppercase tracking-wide">{label}</div>
      <div className={`font-bold ${highlight ? 'text-amber-700 text-lg' : ''}`}>{value}</div>
    </div>
  )
}

// CSV parser
function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split(/[,;\t]/).map(s => s.trim())
  const rows = lines.slice(1).map(l => l.split(/[,;\t]/).map(s => s.trim()))
  return { headers, rows }
}

// Sample CSV: 50 students predicting kelulusan
const SAMPLE_CSV = `nilai_un,jam_belajar,kehadiran,lulus
85,4,95,1
72,2,80,0
90,5,98,1
65,1,70,0
78,3,85,1
88,4,92,1
60,1,65,0
82,3,88,1
75,2,75,0
92,5,99,1
70,2,72,0
86,4,94,1
68,1,68,0
80,3,87,1
77,2,78,0
89,5,96,1
73,2,74,0
84,4,90,1
66,1,67,0
91,5,98,1
79,3,86,1
71,2,73,0
87,4,93,1
64,1,66,0
83,3,89,1
76,2,77,0
93,5,99,1
69,1,69,0
81,3,87,1
74,2,76,0
85,4,91,1
67,1,68,0
88,4,95,1
72,2,75,0
90,5,97,1
65,1,71,0
79,3,86,1
77,2,79,0
86,4,92,1
70,2,73,0
82,3,88,1
68,1,69,0
89,5,96,1
75,3,82,0
84,4,90,1
71,2,74,0
80,3,86,1
66,1,67,0
87,4,93,1
73,2,76,0`

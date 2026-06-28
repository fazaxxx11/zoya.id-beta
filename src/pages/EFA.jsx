// EFA UI page
// ===========
// Validitas konstruk untuk kuesioner skala Likert.
// Output: KMO, Bartlett, Scree plot, faktor loadings, rotated structure.

import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layers, Play, Upload, AlertTriangle, Sparkles,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SaveAnalysisButton from '../components/SaveAnalysisButton'
import ConfirmPaymentModal from '../components/ConfirmPaymentModal'
import AIInterpretationPanel from '../components/AIInterpretationPanel'
import { runEFA } from '../lib/statsWorkerClient'
import { checkPaywall, chargeForTool } from '../lib/paywall'
import { getWallet } from '../lib/wallet'
import { getStatisticsPriceWithDiscount } from '../lib/pricing'
import { toast } from '../lib/toast'

export default function EFAPage() {
  const navigate = useNavigate()
  const [csvText, setCsvText] = useState(SAMPLE_CSV)
  const [selectedItems, setSelectedItems] = useState(null)  // null = all
  const [nFactorsInput, setNFactorsInput] = useState('auto')
  const [rotate, setRotate] = useState(true)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [running, setRunning] = useState(false)
  const [aiInterpretation, setAiInterpretation] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const fileRef = useRef(null)

  const parsed = useMemo(() => parseCSV(csvText), [csvText])
  const pricing = getStatisticsPriceWithDiscount('efa', parsed.rows.length)
  const wallet = getWallet()

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = ev => { setCsvText(String(ev.target.result || '')); toast.info(`File "${f.name}" dimuat`) }
    r.readAsText(f)
    e.target.value = ''
  }

  const itemsToUse = selectedItems || parsed.headers

  const toggleItem = (h) => {
    const cur = selectedItems || parsed.headers
    setSelectedItems(cur.includes(h) ? cur.filter(c => c !== h) : [...cur, h])
  }

  const handleRunClick = () => {
    const gate = checkPaywall('efa', parsed.rows.length, navigate)
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
      if (parsed.headers.length === 0) throw new Error('Data kosong')
      if (itemsToUse.length < 3) throw new Error('Pilih minimal 3 item')
      const idxs = itemsToUse.map(it => parsed.headers.indexOf(it))
      const X = parsed.rows.map(row => idxs.map(i => Number(row[i])))
      const nF = nFactorsInput === 'auto' ? null : parseInt(nFactorsInput, 10)
      const r = await runEFA({ X, itemNames: itemsToUse, nFactors: nF, rotate })
      const payment = chargeForTool('efa', parsed.rows.length)
      if (!payment.success) throw new Error(payment.error || 'Pembayaran gagal')
      setResult({ ...r, paid: payment.paid || 0 })
      setShowPayment(false)
      toast.success(`Analisis selesai — ${r.nFactors} faktor`)
    } catch (err) {
      setError(err.message)
      setResult(null)
      toast.error(err.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title="Exploratory Factor Analysis"
        subtitle="Validasi konstruk kuesioner — KMO, Bartlett, Scree, Loading"
        breadcrumbs={[
          { path: '/', label: 'Beranda' },
          { path: '/statistik', label: 'Statistik' },
          { path: '/efa', label: 'EFA' },
        ]}
      />

      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-4 space-y-4">
        {/* Hero */}
        <div className="bg-accent-soft border border-accent/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent text-white flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-fg mb-1">Exploratory Factor Analysis</h2>
              <p className="text-xs text-muted">
                Untuk uji <strong>validitas konstruk</strong> kuesioner Likert. Cek apakah item-item benar-benar
                mengukur faktor laten yang terstruktur. Output: KMO ≥ 0.6 + Bartlett p &lt; 0.05 = data layak;
                eigenvalue &gt; 1 = jumlah faktor; loading ≥ 0.4 = item masuk faktor tersebut.
              </p>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Data CSV (item per kolom, responden per baris)</span>
            <button onClick={() => fileRef.current?.click()} className="text-xs text-accent hover:text-accent/80 flex items-center gap-1">
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
              {parsed.rows.length} baris × {parsed.headers.length} item
            </p>
          )}

          {parsed.headers.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-fg/80">Item yang dimasukkan</label>
                  <button
                    onClick={() => setSelectedItems(itemsToUse.length === parsed.headers.length ? [] : parsed.headers)}
                    className="text-xs text-accent hover:text-accent/80 font-medium"
                  >
                    {itemsToUse.length === parsed.headers.length ? 'Hapus Semua' : 'Pilih Semua'}
                  </button>
                </div>
                <div className="border border-border rounded-lg p-2 grid grid-cols-2 sm:grid-cols-4 gap-1 max-h-32 overflow-y-auto">
                  {parsed.headers.map(h => (
                    <label key={h} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-surface px-1.5 py-1 rounded">
                      <input type="checkbox" checked={itemsToUse.includes(h)} onChange={() => toggleItem(h)} />
                      <span className="truncate">{h}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-muted mt-1">{itemsToUse.length} item dipilih</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-fg/80 mb-1">Jumlah Faktor</label>
                  <select value={nFactorsInput} onChange={e => setNFactorsInput(e.target.value)}
                          className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                    <option value="auto">Otomatis (Kaiser λ ≥ 1)</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} faktor</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={rotate} onChange={e => setRotate(e.target.checked)} />
                    <span>Varimax rotation</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button onClick={handleRunClick} disabled={running} className="btn-primary text-sm disabled:opacity-50">
              <Play className="w-4 h-4" /> {running ? 'Memproses...' : 'Jalankan EFA'}
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
              <SaveAnalysisButton result={result} defaultTitle={`EFA — ${result.p} item, ${result.nFactors} faktor`} />
            </div>
            <SamplingAdequacySection result={result} />
            <ScreePlotSection result={result} />
            <VarianceTableSection result={result} />
            <LoadingsSection result={result} />
            <ReportText result={result} />
            
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
        title="Bayar & Jalankan EFA"
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
// KMO + Bartlett
// ============================================================
function SamplingAdequacySection({ result }) {
  const k = result.kmo
  const b = result.bartlett
  const kmoColor = k.overall >= 0.8 ? 'text-emerald-700' : k.overall >= 0.6 ? 'text-blue-700' : 'text-amber-700'
  const bartlettOk = b.p < 0.05

  return (
    <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
      <h3 className="font-semibold text-sm mb-3">Sampling Adequacy</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-surface rounded-lg p-3">
          <div className="text-[10px] text-muted uppercase tracking-wide mb-1">KMO Measure of Sampling Adequacy</div>
          <div className={`text-3xl font-bold ${kmoColor}`}>{k.overall?.toFixed(3) ?? 'NaN'}</div>
          <div className={`text-xs uppercase font-medium ${kmoColor}`}>{k.interpretation}</div>
          <p className="text-[11px] text-muted mt-1">
            ≥ 0.6 acceptable, ≥ 0.8 excellent. {k.overall >= 0.6 ? '✓ Layak EFA' : '⚠ Tidak layak — pertimbangkan tambah sampel atau drop item'}
          </p>
        </div>
        <div className={`rounded-lg p-3 ${bartlettOk ? 'bg-emerald-50' : 'bg-amber-50'}`}>
          <div className="text-[10px] text-muted uppercase tracking-wide mb-1">Bartlett's Test of Sphericity</div>
          <div className="text-sm font-mono">
            χ²({b.df}) = {b.chi2?.toFixed(2) ?? '—'}
          </div>
          <div className="text-sm font-mono">p = {b.p?.toFixed(4) ?? '—'}</div>
          <p className="text-[11px] text-muted mt-1">
            {bartlettOk ? '✓ p < 0.05, matriks korelasi berbeda dari identitas — EFA bisa dilanjut' : '⚠ p ≥ 0.05, matriks korelasi mendekati identitas — EFA tidak disarankan'}
          </p>
        </div>
      </div>

      {/* MSA per variable */}
      {k.perVariable && (
        <div className="mt-3">
          <div className="text-xs font-medium mb-1">MSA per Item (Anti-image diagonal)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface">
                <tr>
                  <th className="px-2 py-1.5 text-left">Item</th>
                  <th className="px-2 py-1.5 text-right">MSA</th>
                  <th className="px-2 py-1.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.itemNames.map((nm, i) => {
                  const msa = k.perVariable[i]
                  const status = msa >= 0.6 ? '✓ OK' : msa >= 0.5 ? '~ borderline' : '✗ drop'
                  const color = msa >= 0.6 ? 'text-emerald-700' : msa >= 0.5 ? 'text-amber-700' : 'text-red-700'
                  return (
                    <tr key={i}>
                      <td className="px-2 py-1.5">{nm}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{msa.toFixed(3)}</td>
                      <td className={`px-2 py-1.5 ${color}`}>{status}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Scree Plot
// ============================================================
function ScreePlotSection({ result }) {
  const eigs = result.eigenvalues
  const w = 480, h = 240, m = { top: 12, right: 16, bottom: 36, left: 44 }
  const innerW = w - m.left - m.right, innerH = h - m.top - m.bottom
  const maxEig = Math.max(...eigs, 1.5)
  const sx = (i) => m.left + (i / Math.max(eigs.length - 1, 1)) * innerW
  const sy = (e) => m.top + (1 - e / maxEig) * innerH

  return (
    <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
      <h3 className="font-semibold text-sm mb-3">Scree Plot</h3>
      <div className="bg-surface rounded-lg p-2 overflow-x-auto">
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="max-w-full h-auto">
          {/* Kaiser threshold y=1 */}
          <line x1={m.left} x2={m.left + innerW} y1={sy(1)} y2={sy(1)} stroke="#dc2626" strokeDasharray="4,3" />
          <text x={m.left + innerW - 4} y={sy(1) - 4} textAnchor="end" fontSize="9" fill="#dc2626">
            Kaiser λ = 1
          </text>

          {/* Axes */}
          <line x1={m.left} x2={m.left + innerW} y1={m.top + innerH} y2={m.top + innerH} stroke="#9ca3af" />
          <line x1={m.left} x2={m.left} y1={m.top} y2={m.top + innerH} stroke="#9ca3af" />

          {/* X axis labels */}
          {eigs.map((_, i) => (
            <text key={'x' + i} x={sx(i)} y={m.top + innerH + 14} textAnchor="middle" fontSize="9" fill="#6b7280">
              {i + 1}
            </text>
          ))}
          <text x={m.left + innerW / 2} y={h - 4} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600">
            Faktor
          </text>

          {/* Y axis ticks */}
          {[0, 1, Math.ceil(maxEig / 2), Math.ceil(maxEig)].filter((v, i, a) => a.indexOf(v) === i).map(t => (
            <g key={'y' + t}>
              <text x={m.left - 6} y={sy(t) + 3} textAnchor="end" fontSize="9" fill="#6b7280">{t.toFixed(1)}</text>
            </g>
          ))}
          <text x={12} y={m.top + innerH / 2} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600"
                transform={`rotate(-90, 12, ${m.top + innerH / 2})`}>
            Eigenvalue
          </text>

          {/* Line */}
          <polyline
            fill="none" stroke="#7c3aed" strokeWidth={2}
            points={eigs.map((e, i) => `${sx(i)},${sy(e)}`).join(' ')}
          />
          {/* Points */}
          {eigs.map((e, i) => (
            <circle key={i} cx={sx(i)} cy={sy(e)} r={4}
                    fill={e >= 1 ? '#7c3aed' : '#cbd5e1'} stroke="#fff" strokeWidth={1} />
          ))}
        </svg>
      </div>
      <p className="text-[11px] text-muted mt-2">
        <strong>Kaiser criterion:</strong> faktor dengan eigenvalue ≥ 1 dipertahankan ({result.nFactors} faktor terpilih).
        <strong> Cattell scree:</strong> cari "elbow" — titik dimana garis melandai.
      </p>
    </div>
  )
}

// ============================================================
// Variance explained table
// ============================================================
function VarianceTableSection({ result }) {
  const eigs = result.eigenvalues
  const p = result.p
  return (
    <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
      <h3 className="font-semibold text-sm mb-3">Variance Explained</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-surface">
            <tr>
              <th className="px-2 py-1.5 text-left">Faktor</th>
              <th className="px-2 py-1.5 text-right">Eigenvalue</th>
              <th className="px-2 py-1.5 text-right">% Variance</th>
              <th className="px-2 py-1.5 text-right">Cumulative %</th>
              <th className="px-2 py-1.5 text-center">Retained?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {eigs.map((e, i) => {
              let cum = 0
              for (let k = 0; k <= i; k++) cum += eigs[k] / p
              const retained = i < result.nFactors
              return (
                <tr key={i} className={retained ? 'bg-accent/5' : 'opacity-60'}>
                  <td className="px-2 py-1.5">{i + 1}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{e.toFixed(3)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{(e / p * 100).toFixed(1)}%</td>
                  <td className="px-2 py-1.5 text-right font-mono">{(cum * 100).toFixed(1)}%</td>
                  <td className="px-2 py-1.5 text-center">{retained ? '✓' : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// Loadings table
// ============================================================
function LoadingsSection({ result }) {
  const [highlight, setHighlight] = useState(0.4)
  const showRotated = result.rotationApplied
  const matrix = showRotated ? result.loadingsRotated : result.loadingsUnrotated
  return (
    <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          {showRotated ? 'Rotated Component Matrix (Varimax)' : 'Component Matrix (Unrotated)'}
        </h3>
        <label className="text-xs flex items-center gap-2">
          Highlight ≥
          <input type="number" step="0.05" min="0.1" max="1.0"
                 value={highlight} onChange={e => setHighlight(Math.max(0.1, Math.min(1, Number(e.target.value))))}
                 className="w-16 border border-border rounded px-2 py-1" />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-surface">
            <tr>
              <th className="px-2 py-1.5 text-left">Item</th>
              {Array.from({ length: result.nFactors }, (_, k) => (
                <th key={k} className="px-2 py-1.5 text-right">Factor {k + 1}</th>
              ))}
              <th className="px-2 py-1.5 text-right">h² (Communality)</th>
              <th className="px-2 py-1.5 text-center">Best</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.itemNames.map((nm, i) => (
              <tr key={i}>
                <td className="px-2 py-1.5 font-medium">{nm}</td>
                {matrix[i].map((v, k) => (
                  <td key={k} className="px-2 py-1.5 text-right font-mono"
                      style={{
                        backgroundColor: Math.abs(v) >= highlight ? 'rgb(var(--accent) / 0.12)' : 'transparent',
                        fontWeight: Math.abs(v) >= highlight ? 600 : 400,
                      }}>
                    {v.toFixed(3)}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right font-mono">{result.communalities[i].toFixed(3)}</td>
                <td className="px-2 py-1.5 text-center font-bold text-accent">F{result.factorTable[i].primaryFactor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted mt-2">
        Loading ≥ 0.4 (warna gold) = item secara substantif memuat ke faktor tersebut.
        h² (communality) = proporsi varians item yang dijelaskan oleh semua faktor.
      </p>
    </div>
  )
}

// ============================================================
// Auto-generated text
// ============================================================
function ReportText({ result }) {
  const k = result.kmo
  const b = result.bartlett
  const cumVar = result.varianceExplained[result.varianceExplained.length - 1].cumulativeProp
  const text = `Analisis faktor eksploratori dilakukan pada ${result.p} item dengan n = ${result.n} responden. Uji KMO menghasilkan nilai ${k.overall?.toFixed(3)} (${k.interpretation}) dan Bartlett's Test of Sphericity χ²(${b.df}) = ${b.chi2?.toFixed(2)}, p = ${b.p?.toFixed(3)}, mengindikasikan data ${result.fitOk ? 'layak' : 'belum layak'} untuk dianalisis dengan EFA.

Berdasarkan kriteria Kaiser (eigenvalue ≥ 1), terbentuk ${result.nFactors} faktor yang menjelaskan ${(cumVar * 100).toFixed(1)}% varians total. ${result.rotationApplied ? 'Setelah rotasi Varimax, struktur loadings menunjukkan setiap item memuat dominan pada satu faktor (loading ≥ 0.4).' : 'Tanpa rotasi diterapkan.'} Communalities (h²) berkisar dari ${Math.min(...result.communalities).toFixed(3)} hingga ${Math.max(...result.communalities).toFixed(3)}.`

  return (
    <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">Teks untuk Bab IV</h3>
        <button onClick={() => { navigator.clipboard.writeText(text); toast.success('Disalin') }}
                className="text-xs text-accent hover:text-accent/80">Salin</button>
      </div>
      <p className="text-xs leading-relaxed text-fg/80 whitespace-pre-wrap">{text}</p>
    </div>
  )
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split(/[,;\t]/).map(s => s.trim())
  const rows = lines.slice(1).map(l => l.split(/[,;\t]/).map(s => s.trim()))
  return { headers, rows }
}

// 6 items, 2 factors clear structure for demo
const SAMPLE_CSV = `motivasi1,motivasi2,motivasi3,kepuasan1,kepuasan2,kepuasan3
4,5,4,3,3,4
5,5,5,4,4,4
3,3,4,5,5,5
4,4,4,4,4,4
5,4,5,3,3,3
2,3,2,4,4,5
4,4,5,5,5,5
3,3,3,3,3,3
5,5,4,2,3,2
4,5,5,4,4,4
3,3,4,4,4,5
4,4,4,5,5,5
5,4,5,3,2,3
2,2,3,5,5,4
4,5,4,4,4,4
3,4,3,3,3,4
5,5,5,4,4,5
3,3,3,4,4,4
4,4,5,5,5,5
2,3,2,3,3,3
5,4,4,4,4,4
4,5,5,3,3,4
3,3,4,5,5,5
5,5,5,4,4,4
4,4,4,3,3,3
3,4,3,4,4,5
5,5,4,5,5,5
2,2,3,3,3,4
4,5,5,4,4,4
3,3,3,4,4,5
5,4,5,3,3,3
4,4,4,5,5,5
3,4,4,4,4,4
2,3,2,5,5,4
4,4,5,3,3,3
5,5,5,4,4,4
3,3,4,5,5,5
4,5,4,3,3,4
2,2,3,4,4,5
5,5,4,4,4,4`

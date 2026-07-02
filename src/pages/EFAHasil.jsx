// EFAHasil — page terpisah buat nampilin hasil EFA.
// Sebelumnya result dirender inline di /efa (numpuk dgn form input).
// Sekarang EFA.jsx persist result ke localStorage + navigate ke sini.
//
// Result components di-pindah dari EFA.jsx (tool page sekarang cuma
// form input + persist + navigate).

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layers, RotateCcw, ArrowRight,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SaveAnalysisButton from '../components/SaveAnalysisButton'
import AIInterpretationPanel from '../components/AIInterpretationPanel'
import { usePersist } from '../hooks/usePersist'
import { toast } from '../lib/toast'

export default function EFAHasil() {
  const navigate = useNavigate()
  const [result] = usePersist('efa_result', null)
  const [aiInterpretation, setAiInterpretation] = useState('')

  const handleBack = useCallback(() => {
    navigate('/efa')
  }, [navigate])

  const handleReset = useCallback(() => {
    try { localStorage.removeItem('efa_result') } catch {}
    navigate('/efa')
  }, [navigate])

  if (!result) {
    return (
      <div className="min-h-screen pb-bottomnav" style={{ backgroundColor: 'rgb(var(--bg))' }}>
        <PageHeader
          title="Hasil EFA"
          subtitle="EFA · HASIL"
          parentPath="/efa"
          parentLabel="EFA"
        />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-sm text-muted mb-4">Belum ada hasil analisis. Jalankan EFA dulu di halaman EFA.</p>
          <button onClick={() => navigate('/efa')}
            className="px-5 py-2.5 bg-accent hover:bg-accent/90 text-accent-fg text-sm font-medium rounded-lg">
            Ke EFA
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-bottomnav" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title="Hasil EFA"
        subtitle="EFA · HASIL"
        parentPath="/efa"
        parentLabel="EFA"
        breadcrumbs={[
          { path: '/efa', label: 'EFA' },
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
// KMO + Bartlett — dipindah dari EFA.jsx
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
// Scree Plot — dipindah dari EFA.jsx
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
// Variance explained table — dipindah dari EFA.jsx
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
// Loadings table — dipindah dari EFA.jsx
// ============================================================
function LoadingsSection({ result }) {
  const [highlight, setHighlight] = useState(0.4)
  const showRotated = result.rotationApplied
  const matrix = showRotated ? result.loadingsRotated : result.loadingsUnrotated
  return (
    <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent" />
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
// Auto-generated text — dipindah dari EFA.jsx
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

// ItemAnalysisHasil — page terpisah buat nampilin hasil Analisis Butir Soal.
// Sebelumnya result dirender inline di /butir-soal (numpuk dgn form input).
// Sekarang ItemAnalysis.jsx persist result ke localStorage + navigate ke sini.
//
// Result components + helpers di-pindah dari ItemAnalysis.jsx (tool page
// sekarang cuma form input + persist + navigate).

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wand2, Download, Info, Check, X, RefreshCw, Eye, EyeOff,
  RotateCcw, ArrowRight,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import AIInterpretationPanel from '../components/AIInterpretationPanel'
import { categorizeReliability } from '../lib/itemAnalysis'
import { usePersist } from '../hooks/usePersist'
import { toast } from '../lib/toast'

export default function ItemAnalysisHasil() {
  const navigate = useNavigate()
  const [result] = usePersist('itemanalysis_result', null)
  const [aiInterpretation, setAiInterpretation] = useState('')

  const handleBack = useCallback(() => {
    navigate('/butir-soal')
  }, [navigate])

  const handleReset = useCallback(() => {
    try { localStorage.removeItem('itemanalysis_result') } catch {}
    navigate('/butir-soal')
  }, [navigate])

  const exportCSV = useCallback(() => {
    if (!result) return
    const lines = ['No,P,Kategori_P,D,Kategori_D,r_pb,r_pb_corrected,Keputusan']
    for (const it of result.items) {
      lines.push([
        it.no,
        it.p?.toFixed(3) ?? '',
        it.categoryP ?? '',
        it.d?.toFixed(3) ?? '',
        it.categoryD ?? '',
        it.rpb?.toFixed(3) ?? '',
        it.rpbCorrected?.toFixed(3) ?? '',
        it.decision ?? '',
      ].join(','))
    }
    const csv = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'analisis_butir_soal.csv'
    a.click()
    toast.success('CSV ter-download')
  }, [result])

  if (!result) {
    return (
      <div className="min-h-screen pb-bottomnav" style={{ backgroundColor: 'rgb(var(--bg))' }}>
        <PageHeader
          title="Hasil Analisis Butir"
          subtitle="ANALISIS BUTIR · HASIL"
          parentPath="/butir-soal"
          parentLabel="Analisis Butir"
        />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-sm text-muted mb-4">Belum ada hasil analisis. Jalankan analisis dulu di halaman Analisis Butir.</p>
          <button onClick={() => navigate('/butir-soal')}
            className="px-5 py-2.5 bg-accent hover:bg-accent/90 text-accent-fg text-sm font-medium rounded-lg">
            Ke Analisis Butir
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-bottomnav" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title="Hasil Analisis Butir"
        subtitle="ANALISIS BUTIR · HASIL"
        parentPath="/butir-soal"
        parentLabel="Analisis Butir"
        breadcrumbs={[
          { path: '/butir-soal', label: 'Analisis Butir' },
          { label: 'Hasil' },
        ]}
        actions={
          <button onClick={handleReset}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border flex items-center gap-1.5 bg-card text-fg border-border hover:bg-surface">
            <RotateCcw className="w-3.5 h-3.5" /> Analisis Baru
          </button>
        }
      />

      <div className="max-w-6xl mx-auto px-3 sm:px-5 py-4 space-y-4">
        <ResultPanel result={result} onExport={exportCSV} />

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
// Result panel — dipindah dari ItemAnalysis.jsx
// ============================================================
function ResultPanel({ result, onExport }) {
  const [showDistractor, setShowDistractor] = useState(true)
  const { items, summary } = result
  const hasDistractor = items[0]?.distractors !== undefined

  const reliability = summary.kr20 !== null ? summary.kr20 : summary.kr21
  const reliabilityCat = categorizeReliability(reliability)

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-accent" /> Ringkasan
          </h3>
          <button onClick={onExport} className="text-xs text-accent hover:text-accent flex items-center gap-1">
            <Download className="w-3.5 h-3.5" /> Ekspor CSV
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <SummaryCard label="Siswa" value={summary.n} />
          <SummaryCard label="Butir" value={summary.k} />
          <SummaryCard label="Mean Skor" value={summary.mean.toFixed(2)} />
          <SummaryCard label="SD Skor" value={summary.sd.toFixed(2)} />
          <SummaryCard
            label="KR-20"
            value={summary.kr20 !== null ? summary.kr20.toFixed(3) : '—'}
            badge={reliabilityCat}
            badgeColor={reliabilityColor(reliabilityCat)}
          />
          <SummaryCard
            label="KR-21"
            value={summary.kr21 !== null ? summary.kr21.toFixed(3) : '—'}
          />
        </div>

        {/* Decision summary */}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-xs text-muted mb-2">Keputusan butir:</div>
          <div className="flex flex-wrap gap-2">
            <DecisionPill type="terima" count={summary.decisions.terima || 0} />
            <DecisionPill type="revisi" count={summary.decisions.revisi || 0} />
            <DecisionPill type="buang"  count={summary.decisions.buang || 0} />
          </div>
        </div>
      </div>

      {/* Per-item table */}
      <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Hasil per Butir</h3>
          {hasDistractor && (
            <button
              onClick={() => setShowDistractor(s => !s)}
              className="text-xs text-muted hover:text-accent flex items-center gap-1"
            >
              {showDistractor ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showDistractor ? 'Sembunyikan' : 'Tampilkan'} distraktor
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-surface">
              <tr>
                <th className="px-2 py-2 text-left">No</th>
                <th className="px-2 py-2 text-right" title="Tingkat Kesukaran">P</th>
                <th className="px-2 py-2 text-left">Kategori P</th>
                <th className="px-2 py-2 text-right" title="Daya Pembeda">D</th>
                <th className="px-2 py-2 text-left">Kategori D</th>
                <th className="px-2 py-2 text-right" title="Point-Biserial Correlation">r_pb</th>
                <th className="px-2 py-2 text-center">Keputusan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it) => (
                <ItemRow key={it.no} item={it} showDistractor={showDistractor && hasDistractor} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auto-interpretation */}
      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-amber-900">
          <Info className="w-4 h-4" /> Interpretasi Otomatis
        </h3>
        <div className="text-xs text-amber-900 space-y-1.5 leading-relaxed">
          <p>
            <strong>Reliabilitas (KR-20):</strong>{' '}
            {summary.kr20 !== null
              ? `${summary.kr20.toFixed(3)} → ${labelReliability(reliabilityCat)}.`
              : 'Tidak dapat dihitung (varians 0).'}
          </p>
          <p>
            <strong>Komposisi butir:</strong> {summary.decisions.terima || 0} terima,{' '}
            {summary.decisions.revisi || 0} perlu revisi, {summary.decisions.buang || 0} sebaiknya dibuang
            (dari total {summary.k} butir).
          </p>
          <p>
            <strong>Tingkat kesukaran rata-rata:</strong> {(summary.meanProportion * 100).toFixed(1)}%{' '}
            ({summary.meanProportion < 0.4 ? 'tes cenderung sulit' : summary.meanProportion > 0.7 ? 'tes cenderung mudah' : 'tingkat kesukaran ideal'}).
          </p>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, badge, badgeColor }) {
  return (
    <div className="bg-surface rounded-lg p-2">
      <div className="text-[10px] text-muted uppercase tracking-wide">{label}</div>
      <div className="text-lg font-bold">{value}</div>
      {badge && (
        <div className={`text-[10px] inline-block px-1.5 py-0.5 rounded mt-0.5 ${badgeColor}`}>
          {labelReliability(badge)}
        </div>
      )}
    </div>
  )
}

function DecisionPill({ type, count }) {
  const styles = {
    terima: 'bg-green-100 text-green-800 border-green-200',
    revisi: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    buang:  'bg-red-100 text-red-800 border-red-200',
  }
  const labels = { terima: 'Terima', revisi: 'Revisi', buang: 'Buang' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${styles[type]}`}>
      <strong>{count}</strong> {labels[type]}
    </span>
  )
}

function ItemRow({ item, showDistractor }) {
  return (
    <>
      <tr className="hover:bg-surface">
        <td className="px-2 py-1.5 font-medium">{item.no}</td>
        <td className="px-2 py-1.5 text-right font-mono">{item.p?.toFixed(3)}</td>
        <td className="px-2 py-1.5">
          <CategoryBadge cat={item.categoryP} type="p" />
        </td>
        <td className="px-2 py-1.5 text-right font-mono">{item.d?.toFixed(3) ?? '—'}</td>
        <td className="px-2 py-1.5">
          <CategoryBadge cat={item.categoryD} type="d" />
        </td>
        <td className="px-2 py-1.5 text-right font-mono">{item.rpb?.toFixed(3) ?? '—'}</td>
        <td className="px-2 py-1.5 text-center">
          <DecisionBadge decision={item.decision} />
        </td>
      </tr>
      {showDistractor && item.distractors && (
        <tr className="bg-surface/50">
          <td colSpan={7} className="px-3 py-2">
            <div className="text-[10px] text-muted mb-1">Distraktor (Atas/Bawah):</div>
            <div className="flex flex-wrap gap-1.5">
              {item.distractors.map(d => (
                <span
                  key={d.option}
                  className={`text-[10px] px-2 py-0.5 rounded border ${
                    d.isKey
                      ? 'bg-green-50 border-green-300 text-green-700 font-bold'
                      : d.working
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                  title={d.isKey ? 'Kunci jawaban' : d.working ? 'Distraktor berfungsi' : 'Distraktor tidak berfungsi'}
                >
                  {d.option}: {d.upper}/{d.lower} (n={d.total})
                  {d.isKey && ' ★'}
                </span>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function CategoryBadge({ cat, type }) {
  if (!cat) return <span className="text-muted">—</span>
  const styles = type === 'p'
    ? { sukar: 'bg-red-100 text-red-700', sedang: 'bg-green-100 text-green-700', mudah: 'bg-yellow-100 text-yellow-700' }
    : { jelek: 'bg-red-100 text-red-700', cukup: 'bg-yellow-100 text-yellow-700', baik: 'bg-green-100 text-green-700', sangat_baik: 'bg-emerald-100 text-emerald-700' }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${styles[cat] || ''}`}>
      {cat.replace('_', ' ')}
    </span>
  )
}

function DecisionBadge({ decision }) {
  const styles = {
    terima: { cls: 'bg-green-500 text-white', icon: Check, label: 'Terima' },
    revisi: { cls: 'bg-yellow-500 text-white', icon: RefreshCw, label: 'Revisi' },
    buang:  { cls: 'bg-red-500 text-white', icon: X, label: 'Buang' },
  }
  const s = styles[decision]
  if (!s) return null
  const Ic = s.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${s.cls}`}>
      <Ic className="w-2.5 h-2.5" /> {s.label}
    </span>
  )
}

// ============================================================
// Helpers
// ============================================================
function reliabilityColor(cat) {
  return {
    sangat_tinggi: 'bg-emerald-100 text-emerald-700',
    tinggi:        'bg-green-100 text-green-700',
    sedang:        'bg-yellow-100 text-yellow-700',
    rendah:        'bg-red-100 text-red-700',
  }[cat] || 'bg-surface text-fg/80'
}

function labelReliability(cat) {
  return {
    sangat_tinggi: 'Sangat Tinggi',
    tinggi:        'Tinggi',
    sedang:        'Sedang',
    rendah:        'Rendah',
  }[cat] || cat
}

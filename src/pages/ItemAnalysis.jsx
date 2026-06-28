// Analisis Butir Soal — UI page
// =============================
// Halaman untuk evaluasi kualitas butir tes (PG / dichotomous).
// Pipeline: Input data → Analisis → Tabel hasil + interpretasi + ekspor.

import { useState, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ClipboardCheck, Upload, Download, Play, Info, Check, X,
  AlertTriangle, RefreshCw, FileText, Eye, EyeOff, Wand2,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ConfirmPaymentModal from '../components/ConfirmPaymentModal'
import AIInterpretationPanel from '../components/AIInterpretationPanel'
import {
  categorizeReliability,
} from '../lib/itemAnalysis'
import { runItemAnalysis } from '../lib/statsWorkerClient'
import { checkPaywall, chargeForTool } from '../lib/paywall'
import { getWallet } from '../lib/wallet'
import { getStatisticsPriceWithDiscount } from '../lib/pricing'
import { toast } from '../lib/toast'

export default function ItemAnalysis() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('scored')   // 'scored' | 'responses'
  const [scoredText, setScoredText] = useState(SAMPLE_SCORED)
  const [responsesText, setResponsesText] = useState(SAMPLE_RESPONSES)
  const [keyText, setKeyText] = useState(SAMPLE_KEY)
  const [optionsText, setOptionsText] = useState('A,B,C,D')
  const [fraction, setFraction] = useState(0.27)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [running, setRunning] = useState(false)
  const [aiInterpretation, setAiInterpretation] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const fileRef = useRef(null)
  const pricing = getStatisticsPriceWithDiscount('itemanalysis', countDataRows(mode === 'scored' ? scoredText : responsesText))
  const wallet = getWallet()

  const handleAnalyzeClick = () => {
    const rows = countDataRows(mode === 'scored' ? scoredText : responsesText)
    const gate = checkPaywall('itemanalysis', rows, navigate)
    if (!gate.allowed) {
      gate.action?.()
      return
    }
    setShowPayment(true)
  }

  const handleAnalyze = async () => {
    setError(null)
    setRunning(true)
    try {
      const fr = Number(fraction)
      let r
      if (mode === 'scored') {
        const matrix = parseMatrix(scoredText, /* numeric */ true)
        if (matrix.length < 2) throw new Error('Minimal 2 siswa diperlukan')
        r = await runItemAnalysis({ scoredMatrix: matrix, fraction: fr })
      } else {
        const responseMatrix = parseMatrix(responsesText, false)
        const answerKey = keyText.split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
        const options = optionsText.split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
        if (responseMatrix[0].length !== answerKey.length) {
          throw new Error(`Jumlah butir tidak cocok: ${responseMatrix[0].length} kolom vs ${answerKey.length} kunci`)
        }
        r = await runItemAnalysis({
          mode: 'responses',
          responseMatrix,
          answerKey,
          options,
          fraction: fr,
        })
      }
      const rows = countDataRows(mode === 'scored' ? scoredText : responsesText)
      const payment = chargeForTool('itemanalysis', rows)
      if (!payment.success) throw new Error(payment.error || 'Pembayaran gagal')
      setResult({ ...r, paid: payment.paid || 0 })
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

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = String(ev.target.result || '')
      // Skip header line if it looks like text labels (non-numeric in 'scored' mode)
      if (mode === 'scored') setScoredText(text)
      else setResponsesText(text)
      toast.info(`File "${file.name}" dimuat`)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const exportCSV = () => {
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
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title="Analisis Butir Soal"
        subtitle="Evaluasi kualitas tes pilihan ganda — kesukaran, daya pembeda, distraktor"
        breadcrumbs={[
          { path: '/', label: 'Beranda' },
          { path: '/butir-soal', label: 'Analisis Butir' },
        ]}
      />

      <div className="max-w-6xl mx-auto px-3 sm:px-5 py-4 space-y-4">
        {/* Intro */}
        <div className="bg-gradient-to-br bg-accent/10 border border-accent/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/100 text-white flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-fg mb-1">Analisis Butir Soal</h2>
              <p className="text-xs text-fg/80">
                Untuk evaluasi instrumen tes objektif (pilihan ganda atau benar-salah).
                Output: tingkat kesukaran (P), daya pembeda (D), point-biserial (r_pb), KR-20, dan keputusan butir (terima/revisi/buang).
              </p>
            </div>
          </div>
        </div>

        {/* Input mode selector */}
        <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium">Mode Input:</span>
            <button
              onClick={() => setMode('scored')}
              className={`text-xs px-3 py-1.5 rounded-lg border ${
                mode === 'scored'
                  ? 'bg-accent/100 text-white border-accent'
                  : 'bg-card text-fg/80 border-border hover:border-accent/50'
              }`}
            >
              Skor 0/1
            </button>
            <button
              onClick={() => setMode('responses')}
              className={`text-xs px-3 py-1.5 rounded-lg border ${
                mode === 'responses'
                  ? 'bg-accent/100 text-white border-accent'
                  : 'bg-card text-fg/80 border-border hover:border-accent/50'
              }`}
            >
              Jawaban Mentah (A/B/C/D)
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-muted hover:text-accent ml-auto flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" /> Upload CSV
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {mode === 'scored' ? (
            <>
              <label className="block text-xs font-medium text-fg/80 mb-1">
                Matrix skor (siswa × butir, 1 = benar, 0 = salah). Format: koma/tab/spasi.
              </label>
              <textarea
                value={scoredText}
                onChange={e => setScoredText(e.target.value)}
                rows={8}
                className="w-full font-mono text-xs border border-border rounded-lg px-3 py-2"
                placeholder="1,1,0,1,0&#10;1,0,1,1,0&#10;..."
              />
              <p className="text-[11px] text-muted mt-1">
                {countRowsCols(scoredText)}
              </p>
            </>
          ) : (
            <>
              <label className="block text-xs font-medium text-fg/80 mb-1">
                Matrix jawaban mentah (siswa × butir, mis. A/B/C/D)
              </label>
              <textarea
                value={responsesText}
                onChange={e => setResponsesText(e.target.value)}
                rows={6}
                className="w-full font-mono text-xs border border-border rounded-lg px-3 py-2"
                placeholder="A,B,C,D,A&#10;B,B,C,D,A&#10;..."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-xs font-medium text-fg/80 mb-1">
                    Kunci jawaban (urut sesuai butir)
                  </label>
                  <input
                    type="text"
                    value={keyText}
                    onChange={e => setKeyText(e.target.value)}
                    className="w-full font-mono text-xs border border-border rounded-lg px-3 py-2"
                    placeholder="A,B,C,D,A"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg/80 mb-1">
                    Opsi jawaban global
                  </label>
                  <input
                    type="text"
                    value={optionsText}
                    onChange={e => setOptionsText(e.target.value)}
                    className="w-full font-mono text-xs border border-border rounded-lg px-3 py-2"
                    placeholder="A,B,C,D"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border">
            <label className="text-xs text-fg/80">
              Persentase kelompok atas/bawah:
              <select
                value={fraction}
                onChange={e => setFraction(e.target.value)}
                className="ml-2 border border-border rounded px-2 py-1 text-xs"
              >
                <option value={0.25}>25%</option>
                <option value={0.27}>27% (Kelley, default)</option>
                <option value={0.33}>33%</option>
                <option value={0.50}>50% (median split)</option>
              </select>
            </label>
            <div className="flex-1" />
            <button onClick={handleAnalyzeClick} disabled={running} className="btn-primary text-sm disabled:opacity-50">
              <Play className="w-4 h-4" /> {running ? 'Memproses...' : 'Analisis Sekarang'}
            </button>
          </div>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <>
            <ResultPanel result={result} onExport={exportCSV} />
            
            <AIInterpretationPanel
              result={result}
              value={aiInterpretation}
              onChange={setAiInterpretation}
            />
          </>
        )}

        {/* Help */}
        <HelpSection />
      </div>

      <ConfirmPaymentModal
        open={showPayment}
        loading={running}
        title="Bayar & Jalankan Analisis Butir"
        description={pricing.betaFree ? 'Gratis selama beta. Pricing paywall coming soon.' : 'Saldo dipotong setelah analisis berhasil diproses.'}
        price={pricing.price}
        originalPrice={pricing.original}
        priceBreakdown={pricing.breakdown}
        wallet={wallet}
        onConfirm={handleAnalyze}
        onClose={() => setShowPayment(false)}
      />
    </div>
  )
}

// ============================================================
// Result panel
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
// Help section
// ============================================================
function HelpSection() {
  return (
    <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
      <h3 className="font-semibold text-sm mb-3">Panduan Singkat</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <details className="border border-border rounded-lg p-3">
          <summary className="cursor-pointer font-semibold">Apa itu Tingkat Kesukaran (P)?</summary>
          <div className="mt-2 text-muted space-y-1">
            <p>P = proporsi siswa yang menjawab benar.</p>
            <p><strong>Ideal:</strong> 0.30 ≤ P ≤ 0.70 (sedang). Terlalu sulit (P&lt;0.30) atau terlalu mudah (P&gt;0.70) kurang ideal.</p>
          </div>
        </details>
        <details className="border border-border rounded-lg p-3">
          <summary className="cursor-pointer font-semibold">Apa itu Daya Pembeda (D)?</summary>
          <div className="mt-2 text-muted space-y-1">
            <p>D mengukur sejauh mana butir membedakan siswa pintar dari siswa kurang.</p>
            <p>Hitung dari proporsi benar di kelompok atas (27%) dikurangi proporsi benar di kelompok bawah.</p>
            <p><strong>Ideal:</strong> D ≥ 0.30 (Ebel & Frisbie, 1991).</p>
          </div>
        </details>
        <details className="border border-border rounded-lg p-3">
          <summary className="cursor-pointer font-semibold">Apa itu r_pb (point-biserial)?</summary>
          <div className="mt-2 text-muted space-y-1">
            <p>Korelasi antara butir dengan skor total. Nilai positif = siswa yang menjawab benar cenderung skor tinggi (butir konsisten dengan tes).</p>
            <p><strong>Bagus:</strong> r_pb ≥ 0.30. Negatif → butir bermasalah (perlu dicek).</p>
          </div>
        </details>
        <details className="border border-border rounded-lg p-3">
          <summary className="cursor-pointer font-semibold">Apa itu KR-20?</summary>
          <div className="mt-2 text-muted space-y-1">
            <p>Reliabilitas internal untuk tes 0/1. Setara dengan Cronbach α versi dichotomous.</p>
            <p><strong>Bagus:</strong> ≥ 0.70. <strong>Sangat tinggi:</strong> ≥ 0.90.</p>
          </div>
        </details>
        <details className="border border-border rounded-lg p-3">
          <summary className="cursor-pointer font-semibold">Distraktor "berfungsi" artinya?</summary>
          <div className="mt-2 text-muted space-y-1">
            <p>Distraktor (jawaban salah) yang baik harus:</p>
            <ul className="list-disc ml-4">
              <li>Dipilih oleh ≥ 5% siswa</li>
              <li>Lebih banyak dipilih kelompok bawah daripada atas</li>
            </ul>
            <p>Kalau tidak, distraktor terlalu jelas salah → revisi.</p>
          </div>
        </details>
        <details className="border border-border rounded-lg p-3">
          <summary className="cursor-pointer font-semibold">Lalu apa setelah dapat hasil?</summary>
          <div className="mt-2 text-muted space-y-1">
            <p>1. Butir <strong>Terima</strong> → simpan, pakai untuk tes selanjutnya.</p>
            <p>2. Butir <strong>Revisi</strong> → perbaiki redaksi, distraktor, atau tingkat kesukaran.</p>
            <p>3. Butir <strong>Buang</strong> → ganti total atau hapus.</p>
            <p>Hasil ini cocok untuk Bab III metodologi (uji coba instrumen) atau penelitian tindakan kelas.</p>
          </div>
        </details>
      </div>
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================
function parseMatrix(text, numeric) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
  return lines.map(line => {
    const cells = line.split(/[\s,;\t]+/).filter(c => c.length > 0)
    return numeric ? cells.map(c => Number(c)) : cells
  })
}

function countRowsCols(text) {
  const m = parseMatrix(text, true)
  if (m.length === 0) return ''
  return `${m.length} siswa × ${m[0].length} butir`
}

function countDataRows(text) {
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).length
}

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

// ============================================================
// Sample data (data demo siap pakai)
// ============================================================
const SAMPLE_SCORED = `1,1,1,1,1,1,1,1,1,1
1,1,1,1,1,1,1,1,1,0
1,1,1,1,1,1,1,1,0,1
1,1,1,1,1,1,1,0,1,0
1,1,1,1,1,1,0,1,0,0
1,1,1,1,1,0,1,0,0,1
1,1,1,1,0,1,0,0,1,0
1,1,1,0,1,0,0,1,0,0
1,1,0,1,0,0,1,0,0,0
1,0,0,0,0,1,0,0,0,0
0,1,0,0,0,0,0,0,0,0
0,0,1,0,0,0,0,0,0,0`

const SAMPLE_RESPONSES = `A,B,C,D,A
A,B,C,D,B
A,B,C,A,A
A,B,A,D,A
B,B,C,D,C
A,C,C,B,A
D,B,A,D,A
A,A,C,D,B
B,B,B,D,A
A,B,C,C,A`

const SAMPLE_KEY = 'A,B,C,D,A'

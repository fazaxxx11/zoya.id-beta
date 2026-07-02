// Mediasi & Moderasi (Hayes PROCESS-style)
// =========================================
// UI untuk simple mediation (Model 4) dan simple moderation (Model 1).
// Input: paste data CSV, pilih kolom X/M/W/Y, run analysis.

import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GitBranch, Play, Upload, AlertTriangle,
  TrendingUp, Layers,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ConfirmPaymentModal from '../components/ConfirmPaymentModal'
import { simpleMediation, simpleModeration } from '../lib/mediation'
import { checkPaywall, chargeForTool } from '../lib/paywall'
import { getWallet } from '../lib/wallet'
import { getStatisticsPriceWithDiscount } from '../lib/pricing'
import { toast } from '../lib/toast'

export default function MediationPage() {
  const navigate = useNavigate()
  const [model, setModel] = useState('mediation')   // 'mediation' | 'moderation'
  const [csvText, setCsvText] = useState(SAMPLE_CSV)
  const [colX, setColX] = useState('X')
  const [colM, setColM] = useState('M')
  const [colW, setColW] = useState('W')
  const [colY, setColY] = useState('Y')
  const [bootstrap, setBootstrap] = useState(5000)
  const [alpha, setAlpha] = useState(0.05)
  const [error, setError] = useState(null)
  const [running, setRunning] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const fileRef = useRef(null)

  const parsed = useMemo(() => parseCSV(csvText), [csvText])
  const pricing = getStatisticsPriceWithDiscount('mediation', parsed.rows.length)
  const wallet = getWallet()

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = ev => {
      setCsvText(String(ev.target.result || ''))
      toast.info(`File "${f.name}" dimuat`)
    }
    r.readAsText(f)
    e.target.value = ''
  }

  const handleRunClick = () => {
    const gate = checkPaywall('mediation', parsed.rows.length, navigate)
    if (!gate.allowed) {
      gate.action?.()
      return
    }
    setShowPayment(true)
  }

  const runAnalysis = async () => {
    setError(null)
    setRunning(true)
    try {
      if (!parsed.headers || parsed.headers.length === 0) {
        throw new Error('Data kosong atau format tidak valid')
      }
      const xIdx = parsed.headers.indexOf(colX)
      const yIdx = parsed.headers.indexOf(colY)
      if (xIdx < 0) throw new Error(`Kolom "${colX}" tidak ada di header`)
      if (yIdx < 0) throw new Error(`Kolom "${colY}" tidak ada di header`)

      const X = parsed.rows.map(r => Number(r[xIdx]))
      const Y = parsed.rows.map(r => Number(r[yIdx]))

      let res
      if (model === 'mediation') {
        const mIdx = parsed.headers.indexOf(colM)
        if (mIdx < 0) throw new Error(`Kolom mediator "${colM}" tidak ada`)
        const M = parsed.rows.map(r => Number(r[mIdx]))
        res = simpleMediation(X, M, Y, { bootstrap: Number(bootstrap), alpha: Number(alpha) })
      } else {
        const wIdx = parsed.headers.indexOf(colW)
        if (wIdx < 0) throw new Error(`Kolom moderator "${colW}" tidak ada`)
        const W = parsed.rows.map(r => Number(r[wIdx]))
        res = simpleModeration(X, W, Y, { alpha: Number(alpha) })
      }
      const payment = chargeForTool('mediation', parsed.rows.length)
      if (!payment.success) throw new Error(payment.error || 'Pembayaran gagal')
      setShowPayment(false)
      // Persist result ke localStorage + navigate ke page hasil terpisah.
      // Sync write (bukan via usePersist effect) karena component unmount
      // setelah navigate. MediationHasil baca via usePersist.
      const finalResult = { ...res, _model: model, paid: payment.paid || 0 }
      try { localStorage.setItem('mediation_result', JSON.stringify(finalResult)) } catch {}
      navigate('/mediasi/hasil')
      toast.success('Analisis selesai')
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="min-h-screen pb-bottomnav" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title="Mediasi & Moderasi"
        subtitle="Analisis path X→M→Y atau interaksi X·W→Y (Hayes PROCESS-style)"
        breadcrumbs={[
          { path: '/', label: 'Beranda' },
          { path: '/statistik', label: 'Statistik' },
          { path: '/mediasi', label: 'Mediasi/Moderasi' },
        ]}
      />

      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-4 space-y-4">
        {/* Hero */}
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/100 text-white flex items-center justify-center flex-shrink-0">
              <GitBranch className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-fg mb-1">Mediation & Moderation</h2>
              <p className="text-xs text-accent">
                Analisis path penelitian: apakah variabel M memediasi efek X→Y, atau apakah W memoderasi (memperkuat/melemahkan) efek X→Y?
                Bootstrap percentile CI untuk indirect effect (5000 resamples) + Sobel test.
              </p>
            </div>
          </div>
        </div>

        {/* Model selector */}
        <div className="grid grid-cols-2 gap-3">
          <ModelCard
            active={model === 'mediation'}
            onClick={() => setModel('mediation')}
            icon={Layers}
            title="Mediasi (Model 4)"
            desc="X → M → Y. Apakah M memediasi efek X ke Y?"
            example="Kepemimpinan → Kepuasan kerja → Kinerja"
          />
          <ModelCard
            active={model === 'moderation'}
            onClick={() => setModel('moderation')}
            icon={TrendingUp}
            title="Moderasi (Model 1)"
            desc="X·W → Y. Apakah W memoderasi efek X ke Y?"
            example="Stress (X) × Dukungan sosial (W) → Burnout (Y)"
          />
        </div>

        {/* Input */}
        <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors active:scale-95">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Data (CSV dengan header)</span>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-accent hover:text-accent flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" /> Upload CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
          </div>
          <textarea
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            rows={8}
            className="w-full font-mono text-xs border border-border rounded-lg p-2"
            placeholder="X,M,Y\n1.2,2.1,3.4\n..."
          />
          {parsed.headers && (
            <p className="text-[11px] text-muted mt-1">
              {parsed.rows.length} baris × {parsed.headers.length} kolom: {parsed.headers.join(', ')}
            </p>
          )}

          {/* Column mapping */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-border">
            <ColumnPicker label="X (predictor)" value={colX} setValue={setColX} options={parsed.headers} />
            {model === 'mediation' && (
              <ColumnPicker label="M (mediator)" value={colM} setValue={setColM} options={parsed.headers} />
            )}
            {model === 'moderation' && (
              <ColumnPicker label="W (moderator)" value={colW} setValue={setColW} options={parsed.headers} />
            )}
            <ColumnPicker label="Y (outcome)" value={colY} setValue={setColY} options={parsed.headers} />
            <div>
              <label className="block text-[11px] font-medium text-fg/80 mb-0.5">α</label>
              <select value={alpha} onChange={e => setAlpha(e.target.value)} className="w-full border border-border rounded-lg px-2 py-1.5 text-xs">
                <option value={0.10}>0.10</option>
                <option value={0.05}>0.05</option>
                <option value={0.01}>0.01</option>
              </select>
            </div>
          </div>

          {model === 'mediation' && (
            <div className="mt-2">
              <label className="block text-[11px] font-medium text-fg/80 mb-0.5">
                Bootstrap resamples: <span className="text-accent">{bootstrap.toLocaleString()}</span>
              </label>
              <input
                type="range" min={500} max={10000} step={500}
                value={bootstrap}
                onChange={e => setBootstrap(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-[10px] text-muted">5000 = standar Hayes. Lebih tinggi = lebih akurat tapi lebih lambat.</p>
            </div>
          )}

          <div className="flex justify-end mt-3">
            <button onClick={handleRunClick} disabled={running} className="btn-primary text-sm disabled:opacity-50">
              <Play className="w-4 h-4" /> {running ? 'Memproses...' : 'Jalankan Analisis'}
            </button>
          </div>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      <ConfirmPaymentModal
        open={showPayment}
        loading={running}
        title="Bayar & Jalankan Mediasi/Moderasi"
        description={pricing.betaFree ? 'Gratis selama beta. Pricing paywall coming soon.' : 'Saldo dipotong setelah analisis berhasil diproses.'}
        price={pricing.price}
        originalPrice={pricing.original}
        priceBreakdown={pricing.breakdown}
        wallet={wallet}
        onConfirm={runAnalysis}
        onClose={() => setShowPayment(false)}
      />
    </div>
  )
}

function ModelCard({ active, onClick, icon: Icon, title, desc, example }) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-xl border-2 transition-all ${
        active
          ? 'border-accent bg-accent/10 shadow-md'
          : 'border-border bg-card hover:border-accent/50'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${active ? 'text-accent' : 'text-muted'}`} />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <p className="text-xs text-muted mb-1">{desc}</p>
      <p className="text-[11px] italic text-muted">{example}</p>
    </button>
  )
}

function ColumnPicker({ label, value, setValue, options }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-fg/80 mb-0.5">{label}</label>
      <select value={value} onChange={e => setValue(e.target.value)} className="w-full border border-border rounded-lg px-2 py-1.5 text-xs">
        {(options || []).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

// ============================================================
// CSV parser
// ============================================================
function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split(/[,;\t]/).map(s => s.trim())
  const rows = lines.slice(1).map(l => l.split(/[,;\t]/).map(s => s.trim()))
  return { headers, rows }
}

// Sample data: simulated mediation X→M→Y with a=0.6, b=0.5, cp=0.2 + interaction effect
const SAMPLE_CSV = `X,M,W,Y
0.5,1.2,0.3,1.8
-0.4,-0.1,-0.5,-0.3
1.1,1.5,0.8,2.4
-0.7,-0.4,-0.2,-1.0
0.3,0.8,0.6,1.4
0.9,1.0,1.1,2.1
-1.2,-0.7,-0.9,-1.6
0.2,0.5,0.4,1.0
-0.5,-0.3,-0.1,-0.5
1.3,1.7,1.2,2.7
-0.3,-0.2,0.0,-0.2
0.7,0.9,0.5,1.6
-0.9,-0.5,-0.6,-1.3
0.1,0.3,0.2,0.6
0.4,0.7,0.7,1.3
-0.6,-0.4,-0.3,-0.8
1.0,1.3,0.9,2.2
-0.2,0.0,0.1,0.0
0.6,0.8,0.4,1.5
-1.0,-0.6,-0.7,-1.4
0.8,1.1,0.6,1.9
-0.4,-0.3,-0.2,-0.6
0.5,0.6,0.3,1.1
-0.8,-0.5,-0.4,-1.1
0.0,0.2,0.0,0.3
1.2,1.5,1.0,2.5
-0.5,-0.2,-0.3,-0.7
0.6,1.0,0.8,1.7
-0.7,-0.5,-0.5,-1.2
0.4,0.6,0.5,1.2
-0.3,-0.1,0.2,-0.1
0.9,1.2,0.7,2.0
-1.1,-0.7,-0.8,-1.5
0.3,0.4,0.1,0.7
0.7,1.0,0.9,1.8
-0.5,-0.4,-0.6,-0.9
0.1,0.1,-0.1,0.2
0.8,1.1,0.5,1.7
-0.2,-0.1,-0.2,-0.3
0.5,0.7,0.6,1.3`

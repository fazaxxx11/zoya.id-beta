// Logistic Regression UI
// ======================
// Halaman analisis regresi logistik biner: prediksi outcome 0/1 dari
// satu atau lebih predictor.

import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, Play, Upload, AlertTriangle,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ConfirmPaymentModal from '../components/ConfirmPaymentModal'
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
  const [error, setError] = useState(null)
  const [running, setRunning] = useState(false)
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

      setShowPayment(false)
      // Persist result ke localStorage + navigate ke page hasil terpisah.
      // Sync write (bukan via usePersist effect) karena component unmount
      // setelah navigate. LogisticHasil baca via usePersist.
      const finalResult = { fit, cm, roc, hl, paid: payment.paid || 0 }
      try { localStorage.setItem('logistic_result', JSON.stringify(finalResult)) } catch {}
      navigate('/logistik/hasil')
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

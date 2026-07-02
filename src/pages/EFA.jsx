// EFA UI page
// ===========
// Validitas konstruk untuk kuesioner skala Likert.
// Output: KMO, Bartlett, Scree plot, faktor loadings, rotated structure.

import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layers, Play, Upload, AlertTriangle,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ConfirmPaymentModal from '../components/ConfirmPaymentModal'
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
  const [error, setError] = useState(null)
  const [running, setRunning] = useState(false)
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
      setShowPayment(false)
      // Persist result ke localStorage + navigate ke page hasil terpisah.
      // Sync write (bukan via usePersist effect) karena component unmount
      // setelah navigate. EFAHasil baca via usePersist.
      try { localStorage.setItem('efa_result', JSON.stringify({ ...r, paid: payment.paid || 0 })) } catch {}
      navigate('/efa/hasil')
      toast.success(`Analisis selesai — ${r.nFactors} faktor`)
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

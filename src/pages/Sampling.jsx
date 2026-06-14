// Sample Size & Sampling Calculator
// =================================
// Halaman kalkulator penentuan ukuran sampel untuk skripsi/tesis.
// 4 rumus + alokasi bertingkat + random sampler.

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Calculator, Users, Shuffle, Layers, Info,
  Copy, Download, ArrowRight, BookOpen, Dice5, RefreshCw,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {
  slovinSize, krejcieMorganSize, cochranSize, lemeshowSize,
  stratifiedAllocation, randomSample, SAMPLING_FORMULAS,
} from '../lib/sampling'
import { toast } from '../lib/toast'

export default function Sampling() {
  const [tab, setTab] = useState('size')

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title="Penentuan Sampel"
        subtitle="Kalkulator metodologi penelitian"
        breadcrumbs={[
          { path: '/', label: 'Beranda' },
          { path: '/sampling', label: 'Sampel' },
        ]}
      />

      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-4 space-y-4">
        {/* Intro */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-emerald-900 mb-1">Penentuan Ukuran Sampel</h2>
              <p className="text-xs text-emerald-800">
                Hitung berapa responden yang dibutuhkan, alokasikan ke kelas/strata, lalu random pilih siapa yang jadi sampel.
                Cocok untuk Bab III metodologi.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border overflow-x-auto">
          {[
            { id: 'size', label: 'Ukuran Sampel', icon: Calculator },
            { id: 'stratified', label: 'Alokasi Strata', icon: Layers },
            { id: 'random', label: 'Random Sampler', icon: Shuffle },
            { id: 'help', label: 'Panduan', icon: BookOpen },
          ].map(t => {
            const Ic = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  tab === t.id
                    ? 'border-emerald-500 text-emerald-700'
                    : 'border-transparent text-muted hover:text-gray-700 dark:text-gray-300'
                }`}
              >
                <Ic className="w-4 h-4" /> {t.label}
              </button>
            )
          })}
        </div>

        {tab === 'size' && <SizeCalculator />}
        {tab === 'stratified' && <StratifiedPanel />}
        {tab === 'random' && <RandomSampler />}
        {tab === 'help' && <HelpPanel />}
      </div>
    </div>
  )
}

// ============================================================
// Tab 1: Hitung ukuran sampel
// ============================================================
function SizeCalculator() {
  const [formula, setFormula] = useState('slovin')
  const [N, setN] = useState(1000)
  const [e, setE] = useState(0.05)
  const [confidence, setConfidence] = useState(0.95)
  const [p, setP] = useState(0.5)
  const [d, setD] = useState(0.05)
  const [useFPC, setUseFPC] = useState(false)

  const result = useMemo(() => {
    try {
      switch (formula) {
        case 'slovin':
          return slovinSize(Number(N), Number(e))
        case 'krejcie_morgan':
          return krejcieMorganSize(Number(N), { confidence: Number(confidence), p: Number(p), e: Number(e) })
        case 'cochran':
          return cochranSize({
            confidence: Number(confidence),
            p: Number(p),
            e: Number(e),
            N: useFPC ? Number(N) : null,
          })
        case 'lemeshow':
          return lemeshowSize({ confidence: Number(confidence), p: Number(p), d: Number(d) })
        default:
          return null
      }
    } catch (err) {
      return { error: err.message }
    }
  }, [formula, N, e, confidence, p, d, useFPC])

  const formulaMeta = SAMPLING_FORMULAS.find(f => f.id === formula)

  const showN = formula !== 'lemeshow' && (formula !== 'cochran' || useFPC)
  const showE = formula !== 'lemeshow'
  const showConfidence = formula !== 'slovin'
  const showP = formula !== 'slovin'
  const showD = formula === 'lemeshow'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Input panel */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-600" /> Parameter
        </h3>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Rumus</label>
          <select
            value={formula}
            onChange={e => setFormula(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm"
          >
            {SAMPLING_FORMULAS.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          {formulaMeta && (
            <p className="text-[11px] text-muted mt-1">{formulaMeta.desc}</p>
          )}
        </div>

        {showN && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Populasi (N)
              {formula === 'cochran' && (
                <label className="ml-2 text-[10px] font-normal">
                  <input
                    type="checkbox"
                    checked={useFPC}
                    onChange={e => setUseFPC(e.target.checked)}
                    className="mr-1"
                  />
                  Pakai koreksi populasi
                </label>
              )}
            </label>
            <input
              type="number"
              value={N}
              onChange={e => setN(e.target.value)}
              min={1}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}

        {showE && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Margin of Error / e (mis. 0.05 = 5%)
            </label>
            <input
              type="number"
              value={e}
              onChange={ev => setE(ev.target.value)}
              step={0.01} min={0.001} max={0.5}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}

        {showD && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Presisi (d) — proporsi mutlak
            </label>
            <input
              type="number"
              value={d}
              onChange={ev => setD(ev.target.value)}
              step={0.01} min={0.001} max={0.5}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}

        {showConfidence && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tingkat Kepercayaan
            </label>
            <select
              value={confidence}
              onChange={e => setConfidence(Number(e.target.value))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm"
            >
              <option value={0.90}>90% (Z = 1.645)</option>
              <option value={0.95}>95% (Z = 1.960) — paling umum</option>
              <option value={0.99}>99% (Z = 2.576)</option>
            </select>
          </div>
        )}

        {showP && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Proporsi (p) — gunakan 0.5 jika tidak diketahui (paling konservatif)
            </label>
            <input
              type="number"
              value={p}
              onChange={ev => setP(ev.target.value)}
              step={0.01} min={0.01} max={0.99}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {/* Result panel */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-emerald-600" /> Hasil
        </h3>

        {result?.error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
            {result.error}
          </div>
        ) : result ? (
          <>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4 text-center mb-3">
              <div className="text-xs text-emerald-700 mb-1">Ukuran Sampel Minimum</div>
              <div className="text-5xl font-bold text-emerald-700 mb-1">{result.n}</div>
              <div className="text-xs text-emerald-600">responden</div>
            </div>

            <div className="text-xs space-y-2">
              <div>
                <div className="font-semibold text-gray-700 dark:text-gray-300">Rumus</div>
                <code className="text-[11px] bg-surface px-2 py-1 rounded block mt-1 text-gray-700 dark:text-gray-300">
                  {result.formula}
                </code>
              </div>
              <div>
                <div className="font-semibold text-gray-700 dark:text-gray-300">Catatan</div>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{result.note}</p>
              </div>

              <button
                onClick={() => {
                  const text = `Berdasarkan rumus ${formulaMeta.name}, diperoleh ukuran sampel minimum sebesar n = ${result.n} responden. ${result.note}`
                  navigator.clipboard.writeText(text)
                  toast.success('Teks disalin ke clipboard')
                }}
                className="w-full mt-2 btn-secondary text-xs py-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> Salin teks untuk Bab III
              </button>
            </div>
          </>
        ) : null}
      </div>

      {/* Quick reference table */}
      {formula === 'slovin' && (
        <div className="md:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
          <div className="font-semibold text-amber-900 mb-2 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" /> Pedoman umum nilai e (margin of error)
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card rounded p-2">
              <div className="font-semibold">e = 1%</div>
              <div className="text-gray-600 dark:text-gray-400">Sangat presisi, n besar</div>
            </div>
            <div className="bg-card rounded p-2">
              <div className="font-semibold">e = 5%</div>
              <div className="text-gray-600 dark:text-gray-400">Standar skripsi</div>
            </div>
            <div className="bg-card rounded p-2">
              <div className="font-semibold">e = 10%</div>
              <div className="text-gray-600 dark:text-gray-400">Eksplorasi cepat</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Tab 2: Alokasi sampel ke strata
// ============================================================
function StratifiedPanel() {
  const [strata, setStrata] = useState([
    { name: 'Kelas X',   N: 200 },
    { name: 'Kelas XI',  N: 150 },
    { name: 'Kelas XII', N: 150 },
  ])
  const [n, setN] = useState(100)
  const [mode, setMode] = useState('proportional')

  const update = (i, field, val) => {
    setStrata(s => s.map((row, j) => j === i ? { ...row, [field]: field === 'N' ? Number(val) : val } : row))
  }
  const add = () => setStrata(s => [...s, { name: `Strata ${s.length + 1}`, N: 100 }])
  const remove = (i) => setStrata(s => s.filter((_, j) => j !== i))

  const result = useMemo(() => {
    try {
      return stratifiedAllocation(strata, Number(n), mode)
    } catch (err) {
      return { error: err.message }
    }
  }, [strata, n, mode])

  const totalN = strata.reduce((s, x) => s + (Number(x.N) || 0), 0)

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" /> Daftar Strata
        </h3>

        <div className="space-y-2 mb-3">
          {strata.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={s.name}
                onChange={e => update(i, 'name', e.target.value)}
                placeholder="Nama strata"
                className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm"
              />
              <input
                type="number"
                value={s.N}
                onChange={e => update(i, 'N', e.target.value)}
                placeholder="Populasi"
                min={1}
                className="w-28 border border-border rounded-lg px-3 py-1.5 text-sm"
              />
              <button
                onClick={() => remove(i)}
                disabled={strata.length === 1}
                className="text-red-500 hover:text-red-700 disabled:text-muted px-2"
              >×</button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
          <button onClick={add} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
            + Tambah strata
          </button>
          <span className="text-xs text-muted">·</span>
          <span className="text-xs text-gray-600 dark:text-gray-400">Total populasi: <strong>{totalN}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3">Total Sampel & Mode</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Total sampel (n)</label>
              <input
                type="number"
                value={n}
                onChange={e => setN(e.target.value)}
                min={1}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Mode alokasi</label>
              <select
                value={mode}
                onChange={e => setMode(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="proportional">Proporsional (sesuai ukuran strata)</option>
                <option value="equal">Sama rata</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3">Alokasi per Strata</h3>
          {result?.error ? (
            <div className="text-xs text-red-700">{result.error}</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-surface">
                <tr>
                  <th className="px-2 py-1.5 text-left">Strata</th>
                  <th className="px-2 py-1.5 text-right">N</th>
                  <th className="px-2 py-1.5 text-right">Frac</th>
                  <th className="px-2 py-1.5 text-right">n</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.map(r => (
                  <tr key={r.name}>
                    <td className="px-2 py-1.5 font-medium">{r.name}</td>
                    <td className="px-2 py-1.5 text-right text-gray-600 dark:text-gray-400">{r.N}</td>
                    <td className="px-2 py-1.5 text-right text-muted">{(r.fraction*100).toFixed(1)}%</td>
                    <td className="px-2 py-1.5 text-right font-bold text-emerald-700">{r.n}</td>
                  </tr>
                ))}
                <tr className="bg-surface">
                  <td className="px-2 py-1.5 font-bold">Total</td>
                  <td className="px-2 py-1.5 text-right font-bold">{totalN}</td>
                  <td></td>
                  <td className="px-2 py-1.5 text-right font-bold text-emerald-700">
                    {result.reduce((s, x) => s + x.n, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Tab 3: Random Sampler — pick k from list
// ============================================================
function RandomSampler() {
  const [namesText, setNamesText] = useState(
    'Andi\nBudi\nCitra\nDewi\nEko\nFitri\nGalih\nHesti\nIndra\nJoko\nKarina\nLukman\nMaya\nNanda\nOlivia'
  )
  const [k, setK] = useState(5)
  const [seed, setSeed] = useState('')
  const [result, setResult] = useState([])

  const items = namesText.split('\n').map(s => s.trim()).filter(s => s.length > 0)

  const handlePick = () => {
    try {
      const seedNum = seed === '' ? undefined : Number(seed)
      const picked = randomSample(items, Number(k), seedNum)
      setResult(picked)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const exportCSV = () => {
    const csv = 'No,Nama\n' + result.map((r, i) => `${i+1},${r}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'sampel_terpilih.csv'
    a.click()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Dice5 className="w-4 h-4 text-emerald-600" /> Daftar Populasi
        </h3>
        <p className="text-xs text-muted">Tempel daftar nama (1 baris = 1 nama). Bisa juga ID, NIM, NIK, dll.</p>
        <textarea
          value={namesText}
          onChange={e => setNamesText(e.target.value)}
          rows={10}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono"
        />
        <div className="text-xs text-muted">Total: <strong>{items.length}</strong> item</div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Jumlah pilih (k)</label>
            <input
              type="number"
              value={k}
              onChange={e => setK(e.target.value)}
              min={1} max={items.length}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Seed (opsional)
              <span className="text-muted font-normal ml-1" title="Angka untuk reproducibility">ⓘ</span>
            </label>
            <input
              type="number"
              value={seed}
              onChange={e => setSeed(e.target.value)}
              placeholder="Kosongkan = random"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button onClick={handlePick} className="w-full btn-primary text-sm">
          <Shuffle className="w-4 h-4" /> Pilih Acak
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Sampel Terpilih</h3>
          {result.length > 0 && (
            <button onClick={exportCSV} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          )}
        </div>
        {result.length === 0 ? (
          <p className="text-xs text-muted italic text-center py-8">Klik "Pilih Acak" untuk lihat hasil</p>
        ) : (
          <ol className="text-sm space-y-1">
            {result.map((r, i) => (
              <li key={i} className="flex items-center gap-2 px-2 py-1 hover:bg-surface rounded">
                <span className="text-xs text-muted w-6">{i + 1}.</span>
                <span className="font-medium">{r}</span>
              </li>
            ))}
          </ol>
        )}
        {seed !== '' && result.length > 0 && (
          <p className="text-[10px] text-muted mt-3 italic">
            Seed = {seed}. Hasil reproducible — pakai seed yang sama akan keluar urutan yang sama.
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Tab 4: Panduan
// ============================================================
function HelpPanel() {
  return (
    <div className="space-y-3 max-w-3xl">
      <details open className="bg-card border border-border rounded-xl">
        <summary className="px-4 py-3 cursor-pointer font-semibold text-sm">Kapan pakai rumus apa?</summary>
        <div className="px-4 pb-4 text-sm text-gray-700 dark:text-gray-300 space-y-3">
          <div>
            <strong className="text-emerald-700">Slovin / Yamane</strong> — paling umum di skripsi Indonesia.
            Pakai jika populasi (N) diketahui dan tidak butuh asumsi proporsi. Sederhana, hanya butuh N + e.
          </div>
          <div>
            <strong className="text-emerald-700">Krejcie & Morgan</strong> — kalau dosen Anda minta merujuk ke "tabel Krejcie".
            Sebenarnya rumusnya pakai Z, p, e — tabel klasik 1970 menggunakan Z=1.96, p=0.5, e=0.05.
          </div>
          <div>
            <strong className="text-emerald-700">Cochran</strong> — populasi tidak diketahui atau sangat besar.
            Default tanpa koreksi populasi memberi n=385 untuk p=0.5. Kalau N diketahui, aktifkan koreksi (FPC).
          </div>
          <div>
            <strong className="text-emerald-700">Lemeshow</strong> — penelitian kesehatan masyarakat / prevalensi penyakit.
            Output identik dengan Cochran tanpa FPC, tapi terminologi yang dipakai (presisi d) lebih cocok di bidang kesehatan.
          </div>
        </div>
      </details>

      <details className="bg-card border border-border rounded-xl">
        <summary className="px-4 py-3 cursor-pointer font-semibold text-sm">Apa itu p (proporsi)?</summary>
        <div className="px-4 pb-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <p>p = perkiraan proporsi populasi yang memiliki karakteristik yang Anda teliti.</p>
          <p>Kalau tidak punya data awal, gunakan <strong>p = 0.5</strong> (paling konservatif → menghasilkan n terbesar).</p>
          <p>Contoh: jika dari studi pilot 30% siswa malas membaca, maka p = 0.3.</p>
        </div>
      </details>

      <details className="bg-card border border-border rounded-xl">
        <summary className="px-4 py-3 cursor-pointer font-semibold text-sm">Setelah dapat n, lalu apa?</summary>
        <div className="px-4 pb-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <p>1. <strong>Tab "Alokasi Strata"</strong> — bagi n ke kelas/strata secara proporsional.</p>
          <p>2. <strong>Tab "Random Sampler"</strong> — paste daftar nama populasi, sistem akan acak pilih sampel sesuai n.</p>
          <p>3. Pakai <Link to="/kuesioner" className="text-emerald-600 hover:underline">Kuesioner Builder</Link> untuk bikin instrumen.</p>
          <p>4. Setelah data terkumpul, masuk ke <Link to="/statistik" className="text-emerald-600 hover:underline">Statistik</Link> untuk analisis.</p>
        </div>
      </details>

      <details className="bg-card border border-border rounded-xl">
        <summary className="px-4 py-3 cursor-pointer font-semibold text-sm">Apakah n dari kalkulator ini wajib diikuti persis?</summary>
        <div className="px-4 pb-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <p>n adalah <strong>minimum</strong>. Boleh lebih tinggi, tidak boleh lebih rendah (tanpa justifikasi khusus).</p>
          <p>Untuk penelitian kuantitatif, lazim dibulatkan ke atas atau ditambah 10–20% untuk antisipasi non-respons / dropout.</p>
        </div>
      </details>
    </div>
  )
}

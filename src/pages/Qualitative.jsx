// Analisis Kualitatif
// ===================
// Halaman untuk analisis data kualitatif: dokumen (transkrip wawancara,
// observasi), codebook, coding, word frequency, dan reliabilitas inter-rater
// (Cohen's kappa).

import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare, FileText, Tag, BarChart2, Users, Plus, Trash2, Edit3,
  Upload, Download, Search, X, Check, Save, Highlighter, Eye, Copy,
  AlertTriangle, Info, Sparkles,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ConfirmPaymentModal from '../components/ConfirmPaymentModal'
import {
  newCode, newDocument,
  listCodes, saveCode, deleteCode,
  listDocuments, saveDocument, deleteDocument,
  listCodings, saveCoding, deleteCoding,
  wordFrequency, bigramFrequency,
  cohensKappa, percentAgreement, interpretKappa, interpretKappaID,
  codeStats, coOccurrence,
} from '../lib/qualitative'
import { checkPaywall, chargeForTool } from '../lib/paywall'
import { getWallet } from '../lib/wallet'
import { getStatisticsPriceWithDiscount } from '../lib/pricing'
import { toast } from '../lib/toast'

const TABS = [
  { id: 'docs',     label: 'Dokumen',       icon: FileText },
  { id: 'codebook', label: 'Codebook',      icon: Tag },
  { id: 'coding',   label: 'Coding',        icon: Highlighter },
  { id: 'analysis', label: 'Analisis',      icon: BarChart2 },
  { id: 'reliab',   label: 'Reliabilitas',  icon: Users },
]

const CODE_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#0ea5e9',
]

export default function Qualitative() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('docs')
  const [docs, setDocs] = useState([])
  const [codes, setCodes] = useState([])
  const [codings, setCodings] = useState([])
  const [showPayment, setShowPayment] = useState(false)
  const [pendingTab, setPendingTab] = useState(null)
  const [unlockPaidTabs, setUnlockPaidTabs] = useState(false)
  const pricing = getStatisticsPriceWithDiscount('qualitative', docs.length)
  const wallet = getWallet()

  const refresh = () => {
    setDocs(listDocuments())
    setCodes(listCodes())
    setCodings(listCodings())
  }

  useEffect(() => { refresh() }, [])

  const handleTabChange = (nextTab) => {
    if (!['analysis', 'reliab'].includes(nextTab) || unlockPaidTabs) {
      setTab(nextTab)
      return
    }
    const gate = checkPaywall('qualitative', docs.length, navigate)
    if (!gate.allowed) {
      gate.action?.()
      return
    }
    setPendingTab(nextTab)
    setShowPayment(true)
  }

  const handleConfirmPayment = () => {
    const payment = chargeForTool('qualitative', docs.length)
    if (!payment.success) {
      toast.error(payment.error || 'Pembayaran gagal')
      return
    }
    setUnlockPaidTabs(true)
    setTab(pendingTab || 'analysis')
    setPendingTab(null)
    setShowPayment(false)
    toast.success('Akses analisis kualitatif dibuka')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title="Analisis Kualitatif"
        subtitle="Coding, codebook, word frequency, & reliabilitas inter-rater"
        breadcrumbs={[
          { path: '/', label: 'Beranda' },
          { path: '/kualitatif', label: 'Kualitatif' },
        ]}
      />

      <div className="max-w-6xl mx-auto px-3 sm:px-5 py-4 space-y-4">
        {/* Hero */}
        <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500 text-white flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-rose-900 mb-1">Analisis Data Kualitatif</h2>
              <p className="text-xs text-rose-800">
                Kelola transkrip wawancara, buat skema kode, lakukan coding terbuka,
                analisis frekuensi kata, dan hitung reliabilitas antar-koder (Cohen's κ).
                Cocok untuk skripsi/tesis kualitatif &amp; mixed-method.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={`px-4 py-2 text-sm flex items-center gap-1.5 whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? 'border-rose-500 text-rose-700 font-medium'
                    : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            )
          })}
        </div>

        {tab === 'docs'     && <DocsTab docs={docs} refresh={refresh} />}
        {tab === 'codebook' && <CodebookTab codes={codes} refresh={refresh} />}
        {tab === 'coding'   && <CodingTab docs={docs} codes={codes} codings={codings} refresh={refresh} />}
        {tab === 'analysis' && <AnalysisTab docs={docs} codes={codes} codings={codings} />}
        {tab === 'reliab'   && <ReliabilityTab />}
      </div>

      <ConfirmPaymentModal
        open={showPayment}
        title="Bayar & Buka Analisis Kualitatif"
        description={pricing.betaFree ? 'Gratis selama beta. Pro/Premium akan dikunci setelah beta.' : 'Membuka tab Analisis dan Reliabilitas untuk sesi ini.'}
        price={pricing.price}
        originalPrice={pricing.original}
        priceBreakdown={pricing.breakdown}
        wallet={wallet}
        onConfirm={handleConfirmPayment}
        onClose={() => setShowPayment(false)}
      />
    </div>
  )
}

// ============================================================
// Tab: Documents
// ============================================================
function DocsTab({ docs, refresh }) {
  const [editing, setEditing] = useState(null)
  const fileRef = useRef(null)

  const handleAdd = () => setEditing(newDocument())
  const handleSave = (doc) => {
    if (!doc.title.trim() || !doc.text.trim()) {
      toast.error('Judul dan isi dokumen wajib diisi')
      return
    }
    saveDocument(doc)
    refresh()
    setEditing(null)
    toast.success('Dokumen disimpan')
  }
  const handleDelete = (id) => {
    if (!confirm('Hapus dokumen ini? Semua coding terkait juga akan terhapus.')) return
    deleteDocument(id)
    refresh()
    toast.success('Dokumen dihapus')
  }
  const handleUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const r = new FileReader()
    r.onload = ev => {
      const text = String(ev.target.result || '')
      const doc = newDocument(file.name.replace(/\.[^.]+$/, ''), text)
      saveDocument(doc)
      refresh()
      toast.success(`"${file.name}" dimuat`)
    }
    r.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button onClick={handleAdd} className="btn-primary text-xs py-2">
          <Plus className="w-4 h-4" /> Tambah Dokumen
        </button>
        <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs py-2">
          <Upload className="w-4 h-4" /> Upload .txt
        </button>
        <input ref={fileRef} type="file" accept=".txt,.md" onChange={handleUpload} className="hidden" />
        {docs.length === 0 && (
          <button
            onClick={() => {
              SAMPLE_DOCS.forEach(d => saveDocument(newDocument(d.title, d.text)))
              refresh()
              toast.success('3 sampel transkrip dimuat')
            }}
            className="btn-ghost text-xs py-2"
          >
            <Sparkles className="w-4 h-4" /> Muat Contoh
          </button>
        )}
      </div>

      {docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Belum ada dokumen"
          desc="Tambah transkrip wawancara, catatan observasi, atau dokumen lain. Bisa upload .txt atau muat contoh."
        />
      ) : (
        <div className="space-y-2">
          {docs.map(d => (
            <DocCard key={d.id} doc={d} onEdit={() => setEditing(d)} onDelete={() => handleDelete(d.id)} />
          ))}
        </div>
      )}

      {editing && <DocEditor initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />}
    </div>
  )
}

function DocCard({ doc, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const wordCount = doc.text.trim().split(/\s+/).length
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <div className="flex items-start gap-2">
        <FileText className="w-4 h-4 text-rose-500 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{doc.title}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {wordCount} kata · {doc.text.length} karakter
            {doc.interviewee && ` · ${doc.interviewee}`}
            {doc.date && ` · ${doc.date}`}
          </div>
          {expanded && (
            <div className="mt-2 bg-surface rounded p-2 text-xs whitespace-pre-wrap max-h-60 overflow-y-auto">
              {doc.text}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded(!expanded)} className="text-muted hover:text-gray-700 p-1" title={expanded ? 'Tutup' : 'Lihat'}>
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={onEdit} className="text-muted hover:text-rose-600 p-1" title="Edit">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="text-muted hover:text-red-600 p-1" title="Hapus">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function DocEditor({ initial, onSave, onCancel }) {
  const [doc, setDoc] = useState(initial)
  const update = (patch) => setDoc(d => ({ ...d, ...patch }))
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold">{initial.title ? 'Edit Dokumen' : 'Tambah Dokumen'}</h3>
          <button onClick={onCancel} className="text-muted hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <input
            type="text" value={doc.title} onChange={e => update({ title: e.target.value })}
            placeholder="Judul (mis. 'Wawancara Guru A')"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={doc.interviewee} onChange={e => update({ interviewee: e.target.value })}
              placeholder="Narasumber" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input type="date" value={doc.date} onChange={e => update({ date: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <textarea
            value={doc.text} onChange={e => update({ text: e.target.value })}
            rows={14} placeholder="Paste transkrip atau catatan di sini..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
          />
        </div>
        <div className="border-t border-border px-5 py-3 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost text-sm">Batal</button>
          <button onClick={() => onSave(doc)} className="btn-primary text-sm">
            <Save className="w-4 h-4" /> Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Tab: Codebook
// ============================================================
function CodebookTab({ codes, refresh }) {
  const [editing, setEditing] = useState(null)

  const handleAdd = () => {
    const usedColors = codes.map(c => c.color)
    const color = CODE_COLORS.find(c => !usedColors.includes(c)) || CODE_COLORS[codes.length % CODE_COLORS.length]
    setEditing(newCode('', color))
  }
  const handleSave = (code) => {
    if (!code.label.trim()) { toast.error('Label kode wajib diisi'); return }
    saveCode(code)
    refresh()
    setEditing(null)
    toast.success('Kode disimpan')
  }
  const handleDelete = (id) => {
    if (!confirm('Hapus kode ini? Coding yang menggunakan kode ini juga akan ikut.')) return
    deleteCode(id)
    refresh()
    toast.success('Kode dihapus')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600">{codes.length} kode dalam codebook</p>
        <button onClick={handleAdd} className="btn-primary text-xs py-2">
          <Plus className="w-4 h-4" /> Tambah Kode
        </button>
      </div>

      {codes.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Codebook kosong"
          desc="Buat kode-kode (tema/kategori) untuk meng-coding dokumen kualitatif Anda. Mis: 'motivasi belajar', 'tantangan', 'dukungan keluarga'."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {codes.map(c => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-start gap-2">
              <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: c.color }} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{c.label}</div>
                {c.description && <div className="text-xs text-gray-600 mt-0.5">{c.description}</div>}
              </div>
              <button onClick={() => setEditing(c)} className="text-muted hover:text-rose-600 p-1"><Edit3 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(c.id)} className="text-muted hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      {editing && <CodeEditor initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />}
    </div>
  )
}

function CodeEditor({ initial, onSave, onCancel }) {
  const [code, setCode] = useState(initial)
  const update = (patch) => setCode(c => ({ ...c, ...patch }))
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold">{initial.label ? 'Edit Kode' : 'Tambah Kode'}</h3>
          <button onClick={onCancel} className="text-muted hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Label *</label>
            <input
              type="text" value={code.label} onChange={e => update({ label: e.target.value })}
              placeholder="mis. 'motivasi intrinsik'"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Deskripsi</label>
            <textarea
              value={code.description} onChange={e => update({ description: e.target.value })}
              rows={3} placeholder="Definisi operasional & kapan menggunakan kode ini..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Warna</label>
            <div className="flex gap-1.5 flex-wrap">
              {CODE_COLORS.map(col => (
                <button
                  key={col}
                  onClick={() => update({ color: col })}
                  className={`w-7 h-7 rounded-full border-2 ${code.color === col ? 'border-gray-900' : 'border-transparent'}`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-border px-5 py-3 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost text-sm">Batal</button>
          <button onClick={() => onSave(code)} className="btn-primary text-sm"><Save className="w-4 h-4" /> Simpan</button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Tab: Coding
// ============================================================
function CodingTab({ docs, codes, codings, refresh }) {
  const [docId, setDocId] = useState(docs[0]?.id || '')
  const [selection, setSelection] = useState(null)  // {start, end, text}
  const textRef = useRef(null)

  useEffect(() => {
    if (!docId && docs.length > 0) setDocId(docs[0].id)
  }, [docs, docId])

  const doc = docs.find(d => d.id === docId)
  const docCodings = codings.filter(c => c.documentId === docId)

  const handleSelectText = () => {
    const ta = textRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    if (start === end) { setSelection(null); return }
    const text = doc.text.substring(start, end).trim()
    if (text.length === 0) { setSelection(null); return }
    setSelection({ start, end, text })
  }

  const applyCode = (codeId) => {
    if (!selection || !doc) return
    saveCoding({
      documentId: doc.id,
      codeId,
      segment: selection.text,
      start: selection.start,
      end: selection.end,
    })
    refresh()
    setSelection(null)
    toast.success('Coding disimpan')
  }

  const removeCoding = (id) => {
    deleteCoding(id)
    refresh()
  }

  if (docs.length === 0) {
    return <EmptyState icon={Highlighter} title="Belum ada dokumen" desc="Tambah dokumen dulu di tab Dokumen sebelum mulai coding." />
  }
  if (codes.length === 0) {
    return <EmptyState icon={Tag} title="Codebook kosong" desc="Buat kode-kode dulu di tab Codebook sebelum coding." />
  }

  return (
    <div className="space-y-3">
      {/* Doc picker */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-700">Dokumen:</label>
        <select value={docId} onChange={e => { setDocId(e.target.value); setSelection(null) }} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
          {docs.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
        <span className="text-[11px] text-gray-400">{docCodings.length} segment ter-coding</span>
      </div>

      {doc && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-900 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>Pilih (highlight) teks di bawah, lalu klik salah satu kode untuk meng-coding segment tersebut.</span>
          </div>

          {/* Editable area for selection */}
          <textarea
            ref={textRef}
            value={doc.text}
            onMouseUp={handleSelectText}
            onKeyUp={handleSelectText}
            readOnly
            rows={12}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm font-mono"
          />

          {/* Selection + code apply */}
          {selection && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
              <div className="text-xs text-rose-900 mb-1">Segment dipilih ({selection.end - selection.start} karakter):</div>
              <div className="bg-white rounded p-2 text-xs italic mb-2">"{selection.text}"</div>
              <div className="text-xs font-medium text-rose-900 mb-1">Pilih kode:</div>
              <div className="flex flex-wrap gap-1.5">
                {codes.map(c => (
                  <button
                    key={c.id}
                    onClick={() => applyCode(c.id)}
                    className="text-xs px-2 py-1 rounded-full border-2 hover:scale-105 transition-transform"
                    style={{ borderColor: c.color, color: c.color }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Existing codings list */}
          {docCodings.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="text-sm font-medium mb-2">Coding pada dokumen ini ({docCodings.length})</div>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {docCodings.map(cd => {
                  const code = codes.find(c => c.id === cd.codeId)
                  if (!code) return null
                  return (
                    <div key={cd.id} className="flex items-start gap-2 text-xs border-l-2 pl-2 py-1" style={{ borderColor: code.color }}>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{ backgroundColor: code.color + '22', color: code.color }}>
                        {code.label}
                      </span>
                      <span className="flex-1 italic text-gray-700">"{cd.segment}"</span>
                      <button onClick={() => removeCoding(cd.id)} className="text-muted hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================================================
// Tab: Analysis (word freq + code stats)
// ============================================================
function AnalysisTab({ docs, codes, codings }) {
  const [scope, setScope] = useState('all')   // 'all' | docId
  const [removeStop, setRemoveStop] = useState(true)
  const [topN, setTopN] = useState(30)

  const text = useMemo(() => {
    if (scope === 'all') return docs.map(d => d.text).join('\n')
    return docs.find(d => d.id === scope)?.text || ''
  }, [docs, scope])

  const wordFreq = useMemo(
    () => wordFrequency(text, { removeStopwords: removeStop }).slice(0, topN),
    [text, removeStop, topN]
  )
  const bigrams = useMemo(
    () => bigramFrequency(text, { removeStopwords: removeStop }).slice(0, 20),
    [text, removeStop]
  )

  const stats = useMemo(() => codeStats(codes, codings), [codes, codings])
  const cooc = useMemo(() => coOccurrence(codes, codings), [codes, codings])

  const maxCount = wordFreq[0]?.count || 1

  if (docs.length === 0) {
    return <EmptyState icon={BarChart2} title="Belum ada dokumen" desc="Tambah dokumen dulu untuk menganalisis." />
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap items-center gap-3">
        <div>
          <label className="block text-[11px] font-medium text-gray-700 mb-0.5">Scope</label>
          <select value={scope} onChange={e => setScope(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
            <option value="all">Semua dokumen ({docs.length})</option>
            {docs.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-700 mb-0.5">Top N</label>
          <input type="number" min={5} max={100} value={topN} onChange={e => setTopN(Number(e.target.value) || 30)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-20" />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-700 mt-3">
          <input type="checkbox" checked={removeStop} onChange={e => setRemoveStop(e.target.checked)} />
          Hilangkan stopwords (ID + EN)
        </label>
      </div>

      {/* Word frequency */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-rose-500" /> Frekuensi Kata
          </h3>
          <span className="text-xs text-gray-400">{wordFreq.length} kata teratas</span>
        </div>
        {wordFreq.length === 0 ? (
          <p className="text-sm text-gray-400">Tidak ada kata yang dianalisis.</p>
        ) : (
          <>
            {/* Word "cloud" — size scaled by frequency */}
            <div className="flex flex-wrap gap-2 mb-4 p-3 bg-surface rounded-lg">
              {wordFreq.slice(0, 30).map(w => {
                const size = 11 + Math.round((w.count / maxCount) * 18)
                const opacity = 0.5 + (w.count / maxCount) * 0.5
                return (
                  <span
                    key={w.word}
                    style={{ fontSize: `${size}px`, opacity, color: '#be185d' }}
                    className="font-medium"
                    title={`${w.count}× (${w.percent.toFixed(1)}%)`}
                  >
                    {w.word}
                  </span>
                )
              })}
            </div>
            {/* Bar list */}
            <div className="space-y-1">
              {wordFreq.map(w => (
                <div key={w.word} className="flex items-center gap-2 text-xs">
                  <span className="w-32 truncate font-mono">{w.word}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden relative">
                    <div className="h-full bg-rose-400" style={{ width: `${(w.count / maxCount) * 100}%` }} />
                    <span className="absolute inset-0 flex items-center px-2 font-medium text-gray-800">
                      {w.count} ({w.percent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bigrams */}
      {bigrams.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3">Frasa 2-Kata Teratas (bigrams)</h3>
          <div className="flex flex-wrap gap-1.5">
            {bigrams.map(b => (
              <span key={b.bigram} className="text-xs px-2 py-1 bg-rose-50 text-rose-700 rounded-full">
                {b.bigram} <span className="font-bold">{b.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Code stats */}
      {codes.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3">Statistik Kode</h3>
          {codings.length === 0 ? (
            <p className="text-xs text-gray-400">Belum ada coding. Mulai di tab Coding.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-surface">
                <tr>
                  <th className="px-2 py-1.5 text-left">Kode</th>
                  <th className="px-2 py-1.5 text-right">Jumlah Kemunculan</th>
                  <th className="px-2 py-1.5 text-right">Jumlah Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.map(s => (
                  <tr key={s.id}>
                    <td className="px-2 py-1.5 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">{s.occurrences}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{s.documentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Co-occurrence */}
      {codes.length >= 2 && codings.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-1">Co-Occurrence Antar Kode</h3>
          <p className="text-[11px] text-gray-400 mb-3">Berapa kali pasangan kode muncul bersama dalam dokumen yang sama. Diagonal = jumlah dokumen tempat kode itu muncul.</p>
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th></th>
                  {cooc.codes.map(c => (
                    <th key={c.id} className="px-2 py-1.5 text-[10px] writing-mode-vertical-lr" style={{ color: c.color }}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cooc.codes.map((row, i) => (
                  <tr key={row.id}>
                    <td className="px-2 py-1.5 text-right font-medium" style={{ color: row.color }}>{row.label}</td>
                    {cooc.matrix[i].map((val, j) => {
                      const max = Math.max(...cooc.matrix.flat()) || 1
                      const intensity = val / max
                      return (
                        <td key={j} className="px-2 py-1.5 text-center font-mono" style={{
                          backgroundColor: i === j ? '#e0e7ff' : `rgba(244, 63, 94, ${intensity * 0.6})`,
                        }}>
                          {val}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Tab: Reliability (Cohen's kappa)
// ============================================================
function ReliabilityTab() {
  const [csvText, setCsvText] = useState(SAMPLE_KAPPA_CSV)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const compute = () => {
    setError(null)
    try {
      const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) throw new Error('Minimal 2 baris (header + data)')
      const ratingsA = []
      const ratingsB = []
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(/[,;\t]/).map(c => c.trim())
        if (cells.length < 2) continue
        ratingsA.push(cells[0])
        ratingsB.push(cells[1])
      }
      if (ratingsA.length === 0) throw new Error('Tidak ada data ratings')
      const r = cohensKappa(ratingsA, ratingsB)
      r.percentAgreement = percentAgreement(ratingsA, ratingsB)
      setResult(r)
    } catch (err) {
      setError(err.message)
      setResult(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
        <p className="font-medium mb-1">Cohen's κ untuk Inter-Rater Reliability</p>
        <p>Paste data CSV dengan 2 kolom: <code>coder_A</code>, <code>coder_B</code>. Setiap baris = 1 unit yang di-coding oleh 2 koder berbeda. Kategori bisa berupa label kode (string).</p>
      </div>

      <textarea
        value={csvText}
        onChange={e => setCsvText(e.target.value)}
        rows={10}
        className="w-full font-mono text-xs border border-gray-200 rounded-lg p-2"
      />

      <div className="flex justify-end">
        <button onClick={compute} className="btn-primary text-sm">
          <BarChart2 className="w-4 h-4" /> Hitung Cohen's κ
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {result && <KappaResult r={result} />}
    </div>
  )
}

function KappaResult({ r }) {
  const interpretation = interpretKappaID(r.kappa)
  const color = r.kappa < 0.2 ? '#dc2626' : r.kappa < 0.4 ? '#f59e0b' : r.kappa < 0.6 ? '#eab308' : r.kappa < 0.8 ? '#10b981' : '#059669'
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric label="Cohen's κ" value={r.kappa.toFixed(4)} color={color} />
        <Metric label="Interpretasi" value={interpretation} small />
        <Metric label="Observed Agreement" value={(r.observedAgreement * 100).toFixed(1) + '%'} />
        <Metric label="Expected by Chance" value={(r.expectedAgreement * 100).toFixed(1) + '%'} />
      </div>

      <div className="text-xs">
        <div className="font-medium mb-1">Confusion Matrix ({r.n} unit, {r.categories.length} kategori)</div>
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr>
                <th className="px-2 py-1 bg-surface">A \ B</th>
                {r.categories.map(c => <th key={c} className="px-2 py-1 bg-surface">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {r.confusionMatrix.map((row, i) => (
                <tr key={i}>
                  <th className="px-2 py-1 bg-surface text-left">{r.categories[i]}</th>
                  {row.map((val, j) => (
                    <td key={j} className={`px-2 py-1 text-center font-mono ${i === j ? 'bg-green-50 font-bold' : ''}`}>{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
        <p className="font-medium mb-1">Pedoman Landis & Koch (1977):</p>
        <ul className="space-y-0.5 ml-3 list-disc">
          <li>κ &lt; 0.20 : kesepakatan rendah</li>
          <li>0.21 – 0.40 : cukup (fair)</li>
          <li>0.41 – 0.60 : sedang (moderate)</li>
          <li>0.61 – 0.80 : kuat (substantial)</li>
          <li>0.81 – 1.00 : hampir sempurna</li>
        </ul>
        <p className="mt-2">Untuk publikasi, κ ≥ 0.60 umumnya diterima. κ ≥ 0.80 = sangat baik.</p>
      </div>
    </div>
  )
}

function Metric({ label, value, color, small }) {
  return (
    <div className="bg-surface rounded-lg p-3">
      <div className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</div>
      <div className={`font-bold ${small ? 'text-sm' : 'text-2xl'}`} style={color ? { color } : {}}>{value}</div>
    </div>
  )
}

// ============================================================
// Empty state
// ============================================================
function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
      <Icon className="w-12 h-12 text-muted mx-auto mb-2" />
      <p className="font-medium text-sm mb-1">{title}</p>
      <p className="text-xs text-gray-400 max-w-md mx-auto">{desc}</p>
    </div>
  )
}

// ============================================================
// Sample data
// ============================================================
const SAMPLE_DOCS = [
  {
    title: 'Wawancara Guru A',
    text: `Saya rasa motivasi siswa belajar matematika cukup beragam. Beberapa siswa sangat antusias karena mereka melihat matematika sebagai tantangan yang menarik. Tapi ada juga siswa yang merasa cemas, takut salah, dan akhirnya enggan bertanya di kelas.

Tantangan utama saya sebagai guru adalah membuat semua siswa terlibat. Kelas dengan 35 siswa membuat sulit memberi perhatian individual. Saya sering pakai diskusi kelompok untuk siswa yang lebih pendiam bisa berkontribusi.

Dukungan dari orang tua juga sangat berpengaruh. Siswa yang orang tuanya aktif memantau tugas biasanya lebih konsisten. Tapi ada juga siswa yang harus bekerja sambil sekolah, dan itu jadi hambatan besar.`,
  },
  {
    title: 'Wawancara Siswa B',
    text: `Saya suka matematika sebenarnya, terutama kalau guru menjelaskan dengan contoh sehari-hari. Tantangan saya adalah waktu mengerjakan PR di rumah, kadang nggak ada yang bisa ditanya kalau saya nggak ngerti.

Motivasi saya datang dari ingin masuk universitas yang bagus. Orang tua juga sering bilang pendidikan itu penting. Tapi kalau capek dari les, fokusnya turun.

Yang saya rasa kurang adalah waktu untuk latihan. Materi terlalu cepat, belum sempat paham, sudah masuk topik baru.`,
  },
  {
    title: 'Wawancara Guru C',
    text: `Pengalaman saya 10 tahun mengajar menunjukkan bahwa motivasi belajar paling kuat datang dari rasa berhasil. Kalau siswa pernah merasakan "aha moment", mereka akan lebih percaya diri ke depannya.

Tantangan terbesar di sekolah kami adalah fasilitas terbatas dan kurikulum yang terus berubah. Dukungan dari kepala sekolah cukup baik tapi anggaran sering jadi kendala.

Saya percaya pendekatan personal pada siswa membuat perbedaan. Mengetahui latar belakang keluarga dan cita-cita mereka membantu saya menyesuaikan cara mengajar.`,
  },
]

const SAMPLE_KAPPA_CSV = `coder_A,coder_B
motivasi,motivasi
motivasi,motivasi
tantangan,tantangan
dukungan,dukungan
motivasi,tantangan
tantangan,tantangan
dukungan,dukungan
motivasi,motivasi
tantangan,motivasi
dukungan,dukungan
motivasi,motivasi
tantangan,tantangan
dukungan,motivasi
motivasi,motivasi
tantangan,tantangan
dukungan,dukungan
motivasi,motivasi
tantangan,tantangan
dukungan,dukungan
motivasi,motivasi`

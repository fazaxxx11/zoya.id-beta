// Manajemen Referensi & Sitasi
// ============================
// Halaman untuk simpan, kelola, dan format referensi penelitian.
// Fitur: DOI lookup CrossRef, BibTeX/RIS import, ekspor daftar pustaka,
// inline citation copy, grouping by tag.

import { useState, useMemo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Plus, Search, Trash2, Edit3, Copy, Download, Upload,
  Loader2, X, Check, Tag, FileText, ExternalLink, Filter, Save,
  ChevronDown, ChevronRight, Quote, Globe, GraduationCap,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {
  REF_TYPES, STYLES,
  newRef, listRefs, saveRef, deleteRef,
  formatAPA, formatIEEE, formatVancouver, formatHarvard,
  buildBibliography, inlineCite, lookupDOI,
  parseBibtex, parseRIS,
} from '../lib/references'
import { toast } from '../lib/toast'

const FORMATTERS = {
  apa: formatAPA,
  ieee: (r, i) => formatIEEE(r, i),
  vancouver: (r, i) => formatVancouver(r, i),
  harvard: formatHarvard,
}

export default function References() {
  const [refs, setRefs] = useState([])
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [filterType, setFilterType] = useState('')
  const [editing, setEditing] = useState(null)   // ref being edited or null
  const [showImport, setShowImport] = useState(false)
  const [showBiblio, setShowBiblio] = useState(false)
  const [style, setStyle] = useState('apa')

  useEffect(() => {
    setRefs(listRefs())
  }, [])

  const refresh = () => setRefs(listRefs())

  const filtered = useMemo(() => {
    let xs = refs
    if (search.trim()) {
      const q = search.toLowerCase()
      xs = xs.filter(r =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.journal || '').toLowerCase().includes(q) ||
        (r.publisher || '').toLowerCase().includes(q) ||
        (r.authors || []).some(a =>
          (a.family + ' ' + a.given).toLowerCase().includes(q)
        )
      )
    }
    if (filterTag)  xs = xs.filter(r => (r.tags || []).includes(filterTag))
    if (filterType) xs = xs.filter(r => r.type === filterType)
    return xs
  }, [refs, search, filterTag, filterType])

  const allTags = useMemo(() => {
    const set = new Set()
    refs.forEach(r => (r.tags || []).forEach(t => set.add(t)))
    return Array.from(set).sort()
  }, [refs])

  const handleSave = (ref) => {
    saveRef(ref)
    refresh()
    setEditing(null)
    toast.success('Referensi disimpan')
  }

  const handleDelete = (id) => {
    if (!confirm('Hapus referensi ini?')) return
    deleteRef(id)
    refresh()
    toast.success('Dihapus')
  }

  const handleImport = (text, format) => {
    try {
      const parser = format === 'bibtex' ? parseBibtex : parseRIS
      const parsed = parser(text)
      if (parsed.length === 0) {
        toast.warning('Tidak ada referensi yang berhasil di-parse')
        return
      }
      parsed.forEach(r => saveRef(r))
      refresh()
      setShowImport(false)
      toast.success(`${parsed.length} referensi ditambahkan`)
    } catch (err) {
      toast.error('Gagal parse: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen pb-bottomnav" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title="Manajemen Referensi"
        subtitle="Daftar pustaka & sitasi untuk skripsi/tesis"
        breadcrumbs={[
          { path: '/', label: 'Beranda' },
          { path: '/referensi', label: 'Referensi' },
        ]}
      />

      <div className="max-w-6xl mx-auto px-3 sm:px-5 py-4 space-y-4">
        {/* Hero */}
        <div className="bg-gradient-to-br from-terracotta/5 to-accent-soft border border-terracotta/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-terracotta text-white flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-fg mb-1">Referensi Penelitian</h2>
              <p className="text-xs text-fg/80">
                Simpan referensi, lookup metadata otomatis dari DOI, ekspor daftar pustaka APA/IEEE/Vancouver/Harvard.
                Cocok untuk Bab II tinjauan pustaka.
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari judul, penulis, jurnal..."
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-border rounded-lg px-2 py-2 text-xs"
          >
            <option value="">Semua tipe</option>
            {REF_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
            ))}
          </select>
          {allTags.length > 0 && (
            <select
              value={filterTag}
              onChange={e => setFilterTag(e.target.value)}
              className="border border-border rounded-lg px-2 py-2 text-xs"
            >
              <option value="">Semua tag</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <div className="flex-1" />
          <button
            onClick={() => setEditing(newRef('article'))}
            className="btn-primary text-xs py-2"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="btn-secondary text-xs py-2"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
          <button
            onClick={() => setShowBiblio(true)}
            disabled={refs.length === 0}
            className="btn-secondary text-xs py-2 disabled:opacity-40"
          >
            <FileText className="w-4 h-4" /> Daftar Pustaka
          </button>
        </div>

        {/* Stats */}
        {refs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <StatCard label="Total Referensi" value={refs.length} />
            <StatCard label="Tipe Berbeda" value={new Set(refs.map(r => r.type)).size} />
            <StatCard label="Tag" value={allTags.length} />
            <StatCard label="Tampil" value={filtered.length} />
          </div>
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <BookOpen className="w-12 h-12 text-muted mx-auto mb-2" />
            <p className="text-sm text-muted mb-3">
              {refs.length === 0
                ? 'Belum ada referensi. Mulai dengan menambah manual, lookup DOI, atau import BibTeX/RIS.'
                : 'Tidak ada hasil dengan filter ini.'}
            </p>
            {refs.length === 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={() => setEditing(newRef('article'))} className="btn-primary text-xs py-1.5">
                  <Plus className="w-3.5 h-3.5" /> Tambah Manual
                </button>
                <button onClick={() => setShowImport(true)} className="btn-secondary text-xs py-1.5">
                  <Upload className="w-3.5 h-3.5" /> Import BibTeX/RIS
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => (
              <RefCard
                key={r.id}
                data={r}
                onEdit={() => setEditing(r)}
                onDelete={() => handleDelete(r.id)}
                style={style}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        {editing && (
          <RefEditor
            initial={editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        )}

        {showImport && (
          <ImportModal
            onImport={handleImport}
            onCancel={() => setShowImport(false)}
          />
        )}

        {showBiblio && (
          <BibliographyModal
            refs={refs}
            style={style}
            onStyleChange={setStyle}
            onCancel={() => setShowBiblio(false)}
          />
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-card border border-border rounded-lg p-2 text-center">
      <div className="text-xl font-bold text-terracotta">{value}</div>
      <div className="text-[10px] text-muted uppercase tracking-wide">{label}</div>
    </div>
  )
}

// ============================================================
// Single ref card
// ============================================================
function RefCard({ data: ref, onEdit, onDelete, style }) {
  const [expanded, setExpanded] = useState(false)
  const [copyMenu, setCopyMenu] = useState(false)
  const formatted = (FORMATTERS[style] || formatAPA)(ref, 1)

  const typeLabel = REF_TYPES.find(t => t.id === ref.type)?.icon || '📄'

  const copyText = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Disalin')
    setCopyMenu(false)
  }

  return (
    <div className="bg-card border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-2">
        <div className="text-xl pt-0.5">{typeLabel}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{ref.title || <span className="italic text-muted">Tanpa judul</span>}</div>
          <div className="text-xs text-muted mt-0.5">
            {ref.authors && ref.authors.length > 0
              ? ref.authors.map(a => a.family).join(', ')
              : <span className="italic text-muted">Tanpa penulis</span>}
            {ref.year && ` · ${ref.year}`}
            {ref.journal && ` · ${ref.journal}`}
          </div>
          {ref.tags && ref.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {ref.tags.map(t => (
                <span key={t} className="text-[10px] bg-terracotta/5 text-terracotta px-1.5 py-0.5 rounded">
                  {t}
                </span>
              ))}
            </div>
          )}

          {expanded && (
            <div className="mt-3 space-y-2 text-xs">
              <div className="bg-surface rounded-lg p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                {formatted}
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <button
                    onClick={() => setCopyMenu(!copyMenu)}
                    className="text-xs text-terracotta hover:text-terracotta flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> Salin sitasi
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {copyMenu && (
                    <div className="absolute top-6 left-0 bg-card border border-border rounded-lg shadow-lg z-10 py-1 min-w-[160px]">
                      <button onClick={() => copyText(formatAPA(ref))} className="w-full text-left text-xs px-3 py-1.5 hover:bg-surface">APA 7 (full)</button>
                      <button onClick={() => copyText(inlineCite(ref, 'apa'))} className="w-full text-left text-xs px-3 py-1.5 hover:bg-surface">APA inline</button>
                      <button onClick={() => copyText(formatIEEE(ref, 1))} className="w-full text-left text-xs px-3 py-1.5 hover:bg-surface">IEEE</button>
                      <button onClick={() => copyText(formatVancouver(ref, 1))} className="w-full text-left text-xs px-3 py-1.5 hover:bg-surface">Vancouver</button>
                      <button onClick={() => copyText(formatHarvard(ref))} className="w-full text-left text-xs px-3 py-1.5 hover:bg-surface">Harvard</button>
                    </div>
                  )}
                </div>
                {ref.doi && (
                  <a
                    href={`https://doi.org/${ref.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> DOI
                  </a>
                )}
                {ref.url && !ref.doi && (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> URL
                  </a>
                )}
              </div>
              {ref.note && <div className="text-xs text-muted italic">{ref.note}</div>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted hover:text-fg/80 p-1"
            title={expanded ? 'Tutup' : 'Lihat'}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <button onClick={onEdit} className="text-muted hover:text-terracotta p-1" title="Edit">
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

// ============================================================
// Editor modal
// ============================================================
function RefEditor({ initial, onSave, onCancel }) {
  const [ref, setRef] = useState(initial)
  const [doiInput, setDoiInput] = useState('')
  const [doiLoading, setDoiLoading] = useState(false)

  const update = (patch) => setRef(r => ({ ...r, ...patch }))

  const handleDoiLookup = async () => {
    if (!doiInput.trim()) return
    setDoiLoading(true)
    try {
      const fetched = await lookupDOI(doiInput.trim())
      if (fetched) {
        // Preserve id, tags, note from current ref
        setRef({ ...fetched, id: ref.id, tags: ref.tags, note: ref.note })
        toast.success('Metadata terambil dari CrossRef')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDoiLoading(false)
    }
  }

  const addAuthor = () => update({ authors: [...(ref.authors || []), { family: '', given: '' }] })
  const updateAuthor = (i, field, val) => {
    const authors = [...ref.authors]
    authors[i] = { ...authors[i], [field]: val }
    update({ authors })
  }
  const removeAuthor = (i) => update({ authors: ref.authors.filter((_, j) => j !== i) })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl max-w-2xl w-full my-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-3 flex items-center justify-between rounded-t-2xl">
          <h3 className="font-semibold">{initial.title ? 'Edit Referensi' : 'Tambah Referensi'}</h3>
          <button onClick={onCancel} aria-label="Tutup" className="text-muted hover:text-fg/80">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {/* DOI lookup */}
          <div className="bg-terracotta/5 border border-terracotta/20 rounded-lg p-3">
            <label className="block text-xs font-semibold text-fg mb-1">
              ⚡ Lookup otomatis dari DOI (CrossRef)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={doiInput}
                onChange={e => setDoiInput(e.target.value)}
                placeholder="10.1037/0022-3514.51.6.1173"
                className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm"
              />
              <button
                onClick={handleDoiLookup}
                disabled={doiLoading || !doiInput.trim()}
                className="btn-primary text-xs py-1.5 disabled:opacity-50"
              >
                {doiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {doiLoading ? 'Memuat...' : 'Lookup'}
              </button>
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-fg/80 mb-1">Tipe</label>
            <select
              value={ref.type}
              onChange={e => update({ type: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm"
            >
              {REF_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-fg/80 mb-1">Judul *</label>
            <input
              type="text"
              value={ref.title}
              onChange={e => update({ title: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Authors */}
          <div>
            <label className="block text-xs font-medium text-fg/80 mb-1">Penulis</label>
            <div className="space-y-1">
              {(ref.authors || []).map((a, i) => (
                <div key={i} className="flex gap-1">
                  <input
                    type="text"
                    value={a.family}
                    onChange={e => updateAuthor(i, 'family', e.target.value)}
                    placeholder="Nama belakang"
                    className="flex-1 border border-border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={a.given}
                    onChange={e => updateAuthor(i, 'given', e.target.value)}
                    placeholder="Nama depan"
                    className="flex-1 border border-border rounded-lg px-2 py-1.5 text-xs"
                  />
                  <button onClick={() => removeAuthor(i)} className="text-red-500 hover:text-red-700 px-2">×</button>
                </div>
              ))}
              <button onClick={addAuthor} className="text-xs text-terracotta hover:text-terracotta">
                + Tambah penulis
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-fg/80 mb-1">Tahun</label>
              <input
                type="number"
                value={ref.year || ''}
                onChange={e => update({ year: e.target.value ? Number(e.target.value) : null })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg/80 mb-1">DOI</label>
              <input
                type="text"
                value={ref.doi}
                onChange={e => update({ doi: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Type-specific fields */}
          {ref.type === 'article' && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-fg/80 mb-1">Jurnal</label>
                  <input type="text" value={ref.journal} onChange={e => update({ journal: e.target.value })} className="w-full border border-border rounded-lg px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg/80 mb-1">Vol</label>
                  <input type="text" value={ref.volume} onChange={e => update({ volume: e.target.value })} className="w-full border border-border rounded-lg px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg/80 mb-1">Issue</label>
                  <input type="text" value={ref.issue} onChange={e => update({ issue: e.target.value })} className="w-full border border-border rounded-lg px-2 py-1.5 text-xs" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-fg/80 mb-1">Halaman (mis. 120-135)</label>
                <input type="text" value={ref.pages} onChange={e => update({ pages: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
            </>
          )}

          {(ref.type === 'book' || ref.type === 'chapter' || ref.type === 'conference' || ref.type === 'report') && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-fg/80 mb-1">Penerbit</label>
                <input type="text" value={ref.publisher} onChange={e => update({ publisher: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg/80 mb-1">Kota</label>
                <input type="text" value={ref.city} onChange={e => update({ city: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          )}

          {ref.type === 'thesis' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-fg/80 mb-1">Jenis</label>
                <select value={ref.thesisType} onChange={e => update({ thesisType: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                  <option value="">Pilih...</option>
                  <option value="Skripsi">Skripsi (S1)</option>
                  <option value="Tesis">Tesis (S2)</option>
                  <option value="Disertasi">Disertasi (S3)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-fg/80 mb-1">Institusi</label>
                <input type="text" value={ref.institution} onChange={e => update({ institution: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          )}

          {ref.type === 'website' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-fg/80 mb-1">URL</label>
                <input type="text" value={ref.url} onChange={e => update({ url: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg/80 mb-1">Diakses (YYYY-MM-DD)</label>
                <input type="text" value={ref.accessedAt} onChange={e => update({ accessedAt: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-fg/80 mb-1">Tag (pisah dengan koma)</label>
            <input
              type="text"
              value={(ref.tags || []).join(', ')}
              onChange={e => update({ tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="motivasi belajar, kuantitatif, pendidikan dasar"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-fg/80 mb-1">Catatan</label>
            <textarea
              value={ref.note}
              onChange={e => update({ note: e.target.value })}
              rows={2}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-5 py-3 flex justify-end gap-2 rounded-b-2xl">
          <button onClick={onCancel} className="btn-ghost text-sm">Batal</button>
          <button onClick={() => onSave(ref)} className="btn-primary text-sm">
            <Save className="w-4 h-4" /> Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Import modal (BibTeX / RIS)
// ============================================================
function ImportModal({ onImport, onCancel }) {
  const [text, setText] = useState('')
  const [format, setFormat] = useState('bibtex')
  const fileRef = useRef(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const r = new FileReader()
    r.onload = (ev) => {
      setText(String(ev.target.result || ''))
      // Auto-detect format
      const t = String(ev.target.result || '')
      if (t.match(/^TY\s*-/m)) setFormat('ris')
      else if (t.match(/^@\w+\s*\{/m)) setFormat('bibtex')
    }
    r.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold">Import Referensi</h3>
          <button onClick={onCancel} aria-label="Tutup" className="text-muted hover:text-fg/80">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Format:</span>
            <button
              onClick={() => setFormat('bibtex')}
              className={`text-xs px-3 py-1.5 rounded-lg border ${format === 'bibtex' ? 'bg-terracotta text-white border-terracotta' : 'border-border'}`}
            >BibTeX (.bib)</button>
            <button
              onClick={() => setFormat('ris')}
              className={`text-xs px-3 py-1.5 rounded-lg border ${format === 'ris' ? 'bg-terracotta text-white border-terracotta' : 'border-border'}`}
            >RIS</button>
            <button onClick={() => fileRef.current?.click()} className="text-xs ml-auto text-terracotta hover:text-terracotta flex items-center gap-1">
              <Upload className="w-3.5 h-3.5" /> Upload file
            </button>
            <input ref={fileRef} type="file" accept=".bib,.ris,.txt" onChange={handleFile} className="hidden" />
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={12}
            placeholder={format === 'bibtex'
              ? '@article{key,\n  author = {Smith, John},\n  title = {...},\n  year = {2020}\n}'
              : 'TY  - JOUR\nAU  - Smith, John\nTI  - ...\nPY  - 2020\nER  - '}
            className="w-full font-mono text-xs border border-border rounded-lg p-2"
          />
          <p className="text-[11px] text-muted">
            Tip: ekspor dari Mendeley / Zotero / EndNote sebagai BibTeX atau RIS, lalu paste di sini.
          </p>
        </div>
        <div className="border-t border-border px-5 py-3 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost text-sm">Batal</button>
          <button
            onClick={() => onImport(text, format)}
            disabled={!text.trim()}
            className="btn-primary text-sm disabled:opacity-50"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Bibliography modal
// ============================================================
function BibliographyModal({ refs, style, onStyleChange, onCancel }) {
  const text = useMemo(() => buildBibliography(refs, style), [refs, style])

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    toast.success('Disalin ke clipboard')
  }

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `daftar_pustaka_${style}.txt`
    a.click()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold">Daftar Pustaka ({refs.length} referensi)</h3>
          <button onClick={onCancel} aria-label="Tutup" className="text-muted hover:text-fg/80">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Style:</span>
            {STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => onStyleChange(s.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border ${style === s.id ? 'bg-terracotta text-white border-terracotta' : 'border-border hover:border-terracotta/30'}`}
              >
                {s.label}
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={handleCopy} className="btn-secondary text-xs py-1.5">
              <Copy className="w-3.5 h-3.5" /> Salin
            </button>
            <button onClick={handleDownload} className="btn-secondary text-xs py-1.5">
              <Download className="w-3.5 h-3.5" /> Unduh
            </button>
          </div>
          <div className="bg-surface rounded-lg p-4 max-h-[60vh] overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed">{text}</pre>
          </div>
          <p className="text-[11px] text-muted">
            Karakter `*teks*` adalah penanda italik. Saat tempel ke Word, tinggal cari-ganti `*` jadi format italik.
          </p>
        </div>
      </div>
    </div>
  )
}

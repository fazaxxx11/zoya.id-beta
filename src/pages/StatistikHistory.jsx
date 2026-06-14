import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Trash2, Eye, FileText, Calendar, X, GitCompare } from 'lucide-react'
import { listAnalyses, getAnalysis, deleteAnalysis, updateAnalysis } from '../lib/savedAnalyses'
import { toast } from '../lib/toast'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'

export default function StatistikHistory() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTool, setFilterTool] = useState('all')
  const [authChecked, setAuthChecked] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(new Set())

  const detailId = params.get('id')

  useEffect(() => {
    let cancelled = false
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!cancelled) {
        setAuthed(!!user)
        setAuthChecked(true)
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  const load = async () => {
    setLoading(true)
    const out = await listAnalyses({ search, limit: 200 })
    setLoading(false)
    if (out.ok) setItems(out.items)
    else toast.error(out.error || 'Gagal memuat riwayat')
  }

  useEffect(() => {
    if (authed) load()
  }, [authed])

  // Reload when search changes (debounced)
  useEffect(() => {
    if (!authed) return
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [search])

  const filtered = useMemo(() => {
    if (filterTool === 'all') return items
    return items.filter(it => it.tool === filterTool)
  }, [items, filterTool])

  const tools = useMemo(() => {
    const set = new Map()
    items.forEach(it => set.set(it.tool, it.tool_name))
    return Array.from(set.entries())
  }, [items])

  const handleDelete = async (id, title) => {
    if (!confirm(`Hapus "${title}"? Tindakan ini tidak dapat dibatalkan.`)) return
    const out = await deleteAnalysis(id)
    if (out.ok) {
      toast.success('Analisis dihapus')
      setItems(prev => prev.filter(it => it.id !== id))
      if (detailId === id) setParams({})
    } else {
      toast.error('Gagal menghapus: ' + out.error)
    }
  }

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm">Memuat…</div>
  }
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Login dulu</h2>
          <p className="text-sm text-muted mb-5">Riwayat analisis tersimpan per akun. Silakan login untuk akses fitur ini.</p>
          <button onClick={() => navigate('/login?next=/statistik/history')}
            className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg">
            Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface pb-bottomnav">
      <PageHeader
        title="Riwayat Analisis"
        subtitle="Modul Statistik"
        parentPath="/statistik"
        parentLabel="Statistik"
        breadcrumbs={[
          { path: '/statistik', label: 'Statistik' },
          { label: 'Riwayat' },
        ]}
        actions={items.length >= 2 ? (
          <button onClick={() => { setSelectMode(s => !s); setSelected(new Set()) }}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
              selectMode
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-card text-gray-700 dark:text-gray-300 border-border hover:bg-surface'
            }`}>
            <GitCompare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{selectMode ? 'Batal' : 'Bandingkan'}</span>
          </button>
        ) : null}
      />
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
        <p className="text-sm text-muted mb-5">{items.length} analisis tersimpan di akun Anda.</p>

        {/* Compare action bar (sticky when in select mode) */}
        {selectMode && (
          <div className="bg-gray-900 text-white rounded-xl p-3 mb-5 flex items-center justify-between gap-3 sticky top-2 z-10 shadow-lg">
            <div className="text-sm">
              {selected.size === 0 && 'Pilih 2 analisis untuk dibandingkan'}
              {selected.size === 1 && 'Pilih 1 lagi untuk membandingkan'}
              {selected.size === 2 && 'Siap dibandingkan'}
              {selected.size > 2 && `${selected.size} dipilih — maksimal 2`}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">{selected.size} / 2</span>
              <button
                disabled={selected.size !== 2}
                onClick={() => navigate(`/statistik/compare?ids=${Array.from(selected).join(',')}`)}
                className="text-xs font-medium px-4 py-2 rounded-lg bg-card text-gray-900 dark:text-gray-100 hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed">
                Bandingkan →
              </button>
            </div>
          </div>
        )}

        {/* Search & filter */}
        <div className="bg-card border border-border/80 rounded-xl p-3 mb-5 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 bg-surface rounded-lg">
            <Search className="w-4 h-4 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari berdasarkan judul…"
              className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted" />
          </div>
          {tools.length > 1 && (
            <select value={filterTool} onChange={e => setFilterTool(e.target.value)}
              className="px-3 py-2 bg-surface rounded-lg text-sm text-gray-700 dark:text-gray-300 border-0 outline-none">
              <option value="all">Semua tool</option>
              {tools.map(([k, name]) => (
                <option key={k} value={k}>{name}</option>
              ))}
            </select>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-card border border-border/80 rounded-xl p-12 text-center text-sm text-muted">
            Memuat riwayat…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border/80 rounded-xl p-12 text-center">
            <FileText className="w-10 h-10 text-muted mx-auto mb-3" />
            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-1">
              {items.length === 0 ? 'Belum ada riwayat' : 'Tidak ada hasil'}
            </h3>
            <p className="text-sm text-muted mb-5">
              {items.length === 0
                ? 'Setelah menjalankan analisis, klik tombol Simpan untuk menyimpan ke akun Anda.'
                : 'Coba ubah kata kunci atau filter tool.'}
            </p>
            {items.length === 0 && (
              <button onClick={() => navigate('/statistik')}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg">
                Mulai Analisis
              </button>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border/80 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left">
                <tr className="text-[11px] uppercase tracking-wider text-muted">
                  {selectMode && <th className="px-3 py-3 w-10"></th>}
                  <th className="px-4 py-3 font-medium">Judul</th>
                  <th className="px-4 py-3 font-medium">Tool</th>
                  <th className="px-4 py-3 font-medium text-center">n</th>
                  <th className="px-4 py-3 font-medium">Dibuat</th>
                  {!selectMode && <th className="px-4 py-3 font-medium text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(it => {
                  const isSelected = selected.has(it.id)
                  const toggleSelect = () => {
                    setSelected(prev => {
                      const next = new Set(prev)
                      if (next.has(it.id)) next.delete(it.id)
                      else if (next.size < 2) next.add(it.id)
                      else { toast.error('Maksimal 2 analisis'); return prev }
                      return next
                    })
                  }
                  return (
                  <tr key={it.id}
                      onClick={selectMode ? toggleSelect : undefined}
                      className={`${selectMode ? 'cursor-pointer' : ''} ${isSelected ? 'bg-gray-900/5' : 'hover:bg-surface/60'}`}>
                    {selectMode && (
                      <td className="px-3 py-3 w-10">
                        <input type="checkbox" checked={isSelected} onChange={toggleSelect}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 accent-gray-900 cursor-pointer" />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{it.title}</div>
                      {it.notes && <div className="text-xs text-muted mt-0.5 truncate max-w-md">{it.notes}</div>}
                      {it.ai_interpretation && (
                        <div className="text-[10px] uppercase tracking-wider text-emerald-600 mt-1">+ Interpretasi AI</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{it.tool_name}</td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{it.sample_size ?? '—'}</td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-muted" />
                        {new Date(it.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </td>
                    {!selectMode && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => setParams({ id: it.id })}
                          className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 px-2 py-1 rounded">
                          <Eye className="w-3.5 h-3.5" /> Lihat
                        </button>
                        <button onClick={() => handleDelete(it.id, it.title)}
                          className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded ml-1">
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </td>
                    )}
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {detailId && (
        <DetailDrawer
          id={detailId}
          onClose={() => setParams({})}
          onUpdated={(patch) => {
            setItems(prev => prev.map(it => it.id === detailId ? { ...it, ...patch } : it))
          }}
        />
      )}
    </div>
  )
}

// ============================================================
// Detail Drawer — modal for viewing full saved analysis
// ============================================================
function DetailDrawer({ id, onClose, onUpdated }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const out = await getAnalysis(id)
      if (cancelled) return
      setLoading(false)
      if (out.ok) {
        setData(out.analysis)
        setTitleDraft(out.analysis.title)
      } else {
        toast.error(out.error || 'Gagal memuat')
        onClose()
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  const handleSaveTitle = async () => {
    if (!titleDraft.trim() || titleDraft === data.title) {
      setEditingTitle(false)
      return
    }
    const out = await updateAnalysis(id, { title: titleDraft })
    if (out.ok) {
      setData(out.analysis)
      onUpdated?.({ title: out.analysis.title })
      toast.success('Judul diperbarui')
    } else {
      toast.error('Gagal: ' + out.error)
    }
    setEditingTitle(false)
  }

  return (
    <Modal open={true} onClose={onClose}
      panelClassName="bg-card rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-1">
              {data?.tool_name || '…'}
            </div>
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="flex-1 text-lg font-bold text-gray-900 dark:text-gray-100 bg-surface border border-border rounded px-2 py-1 outline-none focus:border-gray-400" />
                <button onClick={handleSaveTitle} className="text-xs text-emerald-600 hover:text-emerald-700">Simpan</button>
                <button onClick={() => { setEditingTitle(false); setTitleDraft(data.title) }} className="text-xs text-muted hover:text-gray-600 dark:text-gray-400">Batal</button>
              </div>
            ) : (
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-gray-600 dark:text-gray-400" onClick={() => setEditingTitle(true)}
                title="Klik untuk edit">
                {data?.title || 'Memuat…'}
              </h2>
            )}
            {data && (
              <div className="text-xs text-muted mt-1">
                {data.sample_size ?? '—'} sampel · {new Date(data.created_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-muted hover:text-gray-700 dark:text-gray-300 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading || !data ? (
            <div className="text-sm text-muted text-center py-12">Memuat detail…</div>
          ) : (
            <div className="space-y-5">
              {data.notes && (
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-2">Catatan</div>
                  <div className="bg-surface border border-border/80 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {data.notes}
                  </div>
                </div>
              )}

              {data.result?.interpretation && (
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-2">Interpretasi</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{data.result.interpretation}</div>
                </div>
              )}

              {data.ai_interpretation && (
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-2">Interpretasi AI</div>
                  <div className="bg-surface border border-border/80 rounded-lg p-4 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {data.ai_interpretation}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-2">Data Hasil (JSON)</div>
                <pre className="bg-gray-900 text-gray-100 text-[11px] rounded-lg p-4 overflow-auto max-h-80">
{JSON.stringify(data.result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 rounded-lg">
            Tutup
          </button>
        </div>
    </Modal>
  )
}

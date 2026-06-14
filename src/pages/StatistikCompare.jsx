import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, X, Calendar, AlertCircle } from 'lucide-react'
import { getAnalysis } from '../lib/savedAnalyses'
import { extractCompareMetrics } from '../lib/compareMetrics'
import { toast } from '../lib/toast'

export default function StatistikCompare() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const idsParam = params.get('ids') || ''
  const ids = useMemo(() => idsParam.split(',').filter(Boolean).slice(0, 2), [idsParam])

  const [items, setItems] = useState([null, null])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const fetched = await Promise.all(ids.map(id => getAnalysis(id)))
      if (cancelled) return
      const data = fetched.map(out => out.ok ? out.analysis : null)
      setItems(data)
      setLoading(false)
      const failed = fetched.filter(out => !out.ok)
      if (failed.length) toast.error(`Gagal memuat ${failed.length} analisis`)
    }
    if (ids.length === 2) load()
    else setLoading(false)
    return () => { cancelled = true }
  }, [idsParam])

  // Build unified rows: union of section + label across both analyses
  const rows = useMemo(() => {
    if (!items[0] && !items[1]) return []
    const a = items[0] ? extractCompareMetrics(items[0].result) : []
    const b = items[1] ? extractCompareMetrics(items[1].result) : []

    // Index sections by name
    const allSections = new Set([...a.map(s => s.section), ...b.map(s => s.section)])
    const result = []
    for (const sectionName of allSections) {
      const aSec = a.find(s => s.section === sectionName)
      const bSec = b.find(s => s.section === sectionName)
      const labels = new Set([
        ...(aSec?.items || []).map(i => i.label),
        ...(bSec?.items || []).map(i => i.label),
      ])
      const items = []
      for (const label of labels) {
        const aItem = aSec?.items.find(i => i.label === label)
        const bItem = bSec?.items.find(i => i.label === label)
        items.push({ label, a: aItem, b: bItem })
      }
      result.push({ section: sectionName, items })
    }
    return result
  }, [items])

  if (ids.length !== 2) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Pilih 2 analisis</h2>
          <p className="text-sm text-muted mb-5">Untuk membandingkan, pilih tepat 2 analisis dari halaman Riwayat.</p>
          <button onClick={() => navigate('/statistik/history')}
            className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg">
            Buka Riwayat
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted">Memuat perbandingan…</div>
  }

  const [a, b] = items
  const sameTool = a && b && a.tool === b.tool

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate('/statistik/history')}
            className="text-xs text-muted hover:text-gray-900 dark:text-gray-100 flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> Kembali ke Riwayat
          </button>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-1">Modul Statistik</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bandingkan Analisis</h1>
          {!sameTool && a && b && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Anda membandingkan dua tool berbeda (<strong>{a.tool_name}</strong> vs <strong>{b.tool_name}</strong>).
                Beberapa metrik mungkin hanya tersedia di salah satu sisi.
              </span>
            </div>
          )}
        </div>

        {/* Two header cards */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {[a, b].map((it, idx) => (
            <div key={idx} className="bg-card border border-border/80 rounded-xl p-4">
              {it ? (
                <>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-1">
                    {it.tool_name}
                  </div>
                  <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-1.5 truncate" title={it.title}>{it.title}</h2>
                  <div className="text-xs text-muted flex items-center gap-3 flex-wrap">
                    {it.sample_size && <span>n = {it.sample_size}</span>}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(it.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-red-600">Gagal memuat</div>
              )}
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="bg-card border border-border/80 rounded-xl overflow-hidden">
          {rows.map((sec, sIdx) => (
            <div key={sIdx} className={sIdx > 0 ? 'border-t border-border' : ''}>
              <div className="px-4 py-2.5 bg-surface text-[11px] uppercase tracking-[0.18em] text-muted font-medium">
                {sec.section}
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {sec.items.map((row, rIdx) => {
                    const aDiff = row.a && row.b && row.a.value !== row.b.value
                    return (
                      <tr key={rIdx} className="border-t border-border first:border-t-0">
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 w-1/3">{row.label}</td>
                        <td className={`px-4 py-2.5 font-mono text-[13px] ${aDiff ? 'bg-amber-50/40' : ''}`}>
                          <CellValue item={row.a} />
                        </td>
                        <td className={`px-4 py-2.5 font-mono text-[13px] border-l border-border ${aDiff ? 'bg-amber-50/40' : ''}`}>
                          <CellValue item={row.b} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="mt-4 text-xs text-muted flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-50/70 border border-amber-200/60" />
          Highlight kuning = ada perbedaan nilai di kedua sisi
        </div>

        {/* Notes side-by-side if any */}
        {(a?.notes || b?.notes) && (
          <div className="mt-5 grid grid-cols-2 gap-4">
            {[a, b].map((it, idx) => (
              <div key={idx} className="bg-card border border-border/80 rounded-xl p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium mb-2">Catatan</div>
                {it?.notes ? (
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{it.notes}</div>
                ) : (
                  <div className="text-sm text-muted italic">Tidak ada catatan</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CellValue({ item }) {
  if (!item) return <span className="text-muted">—</span>
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={item.sig ? 'text-emerald-700 font-semibold' : 'text-gray-900 dark:text-gray-100'}>
        {item.value}
      </span>
      {item.hint && <span className="text-[10px] text-muted uppercase tracking-wider">{item.hint}</span>}
    </div>
  )
}

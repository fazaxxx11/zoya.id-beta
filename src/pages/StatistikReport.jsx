// StatistikReport — auto-generated draft Bab IV (Hasil dan Pembahasan)
// dari saved analyses. User pilih analisis-analisis yang relevan, lalu sistem
// menyusun paragraf, tabel, dan struktur sub-bab siap-paste ke skripsi.
//
// Output: preview HTML + tombol copy/download (text dan HTML).
// Ditujukan sebagai *draft awal* — user tetap perlu polish substantif.

import { useState, useEffect, useMemo, useRef } from 'react'
import { Copy, Download, CheckSquare, Square, RefreshCw, AlertCircle, FileText, Printer } from 'lucide-react'
import { listAnalyses, getAnalysis } from '../lib/savedAnalyses'
import { buildReport, reportToText, reportToHTML } from '../lib/reportBuilder'
import { toast } from '../lib/toast'
import PageHeader from '../components/PageHeader'
import ResultSummary from '../components/design/ResultSummary'
import DetailsBlock from '../components/design/DetailsBlock'

export default function StatistikReport() {
  const [items, setItems] = useState([])     // list saved analyses (metadata only)
  const [selected, setSelected] = useState(new Set())
  const [fullData, setFullData] = useState({}) // { [id]: full result }
  const [loading, setLoading] = useState(true)
  const [loadingFull, setLoadingFull] = useState(false)
  const [error, setError] = useState(null)
  const previewRef = useRef(null)

  // -----------------------------------------------------------
  // Load saved analyses metadata
  // -----------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const out = await listAnalyses({ limit: 200 })
      if (cancelled) return
      if (!out.ok) {
        setError(out.error)
      } else {
        setItems(out.items || [])
        // auto-select all by default
        setSelected(new Set((out.items || []).map(it => it.id)))
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  // -----------------------------------------------------------
  // Load full result for selected items (lazy & cached)
  // -----------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const missing = [...selected].filter(id => !fullData[id])
      if (missing.length === 0) return
      setLoadingFull(true)
      const fetched = {}
      for (const id of missing) {
        if (cancelled) return
        const out = await getAnalysis(id)
        if (out.ok) fetched[id] = out.analysis
      }
      if (!cancelled) {
        setFullData(prev => ({ ...prev, ...fetched }))
        setLoadingFull(false)
      }
    })()
    return () => { cancelled = true }
  }, [selected, fullData])

  // -----------------------------------------------------------
  // Build report from selected analyses
  // -----------------------------------------------------------
  const report = useMemo(() => {
    const analyses = [...selected]
      .map(id => fullData[id])
      .filter(Boolean)
    if (analyses.length === 0) return null
    return buildReport(analyses)
  }, [selected, fullData])

  // -----------------------------------------------------------
  // Actions
  // -----------------------------------------------------------
  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set())
    else setSelected(new Set(items.map(it => it.id)))
  }
  const toggleOne = (id) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const copyText = async () => {
    if (!report) return
    try {
      await navigator.clipboard.writeText(reportToText(report))
      toast.success('Draft Bab IV disalin (text)')
    } catch { toast.error('Gagal menyalin') }
  }
  const copyHTML = async () => {
    if (!report) return
    try {
      // For Word: prefer copy as HTML so tabel ke-paste sebagai tabel
      const html = reportToHTML(report)
      const blob = new Blob([html], { type: 'text/html' })
      const text = new Blob([reportToText(report)], { type: 'text/plain' })
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': blob, 'text/plain': text }),
      ])
      toast.success('Draft Bab IV disalin (formatted, paste ke Word)')
    } catch (e) {
      // fallback ke text
      copyText()
    }
  }
  const downloadHTML = () => {
    if (!report) return
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${report.title}</title>
<style>body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.6;max-width:800px;margin:40px auto;padding:0 20px;color:#222}h1{font-size:16pt;text-align:center;margin-bottom:18pt}h2{font-size:13pt;margin-top:18pt}p{text-align:justify;text-indent:1.27cm;margin:8pt 0}table{margin:8pt 0;font-size:11pt}</style>
</head><body>${reportToHTML(report)}</body></html>`
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Bab_IV_Hasil_Pembahasan_${Date.now()}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('File HTML di-download. Buka dengan Word untuk konversi otomatis.')
  }
  const downloadText = () => {
    if (!report) return
    const blob = new Blob([reportToText(report)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Bab_IV_Hasil_Pembahasan_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#fafafa] pb-bottomnav">
      <PageHeader
        title="Generator Laporan Bab IV"
        subtitle="Bab IV Auto-Draft"
        parentPath="/statistik"
        parentLabel="Statistik"
        breadcrumbs={[
          { path: '/statistik', label: 'Statistik' },
          { label: 'Bab IV Generator' },
        ]}
      />

      <main className="max-w-6xl mx-auto px-5 py-6 grid lg:grid-cols-[320px_1fr] gap-5 print:block print:max-w-none print:p-0">
        {/* Sidebar: pilih analyses — hidden saat print */}
        <aside className="bg-white rounded-2xl border border-gray-100 p-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto print:hidden">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-medium">Pilih Analisis</div>
              <div className="text-xs text-gray-500 mt-0.5">{selected.size} dari {items.length} dipilih</div>
            </div>
            <button onClick={toggleAll}
                    className="text-[11px] text-gray-600 hover:text-gray-900 font-medium px-2 py-1 rounded">
              {selected.size === items.length ? 'Hapus semua' : 'Pilih semua'}
            </button>
          </div>

          {loading ? (
            <div className="text-xs text-gray-400 py-8 text-center">Memuat…</div>
          ) : error ? (
            <div className="bg-surface border border-border rounded-lg p-3 text-xs text-muted flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{error === 'Belum login' ? 'Login dulu untuk mengakses analisis tersimpan.' : error}</div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-xs text-gray-500 leading-relaxed py-4">
              Belum ada analisis tersimpan. Jalankan analisis di halaman Statistik, klik <strong>Simpan</strong>, baru kembali ke sini untuk auto-generate Bab IV.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {items.map(it => (
                <li key={it.id}>
                  <button onClick={() => toggleOne(it.id)}
                          className="w-full text-left flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 group">
                    {selected.has(it.id)
                      ? <CheckSquare className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      : <Square className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium text-gray-800 truncate">{it.title || it.tool_name}</div>
                      <div className="text-[10.5px] text-gray-400 mt-0.5">
                        {it.tool_name} · {new Date(it.created_at).toLocaleDateString('id-ID')}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Main: preview + actions */}
        <section className="space-y-4">
          {/* Action toolbar — hidden saat print */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3 flex-wrap print:hidden">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-medium">Preview Draft</div>
              <div className="text-sm text-gray-600 mt-0.5">
                {report ? `${report.sections.length} sub-bab dari ${selected.size} analisis` : 'Pilih analisis di kiri untuk mulai'}
                {loadingFull && <span className="ml-2 text-amber-600 inline-flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" />memuat…</span>}
              </div>
            </div>
            {report && (
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => window.print()}
                        className="text-xs text-gray-700 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg flex items-center gap-1.5"
                        title="Cetak atau simpan sebagai PDF (browser dialog)">
                  <Printer className="w-3.5 h-3.5" />
                  Cetak / PDF
                </button>
                <button onClick={copyHTML}
                        className="text-xs text-gray-700 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5" />
                  Salin (untuk Word)
                </button>
                <button onClick={downloadHTML}
                        className="text-xs bg-gray-900 hover:bg-black text-white px-3 py-2 rounded-lg flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  Download HTML
                </button>
                <button onClick={downloadText}
                        className="text-xs text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg">
                  .txt
                </button>
              </div>
            )}
          </div>

          {/* Preview body */}
          {!report ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <div className="text-sm text-gray-500">Pilih analisis di sidebar untuk men-generate draft</div>
            </div>
          ) : (
            <>
              {/* Summary: what's in this report */}
              <ResultSummary
                status="info"
                conclusion={`Draft Bab IV — ${report.sections.length} sub-bab`}
                metric={`${selected.size} analisis dipilih`}
                meaning="Draft ini disusun otomatis dari analisis yang Anda pilih. Review setiap sub-bab, sesuaikan dengan konteks penelitian Anda, lalu polish sebelum digunakan."
              />

              {/* Report preview with progressive disclosure for long content */}
              <div ref={previewRef} className="bg-white rounded-2xl border border-gray-100 p-8 lg:p-10 prose prose-sm max-w-none report-page">
                <h1 className="text-center text-lg font-bold mb-6">{report.title}</h1>
                <p className="text-justify indent-8 text-gray-800 leading-relaxed">{report.intro}</p>
                {report.sections.map((sec, i) => (
                  <ReportSection key={i} section={sec} />
                ))}
              </div>
            </>
          )}

          {/* Footer guidance — hidden saat print */}
          <div className="bg-surface border border-border rounded-xl p-4 text-[12.5px] text-muted leading-relaxed print:hidden">
            <strong className="font-semibold">Catatan penting:</strong> Draft ini adalah <em>template otomatis</em> — wajib dipoles ulang dengan konteks substantif penelitian Anda (kerangka teori, hipotesis spesifik, perbandingan dengan literatur). Untuk dokumentasi formal, ekspor R script dari setiap hasil analisis dan jalankan di RStudio sebagai bukti reproducibility.
          </div>
        </section>
      </main>
    </div>
  )
}

// ============================================================
// Renderer satu section
// ============================================================
function ReportSection({ section }) {
  return (
    <div className="mt-6">
      <h2 className="text-base font-bold mt-6 mb-2 text-gray-900">{section.title}</h2>
      {section.paragraphs.map((p, i) => (
        <p key={i} className="text-justify indent-8 text-gray-800 leading-relaxed mb-3">{p}</p>
      ))}
      {section.tables.map((t, i) => (
        <div key={i} className="my-4">
          <div className="text-sm font-semibold text-gray-800 mb-1.5">{t.caption}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  {t.headers.map((h, j) => (
                    <th key={j} className="border border-gray-300 bg-gray-50 px-2 py-1.5 text-left font-semibold text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((c, ci) => (
                      <td key={ci} className="border border-gray-200 px-2 py-1.5 text-gray-800 tabular-nums">{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

// StatistikReport — auto-generated draft Bab IV (Hasil dan Pembahasan)
// dari saved analyses. User pilih analisis-analisis yang relevan, lalu sistem
// menyusun paragraf, tabel, dan struktur sub-bab siap-paste ke skripsi.
//
// Output: preview HTML + tombol copy/download (text dan HTML).
// Ditujukan sebagai *draft awal* — user tetap perlu polish substantif.

import { useState, useEffect, useMemo, useRef } from 'react'
import { Copy, Download, CheckSquare, Square, RefreshCw, AlertCircle, FileText, Printer, BookOpen, Loader2 } from 'lucide-react'
import { listAnalyses, getAnalysis } from '../lib/savedAnalyses'
import { buildReport, buildAIReport, reportToText, reportToHTML } from '../lib/reportBuilder'
import { reportToDocx, downloadDocx } from '../lib/docxExporter'
import { generateAllSections } from '../lib/babIVClient'
import { toast } from '../lib/toast'
import PageHeader from '../components/PageHeader'
import { STATISTIK_SUBNAV } from '../lib/statistikNav'
import ResultSummary from '../components/design/ResultSummary'

export default function StatistikReport() {
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [fullData, setFullData] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadingFull, setLoadingFull] = useState(false)
  const [error, setError] = useState(null)
  const [aiMode, setAiMode] = useState(false)
  const [aiReport, setAiReport] = useState(null)
  const [generatingAI, setGeneratingAI] = useState(false)
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
  // Build report from selected analyses
  const report = useMemo(() => {
    const analyses = [...selected]
      .map(id => fullData[id])
      .filter(Boolean)
    if (analyses.length === 0) return null
    return buildReport(analyses)
  }, [selected, fullData])

  const displayReport = aiMode && aiReport ? aiReport : report

  const generateAI = async () => {
    const analyses = [...selected]
      .map(id => fullData[id])
      .filter(Boolean)
    if (analyses.length === 0) {
      toast.error('Pilih minimal 1 analisis')
      return
    }
    setGeneratingAI(true)

    try {
      const sections = await generateAllSections(analyses, {
        onProgress: ({ section, status }) => {
          if (status === 'generating') {
            // Could show per-section progress, but keep simple for now
          }
          if (status === 'failed') {
            toast.error(`${section}: gagal generate, pakai template`)
          }
        },
      })

      // Build report object from API results
      const reportSections = []
      
      if (sections.descriptive) {
        reportSections.push({
          title: '4.1 Deskripsi Data Penelitian',
          paragraphs: [sections.descriptive],
          tables: [],
        })
      }
      if (sections.assumptions) {
        reportSections.push({
          title: '4.2 Uji Asumsi',
          paragraphs: [sections.assumptions],
          tables: [],
        })
      }
      if (sections.hypothesis) {
        reportSections.push({
          title: '4.3 Pengujian Hipotesis',
          paragraphs: [sections.hypothesis],
          tables: [],
        })
      }
      if (sections.discussion) {
        reportSections.push({
          title: '4.4 Pembahasan Hasil Penelitian',
          paragraphs: [sections.discussion],
          tables: [],
        })
      }
      if (sections.synthesis) {
        if (reportSections.length > 0) {
          reportSections[reportSections.length - 1].paragraphs.push(sections.synthesis)
        }
      }

      // Add tables from deterministic builder for the hypothesis section
      const det = buildReport(analyses)
      const infIdx = reportSections.findIndex(s => s.title === '4.3 Pengujian Hipotesis')
      if (infIdx >= 0 && det) {
        const detInf = det.sections.find(s => s.title.startsWith('4.3'))
        if (detInf?.tables) {
          reportSections[infIdx].tables = detInf.tables
        }
      }

      // Add descriptive tables
      const descIdx = reportSections.findIndex(s => s.title.startsWith('4.1'))
      if (descIdx >= 0 && det) {
        const detDesc = det.sections.find(s => s.title.startsWith('4.1'))
        if (detDesc?.tables) {
          reportSections[descIdx].tables = detDesc.tables
        }
      }

      setAiReport({
        title: 'BAB IV — HASIL DAN PEMBAHASAN',
        intro: `Bab ini menguraikan hasil analisis data yang diperoleh dari ${analyses.length} analisis statistik. Pembahasan disusun mengikuti urutan: deskripsi data, uji asumsi, pengujian hipotesis, dan pembahasan substantif.`,
        sections: reportSections,
      })
      setAiMode(true)
      toast.success('AI report selesai digenerate!')
    } catch (e) {
      console.error('AI generation failed:', e)
      // Fallback ke deterministic
      const fallback = await buildAIReport(analyses)
      setAiReport(fallback)
      setAiMode(true)
      toast.success('Report digenerate (template — AI tidak tersedia)')
    } finally {
      setGeneratingAI(false)
    }
  }

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
    if (!displayReport) return
    try {
      await navigator.clipboard.writeText(reportToText(displayReport))
      toast.success('Draft Bab IV disalin (text)')
    } catch { toast.error('Gagal menyalin') }
  }
  const copyHTML = async () => {
    if (!displayReport) return
    try {
      const html = reportToHTML(displayReport)
      const blob = new Blob([html], { type: 'text/html' })
      const text = new Blob([reportToText(displayReport)], { type: 'text/plain' })
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': blob, 'text/plain': text }),
      ])
      toast.success('Draft Bab IV disalin (formatted, paste ke Word)')
    } catch (e) {
      copyText()
    }
  }
  const downloadHTML = () => {
    if (!displayReport) return
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${displayReport.title}</title>
<style>body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.6;max-width:800px;margin:40px auto;padding:0 20px;color:#222}h1{font-size:16pt;text-align:center;margin-bottom:18pt}h2{font-size:13pt;margin-top:18pt}p{text-align:justify;text-indent:1.27cm;margin:8pt 0}table{margin:8pt 0;font-size:11pt}</style>
</head><body>${reportToHTML(displayReport)}</body></html>`
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Bab_IV_Hasil_Pembahasan_${Date.now()}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('File HTML di-download')
  }

  const [downloadingDocx, setDownloadingDocx] = useState(false)
  const downloadDOCX = async () => {
    if (!displayReport) return
    setDownloadingDocx(true)
    try {
      const blob = await reportToDocx(displayReport)
      downloadDocx(blob, `Bab_IV_Hasil_Pembahasan_${Date.now()}.docx`)
    } catch (e) {
      console.error('DOCX export gagal:', e)
      toast.error('Ekspor DOCX gagal')
    } finally {
      setDownloadingDocx(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface pb-bottomnav">
      <PageHeader
        title="Generator Laporan Bab IV"
        subtitle="Bab IV Auto-Draft"
        parentPath="/statistik"
        parentLabel="Statistik"
        breadcrumbs={[
          { path: '/statistik', label: 'Statistik' },
          { label: 'Bab IV Generator' },
        ]}
        subNav={STATISTIK_SUBNAV}
      />

      <main className="max-w-6xl mx-auto px-5 py-6 grid lg:grid-cols-[320px_1fr] gap-5 print:block print:max-w-none print:p-0">
        {/* Sidebar: pilih analyses — hidden saat print */}
        <aside className="bg-card rounded-xl border border-border p-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto print:hidden">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted font-medium">Pilih Analisis</div>
              <div className="text-xs text-muted mt-0.5">{selected.size} dari {items.length} dipilih</div>
            </div>
            <button onClick={toggleAll}
                    className="text-[11px] text-muted hover:text-fg font-medium px-2 py-1 rounded">
              {selected.size === items.length ? 'Hapus semua' : 'Pilih semua'}
            </button>
          </div>

          {loading ? (
            <div className="text-xs text-muted py-8 text-center">Memuat…</div>
          ) : error ? (
            <div className="bg-surface border border-border rounded-lg p-3 text-xs text-muted flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{error === 'Belum login' ? 'Login dulu untuk mengakses analisis tersimpan.' : error}</div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-xs text-muted leading-relaxed py-4">
              Belum ada analisis tersimpan. Jalankan analisis di halaman Statistik, klik <strong>Simpan</strong>, baru kembali ke sini untuk auto-generate Bab IV.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {items.map(it => (
                <li key={it.id}>
                  <button onClick={() => toggleOne(it.id)}
                          className="w-full text-left flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-surface group">
                    {selected.has(it.id)
                      ? <CheckSquare className="w-4 h-4 text-teal mt-0.5 shrink-0" />
                      : <Square className="w-4 h-4 text-muted mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium text-fg truncate">{it.title || it.tool_name}</div>
                      <div className="text-[10.5px] text-muted mt-0.5">
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
          <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between gap-3 flex-wrap print:hidden">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted font-medium">
                {aiMode ? 'AI-Generated Draft' : 'Preview Draft'}
              </div>
              <div className="text-sm text-muted mt-0.5">
                {displayReport 
                  ? `${displayReport.sections.length} sub-bab dari ${selected.size} analisis`
                  : 'Pilih analisis di kiri untuk mulai'}
                {loadingFull && <span className="ml-2 text-terracotta inline-flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" />memuat…</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* AI Generate */}
              <button onClick={generateAI}
                      disabled={generatingAI || selected.size === 0}
                      className="text-xs font-heading font-semibold bg-accent text-accent-fg hover:bg-accent/90 disabled:opacity-40 px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all">
                {generatingAI ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <BookOpen className="w-3.5 h-3.5" />
                )}
                {generatingAI ? 'Generating…' : 'Generate AI'}
              </button>

              {aiMode && (
                <button onClick={() => { setAiMode(false); setAiReport(null) }}
                        className="text-xs text-muted hover:text-fg px-3 py-2 rounded-lg">
                  Kembali ke template
                </button>
              )}

              {displayReport && (
                <>
                  <span className="w-px h-5 bg-border" />
                  <button onClick={() => window.print()}
                          className="text-xs text-muted border border-border hover:bg-surface px-3 py-2 rounded-lg flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5" />
                    Cetak
                  </button>
                  <button onClick={copyHTML}
                          className="text-xs text-muted border border-border hover:bg-surface px-3 py-2 rounded-lg flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5" />
                    Salin
                  </button>
                  <button onClick={downloadDOCX}
                          disabled={downloadingDocx}
                          className="text-xs bg-accent text-accent-fg hover:bg-accent/90 px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-60 transition-all">
                    <FileText className="w-3.5 h-3.5" />
                    {downloadingDocx ? '...' : 'Download DOCX'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Preview body */}
          {!displayReport ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <FileText className="w-10 h-10 text-muted/30 mx-auto mb-3" />
              <div className="text-sm text-muted">Pilih analisis di sidebar & klik <strong>Generate AI</strong></div>
            </div>
          ) : (
            <>
              <ResultSummary
                status="info"
                conclusion={`Draft Bab IV — ${displayReport.sections.length} sub-bab`}
                metric={`${selected.size} analisis dipilih${aiMode ? ' · AI-generated' : ''}`}
                meaning="Draft ini disusun otomatis dari analisis yang Anda pilih. Review setiap sub-bab, sesuaikan dengan konteks penelitian Anda, lalu polish sebelum digunakan."
              />

              <div ref={previewRef} className="bg-card rounded-xl border border-border p-8 lg:p-10 prose prose-sm max-w-none report-page">
                <h1 className="text-center text-lg font-bold mb-6">{displayReport.title}</h1>
                <p className="text-justify indent-8 text-fg leading-relaxed">{displayReport.intro}</p>
                {displayReport.sections.map((sec, i) => (
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
      <h2 className="text-base font-bold mt-6 mb-2 text-fg">{section.title}</h2>
      {section.paragraphs.map((p, i) => (
        <p key={i} className="text-justify indent-8 text-fg leading-relaxed mb-3">{p}</p>
      ))}
      {section.tables.map((t, i) => (
        <div key={i} className="my-4">
          <div className="text-sm font-semibold text-fg mb-1.5">{t.caption}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  {t.headers.map((h, j) => (
                    <th key={j} className="border border-border bg-surface px-2 py-1.5 text-left font-semibold text-fg">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((c, ci) => (
                      <td key={ci} className="border border-border px-2 py-1.5 text-fg tabular-nums">{c}</td>
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

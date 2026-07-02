// src/components/statistik/ExportActions.jsx
// Export buttons — 5 aksi export (Excel/PDF/DOCX/R/Laporan AI) digabung jadi
// satu tombol "Export ▾" + dropdown menu, biar toolbar hasil gak numpang 8
// tombol yg wrap berantakan di mobile. Export libs lazy-loaded on demand;
// DOCX wrapper + AI-narrative modal tetap module-level lazy.

import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import { exportToPDF } from '../../lib/export/pdfExport'
import { exportToExcel } from '../../lib/export/excelExport'
import { generateRSyntax } from '../../lib/export/rSyntaxGenerator'
import { toast } from '../../lib/toast'

const ReportPreviewModal = lazy(() => import('./ReportPreviewModal'))

export default function ExportActions({ result, containerRef }) {
  const [open, setOpen] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingDocx, setExportingDocx] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const ref = useRef(null)

  // Tutup menu saat klik di luar atau tekan Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleExcel = () => {
    setOpen(false)
    try {
      exportToExcel(result)
      toast.success('Excel berhasil di-download')
    } catch (e) {
      toast.error('Gagal export Excel: ' + e.message)
    }
  }

  const handleExportPdf = async () => {
    setOpen(false)
    try {
      setExportingPdf(true)
      await exportToPDF(result, containerRef?.current)
      toast.success('PDF berhasil di-download!')
    } catch (err) {
      console.error('[PDF Export]', err)
      toast.error('Gagal export PDF: ' + (err.message || 'Unknown error'))
    } finally {
      setExportingPdf(false)
    }
  }

  const handleExportDocx = async () => {
    setOpen(false)
    try {
      setExportingDocx(true)
      const { exportToDOCX } = await import('../../lib/export/docxExport')
      await exportToDOCX(result)
      toast.success('DOCX berhasil di-download!')
    } catch (err) {
      console.error('[DOCX Export]', err)
      toast.error('Gagal export DOCX: ' + (err.message || 'Unknown error'))
    } finally {
      setExportingDocx(false)
    }
  }

  const handleR = () => {
    setOpen(false)
    try {
      const code = generateRSyntax(result)
      const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${result.tool}_syntax.R`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('R syntax berhasil di-download')
    } catch (e) {
      toast.error('Gagal: ' + e.message)
    }
  }

  const handleReport = () => {
    setOpen(false)
    setShowReportModal(true)
  }

  const items = [
    { label: 'Excel', onClick: handleExcel },
    { label: exportingPdf ? 'Membuat PDF…' : 'PDF', onClick: handleExportPdf, disabled: exportingPdf },
    { label: exportingDocx ? 'Membuat DOCX…' : 'DOCX', onClick: handleExportDocx, disabled: exportingDocx },
    { label: 'R Syntax', onClick: handleR },
    { label: '📝 Laporan AI', onClick: handleReport },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="px-3 sm:px-4 py-2 bg-card border border-border text-fg hover:bg-surface rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition-colors"
      >
        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Export
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-1 z-50 min-w-[180px] bg-card border border-border rounded-lg shadow-lg py-1">
          {items.map((it, i) => (
            <button
              key={i}
              role="menuitem"
              onClick={it.onClick}
              disabled={it.disabled}
              className="w-full text-left px-3 py-2 text-sm text-fg hover:bg-surface flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4 text-muted flex-shrink-0" />
              {it.label}
            </button>
          ))}
        </div>
      )}
      {showReportModal && (
        <Suspense fallback={null}>
          <ReportPreviewModal result={result} onClose={() => setShowReportModal(false)} />
        </Suspense>
      )}
    </div>
  )
}

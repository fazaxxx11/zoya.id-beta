// src/components/statistik/ExportActions.jsx
// Export buttons (Excel + PDF) — lazy-loads export libs

import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { exportToPDF } from '../../lib/export/pdfExport'
import { exportToDOCX } from '../../lib/export/docxExport'
import { exportToExcel } from '../../lib/export/excelExport'
import { generateRSyntax } from '../../lib/export/rSyntaxGenerator'
import { toast } from '../../lib/toast'
import ReportPreviewModal from './ReportPreviewModal'

export default function ExportActions({ result, containerRef }) {
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingDocx, setExportingDocx] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  const handleExcel = () => {
    try {
      exportToExcel(result)
      toast.success('Excel berhasil di-download')
    } catch (e) {
      toast.error('Gagal export Excel: ' + e.message)
    }
  }

  const handleExportPdf = async () => {
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
    try {
      setExportingDocx(true)
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

  const dl = (label, fn, disabled = false) => (
    <button onClick={fn} disabled={disabled}
      className="px-3 sm:px-4 py-2 bg-accent hover:opacity-90 disabled:opacity-50 text-white rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
      <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {label}
    </button>
  )

  return (
    <>
      {dl('Excel', handleExcel)}
      {dl(exportingPdf ? 'Membuat PDF…' : 'PDF', handleExportPdf, exportingPdf)}
      {dl(exportingDocx ? 'Membuat DOCX…' : 'DOCX', handleExportDocx, exportingDocx)}
      {dl('R Syntax', handleR)}
      <button onClick={() => setShowReportModal(true)}
        className="px-3 sm:px-4 py-2 bg-emerald-600 hover:opacity-90 text-white rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
        <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 📝 Laporan AI
      </button>
      {showReportModal && (
        <ReportPreviewModal result={result} onClose={() => setShowReportModal(false)} />
      )}
    </>
  )
}

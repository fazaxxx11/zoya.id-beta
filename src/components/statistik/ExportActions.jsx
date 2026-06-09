// src/components/statistik/ExportActions.jsx
// Export buttons (Excel + PDF) — lazy-loads export libs

import { useState } from 'react'
import { Download } from 'lucide-react'
import { exportToExcel } from '../../lib/export/excelExport'
import { exportToPDF } from '../../lib/export/pdfExport'
import { toast } from '../../lib/toast'

export default function ExportActions({ result, containerRef }) {
  const [exportingPdf, setExportingPdf] = useState(false)

  const handleExcel = () => {
    try {
      exportToExcel(result)
      toast.success('Excel berhasil di-download')
    } catch (e) {
      toast.error('Gagal export Excel: ' + e.message)
    }
  }

  const handlePdf = async () => {
    if (exportingPdf) return
    setExportingPdf(true)
    try {
      await exportToPDF(result, containerRef?.current)
      toast.success('PDF berhasil di-download')
    } catch (e) {
      toast.error('Gagal export PDF: ' + e.message)
    } finally {
      setExportingPdf(false)
    }
  }

  const dl = (label, fn, disabled = false) => (
    <button onClick={fn} disabled={disabled}
      className="px-3 sm:px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-gray-300 text-white rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
      <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {label}
    </button>
  )

  return (
    <>
      {dl('Excel', handleExcel)}
      {dl(exportingPdf ? 'Membuat PDF…' : 'PDF', handlePdf, exportingPdf)}
    </>
  )
}

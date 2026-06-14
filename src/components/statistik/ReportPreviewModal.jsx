// src/components/statistik/ReportPreviewModal.jsx
// Modal for AI-generated narrative preview + DOCX export
// Part of Azezmen (zoya.id-beta) Phase 10

import { X, Copy, Download } from 'lucide-react'
import { generateNarasi } from '../../lib/ai/reportNarrator'
import { reportToDocx, downloadDocx } from '../../lib/docxExporter'
import { toast } from '../../lib/toast'

export default function ReportPreviewModal({ result, onClose }) {
  if (!result) return null
  
  const { title, narasi } = generateNarasi(result)
  
  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(narasi)
      toast.success('Narasi berhasil di-copy')
    } catch (e) {
      toast.error('Gagal copy: ' + e.message)
    }
  }
  
  const handleDownload = async () => {
    try {
      const docBlob = await reportToDocx(result)
      downloadDocx(docBlob, `${result.tool || 'laporan'}_narasi.docx`)
      toast.success('Laporan DOCX berhasil di-download')
    } catch (e) {
      toast.error('Gagal export DOCX: ' + e.message)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
         onClick={onClose}>
      <div className="bg-card rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col"
           onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-heading font-bold text-fg">📝 Laporan AI</h2>
            <p className="text-sm text-muted mt-0.5">{title}</p>
          </div>
          <button onClick={onClose}
                  className="p-2 hover:bg-muted/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-fg font-body">
              {narasi}
            </div>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-card/30">
          <button onClick={handleCopy}
                  className="px-4 py-2 bg-surface hover:bg-muted/20 text-fg rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Copy className="w-4 h-4" /> Copy
          </button>
          <button onClick={handleDownload}
                  className="px-4 py-2 bg-accent hover:opacity-90 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-opacity">
            <Download className="w-4 h-4" /> Download DOCX
          </button>
          <button onClick={onClose}
                  className="px-4 py-2 bg-surface hover:bg-muted/20 text-fg rounded-lg text-sm font-medium transition-colors">
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

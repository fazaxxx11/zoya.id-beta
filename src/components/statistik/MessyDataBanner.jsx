import { useState } from 'react'
import { AlertTriangle, CheckCircle, Wand2, X, ChevronDown, ChevronRight } from 'lucide-react'
import { quickDiagnose, preprocessMessyData } from '../../lib/messyDataPreprocessor'

/**
 * MessyDataBanner — muncul setelah upload jika terdeteksi data messy.
 * Props:
 *   - rawRows: 2D array hasil parseExcel (sebelum column-oriented transform)
 *   - fileName: string
 *   - onApply: (cleanedData) => void — dipanggil saat user apply cleanup
 *   - onSkip: () => void — user skip, pakai data apa adanya
 */
export default function MessyDataBanner({ rawRows, fileName, onApply, onSkip }) {
  const [expanded, setExpanded] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [applied, setApplied] = useState(false)

  const diagnosis = quickDiagnose(rawRows)

  if (!diagnosis.hasIssues || applied) return null

  const handleApply = () => {
    setProcessing(true)
    // Small delay for visual feedback
    setTimeout(() => {
      const result = preprocessMessyData(rawRows, fileName)
      setProcessing(false)
      setApplied(true)
      onApply?.(result)
    }, 400)
  }

  return (
    <div className="border border-terracotta/40 bg-terracotta/10 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-terracotta/15 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-terracotta shrink-0" />
          <div className="text-left">
            <span className="font-heading font-semibold text-sm text-terracotta">
              Data perlu dirapihkan
            </span>
            <span className="text-xs text-terracotta/80 ml-2">
              {diagnosis.issues.length} masalah terdeteksi
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleApply() }}
            disabled={processing}
            className="text-xs font-heading font-semibold bg-terracotta hover:bg-terracotta/90 text-white disabled:opacity-50 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors"
          >
            <Wand2 className="w-3 h-3" />
            {processing ? 'Memproses…' : 'Rapihkan Otomatis'}
          </button>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-terracotta/70" />
          ) : (
            <ChevronRight className="w-4 h-4 text-terracotta/70" />
          )}
        </div>
      </button>

      {/* Details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-terracotta/30">
          <p className="text-xs text-terracotta mt-3 mb-2 leading-relaxed">
            Sistem mendeteksi format data yang tidak standar — umum terjadi pada file
            Excel dari skripsi/tugas kuliah. Klik <strong>Rapihkan Otomatis</strong> untuk
            memperbaiki sebelum analisis.
          </p>
          <ul className="space-y-1.5">
            {diagnosis.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-terracotta">
                <span className="text-terracotta/70 mt-0.5">•</span>
                {issue}
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleApply}
              disabled={processing}
              className="text-xs font-medium bg-terracotta hover:bg-terracotta/90 text-white disabled:opacity-50 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors"
            >
              <Wand2 className="w-3 h-3" />
              {processing ? 'Memproses…' : 'Rapihkan Otomatis'}
            </button>
            <button
              onClick={onSkip}
              className="text-xs text-terracotta/80 hover:text-terracotta px-3 py-1.5"
            >
              Lewati, pakai apa adanya
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

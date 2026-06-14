// Compact "Save Analysis" button + modal for non-Statistik pages
// (Mediation, Logistic, EFA). Reuses lib/savedAnalyses.js so hasil
// muncul di /statistik/history dan /statistik/report.

import { useState } from 'react'
import { Save, X } from 'lucide-react'
import { saveAnalysis } from '../lib/savedAnalyses'
import { toast } from '../lib/toast'

/**
 * @param {object} props
 * @param {object} props.result - hasil analisis (harus punya .type)
 * @param {string} [props.defaultTitle]
 * @param {string} [props.toolName] - override display name
 * @param {string} [props.className]
 */
export default function SaveAnalysisButton({ result, defaultTitle = '', toolName, className = '' }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(defaultTitle)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  if (!result) return null

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    const out = await saveAnalysis({
      title,
      tool: result.type,
      toolName: toolName || result.toolName || result.type,
      result,
      notes,
    })
    setSaving(false)
    if (out.ok) {
      toast.success('Analisis tersimpan ke riwayat')
      setOpen(false)
      setTitle(defaultTitle)
      setNotes('')
    } else {
      toast.error(out.error || 'Gagal menyimpan')
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`btn-secondary text-xs ${className}`}
        title="Simpan ke riwayat (untuk Bab IV nanti)"
      >
        <Save className="w-3.5 h-3.5" /> Simpan ke Riwayat
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
             onClick={() => !saving && setOpen(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-sm">Simpan Analisis</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Hasil ini akan masuk ke riwayat dan bisa dipakai di Generator Bab IV.
                  Butuh login.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Judul (opsional)</label>
              <input
                type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder={defaultTitle || `${toolName || result.toolName || result.type} — ${new Date().toLocaleDateString('id-ID')}`}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Catatan (opsional)</label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                rows={3} placeholder="Konteks penelitian, hipotesis, dll."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button onClick={() => setOpen(false)} disabled={saving} className="btn-ghost text-xs">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-xs">
                <Save className="w-3.5 h-3.5" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

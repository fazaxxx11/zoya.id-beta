// Modal: pilih template rubrik atau hapus user templates.
// Dipakai di Assessment > RubrikBuilder.

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, FileText, Trash2, Clock } from 'lucide-react'
import { BUILTIN_TEMPLATES, getUserTemplates, deleteTemplate } from '../lib/rubrikTemplates'
import { toast } from '../lib/toast'

export default function RubrikTemplateModal({ open, onClose, onApply, hasExisting }) {
  const [userTpls, setUserTpls] = useState(() => getUserTemplates())

  if (!open) return null

  const handleApply = (tpl) => {
    if (hasExisting) {
      if (!confirm(`Rubrik existing akan diganti dengan template "${tpl.name}". Lanjutkan?`)) return
    }
    onApply(tpl)
    onClose()
  }

  const handleDelete = (id, name) => {
    if (!confirm(`Hapus template "${name}"?`)) return
    deleteTemplate(id)
    setUserTpls(getUserTemplates())
    toast.success('Template dihapus')
  }

  const TemplateCard = ({ tpl, deletable }) => {
    const totalBobot = tpl.kriteria.reduce((s, k) => s + Number(k.bobot || 0), 0)
    return (
      <div className="border-2 border-border rounded-xl p-3 hover:border-sky-400 hover:bg-sky-50/40 transition-colors group">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-semibold text-sm text-gray-800 truncate">{tpl.name}</h4>
          {deletable && (
            <button
              onClick={() => handleDelete(tpl.id, tpl.name)}
              className="text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              title="Hapus template"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="text-[11px] text-muted mb-2 line-clamp-2 min-h-[2em]">
          {tpl.context || <span className="italic">Tanpa konteks</span>}
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {tpl.kriteria.slice(0, 4).map((k, i) => (
            <span key={i} className="text-[10px] bg-surface px-1.5 py-0.5 rounded text-gray-600">
              {k.nama} ({k.bobot}%)
            </span>
          ))}
          {tpl.kriteria.length > 4 && (
            <span className="text-[10px] text-muted">+{tpl.kriteria.length - 4} lagi</span>
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted">
          <span>{tpl.kriteria.length} kriteria · total {totalBobot}%</span>
          <button
            onClick={() => handleApply(tpl)}
            className="px-2 py-1 bg-sky-500 text-white rounded font-medium hover:bg-sky-600 transition-colors"
          >
            Pakai
          </button>
        </div>
      </div>
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-gray-900">Pilih Template Rubrik</h3>
          </div>
          <button onClick={onClose} className="text-muted hover:text-gray-700 p-1 rounded-lg hover:bg-surface">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-5">
          <section>
            <h4 className="text-xs uppercase tracking-wide font-semibold text-muted mb-2">Template Bawaan</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BUILTIN_TEMPLATES.map(tpl => (
                <TemplateCard key={tpl.id} tpl={tpl} deletable={false} />
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-xs uppercase tracking-wide font-semibold text-muted mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Template Saya
              <span className="ml-1 text-muted normal-case font-normal">({userTpls.length})</span>
            </h4>
            {userTpls.length === 0 ? (
              <div className="text-xs text-muted italic bg-surface rounded-lg p-3 text-center">
                Belum ada template tersimpan. Pakai tombol <strong className="text-gray-600">Simpan sebagai Template</strong> di rubrik builder.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {userTpls.map(tpl => (
                  <TemplateCard key={tpl.id} tpl={tpl} deletable={true} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Picker modal untuk dataset contoh.
// Dipakai di Statistik & StatistikBatch sebagai onboarding cepat untuk new user.

import { FileSpreadsheet, X } from 'lucide-react'
import { EXAMPLE_DATASETS } from '../lib/exampleDatasets'
import Modal from './Modal'

const TOOL_LABELS = {
  ttest: 'T-Test',
  anova: 'ANOVA',
  reliability: 'Validitas & Reliabilitas',
  correlation: 'Korelasi & Regresi',
  chisquare: 'Chi-Square',
  deskriptif: 'Statistik Deskriptif',
  nonparametrik: 'Non-Parametrik',
}

export default function ExampleDatasetPicker({ open, onClose, onPick }) {
  return (
    <Modal open={open} onClose={onClose}
      panelClassName="bg-card rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-accent" />
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted font-medium">Onboarding</div>
              <h3 className="text-base font-semibold text-fg">Pilih Contoh Dataset</h3>
            </div>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="text-muted hover:text-accent p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 text-xs text-muted border-b border-border bg-surface/60">
          Dataset siap pakai dengan konteks lokal. Cocok untuk explore tool tanpa upload data sendiri.
        </div>

        <div className="overflow-y-auto p-4 space-y-2">
          {EXAMPLE_DATASETS.map(ds => {
            const n = ds.data[ds.columns[0]].length
            return (
              <button
                key={ds.id}
                onClick={() => { onPick(ds); onClose() }}
                className="w-full text-left bg-card border border-border hover:border-accent hover:bg-surface rounded-xl p-4 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="text-sm font-semibold text-fg group-hover:text-accent">
                    {ds.name}
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted bg-surface px-2 py-0.5 rounded-full font-medium shrink-0">
                    {TOOL_LABELS[ds.recommendedTool] || ds.recommendedTool}
                  </span>
                </div>
                <div className="text-xs text-muted leading-relaxed mb-2">
                  {ds.description}
                </div>
                <div className="text-[11px] text-muted tabular-nums">
                  {n} baris · {ds.columns.length} kolom · {ds.columns.join(', ')}
                </div>
              </button>
            )
          })}
        </div>
    </Modal>
  )
}

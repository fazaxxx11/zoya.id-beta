// Modal: Generate rubrik via AI.
// User input: topik soal, mata pelajaran, level, tipe tugas, jumlah kriteria.
// Output: array kriteria → di-replace ke rubrik state.

import { useState } from 'react'
import { Loader2, Wand2, AlertCircle, X } from 'lucide-react'
import Modal from './Modal'
import { generateRubrik, TIPE_TUGAS, LEVEL_PENDIDIKAN } from '../lib/ai/generateRubrik'
import { toast } from '../lib/toast'

export default function RubrikAIModal({ open, onClose, onApply }) {
  const [topik, setTopik] = useState('')
  const [mataPelajaran, setMataPelajaran] = useState('')
  const [level, setLevel] = useState('SMA')
  const [tipeTugas, setTipeTugas] = useState('essay')
  const [jumlah, setJumlah] = useState(4)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)   // hasil generate
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!topik.trim()) {
      toast.warning('Masukkan topik soal/tugas dulu')
      return
    }
    setLoading(true)
    setError('')
    setPreview(null)
    try {
      const result = await generateRubrik({
        topik: topik.trim(),
        mataPelajaran: mataPelajaran.trim(),
        level,
        tipeTugas,
        jumlahKriteria: jumlah,
      })
      if (result.ok) {
        setPreview(result.kriteria)
        if (result.fallback) {
          toast.warning('AI tidak merespons, pakai template default')
        } else {
          toast.success(`Rubrik berhasil dibuat (${result.provider || 'AI'})`)
        }
      } else {
        setError(result.error || 'Gagal generate rubrik')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (!preview || preview.length === 0) return
    // Convert ke format rubrik dengan id
    const rubrikItems = preview.map(k => ({
      id: Math.random().toString(36).slice(2, 8),
      nama: k.nama,
      deskripsi: k.deskripsi,
      bobot: k.bobot,
    }))
    onApply(rubrikItems)
    onClose()
    toast.success('Rubrik diterapkan')
    // Reset
    setPreview(null)
    setTopik('')
    setMataPelajaran('')
  }

  const handleClose = () => {
    if (loading) return // Don't close while loading
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose}
      panelClassName="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
      <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
            <Wand2 className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-fg">Auto-Buatkan Rubrik</h2>
            <p className="text-sm text-muted">AI akan generate kriteria penilaian sesuai topik & level</p>
          </div>
          <button onClick={handleClose} disabled={loading} aria-label="Tutup"
            className="text-muted hover:text-accent p-1 rounded disabled:opacity-30">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        {!preview && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-fg/80 mb-1.5">
                Topik / Soal <span className="text-terracotta">*</span>
              </label>
              <textarea
                value={topik}
                onChange={e => setTopik(e.target.value)}
                placeholder="cth: Jelaskan dampak revolusi industri 4.0 terhadap dunia kerja"
                rows={3}
                className="input-field resize-none"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-fg/80 mb-1.5">Mata Pelajaran</label>
                <input
                  type="text"
                  value={mataPelajaran}
                  onChange={e => setMataPelajaran(e.target.value)}
                  placeholder="cth: Sosiologi"
                  className="input-field"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg/80 mb-1.5">Jenjang</label>
                <select
                  value={level}
                  onChange={e => setLevel(e.target.value)}
                  className="input-field"
                  disabled={loading}
                >
                  {LEVEL_PENDIDIKAN.map(l => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-fg/80 mb-1.5">Tipe Tugas</label>
              <div className="grid grid-cols-4 gap-2">
                {TIPE_TUGAS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTipeTugas(t.id)}
                    disabled={loading}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                      tipeTugas === t.id
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border bg-card text-muted hover:border-accent/50'
                    } disabled:opacity-50`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-fg/80 mb-1.5">
                Jumlah Kriteria: <span className="text-accent font-bold">{jumlah}</span>
              </label>
              <input
                type="range"
                min={3}
                max={5}
                value={jumlah}
                onChange={e => setJumlah(Number(e.target.value))}
                className="w-full accent-accent"
                disabled={loading}
              />
              <div className="flex justify-between text-xs text-muted mt-1">
                <span>3 (ringkas)</span>
                <span>4 (default)</span>
                <span>5 (detail)</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={handleClose} disabled={loading}
                className="btn-secondary flex-1">
                Batal
              </button>
              <button onClick={handleGenerate} disabled={loading || !topik.trim()}
                className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent/90 text-accent-fg rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Membuat rubrik...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate Rubrik
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-4">
            <div className="bg-accent/10 border border-accent/30 rounded-xl p-3">
              <div className="text-xs font-semibold text-accent mb-1">PREVIEW RUBRIK</div>
              <div className="text-sm text-fg/80">
                {preview.length} kriteria · Total bobot: <span className="font-bold">{preview.reduce((s, k) => s + k.bobot, 0)}%</span>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {preview.map((k, i) => (
                <div key={i} className="bg-surface border border-border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-semibold text-sm text-fg">{i + 1}. {k.nama}</div>
                    <span className="text-xs font-bold bg-accent/15 text-accent px-2 py-0.5 rounded-full shrink-0">
                      {k.bobot}%
                    </span>
                  </div>
                  <div className="text-xs text-muted leading-relaxed">{k.deskripsi}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setPreview(null)}
                className="btn-secondary flex-1">
                ← Buat Lagi
              </button>
              <button onClick={handleApply}
                className="flex-1 btn-primary">
                <Wand2 className="w-4 h-4 inline mr-1.5" />
                Terapkan ke Rubrik
              </button>
            </div>
            <div className="text-xs text-muted text-center">
              Rubrik existing akan diganti. Bisa di-edit setelah diterapkan.
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

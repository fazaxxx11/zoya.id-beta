// Kuesioner Builder — Tier A (Local-only)
// =========================================
// Halaman bikin & isi kuesioner secara lokal. 3 tab:
//   Builder   → susun pertanyaan
//   Preview   → lihat hasil + isi sebagai responden ujicoba
//   Responses → daftar respons + ekspor CSV/JSON
//
// Sidebar kiri: list survey tersimpan + tombol baru / import.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, Copy, Save, Download, Upload, FileText,
  ChevronUp, ChevronDown, GripVertical, Eye, ListChecks,
  Edit3, X, BarChart3, FilePlus2, Send, Sparkles, HelpCircle,
  ClipboardList, ArrowRight, Check, BookOpen, Wand2, Library, Loader2,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import {
  newSurvey, newSection, newItem,
  listSurveys, getSurvey, saveSurvey, deleteSurvey,
  listResponses, addResponse, deleteResponse, clearResponses,
  validateSurvey, validateResponse,
  exportSurveyJSON, importSurveyJSON,
  responsesToMatrix, matrixToCSV, downloadCSV,
  scoreResponseBySections,
  seedDemoSurvey,
  SURVEY_TEMPLATES,
  buildResponsesTemplateCSV,
  importResponsesFromCSV,
} from '../lib/kuesioner'
import { generateKuesionerAI } from '../lib/aiKuesioner'
import { INSTRUMENT_TEMPLATES } from '../lib/instrumentTemplates'
import { toast } from '../lib/toast'

const ITEM_TYPES = [
  { id: 'likert',      label: 'Likert', desc: 'Skala 1–5/7 (STS–SS)' },
  { id: 'multichoice', label: 'Pilihan Ganda', desc: '1 jawaban' },
  { id: 'checkbox',    label: 'Checkbox', desc: 'Pilih ≥1' },
  { id: 'short_text',  label: 'Teks Singkat', desc: '1 baris' },
  { id: 'long_text',   label: 'Teks Panjang', desc: 'Paragraf' },
  { id: 'number',      label: 'Angka', desc: 'Numerik' },
  { id: 'rating',      label: 'Rating', desc: 'Bintang 1–5/10' },
]

export default function Kuesioner() {
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [tab, setTab] = useState('builder')
  const [responses, setResponses] = useState([])
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const importInputRef = useRef(null)

  // Load surveys on mount — TIDAK auto-create. Kalau kosong, tampilkan wizard.
  useEffect(() => {
    const all = listSurveys()
    setSurveys(all)
    if (all.length > 0) {
      setActiveId(all[0].id)
      setDraft(all[0])
    }
    
  }, [])

  // Load responses when active changes
  useEffect(() => {
    if (activeId) setResponses(listResponses(activeId))
  }, [activeId])

  function handleNewSurvey() {
    const s = newSurvey()
    saveSurvey(s)
    setSurveys(listSurveys())
    setActiveId(s.id)
    setDraft(s)
    setTab('builder')
  }

  function handleLoadDemo() {
    const s = seedDemoSurvey()
    setSurveys(listSurveys())
    setActiveId(s.id)
    setDraft(s)
    setResponses(listResponses(s.id))
    setTab('responses')
    toast.success('Demo dimuat: 10 item Likert + 15 responden')
  }

  function handleUseTemplate(tplId) {
    const tpl = SURVEY_TEMPLATES.find(t => t.id === tplId)
    if (!tpl) return
    const s = tpl.factory()
    saveSurvey(s)
    setSurveys(listSurveys())
    setActiveId(s.id)
    setDraft(s)
    setTab('builder')
    toast.success(`Template "${tpl.name}" dimuat`)
  }

  function handleUseInstrument(instId) {
    const inst = INSTRUMENT_TEMPLATES.find(t => t.id === instId)
    if (!inst) return
    const s = inst.factory()
    saveSurvey(s)
    setSurveys(listSurveys())
    setActiveId(s.id)
    setDraft(s)
    setTab('builder')
    toast.success(`Instrumen "${inst.name}" dimuat. Jangan lupa cantumkan referensi: ${inst.citation}`)
  }

  function handleAIResult(survey) {
    saveSurvey(survey)
    setSurveys(listSurveys())
    setActiveId(survey.id)
    setDraft(survey)
    setTab('builder')
    setAiModalOpen(false)
    toast.success('Kuesioner berhasil dibuat AI. Silakan review & sesuaikan.')
  }

  function handleSelect(id) {
    const s = getSurvey(id)
    if (s) {
      setActiveId(id)
      setDraft(s)
      setTab('builder')
    }
  }

  function handleSave() {
    if (!draft) return
    const err = validateSurvey(draft)
    if (err) { toast.warning(err); return }
    const saved = saveSurvey(draft)
    setSurveys(listSurveys())
    setDraft(saved)
    toast.success('Kuesioner tersimpan')
  }

  function handleDelete(id) {
    if (!confirm('Hapus kuesioner ini beserta semua responsnya?')) return
    deleteSurvey(id)
    const all = listSurveys()
    setSurveys(all)
    if (id === activeId) {
      if (all.length > 0) handleSelect(all[0].id)
      else handleNewSurvey()
    }
    toast.success('Kuesioner dihapus')
  }

  function handleDuplicate(id) {
    const s = getSurvey(id)
    if (!s) return
    const copy = { ...JSON.parse(JSON.stringify(s)) }
    copy.id = newSurvey().id
    copy.title = `${s.title} (copy)`
    copy.createdAt = Date.now()
    copy.updatedAt = Date.now()
    // re-id sections + items
    copy.sections = copy.sections.map(sec => ({
      ...sec,
      id: newSection().id,
      items: sec.items.map(it => ({ ...it, id: newItem().id })),
    }))
    saveSurvey(copy)
    setSurveys(listSurveys())
    setActiveId(copy.id)
    setDraft(copy)
    toast.success('Diduplikasi')
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const obj = await importSurveyJSON(file)
      saveSurvey(obj)
      setSurveys(listSurveys())
      setActiveId(obj.id)
      setDraft(obj)
      toast.success('Import berhasil')
    } catch (err) {
      toast.error('File JSON tidak valid')
    }
    e.target.value = ''
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title="Kuesioner"
        subtitle="Builder & Pengumpulan Respons (Lokal)"
        breadcrumbs={[{ path: '/', label: 'Beranda' }, { path: '/kuesioner', label: 'Kuesioner' }]}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-4 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        {/* Sidebar */}
        <aside className="space-y-2">
          <div className="flex gap-2">
            <button onClick={handleNewSurvey} className="flex-1 btn-primary text-xs py-2">
              <FilePlus2 className="w-4 h-4" /> Baru
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="btn-secondary text-xs py-2"
              title="Import JSON"
            >
              <Upload className="w-4 h-4" />
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
          <button
            onClick={() => setAiModalOpen(true)}
            className="w-full text-xs py-2 px-3 rounded-lg bg-accent hover:opacity-90 text-white font-semibold transition-colors flex items-center justify-center gap-1.5 "
            title="Generate kuesioner pakai AI"
          >
            <Wand2 className="w-3.5 h-3.5" /> Generate dengan AI
          </button>
          <button
            onClick={handleLoadDemo}
            className="w-full text-xs py-2 px-3 rounded-lg bg-surface border border-border text-fg hover:bg-card font-medium transition-colors flex items-center justify-center gap-1.5"
            title="Buat survei demo + 15 responden untuk uji coba"
          >
            <Sparkles className="w-3.5 h-3.5" /> Muat Data Demo
          </button>

          <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
            {surveys.length === 0 && (
              <p className="text-xs text-muted px-2 py-3">Belum ada kuesioner.</p>
            )}
            {surveys.map(s => (
              <div
                key={s.id}
                className={`group rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                  s.id === activeId
                    ? 'bg-sky-50 border-sky-300'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => handleSelect(s.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.title || '(tanpa judul)'}</div>
                    <div className="text-[10px] text-gray-500">
                      {s.sections.reduce((n, sec) => n + sec.items.length, 0)} item ·
                      {' '}{listResponses(s.id).length} respons
                    </div>
                  </div>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDuplicate(s.id) }}
                      className="p-1 text-gray-400 hover:text-sky-600"
                      title="Duplikat"
                    ><Copy className="w-3.5 h-3.5" /></button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(s.id) }}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Hapus"
                    ><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main>
          {!draft ? (
            <WelcomeWizard
              onDemo={handleLoadDemo}
              onTemplate={handleUseTemplate}
              onBlank={handleNewSurvey}
              onImport={() => importInputRef.current?.click()}
              onAIGenerate={() => setAiModalOpen(true)}
              onUseInstrument={handleUseInstrument}
            />
          ) : (
            <>
              {/* Step-flow banner — guidance untuk new user */}
              <StepFlowBanner tab={tab} responses={responses.length} />

              {/* Top toolbar */}
              <div className="bg-white border border-gray-200 rounded-xl p-3 mb-3 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={draft.title}
                  onChange={e => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Judul kuesioner"
                  className="flex-1 min-w-[180px] text-base font-semibold border-0 focus:ring-0 px-1"
                />
                <button onClick={handleSave} className="btn-primary text-xs py-2">
                  <Save className="w-4 h-4" /> Simpan
                </button>
                <button onClick={() => exportSurveyJSON(draft)} className="btn-secondary text-xs py-2">
                  <Download className="w-4 h-4" /> Export
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-3 border-b border-gray-200">
                {[
                  { id: 'builder',   label: 'Builder',  icon: Edit3 },
                  { id: 'preview',   label: 'Preview & Isi', icon: Eye },
                  { id: 'responses', label: `Respons (${responses.length})`, icon: ListChecks },
                ].map(t => {
                  const Ic = t.icon
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 transition-colors ${
                        tab === t.id
                          ? 'border-sky-500 text-sky-700'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Ic className="w-4 h-4" /> {t.label}
                    </button>
                  )
                })}
              </div>

              {tab === 'builder' && (
                <BuilderPanel draft={draft} setDraft={setDraft} />
              )}
              {tab === 'preview' && (
                <PreviewPanel
                  survey={draft}
                  onSubmit={(answers, name) => {
                    const r = addResponse(draft.id, answers, name)
                    setResponses(listResponses(draft.id))
                    toast.success(`Respons "${r.respondentName}" tersimpan`)
                    setTab('responses')
                  }}
                />
              )}
              {tab === 'responses' && (
                <ResponsesPanel
                  survey={draft}
                  responses={responses}
                  onDelete={(rid) => {
                    deleteResponse(draft.id, rid)
                    setResponses(listResponses(draft.id))
                  }}
                  onClearAll={() => {
                    if (!confirm('Hapus SEMUA respons?')) return
                    clearResponses(draft.id)
                    setResponses([])
                    toast.success('Respons dikosongkan')
                  }}
                  onAnalyze={() => {
                    const { headers, rows } = responsesToMatrix(draft, responses)
                    const csv = matrixToCSV({ headers, rows })
                    // Simpan ke localStorage handoff key, lalu navigate
                    sessionStorage.setItem('kuesioner_handoff_csv', csv)
                    sessionStorage.setItem('kuesioner_handoff_name', draft.title)
                    toast.info('Buka Statistik → Import dari Kuesioner (lihat catatan)')
                    navigate('/statistik')
                  }}
                  onImported={() => setResponses(listResponses(draft.id))}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* AI Generator Modal */}
      <AIGenerateModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onResult={handleAIResult}
      />
    </div>
  )
}

// ============================================================
// Builder Panel
// ============================================================
function BuilderPanel({ draft, setDraft }) {
  const updateSection = (sIdx, patch) => {
    const sections = draft.sections.map((s, i) => i === sIdx ? { ...s, ...patch } : s)
    setDraft({ ...draft, sections })
  }
  const addSection = () => {
    setDraft({ ...draft, sections: [...draft.sections, newSection(`Bagian ${draft.sections.length + 1}`)] })
  }
  const deleteSection = (sIdx) => {
    if (draft.sections.length === 1) { toast.warning('Minimal 1 bagian'); return }
    if (!confirm('Hapus bagian ini & semua itemnya?')) return
    setDraft({ ...draft, sections: draft.sections.filter((_, i) => i !== sIdx) })
  }
  const moveSection = (sIdx, dir) => {
    const ni = sIdx + dir
    if (ni < 0 || ni >= draft.sections.length) return
    const arr = [...draft.sections]
    ;[arr[sIdx], arr[ni]] = [arr[ni], arr[sIdx]]
    setDraft({ ...draft, sections: arr })
  }
  const addItem = (sIdx, type) => {
    const sections = draft.sections.map((s, i) =>
      i === sIdx ? { ...s, items: [...s.items, newItem(type)] } : s)
    setDraft({ ...draft, sections })
  }
  const updateItem = (sIdx, iIdx, patch) => {
    const sections = draft.sections.map((s, i) => {
      if (i !== sIdx) return s
      const items = s.items.map((it, j) => j === iIdx ? { ...it, ...patch } : it)
      return { ...s, items }
    })
    setDraft({ ...draft, sections })
  }
  const deleteItem = (sIdx, iIdx) => {
    const sections = draft.sections.map((s, i) => {
      if (i !== sIdx) return s
      return { ...s, items: s.items.filter((_, j) => j !== iIdx) }
    })
    setDraft({ ...draft, sections })
  }
  const moveItem = (sIdx, iIdx, dir) => {
    const sec = draft.sections[sIdx]
    const ni = iIdx + dir
    if (ni < 0 || ni >= sec.items.length) return
    const items = [...sec.items]
    ;[items[iIdx], items[ni]] = [items[ni], items[iIdx]]
    updateSection(sIdx, { items })
  }
  const duplicateItem = (sIdx, iIdx) => {
    const sec = draft.sections[sIdx]
    const orig = sec.items[iIdx]
    const copy = { ...JSON.parse(JSON.stringify(orig)), id: newItem().id }
    const items = [...sec.items.slice(0, iIdx + 1), copy, ...sec.items.slice(iIdx + 1)]
    updateSection(sIdx, { items })
  }

  return (
    <div className="space-y-3">
      {/* Blueprint card — muncul kalau survey hasil dari AI mode "Blueprint" */}
      {draft._blueprint && <BlueprintCard blueprint={draft._blueprint} />}

      {/* Citation banner — muncul kalau survey dari instrumen teruji */}
      {draft._meta?.citation && <CitationBanner meta={draft._meta} />}

      <textarea
        value={draft.description || ''}
        onChange={e => setDraft({ ...draft, description: e.target.value })}
        placeholder="Deskripsi / pengantar kuesioner (opsional)..."
        rows={2}
        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm"
      />

      {draft.sections.map((sec, sIdx) => (
        <div key={sec.id} className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4">
          <div className="flex items-start gap-2 mb-3 pb-3 border-b border-gray-100">
            <GripVertical className="w-4 h-4 text-gray-300 mt-2.5" />
            <div className="flex-1 space-y-1.5">
              <input
                type="text"
                value={sec.title}
                onChange={e => updateSection(sIdx, { title: e.target.value })}
                placeholder="Judul bagian (mis. Motivasi Belajar)"
                className="w-full text-base font-semibold border-0 focus:ring-0 px-1"
              />
              <input
                type="text"
                value={sec.description || ''}
                onChange={e => updateSection(sIdx, { description: e.target.value })}
                placeholder="Deskripsi/dimensi (opsional)"
                className="w-full text-xs text-gray-500 border-0 focus:ring-0 px-1"
              />
            </div>
            <div className="flex flex-col">
              <button onClick={() => moveSection(sIdx, -1)} className="p-1 text-gray-400 hover:text-sky-600" title="Pindah atas"><ChevronUp className="w-4 h-4" /></button>
              <button onClick={() => moveSection(sIdx, +1)} className="p-1 text-gray-400 hover:text-sky-600" title="Pindah bawah"><ChevronDown className="w-4 h-4" /></button>
            </div>
            <button onClick={() => deleteSection(sIdx)} className="p-1.5 text-gray-400 hover:text-red-600" title="Hapus bagian"><Trash2 className="w-4 h-4" /></button>
          </div>

          {/* AI Regenerate per-section */}
          <RegenerateSection
            surveyTitle={draft.title}
            section={sec}
            onApply={(newItems) => updateSection(sIdx, { items: newItems })}
            onAppend={(newItems) => updateSection(sIdx, { items: [...sec.items, ...newItems] })}
          />

          {/* Items */}
          <div className="space-y-2">
            {sec.items.length === 0 && (
              <p className="text-xs text-gray-400 italic px-2 py-3 text-center border border-dashed border-gray-200 rounded-lg">
                Belum ada pertanyaan. Tambah di bawah ↓
              </p>
            )}
            {sec.items.map((it, iIdx) => (
              <ItemEditor
                key={it.id}
                item={it}
                idx={iIdx}
                onChange={(patch) => updateItem(sIdx, iIdx, patch)}
                onDelete={() => deleteItem(sIdx, iIdx)}
                onMoveUp={() => moveItem(sIdx, iIdx, -1)}
                onMoveDown={() => moveItem(sIdx, iIdx, +1)}
                onDuplicate={() => duplicateItem(sIdx, iIdx)}
              />
            ))}
          </div>

          {/* Add item buttons */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-1.5">+ Tambah pertanyaan:</div>
            <div className="flex flex-wrap gap-1.5">
              {ITEM_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => addItem(sIdx, t.id)}
                  className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-sky-100 hover:text-sky-700 rounded-md transition-colors"
                  title={t.desc}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={addSection}
        className="w-full bg-white border-2 border-dashed border-gray-300 hover:border-sky-400 hover:bg-sky-50/30 rounded-xl py-3 text-sm font-medium text-gray-600 hover:text-sky-700 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Tambah Bagian
      </button>
    </div>
  )
}

// ============================================================
// Item Editor (per pertanyaan)
// ============================================================
function ItemEditor({ item, idx, onChange, onDelete, onMoveUp, onMoveDown, onDuplicate }) {
  const typeMeta = ITEM_TYPES.find(t => t.id === item.type)
  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:border-sky-200 transition-colors">
      <div className="flex items-start gap-2">
        <span className="text-xs font-bold text-gray-400 mt-2 w-5">{idx + 1}.</span>
        <div className="flex-1 space-y-1.5">
          <input
            type="text"
            value={item.label}
            onChange={e => onChange({ label: e.target.value })}
            placeholder={`Pertanyaan ${typeMeta?.label || ''}...`}
            className="w-full text-sm font-medium border-0 focus:ring-0 px-1 bg-transparent"
          />
          <input
            type="text"
            value={item.description || ''}
            onChange={e => onChange({ description: e.target.value })}
            placeholder="Bantuan/keterangan (opsional)"
            className="w-full text-xs text-gray-500 border-0 focus:ring-0 px-1 bg-transparent"
          />
        </div>
        <span className="text-[10px] uppercase tracking-wide text-gray-400 mt-2 px-1.5 py-0.5 bg-gray-50 rounded border">
          {typeMeta?.label || item.type}
        </span>
        <div className="flex">
          <button onClick={onMoveUp} className="p-1 text-gray-400 hover:text-sky-600"><ChevronUp className="w-4 h-4" /></button>
          <button onClick={onMoveDown} className="p-1 text-gray-400 hover:text-sky-600"><ChevronDown className="w-4 h-4" /></button>
          <button onClick={onDuplicate} className="p-1 text-gray-400 hover:text-sky-600" title="Duplikat"><Copy className="w-4 h-4" /></button>
          <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Type-specific config */}
      <div className="mt-2 pl-6 space-y-2">
        {item.type === 'likert' && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5">
              Skala:
              <select
                value={item.scale || 5}
                onChange={e => {
                  const sc = Number(e.target.value)
                  const labels = sc === 5 ? ['STS','TS','N','S','SS']
                                : sc === 7 ? ['STS','TS','ATS','N','AS','S','SS']
                                : Array.from({length: sc}, (_, i) => String(i+1))
                  onChange({ scale: sc, scaleLabels: labels })
                }}
                className="border border-gray-200 rounded px-1.5 py-0.5"
              >
                <option value={4}>4</option>
                <option value={5}>5</option>
                <option value={6}>6</option>
                <option value={7}>7</option>
                <option value={10}>10</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={!!item.reverseCoded}
                onChange={e => onChange({ reverseCoded: e.target.checked })}
              />
              <span>Reverse coded</span>
              <span className="text-gray-400">(skor dibalik)</span>
            </label>
          </div>
        )}

        {item.type === 'rating' && (
          <label className="text-xs flex items-center gap-1.5">
            Maksimal:
            <select
              value={item.scale || 5}
              onChange={e => onChange({ scale: Number(e.target.value) })}
              className="border border-gray-200 rounded px-1.5 py-0.5"
            >
              <option value={5}>5 bintang</option>
              <option value={10}>10 bintang</option>
            </select>
          </label>
        )}

        {(item.type === 'multichoice' || item.type === 'checkbox') && (
          <OptionsEditor options={item.options || []} onChange={(options) => onChange({ options })} />
        )}

        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={!!item.required}
            onChange={e => onChange({ required: e.target.checked })}
          />
          <span>Wajib diisi</span>
        </label>
      </div>
    </div>
  )
}

function OptionsEditor({ options, onChange }) {
  const update = (i, val) => {
    const arr = [...options]; arr[i] = val; onChange(arr)
  }
  const add = () => onChange([...options, `Opsi ${options.length + 1}`])
  const remove = (i) => onChange(options.filter((_, j) => j !== i))
  return (
    <div className="space-y-1">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
          <input
            type="text"
            value={opt}
            onChange={e => update(i, e.target.value)}
            className="flex-1 text-xs border border-gray-200 rounded px-2 py-1"
          />
          <button onClick={() => remove(i)} className="text-gray-400 hover:text-red-600 p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button onClick={add} className="text-xs text-sky-600 hover:text-sky-700 ml-7">
        + Tambah opsi
      </button>
    </div>
  )
}

// ============================================================
// Preview Panel — render form & terima respons lokal
// ============================================================
function PreviewPanel({ survey, onSubmit }) {
  const [answers, setAnswers] = useState({})
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const setAnswer = (id, val) => setAnswers(a => ({ ...a, [id]: val }))

  const handleSubmit = () => {
    const err = validateResponse(survey, answers)
    if (err) { toast.warning(err); return }
    onSubmit(answers, name)
    setAnswers({})
    setName('')
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 2000)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-1">{survey.title}</h2>
      {survey.description && <p className="text-sm text-gray-600 mb-4 whitespace-pre-wrap">{survey.description}</p>}

      <div className="mb-4 pb-4 border-b border-gray-100">
        <label className="text-xs text-gray-500 block mb-1">Nama responden (opsional)</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Mis. Andi / Anonim"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {survey.sections.map(sec => (
        <section key={sec.id} className="mb-6">
          <h3 className="text-base font-semibold mb-1 pb-1 border-b border-gray-100">{sec.title}</h3>
          {sec.description && <p className="text-xs text-gray-500 mb-3">{sec.description}</p>}
          <div className="space-y-4">
            {sec.items.map((it, idx) => (
              <PreviewItem
                key={it.id}
                item={it}
                idx={idx}
                value={answers[it.id]}
                onChange={(v) => setAnswer(it.id, v)}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="pt-4 border-t border-gray-100 flex items-center gap-3">
        <button onClick={handleSubmit} className="btn-primary">
          <Send className="w-4 h-4" /> Submit Respons
        </button>
        {submitted && <span className="text-sm text-green-600">✓ Tersimpan</span>}
      </div>
    </div>
  )
}

function PreviewItem({ item, idx, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        <span className="text-gray-400 mr-1">{idx + 1}.</span>
        {item.label || <em className="text-gray-300">(belum ada label)</em>}
        {item.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {item.description && <p className="text-xs text-gray-500 mb-2">{item.description}</p>}

      {item.type === 'likert' && (
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: item.scale || 5 }, (_, i) => i + 1).map(n => (
            <label key={n} className="flex flex-col items-center gap-0.5 cursor-pointer">
              <input
                type="radio"
                name={item.id}
                checked={value === n}
                onChange={() => onChange(n)}
                className="w-4 h-4"
              />
              <span className="text-[10px] text-gray-500">{n}</span>
              <span className="text-[10px] text-gray-400">{(item.scaleLabels || [])[n - 1] || ''}</span>
            </label>
          ))}
        </div>
      )}

      {item.type === 'rating' && (
        <div className="flex gap-1">
          {Array.from({ length: item.scale || 5 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`text-2xl transition-colors ${
                (value || 0) >= n ? 'text-amber-400' : 'text-gray-300 hover:text-amber-300'
              }`}
            >★</button>
          ))}
        </div>
      )}

      {item.type === 'multichoice' && (
        <div className="space-y-1">
          {(item.options || []).map((opt, i) => (
            <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name={item.id}
                checked={value === opt}
                onChange={() => onChange(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      )}

      {item.type === 'checkbox' && (
        <div className="space-y-1">
          {(item.options || []).map((opt, i) => {
            const arr = Array.isArray(value) ? value : []
            const checked = arr.includes(opt)
            return (
              <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked ? arr.filter(x => x !== opt) : [...arr, opt]
                    onChange(next)
                  }}
                />
                {opt}
              </label>
            )
          })}
        </div>
      )}

      {item.type === 'short_text' && (
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      )}

      {item.type === 'long_text' && (
        <textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      )}

      {item.type === 'number' && (
        <input
          type="number"
          value={value ?? ''}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      )}
    </div>
  )
}

// ============================================================
// Welcome Wizard — empty state untuk first-time user
// ============================================================
function WelcomeWizard({ onDemo, onTemplate, onBlank, onImport, onAIGenerate, onUseInstrument }) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-sky-50 via-white to-cyan-50 border border-sky-200 rounded-2xl p-6 sm:p-8">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-sky-500 text-white flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Selamat datang di Kuesioner Builder</h2>
            <p className="text-sm text-gray-600">
              Bikin angket online → kumpulkan jawaban → analisis (Cronbach α, validitas).
              <br />Pilih cara mulai di bawah ⬇️
            </p>
          </div>
        </div>

        {/* Primary CTA — Generate with AI */}
        <button
          onClick={onAIGenerate}
          className="w-full mb-4 bg-accent hover:opacity-90 text-white rounded-xl p-4 flex items-center gap-3 transition-all  group"
        >
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Wand2 className="w-5 h-5" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold flex items-center gap-2">
              Generate dengan AI
              <span className="text-[10px] uppercase tracking-wide bg-white/25 px-1.5 py-0.5 rounded font-bold">BARU</span>
            </div>
            <div className="text-xs text-white/85">Deskripsikan topik penelitian, AI bikinkan instrumen lengkap dengan blueprint.</div>
          </div>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* 3-step flow visual */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { n: 1, label: 'Susun pertanyaan', icon: Edit3 },
            { n: 2, label: 'Isi/sebar ke responden', icon: Send },
            { n: 3, label: 'Analisis hasil', icon: BarChart3 },
          ].map(s => {
            const Ic = s.icon
            return (
              <div key={s.n} className="text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-white border-2 border-sky-300 flex items-center justify-center mb-1.5">
                  <Ic className="w-4 h-4 text-sky-600" />
                </div>
                <div className="text-[10px] font-bold text-sky-700">LANGKAH {s.n}</div>
                <div className="text-xs text-gray-700">{s.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick-start cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Demo */}
        <button
          onClick={onDemo}
          className="text-left bg-surface border border-border hover:bg-card rounded-xl p-5 transition-colors group"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <span className="font-semibold text-fg">Coba Data Demo</span>
            <span className="ml-auto text-[10px] uppercase tracking-wide bg-surface text-fg px-1.5 py-0.5 rounded font-bold">Rekomendasi</span>
          </div>
          <p className="text-xs text-fg leading-relaxed">
            Lihat seperti apa hasil akhirnya. Kami bikinkan kuesioner motivasi belajar lengkap dengan 15 responden,
            siap untuk diuji Cronbach α & validitas.
          </p>
          <div className="mt-3 text-xs font-medium text-fg flex items-center gap-1 group-hover:gap-2 transition-all">
            Muat sekarang <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Templates */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-sky-600" />
            <span className="font-semibold">Mulai dari Template</span>
          </div>
          <div className="space-y-1.5">
            {SURVEY_TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => onTemplate(tpl.id)}
                className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-sky-50 border border-gray-200 hover:border-sky-300 transition-colors"
              >
                <div className="text-sm font-medium text-gray-900">{tpl.name}</div>
                <div className="text-xs text-gray-500">{tpl.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Instrumen Teruji (Validated Scales) */}
      <details className="bg-white border-2 border-emerald-200 rounded-xl overflow-hidden" open>
        <summary className="px-5 py-3 cursor-pointer flex items-center gap-2 hover:bg-emerald-50/50 transition-colors">
          <Library className="w-5 h-5 text-emerald-600" />
          <span className="font-semibold text-gray-900">Instrumen Teruji (Validated Scales)</span>
          <span className="text-[10px] uppercase tracking-wide bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Akademik</span>
          <span className="ml-auto text-xs text-gray-500">{INSTRUMENT_TEMPLATES.length} instrumen</span>
        </summary>
        <div className="px-5 pb-4 pt-1">
          <p className="text-xs text-gray-600 mb-3">
            Instrumen klasik yang sudah divalidasi internasional, di-translate ke Bahasa Indonesia. Pakai untuk skripsi/tesis dengan tetap mencantumkan sitasi yang tertera.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {INSTRUMENT_TEMPLATES.map(inst => (
              <button
                key={inst.id}
                onClick={() => onUseInstrument(inst.id)}
                className="text-left p-3 rounded-lg bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-400 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="text-sm font-semibold text-gray-900">{inst.name}</div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">{inst.dimensions}D · {inst.items} item</span>
                </div>
                <div className="text-xs text-gray-600 mb-1.5">{inst.desc}</div>
                <div className="text-[10px] text-emerald-700 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> {inst.citation} · {inst.domain}
                </div>
              </button>
            ))}
          </div>
        </div>
      </details>

      {/* Other options */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-gray-500">Atau:</span>
        <button onClick={onBlank} className="text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1">
          <FilePlus2 className="w-4 h-4" /> Buat dari nol
        </button>
        <span className="text-gray-300">·</span>
        <button onClick={onImport} className="text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1">
          <Upload className="w-4 h-4" /> Import file JSON
        </button>
      </div>

      {/* Help section */}
      <details className="bg-amber-50/50 border border-amber-200 rounded-xl">
        <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-amber-900 flex items-center gap-2">
          <HelpCircle className="w-4 h-4" /> Apa itu kuesioner / angket / Likert?
        </summary>
        <div className="px-4 pb-4 text-xs text-amber-900 space-y-2 leading-relaxed">
          <p><strong>Kuesioner / angket</strong> = sekumpulan pertanyaan untuk mengumpulkan data dari responden (siswa, guru, dll).</p>
          <p><strong>Skala Likert</strong> = pertanyaan dengan jawaban 1–5 atau 1–7, biasanya STS (Sangat Tidak Setuju) sampai SS (Sangat Setuju). Cocok untuk mengukur sikap, persepsi, motivasi.</p>
          <p><strong>Bagian / Section / Dimensi</strong> = kelompok pertanyaan yang mengukur hal serupa, mis. "Motivasi", "Kepuasan". Penting untuk uji validitas/reliabilitas per dimensi.</p>
          <p><strong>Reverse-coded</strong> = pertanyaan yang nilai-nya dibalik. Mis. "Saya malas belajar" — kalau jawaban 1 (STS), berarti motivasinya tinggi, jadi otomatis di-skor jadi 5.</p>
          <p><strong>Cronbach α</strong> = koefisien reliabilitas. ≥ 0.7 berarti instrumen Anda konsisten/reliabel.</p>
        </div>
      </details>
    </div>
  )
}

// ============================================================
// Step-flow banner (di-tampilkan saat draft aktif)
// ============================================================
function StepFlowBanner({ tab, responses }) {
  const steps = [
    { id: 'builder',   n: 1, label: 'Susun', desc: 'Atur pertanyaan' },
    { id: 'preview',   n: 2, label: 'Isi', desc: 'Uji coba sebagai responden' },
    { id: 'responses', n: 3, label: 'Analisis', desc: `${responses} respons` },
  ]
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-2 mb-3 flex items-center justify-between gap-2 text-xs overflow-x-auto">
      {steps.map((s, i) => {
        const active = s.id === tab
        const done = (tab === 'preview' && s.id === 'builder') ||
                     (tab === 'responses' && (s.id === 'builder' || s.id === 'preview'))
        return (
          <div key={s.id} className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[11px] ${
              active ? 'bg-sky-500 text-white' :
              done   ? 'bg-green-500 text-white' :
                       'bg-gray-200 text-gray-500'
            }`}>
              {done ? <Check className="w-3 h-3" /> : s.n}
            </div>
            <div className="min-w-0">
              <div className={`font-semibold truncate ${active ? 'text-sky-700' : 'text-gray-700'}`}>{s.label}</div>
              <div className="text-[10px] text-gray-400 truncate">{s.desc}</div>
            </div>
            {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// Responses Panel
// ============================================================
function ResponsesPanel({ survey, responses, onDelete, onClearAll, onAnalyze, onImported }) {
  const matrix = useMemo(
    () => responsesToMatrix(survey, responses),
    [survey, responses]
  )
  const [showRaw, setShowRaw] = useState(false)
  const fileRef = useRef(null)

  const exportCSV = () => {
    const csv = matrixToCSV(matrix)
    downloadCSV(`${survey.title.replace(/[^\w-]+/g, '_')}_responses.csv`, csv)
  }

  const downloadTemplate = () => {
    const csv = buildResponsesTemplateCSV(survey)
    downloadCSV(`${survey.title.replace(/[^\w-]+/g, '_')}_template.csv`, csv)
    toast.info('Template ter-download. Isi kolom-kolomnya, lalu klik "Import CSV".')
  }

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = String(ev.target.result || '')
        const res = importResponsesFromCSV(survey, text)
        if (res.errors.length > 0) {
          toast.warning(res.errors.join(' · '))
        }
        if (res.added > 0) {
          toast.success(`${res.added} respons ter-import (${res.skipped} dilewati)`)
          onImported?.()
        } else {
          toast.error('Tidak ada respons yang berhasil di-import')
        }
      } catch (err) {
        toast.error('Gagal parse CSV')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Aggregate per-section means
  const sectionStats = useMemo(() => {
    const acc = {}
    for (const r of responses) {
      const sc = scoreResponseBySections(survey, r)
      for (const [sec, val] of Object.entries(sc)) {
        if (val.mean === null) continue
        if (!acc[sec]) acc[sec] = []
        acc[sec].push(val.mean)
      }
    }
    return Object.entries(acc).map(([sec, arr]) => ({
      section: sec,
      n: arr.length,
      mean: arr.reduce((s, v) => s + v, 0) / arr.length,
    }))
  }, [survey, responses])

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept=".csv,text/csv"
      className="hidden"
      onChange={handleImportFile}
    />
  )

  if (responses.length === 0) {
    return (
      <div className="space-y-3">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <ListChecks className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-4">
            Belum ada respons. Pilih cara mengisi:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="text-xs text-gray-400 self-center">Cara 1:</span>
            <span className="text-xs text-gray-700 self-center">Buka tab <strong>Preview & Isi</strong> untuk isi manual</span>
          </div>
          <div className="my-3 text-xs text-gray-300">— atau —</div>
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={downloadTemplate} className="btn-secondary text-xs py-1.5">
              <Download className="w-3.5 h-3.5" /> Download Template CSV
            </button>
            <button onClick={() => fileRef.current?.click()} className="btn-primary text-xs py-1.5">
              <Upload className="w-3.5 h-3.5" /> Import Respons (CSV)
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 max-w-md mx-auto">
            Tip: download template dulu untuk lihat format kolom yang dibutuhkan, isi pakai Excel/Google Sheets, lalu upload kembali.
          </p>
        </div>
        {fileInput}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {fileInput}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium mr-2">{responses.length} respons</span>
        <button onClick={exportCSV} className="btn-secondary text-xs py-1.5">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
        <button onClick={downloadTemplate} className="btn-ghost text-xs py-1.5" title="Download CSV kosong sesuai struktur kuesioner">
          <FileText className="w-3.5 h-3.5" /> Template
        </button>
        <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs py-1.5" title="Tambah respons dari file CSV">
          <Upload className="w-3.5 h-3.5" /> Import CSV
        </button>
        <button onClick={onAnalyze} className="btn-primary text-xs py-1.5">
          <BarChart3 className="w-3.5 h-3.5" /> Analisis di Statistik
        </button>
        <button onClick={() => setShowRaw(s => !s)} className="btn-ghost text-xs py-1.5">
          {showRaw ? 'Sembunyikan' : 'Lihat'} matrix
        </button>
        <div className="flex-1" />
        <button onClick={onClearAll} className="text-xs text-red-600 hover:text-red-700">
          <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Hapus semua
        </button>
      </div>

      {/* Section means */}
      {sectionStats.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <h4 className="text-sm font-semibold mb-2">Rata-rata Skor per Bagian (Likert/Rating)</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {sectionStats.map(s => (
              <div key={s.section} className="bg-sky-50/50 border border-sky-100 rounded-lg p-2">
                <div className="text-[11px] text-gray-500 truncate" title={s.section}>{s.section}</div>
                <div className="text-lg font-bold text-sky-700">{s.mean.toFixed(2)}</div>
                <div className="text-[10px] text-gray-400">n = {s.n}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-respondent list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['#', 'Nama', 'Waktu', 'Item terisi', ''].map(h =>
                <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-600">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {responses.map((r, i) => {
              const filled = Object.keys(r.answers).filter(k => {
                const v = r.answers[k]
                return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
              }).length
              return (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{r.respondentName}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{new Date(r.submittedAt).toLocaleString('id-ID')}</td>
                  <td className="px-3 py-2 text-xs">{filled} item</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => onDelete(r.id)} className="text-gray-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showRaw && (
        <div className="bg-white border border-gray-200 rounded-xl p-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>{matrix.headers.map(h => <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {matrix.rows.map((row, i) => (
                <tr key={i}>{row.map((c, j) => <td key={j} className="px-2 py-1">{String(c ?? '')}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============================================================
// AI Generate Modal — form input + call AI + preview hasil
// ============================================================
function AIGenerateModal({ open, onClose, onResult }) {
  const [mode, setMode] = useState('quick') // 'quick' | 'blueprint'
  const [topic, setTopic] = useState('')
  const [variable, setVariable] = useState('')
  const [dimensions, setDimensions] = useState('')
  const [scale, setScale] = useState(5)
  const [itemsPerDimension, setItemsPerDimension] = useState(5)
  const [includeDemografi, setIncludeDemografi] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null) // { survey, blueprint, provider }

  function reset() {
    setMode('quick')
    setTopic(''); setVariable(''); setDimensions('')
    setScale(5); setItemsPerDimension(5); setIncludeDemografi(false)
    setPreview(null); setLoading(false)
  }

  async function handleGenerate() {
    if (!topic.trim() && !variable.trim()) {
      toast.warning('Isi topik atau variabel dulu')
      return
    }
    setLoading(true)
    setPreview(null)
    try {
      const result = await generateKuesionerAI({
        mode, topic, variable, dimensions,
        scale: Number(scale),
        itemsPerDimension: Number(itemsPerDimension),
        includeDemografi,
      })
      setPreview(result)
    } catch (e) {
      toast.error(`Gagal generate: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  function handleUse() {
    if (!preview?.survey) return
    onResult(preview.survey)
    reset()
  }

  function handleClose() {
    if (loading) return
    reset()
    onClose?.()
  }

  if (!open) return null

  const totalItems = preview?.survey
    ? preview.survey.sections.reduce((n, s) => n + s.items.length, 0)
    : 0

  return (
    <Modal open={open} onClose={handleClose}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center">
            <Wand2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Generate Kuesioner dengan AI</h3>
            <p className="text-xs text-gray-500">Powered by OpenRouter / Groq / Kimi</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          disabled={loading}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto">
        {/* Mode tabs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { if (mode !== 'quick') { setMode('quick'); setPreview(null) } }}
            disabled={loading}
            className={`p-3 rounded-lg border-2 text-left transition-colors ${
              mode === 'quick'
                ? 'border-accent bg-surface'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Wand2 className="w-4 h-4 text-accent" />
              <span className="font-semibold text-sm">Quick Generate</span>
            </div>
            <div className="text-xs text-gray-600">Cepat — cukup deskripsi topik, AI buatkan items.</div>
          </button>
          <button
            onClick={() => { if (mode !== 'blueprint') { setMode('blueprint'); setPreview(null) } }}
            disabled={loading}
            className={`p-3 rounded-lg border-2 text-left transition-colors ${
              mode === 'blueprint'
                ? 'border-accent bg-surface'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-accent" />
              <span className="font-semibold text-sm">Blueprint + Items</span>
            </div>
            <div className="text-xs text-gray-600">Lengkap — definisi operasional, indikator, kisi-kisi (untuk skripsi).</div>
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3">
          {mode === 'quick' ? (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Topik penelitian *</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Mis. Kepuasan layanan perpustakaan kampus"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                disabled={loading}
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Variabel utama *</label>
              <input
                type="text"
                value={variable}
                onChange={e => setVariable(e.target.value)}
                placeholder="Mis. Kepuasan kerja, Motivasi belajar, Self-efficacy"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Dimensi (opsional, pisahkan dengan koma)
            </label>
            <input
              type="text"
              value={dimensions}
              onChange={e => setDimensions(e.target.value)}
              placeholder="Mis. Tangibles, Reliability, Responsiveness, Assurance, Empathy"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              disabled={loading}
            />
            <p className="text-[10px] text-gray-500 mt-1">Kosongkan untuk biarkan AI menentukan dimensi berdasarkan teori.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Skala Likert</label>
              <select
                value={scale}
                onChange={e => setScale(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                disabled={loading}
              >
                <option value={4}>4 poin</option>
                <option value={5}>5 poin (STS-SS)</option>
                <option value={6}>6 poin</option>
                <option value={7}>7 poin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Item per dimensi</label>
              <select
                value={itemsPerDimension}
                onChange={e => setItemsPerDimension(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                disabled={loading}
              >
                {[3, 4, 5, 6, 7, 8, 10].map(n => (
                  <option key={n} value={n}>{n} item</option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDemografi}
              onChange={e => setIncludeDemografi(e.target.checked)}
              disabled={loading}
              className="rounded"
            />
            Sertakan section demografi (Jenis Kelamin, Usia, dll.)
          </label>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleGenerate}
            disabled={loading || (!topic.trim() && !variable.trim())}
            className="flex-1 bg-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 px-4 flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating... (~10-30 detik)
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" /> {preview ? 'Generate Ulang' : 'Generate Sekarang'}
              </>
            )}
          </button>
        </div>

        {/* Preview */}
        {preview && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-sm text-gray-900">{preview.survey.title}</div>
                <div className="text-xs text-gray-600 mt-0.5">{preview.survey.description}</div>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                {preview.survey.sections.length} bagian · {totalItems} item
              </span>
            </div>

            {preview.blueprint && (
              <div className="bg-surface border border-border rounded-lg p-3 text-xs space-y-1.5">
                <div className="font-semibold text-fg flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> Blueprint Penelitian
                </div>
                {preview.blueprint.teoriRujukan && (
                  <div><span className="font-medium">Teori rujukan:</span> {preview.blueprint.teoriRujukan}</div>
                )}
                {preview.blueprint.definisiOperasional && (
                  <div><span className="font-medium">Definisi operasional:</span> {preview.blueprint.definisiOperasional}</div>
                )}
                {preview.blueprint.dimensions?.length > 0 && (
                  <div>
                    <div className="font-medium mb-0.5">Dimensi & Indikator:</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {preview.blueprint.dimensions.map((d, i) => (
                        <li key={i}>
                          <span className="font-medium">{d.name}</span>
                          {d.indicators?.length > 0 && (
                            <span className="text-gray-700"> — {d.indicators.join('; ')}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {preview.survey.sections.map((sec, si) => (
                <div key={si} className="bg-white border border-gray-200 rounded p-2.5">
                  <div className="font-semibold text-sm text-gray-900">{sec.title}</div>
                  {sec.description && <div className="text-xs text-gray-500 mb-1.5">{sec.description}</div>}
                  <ol className="list-decimal pl-5 text-xs text-gray-700 space-y-0.5">
                    {sec.items.slice(0, 8).map((it, ii) => (
                      <li key={ii}>
                        {it.label}
                        {it.reverseCoded && <span className="ml-1 text-amber-600 text-[10px] font-bold">(R)</span>}
                      </li>
                    ))}
                    {sec.items.length > 8 && (
                      <li className="text-gray-400 italic list-none">…dan {sec.items.length - 8} item lainnya</li>
                    )}
                  </ol>
                </div>
              ))}
            </div>

            {preview.provider && (
              <div className="text-[10px] text-gray-400 italic">Generated via {preview.provider}</div>
            )}

            <button
              onClick={handleUse}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg py-2.5 px-4 flex items-center justify-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" /> Pakai Kuesioner Ini
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ============================================================
// Regenerate Section — tombol AI di tiap section builder
// ============================================================
function RegenerateSection({ surveyTitle, section, onApply, onAppend }) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(5)
  const [scale, setScale] = useState(5)
  const [loading, setLoading] = useState(false)

  // Detect dominant scale from existing items
  useEffect(() => {
    if (open && section.items?.length > 0) {
      const likertItems = section.items.filter(it => it.type === 'likert')
      if (likertItems.length > 0 && likertItems[0].scale) {
        setScale(likertItems[0].scale)
      }
    }
    
  }, [open])

  async function generate(mode /* 'replace' | 'append' */) {
    if (!section.title?.trim()) {
      toast.warning('Judul bagian masih kosong. Isi dulu sebelum generate.')
      return
    }
    setLoading(true)
    try {
      const result = await generateKuesionerAI({
        mode: 'quick',
        topic: surveyTitle || section.title,
        variable: section.title,
        dimensions: section.title, // 1 dimensi saja
        scale: Number(scale),
        itemsPerDimension: Number(count),
        includeDemografi: false,
      })
      // Ambil items dari section pertama (non-demografi)
      const firstSec = result.survey.sections.find(s =>
        !/demograf/i.test(s.title) && s.items.length > 0
      ) || result.survey.sections[0]
      const newItems = firstSec?.items || []
      if (newItems.length === 0) {
        toast.error('AI tidak menghasilkan item. Coba lagi.')
        return
      }
      if (mode === 'replace') {
        if (section.items.length > 0 &&
            !confirm(`Ganti ${section.items.length} item lama dengan ${newItems.length} item baru?`)) {
          return
        }
        onApply(newItems)
        toast.success(`${newItems.length} item baru menggantikan items lama.`)
      } else {
        onAppend(newItems)
        toast.success(`${newItems.length} item baru ditambahkan.`)
      }
      setOpen(false)
    } catch (e) {
      toast.error(`Generate gagal: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-surface border border-border text-fg hover:bg-card font-medium transition-colors"
        title={`Generate items pakai AI untuk dimensi "${section.title}"`}
      >
        <Wand2 className="w-3.5 h-3.5" /> Regenerate dengan AI
      </button>
    )
  }

  return (
    <div className="mb-3 rounded-lg border-2 border-border bg-surface/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-fg flex items-center gap-1.5">
          <Wand2 className="w-3.5 h-3.5" /> Generate items AI untuk: <span className="italic">"{section.title || '(belum ada judul)'}"</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          disabled={loading}
          className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-[10px] text-gray-600 mb-0.5">Jumlah item</label>
          <select
            value={count}
            onChange={e => setCount(Number(e.target.value))}
            disabled={loading}
            className="border border-gray-300 rounded px-2 py-1 text-xs"
          >
            {[3, 4, 5, 6, 7, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-gray-600 mb-0.5">Skala</label>
          <select
            value={scale}
            onChange={e => setScale(Number(e.target.value))}
            disabled={loading}
            className="border border-gray-300 rounded px-2 py-1 text-xs"
          >
            {[4, 5, 6, 7].map(n => <option key={n} value={n}>{n}-poin</option>)}
          </select>
        </div>
        <div className="flex gap-1.5 ml-auto">
          <button
            onClick={() => generate('append')}
            disabled={loading}
            className="text-xs px-2.5 py-1.5 rounded-md bg-white hover:bg-surface border border-border text-fg font-medium disabled:opacity-50 flex items-center gap-1"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Tambah
          </button>
          <button
            onClick={() => generate('replace')}
            disabled={loading}
            className="text-xs px-2.5 py-1.5 rounded-md bg-accent hover:opacity-90 text-white font-semibold disabled:opacity-50 flex items-center gap-1"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            Ganti Semua
          </button>
        </div>
      </div>
      <p className="text-[10px] text-gray-600 leading-relaxed">
        AI akan generate item Likert berdasarkan judul bagian sebagai dimensi. Konteks topik diambil dari judul kuesioner.
      </p>
    </div>
  )
}

// ============================================================
// Blueprint Card — display untuk survey._blueprint (AI mode Blueprint)
// ============================================================
function BlueprintCard({ blueprint }) {
  const [open, setOpen] = useState(true)
  const hasContent = blueprint && (
    blueprint.teoriRujukan || blueprint.definisiOperasional ||
    (Array.isArray(blueprint.dimensions) && blueprint.dimensions.length > 0)
  )
  if (!hasContent) return null

  function copyBlueprint() {
    const lines = []
    lines.push('=== BLUEPRINT PENELITIAN ===')
    if (blueprint.teoriRujukan) lines.push(`Teori Rujukan: ${blueprint.teoriRujukan}`)
    if (blueprint.definisiOperasional) lines.push(`\nDefinisi Operasional:\n${blueprint.definisiOperasional}`)
    if (blueprint.dimensions?.length > 0) {
      lines.push('\nDimensi & Indikator:')
      blueprint.dimensions.forEach((d, i) => {
        lines.push(`${i + 1}. ${d.name}`)
        if (d.definition) lines.push(`   Definisi: ${d.definition}`)
        if (d.indicators?.length > 0) {
          lines.push(`   Indikator: ${d.indicators.join('; ')}`)
        }
      })
    }
    const text = lines.join('\n')
    navigator.clipboard?.writeText(text)
      .then(() => toast.success('Blueprint disalin ke clipboard'))
      .catch(() => toast.error('Gagal menyalin'))
  }

  return (
    <div className="bg-surface border-2 border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-white/40 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-surface0 text-white flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-fg flex items-center gap-2">
            Blueprint Penelitian
            <span className="text-[10px] uppercase tracking-wide bg-accent/10 text-accent px-1.5 py-0.5 rounded font-bold">AI Generated</span>
          </div>
          <div className="text-xs text-fg truncate">
            {blueprint.dimensions?.length > 0
              ? `${blueprint.dimensions.length} dimensi · ${blueprint.dimensions.reduce((n, d) => n + (d.indicators?.length || 0), 0)} indikator`
              : 'Klik untuk lihat'}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); copyBlueprint() }}
          className="p-1.5 rounded hover:bg-white/50 text-fg"
          title="Copy blueprint ke clipboard"
        >
          <Copy className="w-4 h-4" />
        </button>
        {open ? <ChevronUp className="w-4 h-4 text-accent" /> : <ChevronDown className="w-4 h-4 text-accent" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 text-sm">
          {blueprint.teoriRujukan && (
            <div>
              <div className="text-[10px] uppercase tracking-wide font-bold text-accent mb-0.5">Teori Rujukan</div>
              <p className="text-gray-800">{blueprint.teoriRujukan}</p>
            </div>
          )}
          {blueprint.definisiOperasional && (
            <div>
              <div className="text-[10px] uppercase tracking-wide font-bold text-accent mb-0.5">Definisi Operasional</div>
              <p className="text-gray-800 leading-relaxed">{blueprint.definisiOperasional}</p>
            </div>
          )}
          {blueprint.dimensions?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide font-bold text-accent mb-1">Dimensi & Indikator</div>
              <div className="space-y-2">
                {blueprint.dimensions.map((d, i) => (
                  <div key={i} className="bg-white/70 border border-border rounded-lg p-2.5">
                    <div className="font-semibold text-gray-900">{i + 1}. {d.name}</div>
                    {d.definition && (
                      <div className="text-xs text-gray-600 italic mt-0.5">{d.definition}</div>
                    )}
                    {d.indicators?.length > 0 && (
                      <ul className="mt-1.5 ml-4 list-disc text-xs text-gray-700 space-y-0.5">
                        {d.indicators.map((ind, ii) => <li key={ii}>{ind}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-[10px] text-accent italic pt-1 border-t border-border">
            💡 Blueprint ini bisa kamu copy-paste langsung ke BAB 3 skripsi (Definisi Operasional, Kisi-kisi Instrumen).
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Citation Banner — untuk survey dari instrumen teruji
// ============================================================
function CitationBanner({ meta }) {
  function copyCitation() {
    navigator.clipboard?.writeText(meta.citation)
      .then(() => toast.success('Sitasi disalin ke clipboard'))
      .catch(() => toast.error('Gagal menyalin'))
  }
  return (
    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
        <BookOpen className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-emerald-900 uppercase tracking-wide mb-0.5">
          Instrumen Teruji — Wajib Cantumkan Sitasi
        </div>
        <div className="text-sm text-gray-800 leading-snug">{meta.citation}</div>
        {(meta.domain || meta.dimensions || meta.items) && (
          <div className="text-[11px] text-emerald-700 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {meta.domain && <span><strong>Domain:</strong> {meta.domain}</span>}
            {meta.dimensions && <span><strong>Dimensi:</strong> {meta.dimensions}</span>}
            {meta.items && <span><strong>Items:</strong> {meta.items}</span>}
          </div>
        )}
      </div>
      <button
        onClick={copyCitation}
        className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700 flex-shrink-0"
        title="Copy sitasi ke clipboard"
      >
        <Copy className="w-4 h-4" />
      </button>
    </div>
  )
}

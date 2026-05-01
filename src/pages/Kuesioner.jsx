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
  ClipboardList, ArrowRight, Check, BookOpen,
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
  const importInputRef = useRef(null)

  // Load surveys on mount — TIDAK auto-create. Kalau kosong, tampilkan wizard.
  useEffect(() => {
    const all = listSurveys()
    setSurveys(all)
    if (all.length > 0) {
      setActiveId(all[0].id)
      setDraft(all[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            onClick={handleLoadDemo}
            className="w-full text-xs py-2 px-3 rounded-lg bg-gradient-to-r from-violet-50 to-fuchsia-50 hover:from-violet-100 hover:to-fuchsia-100 border border-violet-200 text-violet-700 font-medium transition-colors flex items-center justify-center gap-1.5"
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
function WelcomeWizard({ onDemo, onTemplate, onBlank, onImport }) {
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
          className="text-left bg-gradient-to-br from-violet-50 to-fuchsia-50 hover:from-violet-100 hover:to-fuchsia-100 border-2 border-violet-200 rounded-xl p-5 transition-colors group"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            <span className="font-semibold text-violet-900">Coba Data Demo</span>
            <span className="ml-auto text-[10px] uppercase tracking-wide bg-violet-200 text-violet-800 px-1.5 py-0.5 rounded font-bold">Rekomendasi</span>
          </div>
          <p className="text-xs text-violet-800 leading-relaxed">
            Lihat seperti apa hasil akhirnya. Kami bikinkan kuesioner motivasi belajar lengkap dengan 15 responden,
            siap untuk diuji Cronbach α & validitas.
          </p>
          <div className="mt-3 text-xs font-medium text-violet-700 flex items-center gap-1 group-hover:gap-2 transition-all">
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

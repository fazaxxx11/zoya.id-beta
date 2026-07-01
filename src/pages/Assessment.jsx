import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ChevronLeft, Plus, Trash2, FileText, Users, ClipboardCheck, Award,
  Upload, CheckCircle, AlertCircle, Loader2, ArrowRight, RotateCcw, Download,
  FileSpreadsheet, Pencil, FileCheck, Wand2, RefreshCw, Save, FolderOpen,
  TrendingUp, ArrowUpDown, Filter, Edit3, X, ListChecks,
} from 'lucide-react'
import { parseStudentFile, getSupportedFormats } from '../lib/fileParser'
import { saveOrder, getOrders, generateOrderId } from '../lib/orders'
import { getCurrentUser, isAdmin } from '../lib/auth'
import { getWallet, deductWalletAndCreateOrder } from '../lib/wallet'
import { trackEvent } from '../lib/analytics'
import { getAssessmentPriceWithDiscount, formatIDR } from '../lib/pricing'
import PriceDisplay from '../components/PriceDisplay'
import ConfirmPaymentModal from '../components/ConfirmPaymentModal'
import RubrikAIModal from '../components/RubrikAIModal'
import RubrikTemplateModal from '../components/RubrikTemplateModal'
import PageHeader from '../components/PageHeader'
import { saveTemplate as saveRubrikTemplate } from '../lib/rubrikTemplates'
import { toast } from '../lib/toast'
import { createFuzzySearch } from '../lib/fuzzySearch'
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts'
// XLSX lazy-loaded on export

// Endpoints sama untuk dev & prod (server.js delegate ke api/assess.js)
const API_ENDPOINTS = ['/api/assess', 'http://localhost:3000/api/assess']

/**
 * Call /api/assess untuk satu siswa. Try multiple endpoints, return first success.
 * Pemakaian: re-grade per siswa di HasilPenilaian, dan batch loop di assess().
 */
async function assessOneStudent({ student, rubrik, title, context }) {
  let lastErr = null
  for (const API of API_ENDPOINTS) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rubrik: rubrik.map(k => ({ id: k.id, nama: k.nama, deskripsi: k.deskripsi, bobot: Number(k.bobot) || 0 })),
          jawaban: student.answer,
          studentName: student.name,
          title,
          context,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
      return { scores: data.scores, kesimpulan: data.kesimpulan }
    } catch (e) {
      lastErr = e
      console.log(`API ${API} failed:`, e.message)
    }
  }
  throw lastErr || new Error('All API endpoints failed')
}

// Export to Excel function
function exportToExcel(results, rubrik, title) {
  // Calculate total scores for each student
  const calculateTotal = (scores) => {
    if (!scores) return 0;
    let total = 0, tw = 0;
    rubrik.forEach(k => { if(scores[k.id]?.skor){total+=scores[k.id].skor*k.bobot; tw+=k.bobot} });
    return tw > 0 ? (total/tw).toFixed(1) : 0;
  };

  // Get status based on score
  const getStatus = (score) => {
    const s = parseFloat(score);
    if (s >= 8) return 'Sangat Baik';
    if (s >= 7) return 'Baik';
    if (s >= 6) return 'Cukup';
    if (s >= 5) return 'Perbaikan';
    return 'Tidak Lulus';
  };

  // Helper to create cell with string format (preserves leading zeros)
  const createTextCell = (value) => ({ t: 's', v: String(value), z: '@' });

  // Sheet 1: Ringkasan Kelas
  const summaryData = results.map((r, i) => {
    const totalScore = calculateTotal(r.scores);
    return {
      'No': i + 1,
      'Nama Siswa': r.name,
      'Nilai Total': totalScore,
      'Status': getStatus(totalScore),
      'Kesimpulan': r.kesimpulan || ''
    };
  });

  // Add summary row
  const avgScore = results.length > 0 
    ? (results.reduce((sum, r) => sum + parseFloat(calculateTotal(r.scores) || 0), 0) / results.length).toFixed(1)
    : 0;
  summaryData.push({
    'No': '',
    'Nama Siswa': 'RATA-RATA',
    'Nilai Total': avgScore,
    'Status': getStatus(avgScore),
    'Kesimpulan': ''
  });

  // Sheet 2: Template Import (Google Classroom / Moodle compatible)
  const importData = results.map((r, i) => ({
    'Student ID': createTextCell(`S${String(i+1).padStart(4, '0')}`),
    'Nama': r.name,
    'Nilai (0-10)': calculateTotal(r.scores),
    'Nilai (%)': `${Math.round(calculateTotal(r.scores) * 10)}%`,
    'Status': getStatus(calculateTotal(r.scores))
  }));

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Ringkasan
  const ws1 = XLSX.utils.json_to_sheet(summaryData);
  
  // Set column widths
  ws1['!cols'] = [
    { wch: 5 },   // No
    { wch: 25 },  // Nama
    { wch: 12 },  // Nilai
    { wch: 12 },  // Status
    { wch: 50 }   // Kesimpulan
  ];
  
  // Style header row (Row 1) - Blue + Bold
  const headerRow = 1;
  ['A', 'B', 'C', 'D', 'E'].forEach(col => {
    const cellRef = col + headerRow;
    if (ws1[cellRef]) {
      ws1[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F81BD" } },
        alignment: { horizontal: "center" }
      };
    }
  });
  
  XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan Kelas');

  // Sheet 2: Template Import
  const ws2 = XLSX.utils.json_to_sheet(importData);
  ws2['!cols'] = [
    { wch: 12 },  // Student ID
    { wch: 25 },  // Nama
    { wch: 12 },  // Nilai 0-10
    { wch: 10 },  // Nilai %
    { wch: 12 }   // Status
  ];
  
  // Style header row for Sheet 2
  ['A', 'B', 'C', 'D', 'E'].forEach(col => {
    const cellRef = col + headerRow;
    if (ws2[cellRef]) {
      ws2[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F81BD" } },
        alignment: { horizontal: "center" }
      };
    }
  });
  
  XLSX.utils.book_append_sheet(wb, ws2, 'Template Import');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0,10);
  const filename = `${title || 'Assessment'}_${timestamp}.xlsx`;

  // Download
  XLSX.writeFile(wb, filename);
}

function usePersist(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);

  return [state, setState];
}

const uid = () => Math.random().toString(36).slice(2, 8);

// Export hasil parsing ke Excel supaya user bisa edit manual di spreadsheet,
// lalu upload ulang via tombol "Ganti". Mengatasi friction parsing PDF/Word
// yang nama/jawaban-nya sering perlu koreksi manual.
function exportPreviewToExcel(students) {
  try {
    const rows = students.map((s, i) => ({
      'No': i + 1,
      'Nama Siswa': s.name || '',
      'Jawaban': s.answer || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows, { header: ['No', 'Nama Siswa', 'Jawaban'] })
    ws['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 90 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Edit Jawaban')
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    XLSX.writeFile(wb, `parsing-edit-${stamp}.xlsx`)
    toast.success('Excel terdownload. Edit lalu klik "Ganti" untuk upload ulang.')
  } catch (e) {
    toast.error('Gagal export Excel: ' + e.message)
  }
}

// Rubrik Builder
function RubrikBuilder({ rubrik, setRubrik, onNext, title, setTitle, context, setContext }) {
  const [aiOpen, setAiOpen] = useState(false)
  const [tplOpen, setTplOpen] = useState(false)
  const addKriteria = () => setRubrik(r => [...r, { id: uid(), nama: "", deskripsi: "", bobot: 10 }]);
  const del = (id) => setRubrik(r => r.filter(x => x.id !== id));
  const upd = (id, f, v) => setRubrik(r => r.map(x => x.id === id ? { ...x, [f]: v } : x));
  const totalBobot = rubrik.reduce((s, r) => s + Number(r.bobot || 0), 0);
  const canNext = title && rubrik.length > 0 && rubrik.every(r => r.nama);
  const hasExistingRubrik = rubrik.some(r => r.nama || r.deskripsi)

  // Konfirmasi sebelum replace rubrik existing yang sudah diisi
  const handleAIApply = (newRubrik) => {
    if (hasExistingRubrik) {
      if (!confirm('Rubrik existing akan diganti dengan hasil AI. Lanjutkan?')) return
    }
    setRubrik(newRubrik)
  }

  /** Apply template: replace title + context + rubrik. ID ditambahkan supaya unique. */
  const handleApplyTemplate = (tpl) => {
    if (tpl.title) setTitle(tpl.title)
    if (tpl.context) setContext(tpl.context)
    setRubrik(tpl.kriteria.map(k => ({ id: uid(), ...k })))
    toast.success(`Template "${tpl.name}" diterapkan`)
  }

  /** Save current rubrik sebagai template — minta nama via prompt sederhana. */
  const handleSaveTemplate = () => {
    if (!rubrik.length || !rubrik[0].nama) {
      toast.error('Isi minimal 1 kriteria sebelum simpan template')
      return
    }
    const name = prompt('Nama template:', title || 'Template Saya')
    if (!name) return
    try {
      saveRubrikTemplate({ name, title, context, kriteria: rubrik })
      toast.success(`Template "${name}" tersimpan`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  /** Auto-normalize bobot ke total 100% dengan distribusi proporsional. */
  const handleNormalize = () => {
    if (totalBobot === 0) {
      // Distribusi merata kalau semua 0
      const each = Math.round(100 / rubrik.length)
      const remainder = 100 - (each * rubrik.length)
      setRubrik(r => r.map((k, i) => ({ ...k, bobot: i === 0 ? each + remainder : each })))
    } else {
      // Scale proporsional
      const factor = 100 / totalBobot
      setRubrik(r => r.map(k => ({ ...k, bobot: Math.round((Number(k.bobot) || 0) * factor) })))
    }
    toast.success('Bobot dinormalisasi ke 100%')
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl shadow-sm p-6 border border-border hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-accent/15 rounded-xl flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-fg/85">Buat Rubrik Penilaian</h2>
            <p className="text-sm text-muted">Tentukan kriteria dan bobot penilaian</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTplOpen(true)}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border hover:bg-accent/10 hover:border-accent/50 transition-colors flex items-center gap-1.5 text-fg/80"
              title="Buka library template"
            >
              <FolderOpen className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Template</span>
            </button>
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={!hasExistingRubrik}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border hover:bg-emerald-500/10 hover:border-emerald-400 transition-colors flex items-center gap-1.5 text-fg/80 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Simpan rubrik ini sebagai template"
            >
              <Save className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Simpan</span>
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Judul / Nama Tugas</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="cth: Penilaian Proposal Skripsi" className="input-field" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Konteks Penilaian</label>
            <textarea value={context} onChange={e => setContext(e.target.value)}
              placeholder="Jelaskan konteks..." rows={2} className="input-field resize-none" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm p-6 border border-border hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div>
            <h3 className="font-semibold text-fg/85">Kriteria Penilaian</h3>
            <p className="text-xs text-muted mt-0.5">Total bobot harus 100%</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleNormalize}
              disabled={totalBobot === 100 || rubrik.length === 0}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                totalBobot === 100
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
              title={totalBobot === 100 ? 'Total bobot sudah 100%' : 'Klik untuk auto-normalisasi ke 100%'}
            >
              Total: {totalBobot}% {totalBobot !== 100 && rubrik.length > 0 && '→ normalkan'}
            </button>
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-accent text-white transition-all flex items-center gap-1.5"
              title="Buatkan rubrik dengan AI"
            >
              <Wand2 className="w-3.5 h-3.5" /> Auto-Buat
            </button>
            <button onClick={addKriteria} className="btn-secondary text-xs">+ Tambah</button>
          </div>
        </div>

        <div className="space-y-4">
          {rubrik.map((kr, i) => (
            <div key={kr.id} className="bg-surface rounded-xl p-4">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-accent">Kriteria #{i+1}</span>
                <button onClick={() => del(kr.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <input type="text" value={kr.nama} onChange={e => upd(kr.id, "nama", e.target.value)}
                  placeholder="Nama kriteria" className="col-span-3 input-field text-sm" />
                <input type="number" value={kr.bobot} onChange={e => upd(kr.id, "bobot", e.target.value)}
                  className="input-field text-sm text-center" placeholder="%" />
              </div>
              <textarea value={kr.deskripsi} onChange={e => upd(kr.id, "deskripsi", e.target.value)}
                placeholder="Deskripsi..." rows={2} className="input-field text-sm mt-2 resize-none" />
            </div>
          ))}
        </div>
      </div>

      <button onClick={onNext} disabled={!canNext} className="btn-primary w-full">
        Lanjut ke Input Jawaban <ArrowRight className="w-5 h-5 inline ml-2"/>
      </button>

      <RubrikAIModal open={aiOpen} onClose={() => setAiOpen(false)} onApply={handleAIApply} />
      <RubrikTemplateModal
        open={tplOpen}
        onClose={() => setTplOpen(false)}
        onApply={handleApplyTemplate}
        hasExisting={hasExistingRubrik}
      />
    </div>
  );
}

// Input Jawaban
function InputJawaban({ rubrik, title, onBack, onAssess, onPayment, students, setStudents, pricing }) {
  // Default ke 'file' karena ini primary use case (most teachers grade 20+ siswa from spreadsheet/Form export)
  const [inputMode, setInputMode] = useState('file')
  const [fileData, setFileData] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewConfirmed, setPreviewConfirmed] = useState(false) // Sudah konfirmasi preview belum
  const [animKey, setAnimKey] = useState(0)        // bump untuk re-trigger fade-in saat ganti mode
  const [dragOver, setDragOver] = useState(false)  // visual feedback saat drag file
  const [studentSearch, setStudentSearch] = useState('')
  const fileInputRef = useRef(null)

  const addStudent = () => setStudents(s => [...s, { id: uid(), name: "", answer: "" }]);
  const del = (id) => setStudents(s => s.filter(x => x.id !== id));
  const upd = (id, f, v) => setStudents(s => s.map(x => x.id === id ? { ...x, [f]: v } : x));

  const processFile = async (file) => {
    if (!file) return
    try {
      const parsed = await parseStudentFile(file)
      if (parsed.length === 0) { toast.error('Tidak ada data terdeteksi di file'); return; }

      // Check for warnings
      if (parsed[0]?.isWarning) {
        toast.warning(parsed[0].answer)
      }

      // Always show preview first after file upload
      setStudents(parsed)
      setFileData({ filename: file.name, count: parsed.length })
      setPreviewConfirmed(false)
      setShowPreview(true)
    } catch (err) { toast.error('Gagal parse: ' + err.message); }
  }

  const handleFileUpload = (e) => processFile(e.target.files[0])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleConfirmPreview = () => {
    setShowPreview(false)
    setPreviewConfirmed(true)
  }

  // Allow assessment if at least 1 student has name & answer
  const hasStudents = students.length > 0 && students.some(s => s.name && s.answer)

  // Fuzzy filter students for search
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students
    const fuse = createFuzzySearch(students, ['name', 'answer'])
    return fuse.search(studentSearch).map(r => r.item)
  }, [students, studentSearch])

  // File mode needs preview confirmation first
  const canAssess = inputMode === 'manual'
    ? hasStudents
    : (fileData && previewConfirmed && hasStudents)

  // Reset when switching mode — bump animKey untuk trigger fade-in transition
  const handleModeChange = (mode) => {
    if (mode === inputMode) return
    setInputMode(mode)
    setAnimKey(k => k + 1)
    if (mode === 'manual') {
      setPreviewConfirmed(false)
      setShowPreview(false)
      // Manual mode: kalau students kosong/single empty, reset ke template 1 row
      if (students.length === 0) {
        setStudents([{ id: uid(), name: "", answer: "" }])
      }
    } else if (mode === 'file') {
      // Switching ke file: kalau ada manual data, jangan dihapus tapi reset file state
      // supaya user bisa pilih file fresh.
      setFileData(null)
      setShowPreview(false)
      setPreviewConfirmed(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-accent/10 rounded-xl p-4 border border-accent/20">
        <span className="font-medium text-accent">Rubrik: {title}</span>
        <div className="flex gap-2 mt-2">
          {rubrik.map(k => <span key={k.id} className="bg-card px-2 py-1 rounded text-xs">{k.nama} ({k.bobot}%)</span>)}
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm p-5 sm:p-6 border border-border">
        <h3 className="font-semibold text-fg/85 mb-1">Input Jawaban Murid</h3>
        <p className="text-xs text-muted mb-4">Pilih cara input yang paling cocok. Bisa ganti kapan saja.</p>

        {/* === Mode picker: 2 card besar === */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-5">
          <button
            type="button"
            onClick={() => handleModeChange('file')}
            className={`group relative text-left rounded-xl p-3 sm:p-4 border-2 transition-all ${
              inputMode === 'file'
                ? 'border-accent bg-accent/10 shadow-sm'
                : 'border-border bg-card hover:border-border hover:bg-surface'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 transition-colors ${
              inputMode === 'file' ? 'bg-accent/100 text-white' : 'bg-surface text-muted'
            }`}>
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="font-semibold text-sm text-fg/85 flex items-center gap-1.5">
              Upload File
              {inputMode === 'file' && <span className="text-[10px] uppercase tracking-wide bg-accent/100 text-white px-1.5 py-0.5 rounded">aktif</span>}
            </div>
            <div className="text-[11px] text-muted mt-0.5 leading-snug">Excel, CSV, PDF, Word — banyak siswa sekaligus</div>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('manual')}
            className={`group relative text-left rounded-xl p-3 sm:p-4 border-2 transition-all ${
              inputMode === 'manual'
                ? 'border-accent bg-accent/10 shadow-sm'
                : 'border-border bg-card hover:border-border hover:bg-surface'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 transition-colors ${
              inputMode === 'manual' ? 'bg-accent/100 text-white' : 'bg-surface text-muted'
            }`}>
              <Pencil className="w-5 h-5" />
            </div>
            <div className="font-semibold text-sm text-fg/85 flex items-center gap-1.5">
              Ketik Manual
              {inputMode === 'manual' && <span className="text-[10px] uppercase tracking-wide bg-accent/100 text-white px-1.5 py-0.5 rounded">aktif</span>}
            </div>
            <div className="text-[11px] text-muted mt-0.5 leading-snug">Quick demo, tugas tulis tangan, 1-3 siswa</div>
          </button>
        </div>

        {/* === Content area dengan transisi animasi === */}
        <div key={animKey} className="animate-in">
          {inputMode === 'file' && !fileData && (
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`block border-2 border-dashed rounded-xl p-8 flex flex-col items-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-accent bg-accent/10 scale-[1.01]'
                  : 'border-border hover:border-accent/50 hover:bg-accent/10/30'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-all ${
                dragOver ? 'bg-accent/100 text-white scale-110' : 'bg-accent/15 text-accent'
              }`}>
                <Upload className="w-7 h-7" />
              </div>
              <p className="font-medium text-fg/85 mb-1">
                {dragOver ? 'Lepas untuk upload' : 'Drop file di sini atau klik'}
              </p>
              <p className="text-xs text-muted mb-3">
                {getSupportedFormats().map(f => `.${f.ext}`).join(' · ')}
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted w-full max-w-sm bg-surface rounded-lg p-3 mt-2">
                <div className="flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel/CSV → kolom Nama & Jawaban</div>
                <div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-rose-600" /> Word/PDF → multi-siswa</div>
              </div>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.docx,.pdf,.txt" onChange={handleFileUpload} className="hidden"/>
            </label>
          )}

          {inputMode === 'file' && fileData && !showPreview && (
            <div className="border-2 border-emerald-300 bg-emerald-500/10 rounded-xl p-4 flex items-center gap-3 flex-wrap">
              <FileCheck className="w-6 h-6 text-emerald-600 shrink-0"/>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-emerald-900 truncate">{fileData.filename}</div>
                <div className="text-xs text-emerald-700">{fileData.count} siswa terdeteksi</div>
              </div>
              {!previewConfirmed ? (
                <button
                  onClick={() => setShowPreview(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" /> Preview Data
                </button>
              ) : (
                <span className="text-xs text-emerald-700 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/> Diverifikasi</span>
              )}
              <button
                onClick={() => { setFileData(null); setShowPreview(false); setPreviewConfirmed(false); setStudents([{ id: uid(), name: "", answer: "" }]) }}
                className="text-xs text-muted hover:text-red-600 px-2 py-1 rounded transition-colors active:scale-95"
                title="Ganti file"
              >
                Ganti
              </button>
            </div>
          )}

        {/* PREVIEW MODE — Excel-like editable grid (semua sel bisa diedit langsung) */}
        {showPreview && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 sm:p-4 mb-4">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span className="font-medium text-amber-800">Pratinjau Data</span>
              <span className="text-xs text-amber-700">— klik sel manapun untuk koreksi langsung</span>
              <span className="ml-auto text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                {students.length} baris
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-amber-200 bg-card">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-amber-100/80 sticky top-0 z-10">
                  <tr className="text-left">
                    <th className="border-b border-r border-amber-200 px-2 py-1.5 w-10 text-center text-[11px] font-semibold text-amber-900">#</th>
                    <th className="border-b border-r border-amber-200 px-2 py-1.5 w-44 sm:w-52 text-[11px] font-semibold text-amber-900">Nama Siswa</th>
                    <th className="border-b border-r border-amber-200 px-2 py-1.5 text-[11px] font-semibold text-amber-900">Jawaban</th>
                    {students.some(s => s.confidence) && (
                      <th className="border-b border-r border-amber-200 px-2 py-1.5 w-16 text-center text-[11px] font-semibold text-amber-900" title="Confidence parsing">Conf.</th>
                    )}
                    <th className="border-b border-amber-200 px-1 py-1.5 w-9 text-[11px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.id} className={i % 2 === 0 ? 'bg-card' : 'bg-amber-50/30'}>
                      <td className="border-b border-r border-amber-100 px-2 py-1 text-center text-[11px] text-muted font-mono align-top pt-2">
                        {i + 1}
                      </td>
                      <td className="border-b border-r border-amber-100 p-0 align-top">
                        <input
                          type="text"
                          value={s.name}
                          onChange={e => upd(s.id, 'name', e.target.value)}
                          placeholder="Nama"
                          className="w-full px-2 py-1.5 text-sm bg-transparent border-0 focus:bg-card focus:ring-2 focus:ring-accent/40 focus:outline-none rounded"
                        />
                      </td>
                      <td className="border-b border-r border-amber-100 p-0 align-top">
                        <textarea
                          value={s.answer}
                          onChange={e => upd(s.id, 'answer', e.target.value)}
                          placeholder="Jawaban..."
                          rows={2}
                          className="w-full px-2 py-1.5 text-xs bg-transparent border-0 focus:bg-card focus:ring-2 focus:ring-accent/40 focus:outline-none rounded resize-y min-h-[2.5rem] leading-snug"
                        />
                      </td>
                      {students.some(st => st.confidence) && (
                        <td className="border-b border-r border-amber-100 px-1.5 py-1 text-center align-top pt-2">
                          {s.confidence ? (
                            <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              s.confidence >= 70 ? 'bg-green-100 text-green-700' :
                              s.confidence >= 50 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`} title={s.method ? `Metode: ${s.method}` : undefined}>
                              {s.confidence}%
                            </span>
                          ) : (
                            <span className="text-muted text-[10px]">—</span>
                          )}
                        </td>
                      )}
                      <td className="border-b border-amber-100 px-1 py-1 text-center align-top pt-1.5">
                        <button
                          onClick={() => del(s.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded p-1"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted">
                        Belum ada baris. Klik "+ Tambah Baris" untuk input manual.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <button onClick={addStudent} className="btn-secondary text-sm sm:flex-1">+ Tambah Manual</button>
              <button
                onClick={() => exportPreviewToExcel(students)}
                className="btn-secondary text-sm sm:flex-1 flex items-center justify-center gap-1.5"
                title="Download Excel untuk dikoreksi manual, lalu upload lagi via tombol Ganti"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Edit di Excel
              </button>
              <button onClick={handleConfirmPreview} className="btn-primary text-sm sm:flex-1">
                ✓ Konfirmasi & Lanjut
              </button>
            </div>
            <p className="text-[11px] text-amber-700 mt-2">
              Susah koreksi di sini? Klik <b>Edit di Excel</b> — download, betulin di spreadsheet,
              lalu klik <b>Ganti</b> di atas untuk upload ulang.
            </p>
          </div>
        )}

        {inputMode === 'manual' && (
          <div className="space-y-3">
            {/* Hint card untuk manual mode */}
            <div className="bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 rounded-lg px-3 py-2 flex items-start gap-2 text-xs text-accent">
              <Pencil className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Ketik nama & jawaban tiap siswa. Tekan <kbd className="bg-card px-1 py-0.5 rounded text-[10px] border">+ Tambah Murid</kbd> untuk row baru.</span>
            </div>
            {/* Search input */}
            {students.length > 3 && (
              <input
                type="text"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Cari siswa... (nama atau jawaban)"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card text-fg/80 placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/40"
              />
            )}
            {filteredStudents.map((s,i) => (
              <div key={s.id} className="bg-surface rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-muted font-medium">Murid #{i+1}</span>
                  <button onClick={()=>del(s.id)} className="text-muted hover:text-red-500 transition-colors active:scale-95" title="Hapus"><Trash2 className="w-4 h-4"/></button>
                </div>
                <input type="text" value={s.name} onChange={e=>upd(s.id,'name',e.target.value)} placeholder="Nama siswa" className="input-field mb-2"/>
                <textarea value={s.answer} onChange={e=>upd(s.id,'answer',e.target.value)} placeholder="Jawaban siswa..." rows={3} className="input-field resize-none"/>
              </div>
            ))}
            <button onClick={addStudent} className="btn-secondary w-full flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" /> Tambah Murid
            </button>
          </div>
        )}
        </div> {/* /animated content wrapper */}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1">← Edit Rubrik</button>
        <button onClick={onPayment} disabled={!canAssess} className="btn-primary flex-1">
          <ClipboardCheck className="w-5 h-5 inline mr-2"/>
          {isAdmin()
            ? 'Mulai Penilaian (Admin Gratis)'
            : pricing && pricing.price > 0
              ? `Bayar ${formatIDR(pricing.price)} & Mulai`
              : 'Bayar & Minta AI Menilai'}
        </button>
      </div>
    </div>
  );
}

// Score Ring Component
function ScoreRing({ score, max=10, size=48 }) {
  const pct = score/max;
  const color = pct>=0.8?'#10b981':pct>=0.5?'#f59e0b':'#ef4444';
  return (
    <div className="relative" style={{width:size,height:size}}>
      <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
        <circle cx={size/2} cy={size/2} r={(size/2)-3} fill="none" stroke="#e5e7eb" strokeWidth={3}/>
        <circle cx={size/2} cy={size/2} r={(size/2)-3} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={`${2*Math.PI*(size/2-3)*pct} ${2*Math.PI*(size/2-3)}`} strokeLinecap="round"/>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-bold" style={{color,fontSize:size*0.28}}>{score}</div>
    </div>
  );
}

// Helper: hitung nilai total siswa berdasarkan rubrik & skor per kriteria.
// Bobot di-treat sebagai relative weight (jadi total bobot ≠ 100% tetap valid).
function calcTotal(scores, rubrik) {
  if (!scores) return 0
  let total = 0, tw = 0
  rubrik.forEach(k => { if (scores[k.id]?.skor) { total += scores[k.id].skor * k.bobot; tw += k.bobot } })
  return tw > 0 ? Number((total / tw).toFixed(1)) : 0
}
// Status badge classes harus static string supaya Tailwind purge include-nya.
const statusFromScore = (s) => {
  if (s >= 8) return { label: 'Sangat Baik', cls: 'bg-green-100 text-green-700' }
  if (s >= 7) return { label: 'Baik',        cls: 'bg-accent/15 text-accent' }
  if (s >= 6) return { label: 'Cukup',       cls: 'bg-amber-100 text-amber-700' }
  if (s >= 5) return { label: 'Perbaikan',   cls: 'bg-orange-100 text-orange-700' }
  return            { label: 'Tidak Lulus',  cls: 'bg-red-100 text-red-700' }
}

/** Class summary banner: rata-rata, distribusi, top/bottom — di atas list hasil. */
function ClassSummary({ results, rubrik }) {
  const stats = useMemo(() => {
    const scored = results.filter(r => r.scores).map(r => ({
      name: r.name,
      total: calcTotal(r.scores, rubrik),
    }))
    if (!scored.length) return null
    const totals = scored.map(s => s.total)
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length
    const sorted = [...scored].sort((a, b) => b.total - a.total)
    // Distribusi 5 kategori
    const buckets = { 'Sangat Baik': 0, 'Baik': 0, 'Cukup': 0, 'Perbaikan': 0, 'Tidak Lulus': 0 }
    scored.forEach(s => { buckets[statusFromScore(s.total).label]++ })
    return {
      count: scored.length,
      avg: avg.toFixed(1),
      max: Math.max(...totals).toFixed(1),
      min: Math.min(...totals).toFixed(1),
      top: sorted.slice(0, 3),
      bottom: sorted.slice(-3).reverse(),
      buckets,
    }
  }, [results, rubrik])

  if (!stats) return null

  const total = stats.count
  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-accent" />
        <h3 className="font-bold text-fg/85">Ringkasan Kelas</h3>
        <span className="text-xs text-muted">({total} siswa dinilai)</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-accent/10 rounded-xl p-3 text-center border border-accent/20">
          <div className="text-[10px] uppercase tracking-wide text-accent font-medium">Rata-rata</div>
          <div className="text-2xl font-bold text-accent">{stats.avg}</div>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
          <div className="text-[10px] uppercase tracking-wide text-green-600 font-medium">Tertinggi</div>
          <div className="text-2xl font-bold text-green-700">{stats.max}</div>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
          <div className="text-[10px] uppercase tracking-wide text-red-600 font-medium">Terendah</div>
          <div className="text-2xl font-bold text-red-700">{stats.min}</div>
        </div>
      </div>

      {/* Distribusi bar */}
      <div className="mb-4">
        <div className="text-xs font-medium text-muted mb-2">Distribusi</div>
        <div className="flex h-6 rounded-lg overflow-hidden bg-surface">
          {Object.entries(stats.buckets).map(([label, n]) => {
            const pct = (n / total) * 100
            if (pct === 0) return null
            const colorMap = {
              'Sangat Baik': 'bg-green-500',
              'Baik':        'bg-accent/100',
              'Cukup':       'bg-amber-500',
              'Perbaikan':   'bg-orange-500',
              'Tidak Lulus': 'bg-red-500',
            }
            return (
              <div
                key={label}
                className={`${colorMap[label]} flex items-center justify-center text-[10px] text-white font-medium`}
                style={{ width: `${pct}%` }}
                title={`${label}: ${n} siswa (${pct.toFixed(0)}%)`}
              >
                {pct >= 12 && n}
              </div>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px]">
          {Object.entries(stats.buckets).filter(([, n]) => n > 0).map(([label, n]) => (
            <span key={label} className="text-muted">
              <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{
                backgroundColor: { 'Sangat Baik': '#22c55e', 'Baik': '#0ea5e9', 'Cukup': '#f59e0b', 'Perbaikan': '#f97316', 'Tidak Lulus': '#ef4444' }[label],
              }}/>
              {label}: <strong>{n}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* Top / bottom */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="font-medium text-green-700 mb-1">🏆 Top 3</div>
          {stats.top.map((s, i) => (
            <div key={i} className="flex justify-between truncate">
              <span className="text-fg/80 truncate">{i + 1}. {s.name}</span>
              <span className="font-bold text-green-600 ml-2">{s.total}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="font-medium text-red-700 mb-1">⚠️ Perlu Perhatian</div>
          {stats.bottom.map((s, i) => (
            <div key={i} className="flex justify-between truncate">
              <span className="text-fg/80 truncate">{i + 1}. {s.name}</span>
              <span className="font-bold text-red-600 ml-2">{s.total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Single-criterion editable row: tampilkan ScoreRing + bar + komentar.
 *  Click on skor → inline numeric input. Click pencil → edit komentar. */
function CriterionRow({ k, s, onUpdate }) {
  const [editingScore, setEditingScore] = useState(false)
  const [editingKomentar, setEditingKomentar] = useState(false)
  const [tmpScore, setTmpScore] = useState(s.skor)
  const [tmpKom, setTmpKom] = useState(s.komentar || '')

  const commitScore = () => {
    let n = Number(tmpScore)
    if (Number.isNaN(n)) n = s.skor
    n = Math.max(0, Math.min(10, n))
    onUpdate({ skor: n })
    setEditingScore(false)
  }
  const commitKom = () => {
    onUpdate({ komentar: tmpKom })
    setEditingKomentar(false)
  }

  return (
    <div className="flex gap-3 mb-3">
      {editingScore ? (
        <input
          type="number"
          min={0} max={10} step={0.5}
          value={tmpScore}
          autoFocus
          onChange={e => setTmpScore(e.target.value)}
          onBlur={commitScore}
          onKeyDown={e => { if (e.key === 'Enter') commitScore(); if (e.key === 'Escape') setEditingScore(false) }}
          className="w-10 h-10 rounded-full border-2 border-accent text-center font-bold text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      ) : (
        <button
          onClick={() => { setTmpScore(s.skor); setEditingScore(true) }}
          className="hover:scale-110 transition-transform"
          title="Klik untuk edit skor"
        >
          <ScoreRing score={s.skor} size={40} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-sm">
          <span className="font-medium">{k.nama}</span>
          <span className="text-muted">{k.bobot}%</span>
        </div>
        <div className="h-1.5 bg-border rounded-full">
          <div className={`h-1.5 rounded-full transition-all ${s.skor>=8?'bg-green-500':s.skor>=5?'bg-amber-500':'bg-red-500'}`} style={{width:(s.skor/10)*100+'%'}}/>
        </div>
        {editingKomentar ? (
          <textarea
            value={tmpKom}
            autoFocus
            onChange={e => setTmpKom(e.target.value)}
            onBlur={commitKom}
            rows={2}
            className="w-full text-xs mt-1 p-1.5 border border-accent/50 rounded resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        ) : (
          <p
            className="text-xs text-muted mt-1 cursor-text hover:bg-surface rounded px-1 py-0.5 -mx-1 group flex items-start gap-1"
            onClick={() => { setTmpKom(s.komentar || ''); setEditingKomentar(true) }}
            title="Klik untuk edit komentar"
          >
            <span className="flex-1">{s.komentar || <span className="italic text-muted">Klik untuk tambah komentar</span>}</span>
            <Edit3 className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"/>
          </p>
        )}
      </div>
    </div>
  )
}

// Hasil Penilaian
function HasilPenilaian({
  results, rubrik, loading, error, batchProgress,
  onBack, onReset, onRegrade, onUpdateScore, onUpdateKesimpulan, title,
}) {
  // Sort & filter state — local karena cuma view-level
  const [sortBy, setSortBy] = useState('default')   // default | high | low | name
  const [filterBy, setFilterBy] = useState('all')   // all | pass | fail
  const [studentSearch, setStudentSearch] = useState('')
  const studentFuse = useMemo(() => createFuzzySearch(results, ['name']), [results])

  const sortedResults = useMemo(() => {
    let arr = [...results]
    if (sortBy === 'high') arr.sort((a, b) => calcTotal(b.scores, rubrik) - calcTotal(a.scores, rubrik))
    else if (sortBy === 'low') arr.sort((a, b) => calcTotal(a.scores, rubrik) - calcTotal(b.scores, rubrik))
    else if (sortBy === 'name') arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    if (filterBy === 'pass') arr = arr.filter(r => r.scores && calcTotal(r.scores, rubrik) >= 6)
    if (filterBy === 'fail') arr = arr.filter(r => r.scores && calcTotal(r.scores, rubrik) < 6)
    if (studentSearch.trim()) {
      const ids = new Set(studentFuse.search(studentSearch).map(r => r.item.id))
      arr = arr.filter(r => ids.has(r.id))
    }
    return arr
  }, [results, rubrik, sortBy, filterBy, studentSearch, studentFuse])

  const handleExport = () => {
    try {
      exportToExcel(results, rubrik, title)
      toast.success('Excel berhasil di-download')
    }
    catch (err) {
      console.error('Export error:', err)
      toast.error('Gagal export Excel: ' + err.message)
    }
  }

  const hasAnyResult = results.some(r => r.scores)

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 p-4 rounded-xl text-red-700">{error}</div>}

      {/* Batch progress saat AI loop */}
      {loading && batchProgress.total > 0 && (
        <div className="bg-accent/10 border border-accent/20 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-5 h-5 animate-spin text-accent"/>
            <span className="text-accent font-medium text-sm">
              Memproses {batchProgress.done} dari {batchProgress.total} siswa…
            </span>
          </div>
          <div className="h-2 bg-accent/15 rounded-full overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-accent to-accent/70 rounded-full transition-all active:scale-95"
              style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-accent mt-1.5">
            {batchProgress.done === batchProgress.total ? 'Selesai!' : 'Hasil muncul satu per satu di bawah.'}
          </p>
        </div>
      )}

      {/* Class summary — only when ada hasil */}
      {hasAnyResult && !loading && <ClassSummary results={results} rubrik={rubrik} />}

      {/* Sort & filter toolbar */}
      {hasAnyResult && results.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <div className="flex-1 min-w-[140px]">
            <input
              type="text"
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              placeholder="Cari siswa..."
              className="w-full px-2.5 py-1 text-xs border border-border rounded-lg bg-card text-fg/80 placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/40"
            />
          </div>
          <div className="flex items-center gap-1.5 text-muted">
            <ArrowUpDown className="w-4 h-4"/>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className="bg-card border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30">
              <option value="default">Urutan asli</option>
              <option value="high">Skor tertinggi</option>
              <option value="low">Skor terendah</option>
              <option value="name">Nama A-Z</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-muted">
            <Filter className="w-4 h-4"/>
            <div className="flex gap-1">
              {[
                { id: 'all',  label: 'Semua' },
                { id: 'pass', label: 'Lulus (≥6)' },
                { id: 'fail', label: 'Tidak Lulus' },
              ].map(f => (
                <button key={f.id} onClick={() => setFilterBy(f.id)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                    filterBy === f.id
                      ? 'bg-accent/100 text-white'
                      : 'bg-card border border-border text-muted hover:bg-surface'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <span className="ml-auto text-xs text-muted">
            Menampilkan {sortedResults.length} / {results.length}
          </span>
        </div>
      )}

      {/* Per-student cards */}
      {sortedResults.map((r) => {
        const total = r.scores ? calcTotal(r.scores, rubrik) : null
        const status = total !== null ? statusFromScore(total) : null
        const isProcessing = r._regrading || (!r.scores && loading)
        return (
          <div key={r.id} className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="bg-surface px-4 py-2.5 flex justify-between items-center gap-2 flex-wrap">
              <span className="font-medium flex items-center gap-2 min-w-0">
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin text-accent0 shrink-0"/>}
                <span className="truncate">{r.name}</span>
                {r._edited && (
                  <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded shrink-0" title="Skor sudah diedit manual">
                    edited
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                {status && (
                  <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-semibold ${status.cls}`}>
                    {status.label}
                  </span>
                )}
                <span className="font-bold text-accent text-sm">
                  {total !== null ? `${total}/10` : <span className="text-muted">—/10</span>}
                </span>
                {r.scores && !loading && (
                  <button
                    onClick={() => onRegrade(r.id)}
                    disabled={r._regrading}
                    className="text-xs text-muted hover:text-accent px-2 py-1 rounded hover:bg-accent/10 transition-colors flex items-center gap-1 disabled:opacity-50"
                    title="Nilai ulang siswa ini dengan AI"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${r._regrading ? 'animate-spin' : ''}`}/>
                    <span className="hidden sm:inline">Nilai Ulang</span>
                  </button>
                )}
              </div>
            </div>
            {r.scores ? (
              <div className="p-4">
                {rubrik.map(k => {
                  const s = r.scores[k.id]
                  if (!s) return null
                  return (
                    <CriterionRow
                      key={k.id}
                      k={k} s={s}
                      onUpdate={(patch) => onUpdateScore(r.id, k.id, patch)}
                    />
                  )
                })}
                <KesimpulanEditable
                  value={r.kesimpulan || ''}
                  onSave={(val) => onUpdateKesimpulan(r.id, val)}
                />
              </div>
            ) : isProcessing ? (
              <div className="p-4 space-y-3 animate-pulse">
                {rubrik.map(k => (
                  <div key={k.id} className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-border flex-shrink-0"/>
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between">
                        <div className="h-3 bg-border rounded w-1/3"/>
                        <div className="h-3 bg-border rounded w-8"/>
                      </div>
                      <div className="h-1.5 bg-border rounded-full"/>
                      <div className="h-2 bg-surface rounded w-5/6"/>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-xs text-muted italic">Menunggu giliran…</div>
            )}
          </div>
        )
      })}

      {sortedResults.length === 0 && hasAnyResult && (
        <div className="bg-surface rounded-xl p-6 text-center text-sm text-muted">
          Tidak ada siswa yang cocok dengan filter ini.
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <button onClick={onBack} className="btn-secondary flex-1 min-w-[120px]">← Edit Jawaban</button>
        {hasAnyResult && (
          <Link
            to="/assessment/report"
            className="btn-primary flex-1 min-w-[120px] bg-accent hover:bg-accent/90 text-center inline-flex items-center justify-center gap-2"
            title="Buka laporan Bab IV / cetak PDF"
          >
            <FileText className="w-5 h-5"/> Laporan / PDF
          </Link>
        )}
        {results.length > 0 && (
          <button onClick={handleExport} className="btn-primary flex-1 min-w-[120px] bg-green-600 hover:bg-green-700">
            <Download className="w-5 h-5 inline mr-2"/> Export Excel
          </button>
        )}
        <button onClick={onReset} className="btn-secondary flex-1 min-w-[120px] text-red-600">Mulai Ulang</button>
      </div>
    </div>
  )
}

/** Editable kesimpulan dengan toggle edit mode. */
function KesimpulanEditable({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [tmp, setTmp] = useState(value)
  useEffect(() => { setTmp(value) }, [value])

  if (!value && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="mt-3 pt-3 border-t border-border w-full text-left text-xs text-muted italic hover:text-accent transition-colors active:scale-95"
      >
        + Tambah kesimpulan
      </button>
    )
  }
  if (editing) {
    return (
      <div className="mt-3 pt-3 border-t border-border">
        <textarea
          value={tmp} autoFocus
          onChange={e => setTmp(e.target.value)}
          rows={3}
          className="w-full text-sm p-2 border border-accent/50 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <div className="flex gap-2 mt-2">
          <button onClick={() => { onSave(tmp); setEditing(false) }} className="text-xs px-3 py-1 bg-accent text-accent-fg rounded-lg hover:bg-accent/90">Simpan</button>
          <button onClick={() => { setTmp(value); setEditing(false) }} className="text-xs px-3 py-1 text-muted hover:bg-surface rounded-lg">Batal</button>
        </div>
      </div>
    )
  }
  return (
    <div
      className="mt-3 pt-3 border-t border-border text-sm text-fg/80 cursor-text hover:bg-surface rounded px-1 -mx-1 group flex items-start gap-2"
      onClick={() => setEditing(true)}
      title="Klik untuk edit"
    >
      <span className="flex-1">{value}</span>
      <Edit3 className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"/>
    </div>
  )
}

// MAIN
function Assessment() {
  const navigate = useNavigate()
  const [step, setStep] = usePersist("ai_step", "rubrik")
  const [title, setTitle] = usePersist("ai_title", "")
  const [context, setContext] = usePersist("ai_context", "")
  const [rubrik, setRubrik] = usePersist("ai_rubrik", [{id:uid(),nama:"",deskripsi:"",bobot:100}])
  const [students, setStudents] = usePersist("ai_students", [{id:uid(),name:"",answer:""}])
  const [results, setResults] = usePersist("ai_results", [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  // Real-time batch progress {done, total} — ditampilkan di HasilPenilaian saat AI loop
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 })
  // Reset confirmation modal
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Keyboard shortcuts: / → focus search, Ctrl+Enter → submit
  useKeyboardShortcuts()

  // Load uploaded students from Upload page
  useEffect(() => {
    try {
      const uploaded = localStorage.getItem('uploaded_students')
      if (uploaded) {
        const parsed = JSON.parse(uploaded)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Convert from {nama, konten} to {id, name, answer}
          const converted = parsed.map((s, i) => ({
            id: s.id || uid(),
            name: s.nama || s.name || '',
            answer: s.konten || s.content || s.answer || ''
          }))
          setStudents(converted)
          // Clear uploaded_students after loading (one-time use)
          localStorage.removeItem('uploaded_students')
        }
      }
    } catch (e) {
      console.error('Error loading uploaded students:', e)
    }
  }, [])

  // ── Payment & Assess flow (Opsi 3: deduct inline) ──────────────────
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // Hitung student count yang valid (punya nama + jawaban)
  const validStudents = students.filter(s => s.name && s.answer)
  const pricing = getAssessmentPriceWithDiscount(validStudents.length)

  /** Tombol "Bayar & Minta AI Menilai" → buka modal konfirmasi.
   *  Admin = penguasa: skip login check, skip payment, langsung jalan gratis. */
  const handlePayClick = () => {
    if (validStudents.length === 0) {
      toast.error('Belum ada siswa yang punya nama & jawaban lengkap')
      return
    }
    // Admin: bypass login & payment full
    if (isAdmin()) {
      setError('')
      toast.success('Mode admin — penilaian gratis')
      assess({ paidAmount: 0, paymentMethod: 'admin_free' })
      return
    }
    const user = getCurrentUser()
    if (!user) {
      // Belum login: simpan draft + tampilkan toast dengan tombol login
      localStorage.setItem('pending_assessment', JSON.stringify({ title, context, rubrik, students }))
      toast.warning(pricing.betaFree ? 'Silakan login dulu untuk menggunakan beta gratis' : 'Silakan login dulu untuk melanjutkan', {
        action: 'Login sekarang',
        onAction: () => navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search)),
        duration: 6000,
      })
      return
    }
    setError('')
    setShowConfirm(true)
  }

  /** Confirm di modal → deduct wallet → run assess().
   *  Admin tetap di-handle di handlePayClick (tidak sampai modal ini). */
  const handleConfirmPay = async () => {
    setConfirmLoading(true)
    if (pricing.price === 0) {
      setShowConfirm(false)
      setConfirmLoading(false)
      toast.success('Beta gratis aktif. AI sedang menilai...')
      assess({ paidAmount: 0, paymentMethod: pricing.betaFree ? 'beta_free' : 'free' })
      return
    }
    const result = await deductWalletAndCreateOrder('assessment', validStudents.length)
    if (!result.success) {
      toast.error(result.error || 'Gagal memotong saldo')
      setConfirmLoading(false)
      setShowConfirm(false)
      return
    }
    setShowConfirm(false)
    setConfirmLoading(false)
    toast.success(`Pembayaran ${formatIDR(result.paid ?? pricing.price)} berhasil. AI sedang menilai...`)
    // Run AI assessment dengan info pembayaran
    assess({ paidAmount: result.paid ?? pricing.price, paymentMethod: 'wallet' })
  }

  const assess = async ({ paidAmount = 0, paymentMethod = 'free' } = {}) => {
    // Process with AI directly (skip payment for now - will add later)
    setStep("hasil")
    setLoading(true)
    setError("")
    const init = students.map(s=>({...s,scores:null,kesimpulan:null}))
    setResults(init)
    setBatchProgress({ done: 0, total: students.length })
    const updated=[...init]

    // Pakai helper assessOneStudent — kalau salah satu siswa gagal,
    // kita treat seluruh batch sebagai fallback (consistent).
    let apiSuccess = true
    try {
      for (let i = 0; i < students.length; i++) {
        const result = await assessOneStudent({ student: students[i], rubrik, title, context })
        updated[i] = { ...updated[i], scores: result.scores, kesimpulan: result.kesimpulan }
        setResults([...updated])
        setBatchProgress({ done: i + 1, total: students.length })
      }
    } catch (e) {
      apiSuccess = false
      console.log('Batch failed, switching to fallback:', e.message)
    }

    // If all APIs fail, use intelligent mock
    if (!apiSuccess) {
      console.log('All APIs failed, using fallback assessment')
      for(let i=0;i<students.length;i++){
        // Generate semi-realistic scores based on answer length
        const answerLength = students[i].answer?.length || 0
        const baseScore = answerLength > 100 ? 7 + Math.random() * 2 : 5 + Math.random() * 3
        const scores = {}
        rubrik.forEach(k => {
          const variation = (Math.random() - 0.5) * 2 // -1 to +1
          scores[k.id] = {
            skor: Math.min(10, Math.max(1, Math.round((baseScore + variation) * 10) / 10)),
            komentar: `Tulisan ${answerLength > 100 ? 'cukup panjang dengan' : 'masih perlu dikembangkan dengan'} struktur yang ${answerLength > 200 ? 'bagus' : 'sederhana'}.`
          }
        })
        updated[i] = {
          ...updated[i],
          scores,
          kesimpulan: `总体而言，这篇文章展现了${answerLength > 200 ? '良好的' : '基本的'}写作能力。`
        }
        setResults([...updated])
      }
    }
    
    // Save results to order system
    const orderId = generateOrderId()
    const currentUser = getCurrentUser()
    const order = {
      id: orderId,
      service: 'assessment',
      serviceName: 'Assessment Tulisan AI',
      tier: 'custom',
      tierName: pricing.label,
      amount: paidAmount,
      paymentMethod,
      status: 'completed',
      date: new Date().toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
      userId: currentUser?.email || 'local',
      title,
      context,
      rubrik: rubrik.map(r => ({ id: r.id, nama: r.nama, deskripsi: r.deskripsi, bobot: r.bobot })),
      results: updated,
      paidAt: paidAmount > 0 ? Date.now() : null,
      createdAt: Date.now(),
    }
    saveOrder(order)

    // Also save to localStorage for immediate access
    localStorage.setItem('latest_assessment_order', orderId)

    setLoading(false)

    // Notify hasil siap
    if (apiSuccess) {
      toast.success(`Penilaian selesai untuk ${students.length} siswa`)
      trackEvent('assess', { count: students.length })
    } else {
      toast.warning('AI tidak tersedia — hasil pakai estimasi otomatis. Coba lagi nanti untuk hasil real.', {
        duration: 7000,
      })
    }
  }

  /** Reset state ke awal — TIDAK pakai localStorage.clear() (terlalu agresif,
   *  bisa hapus auth/wallet). Cuma clear key 'ai_*' yang dipakai usePersist. */
  const performReset = () => {
    ['ai_step','ai_title','ai_context','ai_rubrik','ai_students','ai_results']
      .forEach(k => localStorage.removeItem(k))
    setStep("rubrik")
    setTitle("")
    setContext("")
    setRubrik([{id:uid(),nama:"",deskripsi:"",bobot:100}])
    setStudents([{id:uid(),name:"",answer:""}])
    setResults([])
    setError("")
    setShowResetConfirm(false)
    toast.success('Penilaian direset. Mulai dari awal.')
  }
  const reset = () => setShowResetConfirm(true)

  /** Re-grade satu siswa: panggil API ulang untuk siswa tertentu, update slot result-nya saja. */
  const reGradeStudent = async (studentId) => {
    const student = students.find(s => s.id === studentId)
    if (!student) return
    // Tandai loading di slot ini (set scores=null sementara)
    setResults(rs => rs.map(r => r.id === studentId ? { ...r, _regrading: true } : r))
    try {
      const result = await assessOneStudent({ student, rubrik, title, context })
      setResults(rs => rs.map(r => r.id === studentId
        ? { ...r, scores: result.scores, kesimpulan: result.kesimpulan, _regrading: false, _edited: false }
        : r))
      toast.success(`${student.name} berhasil dinilai ulang`)
    } catch (e) {
      setResults(rs => rs.map(r => r.id === studentId ? { ...r, _regrading: false } : r))
      toast.error(`Gagal nilai ulang: ${e.message}`)
    }
  }

  /** Edit skor manual: update salah satu kriteria dari hasil AI. */
  const updateStudentScore = (studentId, kriteriaId, patch) => {
    setResults(rs => rs.map(r => {
      if (r.id !== studentId) return r
      const newScores = { ...r.scores, [kriteriaId]: { ...r.scores?.[kriteriaId], ...patch } }
      return { ...r, scores: newScores, _edited: true }
    }))
  }
  const updateStudentKesimpulan = (studentId, kesimpulan) => {
    setResults(rs => rs.map(r => r.id === studentId ? { ...r, kesimpulan, _edited: true } : r))
  }

  const steps = [
    { key: 'rubrik',  label: 'Rubrik'  },
    { key: 'jawaban', label: 'Jawaban' },
    { key: 'hasil',   label: 'Hasil'   },
  ]
  const idx = steps.findIndex(s=>s.key===step)

  // Step indicator dengan label — visible di desktop, dot-only di mobile (space).
  const stepIndicator = (
    <div className="flex items-center gap-1.5">
      {steps.map((s, i) => {
        const active = i === idx
        const done = i < idx
        return (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium transition-colors ${
              active ? 'bg-accent/100 text-white' :
              done   ? 'bg-green-500 text-white' :
                       'bg-surface text-muted'
            }`}>
              <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[10px] font-bold">
                {done ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-3 h-0.5 ${done ? 'bg-green-500' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="min-h-screen bg-pattern pb-24 md:pb-6">
      <PageHeader
        title="Nilai tugas pakai AI"
        eyebrow="ASSESSMENT"
        tagline="Buat rubrik → upload jawaban siswa → dapat skor + komentar otomatis."
        variant="hero"
        accent="teal"
        parentPath="/"
        right={stepIndicator}
        actions={
          <Link
            to="/kuesioner"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-card hover:bg-accent/10 text-accent border-border transition-colors active:scale-95"
            title="Buka Kuesioner Builder"
          >
            <ListChecks className="w-3.5 h-3.5" /> Kuesioner
          </Link>
        }
      />

      <div className="max-w-3xl mx-auto px-4 py-6">
        {step==="rubrik" && (
          <>
            <Link
              to="/kuesioner"
              className="block mb-4 bg-gradient-to-r from-surface border border-border rounded-xl p-3 hover:shadow-sm transition-shadow group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/100 text-white flex items-center justify-center flex-shrink-0">
                  <ListChecks className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-accent">Kuesioner Builder</div>
                  <div className="text-xs text-accent">
                    Bikin angket/kuesioner online, kumpulkan respons, lalu analisis (Cronbach α, validitas).
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-accent group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
            <RubrikBuilder rubrik={rubrik} setRubrik={setRubrik} title={title} setTitle={setTitle} context={context} setContext={setContext} onNext={()=>setStep("jawaban")}/>
          </>
        )}
        {step==="jawaban" && (
          <InputJawaban
            rubrik={rubrik}
            title={title}
            students={students}
            setStudents={setStudents}
            onBack={()=>setStep("rubrik")}
            onAssess={() => assess()}
            onPayment={handlePayClick}
            pricing={pricing}
          />
        )}
        {step==="hasil" && (
          <HasilPenilaian
            results={results}
            rubrik={rubrik}
            loading={loading}
            error={error}
            batchProgress={batchProgress}
            onBack={()=>setStep("jawaban")}
            onReset={reset}
            onRegrade={reGradeStudent}
            onUpdateScore={updateStudentScore}
            onUpdateKesimpulan={updateStudentKesimpulan}
            title={title}
          />
        )}
      </div>

      <ConfirmPaymentModal
        open={showConfirm}
        loading={confirmLoading}
        title="Bayar & Mulai Penilaian AI"
        description={pricing.betaFree ? `AI akan menilai ${validStudents.length} jawaban siswa — gratis selama beta` : `AI akan menilai ${validStudents.length} jawaban siswa berdasarkan rubrik yang Anda buat`}
        price={pricing.price}
        originalPrice={pricing.original}
        priceBreakdown={pricing.breakdown}
        wallet={getWallet()}
        onConfirm={handleConfirmPay}
        onClose={() => setShowConfirm(false)}
      />

      {/* Reset confirmation — supaya guru ngga ke-trigger accidental clear data */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-[100] bg-black/50  flex items-center justify-center p-4 animate-in"
          onClick={(e) => { if (e.target === e.currentTarget) setShowResetConfirm(false) }}
        >
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-fg">Yakin reset semua?</h3>
                <p className="text-sm text-muted mt-1">
                  Rubrik, daftar siswa, dan hasil penilaian akan hilang.
                  {results.length > 0 && ' Pastikan kamu sudah Export Excel dulu.'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowResetConfirm(false)} className="btn-secondary flex-1">
                Batal
              </button>
              <button onClick={performReset} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors active:scale-95">
                Ya, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Assessment
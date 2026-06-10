// Pengaturan & Backup Workspace
// =============================
// Halaman terpusat untuk:
//   - Lihat statistik isi workspace (jumlah survei, referensi, dokumen, dll.)
//   - Export semua data riset ke 1 file .json (backup)
//   - Restore dari file backup (replace atau merge mode)
//   - Hapus semua data riset (auth/wallet aman)

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Settings, Download, Upload, Trash2, AlertTriangle, CheckCircle2,
  HardDrive, Database, FileText, MessageSquare, Tag, ClipboardList, Award,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {
  exportWorkspace, downloadWorkspace, restoreWorkspace, validateBackup,
  workspaceStats, isWorkspaceEmpty, clearWorkspace,
} from '../lib/workspace'
import { toast } from '../lib/toast'

export default function SettingsPage() {
  const [stats, setStats] = useState(workspaceStats())
  const [restoreData, setRestoreData] = useState(null) // parsed JSON awaiting confirmation
  const [restoreError, setRestoreError] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const fileRef = useRef(null)

  const refresh = () => setStats(workspaceStats())

  useEffect(() => { refresh() }, [])

  const handleExport = () => {
    if (isWorkspaceEmpty()) {
      toast.warning('Workspace masih kosong — tidak ada yang di-backup')
      return
    }
    const ws = downloadWorkspace()
    toast.success(`Backup berhasil — ${ws.stats.surveys + ws.stats.references + ws.stats.qualDocs} item utama`)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target.result || ''))
        const validation = validateBackup(parsed)
        if (!validation.valid) {
          setRestoreError(validation.error)
          setRestoreData(null)
        } else {
          setRestoreError(null)
          setRestoreData(parsed)
        }
      } catch (err) {
        setRestoreError('File JSON tidak valid: ' + err.message)
        setRestoreData(null)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleRestore = (mode) => {
    if (!restoreData) return
    const result = restoreWorkspace(restoreData, { mode })
    if (result.ok) {
      const items = Object.values(result.restored || {}).reduce((s, n) => s + n, 0)
      toast.success(`Restore berhasil (${mode}) — ${items} item dipulihkan`)
      setRestoreData(null)
      refresh()
    } else {
      toast.error(result.error || 'Restore gagal')
    }
  }

  const handleClear = () => {
    const cleared = clearWorkspace()
    setConfirmClear(false)
    refresh()
    toast.success(`${cleared.length} jenis data dihapus`)
  }

  const totalItems = stats.surveys + stats.responses + stats.references
                   + stats.qualDocs + stats.qualCodes + stats.qualCodings + stats.rubriks

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title="Pengaturan"
        subtitle="Backup, restore, & manajemen data workspace"
        breadcrumbs={[
          { path: '/', label: 'Beranda' },
          { path: '/pengaturan', label: 'Pengaturan' },
        ]}
      />

      <div className="max-w-4xl mx-auto px-3 sm:px-5 py-4 space-y-4">
        {/* Hero — using Panel */}
        <div className="panel" style={{ borderColor: 'rgb(var(--accent) / 0.3)' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                 style={{ backgroundColor: 'rgb(var(--accent))', color: 'white' }}>
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold mb-1" style={{ color: 'rgb(var(--fg))' }}>Workspace Anda</h2>
              <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--muted))' }}>
                Semua data riset (kuesioner, referensi, kualitatif, rubrik) tersimpan di browser Anda.
                <strong style={{ color: 'rgb(var(--fg))' }}> Backup berkala sangat dianjurkan</strong> — kalau cache browser di-clear, data hilang.
              </p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <Card>
          <h3 className="section-title text-sm flex items-center gap-2">
            <Database className="w-4 h-4" style={{ color: 'rgb(var(--muted))' }} /> Isi Workspace ({totalItems} item)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatBox icon={ClipboardList} label="Survei"     value={stats.surveys}      to="/kuesioner" />
            <StatBox icon={ClipboardList} label="Respons"    value={stats.responses}    to="/kuesioner" />
            <StatBox icon={FileText}      label="Referensi"  value={stats.references}   to="/referensi" />
            <StatBox icon={MessageSquare} label="Dokumen Q"  value={stats.qualDocs}     to="/kualitatif" />
            <StatBox icon={Tag}           label="Kode Q"     value={stats.qualCodes}    to="/kualitatif" />
            <StatBox icon={Tag}           label="Coding Q"   value={stats.qualCodings}  to="/kualitatif" />
            <StatBox icon={Award}         label="Rubrik"     value={stats.rubriks}      to="/assessment" />
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'rgb(var(--border) / 0.3)' }}>
              <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'rgb(var(--muted))' }}>Total</div>
              <div className="text-2xl font-bold" style={{ color: 'rgb(var(--fg))' }}>{totalItems}</div>
            </div>
          </div>
        </Card>

        {/* Export */}
        <Card>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1" style={{ color: 'rgb(var(--fg))' }}>Backup Workspace</h3>
              <p className="text-xs mb-3" style={{ color: 'rgb(var(--muted))' }}>
                Unduh semua data riset Anda dalam 1 file .json. Aman untuk di-share, edit, atau di-restore di komputer lain.
                File tidak mengandung data login/akun.
              </p>
              <button
                onClick={handleExport}
                disabled={isWorkspaceEmpty()}
                className="btn-primary text-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> Unduh Backup (.json)
              </button>
            </div>
          </div>
        </Card>

        {/* Import */}
        <Card>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1" style={{ color: 'rgb(var(--fg))' }}>Restore dari Backup</h3>
              <p className="text-xs mb-3" style={{ color: 'rgb(var(--muted))' }}>
                Pilih file backup .json untuk dipulihkan. Anda bisa pilih mode <em>replace</em> (timpa total)
                atau <em>merge</em> (gabung dengan data yang ada — duplikat di-dedupe by ID).
              </p>
              <button onClick={() => fileRef.current?.click()} className="btn-secondary text-sm">
                <Upload className="w-4 h-4" /> Pilih File Backup
              </button>
              <input ref={fileRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />

              {restoreError && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{restoreError}</span>
                </div>
              )}

              {restoreData && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-900 flex-1">
                      <div className="font-semibold mb-1">File backup valid</div>
                      <div>Diekspor: {new Date(restoreData.exportedAt).toLocaleString('id-ID')}</div>
                      {restoreData.stats && (
                        <div className="mt-1">
                          Berisi: {restoreData.stats.surveys || 0} survei, {restoreData.stats.references || 0} referensi,
                          {' '}{restoreData.stats.qualDocs || 0} dok kualitatif, {restoreData.stats.rubriks || 0} rubrik
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-blue-200">
                    <button onClick={() => handleRestore('replace')} className="btn-primary text-xs py-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Replace (timpa semua)
                    </button>
                    <button onClick={() => handleRestore('merge')} className="btn-secondary text-xs py-1.5">
                      Merge (gabung)
                    </button>
                    <button onClick={() => setRestoreData(null)} className="btn-ghost text-xs py-1.5">
                      Batal
                    </button>
                  </div>
                  <p className="text-[11px] text-blue-800 pt-1">
                    <strong>Replace:</strong> data lama dihapus, file backup jadi satu-satunya sumber.
                    <strong> Merge:</strong> item dengan ID sama ditimpa, item baru ditambah.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <div className="border rounded-xl p-4"
             style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(239 68 68 / 0.4)' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1 text-red-600 dark:text-red-400">Zona Berbahaya</h3>
              <p className="text-xs mb-3" style={{ color: 'rgb(var(--muted))' }}>
                Hapus semua data riset dari browser ini. Data login &amp; akun TIDAK terhapus, hanya data riset.
                <strong> Backup dulu sebelum klik!</strong>
              </p>
              {!confirmClear ? (
                <button
                  onClick={() => setConfirmClear(true)}
                  disabled={isWorkspaceEmpty()}
                  className="btn-ghost text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" /> Hapus Semua Data Riset
                </button>
              ) : (
                <div className="bg-red-50 border border-red-300 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-red-900 font-medium">
                    Yakin? Ini akan hapus {totalItems} item dan TIDAK BISA di-undo.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={handleClear} className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700">
                      Ya, hapus semua
                    </button>
                    <button onClick={() => setConfirmClear(false)} className="btn-ghost text-xs py-1.5">
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="text-[11px] text-center pt-2" style={{ color: 'rgb(var(--muted))' }}>
          💡 Tip: Backup workspace Anda 1× per minggu atau setelah selesai input data besar
        </div>
      </div>
    </div>
  )
}

// Reusable theme-aware Card wrapper
function Card({ children, className = '' }) {
  return (
    <div
      className={`border rounded-xl p-4 ${className}`}
      style={{
        backgroundColor: 'rgb(var(--card))',
        borderColor: 'rgb(var(--border))',
      }}
    >
      {children}
    </div>
  )
}

function StatBox({ icon: Icon, label, value, to }) {
  const inner = (
    <>
      <Icon className="w-4 h-4 mx-auto mb-0.5" style={{ color: 'rgb(var(--muted))' }} />
      <div className="text-2xl font-bold" style={{ color: 'rgb(var(--fg))' }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: 'rgb(var(--muted))' }}>{label}</div>
    </>
  )
  const bg = { backgroundColor: 'rgb(var(--border) / 0.3)' }
  if (to && value > 0) {
    return (
      <Link to={to} className="rounded-lg p-3 text-center transition-colors block hover:opacity-80" style={bg}>
        {inner}
      </Link>
    )
  }
  return <div className="rounded-lg p-3 text-center" style={bg}>{inner}</div>
}

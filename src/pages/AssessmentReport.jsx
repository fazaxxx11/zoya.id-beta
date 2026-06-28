// Assessment Report Page — print-friendly Bab IV-style report.
// Two modes: "Class Report" (default) atau "Student Card" (?student=ID).
// Pakai window.print() — browser akan handle PDF export native.
//
// Print CSS strip nav, BottomNav, header tools — cuma sisain konten reportable.

import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  ChevronLeft, Printer, Download, FileText, Users, User, Award,
} from 'lucide-react'
import { generateClassReport, generateStudentCard } from '../lib/assessmentReport'
import { getOrders } from '../lib/orders'
import { BRAND_NAME } from '../lib/brand'
import DetailsBlock from '../components/design/DetailsBlock'

/** Coba ambil order data dari URL param atau localStorage 'latest_assessment_order'. */
function loadOrderData(orderIdParam) {
  const orders = getOrders()
  let target = null
  if (orderIdParam) {
    target = orders.find(o => o.id === orderIdParam)
  } else {
    const latestId = localStorage.getItem('latest_assessment_order')
    target = latestId ? orders.find(o => o.id === latestId) : null
    // Last resort: latest assessment order
    if (!target) {
      target = [...orders].reverse().find(o => o.service === 'assessment')
    }
  }
  return target
}

export default function AssessmentReport() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const orderIdParam = params.get('orderId')
  const studentIdParam = params.get('student')
  const [viewMode, setViewMode] = useState(studentIdParam ? 'student' : 'class')

  const order = useMemo(() => loadOrderData(orderIdParam), [orderIdParam])

  // === Empty state: order ngga ketemu
  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-card rounded-xl p-8 max-w-md text-center border border-border">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="font-bold text-fg mb-2">Tidak ada data laporan</h2>
          <p className="text-sm text-muted mb-5">
            Selesaikan satu penilaian Assessment dulu untuk bisa generate laporan.
          </p>
          <Link to="/assessment" className="btn-primary inline-block">Buka Assessment</Link>
        </div>
      </div>
    )
  }

  const { rubrik, results, title, context } = order

  // Generate report data
  const classReport = useMemo(
    () => generateClassReport({ results, rubrik, title, context }),
    [results, rubrik, title, context]
  )

  // Per-student card data (bila mode student)
  const selectedStudent = useMemo(() => {
    if (!studentIdParam) return null
    return results.find(r => r.id === studentIdParam) || null
  }, [studentIdParam, results])
  const studentCard = useMemo(() => {
    if (!selectedStudent) return null
    return generateStudentCard({ student: selectedStudent, rubrik, title, context })
  }, [selectedStudent, rubrik, title, context])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-surface print:bg-card">
      {/* === Toolbar (hidden saat print) === */}
      <div className="bg-card border-b border-border sticky top-0 z-30 print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-muted hover:bg-surface rounded-lg"
            title="Kembali"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-fg truncate">Laporan Penilaian</div>
            <div className="text-xs text-muted truncate">{title}</div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-surface p-1 rounded-lg">
            <button
              onClick={() => setViewMode('class')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'class'
                  ? 'bg-card text-fg shadow-sm'
                  : 'text-muted hover:text-fg'
              }`}
            >
              <Users className="w-3.5 h-3.5"/> Kelas
            </button>
            <button
              onClick={() => setViewMode('student')}
              disabled={!studentCard && results.filter(r => r.scores).length === 0}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 ${
                viewMode === 'student'
                  ? 'bg-card text-fg shadow-sm'
                  : 'text-muted hover:text-fg'
              }`}
            >
              <User className="w-3.5 h-3.5"/> Per Siswa
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4"/> <span className="hidden sm:inline">Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* === Tip box — hidden saat print === */}
      <div className="max-w-4xl mx-auto px-4 mt-4 print:hidden">
        <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-xs text-sky-800 flex items-start gap-2">
          <span className="font-medium">Tips:</span>
          <span>Klik <strong>Cetak / PDF</strong> → di dialog browser pilih <strong>"Save as PDF"</strong> sebagai destination untuk simpan laporan ke file PDF tanpa perlu printer.</span>
        </div>
      </div>

      {/* === Report content (printable) === */}
      <div className="max-w-4xl mx-auto px-4 py-6 print:px-0 print:py-0">
        {viewMode === 'class' && <ClassReportView report={classReport} />}
        {viewMode === 'student' && (
          <StudentSelectAndCard
            results={results.filter(r => r.scores)}
            selectedId={studentIdParam}
            studentCard={studentCard}
            classReport={classReport}
          />
        )}
      </div>
    </div>
  )
}

// =====================================================
//  Class Report View
// =====================================================
function ClassReportView({ report }) {
  const { meta, summary, distribusi, kriteriaStats, tableRows, narrative, rubrik } = report

  return (
    <article className="bg-card rounded-xl border border-border p-6 sm:p-10 print:shadow-none print:border-0 print:rounded-none print:p-0 report-page">
      {/* Header */}
      <header className="border-b-2 border-fg pb-4 mb-6 text-center print:mb-4">
        <div className="text-xs uppercase tracking-widest text-muted mb-1">{BRAND_NAME}</div>
        <h1 className="text-2xl font-bold text-fg mb-1">Laporan Penilaian Kelas</h1>
        <p className="text-base font-medium text-fg/80">{meta.title}</p>
        {meta.context && <p className="text-sm text-muted mt-1 italic">{meta.context}</p>}
        <p className="text-xs text-muted mt-2">
          Dibuat: {meta.generatedAtLocal} · Total Siswa: {summary.totalSiswa}
        </p>
      </header>

      {/* Summary stats */}
      <section className="mb-6">
        <h2 className="text-lg font-bold text-fg mb-3 border-l-4 border-sky-500 pl-3">A. Statistik Deskriptif</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <Stat label="Rata-rata" value={summary.mean.toFixed(2)} />
          <Stat label="Std. Deviasi" value={summary.sd.toFixed(2)} />
          <Stat label="Min" value={summary.min.toFixed(2)} />
          <Stat label="Max" value={summary.max.toFixed(2)} />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Stat label="Lulus (≥6.0)" value={`${summary.lulus} siswa`} highlight="green" />
          <Stat label="Belum Lulus" value={`${summary.tidakLulus} siswa`} highlight={summary.tidakLulus > 0 ? 'red' : 'gray'} />
        </div>
      </section>

      {/* Distribusi kategori */}
      <section className="mb-6">
        <h2 className="text-lg font-bold text-fg mb-3 border-l-4 border-sky-500 pl-3">B. Distribusi Kategori</h2>
        <table className="w-full text-sm border border-border">
          <thead>
            <tr className="bg-surface">
              <th className="border border-border px-3 py-2 text-left">Kategori</th>
              <th className="border border-border px-3 py-2 text-left">Rentang</th>
              <th className="border border-border px-3 py-2 text-right">Jumlah</th>
              <th className="border border-border px-3 py-2 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {[
              { k: 'Sangat Baik', range: '≥ 8.5' },
              { k: 'Baik', range: '7.5 – 8.49' },
              { k: 'Cukup', range: '6.0 – 7.49' },
              { k: 'Perlu Perbaikan', range: '5.0 – 5.99' },
              { k: 'Belum Memenuhi', range: '< 5.0' },
            ].map(({ k, range }) => {
              const n = distribusi[k] || 0
              const pct = summary.totalSiswa > 0 ? ((n / summary.totalSiswa) * 100).toFixed(1) : '0.0'
              return (
                <tr key={k}>
                  <td className="border border-border px-3 py-1.5">{k}</td>
                  <td className="border border-border px-3 py-1.5 text-muted">{range}</td>
                  <td className="border border-border px-3 py-1.5 text-right font-medium">{n}</td>
                  <td className="border border-border px-3 py-1.5 text-right">{pct}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {/* Statistik per kriteria */}
      <section className="mb-6">
        <h2 className="text-lg font-bold text-fg mb-3 border-l-4 border-sky-500 pl-3">C. Analisis per Kriteria</h2>
        <table className="w-full text-sm border border-border">
          <thead>
            <tr className="bg-surface">
              <th className="border border-border px-3 py-2 text-left">Kriteria</th>
              <th className="border border-border px-3 py-2 text-right">Bobot</th>
              <th className="border border-border px-3 py-2 text-right">Mean</th>
              <th className="border border-border px-3 py-2 text-right">SD</th>
              <th className="border border-border px-3 py-2 text-right">Min</th>
              <th className="border border-border px-3 py-2 text-right">Max</th>
            </tr>
          </thead>
          <tbody>
            {kriteriaStats.map(k => (
              <tr key={k.id}>
                <td className="border border-border px-3 py-1.5">{k.nama}</td>
                <td className="border border-border px-3 py-1.5 text-right">{k.bobot}%</td>
                <td className="border border-border px-3 py-1.5 text-right font-medium">{k.mean.toFixed(2)}</td>
                <td className="border border-border px-3 py-1.5 text-right">{k.sd.toFixed(2)}</td>
                <td className="border border-border px-3 py-1.5 text-right">{k.min.toFixed(1)}</td>
                <td className="border border-border px-3 py-1.5 text-right">{k.max.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Tabel skor per siswa — dense, use progressive disclosure */}
      <DetailsBlock title="D. Skor Individu — klik untuk melihat tabel lengkap">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-border">
            <thead>
              <tr className="bg-surface">
                <th className="border border-border px-2 py-1.5 text-left">No.</th>
                <th className="border border-border px-2 py-1.5 text-left">Nama Siswa</th>
                {rubrik.map(k => (
                  <th key={k.id} className="border border-border px-2 py-1.5 text-right" title={k.nama}>
                    {k.nama.length > 12 ? k.nama.slice(0, 11) + '…' : k.nama}
                  </th>
                ))}
                <th className="border border-border px-2 py-1.5 text-right bg-surface">Total</th>
                <th className="border border-border px-2 py-1.5 text-left bg-surface">Status</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map(row => (
                <tr key={row.no}>
                  <td className="border border-border px-2 py-1.5">{row.no}</td>
                  <td className="border border-border px-2 py-1.5">{row.name}</td>
                  {row.perKriteria.map(pk => (
                    <td key={pk.id} className="border border-border px-2 py-1.5 text-right">
                      {pk.skor != null ? pk.skor.toFixed(1) : '-'}
                    </td>
                  ))}
                  <td className="border border-border px-2 py-1.5 text-right font-bold bg-surface">{row.total.toFixed(2)}</td>
                  <td className="border border-border px-2 py-1.5">
                    <span className={statusBadgeClass(row.status)}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DetailsBlock>

      {/* Narasi (Bab IV-style) */}
      <section className="mb-4">
        <h2 className="text-lg font-bold text-fg mb-3 border-l-4 border-accent pl-3">D. Pembahasan</h2>
        <div className="prose prose-sm max-w-none text-fg/85 leading-relaxed">
          {narrative.split('\n\n').map((p, i) => (
            <p key={i} className="mb-3 text-justify">{p}</p>
          ))}
        </div>
      </section>

      {/* Footer signature line */}
      <footer className="mt-12 pt-6 border-t border-border text-xs text-muted print:mt-16">
        <div className="grid grid-cols-2 gap-8 mt-8">
          <div>
            <p className="mb-12">Mengetahui,</p>
            <p className="border-t border-fg/30 pt-1">Kepala Sekolah / Dosen Pembimbing</p>
          </div>
          <div className="text-right">
            <p className="mb-12">{meta.generatedAtLocal.split(',')[0]},</p>
            <p className="border-t border-fg/30 pt-1">Penilai</p>
          </div>
        </div>
        <p className="text-center mt-6 text-[10px] text-muted">
          Laporan ini dibuat otomatis oleh {BRAND_NAME} · {meta.generatedAtLocal}
        </p>
      </footer>
    </article>
  )
}

// =====================================================
//  Student Card View
// =====================================================
function StudentSelectAndCard({ results, selectedId, studentCard, classReport }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const handlePick = (id) => {
    const next = new URLSearchParams(searchParams)
    next.set('student', id)
    navigate(`/assessment/report?${next.toString()}`)
  }

  // Empty state — pilih siswa
  if (!studentCard) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-fg mb-3">Pilih siswa untuk lihat report card:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => handlePick(r.id)}
              className="text-left px-4 py-3 rounded-lg border border-border hover:border-accent hover:bg-surface transition-colors flex items-center justify-between"
            >
              <span className="font-medium text-fg">{r.name || 'Tanpa Nama'}</span>
              <Award className="w-4 h-4 text-sky-500" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  return <StudentCardView card={studentCard} classReport={classReport} onChangeStudent={handlePick} results={results} selectedId={selectedId} />
}

function StudentCardView({ card, classReport, onChangeStudent, results, selectedId }) {
  return (
    <>
      {/* Picker — hidden saat print */}
      <div className="bg-card rounded-xl border border-border p-3 mb-4 print:hidden flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted">Siswa:</span>
        <select
          value={selectedId || ''}
          onChange={(e) => onChangeStudent(e.target.value)}
          className="text-sm border border-border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-200"
        >
          {results.map(r => (
            <option key={r.id} value={r.id}>{r.name || 'Tanpa Nama'}</option>
          ))}
        </select>
        <span className="text-xs text-muted ml-auto">
          ({results.findIndex(r => r.id === selectedId) + 1} / {results.length})
        </span>
      </div>

      <article className="bg-card rounded-xl border border-border p-6 sm:p-10 print:shadow-none print:border-0 print:rounded-none print:p-0 report-page">
        <header className="border-b-2 border-fg pb-4 mb-6 text-center">
          <div className="text-xs uppercase tracking-widest text-muted mb-1">{BRAND_NAME}</div>
          <h1 className="text-2xl font-bold text-fg mb-1">Kartu Nilai Siswa</h1>
          <p className="text-base font-medium text-fg/80">{card.meta.title}</p>
        </header>

        {/* Identitas siswa + total skor besar */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted mb-0.5">Nama Siswa</div>
            <div className="font-bold text-xl text-fg">{card.meta.studentName}</div>
            {card.meta.context && (
              <div className="text-xs text-muted mt-2 italic">{card.meta.context}</div>
            )}
            <div className="text-xs text-muted mt-1">Tanggal: {card.meta.generatedAtLocal}</div>
          </div>
          <div className={`rounded-xl p-4 text-center ${
            card.total >= 7.5 ? 'bg-green-50 border-2 border-green-300' :
            card.total >= 6.0 ? 'bg-sky-50 border-2 border-sky-300' :
            card.total >= 5.0 ? 'bg-amber-50 border-2 border-amber-300' :
                                'bg-red-50 border-2 border-red-300'
          }`}>
            <div className="text-xs uppercase tracking-wide text-muted mb-1">Nilai Akhir</div>
            <div className="text-5xl font-bold text-fg mb-1">{card.total.toFixed(2)}</div>
            <div className="text-xs text-muted mb-2">dari skala 0–10</div>
            <span className={statusBadgeClass(card.status)}>{card.status}</span>
          </div>
        </section>

        {/* Tabel detail per kriteria */}
        <section className="mb-6">
          <h2 className="text-lg font-bold text-fg mb-3 border-l-4 border-sky-500 pl-3">Rincian Penilaian</h2>
          <table className="w-full text-sm border border-border">
            <thead>
              <tr className="bg-surface">
                <th className="border border-border px-3 py-2 text-left">Kriteria</th>
                <th className="border border-border px-3 py-2 text-right">Bobot</th>
                <th className="border border-border px-3 py-2 text-right">Skor</th>
                <th className="border border-border px-3 py-2 text-right">Kontribusi</th>
              </tr>
            </thead>
            <tbody>
              {card.perKriteria.map((k, i) => (
                <tr key={i}>
                  <td className="border border-border px-3 py-2">
                    <div className="font-medium">{k.nama}</div>
                    {k.deskripsi && <div className="text-[11px] text-muted mt-0.5">{k.deskripsi}</div>}
                    {k.komentar && (
                      <div className="text-xs text-fg/80 mt-1.5 italic bg-surface px-2 py-1 rounded">
                        “{k.komentar}”
                      </div>
                    )}
                  </td>
                  <td className="border border-border px-3 py-2 text-right align-top">{k.bobot}%</td>
                  <td className="border border-border px-3 py-2 text-right align-top font-bold">{k.skor != null ? k.skor.toFixed(1) : '-'}</td>
                  <td className="border border-border px-3 py-2 text-right align-top">{k.kontribusi.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface font-bold">
                <td colSpan={3} className="border border-border px-3 py-2 text-right">Total Akhir:</td>
                <td className="border border-border px-3 py-2 text-right">{card.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Kesimpulan / catatan */}
        {card.kesimpulan && (
          <section className="mb-6">
            <h2 className="text-lg font-bold text-fg mb-3 border-l-4 border-accent pl-3">Kesimpulan</h2>
            <div className="bg-surface border border-border rounded-lg p-4 text-sm text-fg/80 leading-relaxed">
              {card.kesimpulan}
            </div>
          </section>
        )}

        {/* Posisi relatif terhadap kelas */}
        {classReport && classReport.summary.totalSiswa > 1 && (
          <section className="mb-4">
            <h2 className="text-lg font-bold text-fg mb-3 border-l-4 border-accent pl-3">Posisi di Kelas</h2>
            <div className="text-sm text-fg/80">
              Rata-rata kelas: <strong>{classReport.summary.mean.toFixed(2)}</strong> ·
              Selisih siswa ini: <strong className={card.total >= classReport.summary.mean ? 'text-green-600' : 'text-red-600'}>
                {card.total >= classReport.summary.mean ? '+' : ''}{(card.total - classReport.summary.mean).toFixed(2)}
              </strong>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border text-xs text-muted">
          <div className="grid grid-cols-2 gap-8 mt-6">
            <div>
              <p className="mb-12">Penilai,</p>
              <p className="border-t border-fg/30 pt-1">(______________________)</p>
            </div>
            <div className="text-right">
              <p className="mb-12">Mengetahui,</p>
              <p className="border-t border-fg/30 pt-1">Wali Murid / Penanggung Jawab</p>
            </div>
          </div>
        </footer>
      </article>
    </>
  )
}

// =====================================================
//  Helpers
// =====================================================
function Stat({ label, value, highlight = 'gray' }) {
  const cls = {
    gray:  'bg-surface border-border',
    green: 'bg-green-50 border-green-200',
    red:   'bg-red-50 border-red-200',
    sky:   'bg-sky-50 border-sky-200',
  }[highlight] || 'bg-surface border-border'
  return (
    <div className={`rounded-lg border px-3 py-2 ${cls}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="text-lg font-bold text-fg">{value}</div>
    </div>
  )
}

function statusBadgeClass(status) {
  const map = {
    'Sangat Baik':      'bg-green-100 text-green-700 px-2 py-0.5 rounded text-[11px] font-medium',
    'Baik':             'bg-sky-100 text-sky-700 px-2 py-0.5 rounded text-[11px] font-medium',
    'Cukup':            'bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[11px] font-medium',
    'Perlu Perbaikan':  'bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[11px] font-medium',
    'Belum Memenuhi':   'bg-red-100 text-red-700 px-2 py-0.5 rounded text-[11px] font-medium',
  }
  return map[status] || 'bg-surface text-fg/80 px-2 py-0.5 rounded text-[11px] font-medium'
}

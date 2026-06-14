// MethodologyPanel — kombinasi 3 strategi:
//   C: Validation badge + disclaimer (klaim "setara R/SPSS/JASP")
//   B: Citation block (paragraf siap-paste untuk Bab III + APA reference)
//   A: R script export (download .R file untuk replikasi di RStudio)
//
// Tujuan: kasih user "amunisi" konkret untuk skripsi — jadi tool ini bisa dipakai
// sebagai media analisis yang defensible secara akademik, tanpa klaim palsu
// "diolah dengan SPSS".

import { useState } from 'react'
import { CheckCircle, FileCode, BookOpen, Copy, Download } from 'lucide-react'
import { buildMethodsParagraph, buildAPACitation, VALIDATION_NOTE } from '../lib/citations'
import { generateRScript, downloadRScript } from '../lib/rScriptGenerator'
import { toast } from '../lib/toast'

export default function MethodologyPanel({ result }) {
  const [activeTab, setActiveTab] = useState('citation')
  const [showRScript, setShowRScript] = useState(false)

  const methodsParagraph = buildMethodsParagraph(result)
  const apaCitation = buildAPACitation()
  const rScript = generateRScript(result)

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} disalin ke clipboard`)
    } catch {
      toast.error('Gagal menyalin')
    }
  }

  const handleDownloadR = () => {
    downloadRScript(result, `${result.type}_${Date.now()}.R`)
    toast.success('R script di-download (.R file)')
  }

  return (
    <div className="mt-5 bg-card rounded-2xl border border-border overflow-hidden">
      {/* Validation badge header (Strategy C) */}
      <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100 flex items-start gap-2.5">
        <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-emerald-900">Hasil terverifikasi setara R, SPSS, dan JASP</div>
          <div className="text-[12px] text-emerald-800/80 leading-relaxed mt-0.5">
            {VALIDATION_NOTE}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-surface/50">
        <TabButton active={activeTab === 'citation'} onClick={() => setActiveTab('citation')} icon={BookOpen}>
          Untuk Skripsi
        </TabButton>
        <TabButton active={activeTab === 'rscript'} onClick={() => setActiveTab('rscript')} icon={FileCode}>
          R Script (Reproducible)
        </TabButton>
      </div>

      {/* Tab content */}
      <div className="p-5">
        {activeTab === 'citation' && (
          <CitationTab
            methodsParagraph={methodsParagraph}
            apaCitation={apaCitation}
            onCopy={copy}
          />
        )}
        {activeTab === 'rscript' && (
          <RScriptTab
            rScript={rScript}
            showFull={showRScript}
            onToggle={() => setShowRScript(!showRScript)}
            onCopy={() => copy(rScript, 'R script')}
            onDownload={handleDownloadR}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================
// Subcomponents
// ============================================================
function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button onClick={onClick}
      className={`px-5 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
        active
          ? 'border-gray-900 text-gray-900 dark:text-gray-100 bg-card'
          : 'border-transparent text-muted hover:text-gray-800 dark:text-gray-200'
      }`}>
      <Icon className="w-4 h-4" />
      {children}
    </button>
  )
}

function CitationTab({ methodsParagraph, apaCitation, onCopy }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">Bab III — Teknik Analisis Data</div>
            <div className="text-[12px] text-muted mt-0.5">Salin paragraf ini ke bagian metode penelitian skripsi.</div>
          </div>
          <button onClick={() => onCopy(methodsParagraph, 'Paragraf metode')}
            className="text-xs text-gray-700 dark:text-gray-300 border border-border hover:bg-surface px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5" />
            Salin
          </button>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4 text-[13px] text-gray-800 dark:text-gray-200 leading-relaxed">
          {methodsParagraph}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">Daftar Pustaka (APA)</div>
            <div className="text-[12px] text-muted mt-0.5">Referensi R untuk daftar pustaka.</div>
          </div>
          <button onClick={() => onCopy(apaCitation, 'Citation')}
            className="text-xs text-gray-700 dark:text-gray-300 border border-border hover:bg-surface px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5" />
            Salin
          </button>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4 text-[13px] text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
          {apaCitation}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-[12px] text-amber-900 leading-relaxed">
        <strong className="font-semibold">Catatan untuk dospem:</strong> Web ini adalah asisten pre-processing dan visualisasi.
        Untuk dokumentasi formal, jalankan kode R di tab sebelah, kemudian sertakan
        screenshot output sebagai lampiran. R adalah perangkat statistik gratis dan terbuka,
        digunakan luas di komunitas akademik internasional, dan resmi dapat dirujuk dalam karya ilmiah.
      </div>
    </div>
  )
}

function RScriptTab({ rScript, showFull, onToggle, onCopy, onDownload }) {
  const preview = rScript.split('\n').slice(0, 12).join('\n') + '\n...'

  return (
    <div className="space-y-4">
      <div className="text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed">
        Kode R reproducible — data sudah ter-embed sebagai vector, jadi bisa langsung di-Run di RStudio
        tanpa perlu file eksternal. Output Console akan persis seperti analisis R native.
      </div>

      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <div className="px-3 sm:px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted font-mono">
            <FileCode className="w-3.5 h-3.5" />
            analysis.R
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={onCopy}
              className="text-[11px] text-muted hover:text-white px-2 py-1 rounded inline-flex items-center gap-1 whitespace-nowrap">
              <Copy className="w-3 h-3" />
              Salin
            </button>
            <button onClick={onDownload}
              className="text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded inline-flex items-center gap-1 font-medium whitespace-nowrap">
              <Download className="w-3 h-3" />
              .R file
            </button>
          </div>
        </div>
        <pre className="p-4 text-[11.5px] text-gray-100 font-mono leading-relaxed overflow-x-auto max-h-96 whitespace-pre">
          {showFull ? rScript : preview}
        </pre>
        {!showFull && (
          <button onClick={onToggle}
            className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs text-muted border-t border-gray-700">
            Tampilkan kode lengkap
          </button>
        )}
        {showFull && (
          <button onClick={onToggle}
            className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs text-muted border-t border-gray-700">
            Ringkas
          </button>
        )}
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-lg p-3.5 text-[12px] text-sky-900 leading-relaxed">
        <strong className="font-semibold">Cara pakai (langkah cepat):</strong>
        <ol className="list-decimal pl-5 mt-1.5 space-y-1">
          <li>Download <strong>RStudio Desktop</strong> (gratis): <a href="https://posit.co/download/rstudio-desktop/" target="_blank" rel="noopener noreferrer" className="underline">posit.co/download/rstudio-desktop</a> — atau gunakan <strong>RStudio Cloud</strong>: <a href="https://posit.cloud" target="_blank" rel="noopener noreferrer" className="underline">posit.cloud</a> (tanpa install).</li>
          <li>Klik tombol <strong>.R file</strong> di atas untuk download script.</li>
          <li>Buka file di RStudio → Pilih semua kode (Ctrl+A) → Klik <strong>Run</strong>.</li>
          <li>Screenshot output dari panel Console untuk dilampirkan di skripsi.</li>
        </ol>
      </div>
    </div>
  )
}

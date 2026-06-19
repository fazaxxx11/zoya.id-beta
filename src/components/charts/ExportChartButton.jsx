import { useState } from 'react'
import html2canvas from 'html2canvas'
import { Download, Loader2 } from 'lucide-react'
import { toast } from '../../lib/toast'

/**
 * Export Chart Button — Wrapper component for exporting charts to PNG
 * Usage: Wrap chart with div ref, pass ref to this button
 */
export function ExportChartButton({ chartRef, filename = 'azezmen-chart', className = '' }) {
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (!chartRef?.current) {
      toast.error('Chart reference tidak ditemukan')
      return
    }

    setExporting(true)
    try {
      // Wait for recharts animations to complete
      await new Promise(resolve => setTimeout(resolve, 300))

      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // HD quality (2x pixel density)
        logging: false,
        useCORS: true,
        allowTaint: false,
      })

      // Convert canvas to blob and trigger download
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Gagal generate gambar')
          return
        }

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
        link.download = `${filename}-${timestamp}.png`
        link.href = url
        link.click()

        // Cleanup
        URL.revokeObjectURL(url)
        toast.success('Grafik berhasil diexport! 📊✨')
      }, 'image/png', 0.95)
    } catch (err) {
      console.error('[ExportChartButton]', err)
      toast.error(`Export gagal: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      title="Export grafik sebagai gambar PNG (HD)"
    >
      {exporting ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          <span>Exporting...</span>
        </>
      ) : (
        <>
          <Download size={16} />
          <span>Export PNG</span>
        </>
      )}
    </button>
  )
}

/**
 * Export All Charts Button — Export multiple charts as separate PNGs
 */
export function ExportAllChartsButton({ chartRefs, baseFilename = 'azezmen', className = '' }) {
  const [exporting, setExporting] = useState(false)

  async function handleExportAll() {
    if (!chartRefs || chartRefs.length === 0) {
      toast.error('Tidak ada chart untuk diexport')
      return
    }

    setExporting(true)
    let successCount = 0

    try {
      for (let i = 0; i < chartRefs.length; i++) {
        const ref = chartRefs[i]
        if (!ref?.current) continue

        await new Promise(resolve => setTimeout(resolve, 300))
        const canvas = await html2canvas(ref.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: false,
        })

        await new Promise((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
              link.download = `${baseFilename}-chart-${i + 1}-${timestamp}.png`
              link.href = url
              link.click()
              URL.revokeObjectURL(url)
              successCount++
            }
            resolve()
          }, 'image/png', 0.95)
        })

        // Delay between exports to avoid overwhelming browser
        if (i < chartRefs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      toast.success(`${successCount} grafik berhasil diexport! 📊✨`)
    } catch (err) {
      console.error('[ExportAllChartsButton]', err)
      toast.error(`Export gagal: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExportAll}
      disabled={exporting}
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      title="Export semua grafik sebagai PNG"
    >
      {exporting ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          <span>Exporting...</span>
        </>
      ) : (
        <>
          <Download size={16} />
          <span>Export Semua</span>
        </>
      )}
    </button>
  )
}

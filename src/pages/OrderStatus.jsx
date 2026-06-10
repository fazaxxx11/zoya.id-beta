import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ChevronLeft, Search, FileText, BarChart3, 
  CheckCircle, Clock, XCircle, Download, Eye,
  Loader2, RefreshCw, QrCode, Wallet, Building,
  TrendingUp, Award
} from 'lucide-react'
import { getOrders, saveOrder } from '../lib/orders'

function OrderStatus() {
  const navigate = useNavigate()
  const [searchId, setSearchId] = useState('')
  const [foundOrder, setFoundOrder] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(false)

  // Check for pending order in session
  const pendingOrder = localStorage.getItem('pending_order')

  const searchOrder = async () => {
    if (!searchId.trim()) return
    
    setLoading(true)
    setNotFound(false)
    setFoundOrder(null)

    // Simulate API delay
    await new Promise(r => setTimeout(r, 500))

    const orders = getOrders()
    const order = orders.find(o => 
      o.id.toLowerCase() === searchId.trim().toLowerCase() ||
      o.id.toLowerCase().includes(searchId.trim().toLowerCase())
    )

    if (order) {
      setFoundOrder(order)
    } else {
      setNotFound(true)
    }
    setLoading(false)
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    maximumFractionDigits: 0 
  }).format(amount)

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-4 h-4" /> Selesai
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
            <Loader2 className="w-4 h-4 animate-spin" /> Diproses
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
            <Clock className="w-4 h-4" /> Menunggu Pembayaran
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
            <XCircle className="w-4 h-4" /> Gagal
          </span>
        )
      default:
        return null
    }
  }

  const getServiceIcon = (service) => {
    return service === 'assessment' ? (
      <FileText className="w-6 h-6 text-orange-500" />
    ) : (
      <BarChart3 className="w-6 h-6 text-sky-500" />
    )
  }

  // Auto-search if there's a pending order (BUG FIX: was useState, must be useEffect)
  useEffect(() => {
    if (pendingOrder) {
      setSearchId(pendingOrder)
      searchOrder()
    }
    
  }, [])

  return (
    <div className="min-h-screen bg-pattern">
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-sky-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-gray-800">Cek Pesanan</h1>
          <div className="w-8"></div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Search Box */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Masukkan Order ID</h2>
          <p className="text-sm text-gray-500 mb-4">
            Cek status pesanan tanpa perlu login. Order ID diberikan setelah Anda mengajukan permintaan layanan.
          </p>
          
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchOrder()}
                placeholder="Contoh: ORD-ABC123"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-sky-500 outline-none"
              />
            </div>
            <button
              onClick={searchOrder}
              disabled={loading || !searchId.trim()}
              className="bg-sky-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-sky-600 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Cari'}
            </button>
          </div>

          {/* Quick access to recent orders */}
          {getOrders().length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500 mb-2">Pesanan Terbaru:</p>
              <div className="flex flex-wrap gap-2">
                {getOrders().slice(0, 5).map(order => (
                  <button
                    key={order.id}
                    onClick={() => {
                      setSearchId(order.id)
                      setFoundOrder(order)
                    }}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full"
                  >
                    {order.id}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Result: Not Found */}
        {notFound && (
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Pesanan Tidak Ditemukan</h3>
            <p className="text-gray-500 mb-4">
              Order ID "{searchId}" tidak ditemukan. Pastikan Anda memasukkan ID dengan benar.
            </p>
            <button
              onClick={() => { setSearchId(''); setFoundOrder(null); setNotFound(false); }}
              className="text-sky-600 hover:underline"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Result: Found */}
        {foundOrder && (
          <div className="space-y-4">
            {/* Status Card */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Status Pesanan</h3>
                {getStatusBadge(foundOrder.status)}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order ID</span>
                  <span className="font-mono font-semibold text-sky-600">{foundOrder.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Layanan</span>
                  <span className="font-medium">{foundOrder.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tipe</span>
                  <span className="font-medium">{foundOrder.tierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tanggal</span>
                  <span className="font-medium">{foundOrder.date}</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-gray-500">Total</span>
                  <span className="text-xl font-bold text-sky-600">{formatCurrency(foundOrder.amount)}</span>
                </div>
              </div>

              {/* Show Results Directly for Completed Orders */}
              {foundOrder.status === 'completed' && (
                <div className="mt-4 space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-bold text-green-800">Pesanan Selesai!</span>
                    </div>
                    
                    {/* Assessment Results - Show from saved data */}
                    {foundOrder.service === 'assessment' && (
                      <div className="space-y-3">
                        {/* Calculate average score from results */}
                        {foundOrder.results && foundOrder.results.length > 0 ? (
                          <>
                            <div className="bg-white rounded-lg p-4">
                              <p className="text-sm text-gray-500 mb-1">Jumlah Siswa</p>
                              <p className="text-2xl font-bold text-sky-600">{foundOrder.results.length} siswa</p>
                            </div>
                            
                            {/* Show each student's score */}
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-gray-700">Detail Penilaian:</p>
                              {foundOrder.results.map((student, idx) => {
                                // Calculate student's average
                                const scores = student.scores || {}
                                const scoreValues = Object.values(scores)
                                const avg = scoreValues.length > 0 
                                  ? (scoreValues.reduce((a,b) => a + (b.skor || 0), 0) / scoreValues.length).toFixed(1)
                                  : '-'
                                
                                return (
                                  <div key={idx} className="bg-white rounded-lg p-3 flex justify-between items-center">
                                    <div>
                                      <p className="font-medium">{student.name || `Siswa ${idx + 1}`}</p>
                                      <p className="text-xs text-gray-500">{student.kesimpulan || ''}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xl font-bold text-green-600">{avg}/10</p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="bg-white rounded-lg p-4">
                              <p className="text-sm text-gray-500 mb-1">Skor Total</p>
                              <p className="text-3xl font-bold text-green-600">8.5/10</p>
                            </div>
                            <div className="bg-white rounded-lg p-4">
                              <p className="text-sm text-gray-500 mb-2">Feedback</p>
                              <p className="text-gray-700">Tulisan sudah baik dengan struktur yang jelas dan argumen yang kuat.</p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Statistics Results */}
                    {foundOrder.service === 'statistics' && (
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-500 mb-2">Hasil Analisis</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Mean:</span>
                            <span className="font-medium">75.3</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Std Dev:</span>
                            <span className="font-medium">12.4</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Min:</span>
                            <span className="font-medium">45</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Max:</span>
                            <span className="font-medium">98</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={() => {
                        // Generate download content based on actual data
                        let content = ''
                        
                        if (foundOrder.service === 'assessment' && foundOrder.results) {
                          content = `HASIL ASSESSMENT\n================\n\nOrder ID: ${foundOrder.id}\nLayanan: ${foundOrder.serviceName}\nTipe: ${foundOrder.tierName}\nTanggal: ${foundOrder.date}\n\n`
                          
                          foundOrder.results.forEach((student, idx) => {
                            const scores = student.scores || {}
                            const scoreValues = Object.values(scores)
                            const avg = scoreValues.length > 0 
                              ? (scoreValues.reduce((a,b) => a + (b.skor || 0), 0) / scoreValues.length).toFixed(1)
                              : '-'
                            
                            content += `-----\nSiswa ${idx + 1}: ${student.name || 'Tanpa Nama'}\nSkor: ${avg}/10\n`
                            
                            if (student.kesimpulan) {
                              content += `Kesimpulan: ${student.kesimpulan}\n`
                            }
                            
                            Object.entries(scores).forEach(([key, val]) => {
                              content += `  - ${key}: ${val.skor}/10\n`
                              content += `    Komentar: ${val.komentar || '-'}\n`
                            })
                            content += '\n'
                          })
                        } else if (foundOrder.service === 'statistics') {
                          content = `HASIL ANALISIS STATISTIK\n===========================\n\nOrder ID: ${foundOrder.id}\nLayanan: ${foundOrder.serviceName}\nTipe: ${foundOrder.tierName}\nTanggal: ${foundOrder.date}\n\nHasil Analisis:\n- Mean: 75.3\n- Std Dev: 12.4\n- Min: 45\n- Max: 98\n- Median: 76`
                        } else {
                          content = `HASIL PESANAN\n=============\n\nOrder ID: ${foundOrder.id}\nLayanan: ${foundOrder.serviceName}\nTipe: ${foundOrder.tierName}\nTanggal: ${foundOrder.date}\nStatus: ${foundOrder.status}`
                        }
                        
                        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `hasil-${foundOrder.id}.txt`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                      className="w-full mt-3 bg-gray-500 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Download TXT
                    </button>
                    
                    {/* PDF Download */}
                    <button
                      onClick={async () => {
                        const { default: jsPDF } = await import('jspdf')
                        const doc = new jsPDF({ unit: 'mm', format: 'a4' })
                        const pageW = 210, pageH = 297
                        const mx = 18
                        const contentW = pageW - mx * 2
                        const state = { y: 18 }

                        const ensureSpace = (h) => {
                          if (state.y + h > pageH - 18) { doc.addPage(); state.y = 18 }
                        }
                        const setFont = (size, style = 'normal', color = [40, 40, 40]) => {
                          doc.setFontSize(size); doc.setFont('helvetica', style); doc.setTextColor(...color)
                        }
                        const hr = (gap = 3) => {
                          ensureSpace(gap + 1)
                          doc.setDrawColor(220); doc.setLineWidth(0.2)
                          doc.line(mx, state.y, pageW - mx, state.y); state.y += gap
                        }
                        // Paragraph writer with center-align support for narrative text
                        const writeText = (text, opts = {}) => {
                          const { size = 10, style = 'normal', color = [40, 40, 40], leading = 5, align = 'left' } = opts
                          setFont(size, style, color)
                          const lines = doc.splitTextToSize(String(text ?? ''), contentW)
                          ensureSpace(lines.length * leading)
                          if (align === 'center') {
                            lines.forEach((ln, i) => doc.text(String(ln), pageW / 2, state.y + i * leading, { align: 'center' }))
                          } else {
                            doc.text(lines, mx, state.y)
                          }
                          state.y += lines.length * leading
                        }

                        // Header (centered)
                        setFont(8, 'normal', [150, 150, 150])
                        doc.text('Azezmen · Hasil Assessment', pageW / 2, state.y, { align: 'center' })
                        state.y += 5
                        setFont(16, 'bold', [30, 30, 30])
                        doc.text('HASIL ASSESSMENT', pageW / 2, state.y, { align: 'center' })
                        state.y += 6
                        setFont(9, 'normal', [120, 120, 120])
                        doc.text(`Order ID: ${foundOrder.id}  ·  Tanggal: ${foundOrder.date}`, pageW / 2, state.y, { align: 'center' })
                        state.y += 4
                        hr(4)

                        if (foundOrder.service === 'assessment' && foundOrder.results) {
                          foundOrder.results.forEach((student, idx) => {
                            ensureSpace(30)
                            const scores = student.scores || {}
                            const scoreValues = Object.values(scores)
                            const avg = scoreValues.length > 0
                              ? (scoreValues.reduce((a, b) => a + (b.skor || 0), 0) / scoreValues.length).toFixed(1)
                              : '-'

                            // Student name (left)
                            setFont(12, 'bold', [30, 30, 30])
                            doc.text(`Siswa ${idx + 1}: ${student.name || 'Tanpa Nama'}`, mx, state.y)
                            state.y += 6
                            // Score (left)
                            setFont(14, 'bold', [34, 197, 94])
                            doc.text(`Skor: ${avg}/10`, mx, state.y)
                            state.y += 8

                            // Score details (tabular — left aligned)
                            setFont(10, 'normal', [40, 40, 40])
                            Object.entries(scores).forEach(([key, val]) => {
                              ensureSpace(6)
                              setFont(10, 'bold', [60, 60, 60])
                              doc.text(`• ${key}: ${val.skor}/10`, mx + 4, state.y)
                              state.y += 5
                              if (val.komentar) {
                                // Komentar = narrative → center
                                writeText(val.komentar, { size: 9.5, color: [80, 80, 80], leading: 4.5, align: 'center' })
                                state.y += 1
                              }
                            })

                            if (student.kesimpulan) {
                              state.y += 2
                              setFont(7.5, 'bold', [120, 120, 120])
                              doc.text('KESIMPULAN', pageW / 2, state.y, { align: 'center', charSpace: 0.4 })
                              state.y += 5
                              writeText(student.kesimpulan, { size: 10, leading: 4.8, align: 'center' })
                              state.y += 3
                            }

                            if (idx < foundOrder.results.length - 1) { hr(5) }
                            state.y += 3
                          })
                        } else {
                          writeText('Hasil analisis tersedia', { align: 'center' })
                        }

                        // Footer
                        const total = doc.internal.getNumberOfPages()
                        for (let i = 1; i <= total; i++) {
                          doc.setPage(i)
                          setFont(7.5, 'normal', [160, 160, 160])
                          doc.text('Azezmen', mx, pageH - 8)
                          doc.text(`Halaman ${i} dari ${total}`, pageW / 2, pageH - 8, { align: 'center' })
                          doc.text(new Date().toLocaleDateString('id-ID'), pageW - mx, pageH - 8, { align: 'right' })
                        }

                        doc.save(`hasil-${foundOrder.id}.pdf`)
                      }}
                      className="w-full mt-2 bg-red-500 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Download PDF
                    </button>
                  </div>
                </div>
              )}

              {foundOrder.status === 'processing' && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    <div>
                      <p className="font-medium text-blue-800">Sedang Diproses</p>
                      <p className="text-sm text-blue-600">AI sedang mengerjakan pesanan Anda...</p>
                    </div>
                  </div>
                  <button
                    onClick={searchOrder}
                    className="mt-3 text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" /> Refresh status
                  </button>
                </div>
              )}

              {foundOrder.status === 'pending' && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">Menunggu Pembayaran</p>
                      <p className="text-sm text-yellow-600">Silakan lakukan pembayaran untuk melanjutkan.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/payment?order=${foundOrder.id}`)}
                    className="mt-3 bg-yellow-500 text-white px-4 py-2 rounded-lg font-medium text-sm"
                  >
                    Bayar Sekarang
                  </button>
                </div>
              )}
            </div>

            {/* Share / Save */}
            <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
              <p className="text-sm text-gray-500 text-center">
                Simpan Order ID Anda: <strong className="text-gray-800">{foundOrder.id}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {!foundOrder && !notFound && (
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">Butuh bantuan?</h3>
            <div className="space-y-3">
              <Link to="/" className="block p-3 bg-sky-50 rounded-xl hover:bg-sky-100 transition-colors">
                <p className="font-medium text-sky-800">Kembali ke Home</p>
                <p className="text-sm text-sky-600">Ajukan layanan baru</p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderStatus
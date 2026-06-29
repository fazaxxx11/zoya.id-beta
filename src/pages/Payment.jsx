import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChevronLeft, CreditCard, QrCode, Wallet, Building,
  CheckCircle, Loader2, Home, History,
  ArrowRight, Gift, Zap, Activity, BookOpen
} from 'lucide-react'

// Import order & auth helpers from lib (no longer from pages)
import { saveOrder, getOrders } from '../lib/orders'
import { getWallet } from '../lib/wallet'
import { getCurrentUser, isAdminLogged } from '../lib/auth'
import { ADMIN_EMAIL } from '../lib/brand'
import { toast } from '../lib/toast'
import { BETA_FREE } from '../lib/pricing'

// Pricing configuration
export const SERVICE_PRICES = {
  assessment: {
    name: 'Assessment Tulisan AI',
    icon: <BookOpen className="w-8 h-8" />,
    tiers: [
      { id: 'pendek', name: 'Pendek (≤500 kata)', price: 3000 },
      { id: 'sedang', name: 'Sedang (≤1000 kata)', price: 5000 },
      { id: 'panjang', name: 'Panjang (≤2000+ kata)', price: 10000 },
    ]
  },
  statistics: {
    name: 'Analisis Statistik',
    icon: <Activity className="w-8 h-8" />,
    tiers: [
      { id: 'dasar', name: 'Statistik Dasar', price: 5000 },
      { id: 'lanjutan', name: 'Statistik Lanjutan', price: 10000 },
    ]
  }
}

const PAYMENT_METHODS = [
  { id: 'wallet', name: 'Saldodompet', icon: <Wallet className="w-8 h-8" />, desc: 'Bayar langsung dari saldo' },
  { id: 'qris', name: 'QRIS', icon: <QrCode className="w-8 h-8" />, desc: 'Scan langsung via mobile banking' },
  { id: 'dana', name: 'DANA', icon: <Wallet className="w-8 h-8" />, desc: 'Bayar via DANA app' },
  { id: 'gopay', name: 'GoPay', icon: <Wallet className="w-8 h-8" />, desc: 'Bayar via Gojek' },
  { id: 'bank', name: 'Bank Transfer', icon: <Building className="w-8 h-8" />, desc: 'Transfer ke rekening' },
]

function Payment() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const serviceType = searchParams.get('service') || 'assessment'
  const tierId = searchParams.get('tier') || 'sedang'
  const orderIdParam = searchParams.get('order')
  
  const service = SERVICE_PRICES[serviceType]
  const tier = service?.tiers.find(t => t.id === tierId) || service?.tiers[0]
  
  const [paymentMethod, setPaymentMethod] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [orderId, setOrderId] = useState(orderIdParam || null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [wallet, setWallet] = useState({ balance: 0, bonus: 0 })
  const [insufficientBalance, setInsufficientBalance] = useState(false)

  const currentUser = getCurrentUser()
  const isAdmin = isAdminLogged()
  const totalBalance = wallet.balance + wallet.bonus
  
  // Admin gets everything for free automatically
  const finalPrice = isAdmin ? 0 : (tier?.price || 0)

  useEffect(() => {
    if (currentUser) {
      const w = getWallet()
      setWallet(w)
    }
  }, [currentUser])

  // Generate random order ID
  const generateOrderId = () => {
    return 'ORD-' + Date.now().toString(36).toUpperCase().slice(2, 8)
  }

  // Auto-process for admin (skip payment)
  useEffect(() => {
    if (!BETA_FREE && isAdmin && !showSuccess && !processing) {
      // Auto process for admin
      processAdminFree()
    }
  }, [isAdmin])

  if (BETA_FREE) {
    return (
      <div className="min-h-screen bg-pattern">
        <header className="bg-bg border-b border-border sticky top-0 z-50">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted hover:text-sky-600">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-fg">Beta Free</h1>
            <div className="w-8"></div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="bg-card rounded-xl p-8 border border-border text-center">
            <div className="w-16 h-16 mx-auto rounded-xl bg-accent-soft text-accent-fg flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-fg mb-2">Payment Coming Soon</h2>
            <p className="text-muted leading-relaxed">
              Semua tools inti sedang dibuka gratis selama beta untuk user terdaftar. Pricing, top-up, dan paket Pro/Premium akan diumumkan setelah payment selesai diaudit.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link to="/statistik" className="btn-primary justify-center">
                Buka Statistik
              </Link>
              <Link to="/assessment" className="btn-secondary justify-center">
                Buka Assessment
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const hasEnoughBalance = () => {
    if (!tier) return false
    return totalBalance >= tier.price
  }

  // Process order for free (admin)
  const processAdminFree = async () => {
    if (!tier) return
    
    setProcessing(true)
    const newOrderId = orderIdParam || generateOrderId()
    setOrderId(newOrderId)
    
    // Save order - free for admin
    const order = {
      id: newOrderId,
      service: serviceType,
      serviceName: service?.name,
      tier: tierId,
      tierName: tier?.name,
      amount: 0, // Free for admin
      status: 'processing',
      date: new Date().toLocaleString('id-ID', { 
        day: '2-digit', month: 'short', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      }),
      paymentMethod: 'admin_free',
      userId: ADMIN_EMAIL,
      result: null,
      createdAt: Date.now()
    }
    
    saveOrder(order)
    localStorage.setItem('pending_order', newOrderId)
    
    // Admin gratis — mark order paid, hasil akan diisi oleh service flow di halaman terkait
    setTimeout(() => {
      const completedOrder = {
        ...order,
        status: 'pending_service', // user perlu jalankan service di /assessment atau /statistik
        note: 'Pembayaran admin diterima. Silakan jalankan layanan di halaman terkait.',
      }
      saveOrder(completedOrder)
      setProcessing(false)
      setShowSuccess(true)
    }, 1000)
  }

  // Process order using wallet
  const processWithWallet = async () => {
    if (!tier) return
    
    setProcessing(true)
    
    // Wallet deduction sekarang lewat inline paywall di halaman tool
    // (deductWalletAndCreateOrder). Halaman Payment generic ini di-bypass
    // saat BETA_FREE; flow post-beta akan dirakit ulang.
    const result = { success: false, error: 'Pembayaran via halaman ini nonaktif. Gunakan tombol bayar di halaman tool.' }

    if (!result.success) {
      setInsufficientBalance(true)
      setProcessing(false)
      return
    }

    // (unreachable) Update wallet state
    setWallet(result.wallet)
    
    // Create and save order
    const newOrderId = orderIdParam || generateOrderId()
    setOrderId(newOrderId)
    
    const order = {
      id: newOrderId,
      service: serviceType,
      serviceName: service?.name,
      tier: tierId,
      tierName: tier?.name,
      amount: tier?.price,
      status: 'processing',
      date: new Date().toLocaleString('id-ID', { 
        day: '2-digit', month: 'short', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      }),
      paymentMethod: 'wallet',
      userId: currentUser?.email || 'guest',
      result: null,
      createdAt: Date.now()
    }
    
    saveOrder(order)
    localStorage.setItem('pending_order', newOrderId)
    
    // Saldo terpotong, order menunggu service di halaman terkait
    setTimeout(() => {
      const completedOrder = {
        ...order,
        status: 'pending_service',
        note: 'Pembayaran berhasil. Silakan jalankan layanan di halaman Assessment/Statistik.',
      }
      saveOrder(completedOrder)
      setProcessing(false)
      setShowSuccess(true)
    }, 1500)
  }

  // Process order via other payment methods
  const handlePayment = async () => {
    if (!paymentMethod) return
    
    // If admin selected, process for free
    if (paymentMethod === 'admin' || isAdmin) {
      await processAdminFree()
      return
    }
    
    // If wallet selected, use wallet
    if (paymentMethod === 'wallet') {
      await processWithWallet()
      return
    }
    
    setProcessing(true)
    const newOrderId = orderIdParam || generateOrderId()
    setOrderId(newOrderId)
    
    // Save pending order
    const order = {
      id: newOrderId,
      service: serviceType,
      serviceName: service?.name,
      tier: tierId,
      tierName: tier?.name,
      amount: tier?.price,
      status: 'pending',
      date: new Date().toLocaleString('id-ID', { 
        day: '2-digit', month: 'short', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      }),
      paymentMethod,
      userId: currentUser?.email || 'guest',
      createdAt: Date.now()
    }
    
    saveOrder(order)
    localStorage.setItem('pending_order', newOrderId)
    
    // Simulate payment processing
    setTimeout(() => {
      if (paymentMethod === 'qris') {
        setShowQR(true)
      } else {
        toast.success(`Pembayaran ${paymentMethod.toUpperCase()} dimulai`, {
          description: `Order ID: ${newOrderId}. Silakan lakukan pembayaran sesuai instruksi.`,
          duration: 6000,
        })
      }
      setProcessing(false)
    }, 1500)
  }

  const handleConfirmPayment = async () => {
    // After QR scan or payment confirmation
    setProcessing(true)
    
    // Update order status — setelah konfirmasi QR/transfer, order pending_service
    const orders = getOrders()
    const order = orders.find(o => o.id === orderId)
    if (order) {
      const updatedOrder = {
        ...order,
        status: 'pending_service',
        paymentMethod,
        paidAt: Date.now(),
        note: 'Pembayaran berhasil. Silakan jalankan layanan di halaman Assessment/Statistik.',
      }
      saveOrder(updatedOrder)
      setTimeout(() => {
        setProcessing(false)
        setShowSuccess(true)
      }, 1000)
    }
  }

  // Success View — pembayaran selesai, arahkan user ke service
  if (showSuccess) {
    const serviceUrl = serviceType === 'assessment' ? '/assessment' : '/statistik'
    const serviceLabel = serviceType === 'assessment' ? 'Assessment' : 'Statistik'

    return (
      <div className="min-h-screen bg-pattern">
        <header className="bg-card border-b border-border sticky top-0 z-50">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted hover:text-sky-600">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="font-bold text-fg">Hasil {service?.name}</h1>
              <div className="w-8"></div>
            </div>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {/* Success Badge */}
          <div className="bg-card rounded-xl p-6 border border-border text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-fg mb-2">Selesai!</h2>
            <p className="text-muted">
              Pesanan Anda telah diproses.
            </p>
            
            <div className="bg-accent-soft rounded-xl p-3 mt-4">
              <p className="text-sm text-sky-600">Order ID</p>
              <p className="text-lg font-mono font-bold text-sky-700">{orderId}</p>
            </div>
          </div>

          {/* Next step card */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-bold text-fg mb-2">Langkah Selanjutnya</h3>
            <p className="text-muted mb-4">
              Pembayaran berhasil. Silakan lanjutkan ke halaman {serviceLabel} untuk
              menjalankan layanan dan mendapatkan hasil.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              Order ini tersimpan di status <strong>menunggu layanan</strong>.
              Hasil akan muncul setelah Anda menjalankan {serviceLabel} di halaman terkait.
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => navigate(serviceUrl)}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              Lanjut ke {serviceLabel} <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate('/')}
              className="w-full px-6 py-3 rounded-xl border-2 border-border text-muted hover:bg-surface font-medium flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Kembali ke Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pattern">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted hover:text-sky-600">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-fg">Pembayaran</h1>
            <div className="w-8"></div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* User Wallet Info (if logged in) */}
        {currentUser && (
          <div className="bg-teal rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet className="w-6 h-6" />
                <div>
                  <p className="text-sm opacity-80">Saldo dompet</p>
                  <p className="text-xl font-bold">Rp {(wallet.balance + wallet.bonus).toLocaleString('id-ID')}</p>
                </div>
              </div>
              <Link to="/auth?mode=topup" className="bg-white/20 px-3 py-1 rounded-lg text-sm">
                Top-up
              </Link>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <h2 className="text-lg font-bold text-fg mb-4">Ringkasan Pesanan</h2>
          
          <div className="flex items-center gap-4 p-4 bg-surface rounded-xl">
            <div className="text-accent-fg">{service?.icon}</div>
            <div>
              <p className="font-semibold text-fg">{service?.name}</p>
              <p className="text-sm text-muted">{tier?.name}</p>
            </div>
            <div className="ml-auto">
              <p className="text-2xl font-bold text-accent-fg">Rp {tier?.price?.toLocaleString('id-ID')}</p>
            </div>
          </div>

          {orderId && (
            <div className="mt-3 p-2 bg-surface rounded-lg">
              <p className="text-xs text-muted">Order ID</p>
              <p className="font-mono text-sm">{orderId}</p>
            </div>
          )}
        </div>

        {/* Insufficient Balance Alert */}
        {insufficientBalance && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 font-medium mb-2">Saldo tidak cukup</p>
            <p className="text-sm text-red-600 mb-3">
              Saldo Anda: Rp {totalBalance.toLocaleString('id-ID')}
              <br />
              Dibutuhkan: Rp {tier?.price?.toLocaleString('id-ID')}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link to="/auth?mode=topup" className="w-full sm:flex-1 bg-red-500 text-white text-center py-2 rounded-lg text-sm font-medium">
                Top-up Sekarang
              </Link>
              <button onClick={() => setInsufficientBalance(false)} className="w-full sm:w-auto px-4 py-2 text-red-600 text-sm">
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Payment Method Selection */}
        {!showQR && (
          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-lg font-bold text-fg mb-4">Metode Pembayaran</h2>
            
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map(method => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  disabled={method.id === 'wallet' && !currentUser}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    paymentMethod === method.id 
                      ? 'border-accent bg-accent-soft'
                      : 'border-border hover:border-accent'
                  } ${method.id === 'wallet' && !currentUser ? 'opacity-50' : ''}`}
                >
                  <div className={`${paymentMethod === method.id ? 'text-accent-fg' : 'text-muted'} mb-1`}>
                    {method.icon}
                  </div>
                  <p className="font-semibold text-fg">{method.name}</p>
                  <p className="text-xs text-muted">{method.desc}</p>
                </button>
              ))}
            </div>

            <button
              onClick={handlePayment}
              disabled={!paymentMethod || processing}
              className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Bayar Sekarang Rp {tier?.price?.toLocaleString('id-ID')}
                </>
              )}
            </button>
          </div>
        )}

        {/* QRIS Display */}
        {showQR && (
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-fg mb-2">Silakan Scan QRIS</h2>
              <p className="text-muted mb-4">Order ID: {orderId}</p>
              
              <div className="w-48 h-48 bg-surface rounded-xl mx-auto mb-4 flex items-center justify-center">
                <div className="text-center text-muted">
                  <QrCode className="w-16 h-16 mx-auto mb-2" />
                  <p className="text-xs">QRIS Code</p>
                  <p className="text-xs">Rp {tier?.price?.toLocaleString('id-ID')}</p>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-amber-700">
                  Scan dalam 5 menit. QRIS akan expire setelah itu.
                </p>
              </div>

              <button 
                onClick={handleConfirmPayment}
                disabled={processing}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Konfirmasi Pembayaran
                  </>
                )}
              </button>
              
              <button 
                onClick={() => setShowQR(false)}
                className="w-full mt-3 text-muted text-sm"
              >
                Pilih metode lain
              </button>
            </div>
          </div>
        )}

        {/* Help */}
        <div className="text-center text-sm text-muted">
          <p>Butuh bantuan? <Link to="/order" className="text-sky-600 hover:underline">Cek pesanan</Link></p>
          {!currentUser && (
            <p className="mt-2">
              Atau <Link to="/auth" className="text-sky-600 hover:underline">login</Link> untuk top-up saldo.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Payment

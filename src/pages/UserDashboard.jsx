import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ChevronLeft, User, Wallet, History, Settings, LogOut,
  CreditCard, Gift, CheckCircle, Clock, FileText, BarChart3,
  Loader2, ArrowRight, Zap
} from 'lucide-react'
import { logoutUser } from '../lib/auth'
import { useCurrentUser } from '../lib/useCurrentUser'
import { subscribeWallet } from '../lib/wallet'
import { subscribeOrders } from '../lib/orders'
import { listAnalyses, countAnalyses } from '../lib/savedAnalyses'

function UserDashboard() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const [wallet, setWallet] = useState({ balance: 0, bonus: 0, transactions: [] })
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('orders')
  const [savedCount, setSavedCount] = useState(0)
  const [savedRecent, setSavedRecent] = useState([])
  const [savedLoading, setSavedLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadSaved() {
      try {
        const [c, l] = await Promise.all([countAnalyses(), listAnalyses({ limit: 5 })])
        if (cancelled) return
        setSavedCount(c)
        setSavedRecent(l.ok ? l.items : [])
      } finally {
        if (!cancelled) setSavedLoading(false)
      }
    }
    loadSaved()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }
    // Subscribe ke cache wallet & orders. Cache di-refresh otomatis dari Supabase
    // saat auth state berubah (lihat lib/wallet.js initWallet & lib/orders.js initOrders).
    const unsubW = subscribeWallet(setWallet)
    const unsubO = subscribeOrders(setOrders)
    return () => { unsubW(); unsubO() }
  }, [navigate, user])

  const handleLogout = () => {
    logoutUser()
    navigate('/')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-pattern flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    )
  }

  const totalBalance = wallet.balance + wallet.bonus

  const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    maximumFractionDigits: 0 
  }).format(amount)

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle className="w-3 h-3" /> Selesai
        </span>
      case 'processing':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <Loader2 className="w-3 h-3 animate-spin" /> Diproses
        </span>
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <Clock className="w-3 h-3" /> Menunggu
        </span>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-pattern">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted hover:text-sky-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-gray-800 dark:text-gray-200">Dashboard</h1>
          <button onClick={handleLogout} className="text-muted hover:text-red-500">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* User Info */}
        <div className="bg-gradient-to-br from-accent/20 via-card to-accent-2/10 rounded-none border-l-4 border-accent p-8 md:p-12">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-accent/20 rounded-lg flex items-center justify-center">
              <User className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{user.name}</h2>
              <p className="text-muted text-sm">{user.email}</p>
              {user.phone && <p className="text-muted text-sm">{user.phone}</p>}
            </div>
          </div>
        </div>

        {/* Wallet Card */}
        <div className="bg-card shadow-sm rounded-lg p-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Wallet className="w-5 h-5" />💰 Saldo
            </h3>
            <Link to="/auth" className="text-sm text-accent hover:underline">
              Top-up
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3">
              <p className="text-sm text-emerald-600">Saldo Utama</p>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(wallet.balance)}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
              <p className="text-sm text-amber-600">Bonus</p>
              <p className="text-xl font-bold text-amber-700">{formatCurrency(wallet.bonus)}</p>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t flex justify-between">
            <span className="text-muted text-sm">Total</span>
            <span className="font-bold text-lg">{formatCurrency(totalBalance)}</span>
          </div>
        </div>

        {/* Saved Analyses Card */}
        <div className="bg-card border border-border hover:border-accent/50 rounded-lg p-4 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Riwayat Analisis Statistik
            </h3>
            <Link to="/statistik/history" className="text-sm text-accent hover:underline flex items-center gap-1">
              Lihat semua <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-3">
              <p className="text-sm text-teal-600">Total Tersimpan</p>
              <p className="text-xl font-bold text-teal-700">
                {savedLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : savedCount}
              </p>
            </div>
            <div className="bg-accent/10 rounded-lg p-3">
              <p className="text-sm text-accent">Dengan Interpretasi AI</p>
              <p className="text-xl font-bold text-accent">
                {savedLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : savedRecent.filter(i => i.ai_interpretation).length}
              </p>
            </div>
          </div>

          {savedLoading ? (
            <div className="text-center py-4 text-muted text-sm">Memuat…</div>
          ) : savedRecent.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="w-10 h-10 text-muted mx-auto mb-2" />
              <p className="text-sm text-muted mb-3">Belum ada analisis tersimpan</p>
              <Link to="/statistik" className="inline-block text-xs text-accent hover:underline">
                Mulai analisis sekarang →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted uppercase tracking-wider mb-2">5 Terbaru</p>
              {savedRecent.map(item => (
                <Link key={item.id} to={`/statistik/history?id=${item.id}`}
                  className="block px-3 py-2.5 rounded-lg hover:bg-surface border border-border transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.title}</div>
                      <div className="text-xs text-muted mt-0.5 flex items-center gap-2">
                        <span>{item.tool_name}</span>
                        {item.sample_size && <><span className="text-muted">·</span><span>n={item.sample_size}</span></>}
                        {item.ai_interpretation && <><span className="text-muted">·</span><span className="text-emerald-600">+ AI</span></>}
                      </div>
                    </div>
                    <span className="text-xs text-muted whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 space-y-0">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'orders' ? 'bg-accent text-accent-fg' : 'bg-card text-gray-600 dark:text-gray-400'
            }`}
          >
            📦 Pesanan
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'transactions' ? 'bg-accent text-accent-fg' : 'bg-card text-gray-600 dark:text-gray-400'
            }`}
          >
            💳 Transaksi
          </button>
        </div>

        {/* Orders List */}
        {activeTab === 'orders' && (
          <div className="bg-card rounded-lg shadow-sm overflow-hidden">
            {orders.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-accent" />
                </div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Belum ada pesanan</h3>
                <p className="text-sm text-muted mb-4">Mulai jalankan analisis atau penilaian untuk melihat history pesanan di sini.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Link to="/statistik" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-accent-fg text-sm font-medium">
                    <BarChart3 className="w-4 h-4" /> Statistik
                  </Link>
                  <Link to="/assessment" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium">
                    <FileText className="w-4 h-4" /> Assessment
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {orders.map(order => {
                  const serviceLabel = order.serviceName || (order.service === 'assessment' ? 'Assessment AI' : order.service === 'statistics' ? 'Analisis Statistik' : order.service)
                  const tierLabel = order.tierName || order.tier || ''
                  return (
                    <div key={order.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          {order.service === 'assessment' ? (
                            <FileText className="w-5 h-5 text-orange-500" />
                          ) : (
                            <BarChart3 className="w-5 h-5 text-teal-600" />
                          )}
                          <div>
                            <p className="font-medium">{serviceLabel}</p>
                            {tierLabel && <p className="text-sm text-muted capitalize">{tierLabel}</p>}
                            {order.results && (
                              <p className="text-xs text-amber-600">
                                {order.results.length} siswa dinilai
                              </p>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-muted">{order.id}</span>
                        <div className="flex gap-2 items-center">
                          {order.status === 'completed' && (
                            <button
                              onClick={() => navigate(`/order?id=${order.id}`)}
                              className="text-xs bg-teal-50 dark:bg-teal-950/30 text-teal-600 px-2 py-1 rounded-full"
                            >
                              Lihat Hasil
                            </button>
                          )}
                          <span className="font-bold text-sky-600">
                            {order.amount > 0 ? formatCurrency(order.amount) : <span className="text-emerald-600 dark:text-emerald-400 text-sm">Gratis</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Transactions List */}
        {activeTab === 'transactions' && (
          <div className="bg-card rounded-lg shadow-sm overflow-hidden">
            {wallet.transactions.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Belum ada transaksi</h3>
                <p className="text-sm text-muted">Saat beta, semua tools gratis. Top-up & riwayat saldo akan tampil di sini setelah monetisasi dibuka.</p>
              </div>
            ) : (
              <div className="divide-y">
                {wallet.transactions.map(t => (
                  <div key={t.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{t.id}</p>
                      <p className="text-xs text-muted">{t.date}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${t.amount >= 0 || t.bonus ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {t.amount >= 0 || t.bonus ? '+' : ''}{formatCurrency(t.amount || t.bonus || 0)}
                      </p>
                      <p className="text-xs text-muted capitalize">{t.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/" className="bg-card border border-border hover:border-accent/50 p-4 rounded-lg text-center transition-colors">
            <Zap className="w-6 h-6 mx-auto mb-2 text-accent" />
            <p className="text-sm font-medium">Pesan Layanan</p>
          </Link>
          <Link to="/order" className="bg-card border border-border hover:border-accent/50 p-4 rounded-lg text-center transition-colors">
            <History className="w-6 h-6 mx-auto mb-2 text-accent" />
            <p className="text-sm font-medium">Cek Pesanan</p>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default UserDashboard
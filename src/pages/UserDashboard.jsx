import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ChevronLeft, User, Wallet, History, Settings, LogOut,
  CreditCard, Gift, CheckCircle, Clock, FileText, Activity,
  Loader2, ArrowRight, Zap, Trash2
} from 'lucide-react'
import { logoutUser } from '../lib/auth'
import { useCurrentUser } from '../lib/useCurrentUser'
import { subscribeWallet } from '../lib/wallet'
import { subscribeOrders } from '../lib/orders'
import { listAnalyses, countAnalyses, deleteAnalysis } from '../lib/savedAnalyses'
import { toast } from '../lib/toast'
import { trackEvent } from '../lib/analytics'

// Simple skeleton pulse component
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-border/50 rounded ${className}`} />
}

function UserDashboard() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const [wallet, setWallet] = useState({ balance: 0, bonus: 0, transactions: [] })
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('orders')
  const [savedCount, setSavedCount] = useState(0)
  const [savedRecent, setSavedRecent] = useState([])
  const [savedLoading, setSavedLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const scrollRef = useRef(null)

  const refreshData = useCallback(async () => {
    setRefreshing(true)
    try {
      const [c, l] = await Promise.all([countAnalyses(), listAnalyses({ limit: 5 })])
      setSavedCount(c)
      setSavedRecent(l.ok ? l.items : [])
    } finally {
      setRefreshing(false)
    }
  }, [])

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
    trackEvent('dashboard_view')
    const unsubW = subscribeWallet(setWallet)
    const unsubO = subscribeOrders(setOrders)
    return () => { unsubW(); unsubO() }
  }, [navigate, user])

  const handleLogout = () => {
    logoutUser()
    toast.success('Sampai jumpa!')
    navigate('/')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-pattern flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
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
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-teal/10 text-teal">
          <CheckCircle className="w-3 h-3" /> Selesai
        </span>
      case 'processing':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent">
          <Loader2 className="w-3 h-3 animate-spin" /> Diproses
        </span>
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-terracotta/10 text-terracotta">
          <Clock className="w-3 h-3" /> Menunggu
        </span>
      default:
        return null
    }
  }

  // Pull to refresh
  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }

  const handleTouchEnd = (e) => {
    const diff = e.changedTouches[0].clientY - touchStartY.current
    if (diff > 80 && window.scrollY === 0 && !refreshing) {
      refreshData()
    }
  }

  return (
    <div
      className="min-h-screen bg-pattern"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {refreshing && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center py-2">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
        </div>
      )}
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted hover:text-accent">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-fg">Dashboard</h1>
          <button onClick={handleLogout} className="text-muted hover:text-terracotta">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* User Card — compact */}
        <div className="bg-card border-l-4 border-accent rounded-lg p-4 hover:border-l-accent/80 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="font-bold text-fg">{user.name}</h2>
                <p className="text-xs text-muted">{user.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-muted hover:text-terracotta">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero Metric */}
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          {savedLoading ? (
            <>
              <Skeleton className="w-24 h-14 mx-auto mb-3" />
              <Skeleton className="w-32 h-4 mx-auto" />
            </>
          ) : (
            <>
              <div className="text-6xl font-bold text-fg mb-3 tabular-nums">
                {savedCount}
              </div>
              <p className="text-base text-muted font-medium">Analisis Tersimpan</p>
              {savedCount > 0 && (
                <p className="text-xs text-muted mt-2">+{savedRecent.filter(i => i.ai_interpretation).length} dengan AI</p>
              )}
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/statistik" onClick={() => trackEvent('quick_action', { action: 'new_stat' })} className="group bg-card border border-border hover:border-accent rounded-lg active:scale-[0.98] p-4 transition-all">
            <Activity className="w-7 h-7 text-accent mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-semibold text-fg mb-1">Statistik Baru</p>
            <p className="text-xs text-muted">70+ uji tersedia</p>
          </Link>
          <Link to="/statistik/history" onClick={() => trackEvent('quick_action', { action: 'history' })} className="group bg-card border border-border hover:border-accent rounded-lg active:scale-[0.98] p-4 transition-all">
            <FileText className="w-7 h-7 text-accent mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-semibold text-fg mb-1">Lihat History</p>
            <p className="text-xs text-muted">{savedCount} analisis</p>
          </Link>
          <Link to="/auth" className="group bg-card border border-border hover:border-teal rounded-lg active:scale-[0.98] p-4 transition-all">
            <Wallet className="w-7 h-7 text-teal mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-semibold text-fg mb-1">Top Up</p>
            <p className="text-xs text-muted">{formatCurrency(totalBalance)}</p>
          </Link>
          <button onClick={() => setActiveTab('orders')} className="group bg-card border border-border hover:border-terracotta rounded-lg active:scale-[0.98] p-4 transition-all text-left">
            <Clock className="w-7 h-7 text-terracotta mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-semibold text-fg mb-1">Cek Order</p>
            <p className="text-xs text-muted">{orders.length} pesanan</p>
          </button>
        </div>

        {/* Recent Analyses */}
        {savedRecent.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-fg">Analisis Terbaru</h3>
              <Link to="/statistik/history" className="text-xs text-accent hover:underline flex items-center gap-1">
                Lihat semua <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {savedRecent.map(item => (
                <div key={item.id} className="group px-3 py-2.5 rounded-lg hover:bg-surface border border-border transition-colors active:scale-95">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-fg truncate">{item.title}</div>
                      <div className="text-xs text-muted mt-0.5 flex items-center gap-2">
                        <span>{item.tool_name}</span>
                        {item.sample_size && <><span className="text-muted">·</span><span>n={item.sample_size}</span></>}
                        {item.ai_interpretation && <><span className="text-muted">·</span><span className="text-teal">+ AI</span></>}
                      </div>
                    </div>
                    <span className="text-xs text-muted whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  {/* Actions — reveal on hover */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link to={`/statistik/history?id=${item.id}`}
                      className="flex-1 px-3 py-1.5 text-xs text-center bg-surface hover:bg-accent/10 rounded-lg border border-border transition-colors active:scale-95">
                      View
                    </Link>
                    <button
                      onClick={() => navigate('/statistik', { state: { rerunFromId: item.id } })}
                      className="flex-1 px-3 py-1.5 text-xs text-accent hover:bg-accent/10 rounded-lg transition-colors active:scale-95">
                      Rerun
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus "${item.title}"?`)) {
                          deleteAnalysis(item.id).then(() => {
                            setSavedRecent(prev => prev.filter(i => i.id !== item.id))
                            setSavedCount(prev => prev - 1)
                            toast.success('Analisis dihapus')
                            trackEvent('analysis_delete')
                          })
                        }
                      }}
                      className="group/delete p-1.5 text-muted hover:text-terracotta rounded-lg transition-colors active:scale-95">
                      <Trash2 className="w-4 h-4 group-hover/delete:rotate-12 transition-transform" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 space-y-0">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'orders' ? 'bg-accent text-accent-fg' : 'bg-card text-muted'
            }`}
          >
            <FileText className="w-4 h-4 inline" /> Pesanan
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'transactions' ? 'bg-accent text-accent-fg' : 'bg-card text-muted'
            }`}
          >
            <CreditCard className="w-4 h-4 inline" /> Transaksi
          </button>
        </div>

        {/* Orders List */}
        {activeTab === 'orders' && (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {orders.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-surface border border-border rounded-xl mx-auto mb-5 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-fg mb-2">Belum ada pesanan</h3>
                <p className="text-sm text-muted mb-6 max-w-xs mx-auto">Mulai jalankan analisis atau penilaian untuk melihat history pesanan di sini.</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Link to="/statistik" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-accent-fg text-sm font-medium transition-colors active:scale-95">
                    <Activity className="w-4 h-4" /> Mulai Statistik
                  </Link>
                  <Link to="/assessment" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-card border border-border hover:border-accent hover:text-accent text-sm font-medium transition-colors active:scale-95">
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
                            <FileText className="w-5 h-5 text-terracotta" />
                          ) : (
                            <Activity className="w-5 h-5 text-accent" />
                          )}
                          <div>
                            <p className="font-medium">{serviceLabel}</p>
                            {tierLabel && <p className="text-sm text-muted capitalize">{tierLabel}</p>}
                            {order.results && (
                              <p className="text-xs text-terracotta">
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
                              className="text-xs bg-card border border-accent text-accent px-2 py-1 rounded-full hover:bg-accent/10 transition-colors active:scale-95"
                            >
                              Lihat Hasil
                            </button>
                          )}
                          <span className="font-bold text-fg">
                            {order.amount > 0 ? formatCurrency(order.amount) : <span className="text-teal text-sm">Gratis</span>}
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
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {wallet.transactions.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-surface border border-border rounded-xl mx-auto mb-5 flex items-center justify-center">
                  <CreditCard className="w-10 h-10 text-teal" />
                </div>
                <h3 className="text-lg font-semibold text-fg mb-2">Belum ada transaksi</h3>
                <p className="text-sm text-muted max-w-xs mx-auto">Saat beta, semua tools gratis. Top-up & riwayat saldo akan tampil di sini setelah monetisasi dibuka.</p>
              </div>
            ) : (
              <div className="divide-y">
                {wallet.transactions.map(t => (
                  <div key={t.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-fg">{t.id}</p>
                      <p className="text-xs text-muted">{t.date}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${t.amount >= 0 || t.bonus ? 'text-teal' : 'text-terracotta'}`}>
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
      </div>
    </div>
  )
}

export default UserDashboard

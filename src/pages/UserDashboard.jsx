import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ChevronLeft, User, Wallet, History, Settings, LogOut,
  CreditCard, Gift, CheckCircle, Clock, FileText, BarChart3,
  Loader2, ArrowRight, Zap, Trash2
} from 'lucide-react'
import { logoutUser } from '../lib/auth'
import { useCurrentUser } from '../lib/useCurrentUser'
import { subscribeWallet } from '../lib/wallet'
import { subscribeOrders } from '../lib/orders'
import { listAnalyses, countAnalyses, deleteAnalysis } from '../lib/savedAnalyses'

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
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600">
          <CheckCircle className="w-3 h-3" /> Selesai
        </span>
      case 'processing':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-sky-50 dark:bg-sky-950/30 text-sky-600">
          <Loader2 className="w-3 h-3 animate-spin" /> Diproses
        </span>
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-600">
          <Clock className="w-3 h-3" /> Menunggu
        </span>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-pattern">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted hover:text-accent">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-fg">Dashboard</h1>
          <button onClick={handleLogout} className="text-muted hover:text-red-500">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* User Card — compact */}
        <div className="bg-card border-l-4 border-accent rounded-lg p-4">
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
            <button onClick={handleLogout} className="text-muted hover:text-red-500">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero Metric */}
        <div className="bg-gradient-to-br from-accent/5 to-transparent border border-border rounded-xl p-8 text-center">
          <div className="text-6xl font-bold text-fg mb-3 tabular-nums">
            {savedLoading ? <Loader2 className="w-12 h-12 animate-spin text-muted mx-auto" /> : savedCount}
          </div>
          <p className="text-base text-muted font-medium">Analisis Tersimpan</p>
          {savedCount > 0 && (
            <p className="text-xs text-muted mt-2">+{savedRecent.filter(i => i.ai_interpretation).length} dengan AI</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/statistik" className="group bg-card border border-border hover:border-accent hover:shadow-lg rounded-xl p-5 transition-all hover:-translate-y-1">
            <BarChart3 className="w-7 h-7 text-accent mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-semibold text-fg mb-1">Statistik Baru</p>
            <p className="text-xs text-muted">70+ uji tersedia</p>
          </Link>
          <Link to="/statistik/history" className="group bg-card border border-border hover:border-accent hover:shadow-lg rounded-xl p-5 transition-all hover:-translate-y-1">
            <FileText className="w-7 h-7 text-accent mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-semibold text-fg mb-1">Lihat History</p>
            <p className="text-xs text-muted">{savedCount} analisis</p>
          </Link>
          <Link to="/auth" className="group bg-card border border-border hover:border-emerald-500 hover:shadow-lg rounded-xl p-5 transition-all hover:-translate-y-1">
            <Wallet className="w-7 h-7 text-emerald-600 mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-semibold text-fg mb-1">Top Up</p>
            <p className="text-xs text-muted">{formatCurrency(totalBalance)}</p>
          </Link>
          <button onClick={() => setActiveTab('orders')} className="group bg-card border border-border hover:border-amber-500 hover:shadow-lg rounded-xl p-5 transition-all hover:-translate-y-1 text-left">
            <Clock className="w-7 h-7 text-amber-600 mb-3 group-hover:scale-110 transition-transform" />
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
                <div key={item.id} className="group px-3 py-2.5 rounded-lg hover:bg-surface border border-border transition-colors">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-fg truncate">{item.title}</div>
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
                  {/* Actions — reveal on hover */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link to={`/statistik/history?id=${item.id}`}
                      className="flex-1 px-3 py-1.5 text-xs text-center bg-surface hover:bg-accent/10 rounded-lg border border-border transition-colors">
                      View
                    </Link>
                    <button
                      onClick={() => navigate('/statistik', { state: { rerunFromId: item.id } })}
                      className="flex-1 px-3 py-1.5 text-xs text-accent hover:bg-accent/10 rounded-lg transition-colors">
                      Rerun
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus "${item.title}"?`)) {
                          deleteAnalysis(item.id).then(() => {
                            setSavedRecent(prev => prev.filter(i => i.id !== item.id))
                            setSavedCount(prev => prev - 1)
                          })
                        }
                      }}
                      className="group/delete p-1.5 text-muted hover:text-red-500 rounded-lg transition-colors">
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
          <div className="bg-card rounded-lg shadow-sm overflow-hidden">
            {orders.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-accent" />
                </div>
                <h3 className="font-semibold text-fg mb-1">Belum ada pesanan</h3>
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
                <h3 className="font-semibold text-fg mb-1">Belum ada transaksi</h3>
                <p className="text-sm text-muted">Saat beta, semua tools gratis. Top-up & riwayat saldo akan tampil di sini setelah monetisasi dibuka.</p>
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
      </div>
    </div>
  )
}

export default UserDashboard

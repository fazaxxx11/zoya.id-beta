import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ChevronLeft, User, Wallet, History, Settings, LogOut,
  CreditCard, Gift, CheckCircle, Clock, FileText, BarChart3,
  Loader2, ArrowRight, Zap
} from 'lucide-react'
import { logoutUser } from '../lib/auth'
import { useCurrentUser } from '../lib/useCurrentUser'
import { getWallet } from '../lib/wallet'
import { getOrders } from '../lib/orders'
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
    setWallet(getWallet())
    setOrders(getOrders().filter(o => o.userId === user.email || o.userId === 'guest'))
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
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-sky-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-gray-800">Dashboard</h1>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-500">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* User Info */}
        <div className="bg-gradient-to-br from-sky-500 to-cyan-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <User className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-sky-100 text-sm">{user.email}</p>
              {user.phone && <p className="text-sky-100 text-sm">{user.phone}</p>}
            </div>
          </div>
        </div>

        {/* Wallet Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Wallet className="w-5 h-5" />💰 Saldo
            </h3>
            <Link to="/auth" className="text-sm text-sky-600 hover:underline">
              Top-up
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-sm text-green-600">Saldo Utama</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(wallet.balance)}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-sm text-amber-600">Bonus</p>
              <p className="text-xl font-bold text-amber-700">{formatCurrency(wallet.bonus)}</p>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t flex justify-between">
            <span className="text-gray-500 text-sm">Total</span>
            <span className="font-bold text-lg">{formatCurrency(totalBalance)}</span>
          </div>
        </div>

        {/* Saved Analyses Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Riwayat Analisis Statistik
            </h3>
            <Link to="/statistik/history" className="text-sm text-sky-600 hover:underline flex items-center gap-1">
              Lihat semua <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-sky-50 rounded-xl p-4">
              <p className="text-sm text-sky-600">Total Tersimpan</p>
              <p className="text-xl font-bold text-sky-700">
                {savedLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : savedCount}
              </p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-sm text-purple-600">Dengan Interpretasi AI</p>
              <p className="text-xl font-bold text-purple-700">
                {savedLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : savedRecent.filter(i => i.ai_interpretation).length}
              </p>
            </div>
          </div>

          {savedLoading ? (
            <div className="text-center py-4 text-gray-400 text-sm">Memuat…</div>
          ) : savedRecent.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-3">Belum ada analisis tersimpan</p>
              <Link to="/statistik" className="inline-block text-xs text-sky-600 hover:underline">
                Mulai analisis sekarang →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">5 Terbaru</p>
              {savedRecent.map(item => (
                <Link key={item.id} to={`/statistik/history?id=${item.id}`}
                  className="block px-3 py-2.5 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                        <span>{item.tool_name}</span>
                        {item.sample_size && <><span className="text-gray-300">·</span><span>n={item.sample_size}</span></>}
                        {item.ai_interpretation && <><span className="text-gray-300">·</span><span className="text-emerald-600">+ AI</span></>}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'orders' ? 'bg-sky-500 text-white' : 'bg-white text-gray-600'
            }`}
          >
            📦 Pesanan
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'transactions' ? 'bg-sky-500 text-white' : 'bg-white text-gray-600'
            }`}
          >
            💳 Transaksi
          </button>
        </div>

        {/* Orders List */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Belum ada pesanan</p>
                <Link to="/" className="text-sky-600 hover:underline text-sm mt-2 inline-block">
                  Pilih layanan →
                </Link>
              </div>
            ) : (
              <div className="divide-y">
                {orders.map(order => (
                  <div key={order.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        {order.service === 'assessment' ? (
                          <FileText className="w-5 h-5 text-orange-500" />
                        ) : (
                          <BarChart3 className="w-5 h-5 text-sky-500" />
                        )}
                        <div>
                          <p className="font-medium">{order.serviceName}</p>
                          <p className="text-sm text-gray-500">{order.tierName}</p>
                          {order.results && (
                            <p className="text-xs text-orange-600">
                              {order.results.length} siswa dinilai
                            </p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-400">{order.id}</span>
                      <div className="flex gap-2">
                        {order.status === 'completed' && (
                          <button 
                            onClick={() => navigate(`/order?id=${order.id}`)}
                            className="text-xs bg-sky-100 text-sky-600 px-2 py-1 rounded"
                          >
                            Lihat Hasil
                          </button>
                        )}
                        <span className="font-bold text-sky-600">{formatCurrency(order.amount)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Transactions List */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {wallet.transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Belum ada transaksi</p>
              </div>
            ) : (
              <div className="divide-y">
                {wallet.transactions.map(t => (
                  <div key={t.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800">{t.id}</p>
                      <p className="text-xs text-gray-500">{t.date}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${t.amount >= 0 || t.bonus ? 'text-green-600' : 'text-red-600'}`}>
                        {t.amount >= 0 || t.bonus ? '+' : ''}{formatCurrency(t.amount || t.bonus || 0)}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{t.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/" className="bg-white p-4 rounded-xl border border-gray-100 text-center hover:bg-gray-50">
            <Zap className="w-6 h-6 mx-auto mb-2 text-sky-500" />
            <p className="text-sm font-medium">Pesan Layanan</p>
          </Link>
          <Link to="/order" className="bg-white p-4 rounded-xl border border-gray-100 text-center hover:bg-gray-50">
            <History className="w-6 h-6 mx-auto mb-2 text-sky-500" />
            <p className="text-sm font-medium">Cek Pesanan</p>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default UserDashboard
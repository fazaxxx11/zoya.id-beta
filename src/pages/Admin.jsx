import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ChevronLeft, DollarSign, TrendingUp, Users, Settings,
  LogOut, Download, CreditCard, CheckCircle,
  XCircle, Clock, Search, Eye, EyeOff, Lock
} from 'lucide-react'
import { verifyAdminPassword, ADMIN_EMAIL, BRAND_NAME } from '../lib/brand'
import { CURRENT_USER_KEY, ADMIN_FLAG_KEY, isAdminLogged } from '../lib/auth'
import {
  getPendingTopups, approvePendingTopup, rejectPendingTopup,
} from '../lib/wallet'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { formatIDR } from '../lib/pricing'
import { toast } from '../lib/toast'

/** Hitung stats dari orders yang sudah completed (paid) saja */
function computeStats(orders, userCount) {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  let todayRev = 0, totalRev = 0, todayTx = 0
  for (const o of orders) {
    if (!o.amount || o.amount <= 0) continue
    const isCompleted = o.status === 'completed' || o.status === 'processing'
    if (!isCompleted) continue
    totalRev += o.amount
    const orderDate = o.paid_at ? o.paid_at.slice(0, 10) : null
    if (orderDate === today) {
      todayRev += o.amount
      todayTx += 1
    }
  }
  return {
    todayRevenue: todayRev,
    totalRevenue: totalRev,
    todayTransactions: todayTx,
    totalTransactions: orders.filter(o => o.amount > 0).length,
    activeUsers: userCount,
  }
}

/** Normalisasi order Supabase + email map ke format tabel admin */
function normalizeOrders(orders, emailById) {
  return orders.map(o => ({
    id: o.id,
    user: emailById.get(o.user_id) || o.user_id?.slice(0, 8) || 'unknown',
    service: o.service === 'assessment' ? 'Assessment' : o.service === 'statistics' ? 'Statistik' : o.service,
    tier: o.tier || '-',
    amount: Number(o.amount || 0),
    method: o.payment_method || '-',
    status: o.status === 'processing' ? 'completed' : o.status,
    rawStatus: o.status,
    date: o.created_at ? new Date(o.created_at).toLocaleString('id-ID') : '-',
  }))
}

function Admin() {
  const navigate = useNavigate()
  // Auto-detect: kalau session admin masih hidup (flag di localStorage),
  // langsung skip login screen.
  const [isAuthenticated, setIsAuthenticated] = useState(() => isAdminLogged())
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState({ todayRevenue: 0, totalRevenue: 0, todayTransactions: 0, totalTransactions: 0, activeUsers: 0 })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [pendingTopups, setPendingTopups] = useState([])

  const [loadingData, setLoadingData] = useState(false)
  const [dataError, setDataError] = useState('')

  const refreshData = async () => {
    setDataError('')
    if (!isSupabaseConfigured) {
      setDataError('Supabase belum dikonfigurasi.')
      setTransactions([])
      setStats(computeStats([], 0))
      setPendingTopups(getPendingTopups())
      return
    }
    setLoadingData(true)
    try {
      const [profilesRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('id, email, name, role, created_at').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200),
      ])

      if (profilesRes.error) throw profilesRes.error
      if (ordersRes.error) throw ordersRes.error

      const profiles = profilesRes.data || []
      const orders = ordersRes.data || []
      const emailById = new Map(profiles.map(p => [p.id, p.email]))

      setTransactions(normalizeOrders(orders, emailById))
      setStats(computeStats(orders, profiles.length))
      setPendingTopups(getPendingTopups())

      // Warn kalau cuma dapat 1 profile (user current) — RLS mencegah lihat semua
      if (profiles.length <= 1) {
        setDataError('Hanya melihat data sendiri. Pastikan akun Supabase kamu sudah role=admin (cek tabel profiles).')
      }
    } catch (e) {
      console.error('[admin] refresh failed:', e)
      setDataError(e.message || 'Gagal memuat data dari Supabase')
    } finally {
      setLoadingData(false)
    }
  }

  // Load real orders & users on mount + saat tab admin diakses
  useEffect(() => {
    if (!isAuthenticated) return
    refreshData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const handleApproveTopup = async (id) => {
    const r = await approvePendingTopup(id)
    if (r.success) {
      toast.success(`Top-up ${id} disetujui — saldo ditambahkan`)
      refreshData()
    } else {
      toast.error(r.error || 'Gagal approve')
    }
  }

  const handleRejectTopup = (id) => {
    const reason = window.prompt('Alasan penolakan (opsional):', '') || ''
    const r = rejectPendingTopup(id, reason)
    if (r.success) {
      toast.warning(`Top-up ${id} ditolak`)
      refreshData()
    } else {
      toast.error(r.error || 'Gagal reject')
    }
  }

  const [loginError, setLoginError] = useState('')

  const handleLogin = (e) => {
    e.preventDefault()
    if (verifyAdminPassword(password)) {
      setIsAuthenticated(true)
      setLoginError('')
      localStorage.setItem(ADMIN_FLAG_KEY, 'true')
      // Set user session juga supaya admin bisa browse seperti user biasa
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
        email: ADMIN_EMAIL,
        name: 'Admin',
        isAdmin: true,
      }))
    } else {
      setLoginError('Password salah')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    // Clear admin flag saja — user session (CURRENT_USER) tetap supaya admin
    // bisa lanjut browse sebagai user biasa kalau mau. Untuk full logout,
    // gunakan menu Logout di /dashboard.
    localStorage.removeItem(ADMIN_FLAG_KEY)
    // Hapus flag isAdmin di user object juga supaya konsisten dengan flag.
    try {
      const u = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null')
      if (u && u.isAdmin) {
        const { isAdmin: _, role: __, ...rest } = u
        if (u.__synthetic) {
          // Synthetic admin: clear sekalian, jangan tinggalkan ghost user
          localStorage.removeItem(CURRENT_USER_KEY)
        } else {
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(rest))
        }
      }
    } catch {}
  }

  const goToUserMode = () => {
    // Switch to user mode - can browse and order
    navigate('/dashboard')
  }

  const goToHome = () => {
    // Go to home and use services
    navigate('/')
  }

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.user.toLowerCase().includes(searchTerm.toLowerCase()) || t.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || t.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)

  // Login Form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-pattern flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-sky-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Login</h1>
            <p className="text-gray-500 text-sm">{BRAND_NAME} — Akses terbatas</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setLoginError('') }}
                placeholder="Masukkan password admin"
                autoFocus
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-sky-500 outline-none"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {loginError && (
              <p className="text-sm text-red-600 -mt-2">{loginError}</p>
            )}
            <button type="submit" className="w-full bg-sky-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-sky-600 transition-all">
              Login
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-sky-600 hover:underline">← Kembali ke Home</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pattern">
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-sky-600">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-800">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={goToUserMode} className="flex items-center gap-2 text-sky-600 hover:text-sky-700 text-sm">
              <Users className="w-4 h-4" /> Dashboard User
            </button>
            <button onClick={goToHome} className="flex items-center gap-2 text-green-600 hover:text-green-700 text-sm">
              🏠 Gunakan Layanan
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-600">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Data status banner */}
        {dataError && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
            <Clock className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <strong>Catatan:</strong> {dataError}
            </div>
            <button onClick={refreshData} className="text-xs text-sky-600 hover:underline whitespace-nowrap">
              {loadingData ? 'Loading…' : 'Retry'}
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><DollarSign className="w-5 h-5 text-green-600"/></div>
              <span className="text-sm text-gray-500">Hari Ini</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.todayRevenue)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><TrendingUp className="w-5 h-5 text-blue-600"/></div>
              <span className="text-sm text-gray-500">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center"><CreditCard className="w-5 h-5 text-purple-600"/></div>
              <span className="text-sm text-gray-500">Transaksi Hari Ini</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.todayTransactions}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center"><Users className="w-5 h-5 text-orange-600"/></div>
              <span className="text-sm text-gray-500">Total Users</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.activeUsers}</p>
          </div>
        </div>

        {/* Pending Top-up Verification */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <h2 className="font-bold text-gray-800">Verifikasi Top-up Manual</h2>
              {pendingTopups.filter(p => p.status === 'pending').length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {pendingTopups.filter(p => p.status === 'pending').length} menunggu
                </span>
              )}
            </div>
            <button onClick={refreshData} className="text-xs text-sky-600 hover:underline">
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            {pendingTopups.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">Belum ada permintaan top-up manual.</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Order ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Nominal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Bonus</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Metode</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Waktu</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pendingTopups.slice(0, 30).map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-sky-600">{p.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{p.userEmail}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{formatIDR(p.amount)}</td>
                      <td className="px-4 py-3 text-sm text-emerald-600">+{formatIDR(p.bonus)}</td>
                      <td className="px-4 py-3 text-sm capitalize">{p.method}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.submittedAt}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          p.status === 'pending' ? 'bg-amber-100 text-amber-700'
                          : p.status === 'approved' ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                        }`}>{p.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {p.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveTopup(p.id)}
                              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-md font-medium flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => handleRejectTopup(p.id)}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md font-medium flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="p-3 bg-amber-50 border-t border-amber-200 text-xs text-amber-700">
            ⚠️ <strong>Catatan:</strong> Fitur approve ini menambah saldo pada device yang sedang login.
            Untuk multi-device sync, migrasi ke Supabase dulu.
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b flex flex-wrap gap-4 justify-between">
            <h2 className="font-bold text-gray-800">Transaction History</h2>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                <input type="text" placeholder="Cari..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border rounded-lg text-sm"/>
              </div>
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="px-4 py-2 border rounded-lg text-sm">
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm"><Download className="w-4 h-4"/>Export</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-sky-600">{t.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{t.user}</td>
                    <td className="px-4 py-3 text-sm"><span className="font-medium">{t.service}</span><span className="text-gray-400 text-xs block">{t.tier}</span></td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(t.amount)}</td>
                    <td className="px-4 py-3 text-sm capitalize">{t.method}</td>
                    <td className="px-4 py-3"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      t.status==='completed'?'bg-green-100 text-green-700':t.status==='pending'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'
                    }`}>{t.status}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{t.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Admin
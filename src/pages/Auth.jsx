import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChevronLeft, Mail, Lock, User, Phone, Eye, EyeOff,
  Loader2, CheckCircle, XCircle, Gift, Zap, Sparkles, Clock
} from 'lucide-react'
import {
  loginUser, logoutUser, registerUser,
} from '../lib/auth'
import { useCurrentUser } from '../lib/useCurrentUser'
import {
  getWallet, initEmptyWallet, submitPendingTopup, getPendingTopups,
} from '../lib/wallet'
import { BETA_FREE, TOPUP_PACKAGES, formatIDR } from '../lib/pricing'
import TopupManualModal from '../components/TopupManualModal'
import { toast } from '../lib/toast'

function Auth() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialMode = searchParams.get('mode') === 'topup' ? 'topup' : 'login'
  const redirectTo = searchParams.get('redirect') || '/'

  const [mode, setMode] = useState(initialMode) // login, register, topup
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Topup states (manual TF)
  const [selectedPkg, setSelectedPkg] = useState(null)
  const [showTopupModal, setShowTopupModal] = useState(false)

  const currentUser = useCurrentUser()
  const wallet = getWallet()
  const pendingTopups = currentUser ? getPendingTopups().filter(p => p.userEmail === currentUser.email && p.status === 'pending') : []

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await loginUser(email, password)
    if (result.success) {
      setSuccess('Login berhasil!')
      setTimeout(() => {
        navigate(redirectTo && redirectTo !== '/' ? redirectTo : '/dashboard')
      }, 800)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await registerUser({ email, password, name, phone })
    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    // Wallet dibuat otomatis oleh trigger Supabase. Init local cache untuk kompat.
    initEmptyWallet()

    if (result.needsEmailConfirmation) {
      setSuccess('Registrasi berhasil! Cek email kamu untuk verifikasi sebelum login.')
      setLoading(false)
      return
    }

    setSuccess(BETA_FREE ? 'Registrasi berhasil! Semua fitur beta bisa digunakan gratis.' : 'Registrasi berhasil! Silakan top-up untuk mulai gunakan layanan.')
    setTimeout(() => {
      navigate(redirectTo && redirectTo !== '/' ? redirectTo : '/dashboard')
    }, 1500)
    setLoading(false)
  }

  /** User pilih paket → buka modal manual TF */
  const handlePackageSelect = (pkg) => {
    if (BETA_FREE) {
      toast.info('Top-up belum dibuka selama beta gratis')
      return
    }
    if (!currentUser) {
      setError('Silakan login dulu untuk top-up')
      setMode('login')
      return
    }
    setSelectedPkg(pkg)
    setShowTopupModal(true)
  }

  /** User klik "Saya sudah transfer" di modal → save pending entry */
  const handleTopupSubmit = ({ method }) => {
    if (!currentUser || !selectedPkg) return
    const entry = submitPendingTopup({
      userEmail: currentUser.email,
      amount: selectedPkg.pay,
      method,
      note: `Paket ${selectedPkg.label}`,
    })
    setShowTopupModal(false)
    setSelectedPkg(null)
    toast.success('Permintaan top-up tercatat', {
      description: `Order ID: ${entry.id}. Admin akan verifikasi max 1x24 jam.`,
      duration: 6000,
    })
    setSuccess(`Permintaan top-up ${entry.id} tercatat. Tunggu verifikasi admin.`)
  }

  const handleLogout = () => {
    logoutUser()
    navigate('/')
  }

  // If already logged in, show dashboard
  if (currentUser) {
    return (
      <div className="min-h-screen bg-pattern">
        <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-sky-600">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-gray-800">Akun Saya</h1>
            <div className="w-8"></div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* User Info Card */}
          <div className="bg-gradient-to-br from-sky-500 to-cyan-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{currentUser.name}</h2>
                <p className="text-sky-100">{currentUser.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="mt-4 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm"
            >
              Logout
            </button>
          </div>

          {/* Wallet Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">💰 Saldo Saya</h3>
              <button 
                onClick={() => setMode('topup')}
                className="text-sm text-sky-600 hover:underline"
              >
                {BETA_FREE ? 'Top-up Soon' : 'Top-up'}
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm text-green-600">Saldo Utama</p>
                <p className="text-2xl font-bold text-green-700">Rp {wallet.balance.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-sm text-amber-600">Bonus</p>
                <p className="text-2xl font-bold text-amber-700">Rp {wallet.bonus.toLocaleString('id-ID')}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">
                Total: <span className="font-bold text-gray-800">Rp {(wallet.balance + wallet.bonus).toLocaleString('id-ID')}</span>
              </p>
            </div>
          </div>

          {/* Pending top-ups alert */}
          {pendingTopups.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-start gap-2">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-800 text-sm">
                    {pendingTopups.length} permintaan top-up menunggu verifikasi admin
                  </p>
                  <ul className="text-xs text-amber-700 mt-1 space-y-0.5">
                    {pendingTopups.slice(0, 3).map(p => (
                      <li key={p.id}>
                        {p.id} — {formatIDR(p.amount)} ({p.submittedAt})
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-amber-600 mt-2">
                    Saldo akan otomatis bertambah setelah admin verifikasi bukti transfer.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Top-up packages */}
          {mode === 'topup' && (
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">📦 Paket Top-up</h3>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${BETA_FREE ? 'text-sky-600 bg-sky-50' : 'text-emerald-600 bg-emerald-50'}`}>
                  <Sparkles className="w-3 h-3" /> {BETA_FREE ? 'Coming Soon' : 'Bonus 2× untuk semua paket'}
                </span>
              </div>
              {BETA_FREE && (
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-4 text-sm text-sky-800">
                  Selama beta, semua tools inti bisa digunakan gratis. Pricing, top-up, Pro, dan Premium akan dibuka setelah audit payment selesai.
                </div>
              )}
              {BETA_FREE ? (
                <div className="rounded-xl border-2 border-dashed border-sky-200 bg-white p-5 text-center">
                  <p className="font-bold text-gray-800">Top-up belum dibuka</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Semua fitur beta saat ini gratis setelah login. Informasi paket Pro/Premium akan diumumkan saat payment siap.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TOPUP_PACKAGES.map(pkg => (
                  <button
                    key={pkg.id}
                    onClick={() => handlePackageSelect(pkg)}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                      pkg.recommended
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-sky-300'
                    }`}
                  >
                    {pkg.recommended && (
                      <span className="absolute -top-2 right-3 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                        REKOMENDASI
                      </span>
                    )}
                    <p className="font-bold text-gray-800">Paket {pkg.label}</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xs text-gray-500">Bayar</span>
                      <span className="text-xl font-bold text-sky-700">{formatIDR(pkg.pay)}</span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xs text-gray-500">Dapat saldo</span>
                      <span className="text-sm font-semibold text-emerald-700">{formatIDR(pkg.total)}</span>
                    </div>
                    {pkg.bonus > 0 && (
                      <p className="text-[11px] text-emerald-600 mt-1">
                        + Bonus {formatIDR(pkg.bonus)} (2×)
                      </p>
                    )}
                    {pkg.bonus === 0 && (
                      <p className="text-[11px] text-gray-400 mt-1">Tanpa bonus (paket coba)</p>
                    )}
                  </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-4 text-center">
                {BETA_FREE ? (
                  <>Pricing paywall <strong>coming soon</strong>. Beta saat ini gratis.</>
                ) : (
                  <>Pembayaran via <strong>transfer bank / e-wallet</strong>. Verifikasi manual max 1×24 jam.</>
                )}
              </p>
            </div>
          )}

          {/* Manual TF Modal */}
          <TopupManualModal
            open={showTopupModal}
            onClose={() => setShowTopupModal(false)}
            onSubmit={handleTopupSubmit}
            pkg={selectedPkg}
            userEmail={currentUser?.email}
          />

          {/* Transaction History */}
          {wallet.transactions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">📜 Riwayat Transaksi</h3>
              <div className="space-y-3">
                {wallet.transactions.slice(0, 10).map(t => (
                  <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{t.id}</p>
                      <p className="text-xs text-gray-500">{t.date}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {t.amount >= 0 ? '+' : ''}Rp {Math.abs(t.amount || t.bonus || 0).toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs text-gray-500">{t.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Login/Register Forms
  return (
    <div className="min-h-screen bg-pattern flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {mode === 'login' ? 'Login' : mode === 'register' ? 'Daftar' : 'Top-up'}
          </h1>
          {mode === 'topup' && (
            <p className="text-sm text-gray-500">{BETA_FREE ? 'Pricing & top-up coming soon' : 'Isi saldo untuk menggunakan layanan'}</p>
          )}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5" /> {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-xl mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" /> {success}
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-sky-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-10 pr-12 py-3 rounded-xl border-2 border-gray-200 focus:border-sky-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-sky-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-sky-600 transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Anda"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-sky-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-sky-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">No. HP (opsional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812 3456 7890"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-sky-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Buat password"
                  className="w-full pl-10 pr-12 py-3 rounded-xl border-2 border-gray-200 focus:border-sky-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-sky-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-sky-600 transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Daftar'}
            </button>
          </form>
        )}

        {/* Topup redirect (when not logged in) */}
        {mode === 'topup' && !currentUser && (
          <div className="space-y-3 text-center">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
              {BETA_FREE ? (
                <>Top-up belum dibuka selama beta gratis. Silakan <strong>login atau daftar</strong> untuk mencoba tools.</>
              ) : (
                <>Silakan <strong>login atau daftar</strong> dulu untuk bisa top-up saldo.</>
              )}
            </div>
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold px-6 py-3 rounded-xl"
            >
              Login
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className="w-full bg-white border-2 border-sky-500 text-sky-600 hover:bg-sky-50 font-semibold px-6 py-3 rounded-xl"
            >
              Daftar Akun Baru
            </button>
          </div>
        )}

        {/* Switch Mode */}
        <div className="mt-6 text-center">
          {mode === 'login' && (
            <p className="text-gray-500">
              Belum punya akun?{' '}
              <button onClick={() => { setMode('register'); setError(''); }} className="text-sky-600 hover:underline font-medium">
                Daftar
              </button>
            </p>
          )}
          {mode === 'register' && (
            <p className="text-gray-500">
              Sudah punya akun?{' '}
              <button onClick={() => { setMode('login'); setError(''); }} className="text-sky-600 hover:underline font-medium">
                Login
              </button>
            </p>
          )}
          {(mode === 'login' || mode === 'register') && (
            <p className="text-gray-400 text-sm mt-3">
              atau{' '}
              <button onClick={() => navigate('/')} className="text-sky-600 hover:underline">
                kembali ke beranda
              </button>
            </p>
          )}
          {mode === 'topup' && currentUser && (
            <button onClick={() => setMode('login')} className="text-sky-600 hover:underline">
              Kembali
            </button>
          )}
        </div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-gray-500 hover:underline">← Kembali ke Home</Link>
        </div>
      </div>
    </div>
  )
}

export default Auth
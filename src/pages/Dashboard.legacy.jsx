import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  ChevronLeft, BarChart3, FileText, CreditCard, 
  History, User, Settings, LogOut, Eye, Download,
  Clock, CheckCircle, XCircle
} from 'lucide-react'
import { ADMIN_EMAIL } from '../lib/brand'
import { isAdminLogged, logoutUser } from '../lib/auth'

// Mock transaction data
const MOCK_HISTORY = [
  { id: 'ORD-001', service: 'Assessment', type: 'Panjang', amount: 10000, status: 'completed', date: '2026-04-05 10:30', result: 'Skor: 8.5/10' },
  { id: 'ORD-002', service: 'Statistik', type: 'Korelasi', amount: 5000, status: 'completed', date: '2026-04-05 09:15', result: 'r=0.75, p<0.05' },
  { id: 'ORD-003', service: 'Assessment', type: 'Sedang', amount: 5000, status: 'pending', date: '2026-04-05 08:45', result: 'Menunggu payment' },
]

function Dashboard() {
  const [activeTab, setActiveTab] = useState('history')
  const isAdmin = isAdminLogged()

  const handleLogout = () => {
    logoutUser()
    window.location.href = '/'
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)

  const getStatusBadge = (status) => {
    if (status === 'completed') {
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle className="w-3 h-3" /> Selesai
      </span>
    }
    return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
      <Clock className="w-3 h-3" /> Pending
    </span>
  }

  return (
    <div className="min-h-screen" style={{background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'}}>
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-gray-500 hover:text-sky-600">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <span className="font-bold text-xl text-gray-800">Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/admin" className="text-sky-600 text-sm hover:underline mr-3">
                Admin Panel
              </Link>
            )}
            <button onClick={handleLogout} className="flex items-center gap-1 text-gray-500 hover:text-red-600 text-sm">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* User Info Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-2xl flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {isAdmin ? 'Administrator' : 'Pengguna'}
              </h2>
              <p className="text-gray-500">
                {isAdmin ? 'Akses Admin - Gratis' : 'akun@test.com'}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-gray-500">Total Transaksi</p>
              <p className="text-2xl font-bold text-sky-600">{MOCK_HISTORY.length}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'history' ? 'bg-sky-500 text-white' : 'bg-white text-gray-600 hover:bg-surface'}`}
          >
            <History className="w-4 h-4" /> Riwayat
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'profile' ? 'bg-sky-500 text-white' : 'bg-white text-gray-600 hover:bg-surface'}`}
          >
            <User className="w-4 h-4" /> Profil
          </button>
        </div>

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-800">Riwayat Transaksi</h3>
            </div>
            <div className="divide-y">
              {MOCK_HISTORY.map((item) => (
                <div key={item.id} className="p-4 hover:bg-surface">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {item.service === 'Assessment' ? 
                        <FileText className="w-5 h-5 text-orange-500" /> : 
                        <BarChart3 className="w-5 h-5 text-sky-500" />
                      }
                      <div>
                        <p className="font-medium text-gray-800">{item.service} - {item.type}</p>
                        <p className="text-sm text-gray-500">{item.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">{formatCurrency(item.amount)}</p>
                      {getStatusBadge(item.status)}
                    </div>
                  </div>
                  {item.status === 'completed' && (
                    <div className="flex gap-2 mt-2">
                      <button className="flex items-center gap-1 text-xs text-sky-600 hover:underline">
                        <Eye className="w-3 h-3" /> Lihat Hasil
                      </button>
                      <button className="flex items-center gap-1 text-xs text-gray-500 hover:underline">
                        <Download className="w-3 h-3" /> Download
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Informasi Profil</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Email</label>
                <input type="email" value={isAdmin ? ADMIN_EMAIL : 'akun@test.com'} disabled 
                  className="w-full px-4 py-2 border rounded-lg bg-surface text-gray-600" />
              </div>
              
              {isAdmin && (
                <div className="p-3 bg-sky-50 rounded-lg text-sm text-sky-700">
                  ✅ Anda login sebagai Admin. Semua layanan gratis untuk testing!
                </div>
              )}
              
              <div className="pt-4 border-t">
                <h4 className="font-medium text-gray-800 mb-2">Statistik Penggunaan</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-surface rounded-lg">
                    <p className="text-2xl font-bold text-sky-600">{MOCK_HISTORY.length}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div className="text-center p-3 bg-surface rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{MOCK_HISTORY.filter(t => t.status === 'completed').length}</p>
                    <p className="text-xs text-gray-500">Selesai</p>
                  </div>
                  <div className="text-center p-3 bg-surface rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{MOCK_HISTORY.filter(t => t.status === 'pending').length}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
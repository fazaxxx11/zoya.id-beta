import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pb-bottomnav">
      <div className="text-center max-w-md">
        <div className="text-8xl font-serif font-bold mb-4" style={{ color: 'rgb(var(--accent))' }}>404</div>
        <h1 className="text-xl font-semibold mb-2" style={{ color: 'rgb(var(--fg))' }}>Halaman tidak ditemukan</h1>
        <p className="text-sm mb-8" style={{ color: 'rgb(var(--muted))' }}>URL yang kamu cari tidak ada atau sudah dipindahkan.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium" style={{ backgroundColor: 'rgb(var(--fg))', color: 'rgb(var(--card))' }}><Home className="w-4 h-4" /> Beranda</Link>
          <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border" style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--fg))' }}><ArrowLeft className="w-4 h-4" /> Kembali</button>
        </div>
      </div>
    </div>
  )
}

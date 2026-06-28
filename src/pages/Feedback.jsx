// Halaman Feedback dedicated — versi panjang dari floating modal.
// Cocok untuk user yang mau menulis feedback panjang & lihat riwayat.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Send, Star, CheckCircle2, Trash2, ExternalLink, History, Heart } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {
  FEEDBACK_TYPES, saveFeedback, getFeedback, buildMailto, markSent, clearFeedback,
} from '../lib/feedback'
import { ADMIN_EMAIL, BRAND_NAME } from '../lib/brand'

export default function FeedbackPage() {
  const [type, setType] = useState('fitur')
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(null)
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => { window.scrollTo(0, 0); refresh() }, [])
  const refresh = () => setHistory(getFeedback())

  const submit = (e) => {
    e.preventDefault()
    if (message.trim().length < 5) return
    const entry = saveFeedback({ type, rating: rating || null, message, email })
    setSubmitted(entry)
    refresh()
  }

  const sendEmail = (entry) => {
    window.location.href = buildMailto(entry)
    markSent(entry.id)
    refresh()
  }

  const reset = () => {
    setType('fitur'); setRating(0); setMessage(''); setEmail(''); setSubmitted(null)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title="Kritik & Saran"
        subtitle="Suara Anda menentukan arah pengembangan platform"
        breadcrumbs={[{ path: '/', label: 'Beranda' }, { path: '/feedback', label: 'Kritik & Saran' }]}
      />

      <div className="max-w-3xl mx-auto px-3 sm:px-5 py-6 space-y-5">
        {/* Hero */}
        <div
          className="rounded-2xl p-5 sm:p-6 border"
          style={{
            background: 'linear-gradient(135deg, rgb(99 102 241 / 0.08), rgb(236 72 153 / 0.08))',
            borderColor: 'rgb(var(--border))',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg, #3b82f6, #a855f7, #ec4899)' }}>
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg" style={{ color: 'rgb(var(--fg))' }}>
                Bantu {BRAND_NAME} jadi lebih baik
              </h2>
              <p className="text-sm mt-1" style={{ color: 'rgb(var(--muted))' }}>
                Saya membaca semua masukan secara pribadi. Bug, ide fitur baru, kritik tampilan,
                bahkan apresiasi singkat — semua diterima dan dipertimbangkan.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        {!submitted ? (
          <form
            onSubmit={submit}
            className="rounded-2xl p-5 sm:p-6 border space-y-5"
            style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}
          >
            {/* Type */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--fg))' }}>
                Kategori
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FEEDBACK_TYPES.map(cat => (
                  <button
                    key={cat.id} type="button"
                    onClick={() => setType(cat.id)}
                    className="px-3 py-3 rounded-xl border text-sm font-medium transition-colors active:scale-95"
                    style={
                      type === cat.id
                        ? { background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: 'white', borderColor: 'transparent' }
                        : { backgroundColor: 'rgb(var(--bg))', borderColor: 'rgb(var(--border))', color: 'rgb(var(--fg))' }
                    }
                  >
                    <span className="text-xl mr-1.5">{cat.emoji}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--fg))' }}>
                Rating pengalaman <span style={{ color: 'rgb(var(--muted))' }}>(opsional)</span>
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n} type="button"
                    onClick={() => setRating(rating === n ? 0 : n)}
                    className="p-1.5 hover:scale-110 transition-transform"
                    aria-label={`${n} bintang`}
                  >
                    <Star className="w-7 h-7"
                          fill={rating >= n ? '#f59e0b' : 'transparent'}
                          stroke={rating >= n ? '#f59e0b' : 'rgb(var(--muted))'}
                          strokeWidth={1.5}/>
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 self-center text-sm" style={{ color: 'rgb(var(--muted))' }}>
                    {rating}/5
                  </span>
                )}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--fg))' }}>
                Pesan <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows={6}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Ceritakan dengan detail. Contoh: 'Saat saya unggah file CSV di halaman regresi, kolom angka terbaca sebagai teks. Browser: Chrome 120.'"
                className="w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent/40"
                style={{ backgroundColor: 'rgb(var(--bg))', borderColor: 'rgb(var(--border))', color: 'rgb(var(--fg))' }}
              />
              <div className="text-xs mt-1 flex justify-between" style={{ color: 'rgb(var(--muted))' }}>
                <span>{message.length < 5 ? 'Minimal 5 karakter' : 'Cukup detail'}</span>
                <span>{message.length} karakter</span>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--fg))' }}>
                Email balasan <span style={{ color: 'rgb(var(--muted))' }}>(opsional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@anda.com — kosongkan jika tidak ingin dibalas"
                className="w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent/40"
                style={{ backgroundColor: 'rgb(var(--bg))', borderColor: 'rgb(var(--border))', color: 'rgb(var(--fg))' }}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={message.trim().length < 5}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #a855f7, #ec4899)' }}
              >
                <Send className="w-4 h-4" /> Kirim Feedback
              </button>
            </div>
          </form>
        ) : (
          // Success
          <div
            className="rounded-2xl p-6 sm:p-8 border text-center space-y-4"
            style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}
          >
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
                 style={{ backgroundColor: 'rgb(16 185 129 / 0.15)' }}>
              <CheckCircle2 className="w-9 h-9" style={{ color: 'rgb(16 185 129)' }}/>
            </div>
            <div>
              <h3 className="font-bold text-xl" style={{ color: 'rgb(var(--fg))' }}>
                Terima kasih sudah meluangkan waktu! 💜
              </h3>
              <p className="text-sm mt-2" style={{ color: 'rgb(var(--muted))' }}>
                Feedback Anda tersimpan di perangkat ini. Klik tombol di bawah untuk
                mengirim ke <strong>{ADMIN_EMAIL}</strong> via email — wajib agar kami bisa membaca
                dan menindaklanjuti.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <button
                onClick={() => sendEmail(submitted)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white inline-flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #a855f7, #ec4899)' }}
              >
                <ExternalLink className="w-4 h-4" /> Kirim Email
              </button>
              <button
                onClick={reset}
                className="py-2.5 px-4 rounded-lg text-sm font-medium border"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--fg))' }}
              >
                Kirim lagi
              </button>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}
          >
            <button
              onClick={() => setShowHistory(s => !s)}
              className="w-full px-5 py-3 flex items-center gap-2 text-sm font-medium hover:opacity-80"
              style={{ color: 'rgb(var(--fg))' }}
            >
              <History className="w-4 h-4" />
              Riwayat feedback Anda ({history.length})
              <span className="ml-auto text-xs" style={{ color: 'rgb(var(--muted))' }}>
                {showHistory ? 'tutup' : 'buka'}
              </span>
            </button>
            {showHistory && (
              <div className="border-t" style={{ borderColor: 'rgb(var(--border))' }}>
                <div className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: 'rgb(var(--border))' }}>
                  {history.map(f => {
                    const meta = FEEDBACK_TYPES.find(c => c.id === f.type)
                    return (
                      <div key={f.id} className="px-5 py-3 text-sm" style={{ color: 'rgb(var(--fg))' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span>{meta?.emoji}</span>
                          <span className="font-medium">{meta?.label}</span>
                          {f.rating && <span className="text-xs" style={{ color: '#f59e0b' }}>★ {f.rating}</span>}
                          <span className="ml-auto text-xs" style={{ color: 'rgb(var(--muted))' }}>
                            {new Date(f.createdAt).toLocaleString('id-ID')}
                          </span>
                          {f.sent
                            ? <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgb(16 185 129 / 0.15)', color: 'rgb(16 185 129)' }}>terkirim</span>
                            : <button onClick={() => sendEmail(f)} className="text-xs underline" style={{ color: 'rgb(var(--accent))' }}>kirim email</button>
                          }
                        </div>
                        <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'rgb(var(--muted))' }}>
                          {f.message}
                        </p>
                      </div>
                    )
                  })}
                </div>
                <div className="px-5 py-2 border-t flex justify-end" style={{ borderColor: 'rgb(var(--border))' }}>
                  <button
                    onClick={() => { if (confirm('Hapus semua riwayat feedback dari perangkat ini?')) { clearFeedback(); refresh() } }}
                    className="text-xs inline-flex items-center gap-1 hover:opacity-80"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 className="w-3 h-3" /> Hapus semua riwayat
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick contact */}
        <div className="text-center text-xs" style={{ color: 'rgb(var(--muted))' }}>
          Atau email langsung ke{' '}
          <a href={`mailto:${ADMIN_EMAIL}`} className="link">{ADMIN_EMAIL}</a> ·{' '}
          <Link to="/help" className="link">Lihat FAQ</Link>
        </div>
      </div>
    </div>
  )
}

// Floating "Kritik & Saran" button — global, bottom-right.
// Opens compact modal with type, rating, message → saves locally + opens mailto.
//
// Posisi FAB di mobile di atas BottomNav (72px + safe-area) supaya gak overlap;
// desktop (lg) BottomNav hidden → kembali ke bottom-5.
// Warna pakai theme token terracotta (warm-rose) — bukan gradient ungu/pink.

import { useState, useEffect } from 'react'
import { MessageCircle, X, Send, Star, CheckCircle2, ExternalLink } from 'lucide-react'
import { FEEDBACK_TYPES, saveFeedback, buildMailto, markSent } from '../lib/feedback'
import { ADMIN_EMAIL } from '../lib/brand'

const HIDDEN_PATHS = ['/admin', '/payment', '/auth', '/login']

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('fitur')
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(null) // entry obj after submit

  // ESC closes modal — must be declared BEFORE any conditional return (Rules of Hooks)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Hide on admin/auth/payment to avoid distraction
  if (typeof window !== 'undefined' && HIDDEN_PATHS.some(p => window.location.pathname.startsWith(p))) {
    return null
  }

  const reset = () => {
    setType('fitur'); setRating(0); setMessage(''); setEmail(''); setSubmitted(null)
  }

  const submit = (e) => {
    e?.preventDefault()
    if (message.trim().length < 5) return
    const entry = saveFeedback({ type, rating: rating || null, message, email })
    setSubmitted(entry)
  }

  const sendEmail = () => {
    if (!submitted) return
    window.location.href = buildMailto(submitted)
    markSent(submitted.id)
  }

  return (
    <>
      {/* Floating button — di atas BottomNav di mobile, bottom-5 di desktop */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Kirim Kritik & Saran"
        className="fixed right-5 z-40 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-5 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-110"
        style={{
          background: 'rgb(var(--warm-rose))',
          boxShadow: '0 8px 24px -6px rgb(var(--warm-rose) / 0.45)',
        }}
      >
        <MessageCircle className="w-5 h-5" />
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6"
          style={{ backgroundColor: 'rgb(0 0 0 / 0.5)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border"
            style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center justify-between text-white"
              style={{ background: 'rgb(var(--warm-rose))' }}
            >
              <div>
                <h3 className="font-bold">Kritik & Saran</h3>
                <p className="text-xs opacity-90">Bantu kami jadi lebih baik</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Tutup" className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            {!submitted ? (
              <form onSubmit={submit} className="p-5 space-y-4">
                {/* Type */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(var(--muted))' }}>
                    Kategori
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {FEEDBACK_TYPES.map(cat => (
                      <button
                        key={cat.id} type="button"
                        onClick={() => setType(cat.id)}
                        className="px-2 py-2 rounded-lg border text-xs font-medium transition-colors active:scale-95"
                        style={
                          type === cat.id
                            ? { background: 'rgb(var(--warm-rose))', color: 'white', borderColor: 'transparent' }
                            : { backgroundColor: 'rgb(var(--bg))', borderColor: 'rgb(var(--border))', color: 'rgb(var(--fg))' }
                        }
                      >
                        <div className="text-base leading-none">{cat.emoji}</div>
                        <div className="mt-1 leading-tight">{cat.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating (optional) */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(var(--muted))' }}>
                    Rating pengalaman <span className="opacity-60">(opsional)</span>
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n} type="button"
                        onClick={() => setRating(rating === n ? 0 : n)}
                        className="p-1 hover:scale-110 transition-transform"
                        aria-label={`${n} bintang`}
                      >
                        <Star
                          className="w-6 h-6"
                          fill={rating >= n ? '#f59e0b' : 'transparent'}
                          stroke={rating >= n ? '#f59e0b' : 'rgb(var(--muted))'}
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(var(--muted))' }}>
                    Pesan <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Ceritakan apa yang menurut Anda perlu diperbaiki, ditambahkan, atau yang Anda suka…"
                    className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent/40"
                    style={{ backgroundColor: 'rgb(var(--bg))', borderColor: 'rgb(var(--border))', color: 'rgb(var(--fg))' }}
                  />
                  <div className="text-[10px] mt-1 text-right" style={{ color: 'rgb(var(--muted))' }}>
                    {message.length} karakter (min. 5)
                  </div>
                </div>

                {/* Email (optional) */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(var(--muted))' }}>
                    Email balasan <span className="opacity-60">(opsional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@anda.com"
                    className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent/40"
                    style={{ backgroundColor: 'rgb(var(--bg))', borderColor: 'rgb(var(--border))', color: 'rgb(var(--fg))' }}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={message.trim().length < 5}
                  className="w-full py-2.5 rounded-lg text-sm font-medium text-white inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'rgb(var(--warm-rose))' }}
                >
                  <Send className="w-4 h-4" /> Kirim
                </button>
              </form>
            ) : (
              // Success state
              <div className="p-6 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center"
                     style={{ backgroundColor: 'rgb(16 185 129 / 0.15)' }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color: 'rgb(16 185 129)' }}/>
                </div>
                <div>
                  <h4 className="font-bold mb-1" style={{ color: 'rgb(var(--fg))' }}>
                    Terima kasih!
                  </h4>
                  <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>
                    Pesan Anda sudah tersimpan. Untuk memastikan kami terima,
                    klik tombol di bawah untuk mengirim via email.
                  </p>
                </div>
                <button
                  onClick={sendEmail}
                  className="w-full py-2.5 rounded-lg text-sm font-medium text-white inline-flex items-center justify-center gap-2"
                  style={{ background: 'rgb(var(--warm-rose))' }}
                >
                  <ExternalLink className="w-4 h-4" /> Kirim ke {ADMIN_EMAIL}
                </button>
                <button
                  onClick={() => { reset(); setOpen(false) }}
                  className="w-full py-2 rounded-lg text-sm font-medium border"
                  style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--fg))' }}
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

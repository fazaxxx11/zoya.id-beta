import { useNavigate } from 'react-router-dom'
import { Loader2, Wallet, AlertCircle, X, Sparkles } from 'lucide-react'
import { formatIDR } from '../lib/pricing'
import { isDiscountActive, DISCOUNT_PERCENT } from '../lib/discount'
import Modal from './Modal'

/**
 * Modal konfirmasi pembayaran via wallet.
 *
 * Props:
 *   open: boolean
 *   loading: boolean
 *   title: string                  e.g. "Bayar & Mulai Penilaian AI"
 *   description: string            penjelasan singkat
 *   price: number                  harga (Rupiah) — net yang user bayar
 *   originalPrice?: number         harga asli sebelum diskon (untuk strikethrough)
 *   priceBreakdown?: string        keterangan harga (opsional)
 *   wallet: { balance:number, bonus:number }
 *   onConfirm: () => void
 *   onClose: () => void
 */
export default function ConfirmPaymentModal({
  open,
  loading = false,
  title = 'Konfirmasi Pembayaran',
  description = '',
  price,
  originalPrice,
  priceBreakdown,
  wallet = { balance: 0, bonus: 0 },
  onConfirm,
  onClose,
}) {
  const navigate = useNavigate()

  const betaFree = price === 0 && originalPrice > 0
  const displayTitle = betaFree ? title.replace(/^Bayar & /, 'Beta Gratis: ') : title
  const total = (wallet.balance || 0) + (wallet.bonus || 0)
  const sufficient = betaFree || total >= price
  const useBonus = Math.min(wallet.bonus || 0, price)
  const useBalance = price - useBonus

  return (
    <Modal open={open} onClose={loading ? () => {} : onClose}
      panelClassName="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative animate-in fade-in">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted hover:text-gray-600"
          disabled={loading}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">{displayTitle}</h3>
          {description && <p className="text-sm text-muted mt-1">{description}</p>}
        </div>

        {/* Price */}
        <div className="bg-sky-50 rounded-xl p-4 mb-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-gray-600">{betaFree ? 'Status beta' : 'Total bayar'}</span>
            <div className="text-right">
              {!betaFree && isDiscountActive() && originalPrice && originalPrice > price && (
                <div className="flex items-center justify-end gap-2 mb-0.5">
                  <span className="text-sm text-muted line-through">{formatIDR(originalPrice)}</span>
                  <span
                    className="text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-full"
                    style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}
                  >
                    Diskon {DISCOUNT_PERCENT}%
                  </span>
                </div>
              )}
              {betaFree && <span className="text-sm text-muted line-through mr-2">{formatIDR(originalPrice)}</span>}
              <span className="text-2xl font-bold text-sky-600">{betaFree ? 'Gratis' : formatIDR(price)}</span>
            </div>
          </div>
          {priceBreakdown && (
            <p className="text-xs text-muted mt-1">{priceBreakdown}</p>
          )}
        </div>

        {/* Wallet */}
        <div className={`rounded-xl p-4 mb-4 border ${sufficient ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className={`w-4 h-4 ${sufficient ? 'text-green-600' : 'text-red-600'}`} />
            <span className={`text-sm font-medium ${sufficient ? 'text-green-700' : 'text-red-700'}`}>
              {betaFree ? 'Beta gratis aktif' : `Saldo Anda: ${formatIDR(total)}`}
            </span>
          </div>
          {betaFree ? (
            <div className="text-xs text-gray-600">
              Pricing dan paywall sedang disiapkan. Selama beta, fitur ini bisa dipakai tanpa top-up.
            </div>
          ) : sufficient ? (
            <div className="text-xs text-gray-600 space-y-0.5">
              {useBonus > 0 && <div>• Bonus: {formatIDR(useBonus)}</div>}
              {useBalance > 0 && <div>• Saldo utama: {formatIDR(useBalance)}</div>}
              <div className="font-medium text-gray-700 pt-1">
                Sisa setelah bayar: {formatIDR(total - price)}
              </div>
            </div>
          ) : (
            <div className="text-xs text-red-600">
              Kurang {formatIDR(price - total)}. Silakan top-up dulu.
            </div>
          )}
        </div>

        {/* Actions */}
        {sufficient ? (
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-border text-gray-600 hover:bg-surface font-medium"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : betaFree ? 'Mulai Gratis' : 'Bayar & Mulai'}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-border text-gray-600 hover:bg-surface font-medium"
            >
              Tutup
            </button>
            <button
              onClick={() => navigate('/auth?mode=topup')}
              className="flex-1 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium"
            >
              Top-up Sekarang
            </button>
          </div>
        )}

        <p className="text-[11px] text-muted text-center mt-3 flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {betaFree ? 'Tidak ada pemotongan saldo selama beta' : 'Saldo akan dipotong setelah klik konfirmasi'}
        </p>
    </Modal>
  )
}

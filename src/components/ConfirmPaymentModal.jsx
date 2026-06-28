import { useNavigate } from 'react-router-dom'
import { Loader2, Wallet, AlertCircle, X, BadgeCheck } from 'lucide-react'
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
      panelClassName="bg-card rounded-lg shadow-xl max-w-md w-full p-6 relative animate-in fade-in">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted hover:text-accent"
          disabled={loading}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-gradient-to-br from-accent/20 via-card to-accent-2/10 rounded-lg flex items-center justify-center mx-auto mb-3">
            <BadgeCheck className="w-7 h-7 text-accent" />
          </div>
          <h3 className="text-xl font-bold text-fg">{displayTitle}</h3>
          {description && <p className="text-sm text-muted mt-1">{description}</p>}
        </div>

        {/* Price */}
        <div className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-3 mb-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted">{betaFree ? 'Status beta' : 'Total bayar'}</span>
            <div className="text-right">
              {!betaFree && isDiscountActive() && originalPrice && originalPrice > price && (
                <div className="flex items-center justify-end gap-2 mb-0.5">
                  <span className="text-sm text-muted line-through">{formatIDR(originalPrice)}</span>
                  <span className="text-[10px] font-semibold text-accent-fg bg-accent px-1.5 py-0.5 rounded-full">
                    Diskon {DISCOUNT_PERCENT}%
                  </span>
                </div>
              )}
              {betaFree && <span className="text-sm text-muted line-through mr-2">{formatIDR(originalPrice)}</span>}
              <span className="text-2xl font-bold text-teal-600">{betaFree ? 'Gratis' : formatIDR(price)}</span>
            </div>
          </div>
          {priceBreakdown && (
            <p className="text-xs text-muted mt-1">{priceBreakdown}</p>
          )}
        </div>

        {/* Wallet */}
        <div className={`rounded-lg p-4 mb-4 border ${sufficient ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30' : 'border-rose-200 bg-rose-50 dark:bg-rose-950/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className={`w-4 h-4 ${sufficient ? 'text-emerald-600' : 'text-rose-600'}`} />
            <span className={`text-sm font-medium ${sufficient ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
              {betaFree ? 'Beta gratis aktif' : `Saldo Anda: ${formatIDR(total)}`}
            </span>
          </div>
          {betaFree ? (
            <div className="text-xs text-muted">
              Pricing dan paywall sedang disiapkan. Selama beta, fitur ini bisa dipakai tanpa top-up.
            </div>
          ) : sufficient ? (
            <div className="text-xs text-muted space-y-0.5">
              {useBonus > 0 && <div>• Bonus: {formatIDR(useBonus)}</div>}
              {useBalance > 0 && <div>• Saldo utama: {formatIDR(useBalance)}</div>}
              <div className="font-medium text-fg/80 pt-1">
                Sisa setelah bayar: {formatIDR(total - price)}
              </div>
            </div>
          ) : (
            <div className="text-xs text-rose-600 dark:text-rose-400">
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
              className="flex-1 px-4 py-3 rounded-lg border-2 border-border text-muted hover:bg-surface font-medium"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-lg bg-accent hover:bg-accent/90 text-accent-fg font-medium flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : betaFree ? 'Mulai Gratis' : 'Bayar & Mulai'}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg border-2 border-border text-muted hover:bg-surface font-medium"
            >
              Tutup
            </button>
            <button
              onClick={() => navigate('/auth?mode=topup')}
              className="flex-1 px-4 py-3 rounded-lg bg-terracotta hover:bg-terracotta/90 text-white font-medium"
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

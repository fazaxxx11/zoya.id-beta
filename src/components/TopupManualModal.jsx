import { useState } from 'react'
import { X, Copy, CheckCircle, MessageCircle, Clock, Building, Smartphone } from 'lucide-react'
import Modal from './Modal'
import { PAYMENT_INFO, buildWaConfirmUrl } from '../lib/brand'
import { formatIDR } from '../lib/pricing'
import { toast } from '../lib/toast'

/**
 * Modal manual top-up.
 *
 * Flow:
 *  1. User pilih paket (di parent) → buka modal ini.
 *  2. Modal tampilkan instruksi TF (rekening + e-wallet) dan WA admin.
 *  3. User klik "Saya sudah transfer" → modal call onSubmit({ method }).
 *     Parent save ke pending_topups + buka WA (optional).
 *  4. Admin approve di /admin → saldo otomatis bertambah.
 *
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   onSubmit: ({ method: 'bank'|'ewallet' }) => void
 *   pkg: { pay:number, bonus:number, total:number, label:string }  — paket yang dipilih
 *   userEmail: string
 *   orderId?: string  — optional; ditampilkan di instruksi WA
 */
export default function TopupManualModal({ open, onClose, onSubmit, pkg, userEmail, orderId }) {
  const [method, setMethod] = useState('bank')
  const [copied, setCopied] = useState('')

  if (!pkg) return null

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label)
      toast.success(`${label} disalin`)
      setTimeout(() => setCopied(''), 2000)
    })
  }

  const handleSubmit = () => {
    onSubmit({ method })
  }

  const waUrl = buildWaConfirmUrl({
    orderId: orderId || 'NEW',
    userEmail: userEmail || '(belum login)',
    amount: pkg.pay,
  })

  return (
    <Modal open={open} onClose={onClose}
      panelClassName="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 relative animate-in fade-in max-h-[90vh] overflow-y-auto">
      <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
        <X className="w-5 h-5" />
      </button>

      <div className="text-center mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Building className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-800">Top-up Manual (Transfer)</h3>
        <p className="text-sm text-gray-500 mt-1">
          Paket <strong>{pkg.label}</strong> — bayar {formatIDR(pkg.pay)}, dapat saldo {formatIDR(pkg.total)}
          {pkg.bonus > 0 && <span className="text-emerald-600"> (+ bonus {formatIDR(pkg.bonus)})</span>}
        </p>
      </div>

      {/* Method tabs */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setMethod('bank')}
          className={`p-3 rounded-xl border-2 font-medium flex items-center justify-center gap-2 transition-all ${
            method === 'bank' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-gray-200 text-gray-600'
          }`}
        >
          <Building className="w-4 h-4" /> Bank Transfer
        </button>
        <button
          onClick={() => setMethod('ewallet')}
          className={`p-3 rounded-xl border-2 font-medium flex items-center justify-center gap-2 transition-all ${
            method === 'ewallet' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-gray-200 text-gray-600'
          }`}
        >
          <Smartphone className="w-4 h-4" /> E-Wallet
        </button>
      </div>

      {/* Account details */}
      <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200 space-y-3">
        {method === 'bank' ? (
          <>
            <div>
              <div className="text-xs text-gray-500">Bank</div>
              <div className="font-semibold text-gray-800">{PAYMENT_INFO.bankName}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Nomor Rekening</div>
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono font-semibold text-gray-800 text-lg">{PAYMENT_INFO.bankAccount}</div>
                <button
                  onClick={() => copyToClipboard(PAYMENT_INFO.bankAccount, 'No. rekening')}
                  className="text-sky-600 hover:bg-sky-50 p-1.5 rounded-md text-xs flex items-center gap-1"
                >
                  {copied === 'No. rekening' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  Salin
                </button>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Atas Nama</div>
              <div className="font-semibold text-gray-800">{PAYMENT_INFO.bankHolder}</div>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="text-xs text-gray-500">E-Wallet</div>
              <div className="font-semibold text-gray-800">{PAYMENT_INFO.ewallet.name}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Nomor</div>
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono font-semibold text-gray-800 text-lg">{PAYMENT_INFO.ewallet.number}</div>
                <button
                  onClick={() => copyToClipboard(PAYMENT_INFO.ewallet.number, 'Nomor e-wallet')}
                  className="text-sky-600 hover:bg-sky-50 p-1.5 rounded-md text-xs flex items-center gap-1"
                >
                  {copied === 'Nomor e-wallet' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  Salin
                </button>
              </div>
            </div>
          </>
        )}

        <div className="pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500">Nominal Transfer</div>
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold text-sky-700 text-xl">{formatIDR(pkg.pay)}</div>
            <button
              onClick={() => copyToClipboard(String(pkg.pay), 'Nominal')}
              className="text-sky-600 hover:bg-sky-50 p-1.5 rounded-md text-xs flex items-center gap-1"
            >
              {copied === 'Nominal' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Salin
            </button>
          </div>
          <p className="text-[11px] text-amber-700 mt-1">
            💡 Transfer <strong>tepat sesuai nominal</strong> agar admin mudah verifikasi.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-sky-50 rounded-xl p-4 mb-4 text-sm space-y-2">
        <div className="font-semibold text-sky-800 flex items-center gap-1">
          <Clock className="w-4 h-4" /> Langkah verifikasi
        </div>
        <ol className="text-sky-700 text-xs space-y-1 pl-5 list-decimal">
          <li>Transfer ke {method === 'bank' ? 'rekening' : 'e-wallet'} di atas sesuai nominal.</li>
          <li>Klik tombol <strong>"Saya sudah transfer"</strong> di bawah.</li>
          <li>Kirim bukti TF via WhatsApp ke admin (tombol muncul setelahnya).</li>
          <li>Admin akan verifikasi dan kredit saldo dalam <strong>max. 1×24 jam</strong>.</li>
        </ol>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={handleSubmit}
          disabled={!userEmail}
          className="w-full px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white font-semibold flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          {userEmail ? 'Saya sudah transfer' : 'Login dulu untuk lanjut'}
        </button>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full px-4 py-3 rounded-xl border-2 border-green-500 text-green-600 hover:bg-green-50 font-medium flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-5 h-5" />
          Hubungi Admin via WhatsApp
        </a>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          Batal
        </button>
      </div>
    </Modal>
  )
}

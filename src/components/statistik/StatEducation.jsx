import { useState } from 'react'
import {
  Info, ChevronDown, ChevronRight, CheckCircle,
  AlertTriangle, HelpCircle,
} from 'lucide-react'

const EXPLANATIONS = [
  {
    id: 'pvalue',
    question: 'Apa arti p-value?',
    icon: HelpCircle,
    content: (
      <div className="space-y-2 text-sm text-[rgb(var(--fg))] leading-relaxed">
        <p>
          <strong>p-value</strong> (nilai probabilitas) adalah angka yang menunjukkan
          seberapa kuat bukti <em>melawan</em> hipotesis nol (H₀). H₀ biasanya berbunyi
          &ldquo;tidak ada perbedaan/hubungan.&rdquo;
        </p>
        <div className="space-y-1.5 mt-2">
          <div className="flex items-start gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/30 border-l-2 border-emerald-500">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-heading font-semibold text-xs">p &lt; 0,05 → Signifikan</span>
              <p className="text-xs text-[rgb(var(--muted))] mt-0.5">
                Bukti cukup kuat menolak H₀. Ada perbedaan/hubungan yang nyata dalam data.
                <br />
                <em>Contoh: &ldquo;Metode A dan B benar-benar berbeda hasilnya.&rdquo;</em>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 border-l-2 border-amber-500">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-heading font-semibold text-xs">p ≥ 0,05 → Tidak Signifikan</span>
              <p className="text-xs text-[rgb(var(--muted))] mt-0.5">
                Bukti belum cukup. Bukan berarti tidak ada perbedaan — hanya belum terdeteksi
                dengan ukuran sampel ini.
                <br />
                <em>Contoh: &ldquo;Bisa jadi ada perbedaan, tapi data belum cukup membuktikan.&rdquo;</em>
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-[rgb(var(--muted))] mt-2">
          ⚠️ Ambang 0,05 adalah konvensi umum, bukan harga mati. Beberapa bidang menggunakan
          0,01 atau 0,10 tergantung konteks.
        </p>
      </div>
    ),
  },
  {
    id: 'effectsize',
    question: 'Effect size — seberapa besar dampaknya?',
    icon: Info,
    content: (
      <div className="space-y-2 text-sm text-[rgb(var(--fg))] leading-relaxed">
        <p>
          <strong>Effect size</strong> mengukur <em>besarnya</em> perbedaan/hubungan —
          bukan cuma &ldquo;ada atau tidak.&rdquo; Angka kecil bisa signifikan secara statistik
          tapi tidak berarti secara praktis.
        </p>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[rgb(var(--table-head))]">
                <th className="p-1.5 text-left font-heading font-semibold">Nilai</th>
                <th className="p-1.5 text-left font-heading font-semibold">Kategori</th>
                <th className="p-1.5 text-left font-heading font-semibold">Artinya</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['r ≥ 0,5', 'Besar', 'Dampak nyata dalam praktik'],
                ['r 0,3–0,5', 'Sedang', 'Dampak moderat'],
                ['r 0,1–0,3', 'Kecil', 'Dampak terbatas'],
                ['r < 0,1', 'Sangat kecil', 'Hampir tidak terdeteksi'],
              ].map(([val, cat, meaning]) => (
                <tr key={val} className="border-t border-[rgb(var(--border))]">
                  <td className="p-1.5 font-mono">{val}</td>
                  <td className="p-1.5 font-heading font-semibold">{cat}</td>
                  <td className="p-1.5 text-[rgb(var(--muted))]">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[rgb(var(--muted))] mt-2">
          <strong>Cohen&rsquo;s d:</strong> d=0,2 kecil · d=0,5 sedang · d=0,8 besar
          &emsp;
          <strong>η² / ω²:</strong> 0,01 kecil · 0,06 sedang · 0,14 besar
        </p>
      </div>
    ),
  },
  {
    id: 'confidence',
    question: 'Confidence interval (CI) — rentang kepercayaan',
    icon: Info,
    content: (
      <div className="text-sm text-[rgb(var(--fg))] leading-relaxed space-y-2">
        <p>
          <strong>95% CI</strong> adalah rentang nilai yang diyakini mengandung nilai sebenarnya
          dari parameter populasi. Kalau penelitian diulang 100 kali, ±95 kali nilai sebenarnya
          akan jatuh dalam rentang ini.
        </p>
        <div className="p-2.5 bg-[rgb(var(--surface))] border border-[rgb(var(--border))] text-xs font-mono">
          CI: [2,1 — 5,8] → &ldquo;Nilai sebenarnya kemungkinan di antara 2,1 dan 5,8&rdquo;
        </div>
        <p className="text-xs text-[rgb(var(--muted))]">
          Rentang yang sempit → estimasi lebih presisi. Rentang lebar → butuh sampel lebih besar.
        </p>
      </div>
    ),
  },
]

export default function StatEducation() {
  const [expanded, setExpanded] = useState(false)
  const [activeItem, setActiveItem] = useState(null)

  return (
    <div className="border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
      {/* ── Header ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[rgb(var(--surface))] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="font-heading font-bold text-sm text-[rgb(var(--fg))]">
            Pahami Hasil
          </span>
          <span className="text-[10px] text-[rgb(var(--muted))] tracking-wide uppercase">
            panduan singkat
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-[rgb(var(--muted))]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[rgb(var(--muted))]" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <p className="text-xs text-[rgb(var(--muted))] mt-1 mb-3 leading-relaxed">
            Istilah statistik yang sering muncul di hasil analisis, dijelaskan dalam bahasa
            yang mudah dipahami.
          </p>

          <div className="flex flex-col gap-1.5">
            {EXPLANATIONS.map((item) => {
              const Icon = item.icon
              const isActive = activeItem === item.id

              return (
                <div key={item.id}>
                  <button
                    onClick={() =>
                      setActiveItem(isActive ? null : item.id)
                    }
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 text-left text-sm
                      transition-colors duration-150
                      ${
                        isActive
                          ? 'bg-[rgb(var(--accent-soft))] border-l-2 border-[rgb(var(--accent))]'
                          : 'hover:bg-[rgb(var(--surface))] border-l-2 border-transparent'
                      }
                    `}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive
                          ? 'text-[rgb(var(--accent))]'
                          : 'text-[rgb(var(--muted))]'
                      }`}
                    />
                    <span
                      className={`font-heading font-semibold ${
                        isActive
                          ? 'text-[rgb(var(--fg))]'
                          : 'text-[rgb(var(--muted))]'
                      }`}
                    >
                      {item.question}
                    </span>
                  </button>

                  {isActive && (
                    <div className="px-4 py-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
                      {item.content}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

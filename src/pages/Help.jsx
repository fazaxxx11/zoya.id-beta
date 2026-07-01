// Halaman Bantuan / FAQ
// =====================
// Tujuan: jadi single source of truth untuk pertanyaan umum:
//   - Cara mulai pakai platform
//   - Memilih analisis statistik yang tepat (decision tree singkat)
//   - Cara baca output (p-value, effect size, dll)
//   - Asumsi & batasan setiap tool
//   - Privasi data, kontak support

import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  HelpCircle, Search, ChevronDown, BookOpen, Compass, Calculator,
  FileText, ClipboardCheck, Award, Mail, ExternalLink,
  AlertCircle, CheckCircle2, Play,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import WalkthroughPlayer from '../components/WalkthroughPlayer'
import { ADMIN_EMAIL, BRAND_NAME } from '../lib/brand'

// ============================================================
// Konten FAQ — tiap entry: { id, q, a (JSX), category, keywords }
// ============================================================
const FAQ = [
  // --- Memulai
  {
    id: 'mulai-1',
    cat: 'mulai',
    q: 'Saya baru pertama kali, harus mulai dari mana?',
    keywords: 'newbie, awal, baru, mulai, pertama',
    a: (
      <>
        <p>Cara tercepat: buka <Link to="/wizard" className="link">Panduan Skripsi</Link> — checklist
          terstruktur yang membimbing dari penyusunan instrumen sampai pelaporan. Atau pilih langsung
          tool yang Anda butuhkan dari <Link to="/" className="link">Beranda</Link>.</p>
        <p className="mt-2">Setiap tool menyediakan tombol <em>"Muat Contoh"</em> atau dataset
          contoh — gunakan ini dulu untuk menguji output sebelum input data Anda sendiri.</p>
      </>
    ),
  },
  {
    id: 'mulai-2',
    cat: 'mulai',
    q: 'Apakah saya wajib login?',
    keywords: 'login, akun, register, daftar',
    a: (
      <p>Tidak wajib untuk sebagian besar tools (statistik, kuesioner, referensi, kualitatif —
        data tersimpan di browser Anda). Login hanya dibutuhkan untuk: menyimpan riwayat
        analisis ke cloud, sinkronisasi antar perangkat, dan layanan berbayar (penilaian rubrik AI
        skala besar).</p>
    ),
  },
  {
    id: 'mulai-3',
    cat: 'mulai',
    q: 'Format data yang didukung?',
    keywords: 'format, csv, excel, xlsx, file',
    a: (
      <>
        <p><strong>CSV</strong> (paling direkomendasikan): pastikan baris pertama adalah header
          (nama kolom). Pemisah koma atau titik koma bisa dideteksi otomatis.</p>
        <p className="mt-1"><strong>Excel (.xlsx)</strong>: sheet pertama akan dipakai. Hindari merged
          cells dan multi-row header.</p>
        <p className="mt-1"><strong>Tip:</strong> kalau jumlah data Anda besar (&gt;500 baris),
          pakai CSV — lebih ringan dan parsing lebih cepat.</p>
      </>
    ),
  },

  // --- Memilih analisis
  {
    id: 'pilih-1',
    cat: 'pilih',
    q: 'Bagaimana cara memilih uji statistik yang tepat?',
    keywords: 'pilih uji, kapan pakai, t-test vs anova, decision tree',
    a: (
      <>
        <p>Ringkasan singkat (untuk skala data interval/ratio):</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li><strong>Bandingkan rata-rata 2 kelompok independen:</strong> Independent t-test
            (jika normal &amp; varian sama) atau Mann–Whitney U.</li>
          <li><strong>Bandingkan pre/post pada subjek sama:</strong> Paired t-test atau Wilcoxon.</li>
          <li><strong>Bandingkan rata-rata 3+ kelompok:</strong> One-way ANOVA, lanjut post-hoc
            (Tukey/Bonferroni) jika signifikan; Kruskal–Wallis untuk non-parametrik.</li>
          <li><strong>2 faktor independen:</strong> Two-way ANOVA (cek interaksi).</li>
          <li><strong>Hubungan 2 variabel kontinyu:</strong> Pearson (linear), Spearman (rank).</li>
          <li><strong>Prediksi variabel kontinyu:</strong> Regresi linier sederhana/berganda.</li>
          <li><strong>Outcome biner (ya/tidak):</strong> Regresi logistik biner.</li>
          <li><strong>Variabel laten / reduksi item:</strong> Exploratory Factor Analysis (EFA).</li>
          <li><strong>Pengaruh tidak langsung (X→M→Y):</strong> Mediasi (Hayes Model 4).</li>
          <li><strong>Efek X→Y berbeda berdasar W:</strong> Moderasi (Hayes Model 1).</li>
        </ul>
        <p className="mt-2">Buka <Link to="/wizard" className="link">Panduan Skripsi</Link> →
          tab <em>Decision Tree</em> untuk panduan visual lengkap.</p>
      </>
    ),
  },
  {
    id: 'pilih-2',
    cat: 'pilih',
    q: 'Kapan pakai non-parametrik?',
    keywords: 'non parametrik, normalitas, mann whitney, kruskal',
    a: (
      <p>Pakai non-parametrik jika: (1) data tidak normal (uji Shapiro-Wilk p&lt;0.05 dengan n
        kecil), (2) ukuran sampel sangat kecil (n&lt;15 per kelompok), (3) data ordinal, atau
        (4) ada outlier ekstrem yang tidak bisa dihapus. Setiap tool parametrik di sini sudah
        otomatis menampilkan saran non-parametrik jika asumsi tidak terpenuhi.</p>
    ),
  },
  {
    id: 'pilih-3',
    cat: 'pilih',
    q: 'Berapa sampel minimum yang dibutuhkan?',
    keywords: 'sample size, n minimum, sampel, power',
    a: (
      <>
        <p>Tergantung uji dan effect size yang diharapkan. Sebagai pegangan kasar:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li>t-test: ≥30 per kelompok</li>
          <li>ANOVA: ≥20 per kelompok</li>
          <li>Korelasi/Regresi: ≥30, ideal ≥50; rule of thumb regresi berganda: 10–20 kasus per prediktor</li>
          <li>EFA: minimum 100, ideal 5–10× jumlah item</li>
          <li>Mediasi/SEM: minimum 100, ideal 200+</li>
        </ul>
        <p className="mt-2">Hitung lebih akurat di <Link to="/statistik/power" className="link">Statistik → Power Analysis</Link>.</p>
      </>
    ),
  },

  // --- Membaca hasil
  {
    id: 'hasil-1',
    cat: 'hasil',
    q: 'Apa arti p-value? Kapan dianggap signifikan?',
    keywords: 'p value, signifikan, alpha, hypothesis',
    a: (
      <>
        <p>P-value adalah probabilitas mendapat hasil seperti yang diamati (atau lebih ekstrem)
          jika hipotesis nol benar. Konvensi umum: <strong>p &lt; 0.05 → signifikan</strong> (cukup
          bukti untuk menolak H₀), <strong>p &lt; 0.01 → sangat signifikan</strong>.</p>
        <p className="mt-2"><strong>Hati-hati:</strong> signifikan secara statistik ≠ signifikan
          secara praktis. Selalu lihat <em>effect size</em> juga (Cohen's d, η², r), karena dengan
          n besar bahkan efek kecil bisa terlihat signifikan.</p>
      </>
    ),
  },
  {
    id: 'hasil-2',
    cat: 'hasil',
    q: 'Effect size — apa itu dan kenapa penting?',
    keywords: 'effect size, cohen d, eta squared, practical significance',
    a: (
      <>
        <p>Effect size mengukur <em>seberapa besar</em> efek/hubungan, terlepas dari ukuran sampel.
          Interpretasi umum:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li><strong>Cohen's d</strong> (t-test): 0.2 kecil, 0.5 sedang, 0.8 besar</li>
          <li><strong>η² / partial η²</strong> (ANOVA): 0.01 kecil, 0.06 sedang, 0.14 besar</li>
          <li><strong>r</strong> (korelasi): 0.1 kecil, 0.3 sedang, 0.5 besar</li>
          <li><strong>R²</strong> (regresi): 0.02 kecil, 0.13 sedang, 0.26 besar</li>
        </ul>
        <p className="mt-2">Tools di sini selalu menampilkan effect size + interpretasinya.</p>
      </>
    ),
  },
  {
    id: 'hasil-3',
    cat: 'hasil',
    q: 'Bagaimana melaporkan hasil dalam format APA?',
    keywords: 'apa, pelaporan, format, bab 4, bab iv, jurnal',
    a: (
      <p>Setiap analisis menyediakan tombol <strong>"Simpan ke Riwayat"</strong>. Lalu buka
        <Link to="/statistik/report" className="link"> Generator Bab IV </Link> — paragraf hasil
        dalam format APA 7 (lengkap dengan statistik uji, df, p-value, effect size) di-generate
        otomatis. Tinggal salin-tempel ke skripsi/artikel Anda dan cek lagi konsistensinya.</p>
    ),
  },

  // --- Asumsi & batasan
  {
    id: 'asumsi-1',
    cat: 'asumsi',
    q: 'Apakah hasil dari tool ini bisa dipertanggungjawabkan secara akademik?',
    keywords: 'akurat, valid, sahih, sah, akademis, dosen',
    a: (
      <>
        <p>Ya. Implementasi statistik di {BRAND_NAME} mengikuti rumus standar dari textbook
          (Field, Hair, Hayes), divalidasi dengan ratusan unit test, dan output bersifat
          deterministik (input sama → hasil sama). Anda dapat memverifikasi ulang dengan R atau
          SPSS dan akan mendapat angka yang sama.</p>
        <p className="mt-2"><strong>Tetapi</strong>: tools tidak menggantikan supervisi dosen
          pembimbing. Selalu diskusikan keputusan analitis (pemilihan uji, penanganan outlier,
          interpretasi) dengan pembimbing Anda.</p>
      </>
    ),
  },
  {
    id: 'asumsi-2',
    cat: 'asumsi',
    q: 'Apa saja batasan tool ini?',
    keywords: 'limit, batasan, batasan tool, kekurangan',
    a: (
      <ul className="list-disc list-inside space-y-1 text-sm">
        <li>Belum mendukung SEM (Structural Equation Modeling) lengkap, MANOVA, dan multilevel/hierarchical models.</li>
        <li>Mediasi & moderasi terbatas pada Hayes Model 1 dan 4 (single mediator/moderator).</li>
        <li>Regresi logistik hanya biner; multinomial belum tersedia.</li>
        <li>EFA pakai PCA + Varimax (orthogonal). Oblique rotation (Promax) belum tersedia.</li>
        <li>Untuk analisis sangat kompleks atau dataset jutaan baris, gunakan R atau SPSS.</li>
      </ul>
    ),
  },
  {
    id: 'asumsi-3',
    cat: 'asumsi',
    q: 'Bagaimana jika asumsi (normalitas, homoskedastisitas) tidak terpenuhi?',
    keywords: 'asumsi, normalitas, homogenitas, levene, shapiro',
    a: (
      <p>Setiap uji parametrik otomatis menjalankan uji asumsi (Shapiro-Wilk, Levene/Bartlett)
        dan menampilkan peringatan + saran alternatif (non-parametrik atau transformasi data)
        jika asumsi dilanggar. Anda tetap bisa lanjut, tapi cantumkan keterbatasan ini di
        bagian diskusi/limitations skripsi Anda.</p>
    ),
  },

  // --- Data & privasi
  {
    id: 'data-1',
    cat: 'data',
    q: 'Apakah data saya aman? Disimpan di mana?',
    keywords: 'privasi, aman, tersimpan, server, supabase',
    a: (
      <>
        <p>Data analisis & input Anda <strong>tersimpan di browser Anda sendiri</strong>
          (localStorage), tidak ke server kami. Hanya akun (email, nama) dan riwayat analisis
          yang Anda eksplisit "Simpan ke Riwayat" yang masuk ke server (jika Anda login).</p>
        <p className="mt-2">Detail lengkap di <Link to="/privasi" className="link">Kebijakan Privasi</Link>.</p>
      </>
    ),
  },
  {
    id: 'data-2',
    cat: 'data',
    q: 'Bagaimana cara backup data saya?',
    keywords: 'backup, export, simpan, restore, hilang',
    a: (
      <p>Buka <Link to="/pengaturan" className="link">Pengaturan</Link> → <strong>Backup Workspace</strong>.
        Akan mendownload satu file <code>.json</code> berisi semua kuesioner, referensi, dokumen
        kualitatif, dan rubrik Anda. Bisa di-restore kembali di komputer/browser lain.
        <strong> Sangat dianjurkan</strong> backup berkala — kalau cache browser di-clear,
        data lokal hilang.</p>
    ),
  },
  {
    id: 'data-3',
    cat: 'data',
    q: 'Apakah aman memasukkan nama responden / data pribadi?',
    keywords: 'pii, nama responden, data pribadi, anonim',
    a: (
      <p><strong>Anonimkan dulu</strong> sebelum input. Walaupun data lokal di browser Anda,
        kalau Anda pakai fitur AI (interpretasi otomatis / penilaian rubrik), input akan dikirim
        ke penyedia model AI. Hindari memasukkan nama lengkap, NIK, alamat, atau identitas
        sensitif — gunakan kode (R001, R002, dll) atau inisial.</p>
    ),
  },

  // --- Akun & pembayaran
  {
    id: 'akun-1',
    cat: 'akun',
    q: 'Bagaimana cara hapus akun saya?',
    keywords: 'hapus akun, delete account, unsubscribe',
    a: (
      <p>Email <a className="link" href={`mailto:${ADMIN_EMAIL}?subject=Hapus%20Akun`}>{ADMIN_EMAIL}</a> dari
        alamat email yang terdaftar. Akun + data terkait akan dihapus dalam 7 hari kerja.
        Untuk menghapus data lokal saja (tanpa hapus akun), pakai tombol "Hapus Semua Data
        Riset" di <Link to="/pengaturan" className="link">Pengaturan</Link>.</p>
    ),
  },
  {
    id: 'akun-2',
    cat: 'akun',
    q: 'Layanan mana yang berbayar?',
    keywords: 'harga, bayar, gratis, premium',
    a: (
      <p>Semua tools statistik & analisis bisa dipakai gratis. Layanan berbayar saat ini hanya
        <strong> Penilaian Rubrik AI skala besar</strong> (puluhan/ratusan dokumen sekaligus).
        Detail tarif muncul saat Anda meng-checkout pesanan.</p>
    ),
  },
]

const CATEGORIES = [
  { id: 'mulai',  label: 'Memulai',          icon: Compass },
  { id: 'pilih',  label: 'Memilih Analisis', icon: BookOpen },
  { id: 'hasil',  label: 'Membaca Hasil',    icon: Calculator },
  { id: 'asumsi', label: 'Asumsi & Batasan', icon: AlertCircle },
  { id: 'data',   label: 'Data & Privasi',   icon: FileText },
  { id: 'akun',   label: 'Akun & Bayar',     icon: ClipboardCheck },
]

// ============================================================
// Component utama
// ============================================================
export default function Help() {
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [openIds, setOpenIds] = useState(() => new Set())
  const [showWalkthrough, setShowWalkthrough] = useState(false)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return FAQ.filter(f => {
      if (activeCat !== 'all' && f.cat !== activeCat) return false
      if (!q) return true
      const hay = (f.q + ' ' + (f.keywords || '')).toLowerCase()
      return hay.includes(q)
    })
  }, [search, activeCat])

  const toggle = (id) => {
    setOpenIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-screen pb-bottomnav" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title="Bantuan & FAQ"
        subtitle="Pertanyaan umum tentang penggunaan platform"
        breadcrumbs={[
          { path: '/', label: 'Beranda' },
          { path: '/help', label: 'Bantuan' },
        ]}
      />

      <div className="max-w-4xl mx-auto px-3 sm:px-5 py-6 space-y-5">

        {/* Hero / quick start */}
        <div
          className="border rounded-2xl p-5 sm:p-6"
          style={{
            background: 'linear-gradient(135deg, rgb(99 102 241 / 0.08), rgb(168 85 247 / 0.08))',
            borderColor: 'rgb(var(--border))',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg, rgb(99 102 241), rgb(168 85 247))', color: 'white' }}>
              <HelpCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg mb-1" style={{ color: 'rgb(var(--fg))' }}>
                Butuh bantuan menggunakan {BRAND_NAME}?
              </h2>
              <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>
                Cari di FAQ di bawah, atau mulai dari panduan terstruktur Panduan Skripsi.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => setShowWalkthrough(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                  style={{ background: 'rgb(var(--accent))' }}
                >
                  <Play className="w-3.5 h-3.5" /> Tonton Panduan Cepat
                </button>
                <Link to="/wizard"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                      style={{ background: 'linear-gradient(135deg, rgb(99 102 241), rgb(168 85 247))' }}>
                  <Compass className="w-3.5 h-3.5" /> Panduan Skripsi
                </Link>
                <a href={`mailto:${ADMIN_EMAIL}`}
                   className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border hover:opacity-80"
                   style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--fg))' }}>
                  <Mail className="w-3.5 h-3.5" /> Email Admin
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgb(var(--muted))' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari pertanyaan… (mis: 'p value', 'mediasi', 'sample size')"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            style={{
              backgroundColor: 'rgb(var(--card))',
              borderColor: 'rgb(var(--border))',
              color: 'rgb(var(--fg))',
            }}
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          <CatPill active={activeCat === 'all'} onClick={() => setActiveCat('all')}>
            <BookOpen className="w-3.5 h-3.5" /> Semua ({FAQ.length})
          </CatPill>
          {CATEGORIES.map(c => {
            const count = FAQ.filter(f => f.cat === c.id).length
            const Ic = c.icon
            return (
              <CatPill key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
                <Ic className="w-3.5 h-3.5" /> {c.label} ({count})
              </CatPill>
            )
          })}
        </div>

        {/* FAQ list */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="border rounded-xl p-8 text-center"
                 style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}>
              <HelpCircle className="w-10 h-10 mx-auto mb-2" style={{ color: 'rgb(var(--muted))' }}/>
              <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>
                Tidak ada FAQ yang cocok dengan "<strong>{search}</strong>".
              </p>
              <a href={`mailto:${ADMIN_EMAIL}?subject=Pertanyaan: ${encodeURIComponent(search)}`}
                 className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium underline hover:opacity-80"
                 style={{ color: 'rgb(var(--fg))' }}>
                <Mail className="w-3.5 h-3.5" /> Kirim pertanyaan ke admin
              </a>
            </div>
          )}

          {filtered.map(f => {
            const open = openIds.has(f.id)
            return (
              <div
                key={f.id}
                className="border rounded-xl overflow-hidden"
                style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}
              >
                <button
                  onClick={() => toggle(f.id)}
                  className="w-full px-4 py-3 sm:px-5 sm:py-4 flex items-center gap-3 text-left hover:opacity-90 transition-opacity"
                >
                  <span className="flex-1 font-medium text-sm sm:text-[15px]"
                        style={{ color: 'rgb(var(--fg))' }}>
                    {f.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
                    style={{ color: 'rgb(var(--muted))' }}
                  />
                </button>
                {open && (
                  <div
                    className="px-4 pb-4 sm:px-5 sm:pb-5 text-sm leading-relaxed border-t pt-3"
                    style={{ color: 'rgb(var(--fg) / 0.85)', borderColor: 'rgb(var(--border))' }}
                  >
                    {f.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Still need help CTA */}
        <div
          className="border rounded-2xl p-5 text-center"
          style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}
        >
          <Mail className="w-7 h-7 mx-auto mb-2" style={{ color: 'rgb(var(--muted))' }} />
          <h3 className="font-semibold text-sm mb-1" style={{ color: 'rgb(var(--fg))' }}>
            Pertanyaan tidak ada di sini?
          </h3>
          <p className="text-xs mb-3" style={{ color: 'rgb(var(--muted))' }}>
            Kirim email — biasanya dibalas dalam 1–2 hari kerja.
          </p>
          <a href={`mailto:${ADMIN_EMAIL}`}
             className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
             style={{ background: 'linear-gradient(135deg, rgb(99 102 241), rgb(168 85 247))' }}>
            <Mail className="w-4 h-4" /> {ADMIN_EMAIL}
          </a>
        </div>

        {/* Useful links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <FooterLink to="/privasi" icon={CheckCircle2}>Kebijakan Privasi</FooterLink>
          <FooterLink to="/syarat" icon={CheckCircle2}>Syarat Penggunaan</FooterLink>
          <FooterLink to="/pengaturan" icon={CheckCircle2}>Pengaturan / Backup</FooterLink>
          <FooterLink to="/wizard" icon={CheckCircle2}>Panduan Skripsi</FooterLink>
          <FooterLink to="/feedback" icon={CheckCircle2}>Kritik &amp; Saran</FooterLink>
        </div>
      </div>
      {showWalkthrough && (
        <WalkthroughPlayer onClose={() => setShowWalkthrough(false)} />
      )}
    </div>
  )
}

// ============================================================
function CatPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors hover:opacity-80"
      style={
        active
          ? { background: 'linear-gradient(135deg, rgb(99 102 241), rgb(168 85 247))', color: 'white', borderColor: 'transparent' }
          : { backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))', color: 'rgb(var(--fg))' }
      }
    >
      {children}
    </button>
  )
}

function FooterLink({ to, icon: Icon, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border hover:opacity-80 transition-opacity"
      style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))', color: 'rgb(var(--fg))' }}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: 'rgb(16 185 129)' }} />
      <span className="flex-1">{children}</span>
      <ExternalLink className="w-3 h-3" style={{ color: 'rgb(var(--muted))' }} />
    </Link>
  )
}

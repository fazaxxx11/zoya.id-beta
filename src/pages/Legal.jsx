// Halaman statis Kebijakan Privasi & Syarat Penggunaan.
// Single file, dua route (/privasi, /syarat) — dipilih via prop `kind`.

import { useEffect } from 'react'
import { Shield, FileText } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { BRAND_NAME, ADMIN_EMAIL } from '../lib/brand'

export default function LegalPage({ kind }) {
  useEffect(() => { window.scrollTo(0, 0) }, [kind])

  const isPrivacy = kind === 'privacy'
  const Icon = isPrivacy ? Shield : FileText
  const title = isPrivacy ? 'Kebijakan Privasi' : 'Syarat Penggunaan'
  const path = isPrivacy ? '/privasi' : '/syarat'
  const updated = '1 Mei 2026'

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <PageHeader
        title={title}
        subtitle={isPrivacy ? 'Bagaimana kami menangani data Anda' : 'Aturan main pemakaian platform'}
        breadcrumbs={[
          { path: '/', label: 'Beranda' },
          { path, label: title },
        ]}
      />

      <div className="max-w-3xl mx-auto px-3 sm:px-5 py-6">
        <div
          className="border rounded-2xl p-6 sm:p-8"
          style={{ backgroundColor: 'rgb(var(--card))', borderColor: 'rgb(var(--border))' }}
        >
          <div className="flex items-start gap-3 mb-6 pb-4 border-b"
               style={{ borderColor: 'rgb(var(--border))' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{
                   background: 'linear-gradient(135deg, rgb(99 102 241), rgb(168 85 247))',
                   color: 'white',
                 }}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--fg))' }}>{title}</h1>
              <p className="text-xs mt-1" style={{ color: 'rgb(var(--muted))' }}>
                Berlaku sejak {updated} · {BRAND_NAME}
              </p>
            </div>
          </div>

          {isPrivacy ? <PrivacyContent /> : <TermsContent />}

          <div className="mt-8 pt-4 border-t text-xs"
               style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--muted))' }}>
            Pertanyaan tentang halaman ini? Hubungi <a href={`mailto:${ADMIN_EMAIL}`}
               className="underline hover:opacity-80">{ADMIN_EMAIL}</a>.
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Privacy
// ============================================================
function PrivacyContent() {
  return (
    <article className="prose-content space-y-5 text-sm leading-relaxed"
             style={{ color: 'rgb(var(--fg) / 0.9)' }}>

      <Section title="1. Ringkasan singkat (TL;DR)">
        <ul className="list-disc list-inside space-y-1">
          <li>Data riset Anda <strong>tersimpan di browser</strong> (localStorage), <strong>tidak ke server kami</strong> kecuali Anda eksplisit login dan menggunakan fitur cloud.</li>
          <li>Hanya akun (email + nama) yang disimpan di server saat Anda login.</li>
          <li>Tidak ada iklan tracker, tidak ada penjualan data.</li>
          <li>Anda bisa <a href="/pengaturan" className="underline">backup atau hapus data</a> kapan saja.</li>
        </ul>
      </Section>

      <Section title="2. Data yang kami simpan di browser Anda">
        <p>Data berikut disimpan secara lokal di browser, tidak pernah dikirim ke server:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li><strong>Kuesioner & respons</strong> — pertanyaan, opsi, jawaban responden</li>
          <li><strong>Daftar referensi</strong> — judul, penulis, tahun, DOI</li>
          <li><strong>Coding kualitatif</strong> — codebook, dokumen, segmen yang ditandai</li>
          <li><strong>Rubrik penilaian</strong> — kriteria dan skala yang Anda buat</li>
          <li><strong>Preferensi tema</strong> (light/dark)</li>
        </ul>
        <p className="mt-2">Data ini dapat hilang jika Anda menghapus cache/cookies browser. Backup berkala disarankan via menu Pengaturan.</p>
      </Section>

      <Section title="3. Data yang kami simpan di server (jika Anda login)">
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Akun:</strong> email, nama, password (di-hash oleh Supabase Auth), nomor HP (opsional), waktu pendaftaran.</li>
          <li><strong>Login Google (opsional):</strong> jika memilih login dengan Google, kami menerima nama, email, dan ID akun Google Anda. Tidak ada data kontak/Drive/dll yang diambil.</li>
          <li><strong>Saldo & transaksi:</strong> wallet (saldo & bonus) dan riwayat top-up/payment.</li>
          <li><strong>Pesanan & hasil:</strong> riwayat order assessment & analisis statistik.</li>
          <li><strong>Riwayat analisis tersimpan:</strong> hasil yang Anda klik "Simpan ke Riwayat" — agar bisa dipakai di Generator Bab IV.</li>
        </ul>
        <p className="mt-2">Server kami menggunakan <a href="https://supabase.com" target="_blank" rel="noopener" className="underline">Supabase</a> (hosted di Singapura) dengan Row-Level Security: data Anda hanya bisa diakses oleh akun Anda sendiri yang login.</p>
      </Section>

      <Section title="4. Data analisis & AI">
        <p>Saat Anda menggunakan fitur "Generate dengan AI" (interpretasi statistik atau penilaian rubrik), input dikirim ke penyedia model AI <a href="https://groq.com" target="_blank" rel="noopener" className="underline">Groq</a>. Sesuai kebijakan privasi Groq, input <strong>tidak digunakan untuk melatih model</strong>. <strong>Hindari memasukkan data sensitif/PII</strong> (nama lengkap responden, NIK, alamat, dll.) saat menggunakan fitur AI.</p>
      </Section>

      <Section title="5. Cookies & analytics">
        <p>Kami tidak memasang cookie iklan atau tracker pihak ketiga. Cookies hanya dipakai untuk session login (jika diaktifkan). Analytics opt-in (jika ada) bersifat agregat dan anonim.</p>
      </Section>

      <Section title="6. Hak Anda">
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Akses:</strong> Anda dapat melihat semua data Anda di Dashboard / Pengaturan.</li>
          <li><strong>Ekspor:</strong> Backup workspace Anda dalam format JSON di halaman Pengaturan.</li>
          <li><strong>Hapus:</strong> Hapus data riset (tombol di Pengaturan), atau hapus akun dengan menghubungi kami.</li>
          <li><strong>Pertanyaan:</strong> hubungi email di footer halaman ini.</li>
        </ul>
      </Section>

      <Section title="7. Perubahan kebijakan">
        <p>Kami dapat memperbarui kebijakan ini sewaktu-waktu. Tanggal "berlaku sejak" di atas akan diperbarui. Perubahan signifikan akan diumumkan via email (untuk akun aktif) atau banner di aplikasi.</p>
      </Section>
    </article>
  )
}

// ============================================================
// Terms
// ============================================================
function TermsContent() {
  return (
    <article className="prose-content space-y-5 text-sm leading-relaxed"
             style={{ color: 'rgb(var(--fg) / 0.9)' }}>

      <Section title="1. Penerimaan syarat">
        <p>Dengan menggunakan zoya.id, Anda menyetujui syarat-syarat di bawah ini. Jika tidak setuju, mohon tidak menggunakan layanan.</p>
      </Section>

      <Section title="2. Layanan yang disediakan">
        <p>Platform ini menyediakan tools penelitian akademik, antara lain: kuesioner, sampling, uji statistik (deskriptif, inferensial, mediasi-moderasi, EFA, logistik), analisis kualitatif, manajemen referensi, dan penilaian tulisan dengan rubrik. Tools disediakan "as is" untuk membantu pekerjaan akademik Anda.</p>
      </Section>

      <Section title="3. Tanggung jawab pengguna">
        <ul className="list-disc list-inside space-y-1">
          <li>Anda bertanggung jawab atas data yang Anda input dan keputusan yang Anda ambil dari hasil analisis.</li>
          <li>Anda <strong>wajib memverifikasi hasil</strong> — meskipun rumus kami mengikuti standar textbook, error dapat terjadi (data salah input, asumsi tidak terpenuhi, dll). Hasil bisa dicross-check dengan R atau SPSS.</li>
          <li>Anda bertanggung jawab memastikan data yang di-upload <strong>tidak melanggar privasi pihak lain</strong> (misal anonimkan responden sebelum analisis).</li>
          <li>Tidak menggunakan platform untuk tujuan ilegal, plagiat, atau manipulasi data.</li>
        </ul>
      </Section>

      <Section title="4. Akurasi & batasan">
        <p>Kami berusaha keras menyediakan implementasi statistik yang akurat — tervalidasi dengan unit test dan dataset benchmark akademik. Namun:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Tools tidak menggantikan supervisi dosen pembimbing.</li>
          <li>Tidak ada jaminan tanpa bug — laporkan jika menemukan error.</li>
          <li>Hasil AI (interpretasi otomatis) bersifat <strong>generatif & probabilistik</strong>, perlu review manual.</li>
          <li>Kami tidak bertanggung jawab atas konsekuensi akademik dari hasil yang tidak diverifikasi.</li>
        </ul>
      </Section>

      <Section title="5. Hak kekayaan intelektual">
        <p>Konten yang Anda buat (kuesioner, dokumen, hasil analisis) <strong>tetap milik Anda</strong>. Kode dan desain platform adalah milik {BRAND_NAME}.</p>
      </Section>

      <Section title="6. Pembayaran & layanan berbayar">
        <p>Beberapa fitur premium dapat dikenakan biaya. Pembayaran tidak dapat dikembalikan setelah layanan dijalankan, kecuali ada masalah teknis dari pihak kami. Detail harga & ketentuan ada di halaman pemesanan.</p>
      </Section>

      <Section title="7. Penangguhan akun">
        <p>Kami berhak menangguhkan akun yang melanggar syarat ini, misalnya: spamming, abuse fitur AI, upload data ilegal, atau pelanggaran kekayaan intelektual.</p>
      </Section>

      <Section title="8. Pembatasan tanggung jawab">
        <p>Sebatas yang diizinkan hukum, {BRAND_NAME} tidak bertanggung jawab atas kerugian tidak langsung yang timbul dari penggunaan platform — termasuk hilangnya data lokal karena Anda mengclear browser cache (gunakan fitur Backup).</p>
      </Section>

      <Section title="9. Hukum yang berlaku">
        <p>Syarat ini diatur oleh hukum Republik Indonesia. Setiap sengketa diselesaikan secara musyawarah; jika tidak tercapai, dapat dibawa ke pengadilan negeri yang berwenang.</p>
      </Section>

      <Section title="10. Perubahan syarat">
        <p>Kami dapat mengubah syarat ini. Tanggal "berlaku sejak" akan diperbarui. Pengguna yang tetap menggunakan platform dianggap menyetujui versi baru.</p>
      </Section>
    </article>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-base font-semibold mb-2" style={{ color: 'rgb(var(--fg))' }}>{title}</h2>
      <div style={{ color: 'rgb(var(--fg) / 0.85)' }}>{children}</div>
    </section>
  )
}

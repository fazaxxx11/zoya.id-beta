// Rubrik templates — save/load reusable rubrics across assessments.
//
// Storage: localStorage 'rubrik_templates' = Array<{
//   id: string, name: string, title: string, context: string,
//   kriteria: Array<{nama, deskripsi, bobot}>, createdAt: number
// }>
//
// Plus 4 default built-in templates supaya guru baru langsung punya starting point.

const STORAGE_KEY = 'rubrik_templates'

/** Built-in templates — read-only, ditampilkan terpisah dari user templates. */
export const BUILTIN_TEMPLATES = [
  {
    id: 'builtin-essay',
    name: '📝 Essay Akademik',
    title: 'Essay',
    context: 'Penilaian essay akademik berdasarkan struktur dan argumentasi.',
    builtin: true,
    kriteria: [
      { nama: 'Struktur & Organisasi',  deskripsi: 'Pendahuluan, isi, kesimpulan tertata. Paragraf koheren.',                bobot: 25 },
      { nama: 'Kedalaman Argumen',      deskripsi: 'Argumen didukung bukti/contoh yang relevan dan akurat.',                bobot: 30 },
      { nama: 'Tata Bahasa',            deskripsi: 'Ejaan, tanda baca, tata bahasa sesuai EYD.',                            bobot: 20 },
      { nama: 'Originalitas',           deskripsi: 'Ide segar, sudut pandang sendiri, tidak plagiat.',                       bobot: 25 },
    ],
  },
  {
    id: 'builtin-laporan',
    name: '📊 Laporan Praktikum',
    title: 'Laporan Praktikum',
    context: 'Penilaian laporan praktikum dengan format ilmiah standar.',
    builtin: true,
    kriteria: [
      { nama: 'Pendahuluan & Tujuan',   deskripsi: 'Latar belakang jelas, rumusan masalah dan tujuan terstruktur.',         bobot: 15 },
      { nama: 'Metodologi',             deskripsi: 'Prosedur dijelaskan langkah demi langkah, alat & bahan lengkap.',       bobot: 20 },
      { nama: 'Hasil & Data',           deskripsi: 'Data disajikan dalam tabel/grafik, akurat, lengkap.',                   bobot: 25 },
      { nama: 'Pembahasan',             deskripsi: 'Analisis mendalam, hubungkan ke teori, jelaskan deviasi.',              bobot: 25 },
      { nama: 'Kesimpulan & Referensi', deskripsi: 'Kesimpulan menjawab tujuan, sitasi sumber lengkap.',                    bobot: 15 },
    ],
  },
  {
    id: 'builtin-presentasi',
    name: '🎤 Presentasi',
    title: 'Presentasi',
    context: 'Penilaian presentasi lisan dengan slide visual.',
    builtin: true,
    kriteria: [
      { nama: 'Konten Materi',          deskripsi: 'Materi akurat, lengkap, sesuai topik.',                                 bobot: 30 },
      { nama: 'Visual Slide',           deskripsi: 'Slide rapi, mudah dibaca, mendukung penjelasan.',                       bobot: 20 },
      { nama: 'Penyampaian',            deskripsi: 'Suara jelas, kontak mata, percaya diri, tepat waktu.',                  bobot: 30 },
      { nama: 'Tanya Jawab',            deskripsi: 'Menjawab pertanyaan dengan baik dan relevan.',                          bobot: 20 },
    ],
  },
  {
    id: 'builtin-proyek',
    name: '🛠️ Proyek',
    title: 'Proyek',
    context: 'Penilaian proyek kolaboratif/individual dengan output produk.',
    builtin: true,
    kriteria: [
      { nama: 'Perencanaan',            deskripsi: 'Timeline, pembagian tugas, identifikasi kebutuhan jelas.',              bobot: 20 },
      { nama: 'Eksekusi & Proses',      deskripsi: 'Disiplin kerja, dokumentasi proses, problem-solving.',                  bobot: 30 },
      { nama: 'Hasil/Produk Akhir',     deskripsi: 'Produk berfungsi sesuai spec, kualitas tinggi, rapi.',                  bobot: 35 },
      { nama: 'Refleksi',               deskripsi: 'Evaluasi diri, pelajaran yang didapat, rencana perbaikan.',             bobot: 15 },
    ],
  },
]

const safeRead = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}
const safeWrite = (arr) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); return true }
  catch { return false }
}

export function getUserTemplates() {
  return safeRead().filter(t => !t.builtin)
}

export function getAllTemplates() {
  return [...BUILTIN_TEMPLATES, ...getUserTemplates()]
}

/** Save current rubrik as named template. */
export function saveTemplate({ name, title, context, kriteria }) {
  if (!name?.trim()) throw new Error('Nama template wajib diisi')
  if (!Array.isArray(kriteria) || kriteria.length === 0) throw new Error('Kriteria kosong')
  const all = safeRead()
  // Generate id
  const id = `user-${Date.now().toString(36)}`
  const tpl = {
    id,
    name: name.trim(),
    title: title || '',
    context: context || '',
    kriteria: kriteria.map(k => ({
      nama: k.nama || '',
      deskripsi: k.deskripsi || '',
      bobot: Number(k.bobot) || 0,
    })),
    createdAt: Date.now(),
  }
  all.push(tpl)
  safeWrite(all)
  return tpl
}

export function deleteTemplate(id) {
  if (id.startsWith('builtin-')) return false  // Built-in: tidak bisa dihapus
  const all = safeRead().filter(t => t.id !== id)
  safeWrite(all)
  return true
}

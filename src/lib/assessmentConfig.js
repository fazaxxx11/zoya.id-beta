/**
 * Assessment Types & Configuration
 */

// Types of assessments available
export const ASSESSMENT_TYPES = {
  // 1. Instrument Validation (CVR/CVI)
  INSTRUMENT_VALIDATION: 'instrument_validation',
  
  // 2. Skripsi/Tesis Scoring
  SKRIPSI: 'skripsi',
  
  // 3. Peer Review Jurnal
  PEER_REVIEW: 'peer_review',
  
  // 4. Esai/Tulisan
  ESSAY: 'essay'
}

// Rubric scoring scale (1-5)
export const SCORE_SCALE = [
  { value: 1, label: 'Sangat Buruk', description: 'Tidak memenuhi kriteria sama sekali' },
  { value: 2, label: 'Buruk', description: 'Kurang memenuhi kriteria' },
  { value: 3, label: 'Cukup', description: 'Menenuhi kriteria secara umum' },
  { value: 4, label: 'Baik', description: 'Menenuhi kriteria dengan baik' },
  { value: 5, label: 'Sangat Baik', description: 'Sangat memenuhi kriteria dengan sempurna' }
]

// CVR Categories for expert judgment
export const CVR_CATEGORIES = [
  { value: 1, label: 'Esensial', description: 'Item sangat penting untuk topic ini' },
  { value: 0, label: 'Berguna tapi tidak esensial', description: 'Item membantu tapi tidak krusial' },
  { value: -1, label: 'Tidak perlu', description: 'Item tidak relevan/s必要' }
]

// Peer Review Dimensions (Jurnal)
export const PEER_REVIEW_DIMENSIONS = [
  {
    id: 'kebaruan',
    name: 'Kebaruan (Novelty)',
    weight: 20,
    description: 'Tingkat kebaruan penelitian dan kontribusi terhadap ilmu pengetahuan'
  },
  {
    id: 'metodologi',
    name: 'Metodologi',
    weight: 25,
    description: 'Ketepatan desain penelitian, teknik pengumpulan data, dan analisis'
  },
  {
    id: 'relevansi',
    name: 'Relevansi',
    weight: 15,
    description: 'Kesesuaian dengan bidang ilmu dan manfaat penelitian'
  },
  {
    id: 'referensi',
    name: 'Referensi',
    weight: 10,
    description: 'Kekayaan dan keterbaruan referensi yang digunakan'
  },
  {
    id: 'penulisan',
    name: 'Penulisan',
    weight: 15,
    description: 'Kejelasan penyajian, tata bahasa, dan struktur artikel'
  },
  {
    id: 'analisis',
    name: 'Analisis & Hasil',
    weight: 15,
    description: 'Kedalaman analisis dan kualitas penyajian hasil'
  }
]

// Peer Review Recommendations
export const PEER_REVIEW_RECOMMENDATIONS = [
  { id: 'accept', label: 'Accept', color: 'green', description: 'Artikel dapat diterima tanpa revisi' },
  { id: 'minor_revision', label: 'Minor Revision', color: 'blue', description: 'Revisi kecil diperlukan' },
  { id: 'major_revision', label: 'Major Revision', color: 'orange', description: 'Revisi besar diperlukan' },
  { id: 'reject', label: 'Reject', color: 'red', description: 'Artikel tidak dapat diterima' }
]

// Skripsi/Tesis Rubric Dimensions
export const SKRIPSI_DIMENSIONS = [
  {
    id: 'latar_belakang',
    name: 'Latar Belakang',
    weight: 15,
    description: 'Kejelasan rumusan masalah, tujuan, dan manfaat penelitian'
  },
  {
    id: 'tinjauan_pustaka',
    name: 'Tinjauan Pustaka',
    weight: 15,
    description: 'Kekayaan referensi dan kemampuan mensintesis literature'
  },
  {
    id: 'metodologi',
    name: 'Metodologi',
    weight: 25,
    description: 'Ketepatan metode, teknik sampling, dan analisis data'
  },
  {
    id: 'hasil',
    name: 'Hasil & Pembahasan',
    weight: 25,
    description: 'Kedalaman analisis, interpretasi, dan hubungan dengan teori'
  },
  {
    id: 'kesimpulan',
    name: 'Kesimpulan',
    weight: 10,
    description: 'Keterkaitan dengan tujuan, keterbatasan, dan saran'
  },
  {
    id: 'penulisan',
    name: 'Penulisan',
    weight: 10,
    description: 'Tata bahasa,-format, dan sistematika penulisan'
  }
]

// Essay Rubric Dimensions
export const ESSAY_DIMENSIONS = [
  {
    id: 'struktur',
    name: 'Struktur',
    weight: 20,
    description: 'Pengorganisasian paragraf dan alur pikiran'
  },
  {
    id: 'argumen',
    name: 'Argumen',
    weight: 25,
    description: 'Kekuatan logika dan kedalaman berpikir'
  },
  {
    id: 'bukti',
    name: 'Bukti & Referensi',
    weight: 20,
    description: 'Penggunaan bukti dan referensi yang relevan'
  },
  {
    id: 'bahasa',
    name: 'Bahasa & Gaya',
    weight: 15,
    description: 'Kelincasan bahasa dan gaya penulisan'
  },
  {
    id: 'orisinalitas',
    name: 'Orisinalitas',
    weight: 20,
    description: 'Keunikan pikiran dan analisis'
  }
]

export default {
  ASSESSMENT_TYPES,
  SCORE_SCALE,
  CVR_CATEGORIES,
  PEER_REVIEW_DIMENSIONS,
  PEER_REVIEW_RECOMMENDATIONS,
  SKRIPSI_DIMENSIONS,
  ESSAY_DIMENSIONS
}
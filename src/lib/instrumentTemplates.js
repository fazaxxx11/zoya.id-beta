// Library Instrumen Penelitian Teruji (Validated Scales)
// =======================================================
// Koleksi instrumen klasik yang sudah divalidasi secara internasional,
// di-translate ke Bahasa Indonesia. User bisa pakai langsung untuk
// skripsi/tesis dengan menyertakan citation yang sudah disediakan.
//
// CATATAN AKADEMIK: Translation di sini adalah back-translation versi umum
// yang banyak dipakai di literatur Indonesia. Untuk publikasi, peneliti
// disarankan melakukan adaptasi & uji validitas/reliabilitas pada sampel
// lokal sebelum digunakan.

import { newSurvey, newSection, newItem } from './kuesioner'

// =====================================================================
// Helper: build Likert section dengan reverse-coded indicators
// =====================================================================
function makeLikertSection(title, description, items, scale = 5, scaleLabels) {
  const sec = newSection(title)
  sec.description = description
  sec.items = items.map(it => {
    const base = newItem('likert')
    base.label = typeof it === 'string' ? it : it.label
    base.required = true
    base.scale = scale
    if (scaleLabels) base.scaleLabels = scaleLabels
    base.reverseCoded = typeof it === 'string' ? false : !!it.reverse
    return base
  })
  return sec
}

const LIKERT_5_LABELS = ['STS', 'TS', 'N', 'S', 'SS']
const LIKERT_4_LABELS = ['Tidak Sama Sekali Benar', 'Hampir Tidak Benar', 'Sedang-sedang Saja Benar', 'Sangat Benar']
const LIKERT_7_LABELS = ['STS', 'TS', 'ATS', 'N', 'AS', 'S', 'SS']

// =====================================================================
// 1) GENERAL SELF-EFFICACY SCALE (GSE)
//    Schwarzer & Jerusalem (1995)
//    10 item, 1 dimensi, skala 1-4
// =====================================================================
export function templateGSE() {
  const s = newSurvey('General Self-Efficacy Scale (GSE)')
  s.description = 'Mengukur efikasi diri umum — keyakinan individu menghadapi tugas-tugas baru dan situasi sulit. Schwarzer & Jerusalem (1995). 10 item, 1 dimensi, skala 1-4.'

  const items = [
    'Saya selalu dapat menyelesaikan masalah sulit jika saya berusaha cukup keras.',
    'Jika seseorang menentang saya, saya dapat menemukan cara untuk mendapatkan apa yang saya inginkan.',
    'Mudah bagi saya untuk berpegang pada tujuan dan mencapai sasaran saya.',
    'Saya yakin dapat menangani kejadian tak terduga dengan efisien.',
    'Berkat akal-budi saya, saya tahu cara menangani situasi yang tidak terduga.',
    'Saya dapat memecahkan sebagian besar masalah jika saya berusaha cukup.',
    'Saya tetap tenang ketika menghadapi kesulitan karena saya bisa mengandalkan kemampuan menghadapinya.',
    'Ketika dihadapkan pada masalah, biasanya saya menemukan beberapa solusi.',
    'Jika dalam masalah, biasanya saya bisa memikirkan suatu solusi.',
    'Saya biasanya dapat menangani apa pun yang menghampiri saya.',
  ]
  s.sections = [makeLikertSection('Efikasi Diri Umum', 'Schwarzer & Jerusalem (1995)', items, 4, LIKERT_4_LABELS)]
  s._meta = {
    citation: 'Schwarzer, R., & Jerusalem, M. (1995). Generalized Self-Efficacy Scale. In J. Weinman, S. Wright, & M. Johnston (Eds.), Measures in health psychology: A user\u2019s portfolio (pp. 35–37). Windsor, UK: NFER-NELSON.',
    domain: 'Psikologi Positif',
    dimensions: 1,
    items: 10,
  }
  return s
}

// =====================================================================
// 2) ROSENBERG SELF-ESTEEM SCALE (RSES)
//    Rosenberg (1965). 10 item, 1 dimensi, skala 1-4
//    Item 3, 5, 8, 9, 10 = reverse-coded
// =====================================================================
export function templateRSES() {
  const s = newSurvey('Rosenberg Self-Esteem Scale (RSES)')
  s.description = 'Mengukur harga diri global. Rosenberg (1965). 10 item, 1 dimensi, skala 1-4. 5 item bersifat reverse-coded.'

  const items = [
    { label: 'Secara keseluruhan, saya puas dengan diri saya sendiri.', reverse: false },
    { label: 'Kadang-kadang saya berpikir bahwa saya tidak baik sama sekali.', reverse: true },
    { label: 'Saya merasa memiliki sejumlah kualitas yang baik.', reverse: false },
    { label: 'Saya mampu melakukan banyak hal sebaik orang kebanyakan.', reverse: false },
    { label: 'Saya merasa tidak banyak yang bisa saya banggakan dari diri saya.', reverse: true },
    { label: 'Saya kadang-kadang merasa tidak berguna.', reverse: true },
    { label: 'Saya merasa bahwa saya adalah seseorang yang berharga, setidaknya setara dengan orang lain.', reverse: false },
    { label: 'Saya berharap dapat lebih menghargai diri saya sendiri.', reverse: true },
    { label: 'Secara keseluruhan, saya cenderung merasa bahwa saya seorang yang gagal.', reverse: true },
    { label: 'Saya memiliki sikap positif terhadap diri saya sendiri.', reverse: false },
  ]
  s.sections = [makeLikertSection('Harga Diri (Self-Esteem)', 'Rosenberg (1965)', items, 4, ['STS', 'TS', 'S', 'SS'])]
  s._meta = {
    citation: 'Rosenberg, M. (1965). Society and the Adolescent Self-Image. Princeton, NJ: Princeton University Press.',
    domain: 'Psikologi',
    dimensions: 1,
    items: 10,
  }
  return s
}

// =====================================================================
// 3) UTAUT — Unified Theory of Acceptance and Use of Technology
//    Venkatesh, Morris, Davis & Davis (2003)
//    4 konstruk inti × 4 item, skala 1-7
// =====================================================================
export function templateUTAUT() {
  const s = newSurvey('UTAUT — Penerimaan Teknologi')
  s.description = 'Mengukur penerimaan dan penggunaan teknologi. Venkatesh dkk. (2003). 4 dimensi inti (PE, EE, SI, FC) × 4 item, skala Likert 7-poin. Ganti kata [TEKNOLOGI] dengan nama sistem yang diteliti (mis. "aplikasi X", "sistem Y").'

  const PE = [
    'Saya merasa [TEKNOLOGI] berguna dalam pekerjaan/aktivitas saya.',
    'Menggunakan [TEKNOLOGI] membantu saya menyelesaikan tugas lebih cepat.',
    'Menggunakan [TEKNOLOGI] meningkatkan produktivitas saya.',
    'Jika saya menggunakan [TEKNOLOGI], saya akan mendapat keuntungan/manfaat.',
  ]
  const EE = [
    'Interaksi saya dengan [TEKNOLOGI] mudah dipahami.',
    'Mudah bagi saya untuk menjadi terampil dalam menggunakan [TEKNOLOGI].',
    'Saya merasa [TEKNOLOGI] mudah digunakan.',
    'Belajar mengoperasikan [TEKNOLOGI] mudah bagi saya.',
  ]
  const SI = [
    'Orang yang penting bagi saya berpikir bahwa saya harus menggunakan [TEKNOLOGI].',
    'Orang-orang yang mempengaruhi perilaku saya berpikir saya harus menggunakan [TEKNOLOGI].',
    'Orang-orang yang pendapatnya saya hargai lebih suka saya menggunakan [TEKNOLOGI].',
    { label: 'Secara umum, lingkungan saya tidak mendukung penggunaan [TEKNOLOGI].', reverse: true },
  ]
  const FC = [
    'Saya memiliki sumber daya yang diperlukan untuk menggunakan [TEKNOLOGI].',
    'Saya memiliki pengetahuan yang diperlukan untuk menggunakan [TEKNOLOGI].',
    '[TEKNOLOGI] kompatibel dengan sistem lain yang saya gunakan.',
    'Tersedia bantuan dari pihak tertentu ketika saya mengalami kesulitan dengan [TEKNOLOGI].',
  ]

  s.sections = [
    makeLikertSection('Performance Expectancy (PE)', 'Sejauh mana individu percaya bahwa menggunakan sistem akan membantu meningkatkan kinerjanya', PE, 7, LIKERT_7_LABELS),
    makeLikertSection('Effort Expectancy (EE)', 'Tingkat kemudahan yang diasosiasikan dengan penggunaan sistem', EE, 7, LIKERT_7_LABELS),
    makeLikertSection('Social Influence (SI)', 'Sejauh mana individu merasa orang-orang penting di sekitarnya percaya ia harus menggunakan sistem', SI, 7, LIKERT_7_LABELS),
    makeLikertSection('Facilitating Conditions (FC)', 'Sejauh mana individu percaya tersedia infrastruktur teknis & organisasional untuk mendukung penggunaan sistem', FC, 7, LIKERT_7_LABELS),
  ]
  s._meta = {
    citation: 'Venkatesh, V., Morris, M. G., Davis, G. B., & Davis, F. D. (2003). User Acceptance of Information Technology: Toward a Unified View. MIS Quarterly, 27(3), 425–478.',
    domain: 'Sistem Informasi / Teknologi',
    dimensions: 4,
    items: 16,
  }
  return s
}

// =====================================================================
// 4) WHO-5 WELLBEING INDEX
//    World Health Organization (1998). 5 item, skala 0-5
// =====================================================================
export function templateWHO5() {
  const s = newSurvey('WHO-5 Wellbeing Index')
  s.description = 'Mengukur kesejahteraan psikologis subjektif selama 2 minggu terakhir. World Health Organization (1998). 5 item pendek, skala 0-5 (Sepanjang waktu – Tidak pernah).'

  const items = [
    'Selama 2 minggu terakhir, saya merasa bahagia dan dalam suasana hati yang baik.',
    'Selama 2 minggu terakhir, saya merasa tenang dan rileks.',
    'Selama 2 minggu terakhir, saya merasa aktif dan bersemangat.',
    'Selama 2 minggu terakhir, saya bangun dengan perasaan segar dan istirahat yang cukup.',
    'Selama 2 minggu terakhir, kehidupan sehari-hari saya dipenuhi dengan hal-hal yang menarik bagi saya.',
  ]
  const labels = ['Tidak Pernah', 'Kadang-kadang', 'Kurang Dari Separuh Waktu', 'Lebih Dari Separuh Waktu', 'Sebagian Besar Waktu', 'Sepanjang Waktu']
  s.sections = [makeLikertSection('Kesejahteraan Psikologis', 'WHO (1998)', items, 6, labels)]
  s._meta = {
    citation: 'World Health Organization. (1998). Wellbeing measures in primary health care/the DepCare Project. Copenhagen: WHO Regional Office for Europe.',
    domain: 'Kesehatan Mental',
    dimensions: 1,
    items: 5,
  }
  return s
}

// =====================================================================
// 5) JOB SATISFACTION SURVEY (JSS) — versi pendek 4 dimensi inti
//    Spector (1985). Versi lengkap 36 item; di sini disajikan 4 dimensi
//    × 3 item untuk kebutuhan skripsi yang lebih ringkas.
// =====================================================================
export function templateJobSatisfaction() {
  const s = newSurvey('Job Satisfaction Survey (Adapted)')
  s.description = 'Mengukur kepuasan kerja pada 4 dimensi inti: gaji, supervisi, rekan kerja, dan sifat pekerjaan. Adaptasi singkat dari Spector (1985). 12 item, skala 1-6.'

  const gaji = [
    'Saya merasa dibayar dengan jumlah yang adil untuk pekerjaan yang saya lakukan.',
    { label: 'Kenaikan gaji terlalu sedikit dan terlalu jarang.', reverse: true },
    { label: 'Saya merasa tidak dihargai oleh organisasi ketika saya memikirkan gaji saya.', reverse: true },
  ]
  const supervisi = [
    'Atasan saya cukup kompeten dalam melakukan pekerjaannya.',
    { label: 'Atasan saya tidak adil terhadap saya.', reverse: true },
    'Atasan saya menunjukkan minat pada perasaan bawahannya.',
  ]
  const rekan = [
    'Saya menyukai rekan kerja saya.',
    { label: 'Saya merasa harus bekerja lebih keras karena ketidakmampuan rekan kerja saya.', reverse: true },
    'Saya menikmati bekerja dengan orang-orang di sini.',
  ]
  const pekerjaan = [
    'Saya kadang-kadang merasa pekerjaan saya tidak berarti.',
    'Saya menyukai melakukan apa yang saya kerjakan di pekerjaan saya.',
    'Saya merasa bangga dengan pekerjaan saya.',
  ]

  const labels6 = ['STS', 'TS', 'ATS', 'AS', 'S', 'SS']
  s.sections = [
    makeLikertSection('Pay (Gaji)', 'Kepuasan terhadap gaji & kenaikan', gaji, 6, labels6),
    makeLikertSection('Supervision (Supervisi)', 'Kepuasan terhadap atasan langsung', supervisi, 6, labels6),
    makeLikertSection('Coworkers (Rekan Kerja)', 'Kepuasan terhadap rekan kerja', rekan, 6, labels6),
    makeLikertSection('Nature of Work (Sifat Pekerjaan)', 'Kepuasan terhadap pekerjaan itu sendiri', pekerjaan, 6, labels6),
  ]
  s._meta = {
    citation: 'Spector, P. E. (1985). Measurement of human service staff satisfaction: Development of the Job Satisfaction Survey. American Journal of Community Psychology, 13(6), 693–713.',
    domain: 'Perilaku Organisasi / SDM',
    dimensions: 4,
    items: 12,
  }
  return s
}

// =====================================================================
// 6) MINI-IPIP — Big Five (versi 20 item)
//    Donnellan dkk. (2006). 5 dimensi × 4 item, skala 1-5
// =====================================================================
export function templateMiniIPIP() {
  const s = newSurvey('Mini-IPIP Big Five Personality')
  s.description = 'Mengukur 5 dimensi kepribadian (Big Five): Extraversion, Agreeableness, Conscientiousness, Neuroticism, Openness. Donnellan dkk. (2006). 20 item, skala 1-5.'

  const E = [
    'Saya adalah orang yang banyak bicara dalam pesta.',
    { label: 'Saya tidak banyak bicara.', reverse: true },
    'Saya berbicara dengan banyak orang berbeda di pesta.',
    { label: 'Saya tetap di latar belakang.', reverse: true },
  ]
  const A = [
    'Saya bersimpati pada perasaan orang lain.',
    { label: 'Saya tidak tertarik pada masalah orang lain.', reverse: true },
    'Saya merasakan emosi orang lain.',
    { label: 'Saya tidak benar-benar tertarik pada orang lain.', reverse: true },
  ]
  const C = [
    'Saya mengerjakan tugas-tugas dengan segera.',
    { label: 'Saya sering lupa meletakkan barang kembali ke tempatnya.', reverse: true },
    'Saya menyukai keteraturan.',
    { label: 'Saya membuat berantakan dari banyak hal.', reverse: true },
  ]
  const N = [
    'Saya memiliki perubahan suasana hati yang sering.',
    'Saya mudah marah.',
    { label: 'Saya jarang merasa sedih.', reverse: true },
    { label: 'Saya santai sebagian besar waktu.', reverse: true },
  ]
  const O = [
    'Saya memiliki imajinasi yang aktif.',
    { label: 'Saya tidak tertarik pada ide-ide abstrak.', reverse: true },
    'Saya kesulitan memahami ide-ide abstrak.',
    { label: 'Saya tidak memiliki imajinasi yang baik.', reverse: true },
  ]

  s.sections = [
    makeLikertSection('Extraversion (Keterbukaan Sosial)', 'Tingkat sosiabilitas & energi sosial', E, 5, LIKERT_5_LABELS),
    makeLikertSection('Agreeableness (Keramahan)', 'Kecenderungan empati & kerjasama', A, 5, LIKERT_5_LABELS),
    makeLikertSection('Conscientiousness (Kehati-hatian)', 'Tingkat keteraturan & disiplin diri', C, 5, LIKERT_5_LABELS),
    makeLikertSection('Neuroticism (Neurotisisme)', 'Kecenderungan mengalami emosi negatif', N, 5, LIKERT_5_LABELS),
    makeLikertSection('Openness (Keterbukaan)', 'Keterbukaan terhadap pengalaman & ide baru', O, 5, LIKERT_5_LABELS),
  ]
  s._meta = {
    citation: 'Donnellan, M. B., Oswald, F. L., Baird, B. M., & Lucas, R. E. (2006). The Mini-IPIP Scales: Tiny-yet-effective measures of the Big Five factors of personality. Psychological Assessment, 18(2), 192–203.',
    domain: 'Psikologi Kepribadian',
    dimensions: 5,
    items: 20,
  }
  return s
}

// =====================================================================
// Daftar instrumen — untuk dropdown UI
// =====================================================================
export const INSTRUMENT_TEMPLATES = [
  {
    id: 'gse',
    name: 'General Self-Efficacy (GSE)',
    domain: 'Psikologi Positif',
    items: 10,
    dimensions: 1,
    citation: 'Schwarzer & Jerusalem (1995)',
    desc: 'Efikasi diri umum — keyakinan menghadapi tugas baru.',
    factory: templateGSE,
  },
  {
    id: 'rses',
    name: 'Rosenberg Self-Esteem (RSES)',
    domain: 'Psikologi',
    items: 10,
    dimensions: 1,
    citation: 'Rosenberg (1965)',
    desc: 'Harga diri global. 5 item reverse-coded.',
    factory: templateRSES,
  },
  {
    id: 'utaut',
    name: 'UTAUT — Penerimaan Teknologi',
    domain: 'Sistem Informasi',
    items: 16,
    dimensions: 4,
    citation: 'Venkatesh dkk. (2003)',
    desc: 'PE, EE, SI, FC. Ganti placeholder [TEKNOLOGI] sesuai topik.',
    factory: templateUTAUT,
  },
  {
    id: 'who5',
    name: 'WHO-5 Wellbeing Index',
    domain: 'Kesehatan Mental',
    items: 5,
    dimensions: 1,
    citation: 'WHO (1998)',
    desc: 'Kesejahteraan psikologis 2 minggu terakhir.',
    factory: templateWHO5,
  },
  {
    id: 'jss',
    name: 'Job Satisfaction Survey (Adapted)',
    domain: 'Perilaku Organisasi',
    items: 12,
    dimensions: 4,
    citation: 'Spector (1985)',
    desc: 'Gaji, Supervisi, Rekan Kerja, Sifat Pekerjaan.',
    factory: templateJobSatisfaction,
  },
  {
    id: 'mini_ipip',
    name: 'Mini-IPIP Big Five Personality',
    domain: 'Psikologi Kepribadian',
    items: 20,
    dimensions: 5,
    citation: 'Donnellan dkk. (2006)',
    desc: 'E, A, C, N, O — 5 dimensi Big Five.',
    factory: templateMiniIPIP,
  },
]

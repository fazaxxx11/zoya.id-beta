// Example datasets — siap-pakai untuk new user yang belum punya data.
// Konteks lokal Indonesia biar relate ke skripsi mahasiswa.
//
// Format: setiap dataset punya { id, name, description, recommendedTool,
// recommendedParams, columns, data }.
//   - columns: array nama kolom (urut)
//   - data: object { [col]: number[] | string[] }, semua array sama panjang
//   - recommendedParams: hint untuk auto-fill ke params Statistik (opsional)
//
// Dipakai di Statistik & StatistikBatch sebagai onboarding cepat.

export const EXAMPLE_DATASETS = [
  {
    id: 'pretest-postest',
    name: 'Pretest-Postest Pemahaman IPS',
    description: 'Skor 20 siswa sebelum & sesudah pembelajaran. Cocok untuk Paired t-test atau Wilcoxon.',
    recommendedTool: 'ttest',
    recommendedParams: { variant: 'paired', column1: 'pre_test', column2: 'post_test' },
    columns: ['student', 'pre_test', 'post_test'],
    data: {
      student: Array.from({ length: 20 }, (_, i) => i + 1),
      pre_test:  [72, 68, 80, 65, 77, 69, 74, 71, 66, 79, 73, 70, 75, 67, 78, 72, 69, 76, 68, 74],
      post_test: [78, 75, 82, 70, 84, 76, 80, 79, 72, 85, 81, 77, 83, 74, 86, 79, 75, 84, 73, 82],
    },
  },

  {
    id: 'ipk-4-jurusan',
    name: 'IPK Lulusan 4 Jurusan',
    description: 'Sampel IPK dari 4 jurusan (Akuntansi, Manajemen, Ekonomi, Bisnis). Cocok untuk One-way ANOVA atau Kruskal-Wallis.',
    recommendedTool: 'anova',
    recommendedParams: { dependentVar: 'ipk', groupVar: 'jurusan' },
    columns: ['mahasiswa', 'jurusan', 'ipk'],
    data: {
      mahasiswa: Array.from({ length: 40 }, (_, i) => `M${(i + 1).toString().padStart(3, '0')}`),
      jurusan: [
        ...Array(10).fill('Akuntansi'),
        ...Array(10).fill('Manajemen'),
        ...Array(10).fill('Ekonomi'),
        ...Array(10).fill('Bisnis'),
      ],
      ipk: [
        // Akuntansi (lebih tinggi)
        3.65, 3.72, 3.55, 3.81, 3.48, 3.69, 3.77, 3.58, 3.62, 3.71,
        // Manajemen
        3.42, 3.55, 3.38, 3.61, 3.49, 3.45, 3.52, 3.40, 3.58, 3.47,
        // Ekonomi
        3.31, 3.28, 3.45, 3.36, 3.22, 3.40, 3.33, 3.29, 3.42, 3.35,
        // Bisnis (mirip Manajemen)
        3.50, 3.46, 3.55, 3.41, 3.59, 3.48, 3.52, 3.44, 3.57, 3.50,
      ],
    },
  },

  {
    id: 'kepuasan-likert',
    name: 'Survei Kepuasan Layanan (10 item Likert)',
    description: '30 responden, skala Likert 1–5. Cocok untuk uji Validitas & Reliabilitas instrumen (Cronbach\'s Alpha).',
    recommendedTool: 'reliability',
    recommendedParams: { items: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10'] },
    columns: ['responden', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10'],
    data: {
      responden: Array.from({ length: 30 }, (_, i) => `R${(i + 1).toString().padStart(3, '0')}`),
      Q1:  [5,4,5,3,4,5,4,5,4,3,5,4,4,5,3,4,5,4,5,3,4,5,4,4,5,3,4,5,4,5],
      Q2:  [4,4,5,3,4,5,4,4,4,3,5,4,4,5,3,4,4,4,5,3,4,5,4,4,5,3,4,5,4,5],
      Q3:  [5,4,4,3,4,5,4,5,4,3,4,4,4,5,3,4,5,4,5,3,4,4,4,4,5,3,4,5,4,4],
      Q4:  [4,5,5,4,5,4,5,5,5,4,5,5,5,4,4,5,4,5,4,4,5,5,5,5,4,4,5,4,5,5],
      Q5:  [5,5,4,4,5,4,5,4,5,4,4,5,5,4,4,5,5,5,4,4,5,4,5,5,4,4,5,4,5,4],
      Q6:  [3,3,4,2,3,4,3,4,3,2,4,3,3,4,2,3,4,3,4,2,3,4,3,3,4,2,3,4,3,4],
      Q7:  [4,3,4,3,4,4,3,4,3,3,4,3,4,4,3,3,4,3,4,3,3,4,3,4,4,3,3,4,3,4],
      Q8:  [5,4,5,3,4,5,4,5,4,3,5,4,4,5,3,4,5,4,5,3,4,5,4,4,5,3,4,5,4,5],
      Q9:  [4,4,5,3,4,5,4,4,4,3,5,4,4,5,3,4,4,4,5,3,4,5,4,4,5,3,4,5,4,5],
      Q10: [5,4,4,3,4,5,4,5,4,3,4,4,4,5,3,4,5,4,5,3,4,4,4,4,5,3,4,5,4,4],
    },
  },

  {
    id: 'belajar-prestasi',
    name: 'Jam Belajar vs Prestasi (n=25)',
    description: 'Korelasi antara jam belajar per minggu dengan nilai akhir. Cocok untuk Korelasi Pearson & Regresi Linier Sederhana.',
    recommendedTool: 'correlation',
    recommendedParams: { method: 'pearson', column1: 'jam_belajar', column2: 'nilai_akhir' },
    columns: ['mahasiswa', 'jam_belajar', 'nilai_akhir'],
    data: {
      mahasiswa: Array.from({ length: 25 }, (_, i) => `M${i + 1}`),
      jam_belajar: [5, 8, 12, 3, 15, 7, 10, 14, 6, 11, 9, 13, 4, 16, 8, 10, 12, 5, 14, 9, 11, 7, 15, 6, 13],
      nilai_akhir: [62, 70, 82, 55, 88, 68, 76, 85, 65, 78, 73, 84, 58, 92, 71, 75, 80, 60, 87, 72, 79, 67, 90, 64, 83],
    },
  },

  {
    id: 'ngain-treatment-matematika',
    name: 'N-Gain Treatment Pembelajaran Matematika (n=30)',
    description: 'Skor pre-test & post-test 30 siswa SMP setelah treatment metode pembelajaran kontekstual. Distribusi gain bervariasi (Tinggi/Sedang/Rendah). Cocok untuk Uji N-Gain (Hake) & Paired t-test.',
    recommendedTool: 'ngain',
    recommendedParams: { column1: 'pre_test', column2: 'post_test', maxScore: 100, nameColumn: 'siswa' },
    columns: ['siswa', 'pre_test', 'post_test'],
    data: {
      siswa: Array.from({ length: 30 }, (_, i) => `Siswa ${(i + 1).toString().padStart(2, '0')}`),
      // Mix: ~10 siswa Tinggi (g≥0.7), ~13 Sedang (0.3≤g<0.7), ~7 Rendah (g<0.3)
      pre_test: [
        // Kelompok 1: pre rendah, post tinggi (Tinggi gain)
        35, 40, 30, 38, 42, 33, 36, 41, 34, 37,
        // Kelompok 2: pre sedang, post agak naik (Sedang gain)
        50, 55, 48, 52, 58, 45, 53, 56, 49, 54, 51, 57, 46,
        // Kelompok 3: pre tinggi, post tidak naik banyak (Rendah gain)
        65, 70, 68, 72, 75, 67, 73,
      ],
      post_test: [
        // Tinggi: g ≈ 0.75-0.85
        85, 88, 82, 87, 90, 83, 86, 90, 84, 88,
        // Sedang: g ≈ 0.4-0.6
        75, 78, 72, 76, 80, 70, 78, 80, 74, 78, 75, 80, 72,
        // Rendah: g ≈ 0.15-0.28
        72, 76, 73, 77, 80, 73, 78,
      ],
    },
  },

  {
    id: 'gender-pilihan-jurusan',
    name: 'Gender vs Pilihan Bidang Studi',
    description: 'Kontingensi 100 mahasiswa: gender × bidang (Sains, Sosial, Bahasa). Cocok untuk Chi-Square Independensi.',
    recommendedTool: 'chisquare',
    recommendedParams: { column1: 'gender', column2: 'bidang' },
    columns: ['responden', 'gender', 'bidang'],
    data: (() => {
      const responden = Array.from({ length: 100 }, (_, i) => `R${(i + 1).toString().padStart(3, '0')}`)
      // Pria: 30 Sains, 12 Sosial, 8 Bahasa | Wanita: 15 Sains, 20 Sosial, 15 Bahasa
      const gender = [...Array(50).fill('Pria'), ...Array(50).fill('Wanita')]
      const bidang = [
        ...Array(30).fill('Sains'), ...Array(12).fill('Sosial'), ...Array(8).fill('Bahasa'),
        ...Array(15).fill('Sains'), ...Array(20).fill('Sosial'), ...Array(15).fill('Bahasa'),
      ]
      return { responden, gender, bidang }
    })(),
  },
]

/**
 * Resolve dataset by id.
 */
export function getExampleDataset(id) {
  return EXAMPLE_DATASETS.find(d => d.id === id) || null
}

/**
 * Convert dataset to format yg dipakai handleFileUpload (columns + data object).
 * Reuse oleh Statistik.jsx & StatistikBatch.jsx.
 */
export function datasetToParsed(dataset) {
  const { columns, data, name } = dataset
  return {
    fileName: `[Contoh] ${name}.csv`,
    columns: [...columns],
    data: { ...data },
    rowCount: data[columns[0]].length,
  }
}

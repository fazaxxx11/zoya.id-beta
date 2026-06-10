/**
 * N-gain (Hake, 1998) — Normalized Gain.
 * Pure implementation: NO external libs.
 *
 * Formula:
 *   g_individu = (post - pre) / (max - pre),  jika pre < max
 *              = 0,                           jika pre = max (tidak bisa naik)
 *
 * Kategori (Hake, 1998):
 *   Tinggi : g ≥ 0.7
 *   Sedang : 0.3 ≤ g < 0.7
 *   Rendah : g < 0.3
 *
 * Reference: Hake, R. R. (1998). Interactive-engagement vs traditional methods.
 * American Journal of Physics, 66(1), 64–74.
 */

import { describe } from './descriptive.js';
import { pairedTTest } from './ttest.js';

/**
 * Compute N-gain untuk satu pasangan pre-post.
 * @param {number} pre
 * @param {number} post
 * @param {number} maxScore
 * @returns {number|null}
 */
export function calcNGain(pre, post, maxScore = 100) {
  if (typeof pre !== 'number' || typeof post !== 'number') return null;
  if (!isFinite(pre) || !isFinite(post)) return null;
  const denom = maxScore - pre;
  if (denom <= 0) {
    return post >= pre ? 1.0 : 0.0;
  }
  const g = (post - pre) / denom;
  return Number(g.toFixed(4));
}

/**
 * Kategori Hake.
 * @param {number|null} g
 * @returns {string}
 */
export function categorizeNGain(g) {
  if (g == null || !isFinite(g)) return 'N/A';
  if (g >= 0.7) return 'Tinggi';
  if (g >= 0.3) return 'Sedang';
  return 'Rendah';
}

/**
 * Analisis N-gain lengkap untuk satu kelas/grup.
 *
 * @param {object} args
 * @param {number[]} args.pre - skor pre-test per siswa
 * @param {number[]} args.post - skor post-test per siswa
 * @param {number} [args.maxScore=100] - skor maksimum
 * @param {string[]} [args.names] - nama siswa (optional, untuk per-individu output)
 * @returns {object}
 */
export function analyzeNGain({ pre, post, maxScore = 100, names = [] }) {
  if (!Array.isArray(pre) || !Array.isArray(post)) {
    return { error: 'pre dan post harus array' };
  }
  if (pre.length !== post.length) {
    return { error: `Jumlah baris pre (${pre.length}) dan post (${post.length}) tidak sama` };
  }

  // Pasangan valid (kedua nilai numeric & dalam rentang 0..maxScore)
  const pairs = [];
  for (let i = 0; i < pre.length; i++) {
    const a = pre[i];
    const b = post[i];
    if (
      typeof a === 'number' && typeof b === 'number' &&
      isFinite(a) && isFinite(b) &&
      a >= 0 && a <= maxScore &&
      b >= 0 && b <= maxScore
    ) {
      pairs.push({
        index: i,
        name: names[i] || `Subjek ${i + 1}`,
        pre: a,
        post: b,
        gain: b - a,
        nGain: calcNGain(a, b, maxScore),
      });
    }
  }

  if (pairs.length < 2) {
    return { error: `Hanya ${pairs.length} pasangan valid — butuh minimal 2 untuk dianalisis` };
  }

  // Tambahkan kategori per individu
  pairs.forEach(p => { p.kategori = categorizeNGain(p.nGain); });

  // Distribusi kategori
  const distribusi = { Tinggi: 0, Sedang: 0, Rendah: 0 };
  pairs.forEach(p => { distribusi[p.kategori] = (distribusi[p.kategori] || 0) + 1; });

  // Statistik N-gain agregat
  const nGains = pairs.map(p => p.nGain).filter(g => g != null && isFinite(g));
  const nGainStats = describe(nGains) || {};

  // Klasifikasi rata-rata kelas (Hake)
  const meanG = nGainStats.mean ?? 0;
  const kategoriKelas = categorizeNGain(meanG);

  // % efektivitas (kalikan 100)
  const efektivitasPersen = Number((meanG * 100).toFixed(2));

  // Statistik pre & post (untuk konteks)
  const preValues = pairs.map(p => p.pre);
  const postValues = pairs.map(p => p.post);
  const preStats = describe(preValues) || {};
  const postStats = describe(postValues) || {};

  // Paired t-test untuk uji signifikansi peningkatan.
  // Konvensi pairedTTest(a, b) menghitung diff = a - b. Kita pakai (post, pre)
  // agar diff positif merepresentasikan peningkatan (lebih intuitif).
  let signifTest = null;
  try {
    const tt = pairedTTest(postValues, preValues);
    if (tt && !tt.error) {
      signifTest = {
        t: tt.t,
        df: tt.df,
        pValue: tt.pValue,
        meanDiff: tt.meanDiff,
        cohensD: tt.cohensD,
        significant: tt.pValue < 0.05,
        ci95: tt.ci95,
      };
    }
  } catch { /* ignore — significance test optional */ }

  // Persentase per kategori
  const total = pairs.length;
  const distribusiPersen = {
    Tinggi: Number(((distribusi.Tinggi / total) * 100).toFixed(2)),
    Sedang: Number(((distribusi.Sedang / total) * 100).toFixed(2)),
    Rendah: Number(((distribusi.Rendah / total) * 100).toFixed(2)),
  };

  // Tafsiran efektivitas berdasarkan persen N-gain (Hake — interpretasi tambahan)
  let tafsiranEfektivitas;
  if (efektivitasPersen > 76) tafsiranEfektivitas = 'Efektif';
  else if (efektivitasPersen >= 56) tafsiranEfektivitas = 'Cukup Efektif';
  else if (efektivitasPersen >= 40) tafsiranEfektivitas = 'Kurang Efektif';
  else tafsiranEfektivitas = 'Tidak Efektif';

  return {
    error: null,
    n: pairs.length,
    maxScore,
    pairs,
    distribusi,
    distribusiPersen,
    nGainMean: nGainStats.mean,
    nGainSD: nGainStats.stdDev,
    nGainMin: nGainStats.min,
    nGainMax: nGainStats.max,
    nGainMedian: nGainStats.median,
    kategoriKelas,
    efektivitasPersen,
    tafsiranEfektivitas,
    preStats: {
      mean: preStats.mean,
      sd: preStats.stdDev,
      min: preStats.min,
      max: preStats.max,
    },
    postStats: {
      mean: postStats.mean,
      sd: postStats.stdDev,
      min: postStats.min,
      max: postStats.max,
    },
    signifTest,
  };
}

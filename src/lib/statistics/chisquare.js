/**
 * Chi-square tests — SPSS-compatible.
 * Pure implementation: NO jstat, NO external libs.
 *
 * - Independence (RxC kontingensi)
 * - Goodness of Fit
 * - Effect size: Cramer's V + 95% CI (Bonett 2006), Phi (2x2)
 */

import { chi2PValue, normalCDF } from './distributions.js';

// ── z-quantile (hardcoded common values + bisection fallback) ────

function zQuantile(p) {
  if (p === 0.95) return 1.6448536269514722;
  if (p === 0.975) return 1.959963984540054;
  if (p === 0.995) return 2.5758293035489004;
  // Bisection fallback
  return bisect(x => normalCDF(x) - p, -8, 8, 1e-12);
}

function bisect(fn, lo, hi, tol) {
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (Math.abs(fn(mid)) < tol || (hi - lo) / 2 < tol) return mid;
    if (fn(mid) > 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

// ── Cramer's V CI (Bonett 2006) ─────────────────────────────────

function cramersV_CI(v, chi2, N, df, alpha = 0.05) {
  if (v === 0 || N < 10) return [Math.max(0, v - 0.1), Math.min(1, v + 0.1)];
  const se = v / Math.sqrt(2 * chi2);
  const z = zQuantile(1 - alpha / 2); // 95% CI → p=0.975
  return [Math.max(0, v - z * se), Math.min(1, v + z * se)];
}

// ── Effect size labels ──────────────────────────────────────────

function cramersVLabel(v) {
  if (v < 0.1) return 'Sangat kecil';
  if (v < 0.3) return 'Kecil';
  if (v < 0.5) return 'Sedang';
  return 'Besar';
}

// ── Interpretation builder ──────────────────────────────────────

function buildChi2Interpretation(chi2, df, p, alpha, v, vCI, minDim) {
  const ciStr = vCI ? ` 95% CI [${vCI[0].toFixed(3)}, ${vCI[1].toFixed(3)}]` : '';
  if (p < alpha) {
    return `Terdapat hubungan signifikan antara dua variabel kategorik (χ²(${df}) = ${chi2.toFixed(3)}, p = ${p.toFixed(4)} < α = ${alpha}). Cramer's V = ${v.toFixed(3)}${ciStr} (${cramersVLabel(v).toLowerCase()}) menunjukkan kekuatan hubungan.`;
  }
  return `Tidak ada hubungan signifikan antara dua variabel kategorik (χ²(${df}) = ${chi2.toFixed(3)}, p = ${p.toFixed(4)} > α = ${alpha}). H₀ (independen) tidak ditolak.`;
}

// ── Chi-square Independence ────────────────────────────────────

export function chiSquareIndependence(col1, col2, alpha = 0.05) {
  if (col1.length !== col2.length) {
    return { error: `Panjang kolom harus sama (${col1.length} vs ${col2.length})` };
  }

  // Pair + drop missing
  const pairs = [];
  for (let i = 0; i < col1.length; i++) {
    const a = col1[i], b = col2[i];
    if (a === null || a === undefined || a === '' ||
        b === null || b === undefined || b === '') continue;
    pairs.push([String(a), String(b)]);
  }
  if (pairs.length < 5) return { error: `Sampel terlalu kecil setelah remove missing (${pairs.length})` };

  // Build categories
  const rowLabels = [...new Set(pairs.map(p => p[0]))].sort();
  const colLabels = [...new Set(pairs.map(p => p[1]))].sort();
  const r = rowLabels.length;
  const c = colLabels.length;

  if (r < 2 || c < 2) {
    return { error: `Butuh minimal 2 kategori per variabel (rows=${r}, cols=${c})` };
  }

  const rowIdx = Object.fromEntries(rowLabels.map((l, i) => [l, i]));
  const colIdx = Object.fromEntries(colLabels.map((l, i) => [l, i]));

  // Observed frequencies
  const observed = Array.from({ length: r }, () => new Array(c).fill(0));
  for (const [a, b] of pairs) observed[rowIdx[a]][colIdx[b]]++;

  // Marginals
  const rowTotals = observed.map(row => row.reduce((s, v) => s + v, 0));
  const colTotals = new Array(c).fill(0);
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) colTotals[j] += observed[i][j];
  const N = pairs.length;

  // Expected
  const expected = Array.from({ length: r }, (_, i) =>
    Array.from({ length: c }, (_, j) => (rowTotals[i] * colTotals[j]) / N)
  );

  // Chi-square statistic
  let chi2 = 0;
  let cellsLow = 0;
  for (let i = 0; i < r; i++) {
    for (let j = 0; j < c; j++) {
      const e = expected[i][j];
      if (e < 5) cellsLow++;
      if (e > 0) chi2 += ((observed[i][j] - e) ** 2) / e;
    }
  }

  const df = (r - 1) * (c - 1);
  const pValue = chi2PValue(chi2, df);

  // Effect size
  const minDim = Math.min(r - 1, c - 1);
  const cramersV = Math.sqrt(chi2 / (N * minDim));
  const cramersV_CI95 = cramersV_CI(cramersV, chi2, N, df, alpha);
  const phi = (r === 2 && c === 2) ? Math.sqrt(chi2 / N) : null;

  const totalCells = r * c;
  const lowExpectedPercent = (cellsLow / totalCells) * 100;
  const assumptionWarning = lowExpectedPercent > 20
    ? `⚠️ ${cellsLow} dari ${totalCells} sel (${lowExpectedPercent.toFixed(0)}%) memiliki expected < 5. Asumsi chi-square tidak terpenuhi (>20% sel <5). Pertimbangkan Fisher's Exact Test untuk tabel 2x2 atau gabungkan kategori.`
    : null;

  return {
    chi2,
    df,
    pValue,
    N,
    rowLabels,
    colLabels,
    observed,
    expected,
    rowTotals,
    colTotals,
    cramersV,
    cramersV_CI: cramersV_CI95,
    phi,
    cellsLowExpected: cellsLow,
    lowExpectedPercent,
    assumptionWarning,
    effectSizeLabel: cramersVLabel(cramersV),
    isSignificant: pValue < alpha,
    alpha,
    interpretation: buildChi2Interpretation(chi2, df, pValue, alpha, cramersV, cramersV_CI95, minDim),
  };
}

// ── Chi-square Goodness of Fit ─────────────────────────────────

export function chiSquareGoodnessOfFit(observed, expected = null, alpha = 0.05) {
  const obs = observed.filter(v => typeof v === 'number' && v >= 0);
  const k = obs.length;
  if (k < 2) return { error: 'Butuh minimal 2 kategori' };

  const N = obs.reduce((s, v) => s + v, 0);
  const exp = expected ?? new Array(k).fill(N / k);
  if (exp.length !== k) return { error: 'Panjang observed dan expected harus sama' };

  let chi2 = 0;
  for (let i = 0; i < k; i++) {
    if (exp[i] > 0) chi2 += ((obs[i] - exp[i]) ** 2) / exp[i];
  }
  const df = k - 1;
  const pValue = chi2PValue(chi2, df);

  return {
    chi2, df, pValue, N, k,
    observed: obs, expected: exp,
    isSignificant: pValue < alpha,
    alpha,
    interpretation: pValue < alpha
      ? `Distribusi observed berbeda signifikan dari expected (χ²(${df}) = ${chi2.toFixed(3)}, p = ${pValue.toFixed(4)} < α = ${alpha}).`
      : `Distribusi observed sesuai dengan expected (χ²(${df}) = ${chi2.toFixed(3)}, p = ${pValue.toFixed(4)} > α = ${alpha}).`,
  };
}

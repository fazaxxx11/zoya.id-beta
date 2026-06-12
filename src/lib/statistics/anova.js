/**
 * One-way ANOVA — SPSS-compatible.
 * Listwise deletion, F-test, eta-squared effect size.
 */

import { groupBy } from './data.js';
import { fCDF, fPValue, tPValue } from './distributions.js';

/**
 * One-way ANOVA (between-subjects).
 * @param {number[]} values - dependent variable
 * @param {string[]} groups - grouping variable
 * @param {number} alpha
 * @returns {Object}
 */
export function oneWayANOVA(values, groups, alpha = 0.05) {
  const { groupMap, groups: groupNames } = groupBy(values, groups);

  if (groupNames.length < 2) {
    return { method: 'one_way_anova', error: 'Minimal 2 grup' };
  }

  const k = groupNames.length;
  const groupData = groupNames.map(g => groupMap.get(g));
  const groupSizes = groupData.map(g => g.length);
  const groupMeans = groupData.map(g => g.reduce((a, b) => a + b, 0) / g.length);
  const N = groupSizes.reduce((a, b) => a + b, 0);

  if (N < k + 1) {
    return { method: 'one_way_anova', error: 'N < k + 1' };
  }

  const grandMean = groupData.flat().reduce((a, b) => a + b, 0) / N;

  // SS between
  const ssBetween = groupData.reduce((s, g, i) => {
    const m = groupMeans[i];
    return s + g.length * (m - grandMean) ** 2;
  }, 0);

  // SS within
  const ssWithin = groupData.reduce((s, g, i) => {
    const m = groupMeans[i];
    return s + g.reduce((ss, v) => ss + (v - m) ** 2, 0);
  }, 0);

  const dfBetween = k - 1;
  const dfWithin = N - k;
  const dfTotal = N - 1;
  const msBetween = dfBetween > 0 ? ssBetween / dfBetween : 0;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 0;
  const F = msWithin > 0 ? msBetween / msWithin : 0;
  const pValue = fPValue(F, dfBetween, dfWithin);

  // Effect sizes
  const etaSquared = ssBetween + ssWithin > 0 ? ssBetween / (ssBetween + ssWithin) : 0;
  const omegaSquared = (ssBetween - dfBetween * msWithin) / (ssWithin + ssBetween + msWithin);

  // Post-hoc: Tukey HSD (if significant)
  const postHoc = pValue < alpha ? tukeyHSD(groupData, groupNames, msWithin, dfWithin) : [];

  return {
    method: 'one_way_anova',
    F,
    dfBetween,
    dfWithin,
    dfTotal,
    ssBetween,
    ssWithin,
    ssTotal: ssBetween + ssWithin,
    msBetween,
    msWithin,
    pValue,
    etaSquared,
    omegaSquared,
    k,
    N,
    groupMeans: groupNames.map((g, i) => ({ group: g, mean: groupMeans[i], n: groupSizes[i] })),
    postHoc,
    significant: pValue < alpha,
    alpha,
    missing: values.length - N,
    notes: 'One-way between-subjects ANOVA. Effect sizes: η² and ω². Post-hoc: Tukey HSD (if significant).',
  };
}

function tukeyHSD(groupData, groupNames, msWithin, dfWithin) {
  const means = groupData.map(g => g.reduce((a, b) => a + b, 0) / g.length);
  const ns = groupData.map(g => g.length);
  const results = [];

  for (let i = 0; i < groupData.length; i++) {
    for (let j = i + 1; j < groupData.length; j++) {
      const diff = Math.abs(means[i] - means[j]);
      const se = Math.sqrt(msWithin * (1 / ns[i] + 1 / ns[j]));
      const q = se > 0 ? diff / se : 0;
      results.push({
        group1: groupNames[i],
        group2: groupNames[j],
        meanDiff: means[i] - means[j],
        q,
      });
    }
  }

  return results;
}

// ── Two-Way ANOVA ─────────────────────────────────────────────────

function interpretEta(e) {
  const a = Math.abs(e);
  if (a < 0.01) return 'kecil sekali';
  if (a < 0.06) return 'kecil';
  if (a < 0.14) return 'sedang';
  return 'besar';
}

/**
 * Two-Way ANOVA (factorial design).
 * Cell-means approach (approximates Type III for unbalanced designs).
 *
 * @param {object} args
 * @param {number[]} args.y - outcome
 * @param {(string|number)[]} args.a - factor A levels
 * @param {(string|number)[]} args.b - factor B levels
 * @param {string} args.nameA
 * @param {string} args.nameB
 * @param {number} args.alpha
 * @returns {object}
 */
export function twoWayANOVA({ y, a, b, nameA = 'A', nameB = 'B', alpha = 0.05 }) {
  if (!Array.isArray(y) || !Array.isArray(a) || !Array.isArray(b)) {
    return { error: 'y, a, dan b harus array' };
  }
  if (y.length !== a.length || y.length !== b.length) {
    return { error: `Panjang array tidak sama (y=${y.length}, a=${a.length}, b=${b.length})` };
  }

  // Filter valid rows
  const rows = [];
  for (let i = 0; i < y.length; i++) {
    const yi = y[i], ai = a[i], bi = b[i];
    if (
      typeof yi === 'number' && isFinite(yi) && !isNaN(yi) &&
      ai !== null && ai !== undefined && ai !== '' &&
      bi !== null && bi !== undefined && bi !== ''
    ) {
      rows.push({ y: yi, a: String(ai), b: String(bi) });
    }
  }

  const N = rows.length;
  if (N < 4) return { error: `Hanya ${N} baris valid — butuh minimal 4` };

  const levelsA = [...new Set(rows.map(r => r.a))].sort();
  const levelsB = [...new Set(rows.map(r => r.b))].sort();
  const aN = levelsA.length;
  const bN = levelsB.length;
  if (aN < 2) return { error: `Faktor "${nameA}" hanya punya 1 level — butuh ≥ 2` };
  if (bN < 2) return { error: `Faktor "${nameB}" hanya punya 1 level — butuh ≥ 2` };

  // Cell map
  const cells = {};
  rows.forEach(r => {
    const key = `${r.a}\x1f${r.b}`;
    if (!cells[key]) cells[key] = [];
    cells[key].push(r.y);
  });

  // Check all cells populated
  const allCellKeys = [];
  for (const la of levelsA) for (const lb of levelsB) allCellKeys.push(`${la}\x1f${lb}`);
  const emptyCells = allCellKeys.filter(k => !cells[k] || cells[k].length === 0);
  if (emptyCells.length > 0) {
    return { error: `Ada ${emptyCells.length} sel kosong. Two-way ANOVA butuh data di setiap sel.` };
  }

  const dfWithin = N - aN * bN;
  if (dfWithin < 1) {
    return { error: `df residual = ${dfWithin} (butuh ≥ 1). Tambahkan replikasi per sel atau kurangi level faktor.` };
  }

  // Means
  const grandMean = rows.reduce((s, r) => s + r.y, 0) / N;
  const meanA = {}, nA = {};
  for (const la of levelsA) {
    const sub = rows.filter(r => r.a === la);
    nA[la] = sub.length;
    meanA[la] = sub.reduce((s, r) => s + r.y, 0) / sub.length;
  }
  const meanB = {}, nB = {};
  for (const lb of levelsB) {
    const sub = rows.filter(r => r.b === lb);
    nB[lb] = sub.length;
    meanB[lb] = sub.reduce((s, r) => s + r.y, 0) / sub.length;
  }

  const cellMean = {}, cellN = {};
  for (const key of Object.keys(cells)) {
    const vals = cells[key];
    cellN[key] = vals.length;
    cellMean[key] = vals.reduce((s, v) => s + v, 0) / vals.length;
  }

  // Sum of Squares
  const SS_total = rows.reduce((s, r) => s + (r.y - grandMean) ** 2, 0);
  const SS_A = levelsA.reduce((s, la) => s + nA[la] * (meanA[la] - grandMean) ** 2, 0);
  const SS_B = levelsB.reduce((s, lb) => s + nB[lb] * (meanB[lb] - grandMean) ** 2, 0);
  const SS_cells = Object.keys(cellMean).reduce(
    (s, k) => s + cellN[k] * (cellMean[k] - grandMean) ** 2, 0
  );
  const SS_within = rows.reduce((s, r) => {
    const k = `${r.a}\x1f${r.b}`;
    return s + (r.y - cellMean[k]) ** 2;
  }, 0);
  const SS_AB = Math.max(0, SS_cells - SS_A - SS_B);

  // Degrees of freedom
  const df_A = aN - 1;
  const df_B = bN - 1;
  const df_AB = (aN - 1) * (bN - 1);
  const df_total = N - 1;

  // Mean squares
  const MS_A = df_A > 0 ? SS_A / df_A : 0;
  const MS_B = df_B > 0 ? SS_B / df_B : 0;
  const MS_AB = df_AB > 0 ? SS_AB / df_AB : 0;
  const MS_within = dfWithin > 0 ? SS_within / dfWithin : 0;

  // F statistics & p-values
  const F_A = MS_within > 0 ? MS_A / MS_within : 0;
  const F_B = MS_within > 0 ? MS_B / MS_within : 0;
  const F_AB = MS_within > 0 ? MS_AB / MS_within : 0;

  const safeP = (F, df1, df2) => {
    if (!isFinite(F) || F < 0) return 1;
    return Math.max(0, Math.min(1, fPValue(F, df1, df2)));
  };
  const p_A = safeP(F_A, df_A, dfWithin);
  const p_B = safeP(F_B, df_B, dfWithin);
  const p_AB = safeP(F_AB, df_AB, dfWithin);

  // Effect sizes
  const etaSq_A = SS_total > 0 ? SS_A / SS_total : 0;
  const etaSq_B = SS_total > 0 ? SS_B / SS_total : 0;
  const etaSq_AB = SS_total > 0 ? SS_AB / SS_total : 0;
  const partialEtaSq_A = (SS_A + SS_within) > 0 ? SS_A / (SS_A + SS_within) : 0;
  const partialEtaSq_B = (SS_B + SS_within) > 0 ? SS_B / (SS_B + SS_within) : 0;
  const partialEtaSq_AB = (SS_AB + SS_within) > 0 ? SS_AB / (SS_AB + SS_within) : 0;

  // ANOVA table
  const anovaTable = [
    {
      source: nameA,
      SS: SS_A, df: df_A, MS: MS_A, F: F_A, pValue: p_A,
      etaSquared: etaSq_A, partialEtaSquared: partialEtaSq_A,
      effectSize: interpretEta(partialEtaSq_A), significant: p_A < alpha,
    },
    {
      source: nameB,
      SS: SS_B, df: df_B, MS: MS_B, F: F_B, pValue: p_B,
      etaSquared: etaSq_B, partialEtaSquared: partialEtaSq_B,
      effectSize: interpretEta(partialEtaSq_B), significant: p_B < alpha,
    },
    {
      source: `${nameA} × ${nameB}`,
      SS: SS_AB, df: df_AB, MS: MS_AB, F: F_AB, pValue: p_AB,
      etaSquared: etaSq_AB, partialEtaSquared: partialEtaSq_AB,
      effectSize: interpretEta(partialEtaSq_AB), significant: p_AB < alpha,
    },
    {
      source: 'Residual',
      SS: SS_within, df: dfWithin, MS: MS_within,
      F: null, pValue: null, etaSquared: null, partialEtaSquared: null,
      effectSize: null, significant: null,
    },
    {
      source: 'Total',
      SS: SS_total, df: df_total, MS: null,
      F: null, pValue: null, etaSquared: null, partialEtaSquared: null,
      effectSize: null, significant: null,
    },
  ];

  // Cell table
  const cellTable = [];
  for (const la of levelsA) {
    for (const lb of levelsB) {
      const k = `${la}\x1f${lb}`;
      const vals = cells[k] || [];
      const mean = cellMean[k];
      const sd = vals.length > 1
        ? Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1))
        : 0;
      cellTable.push({
        levelA: la, levelB: lb, n: vals.length,
        mean: Number(mean.toFixed(4)), sd: Number(sd.toFixed(4)),
      });
    }
  }

  const marginalA = levelsA.map(la => ({
    level: la, n: nA[la], mean: Number(meanA[la].toFixed(4)),
  }));
  const marginalB = levelsB.map(lb => ({
    level: lb, n: nB[lb], mean: Number(meanB[lb].toFixed(4)),
  }));

  const cellSizes = Object.values(cellN);
  const isBalanced = new Set(cellSizes).size === 1;

  return {
    error: null,
    test: 'Two-Way ANOVA',
    nameA, nameB,
    N, alpha, isBalanced,
    cellSizesRange: { min: Math.min(...cellSizes), max: Math.max(...cellSizes) },
    levelsA, levelsB,
    grandMean: Number(grandMean.toFixed(4)),
    factorA: anovaTable[0],
    factorB: anovaTable[1],
    interaction: anovaTable[2],
    residual: anovaTable[3],
    total: anovaTable[4],
    anovaTable,
    cellTable, marginalA, marginalB,
    significantA: p_A < alpha,
    significantB: p_B < alpha,
    significantInteraction: p_AB < alpha,
    notes: 'Cell-means approach. Balanced: F-test exact. Unbalanced: approximates Type III.',
  };
}

// ── Repeated Measures ANOVA ────────────────────────────────────────

/**
 * Compute eigenvalues of a symmetric k×k matrix using power iteration
 * with deflation. Suitable for small k (≤ 10).
 */
function eigenvaluesSymmetric(M) {
  const k = M.length;
  const vals = [];
  let B = M.map(row => [...row]);

  for (let r = 0; r < k; r++) {
    let v = Array.from({ length: k }, (_, i) => i === 0 ? 1 : 0);
    for (let iter = 0; iter < 200; iter++) {
      const w = Array(k).fill(0);
      for (let i = 0; i < k; i++) {
        for (let j = 0; j < k; j++) {
          w[i] += B[i][j] * v[j];
        }
      }
      const norm = Math.sqrt(w.reduce((s, x) => s + x * x, 0));
      if (norm < 1e-15) break;
      const newV = w.map(x => x / norm);
      // Check convergence
      const dot = v.reduce((s, vi, i) => s + vi * newV[i], 0);
      v = newV;
      if (Math.abs(dot) > 0.999999) break;
    }
    // Rayleigh quotient
    const Bv = Array(k).fill(0);
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) Bv[i] += B[i][j] * v[j];
    }
    const lambda = v.reduce((s, vi, i) => s + vi * Bv[i], 0);
    vals.push(lambda);
    // Deflate
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) B[i][j] -= lambda * v[i] * v[j];
    }
  }
  return vals;
}

/**
 * Repeated Measures ANOVA (within-subjects).
 * SPSS-compatible: SS decomposition, Greenhouse-Geisser correction,
 * paired t-tests with Bonferroni post-hoc.
 *
 * @param {number[][]} data - [subjects × conditions] 2D array
 * @param {string[]} [conditionNames] - optional labels
 * @param {number} [alpha=0.05]
 * @returns {Object}
 */
export function repeatedMeasuresANOVA(data, conditionNames = null, alpha = 0.05) {
  // Validate & clean
  if (!Array.isArray(data) || data.length < 2) {
    return { method: 'repeated_measures_anova', error: 'Minimal 2 subjek' };
  }
  const k = data[0]?.length;
  if (!k || k < 2) {
    return { method: 'repeated_measures_anova', error: 'Minimal 2 kondisi' };
  }

  // Verify equal row lengths
  for (let i = 0; i < data.length; i++) {
    if (!Array.isArray(data[i]) || data[i].length !== k) {
      return { method: 'repeated_measures_anova', error: `Baris ${i}: panjang kolom tidak konsisten` };
    }
  }

  // Listwise deletion: keep only complete rows
  const complete = [];
  for (const row of data) {
    if (row.every(v => typeof v === 'number' && isFinite(v) && !isNaN(v))) {
      complete.push([...row]);
    }
  }
  const n = complete.length;
  if (n < 3) {
    return { method: 'repeated_measures_anova', error: `Hanya ${n} subjek lengkap — butuh minimal 3` };
  }

  const names = conditionNames || Array.from({ length: k }, (_, i) => `Kondisi ${i + 1}`);

  // ── Descriptives per condition ───────────────────────────────
  const conditionMeans = Array(k).fill(0);
  const conditionSDs = Array(k).fill(0);
  for (let j = 0; j < k; j++) {
    let sum = 0, sumSq = 0;
    for (let i = 0; i < n; i++) {
      sum += complete[i][j];
      sumSq += complete[i][j] ** 2;
    }
    conditionMeans[j] = sum / n;
    conditionSDs[j] = n > 1 ? Math.sqrt((sumSq - sum * sum / n) / (n - 1)) : 0;
  }

  // Subject means
  const subjectMeans = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    subjectMeans[i] = complete[i].reduce((a, b) => a + b, 0) / k;
  }

  // Grand mean
  const grandMean = conditionMeans.reduce((a, b) => a + b, 0) / k;

  // ── Sum of Squares ──────────────────────────────────────────
  // SS_total (deviation of each score from grand mean)
  let ssTotal = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      ssTotal += (complete[i][j] - grandMean) ** 2;
    }
  }

  // SS_between_subjects (individual differences)
  let ssSubjects = 0;
  for (let i = 0; i < n; i++) {
    ssSubjects += k * (subjectMeans[i] - grandMean) ** 2;
  }

  // SS_within_subjects = SS_total - SS_subjects
  const ssWithinSubjects = ssTotal - ssSubjects;

  // SS_conditions (effect of condition)
  let ssConditions = 0;
  for (let j = 0; j < k; j++) {
    ssConditions += n * (conditionMeans[j] - grandMean) ** 2;
  }

  // SS_error = SS_within - SS_conditions
  const ssError = ssWithinSubjects - ssConditions;

  // ── Degrees of Freedom ──────────────────────────────────────
  const dfConditions = k - 1;
  const dfError = (n - 1) * (k - 1);
  const dfSubjects = n - 1;
  const dfWithinSubjects = n * (k - 1); // or dfConditions + dfError
  const dfTotal = n * k - 1;

  // ── Mean Squares ────────────────────────────────────────────
  const msConditions = dfConditions > 0 ? ssConditions / dfConditions : 0;
  const msError = dfError > 0 ? ssError / dfError : 0;

  // ── F-test ──────────────────────────────────────────────────
  const fStatistic = msError > 0 ? msConditions / msError : 0;
  let pValue = 1;
  if (dfConditions > 0 && dfError > 0 && isFinite(fStatistic) && fStatistic >= 0) {
    pValue = fPValue(fStatistic, dfConditions, dfError);
    pValue = Math.max(0, Math.min(1, pValue));
  }

  // ── Effect Size: Partial Eta Squared ────────────────────────
  const partialEtaSquared = (ssConditions + ssError) > 0
    ? ssConditions / (ssConditions + ssError)
    : 0;

  // ── Sphericity: Greenhouse-Geisser epsilon ──────────────────
  // Compute k×k covariance matrix of conditions
  const cov = Array.from({ length: k }, () => Array(k).fill(0));
  for (let c1 = 0; c1 < k; c1++) {
    for (let c2 = 0; c2 < k; c2++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += (complete[i][c1] - conditionMeans[c1]) * (complete[i][c2] - conditionMeans[c2]);
      }
      cov[c1][c2] = sum / (n - 1);
    }
  }

  const eigenvals = eigenvaluesSymmetric(cov);
  const sumEig = eigenvals.reduce((s, v) => s + Math.max(0, v), 0);
  const sumSqEig = eigenvals.reduce((s, v) => s + Math.max(0, v) ** 2, 0);
  const ggEpsilon = sumSqEig > 0
    ? Math.min(1, sumEig ** 2 / ((k - 1) * sumSqEig))
    : 1;
  const ggEpsilonLowerBound = k > 1 ? 1 / (k - 1) : 1;
  const ggEpsilonClamped = Math.max(ggEpsilonLowerBound, Math.min(1, ggEpsilon));
  const sphericityAssumed = ggEpsilonClamped >= 0.75;

  // Apply GG correction to p-value if sphericity violated
  let pValueGG = pValue;
  let dfConditionsGG = dfConditions;
  let dfErrorGG = dfError;
  if (!sphericityAssumed) {
    dfConditionsGG = Math.max(1, ggEpsilonClamped * dfConditions);
    dfErrorGG = Math.max(1, ggEpsilonClamped * dfError);
    if (dfConditionsGG > 0 && dfErrorGG > 0 && isFinite(fStatistic) && fStatistic >= 0) {
      pValueGG = fPValue(fStatistic, dfConditionsGG, dfErrorGG);
      pValueGG = Math.max(0, Math.min(1, pValueGG));
    }
  }

  // ── Post-hoc: paired t-tests with Bonferroni ────────────────
  const m = k * (k - 1) / 2; // number of pairwise comparisons
  const postHoc = [];
  for (let j1 = 0; j1 < k; j1++) {
    for (let j2 = j1 + 1; j2 < k; j2++) {
      const diffs = complete.map(row => row[j1] - row[j2]);
      const meanDiff = diffs.reduce((s, d) => s + d, 0) / n;
      const sdDiff = n > 1
        ? Math.sqrt(diffs.reduce((s, d) => s + (d - meanDiff) ** 2, 0) / (n - 1))
        : 0;
      const seDiff = sdDiff / Math.sqrt(n);
      const t = seDiff > 0 ? meanDiff / seDiff : 0;
      const df = n - 1;
      const pRaw = tPValue(Math.abs(t), df);
      const pAdj = Math.min(pRaw * m, 1);
      postHoc.push({
        group1: names[j1],
        group2: names[j2],
        meanDiff: Number(meanDiff.toFixed(4)),
        t: Number(t.toFixed(4)),
        df,
        pRaw: Number(pRaw.toFixed(6)),
        pAdj: Number(pAdj.toFixed(6)),
        significant: pAdj < alpha,
      });
    }
  }

  // ── Groups (descriptive per condition) ──────────────────────
  const groups = names.map((name, j) => ({
    name,
    mean: Number(conditionMeans[j].toFixed(4)),
    sd: Number(conditionSDs[j].toFixed(4)),
    n,
  }));

  // ── Conclusion ──────────────────────────────────────────────
  const usedP = !sphericityAssumed ? pValueGG : pValue;
  const sig = usedP < alpha;
  const conclusion = sig
    ? `Terdapat perbedaan signifikan antar kondisi (F(${dfConditions},${dfError}) = ${fStatistic.toFixed(3)}, p = ${usedP.toFixed(4)}, η²p = ${partialEtaSquared.toFixed(4)}). ${sphericityAssumed ? 'Asumsi sphericity terpenuhi.' : `Asumsi sphericity tidak terpenuhi (ε = ${ggEpsilonClamped.toFixed(4)}), digunakan koreksi Greenhouse-Geisser.`}`
    : `Tidak terdapat perbedaan signifikan antar kondisi (F(${dfConditions},${dfError}) = ${fStatistic.toFixed(3)}, p = ${usedP.toFixed(4)}).`;

  return {
    method: 'repeated_measures_anova',
    n,
    k,
    fStatistic: Number(fStatistic.toFixed(4)),
    df1: dfConditions,
    df2: dfError,
    pValue: Number(pValue.toFixed(6)),
    pValueGG: Number(pValueGG.toFixed(6)),
    partialEtaSquared: Number(partialEtaSquared.toFixed(4)),
    sphericityAssumed,
    greenhouseGeisserEpsilon: Number(ggEpsilonClamped.toFixed(4)),
    ggLowerBound: Number(ggEpsilonLowerBound.toFixed(4)),
    ssConditions: Number(ssConditions.toFixed(4)),
    ssError: Number(ssError.toFixed(4)),
    ssSubjects: Number(ssSubjects.toFixed(4)),
    ssTotal: Number(ssTotal.toFixed(4)),
    msConditions: Number(msConditions.toFixed(4)),
    msError: Number(msError.toFixed(4)),
    groups,
    conditionNames: names,
    postHoc,
    significant: sig,
    alpha,
    missing: data.length - n,
    conclusion,
    notes: 'Repeated measures one-way ANOVA. GG epsilon via power iteration. Post-hoc: paired t-tests dengan koreksi Bonferroni.',
  };
}

/**
 * One-way ANOVA — SPSS-compatible.
 * Listwise deletion, F-test, eta-squared effect size.
 */

import { groupBy } from './data.js';
import { fCDF, fPValue } from './distributions.js';

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

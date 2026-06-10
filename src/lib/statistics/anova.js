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

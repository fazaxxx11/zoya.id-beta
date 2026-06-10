/**
 * Data cleaning and preparation utilities.
 * SPSS-compatible: null/undefined/NaN excluded listwise by default.
 */

/**
 * Extract numeric values, excluding null/undefined/NaN/Infinity.
 * @param {Array} arr
 * @returns {number[]}
 */
export function cleanNumeric(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(v =>
    typeof v === 'number' && isFinite(v) && !isNaN(v)
  );
}

/**
 * Pair two arrays listwise — remove rows where either value is missing.
 * @param {Array} x
 * @param {Array} y
 * @returns {{ x: number[], y: number[], nOriginal: number, nClean: number, excluded: number }}
 */
export function listwisePair(x, y) {
  const nOriginal = x.length;
  const paired = [];
  for (let i = 0; i < x.length; i++) {
    if (
      typeof x[i] === 'number' && isFinite(x[i]) && !isNaN(x[i]) &&
      typeof y[i] === 'number' && isFinite(y[i]) && !isNaN(y[i])
    ) {
      paired.push([x[i], y[i]]);
    }
  }
  return {
    x: paired.map(p => p[0]),
    y: paired.map(p => p[1]),
    nOriginal,
    nClean: paired.length,
    excluded: nOriginal - paired.length,
  };
}

/**
 * Group values by a grouping variable (listwise deletion for group).
 * @param {Array} values
 * @param {Array} groups
 * @returns {{ groupMap: Map<string, number[]>, groups: string[] }}
 */
export function groupBy(values, groups) {
  const map = new Map();
  for (let i = 0; i < values.length; i++) {
    const g = String(groups[i]);
    const v = values[i];
    if (typeof v === 'number' && isFinite(v) && !isNaN(v)) {
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(v);
    }
  }
  return { groupMap: map, groups: [...map.keys()] };
}

/**
 * Parse CSV string to array of objects.
 * @param {string} csv
 * @returns {Array<Object>}
 */
export function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => {
      const num = Number(vals[i]);
      obj[h] = isNaN(num) ? vals[i] : num;
    });
    return obj;
  });
}

/**
 * Read column from parsed CSV as numeric array.
 * @param {Array<Object>} data
 * @param {string} col
 * @returns {number[]}
 */
export function column(data, col) {
  return data.map(row => row[col]);
}

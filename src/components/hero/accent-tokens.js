// accent-tokens — map accent name → CSS token string.
// Pure module, testable di node env (no DOM).
// Dipakai PageHeader hero + sub-komponen hero untuk warna konsisten per modul.

export const ACCENT_TOKEN = {
  gold: 'rgb(var(--accent))',
  teal: 'rgb(var(--deep-teal))',
  terracotta: 'rgb(var(--warm-rose))',
};

/**
 * Ambil token CSS untuk accent name. Fallback ke gold kalau tidak dikenal.
 * @param {string} accent - 'gold' | 'teal' | 'terracotta'
 * @returns {string} rgb(var(--token)) string
 */
export function getAccentColor(accent) {
  return ACCENT_TOKEN[accent] || ACCENT_TOKEN.gold;
}

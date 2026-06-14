// Fuzzy search utility with Fuse.js.
// Threshold 0.3 = tolerates ~30% mismatch (typos, partial matches).

import Fuse from 'fuse.js'

/**
 * Create a fuzzy search index.
 * @param {Array} items — array of objects to search
 * @param {Array<string>} keys — object keys to search in (e.g. ['name', 'description'])
 * @param {Object} [options] — Fuse.js options override
 * @returns {Fuse} Fuse instance
 */
export function createFuzzySearch(items, keys, options = {}) {
  return new Fuse(items, {
    keys,
    threshold: options.threshold ?? 0.3,
    includeScore: true,
    ignoreLocation: true, // search anywhere in string
    ...options
  })
}

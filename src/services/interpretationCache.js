/**
 * Interpretation Cache Service
 * Manages localStorage caching for AI interpretations to reduce API calls
 * and provide instant results for repeated requests
 */

const CACHE_PREFIX = 'azezmen_ai_interpretation_';
const CACHE_VERSION = 'v1';
const MAX_CACHE_SIZE = 100; // Maximum number of cached interpretations
const CACHE_EXPIRY_DAYS = 7; // Cache entries expire after 7 days

/**
 * Generate a unique cache key from test parameters
 * @param {string} testType - Type of statistical test
 * @param {Object} results - Statistical test results
 * @param {string} style - Interpretation style
 * @returns {string} - Cache key
 */
function generateCacheKey(testType, results, style) {
  // Create a stable string representation of the results
  const resultsString = JSON.stringify(results, Object.keys(results).sort());
  
  // Simple hash function for shorter keys
  const hash = Array.from(resultsString)
    .reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0)
    .toString(36);
  
  return `${CACHE_PREFIX}${CACHE_VERSION}_${testType}_${style}_${hash}`;
}

/**
 * Get cached interpretation
 * @param {string} testType - Type of statistical test
 * @param {Object} results - Statistical test results
 * @param {string} style - Interpretation style
 * @returns {Object|null} - Cached data or null if not found/expired
 */
export function getCachedInterpretation(testType, results, style) {
  try {
    const key = generateCacheKey(testType, results, style);
    const cached = localStorage.getItem(key);
    
    if (!cached) {
      return null;
    }

    const data = JSON.parse(cached);
    
    // Check if cache has expired
    const now = Date.now();
    const expiryTime = data.timestamp + (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    
    if (now > expiryTime) {
      // Cache expired, remove it
      localStorage.removeItem(key);
      return null;
    }

    // Update access time for LRU management
    data.lastAccessed = now;
    localStorage.setItem(key, JSON.stringify(data));
    
    return {
      text: data.text,
      testType: data.testType,
      style: data.style,
      cached: true,
      timestamp: data.timestamp,
    };
  } catch (error) {
    console.error('Cache retrieval error:', error);
    return null;
  }
}

/**
 * Save interpretation to cache
 * @param {string} testType - Type of statistical test
 * @param {Object} results - Statistical test results
 * @param {string} style - Interpretation style
 * @param {string} text - Interpretation text to cache
 * @returns {boolean} - Success status
 */
export function cacheInterpretation(testType, results, style, text) {
  try {
    const key = generateCacheKey(testType, results, style);
    const now = Date.now();
    
    const cacheEntry = {
      text,
      testType,
      style,
      timestamp: now,
      lastAccessed: now,
      version: CACHE_VERSION,
    };

    localStorage.setItem(key, JSON.stringify(cacheEntry));
    
    // Check cache size and clean up if necessary
    cleanupCache();
    
    return true;
  } catch (error) {
    console.error('Cache storage error:', error);
    
    // If localStorage is full, try to make space
    if (error.name === 'QuotaExceededError') {
      cleanupCache(true);
      
      // Try again after cleanup
      try {
        const key = generateCacheKey(testType, results, style);
        const cacheEntry = {
          text,
          testType,
          style,
          timestamp: Date.now(),
          lastAccessed: Date.now(),
          version: CACHE_VERSION,
        };
        localStorage.setItem(key, JSON.stringify(cacheEntry));
        return true;
      } catch (retryError) {
        console.error('Cache storage retry failed:', retryError);
        return false;
      }
    }
    
    return false;
  }
}

/**
 * Clean up old or excess cache entries
 * @param {boolean} aggressive - If true, remove more entries
 */
function cleanupCache(aggressive = false) {
  try {
    // Get all cache keys
    const cacheKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        cacheKeys.push(key);
      }
    }

    // If under limit and not aggressive, no cleanup needed
    if (!aggressive && cacheKeys.length <= MAX_CACHE_SIZE) {
      return;
    }

    // Get cache entries with metadata
    const cacheEntries = cacheKeys.map(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        return {
          key,
          lastAccessed: data.lastAccessed || 0,
          timestamp: data.timestamp || 0,
        };
      } catch {
        return { key, lastAccessed: 0, timestamp: 0 };
      }
    });

    // Sort by last accessed time (oldest first)
    cacheEntries.sort((a, b) => a.lastAccessed - b.lastAccessed);

    // Determine how many to remove
    const removeCount = aggressive 
      ? Math.floor(cacheEntries.length * 0.3) // Remove 30% if aggressive
      : Math.max(0, cacheEntries.length - MAX_CACHE_SIZE); // Remove excess

    // Remove oldest entries
    for (let i = 0; i < removeCount; i++) {
      localStorage.removeItem(cacheEntries[i].key);
    }

    console.log(`Cache cleanup: removed ${removeCount} entries`);
  } catch (error) {
    console.error('Cache cleanup error:', error);
  }
}

/**
 * Clear all interpretation cache
 * @returns {number} - Number of entries cleared
 */
export function clearCache() {
  try {
    let count = 0;
    const keysToRemove = [];
    
    // Collect all cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    // Remove all cache entries
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      count++;
    });

    console.log(`Cache cleared: ${count} entries removed`);
    return count;
  } catch (error) {
    console.error('Cache clear error:', error);
    return 0;
  }
}

/**
 * Get cache statistics
 * @returns {Object} - Cache statistics
 */
export function getCacheStats() {
  try {
    const cacheKeys = [];
    let totalSize = 0;
    const now = Date.now();
    const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        const value = localStorage.getItem(key) || '';
        totalSize += key.length + value.length;
        
        try {
          const data = JSON.parse(value);
          const isExpired = (now - data.timestamp) > expiryTime;
          cacheKeys.push({
            key,
            size: key.length + value.length,
            timestamp: data.timestamp,
            lastAccessed: data.lastAccessed,
            testType: data.testType,
            style: data.style,
            expired: isExpired,
          });
        } catch {
          // Invalid cache entry
        }
      }
    }

    const expiredCount = cacheKeys.filter(entry => entry.expired).length;

    return {
      totalEntries: cacheKeys.length,
      expiredEntries: expiredCount,
      activeEntries: cacheKeys.length - expiredCount,
      totalSizeBytes: totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      maxEntries: MAX_CACHE_SIZE,
      expiryDays: CACHE_EXPIRY_DAYS,
      entries: cacheKeys,
    };
  } catch (error) {
    console.error('Cache stats error:', error);
    return {
      totalEntries: 0,
      expiredEntries: 0,
      activeEntries: 0,
      totalSizeBytes: 0,
      totalSizeKB: '0.00',
      maxEntries: MAX_CACHE_SIZE,
      expiryDays: CACHE_EXPIRY_DAYS,
      entries: [],
    };
  }
}

/**
 * Remove expired cache entries
 * @returns {number} - Number of entries removed
 */
export function removeExpiredCache() {
  try {
    let count = 0;
    const now = Date.now();
    const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if ((now - data.timestamp) > expiryTime) {
            keysToRemove.push(key);
          }
        } catch {
          // Invalid entry, remove it
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      count++;
    });

    if (count > 0) {
      console.log(`Removed ${count} expired cache entries`);
    }

    return count;
  } catch (error) {
    console.error('Remove expired cache error:', error);
    return 0;
  }
}

// Auto-cleanup expired cache on module load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    removeExpiredCache();
  }, 1000);
}

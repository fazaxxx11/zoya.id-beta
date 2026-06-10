import { createHash } from 'crypto';

// Configuration
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const RATE_LIMIT_FAIL_CLOSED = process.env.RATE_LIMIT_FAIL_CLOSED === 'true';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Mode detection
const REDIS_AVAILABLE = !!(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
let MODE;
let redisAvailable = false;
let degraded = false;
let failClosed = false;

if (REDIS_AVAILABLE) {
  MODE = 'redis';
  redisAvailable = true;
} else if (IS_PRODUCTION && RATE_LIMIT_FAIL_CLOSED) {
  MODE = 'fail-closed';
  failClosed = true;
} else if (IS_PRODUCTION) {
  MODE = 'degraded-memory';
  degraded = true;
} else {
  MODE = 'memory-dev';
}

// Startup log
console.log(`Rate limiter mode: ${MODE}`);

// In-memory store with cleanup
const memoryStore = new Map();
const CLEANUP_INTERVAL = 60000; // 1 minute

/**
 * Clean up expired entries from memory store
 */
function cleanupMemoryStore() {
  const now = Date.now();
  for (const [key, entries] of memoryStore.entries()) {
    const validEntries = entries.filter(entry => entry > now);
    if (validEntries.length === 0) {
      memoryStore.delete(key);
    } else {
      memoryStore.set(key, validEntries);
    }
  }
}

// Start cleanup interval
setInterval(cleanupMemoryStore, CLEANUP_INTERVAL);

/**
 * Make Upstash Redis REST API call
 * @param {string} command - Redis command
 * @param {Array} args - Command arguments
 * @returns {Promise<any>} Redis response
 */
async function upstashRedisCommand(command, args = []) {
  try {
    const response = await fetch(`${UPSTASH_REDIS_REST_URL}/${command}/${args.join('/')}`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Redis request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('Redis command failed:', error.message);
    throw error;
  }
}

/**
 * Sliding window rate limiter
 * @param {string} key - Rate limit key
 * @param {number} maxRequests - Maximum requests allowed in window
 * @param {number} windowSec - Window size in seconds
 * @returns {Promise<{success: boolean, remaining: number, reset: number}>} Rate limit result
 */
async function slidingWindow(key, maxRequests, windowSec) {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const cutoff = now - windowMs;

  switch (MODE) {
    case 'redis': {
      try {
        // Use Redis sorted set for sliding window
        const redisKey = `rate-limit:${key}`;
        
        // Remove old entries
        await upstashRedisCommand('ZREMRANGEBYSCORE', [redisKey, 0, cutoff]);
        
        // Add current request
        await upstashRedisCommand('ZADD', [redisKey, now, now]);
        
        // Set expiry on the key
        await upstashRedisCommand('EXPIRE', [redisKey, windowSec]);
        
        // Get count of requests in window
        const count = await upstashRedisCommand('ZCOUNT', [redisKey, cutoff, now]);
        
        const remaining = Math.max(0, maxRequests - count);
        const reset = Math.ceil((now + windowMs) / 1000);
        
        return {
          success: count <= maxRequests,
          remaining,
          reset,
        };
      } catch (error) {
        // Fallback to degraded mode if Redis fails
        console.warn('Redis failed, falling back to degraded memory mode');
        return slidingWindowMemory(key, maxRequests, windowSec);
      }
    }

    case 'degraded-memory':
    case 'memory-dev': {
      return slidingWindowMemory(key, maxRequests, windowSec);
    }

    case 'fail-closed': {
      // When in fail-closed mode and Redis is unavailable, reject all requests
      return {
        success: false,
        remaining: 0,
        reset: Math.ceil((now + windowMs) / 1000),
      };
    }

    default: {
      throw new Error(`Unknown rate limiter mode: ${MODE}`);
    }
  }
}

/**
 * In-memory sliding window implementation
 * @param {string} key - Rate limit key
 * @param {number} maxRequests - Maximum requests allowed in window
 * @param {number} windowSec - Window size in seconds
 * @returns {Promise<{success: boolean, remaining: number, reset: number}>} Rate limit result
 */
function slidingWindowMemory(key, maxRequests, windowSec) {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const cutoff = now - windowMs;

  // Get or create entries for this key
  let entries = memoryStore.get(key) || [];
  
  // Filter out old entries
  entries = entries.filter(timestamp => timestamp > cutoff);
  
  // Check if request is allowed
  const count = entries.length;
  const allowed = count < maxRequests;
  
  if (allowed) {
    // Add current request timestamp
    entries.push(now);
    memoryStore.set(key, entries);
  }

  const remaining = Math.max(0, maxRequests - count - (allowed ? 0 : 1));
  const reset = Math.ceil((now + windowMs) / 1000);

  return {
    success: allowed,
    remaining,
    reset,
  };
}

/**
 * Generate rate limit headers from result
 * @param {Object} result - Rate limit result from slidingWindow
 * @returns {Object} Headers object
 */
function getRateLimitHeaders(result) {
  return {
    'X-RateLimit-Limit': result.remaining + (result.success ? 1 : 0),
    'X-RateLimit-Remaining': result.remaining,
    'X-RateLimit-Reset': result.reset,
  };
}

/**
 * Get current rate limiter status
 * @returns {Object} Status information
 */
function getRateLimiterStatus() {
  return {
    mode: MODE,
    redisAvailable,
    isProduction: IS_PRODUCTION,
    degraded,
    failClosed,
  };
}

export {
  slidingWindow,
  getRateLimitHeaders,
  getRateLimiterStatus,
};
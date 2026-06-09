// api/_lib/rate-limit.js
// Rate limiter: Upstash Redis (production) + in-memory fallback (dev only)
// Production WITHOUT Redis = FAIL CLOSED (all requests rejected)

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ── Detect Redis availability ─────────────────────────────────────
const REDIS_AVAILABLE = Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);

// ── Startup log (no secrets!) ─────────────────────────────────────
if (IS_PRODUCTION && !REDIS_AVAILABLE) {
  console.error('[rate-limit] ⚠️  PRODUCTION MODE without Upstash Redis — all requests will be rejected (fail closed)');
} else if (REDIS_AVAILABLE) {
  console.log('[rate-limit] mode: redis (Upstash)');
} else {
  console.log('[rate-limit] mode: in-memory (development only)');
}

// ── In-memory store (dev only) ────────────────────────────────────
const inMemoryStore = new Map();
const FALLBACK_WINDOW_SEC = 60;

// ── Redis command wrapper ─────────────────────────────────────────
async function redisCommand(command) {
  if (!REDIS_AVAILABLE) return null;

  try {
    const response = await fetch(UPSTASH_REDIS_REST_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      throw new Error(`Redis request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('[rate-limit] Redis error:', error.message);
    return null;
  }
}

// ── Sliding window rate limiter ───────────────────────────────────
export async function slidingWindow(key, maxRequests, windowSec) {
  const redisKey = `rl:${key}`;
  const now = Math.floor(Date.now() / 1000);

  // ── Redis path ──
  if (REDIS_AVAILABLE) {
    const redisResult = await redisCommand(['INCR', redisKey]);

    if (redisResult !== null) {
      if (redisResult === 1) {
        await redisCommand(['EXPIRE', redisKey, windowSec]);
      }

      const ttl = await redisCommand(['TTL', redisKey]);
      const remaining = Math.max(0, maxRequests - redisResult);
      const reset = now + (ttl || windowSec);

      return {
        success: redisResult <= maxRequests,
        limit: maxRequests,
        remaining,
        reset,
      };
    }

    // Redis failed mid-request — fail closed
    console.error('[rate-limit] Redis command failed — rejecting request (fail closed)');
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: now + windowSec,
    };
  }

  // ── No Redis in production → FAIL CLOSED ──
  if (IS_PRODUCTION) {
    console.error('[rate-limit] No Redis configured in production — rejecting request');
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: now + windowSec,
    };
  }

  // ── In-memory fallback (development ONLY) ──
  const windowStart = now - windowSec;
  const storeKey = `mem:${redisKey}`;

  if (!inMemoryStore.has(storeKey)) {
    inMemoryStore.set(storeKey, []);
  }

  const timestamps = inMemoryStore.get(storeKey);
  const validTimestamps = timestamps.filter(ts => ts > windowStart);
  validTimestamps.push(now);

  while (validTimestamps.length > maxRequests * 2) {
    validTimestamps.shift();
  }

  inMemoryStore.set(storeKey, validTimestamps);

  // Periodic cleanup
  if (Math.random() < 0.01) {
    for (const [k, ts] of inMemoryStore.entries()) {
      if (ts.length === 0 || ts[ts.length - 1] < windowStart) {
        inMemoryStore.delete(k);
      }
    }
  }

  const requestCount = validTimestamps.length;
  const remaining = Math.max(0, maxRequests - requestCount);
  const reset = now + FALLBACK_WINDOW_SEC;

  return {
    success: requestCount <= maxRequests,
    limit: maxRequests,
    remaining,
    reset,
  };
}

// ── Rate limit headers ────────────────────────────────────────────
export function getRateLimitHeaders(rateLimitResult) {
  return {
    'X-RateLimit-Limit': rateLimitResult.limit,
    'X-RateLimit-Remaining': rateLimitResult.remaining,
    'X-RateLimit-Reset': rateLimitResult.reset,
  };
}

// ── Health check (for monitoring) ─────────────────────────────────
export function getRateLimiterStatus() {
  return {
    mode: REDIS_AVAILABLE ? 'redis' : (IS_PRODUCTION ? 'fail-closed' : 'in-memory'),
    redisAvailable: REDIS_AVAILABLE,
    isProduction: IS_PRODUCTION,
  };
}

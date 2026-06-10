// api/_lib/rate-limit.js
// Rate limiter: Upstash Redis (production) + graceful degraded in-memory fallback
// Modes: redis | degraded-memory | fail-closed | memory-dev
// Env: RATE_LIMIT_FAIL_CLOSED=true → strict mode (reject when no Redis)

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const FAIL_CLOSED = process.env.RATE_LIMIT_FAIL_CLOSED === 'true';

// ── Detect Redis availability ─────────────────────────────────────
const REDIS_AVAILABLE = Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);

// ── Determine mode (computed once at import) ──────────────────────
function computeMode() {
  if (REDIS_AVAILABLE) return 'redis';
  if (IS_PRODUCTION && FAIL_CLOSED) return 'fail-closed';
  if (IS_PRODUCTION) return 'degraded-memory';
  return 'memory-dev';
}

const MODE = computeMode();

// ── Startup log (no secrets!) ─────────────────────────────────────
if (MODE === 'fail-closed') {
  console.error('[rate-limit] ⚠️  PRODUCTION MODE without Upstash Redis + FAIL_CLOSED=true — all requests rejected');
} else if (MODE === 'degraded-memory') {
  console.warn('[rate-limit] ⚠️  PRODUCTION without Upstash Redis — using degraded in-memory fallback (per-instance only)');
} else if (MODE === 'redis') {
  console.log('[rate-limit] mode: redis (Upstash)');
} else {
  console.log('[rate-limit] mode: memory-dev');
}

// ── In-memory store (for degraded-memory + memory-dev) ────────────
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

// ── In-memory sliding window (shared by degraded-memory + memory-dev) ──
function inMemorySlidingWindow(key, maxRequests, windowSec) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSec;
  const storeKey = `mem:${key}`;

  if (!inMemoryStore.has(storeKey)) {
    inMemoryStore.set(storeKey, []);
  }

  const timestamps = inMemoryStore.get(storeKey);
  const validTimestamps = timestamps.filter(ts => ts > windowStart);
  validTimestamps.push(now);

  // Trim to avoid memory bloat
  while (validTimestamps.length > maxRequests * 2) {
    validTimestamps.shift();
  }

  inMemoryStore.set(storeKey, validTimestamps);

  // Periodic cleanup (1% chance per request)
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

// ── Sliding window rate limiter ───────────────────────────────────
export async function slidingWindow(key, maxRequests, windowSec) {
  const now = Math.floor(Date.now() / 1000);

  // ── Redis path ──
  if (MODE === 'redis') {
    const redisKey = `rl:${key}`;
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

    // Redis failed mid-request — fall through to degraded mode
    console.warn('[rate-limit] Redis command failed mid-request — degrading to in-memory');
  }

  // ── Fail-closed mode (production strict) ──
  if (MODE === 'fail-closed') {
    console.error('[rate-limit] No Redis configured + FAIL_CLOSED — rejecting request');
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: now + windowSec,
    };
  }

  // ── In-memory fallback (degraded-memory + memory-dev) ──
  return inMemorySlidingWindow(key, maxRequests, windowSec);
}

// ── Rate limit headers ────────────────────────────────────────────
export function getRateLimitHeaders(rateLimitResult) {
  return {
    'X-RateLimit-Limit': rateLimitResult.limit,
    'X-RateLimit-Remaining': rateLimitResult.remaining,
    'X-RateLimit-Reset': rateLimitResult.reset,
  };
}

// ── Health check (for monitoring) — no secrets exposed ────────────
export function getRateLimiterStatus() {
  return {
    mode: MODE,
    redisAvailable: REDIS_AVAILABLE,
    isProduction: IS_PRODUCTION,
    degraded: MODE === 'degraded-memory',
    failClosed: MODE === 'fail-closed',
  };
}

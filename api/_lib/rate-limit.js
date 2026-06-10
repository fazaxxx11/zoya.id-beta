// api/_lib/rate-limit.js
// Rate limiter: Upstash Redis (production) + graceful degraded in-memory fallback
// Modes: redis | degraded-memory | memory-dev | fail-closed
// Env: RATE_LIMIT_FAIL_CLOSED=true → strict mode (reject when no Redis)

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const FAIL_CLOSED = process.env.RATE_LIMIT_FAIL_CLOSED === 'true';

// ── Mode detection ────────────────────────────────────────────────
const REDIS_AVAILABLE = Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);

let MODE;
if (REDIS_AVAILABLE) {
  MODE = 'redis';
} else if (IS_PRODUCTION && FAIL_CLOSED) {
  MODE = 'fail-closed';
} else if (IS_PRODUCTION) {
  MODE = 'degraded-memory';
} else {
  MODE = 'memory-dev';
}

console.log(`Rate limiter mode: ${MODE}`);

// ── In-memory store ───────────────────────────────────────────────
const memoryStore = new Map();

// ── Redis command via raw fetch (no @upstash/redis dep) ──────────
async function redisCommand(command, ...args) {
  try {
    const body = JSON.stringify([command, ...args]);
    const response = await fetch(UPSTASH_REDIS_REST_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body,
    });
    if (!response.ok) {
      throw new Error(`Redis HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('[rate-limit] Redis error:', error.message);
    return null;
  }
}

// ── Degraded limit: floor(maxRequests * 0.5), min 1 ──────────────
function getDegradedLimit(maxRequests) {
  return Math.max(Math.floor(maxRequests * 0.5), 1);
}

// ── In-memory sliding window ─────────────────────────────────────
function memorySlidingWindow(key, maxRequests, windowSec, degraded) {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const cutoff = now - windowMs;
  const limit = degraded ? getDegradedLimit(maxRequests) : maxRequests;

  let entry = memoryStore.get(key);
  if (!entry) {
    entry = [];
    memoryStore.set(key, entry);
  }

  // Filter old timestamps
  const valid = entry.filter(ts => ts > cutoff);
  const count = valid.length;
  const success = count < limit;

  if (success) {
    valid.push(now);
  }

  memoryStore.set(key, valid);

  // Periodic cleanup (2% chance)
  if (Math.random() < 0.02) {
    for (const [k, ts] of memoryStore.entries()) {
      if (ts.length === 0 || ts[ts.length - 1] < cutoff) {
        memoryStore.delete(k);
      }
    }
  }

  return {
    success,
    limit,
    remaining: Math.max(0, limit - count),
    reset: Math.ceil((now + windowMs) / 1000),
  };
}

// ── Main sliding window ───────────────────────────────────────────
export async function slidingWindow(key, maxRequests, windowSec) {
  const now = Math.floor(Date.now() / 1000);

  // ── Redis path ──
  if (MODE === 'redis') {
    const redisKey = `rl:${key}`;
    const incrResult = await redisCommand('INCR', redisKey);

    if (incrResult !== null) {
      if (incrResult === 1) {
        await redisCommand('EXPIRE', redisKey, windowSec);
      }
      const ttl = await redisCommand('TTL', redisKey);
      const remaining = Math.max(0, maxRequests - incrResult);
      return {
        success: incrResult <= maxRequests,
        limit: maxRequests,
        remaining,
        reset: now + (ttl || windowSec),
      };
    }

    // Redis command failed → degrade, don't 429
    console.warn('[rate-limit] Redis failed mid-request → degrading to memory');
    MODE = 'degraded-memory';
  }

  // ── Fail-closed ──
  if (MODE === 'fail-closed') {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: now + windowSec,
    };
  }

  // ── In-memory (degraded or dev) ──
  const degraded = MODE === 'degraded-memory';
  return memorySlidingWindow(key, maxRequests, windowSec, degraded);
}

// ── Rate limit headers ────────────────────────────────────────────
export function getRateLimitHeaders(result) {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  };
}

// ── Health check (no secrets) ─────────────────────────────────────
export function getRateLimiterStatus() {
  return {
    mode: MODE,
    redisAvailable: REDIS_AVAILABLE,
    isProduction: IS_PRODUCTION,
    degraded: MODE === 'degraded-memory',
  };
}

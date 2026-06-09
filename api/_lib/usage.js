// api/_lib/usage.js
// Usage logging — tracks requests, errors, rate limits
// Logs to console (structured JSON) for Vercel function logs
// Can be extended to write to Supabase/Upstash for dashboard

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ── Log request ───────────────────────────────────────────────────
export function logRequest({ endpoint, userId, ip, status, durationMs, error }) {
  const entry = {
    ts: new Date().toISOString(),
    type: 'request',
    endpoint,
    userId: userId || 'anon',
    ip: maskIp(ip),
    status,
    durationMs,
    ...(error && { error: String(error).substring(0, 200) }),
  };

  if (IS_PRODUCTION) {
    console.log(JSON.stringify(entry));
  } else {
    console.log(`[usage] ${endpoint} ${status} ${durationMs}ms ${userId || 'anon'}`);
  }
}

// ── Log rate limit hit ────────────────────────────────────────────
export function logRateLimit({ endpoint, userId, ip, limit, window }) {
  const entry = {
    ts: new Date().toISOString(),
    type: 'rate_limit',
    endpoint,
    userId: userId || 'anon',
    ip: maskIp(ip),
    limit,
    window,
  };

  if (IS_PRODUCTION) {
    console.log(JSON.stringify(entry));
  } else {
    console.log(`[rate-limit] ${endpoint} blocked for ${userId || ip}`);
  }
}

// ── Log error ─────────────────────────────────────────────────────
export function logError({ endpoint, userId, error, context }) {
  const entry = {
    ts: new Date().toISOString(),
    type: 'error',
    endpoint,
    userId: userId || 'anon',
    error: String(error).substring(0, 500),
    context,
  };

  if (IS_PRODUCTION) {
    console.error(JSON.stringify(entry));
  } else {
    console.error(`[error] ${endpoint}: ${error}`);
  }
}

// ── Log feature toggle ────────────────────────────────────────────
export function logFeatureToggle({ feature, enabled }) {
  const entry = {
    ts: new Date().toISOString(),
    type: 'feature_toggle',
    feature,
    enabled,
  };

  if (IS_PRODUCTION) {
    console.log(JSON.stringify(entry));
  } else {
    console.log(`[feature] ${feature} = ${enabled}`);
  }
}

// ── Mask IP for privacy ───────────────────────────────────────────
function maskIp(ip) {
  if (!ip) return 'unknown';
  // Keep first 2 octets, mask rest (e.g., 192.168.x.x)
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.x.x`;
  }
  return ip.substring(0, 6) + '***';
}

// ── Usage summary (for health endpoint) ───────────────────────────
let _counts = { requests: 0, errors: 0, rateLimits: 0 };

export function getUsageSummary() {
  return { ..._counts };
}

// Increment counters (in-memory, resets on cold start)
export function incrementCounter(type) {
  if (type === 'request') _counts.requests++;
  else if (type === 'error') _counts.errors++;
  else if (type === 'rate_limit') _counts.rateLimits++;
}

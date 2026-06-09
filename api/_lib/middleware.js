// api/_lib/middleware.js
// Shared middleware: JWT auth + dual rate limit + payload guard + AI timeout + error sanitization
// Used by all AI endpoints: /api/assess, /api/interpret-stats, /api/explain-chat, /api/generate-kuesioner

import { createClient } from '@supabase/supabase-js';
import { slidingWindow, getRateLimitHeaders } from './rate-limit.js';
import { logRequest, logRateLimit, logError, incrementCounter } from './usage.js';

// ── Supabase clients (lazy init) ──────────────────────────────────
let _supabaseAdmin = null;
let _supabasePublic = null;

function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return _supabaseAdmin;
}

function getSupabasePublic() {
  if (!_supabasePublic) {
    _supabasePublic = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return _supabasePublic;
}

// ── Config ────────────────────────────────────────────────────────
const DEFAULT_RATE_LIMITS = {
  perUser:  { maxRequests: 20, windowMs: 60_000 },   // 20 req/min per user
  perIP:    { maxRequests: 40, windowMs: 60_000 },   // 40 req/min per IP (shared across users)
};

const MAX_PAYLOAD_BYTES = 500 * 1024; // 500KB
const AI_TIMEOUT_MS = 30_000;         // 30s per provider call

// ── Extract client IP ─────────────────────────────────────────────
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

// ── JWT Authentication ────────────────────────────────────────────
// Returns { user, error } — user contains { id, email, role }
export async function verifyAuth(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, error: 'No token provided' };
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.length < 10) {
      return { user: null, error: 'Invalid token format' };
    }

    const supabase = getSupabasePublic();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return { user: null, error: 'Invalid or expired token' };
    }

    // Fetch role from profiles (service role bypasses RLS)
    const admin = getSupabaseAdmin();
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return { user: null, error: 'Profile not found' };
    }

    return {
      user: { id: user.id, email: user.email, role: profile.role },
      error: null,
    };
  } catch (err) {
    return { user: null, error: 'Authentication failed' };
  }
}

// ── Require Auth (with response) ──────────────────────────────────
// Returns user or sends 401 and returns null
export async function requireAuth(req, res) {
  const { user, error } = await verifyAuth(req);
  if (!user) {
    res.status(401).json({ error: error || 'Unauthorized' });
    return null;
  }
  return user;
}

// ── Dual Rate Limit (per-IP + per-user) ───────────────────────────
// Returns { allowed, headers } — headers to include in response
export async function checkDualRateLimit(req, endpoint, overrides = {}) {
  const ip = getClientIp(req);
  const userId = req._authUser?.id || 'anon';

  const ipConfig = { ...DEFAULT_RATE_LIMITS.perIP, ...overrides.perIP };
  const userConfig = { ...DEFAULT_RATE_LIMITS.perUser, ...overrides.perUser };

  // Check per-IP limit (shared across all users from same IP)
  const ipKey = `rl:${endpoint}:ip:${ip}`;
  const ipResult = await slidingWindow(ipKey, ipConfig.maxRequests, Math.ceil(ipConfig.windowMs / 1000));

  if (!ipResult.success) {
    return {
      allowed: false,
      status: 429,
      error: 'Terlalu banyak permintaan dari IP ini. Coba lagi nanti.',
      headers: {
        ...getRateLimitHeaders(ipResult),
        'Retry-After': Math.ceil((ipResult.reset - Date.now() / 1000)),
      },
    };
  }

  // Check per-user limit
  if (userId !== 'anon') {
    const userKey = `rl:${endpoint}:user:${userId}`;
    const userResult = await slidingWindow(userKey, userConfig.maxRequests, Math.ceil(userConfig.windowMs / 1000));

    if (!userResult.success) {
      return {
        allowed: false,
        status: 429,
        error: 'Terlalu banyak permintaan. Coba lagi dalam 1 menit.',
        headers: {
          ...getRateLimitHeaders(userResult),
          'Retry-After': Math.ceil((userResult.reset - Date.now() / 1000)),
        },
      };
    }

    // Both passed — use the lower remaining count
    return {
      allowed: true,
      headers: {
        'X-RateLimit-Limit': userConfig.maxRequests,
        'X-RateLimit-Remaining': Math.min(ipResult.remaining, userResult.remaining),
        'X-RateLimit-Reset': Math.max(ipResult.reset, userResult.reset),
      },
    };
  }

  // IP-only (unauthenticated — shouldn't happen after auth, but safe fallback)
  return {
    allowed: true,
    headers: getRateLimitHeaders(ipResult),
  };
}

// ── Payload Size Guard ────────────────────────────────────────────
export function checkPayload(req, res, maxBytes = MAX_PAYLOAD_BYTES) {
  const contentLength = parseInt(req.headers['content-length'], 10);
  if (!isNaN(contentLength) && contentLength > maxBytes) {
    res.status(413).json({ error: 'Payload terlalu besar. Maksimal 500KB.' });
    return false;
  }
  return true;
}

// ── AI Call with Timeout ──────────────────────────────────────────
// Wraps fetch with AbortController timeout. Never leaks raw error to caller.
export async function callAIWithTimeout(url, options = {}, timeoutMs = AI_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = data?.error?.message || `HTTP ${response.status}`;
      // Log internally, never expose to client
      console.error(`[AI] ${url.split('/')[2]} error: ${msg}`);
      return { ok: false, error: 'Provider returned error', status: response.status };
    }

    return { ok: true, data };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error(`[AI] ${url.split('/')[2]} timeout after ${timeoutMs}ms`);
      return { ok: false, error: 'Provider timeout' };
    }
    console.error(`[AI] ${url.split('/')[2]} fetch error: ${err.message}`);
    return { ok: false, error: 'Provider unreachable' };
  }
}

// ── Sanitize Error for Client ─────────────────────────────────────
// Strips internal details, provider names, API key hints, stack traces
export function sanitizeError(err, context = '') {
  const msg = typeof err === 'string' ? err : err?.message || 'Unknown error';

  // Patterns to strip
  const sensitivePatterns = [
    /api[_-]?key/gi,
    /Bearer\s+[A-Za-z0-9._-]{20,}/g,
    /authorization/gi,
    /internal/gi,
    /stack/gi,
    /node_modules/gi,
    /\.js:\d+:\d+/g,
    /at\s+.*\(/g,
  ];

  let sanitized = msg;
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, '[redacted]');
  }

  // Truncate
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200) + '...';
  }

  // Generic client-facing messages by context
  const genericMessages = {
    assess: 'Gagal memproses penilaian. Coba lagi.',
    interpret: 'Gagal menghasilkan interpretasi. Coba lagi.',
    explain: 'Gagal memproses pertanyaan. Coba lagi.',
    kuesioner: 'Gagal menghasilkan kuesioner. Coba lagi.',
  };

  return {
    error: genericMessages[context] || 'Terjadi kesalahan server',
    ...(process.env.NODE_ENV !== 'production' && { _debug: sanitized }),
  };
}

// ── CORS + Security Headers ───────────────────────────────────────
const CORS_ALLOWLIST = [
  'https://zoya.id',
  'https://www.zoya.id',
  'https://zoya-id-beta.vercel.app',
];
const CORS_REGEXES = [
  /^https:\/\/zoya-id-beta-[a-z0-9]+-zaaaxx11s-projects\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
];

export function applySecurity(req, res) {
  const origin = req.headers.origin;

  // CORS
  let allowed = false;
  if (!origin) {
    allowed = true; // server-to-server
  } else if (CORS_ALLOWLIST.includes(origin)) {
    allowed = true;
  } else if (CORS_REGEXES.some(r => r.test(origin))) {
    allowed = true;
  }

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else if (origin) {
    res.status(403).json({ error: 'CORS: Origin not allowed' });
    return false;
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  return true;
}

// ── Kill Switch ───────────────────────────────────────────────────
// Environment variables to disable features without redeploy:
//   AI_ENABLED=false          → all AI endpoints return 503
//   PAYMENTS_ENABLED=false    → billing check skipped (free mode)
//   REGISTRATION_ENABLED=false → signup blocked
export function isFeatureEnabled(feature) {
  const envKey = `${feature.toUpperCase()}_ENABLED`;
  const val = process.env[envKey];
  // Default: enabled (true). Only disable if explicitly set to 'false'.
  return val !== 'false';
}

export function requireFeature(feature, res) {
  if (!isFeatureEnabled(feature)) {
    res.status(503).json({
      error: `${feature} sedang dinonaktifkan sementara.`,
      feature,
      enabled: false,
    });
    return false;
  }
  return true;
}

// ── Combined Middleware ───────────────────────────────────────────
// Runs all guards in sequence. Returns user on success, null on failure (response already sent).
export async function aiMiddleware(req, res, endpoint, rateLimitOverrides = {}) {
  // 0. Kill switch: AI feature
  if (!requireFeature('AI', res)) return null;
  // 1. CORS + Security headers
  if (!applySecurity(req, res)) return null;

  // 2. Method check
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return null;
  }

  // 3. JWT Auth
  const user = await requireAuth(req, res);
  if (!user) return null;

  // Attach user for downstream use
  req._authUser = user;

  // 4. Dual rate limit (per-IP + per-user)
  const rl = await checkDualRateLimit(req, endpoint, rateLimitOverrides);
  if (!rl.allowed) {
    incrementCounter('rate_limit');
    logRateLimit({ endpoint, userId: user.id, ip: getClientIp(req), limit: rl.limit, window: '60s' });
    res.setHeader('Retry-After', rl.headers['Retry-After'] || 60);
    return res.status(rl.status).json({ error: rl.error });
  }
  // Set rate limit headers
  for (const [k, v] of Object.entries(rl.headers)) {
    res.setHeader(k, v);
  }

  // 5. Payload size check
  if (!checkPayload(req, res)) return null;

  return user;
}

// ── Export helpers ────────────────────────────────────────────────
export { getSupabaseAdmin, getSupabasePublic };

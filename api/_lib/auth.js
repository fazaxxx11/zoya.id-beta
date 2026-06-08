```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabasePublic = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

import { slidingWindow } from './rate-limit.js';
let cleanupInterval;

const cleanupRateLimits = () => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.startTime > data.windowMs) {
      rateLimitStore.delete(key);
    }
  }
};

if (!cleanupInterval) {
  cleanupInterval = setInterval(cleanupRateLimits, 5 * 60 * 1000);
  cleanupInterval.unref();
}

export const verifyAuth = async (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'No token provided' };
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabasePublic.auth.getUser(token);

    if (authError || !user) {
      return { error: 'Invalid token' };
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return { error: 'Profile not found' };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: profile.role
      },
      error: null
    };
  } catch (error) {
    return { error: 'Authentication failed' };
  }
};

export const requireAuth = async (req, res) => {
  const { user, error } = await verifyAuth(req);
  if (error) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return user;
};

export const requireAdmin = async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return null;

  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return user;
};

export const checkRateLimit = async (key, { maxRequests = 30, windowMs = 60000 } = {}) => {
  const windowSec = Math.ceil(windowMs / 1000);
  return slidingWindow(key, maxRequests, windowSec);
};

export const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
};

export const checkPayloadSize = (req, res, maxSizeBytes) => {
  const contentLength = parseInt(req.headers['content-length'], 10);
  if (contentLength > maxSizeBytes) {
    res.status(413).json({ error: 'Payload too large' });
    return false;
  }
  return true;
};

export const sanitize = (str, maxLen) => {
  if (typeof str !== 'string') return '';
  let sanitized = str.trim();
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  if (maxLen && sanitized.length > maxLen) {
    sanitized = sanitized.substring(0, maxLen);
  }
  return sanitized;
};

export { cleanupRateLimits };
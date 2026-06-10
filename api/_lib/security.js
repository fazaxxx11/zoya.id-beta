// Default CORS configuration (backward compatibility)
export const DEFAULT_CORS_ALLOWLIST = ['https://zoya.id', 'https://www.zoya.id', 'https://zoya-id-beta.vercel.app', 'https://azezmen.vercel.app'];
export const DEFAULT_CORS_REGEXES = [
  /^https:\/\/zoya-id-beta-[a-z0-9]+-zaaaxx11s-projects\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/
];

// Parse allowed origins from environment variable
export function parseAllowedOrigins() {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  const origins = [...DEFAULT_CORS_ALLOWLIST];
  
  if (envOrigins) {
    const parsedOrigins = envOrigins
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);
    
    origins.push(...parsedOrigins);
  }
  
  return [...new Set(origins)]; // Remove duplicates
}

// CORS middleware
export function corsMiddleware(req, res) {
  const origin = req.headers.origin;
  const allowedOrigins = parseAllowedOrigins();
  
  if (origin) {
    // Check exact matches
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } 
    // Check regex patterns
    else if (DEFAULT_CORS_REGEXES.some(regex => regex.test(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(200).end();
    return true;
  }
  
  return false;
}

// Security headers middleware
export function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

// Sanitize error for production
export function sanitizeError(error, isProduction) {
  if (isProduction) {
    return {
      message: 'An error occurred',
      code: error.code || 'INTERNAL_ERROR'
    };
  }
  return error;
}

// Validate request body against schema
export function validateBody(req, res, schema) {
  try {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors
      });
      return null;
    }
    return result.data;
  } catch (error) {
    res.status(400).json({
      error: 'Invalid request body'
    });
    return null;
  }
}

// Rate limiting by IP
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // 100 requests per window

export function rateLimitByIP(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, {
      count: 1,
      startTime: now
    });
    return true;
  }
  
  const entry = rateLimitStore.get(ip);
  
  if (now - entry.startTime > RATE_LIMIT_WINDOW) {
    entry.count = 1;
    entry.startTime = now;
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    res.status(429).json({
      error: 'Too many requests'
    });
    return false;
  }
  
  entry.count++;
  return true;
}

// Backward compatibility exports
export const CORS_ALLOWLIST = DEFAULT_CORS_ALLOWLIST;
export const CORS_REGEXES = DEFAULT_CORS_REGEXES;
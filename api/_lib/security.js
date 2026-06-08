export const CORS_ALLOWLIST = [
  'https://zoya.id',
  'https://www.zoya.id',
  'https://zoya-id-beta.vercel.app'
];

export const CORS_REGEXES = [
  /^https:\/\/zoya-id-beta-[a-z0-9]+-zaaaxx11s-projects\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/
];

export function corsMiddleware(req, res) {
  const origin = req.headers.origin;
  
  // Allow server-to-server requests (no origin)
  if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return;
  }
  
  // Check against allowlist
  if (CORS_ALLOWLIST.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Vary', 'Origin');
    return;
  }
  
  // Check against regex patterns
  for (const regex of CORS_REGEXES) {
    if (regex.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Vary', 'Origin');
      return;
    }
  }
  
  // Block unauthorized origins
  res.status(403).json({ error: 'CORS policy: Origin not allowed' });
}

export function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.generalcompute.com https://api.groq.com https://api.moonshot.ai https://openrouter.ai; font-src 'self' data:");
}

export function sanitizeError(error, isProduction = true) {
  if (isProduction) {
    return { error: 'Terjadi kesalahan server' }
  }
  return { error: error.message || 'Unknown error', details: error }
}

export function validateBody(req, res, schema) {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return { valid: false, error: 'Invalid request body' }
    }
    
    const result = {}
    
    for (const [key, typeDef] of Object.entries(schema)) {
      const isOptional = typeDef.endsWith('?');
      const type = isOptional ? typeDef.slice(0, -1) : typeDef;
      
      if (!(key in body)) {
        if (!isOptional) {
          return { valid: false, error: `Missing required field: ${key}` }
        }
        continue;
      }
      
      const value = body[key];
      
      switch (type) {
        case 'string':
          if (typeof value !== 'string') {
            return { valid: false, error: `Field ${key} must be a string` }
          }
          result[key] = value;
          break;
          
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            return { valid: false, error: `Field ${key} must be a number` }
          }
          result[key] = value;
          break;
          
        case 'boolean':
          if (typeof value !== 'boolean') {
            return { valid: false, error: `Field ${key} must be a boolean` }
          }
          result[key] = value;
          break;
          
        case 'object':
          if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return { valid: false, error: `Field ${key} must be an object` }
          }
          result[key] = value;
          break;
          
        case 'array':
          if (!Array.isArray(value)) {
            return { valid: false, error: `Field ${key} must be an array` }
          }
          result[key] = value;
          break;
          
        default:
          return { valid: false, error: `Unknown type for field ${key}: ${type}` }
      }
    }
    
    return { valid: true, data: result }
  } catch (error) {
    return { valid: false, error: 'Invalid request body format' }
  }
}

export function rateLimitByIP(req, res, { maxRequests = 30, windowMs = 60000 } = {}) {
  // This function should be implemented with your actual rate limiting logic
  // For now, it returns a mock implementation
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  // In a real implementation, you would check against a store (Redis, etc.)
  // and return { allowed: false, remaining: 0 } if rate limited
  
  return { allowed: true, remaining: maxRequests }
}

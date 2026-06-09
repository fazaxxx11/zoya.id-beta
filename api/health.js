// api/health.js
// Health check endpoint — returns rate limiter status + basic app health
// No auth required (monitoring endpoint)

import { getRateLimiterStatus } from './_lib/rate-limit.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rlStatus = getRateLimiterStatus();

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    rateLimiter: rlStatus,
    env: {
      nodeEnv: process.env.NODE_ENV || 'development',
      supabaseConfigured: Boolean(process.env.SUPABASE_URL),
    },
  });
}

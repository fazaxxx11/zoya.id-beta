// Health check endpoint — returns rate limiter status + circuit breaker + provider status + kill switch
// No auth required (monitoring endpoint)

import { getRateLimiterStatus } from './_lib/rate-limit.js';
import { isFeatureEnabled } from './_lib/middleware.js';
import { getUsageSummary } from './_lib/usage.js';
import { getProviderStatus } from './_lib/ai-providers.js';
import { getCircuitStatus } from './_lib/circuit-breaker.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rlStatus = getRateLimiterStatus();
  const usage = getUsageSummary();
  const providers = getProviderStatus();
  const circuits = getCircuitStatus();

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    rateLimiter: rlStatus,
    providers,
    circuits,
    killSwitch: {
      ai: isFeatureEnabled('AI'),
      payments: isFeatureEnabled('PAYMENTS'),
      registration: isFeatureEnabled('REGISTRATION'),
    },
    usage,
    env: {
      nodeEnv: process.env.NODE_ENV || 'development',
      supabaseConfigured: Boolean(process.env.SUPABASE_URL),
    },
  });
}

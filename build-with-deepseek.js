// build-with-deepseek.js — Call DeepSeek V3.2 via General Compute to build code
import { readFileSync, writeFileSync } from 'fs';

const GC_URL = 'https://api.generalcompute.com/v1/chat/completions';
const GC_MODEL = 'deepseek-v3.2';
const API_KEY = 'gc_FW4Qr9jXYbAdzifiCzNQrNn4LzAJOPxZ';

async function callDeepSeek(systemPrompt, userPrompt) {
  const res = await fetch(GC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: GC_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 8000,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`DeepSeek API error: ${res.status} ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function extractCodeBlock(text) {
  const blocks = [...text.matchAll(/```(?:javascript|js)?\n([\s\S]*?)```/gi)];
  if (blocks.length > 0) {
    for (const block of blocks) {
      const code = block[1].trim();
      if (code.includes('export') || code.includes('import') || code.includes('function')) {
        return code;
      }
    }
    return blocks[0][1].trim();
  }
  return null;
}

// ── Task definitions ──────────────────────────────────────────────
const tasks = [
  {
    name: 'rate-limit.js',
    file: 'api/_lib/rate-limit.js',
    task: `You are building a production rate limiter for a Vercel serverless function.

Create file: api/_lib/rate-limit.js

Requirements:
1. Support 4 modes: redis | degraded-memory | fail-closed | memory-dev
2. Redis mode: use Upstash Redis REST API (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
3. degraded-memory: production fallback using in-memory sliding window when Redis is unavailable
4. fail-closed: when RATE_LIMIT_FAIL_CLOSED=true and no Redis, reject ALL requests
5. memory-dev: development mode, always use in-memory
6. Export: slidingWindow(key, maxRequests, windowSec), getRateLimitHeaders(result), getRateLimiterStatus()
7. getRateLimiterStatus() returns: { mode, redisAvailable, isProduction, degraded, failClosed }
8. In-memory store uses sliding window with periodic cleanup
9. Never log secrets. Startup log shows mode only.
10. ES module syntax (import/export)

Mode detection logic:
- REDIS_AVAILABLE = Boolean(URL && TOKEN)
- if REDIS_AVAILABLE → redis
- if IS_PRODUCTION && FAIL_CLOSED → fail-closed
- if IS_PRODUCTION → degraded-memory
- else → memory-dev

Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

Output ONLY the complete file content.`,
  },
  {
    name: 'ai-providers.js',
    file: 'api/_lib/ai-providers.js',
    task: `You are building a centralized AI provider configuration module.

Create file: api/_lib/ai-providers.js

Requirements:
1. Define 4 providers: generalcompute, openrouter, groq, kimi
2. Each provider has: id, name, envKey (API key env var), defaultUrl, defaultModel, urlEnv (URL override env var), modelEnv (model override env var), isOpenRouter
3. Export functions:
   - getProviders() → returns array of configured providers (filter by env key presence)
   - getProvider(id) → returns single provider or null
   - getGroqCascadeModels() → returns [default models] or [env override]
   - hasProviders() → boolean
   - buildHeaders(provider) → returns fetch headers object
   - buildChatBody(provider, messages, options) → returns chat completion body
   - getProviderStatus() → returns provider info without secrets

Provider definitions:
- generalcompute: envKey=GENERALCOMPUTE_API_KEY, defaultUrl=https://api.generalcompute.com/v1/chat/completions, defaultModel=deepseek-v3.2, urlEnv=GENERALCOMPUTE_BASE_URL, modelEnv=GENERALCOMPUTE_MODEL
- openrouter: envKey=OPENROUTER_API_KEY, defaultUrl=https://openrouter.ai/api/v1/chat/completions, defaultModel=openrouter/auto, urlEnv=OPENROUTER_BASE_URL, modelEnv=OPENROUTER_MODEL, isOpenRouter=true
- groq: envKey=GROQ_API_KEY, defaultUrl=https://api.groq.com/openai/v1/chat/completions, defaultModel=llama-3.3-70b-versatile, urlEnv=GROQ_BASE_URL, modelEnv=GROQ_MODEL
- kimi: envKey=KIMI_API_KEY, defaultUrl=https://api.moonshot.ai/v1/chat/completions, defaultModel=moonshot-v1-8k, urlEnv=KIMI_BASE_URL, modelEnv=KIMI_MODEL

buildHeaders: adds Content-Type + Authorization. For openrouter, also adds HTTP-Referer=https://zoya.id and X-Title=zoya.id
buildChatBody: { model, messages, temperature: options.temperature ?? 0.3, max_tokens: options.maxTokens ?? 1500 }. For openrouter, add response_format: { type: 'json_object' }
Groq cascade: default ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'], env override returns single-item array

ES module syntax. Output ONLY the complete file content.`,
  },
  {
    name: 'circuit-breaker.js',
    file: 'api/_lib/circuit-breaker.js',
    task: `You are building a per-provider circuit breaker (in-memory, no persistence).

Create file: api/_lib/circuit-breaker.js

Requirements:
1. States: closed → open → half-open → closed
2. Trip after 3 consecutive transient failures (TRIP_THRESHOLD = 3)
3. Cooldown: 60 seconds (COOLDOWN_MS = 60000)
4. After cooldown, transition to half-open (allow 1 trial request)
5. Half-open success → closed (reset failures)
6. Half-open failure → re-open
7. Export functions:
   - isAvailable(providerId) → boolean
   - recordSuccess(providerId) → void
   - recordFailure(providerId) → void
   - getCircuitStatus() → object with circuit states (no secrets)
   - resetCircuit(providerId) → void (for testing)
   - resetAll() → void (for testing)

Internal state: Map<providerId, { state, failures, openedAt }>
Console.warn on trip and half-open trial failure.

ES module syntax. Output ONLY the complete file content.`,
  },
];

// ── Build each file ───────────────────────────────────────────────
const SYSTEM = `You are an expert full-stack developer. You write clean, production-ready JavaScript code.
Output ONLY the code inside a single \`\`\`javascript code block. No explanations, no markdown headers, no extra text.
Language: JavaScript (ES modules). Runtime: Node.js (Vercel serverless).
Follow clean code patterns: proper error handling, JSDoc comments, clear naming.`;

async function main() {
  for (const t of tasks) {
    console.log(`\n🔨 Building ${t.name} with DeepSeek V3.2...`);
    try {
      const code = await callDeepSeek(SYSTEM, t.task);
      const extracted = extractCodeBlock(code);
      if (extracted) {
        writeFileSync(t.file, extracted);
        console.log(`✅ ${t.name} written (${extracted.length} bytes)`);
      } else {
        console.log(`⚠️  ${t.name}: could not extract code block, writing raw`);
        writeFileSync(t.file, code);
      }
    } catch (err) {
      console.error(`❌ ${t.name}: ${err.message}`);
    }
  }
  console.log('\n🏁 DeepSeek build complete.');
}

main();

// api/_lib/ai-providers.js
// Centralized AI provider configuration with env overrides
// All AI endpoints import getProviders() instead of duplicating config

const OPENROUTER_HEADERS = {
  'HTTP-Referer': 'https://zoya.id',
  'X-Title': 'zoya.id',
};

// ── Provider definitions (ordered by priority) ────────────────────
const PROVIDER_DEFS = [
  {
    id: 'generalcompute',
    name: 'GeneralCompute',
    envKey: 'GENERALCOMPUTE_API_KEY',
    defaultUrl: 'https://api.generalcompute.com/v1/chat/completions',
    defaultModel: 'deepseek-v3.2',
    urlEnv: 'GENERALCOMPUTE_BASE_URL',
    modelEnv: 'GENERALCOMPUTE_MODEL',
    isOpenRouter: false,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    envKey: 'OPENROUTER_API_KEY',
    defaultUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'openrouter/auto',
    urlEnv: 'OPENROUTER_BASE_URL',
    modelEnv: 'OPENROUTER_MODEL',
    isOpenRouter: true,
  },
  {
    id: 'groq',
    name: 'Groq',
    envKey: 'GROQ_API_KEY',
    defaultUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    urlEnv: 'GROQ_BASE_URL',
    modelEnv: 'GROQ_MODEL',
    isOpenRouter: false,
  },
  {
    id: 'kimi',
    name: 'Kimi',
    envKey: 'KIMI_API_KEY',
    defaultUrl: 'https://api.moonshot.ai/v1/chat/completions',
    defaultModel: 'moonshot-v1-8k',
    urlEnv: 'KIMI_BASE_URL',
    modelEnv: 'KIMI_MODEL',
    isOpenRouter: false,
  },
];

// ── Groq model cascade (fallback within provider) ─────────────────
const GROQ_MODEL_CASCADE = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];

// ── Build provider list from env ──────────────────────────────────
export function getProviders() {
  return PROVIDER_DEFS
    .filter(def => process.env[def.envKey])
    .map(def => ({
      id: def.id,
      name: def.name,
      url: process.env[def.urlEnv] || def.defaultUrl,
      model: process.env[def.modelEnv] || def.defaultModel,
      key: process.env[def.envKey],
      isOpenRouter: def.isOpenRouter,
    }));
}

// ── Get provider by ID ────────────────────────────────────────────
export function getProvider(id) {
  const def = PROVIDER_DEFS.find(d => d.id === id);
  if (!def || !process.env[def.envKey]) return null;
  return {
    id: def.id,
    name: def.name,
    url: process.env[def.urlEnv] || def.defaultUrl,
    model: process.env[def.modelEnv] || def.defaultModel,
    key: process.env[def.envKey],
    isOpenRouter: def.isOpenRouter,
  };
}

// ── Get Groq cascade models ───────────────────────────────────────
export function getGroqCascadeModels() {
  const envModel = process.env.GROQ_MODEL;
  if (envModel) return [envModel];
  return GROQ_MODEL_CASCADE;
}

// ── Check if at least one provider is configured ──────────────────
export function hasProviders() {
  return PROVIDER_DEFS.some(def => process.env[def.envKey]);
}

// ── Build headers for a provider ──────────────────────────────────
export function buildHeaders(provider) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${provider.key}`,
  };
  if (provider.isOpenRouter) {
    Object.assign(headers, OPENROUTER_HEADERS);
  }
  return headers;
}

// ── Build request body for chat completion ────────────────────────
export function buildChatBody(provider, messages, options = {}) {
  const body = {
    model: provider.model,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 1500,
  };
  if (provider.isOpenRouter) {
    body.response_format = { type: 'json_object' };
  }
  return body;
}

// ── Provider list for health endpoint (no secrets) ────────────────
export function getProviderStatus() {
  return PROVIDER_DEFS.map(def => ({
    id: def.id,
    name: def.name,
    configured: Boolean(process.env[def.envKey]),
    model: process.env[def.modelEnv] || def.defaultModel,
    url: process.env[def.urlEnv] || def.defaultUrl,
  }));
}

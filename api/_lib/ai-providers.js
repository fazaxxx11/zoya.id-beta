/**
 * @file AI provider configuration and utilities
 * @module api/_lib/ai-providers
 */

/**
 * Provider definitions with configuration details
 * @type {Array<Object>}
 */
const providerDefinitions = [
  {
    id: 'ai1833',
    name: 'AI1833',
    urlEnv: 'AI1833_URL',
    baseUrlEnv: 'AI1833_BASE_URL',
    defaultUrl: 'https://api.ai1833.shop/v1/chat/completions',
    modelEnv: 'AI1833_MODEL',
    defaultModel: 'deepseek-v4-flash',
    keyEnv: 'AI1833_API_KEY',
    isOpenRouter: false
  },
  {
    id: 'generalcompute',
    name: 'General Compute',
    urlEnv: 'GENERALCOMPUTE_URL',
    baseUrlEnv: 'GENERALCOMPUTE_BASE_URL',
    defaultUrl: 'https://api.generalcompute.com/v1/chat/completions',
    modelEnv: 'GENERALCOMPUTE_MODEL',
    defaultModel: 'deepseek-v3.2',
    keyEnv: 'GENERALCOMPUTE_API_KEY',
    isOpenRouter: false
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    urlEnv: 'OPENROUTER_URL',
    baseUrlEnv: 'OPENROUTER_BASE_URL',
    defaultUrl: 'https://openrouter.ai/api/v1/chat/completions',
    modelEnv: 'OPENROUTER_MODEL',
    defaultModel: 'openrouter/auto',
    keyEnv: 'OPENROUTER_API_KEY',
    isOpenRouter: true
  },
  {
    id: 'groq',
    name: 'Groq',
    urlEnv: 'GROQ_URL',
    baseUrlEnv: 'GROQ_BASE_URL',
    defaultUrl: 'https://api.groq.com/openai/v1/chat/completions',
    modelEnv: 'GROQ_MODEL',
    defaultModel: 'llama-3.3-70b-versatile',
    keyEnv: 'GROQ_API_KEY',
    isOpenRouter: false
  },
  {
    id: 'kimi',
    name: 'Kimi',
    urlEnv: 'KIMI_URL',
    baseUrlEnv: 'KIMI_BASE_URL',
    defaultUrl: 'https://api.moonshot.ai/v1/chat/completions',
    modelEnv: 'KIMI_MODEL',
    defaultModel: 'moonshot-v1-8k',
    keyEnv: 'KIMI_API_KEY',
    isOpenRouter: false
  }
];

/**
 * Resolves provider URL with fallback chain
 * @param {Object} providerDef - Provider definition object
 * @returns {string} Resolved URL
 */
export function getProviderUrl(providerDef) {
  try {
    return process.env[providerDef.urlEnv] || 
           process.env[providerDef.baseUrlEnv] || 
           providerDef.defaultUrl;
  } catch (error) {
    console.error(`Error resolving URL for ${providerDef.id}:`, error);
    return providerDef.defaultUrl;
  }
}

/**
 * Resolves provider model with fallback chain
 * @param {Object} providerDef - Provider definition object
 * @returns {string|Array<string>} Resolved model or cascade array
 */
export function getProviderModel(providerDef) {
  try {
    if (providerDef.id === 'groq') {
      const modelEnv = process.env[providerDef.modelEnv];
      if (modelEnv) {
        return modelEnv;
      }
      return ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    }
    
    return process.env[providerDef.modelEnv] || providerDef.defaultModel;
  } catch (error) {
    console.error(`Error resolving model for ${providerDef.id}:`, error);
    return providerDef.defaultModel;
  }
}

/**
 * Gets OpenRouter-specific headers
 * @returns {Object} Headers for OpenRouter requests
 */
function getOpenRouterHeaders() {
  return {
    'HTTP-Referer': 'https://zoya.id',
    'X-Title': 'zoya.id'
  };
}

/**
 * Creates configured provider objects based on available API keys
 * @param {Object} apiKeys - Object with provider IDs as keys and API keys as values
 * @param {Object} [options] - Optional provider-specific overrides
 * @returns {Array<Object>} Array of configured provider objects
 */
export function getConfiguredProviders(apiKeys, options = {}) {
  const providers = [];

  for (const providerDef of providerDefinitions) {
    const key = apiKeys[providerDef.id];
    if (!key) continue;

    const providerOptions = options[providerDef.id] || {};
    
    const provider = {
      id: providerDef.id,
      name: providerDef.name,
      url: providerOptions.url || getProviderUrl(providerDef),
      model: providerOptions.model || getProviderModel(providerDef),
      key: key,
      isOpenRouter: providerDef.isOpenRouter
    };

    if (provider.isOpenRouter) {
      provider.headers = getOpenRouterHeaders();
    }

    providers.push(provider);
  }

  return providers;
}

/**
 * Gets provider status information without exposing secrets
 * @returns {Array<Object>} Array of provider status objects
 */
export function getProviderStatus() {
  const status = [];

  for (const providerDef of providerDefinitions) {
    try {
      const hasKey = !!process.env[providerDef.keyEnv];
      const url = getProviderUrl(providerDef);
      const model = getProviderModel(providerDef);
      
      status.push({
        id: providerDef.id,
        name: providerDef.name,
        configured: hasKey,
        url: url,
        model: model,
        isOpenRouter: providerDef.isOpenRouter
      });
    } catch (error) {
      console.error(`Error getting status for ${providerDef.id}:`, error);
      status.push({
        id: providerDef.id,
        name: providerDef.name,
        configured: false,
        error: error.message
      });
    }
  }

  return status;
}

// ── Backward-compat exports (used by AI endpoints) ───────────────

/**
 * Get providers from env keys — backward-compat wrapper.
 * Reads GENERALCOMPUTE_API_KEY, GROQ_API_KEY, KIMI_API_KEY, OPENROUTER_API_KEY from env.
 * @returns {Array<Object>} Configured providers with key, url, model, isOpenRouter
 */
export function getProviders() {
  const apiKeys = {};
  for (const def of providerDefinitions) {
    const key = process.env[def.keyEnv];
    if (key) apiKeys[def.id] = key;
  }
  return getConfiguredProviders(apiKeys);
}

/**
 * Get single provider by ID (backward-compat).
 * @param {string} id - Provider ID
 * @returns {Object|null} Provider or null
 */
export function getProvider(id) {
  const providers = getProviders();
  return providers.find(p => p.id === id) || null;
}

/**
 * Get Groq cascade models (backward-compat).
 * @returns {string[]} Array of model names
 */
export function getGroqCascadeModels() {
  const def = providerDefinitions.find(p => p.id === 'groq');
  const envModel = process.env[def.modelEnv];
  if (envModel) return [envModel];
  return ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
}

/**
 * Check if any providers are configured (backward-compat).
 * @returns {boolean}
 */
export function hasProviders() {
  return getProviders().length > 0;
}

/**
 * Build headers for a provider (backward-compat).
 * @param {Object} provider - Provider object with key and isOpenRouter
 * @returns {Object} Headers object
 */
export function buildHeaders(provider) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${provider.key}`,
  };
  if (provider.isOpenRouter) {
    headers['HTTP-Referer'] = 'https://zoya.id';
    headers['X-Title'] = 'zoya.id';
  }
  return headers;
}

/**
 * Build chat completion body (backward-compat).
 * @param {Object} provider - Provider object with model and isOpenRouter
 * @param {Array} messages - Chat messages
 * @param {Object} [options] - { temperature, maxTokens }
 * @returns {Object} Request body
 */
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
/**
 * AI Provider Configuration Module
 * Centralized configuration for various AI providers
 */

/**
 * Provider configuration type definition
 * @typedef {Object} ProviderConfig
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {string} envKey - Environment variable name for API key
 * @property {string} defaultUrl - Default API endpoint URL
 * @property {string} defaultModel - Default model name
 * @property {string} urlEnv - Environment variable for URL override
 * @property {string} modelEnv - Environment variable for model override
 * @property {boolean} [isOpenRouter] - Whether this is OpenRouter provider
 */

/**
 * Chat completion options
 * @typedef {Object} ChatOptions
 * @property {number} [temperature] - Sampling temperature
 * @property {number} [maxTokens] - Maximum tokens to generate
 */

/**
 * Provider status without secrets
 * @typedef {Object} ProviderStatus
 * @property {string} id - Provider ID
 * @property {string} name - Provider name
 * @property {boolean} configured - Whether provider is configured
 * @property {string} model - Active model name
 * @property {string} url - Active API URL
 */

// Provider configurations
const PROVIDERS = Object.freeze([
  {
    id: 'generalcompute',
    name: 'General Compute',
    envKey: 'GENERALCOMPUTE_API_KEY',
    defaultUrl: 'https://api.generalcompute.com/v1/chat/completions',
    defaultModel: 'deepseek-v3.2',
    urlEnv: 'GENERALCOMPUTE_BASE_URL',
    modelEnv: 'GENERALCOMPUTE_MODEL'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    envKey: 'OPENROUTER_API_KEY',
    defaultUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'openrouter/auto',
    urlEnv: 'OPENROUTER_BASE_URL',
    modelEnv: 'OPENROUTER_MODEL',
    isOpenRouter: true
  },
  {
    id: 'groq',
    name: 'Groq',
    envKey: 'GROQ_API_KEY',
    defaultUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    urlEnv: 'GROQ_BASE_URL',
    modelEnv: 'GROQ_MODEL'
  },
  {
    id: 'kimi',
    name: 'Kimi',
    envKey: 'KIMI_API_KEY',
    defaultUrl: 'https://api.moonshot.ai/v1/chat/completions',
    defaultModel: 'moonshot-v1-8k',
    urlEnv: 'KIMI_BASE_URL',
    modelEnv: 'KIMI_MODEL'
  }
]);

/**
 * Get all configured providers (filtered by API key presence)
 * @returns {ProviderConfig[]} Array of configured providers
 */
export function getProviders() {
  return PROVIDERS.filter(provider => {
    const apiKey = process.env[provider.envKey];
    return apiKey && apiKey.trim().length > 0;
  });
}

/**
 * Get a specific provider by ID
 * @param {string} id - Provider ID
 * @returns {ProviderConfig|null} Provider configuration or null if not found
 */
export function getProvider(id) {
  const provider = PROVIDERS.find(p => p.id === id);
  if (!provider) return null;
  
  const apiKey = process.env[provider.envKey];
  return apiKey && apiKey.trim().length > 0 ? provider : null;
}

/**
 * Get Groq cascade models
 * @returns {string[]} Array of model names for cascade
 */
export function getGroqCascadeModels() {
  const groqProvider = PROVIDERS.find(p => p.id === 'groq');
  if (!groqProvider) return [];
  
  const envModel = process.env[groqProvider.modelEnv];
  if (envModel && envModel.trim().length > 0) {
    return [envModel.trim()];
  }
  
  return ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
}

/**
 * Check if any providers are configured
 * @returns {boolean} True if at least one provider is configured
 */
export function hasProviders() {
  return getProviders().length > 0;
}

/**
 * Build HTTP headers for a provider
 * @param {ProviderConfig} provider - Provider configuration
 * @returns {Object} Headers object for fetch
 * @throws {Error} If API key is missing
 */
export function buildHeaders(provider) {
  const apiKey = process.env[provider.envKey];
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(`Missing API key for provider: ${provider.name}`);
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey.trim()}`
  };
  
  if (provider.isOpenRouter) {
    headers['HTTP-Referer'] = 'https://zoya.id';
    headers['X-Title'] = 'zoya.id';
  }
  
  return headers;
}

/**
 * Build chat completion request body
 * @param {ProviderConfig} provider - Provider configuration
 * @param {Array} messages - Array of message objects
 * @param {ChatOptions} [options] - Chat options
 * @returns {Object} Request body for chat completion
 */
export function buildChatBody(provider, messages, options = {}) {
  const model = process.env[provider.modelEnv]?.trim() || provider.defaultModel;
  
  const body = {
    model,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 1500
  };
  
  if (provider.isOpenRouter) {
    body.response_format = { type: 'json_object' };
  }
  
  return body;
}

/**
 * Get provider status information without secrets
 * @returns {ProviderStatus[]} Array of provider status objects
 */
export function getProviderStatus() {
  return PROVIDERS.map(provider => {
    const apiKey = process.env[provider.envKey];
    const configured = !!(apiKey && apiKey.trim().length > 0);
    
    const model = process.env[provider.modelEnv]?.trim() || provider.defaultModel;
    const url = process.env[provider.urlEnv]?.trim() || provider.defaultUrl;
    
    return {
      id: provider.id,
      name: provider.name,
      configured,
      model,
      url
    };
  });
}
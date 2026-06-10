// Unit tests for ai-providers.js — centralized config + env overrides
// Tests match DeepSeek V3.2 generated API surface
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ai-providers', () => {
  describe('default config', () => {
    beforeEach(() => {
      process.env.GENERALCOMPUTE_API_KEY = 'test-gc-key';
      process.env.GROQ_API_KEY = 'test-groq-key';
      process.env.KIMI_API_KEY = 'test-kimi-key';
      delete process.env.OPENROUTER_API_KEY;
      delete process.env.GENERALCOMPUTE_BASE_URL;
      delete process.env.GENERALCOMPUTE_MODEL;
      delete process.env.GROQ_BASE_URL;
      delete process.env.GROQ_MODEL;
      delete process.env.KIMI_BASE_URL;
      delete process.env.KIMI_MODEL;
      vi.resetModules();
    });

    it('should return only configured providers', async () => {
      const { getProviders } = await import('../ai-providers.js');
      const providers = getProviders();
      expect(providers.length).toBe(3);
      expect(providers.map(p => p.id)).toEqual(['generalcompute', 'groq', 'kimi']);
    });

    it('should return provider by id when configured', async () => {
      const { getProvider } = await import('../ai-providers.js');
      const provider = getProvider('generalcompute');
      expect(provider).not.toBeNull();
      expect(provider.id).toBe('generalcompute');
    });

    it('should return null for unconfigured provider', async () => {
      const { getProvider } = await import('../ai-providers.js');
      const provider = getProvider('openrouter');
      expect(provider).toBeNull();
    });

    it('should report hasProviders correctly', async () => {
      const { hasProviders } = await import('../ai-providers.js');
      expect(hasProviders()).toBe(true);
    });

    it('should return groq cascade models with default', async () => {
      const { getGroqCascadeModels } = await import('../ai-providers.js');
      const models = getGroqCascadeModels();
      expect(models).toEqual(['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']);
    });

    it('should build correct headers using env key', async () => {
      const { getProvider, buildHeaders } = await import('../ai-providers.js');
      const provider = getProvider('generalcompute');
      const headers = buildHeaders(provider);
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBe('Bearer test-gc-key');
      expect(headers['HTTP-Referer']).toBeUndefined();
    });

    it('should build chat body with defaults', async () => {
      const { getProvider, buildChatBody } = await import('../ai-providers.js');
      const provider = getProvider('generalcompute');
      const messages = [{ role: 'user', content: 'hello' }];
      const body = buildChatBody(provider, messages);
      expect(body.model).toBe('deepseek-v3.2');
      expect(body.messages).toEqual(messages);
      expect(body.temperature).toBe(0.3);
      expect(body.max_tokens).toBe(1500);
    });

    it('should build chat body with custom options', async () => {
      const { getProvider, buildChatBody } = await import('../ai-providers.js');
      const provider = getProvider('generalcompute');
      const messages = [{ role: 'user', content: 'hello' }];
      const body = buildChatBody(provider, messages, { temperature: 0.7, maxTokens: 600 });
      expect(body.temperature).toBe(0.7);
      expect(body.max_tokens).toBe(600);
    });

    it('should not add response_format for non-openrouter', async () => {
      const { getProvider, buildChatBody } = await import('../ai-providers.js');
      const provider = getProvider('generalcompute');
      const body = buildChatBody(provider, []);
      expect(body.response_format).toBeUndefined();
    });

    it('should return provider status without secrets', async () => {
      const { getProviderStatus } = await import('../ai-providers.js');
      const status = getProviderStatus();
      expect(status.length).toBe(4);
      const gc = status.find(p => p.id === 'generalcompute');
      expect(gc.configured).toBe(true);
      expect(gc).not.toHaveProperty('key');
      expect(gc).not.toHaveProperty('envKey');
    });
  });

  describe('env overrides', () => {
    beforeEach(() => {
      process.env.GENERALCOMPUTE_API_KEY = 'test-gc-key';
      process.env.GENERALCOMPUTE_BASE_URL = 'https://custom-gc.example.com/v1/chat/completions';
      process.env.GENERALCOMPUTE_MODEL = 'custom-model';
      delete process.env.GROQ_API_KEY;
      delete process.env.KIMI_API_KEY;
      delete process.env.OPENROUTER_API_KEY;
      vi.resetModules();
    });

    it('should apply env overrides for URL and model in status', async () => {
      const { getProviderStatus } = await import('../ai-providers.js');
      const status = getProviderStatus();
      const gc = status.find(p => p.id === 'generalcompute');
      expect(gc.url).toBe('https://custom-gc.example.com/v1/chat/completions');
      expect(gc.model).toBe('custom-model');
    });

    it('should apply env override for model in buildChatBody', async () => {
      const { getProvider, buildChatBody } = await import('../ai-providers.js');
      const provider = getProvider('generalcompute');
      const body = buildChatBody(provider, []);
      expect(body.model).toBe('custom-model');
    });
  });

  describe('openrouter', () => {
    beforeEach(() => {
      process.env.OPENROUTER_API_KEY = 'test-or-key';
      delete process.env.GENERALCOMPUTE_API_KEY;
      delete process.env.GROQ_API_KEY;
      delete process.env.KIMI_API_KEY;
      vi.resetModules();
    });

    it('should include openrouter when configured', async () => {
      const { getProviders } = await import('../ai-providers.js');
      const providers = getProviders();
      expect(providers.map(p => p.id)).toContain('openrouter');
    });

    it('should build correct headers for openrouter', async () => {
      const { getProvider, buildHeaders } = await import('../ai-providers.js');
      const provider = getProvider('openrouter');
      const headers = buildHeaders(provider);
      expect(headers['HTTP-Referer']).toBe('https://zoya.id');
      expect(headers['X-Title']).toBe('zoya.id');
    });

    it('should add response_format for openrouter', async () => {
      const { getProvider, buildChatBody } = await import('../ai-providers.js');
      const provider = getProvider('openrouter');
      const body = buildChatBody(provider, []);
      expect(body.response_format).toEqual({ type: 'json_object' });
    });
  });

  describe('groq model cascade override', () => {
    beforeEach(() => {
      process.env.GROQ_API_KEY = 'test-groq-key';
      process.env.GROQ_MODEL = 'custom-groq-model';
      delete process.env.GENERALCOMPUTE_API_KEY;
      delete process.env.KIMI_API_KEY;
      delete process.env.OPENROUTER_API_KEY;
      vi.resetModules();
    });

    it('should use env override for groq model cascade', async () => {
      const { getGroqCascadeModels } = await import('../ai-providers.js');
      const models = getGroqCascadeModels();
      expect(models).toEqual(['custom-groq-model']);
    });
  });
});

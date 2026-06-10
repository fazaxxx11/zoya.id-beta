// Unit tests for ai-providers.js — Sprint 1 spec
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ai-providers', () => {
  describe('getConfiguredProviders', () => {
    beforeEach(() => {
      process.env.GENERALCOMPUTE_API_KEY = 'test-gc';
      process.env.GROQ_API_KEY = 'test-groq';
      process.env.KIMI_API_KEY = 'test-kimi';
      delete process.env.OPENROUTER_API_KEY;
      delete process.env.GENERALCOMPUTE_URL;
      delete process.env.GENERALCOMPUTE_BASE_URL;
      delete process.env.GENERALCOMPUTE_MODEL;
      delete process.env.GROQ_URL;
      delete process.env.GROQ_BASE_URL;
      delete process.env.GROQ_MODEL;
      delete process.env.KIMI_URL;
      delete process.env.KIMI_BASE_URL;
      delete process.env.KIMI_MODEL;
      vi.resetModules();
    });

    it('should return only providers with keys', async () => {
      const { getConfiguredProviders } = await import('../../api/_lib/ai-providers.js');
      const providers = getConfiguredProviders({
        generalcompute: 'test-gc',
        groq: 'test-groq',
      });
      expect(providers.length).toBe(2);
      expect(providers.map(p => p.id)).toEqual(['generalcompute', 'groq']);
    });

    it('should use default URLs when no override', async () => {
      const { getConfiguredProviders } = await import('../../api/_lib/ai-providers.js');
      const providers = getConfiguredProviders({ generalcompute: 'key' });
      expect(providers[0].url).toBe('https://api.generalcompute.com/v1/chat/completions');
    });

    it('should use default models when no override', async () => {
      const { getConfiguredProviders } = await import('../../api/_lib/ai-providers.js');
      const providers = getConfiguredProviders({ generalcompute: 'key' });
      expect(providers[0].model).toBe('deepseek-v3.2');
    });
  });

  describe('env URL override', () => {
    beforeEach(() => {
      process.env.GENERALCOMPUTE_API_KEY = 'test-gc';
      process.env.GENERALCOMPUTE_URL = 'https://custom-gc.example.com/v1/chat/completions';
      delete process.env.GENERALCOMPUTE_BASE_URL;
      delete process.env.GENERALCOMPUTE_MODEL;
      delete process.env.GROQ_API_KEY;
      delete process.env.KIMI_API_KEY;
      delete process.env.OPENROUTER_API_KEY;
      vi.resetModules();
    });

    it('should prefer URL over BASE_URL', async () => {
      const { getProviderUrl, getProviders } = await import('../../api/_lib/ai-providers.js');
      // Internal: check URL resolution
      const def = { urlEnv: 'GENERALCOMPUTE_URL', baseUrlEnv: 'GENERALCOMPUTE_BASE_URL', defaultUrl: 'https://default.example.com' };
      expect(getProviderUrl(def)).toBe('https://custom-gc.example.com/v1/chat/completions');
    });

    it('should fallback to BASE_URL when URL not set', async () => {
      delete process.env.GENERALCOMPUTE_URL;
      process.env.GENERALCOMPUTE_BASE_URL = 'https://base-gc.example.com/v1/chat/completions';
      vi.resetModules();
      const { getProviderUrl } = await import('../../api/_lib/ai-providers.js');
      const def = { urlEnv: 'GENERALCOMPUTE_URL', baseUrlEnv: 'GENERALCOMPUTE_BASE_URL', defaultUrl: 'https://default.example.com' };
      expect(getProviderUrl(def)).toBe('https://base-gc.example.com/v1/chat/completions');
    });

    it('should fallback to default when neither set', async () => {
      delete process.env.GENERALCOMPUTE_URL;
      delete process.env.GENERALCOMPUTE_BASE_URL;
      vi.resetModules();
      const { getProviderUrl } = await import('../../api/_lib/ai-providers.js');
      const def = { urlEnv: 'GENERALCOMPUTE_URL', baseUrlEnv: 'GENERALCOMPUTE_BASE_URL', defaultUrl: 'https://default.example.com' };
      expect(getProviderUrl(def)).toBe('https://default.example.com');
    });
  });

  describe('env model override', () => {
    beforeEach(() => {
      process.env.GENERALCOMPUTE_API_KEY = 'test-gc';
      process.env.GENERALCOMPUTE_MODEL = 'custom-deepseek';
      delete process.env.GENERALCOMPUTE_URL;
      delete process.env.GENERALCOMPUTE_BASE_URL;
      delete process.env.GROQ_API_KEY;
      delete process.env.KIMI_API_KEY;
      delete process.env.OPENROUTER_API_KEY;
      vi.resetModules();
    });

    it('should use env model override', async () => {
      const { getProviders } = await import('../../api/_lib/ai-providers.js');
      const providers = getProviders();
      expect(providers[0].model).toBe('custom-deepseek');
    });
  });

  describe('backward-compat exports', () => {
    beforeEach(() => {
      process.env.GENERALCOMPUTE_API_KEY = 'test-gc';
      process.env.GROQ_API_KEY = 'test-groq';
      process.env.KIMI_API_KEY = 'test-kimi';
      delete process.env.OPENROUTER_API_KEY;
      delete process.env.GENERALCOMPUTE_URL;
      delete process.env.GENERALCOMPUTE_BASE_URL;
      delete process.env.GENERALCOMPUTE_MODEL;
      vi.resetModules();
    });

    it('getProviders() returns configured providers from env', async () => {
      const { getProviders } = await import('../../api/_lib/ai-providers.js');
      const providers = getProviders();
      expect(providers.length).toBe(3);
      expect(providers.map(p => p.id)).toEqual(['generalcompute', 'groq', 'kimi']);
    });

    it('getProvider() returns single provider by id', async () => {
      const { getProvider } = await import('../../api/_lib/ai-providers.js');
      const p = getProvider('generalcompute');
      expect(p).not.toBeNull();
      expect(p.id).toBe('generalcompute');
      expect(p.key).toBe('test-gc');
    });

    it('getProvider() returns null for unconfigured', async () => {
      const { getProvider } = await import('../../api/_lib/ai-providers.js');
      expect(getProvider('openrouter')).toBeNull();
    });

    it('buildHeaders() returns correct headers', async () => {
      const { buildHeaders } = await import('../../api/_lib/ai-providers.js');
      const h = buildHeaders({ key: 'k', isOpenRouter: false });
      expect(h['Authorization']).toBe('Bearer k');
      expect(h['Content-Type']).toBe('application/json');
    });

    it('buildHeaders() adds OpenRouter headers', async () => {
      const { buildHeaders } = await import('../../api/_lib/ai-providers.js');
      const h = buildHeaders({ key: 'k', isOpenRouter: true });
      expect(h['HTTP-Referer']).toBe('https://zoya.id');
      expect(h['X-Title']).toBe('zoya.id');
    });

    it('buildChatBody() builds correct body', async () => {
      const { buildChatBody } = await import('../../api/_lib/ai-providers.js');
      const body = buildChatBody({ model: 'm', isOpenRouter: false }, [{ role: 'user', content: 'hi' }]);
      expect(body.model).toBe('m');
      expect(body.temperature).toBe(0.3);
      expect(body.max_tokens).toBe(1500);
    });

    it('buildChatBody() adds response_format for openrouter', async () => {
      const { buildChatBody } = await import('../../api/_lib/ai-providers.js');
      const body = buildChatBody({ model: 'm', isOpenRouter: true }, []);
      expect(body.response_format).toEqual({ type: 'json_object' });
    });

    it('hasProviders() returns true when keys exist', async () => {
      const { hasProviders } = await import('../../api/_lib/ai-providers.js');
      expect(hasProviders()).toBe(true);
    });

    it('getProviderStatus() returns status without secrets', async () => {
      const { getProviderStatus } = await import('../../api/_lib/ai-providers.js');
      const status = getProviderStatus();
      expect(status.length).toBe(4);
      const gc = status.find(p => p.id === 'generalcompute');
      expect(gc.configured).toBe(true);
      expect(gc).not.toHaveProperty('key');
    });
  });

  describe('groq cascade', () => {
    it('should return default cascade models', async () => {
      process.env.GROQ_API_KEY = 'test';
      delete process.env.GROQ_MODEL;
      vi.resetModules();
      const { getGroqCascadeModels } = await import('../../api/_lib/ai-providers.js');
      expect(getGroqCascadeModels()).toEqual(['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']);
    });

    it('should use env override for groq model', async () => {
      process.env.GROQ_API_KEY = 'test';
      process.env.GROQ_MODEL = 'custom-groq';
      vi.resetModules();
      const { getGroqCascadeModels } = await import('../../api/_lib/ai-providers.js');
      expect(getGroqCascadeModels()).toEqual(['custom-groq']);
    });
  });
});

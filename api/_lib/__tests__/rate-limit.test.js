// Unit tests for rate-limit.js — degraded fallback modes
// Uses vi.resetModules() to re-import with different env states
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('rate-limit', () => {
  describe('in-memory fallback (memory-dev)', () => {
    beforeEach(() => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      delete process.env.RATE_LIMIT_FAIL_CLOSED;
      process.env.NODE_ENV = 'development';
      vi.resetModules();
    });

    it('should allow requests within limit', async () => {
      const { slidingWindow } = await import('../rate-limit.js');
      const result = await slidingWindow('test:allow', 5, 60);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.limit).toBe(5);
    });

    it('should reject requests over limit', async () => {
      const { slidingWindow } = await import('../rate-limit.js');
      const key = 'test:reject:' + Date.now();
      for (let i = 0; i < 5; i++) {
        await slidingWindow(key, 5, 60);
      }
      const result = await slidingWindow(key, 5, 60);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should report mode as memory-dev', async () => {
      const { getRateLimiterStatus } = await import('../rate-limit.js');
      const status = getRateLimiterStatus();
      expect(status.mode).toBe('memory-dev');
      expect(status.redisAvailable).toBe(false);
      expect(status.degraded).toBe(false);
    });

    it('should return correct headers', async () => {
      const { getRateLimitHeaders } = await import('../rate-limit.js');
      const result = { limit: 10, remaining: 7, reset: 1234567890 };
      const headers = getRateLimitHeaders(result);
      expect(headers['X-RateLimit-Limit']).toBe(10);
      expect(headers['X-RateLimit-Remaining']).toBe(7);
      expect(headers['X-RateLimit-Reset']).toBe(1234567890);
    });
  });

  describe('degraded-memory mode', () => {
    beforeEach(() => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      delete process.env.RATE_LIMIT_FAIL_CLOSED;
      process.env.NODE_ENV = 'production';
      vi.resetModules();
    });

    it('should report degraded mode in production without Redis', async () => {
      const { getRateLimiterStatus } = await import('../rate-limit.js');
      const status = getRateLimiterStatus();
      expect(status.mode).toBe('degraded-memory');
      expect(status.degraded).toBe(true);
      expect(status.isProduction).toBe(true);
    });

    it('should still allow requests via in-memory fallback', async () => {
      const { slidingWindow } = await import('../rate-limit.js');
      const result = await slidingWindow('degraded:test', 10, 60);
      expect(result.success).toBe(true);
    });
  });

  describe('fail-closed mode', () => {
    beforeEach(() => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      process.env.RATE_LIMIT_FAIL_CLOSED = 'true';
      process.env.NODE_ENV = 'production';
      vi.resetModules();
    });

    it('should report fail-closed mode', async () => {
      const { getRateLimiterStatus } = await import('../rate-limit.js');
      const status = getRateLimiterStatus();
      expect(status.mode).toBe('fail-closed');
      expect(status.failClosed).toBe(true);
    });

    it('should reject all requests in fail-closed mode', async () => {
      const { slidingWindow } = await import('../rate-limit.js');
      const result = await slidingWindow('failclosed:test', 100, 60);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });
});

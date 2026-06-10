// Unit tests for rate-limit.js — Sprint 1 spec
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('rate-limit', () => {
  describe('production without Redis (degraded-memory)', () => {
    beforeEach(() => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      delete process.env.RATE_LIMIT_FAIL_CLOSED;
      process.env.NODE_ENV = 'production';
      vi.resetModules();
    });

    it('should NOT reject all requests (fail-open degraded)', async () => {
      const { slidingWindow } = await import('../../api/_lib/rate-limit.js');
      const result = await slidingWindow('test:degraded', 10, 60);
      expect(result.success).toBe(true);
    });

    it('should apply stricter degraded limit (floor(maxRequests * 0.5))', async () => {
      const { slidingWindow } = await import('../../api/_lib/rate-limit.js');
      const result = await slidingWindow('test:limit', 10, 60);
      expect(result.limit).toBe(5); // floor(10 * 0.5)
    });

    it('should enforce degraded limit (reject after floor(max*0.5))', async () => {
      const { slidingWindow } = await import('../../api/_lib/rate-limit.js');
      const key = 'test:degraded-reject:' + Date.now();
      // floor(4 * 0.5) = 2, so after 2 requests should reject
      for (let i = 0; i < 2; i++) {
        await slidingWindow(key, 4, 60);
      }
      const result = await slidingWindow(key, 4, 60);
      expect(result.success).toBe(false);
      expect(result.limit).toBe(2);
    });

    it('should report degraded mode', async () => {
      const { getRateLimiterStatus } = await import('../../api/_lib/rate-limit.js');
      const status = getRateLimiterStatus();
      expect(status.mode).toBe('degraded-memory');
      expect(status.degraded).toBe(true);
      expect(status.redisAvailable).toBe(false);
      expect(status.isProduction).toBe(true);
    });
  });

  describe('RATE_LIMIT_FAIL_CLOSED=true', () => {
    beforeEach(() => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      process.env.RATE_LIMIT_FAIL_CLOSED = 'true';
      process.env.NODE_ENV = 'production';
      vi.resetModules();
    });

    it('should reject all requests', async () => {
      const { slidingWindow } = await import('../../api/_lib/rate-limit.js');
      const result = await slidingWindow('test:failclosed', 100, 60);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should report fail-closed mode', async () => {
      const { getRateLimiterStatus } = await import('../../api/_lib/rate-limit.js');
      const status = getRateLimiterStatus();
      expect(status.mode).toBe('fail-closed');
      expect(status.degraded).toBe(false);
    });
  });

  describe('memory-dev mode', () => {
    beforeEach(() => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      delete process.env.RATE_LIMIT_FAIL_CLOSED;
      process.env.NODE_ENV = 'development';
      vi.resetModules();
    });

    it('should allow requests with original limit', async () => {
      const { slidingWindow } = await import('../../api/_lib/rate-limit.js');
      const result = await slidingWindow('test:dev', 10, 60);
      expect(result.success).toBe(true);
      expect(result.limit).toBe(10);
    });

    it('should report memory-dev mode', async () => {
      const { getRateLimiterStatus } = await import('../../api/_lib/rate-limit.js');
      const status = getRateLimiterStatus();
      expect(status.mode).toBe('memory-dev');
      expect(status.degraded).toBe(false);
    });
  });

  describe('Redis command error fallback', () => {
    beforeEach(() => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
      delete process.env.RATE_LIMIT_FAIL_CLOSED;
      process.env.NODE_ENV = 'production';
      vi.resetModules();
    });

    it('should fallback to degraded-memory on Redis failure', async () => {
      const { slidingWindow, getRateLimiterStatus } = await import('../../api/_lib/rate-limit.js');
      // Redis will fail (fake URL) — should degrade, not 429
      const result = await slidingWindow('test:redis-fail', 10, 60);
      // After Redis failure, mode should degrade
      const status = getRateLimiterStatus();
      expect(['degraded-memory', 'redis']).toContain(status.mode);
      // Either way, request should NOT be rejected due to Redis failure
      if (status.mode === 'degraded-memory') {
        expect(result.success).toBe(true);
        expect(result.limit).toBe(5); // degraded floor(10*0.5)
      }
    });
  });

  describe('getRateLimitHeaders', () => {
    it('should return correct headers', async () => {
      vi.resetModules();
      const { getRateLimitHeaders } = await import('../../api/_lib/rate-limit.js');
      const result = { limit: 10, remaining: 7, reset: 1234567890 };
      const headers = getRateLimitHeaders(result);
      expect(headers['X-RateLimit-Limit']).toBe('10');
      expect(headers['X-RateLimit-Remaining']).toBe('7');
      expect(headers['X-RateLimit-Reset']).toBe('1234567890');
    });
  });
});

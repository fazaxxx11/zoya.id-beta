// Unit tests for CORS/ALLOWED_ORIGINS config parsing
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('config-parser: parseAllowedOrigins', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.ALLOWED_ORIGINS;
  });

  it('with no env → returns default list', async () => {
    const { parseAllowedOrigins } = await import('../../api/_lib/security.js');
    const result = parseAllowedOrigins();
    expect(result).toEqual([
      'https://zoya.id',
      'https://www.zoya.id',
      'https://zoya-id-beta.vercel.app',
    ]);
  });

  it('with env → prepends env values to defaults', async () => {
    process.env.ALLOWED_ORIGINS = 'https://a.com,https://b.com';
    vi.resetModules();
    const { parseAllowedOrigins } = await import('../../api/_lib/security.js');
    const result = parseAllowedOrigins();
    expect(result).toContain('https://a.com');
    expect(result).toContain('https://b.com');
    expect(result).toContain('https://zoya.id'); // default still present
  });

  it('trims whitespace', async () => {
    process.env.ALLOWED_ORIGINS = ' https://a.com ,  https://b.com  ';
    vi.resetModules();
    const { parseAllowedOrigins } = await import('../../api/_lib/security.js');
    const result = parseAllowedOrigins();
    expect(result).toContain('https://a.com');
    expect(result).toContain('https://b.com');
  });

  it('handles empty string', async () => {
    process.env.ALLOWED_ORIGINS = '';
    vi.resetModules();
    const { parseAllowedOrigins } = await import('../../api/_lib/security.js');
    const result = parseAllowedOrigins();
    expect(result).toEqual([
      'https://zoya.id',
      'https://www.zoya.id',
      'https://zoya-id-beta.vercel.app',
    ]);
  });

  it('deduplicates origins', async () => {
    process.env.ALLOWED_ORIGINS = 'https://zoya.id,https://new.com';
    vi.resetModules();
    const { parseAllowedOrigins } = await import('../../api/_lib/security.js');
    const result = parseAllowedOrigins();
    const zoyaCount = result.filter(o => o === 'https://zoya.id').length;
    expect(zoyaCount).toBe(1);
  });
});

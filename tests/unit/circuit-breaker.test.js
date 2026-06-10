// Unit tests for circuit-breaker.js — Sprint 1 spec
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('circuit-breaker', () => {
  let mod;

  beforeEach(async () => {
    mod = await import('../../api/_lib/circuit-breaker.js');
    mod.resetAll();
  });

  it('should start available (no circuit = CLOSED)', () => {
    expect(mod.isAvailable('p1')).toBe(true);
  });

  it('should trip to OPEN after 3 transient failures', () => {
    mod.recordFailure('p1', true);
    mod.recordFailure('p1', true);
    expect(mod.isAvailable('p1')).toBe(true); // still 2 failures
    mod.recordFailure('p1', true); // 3rd → trip
    expect(mod.isAvailable('p1')).toBe(false);
  });

  it('should NOT trip on non-transient (validation) failures', () => {
    mod.recordFailure('p1', false); // validation error
    mod.recordFailure('p1', false);
    mod.recordFailure('p1', false);
    expect(mod.isAvailable('p1')).toBe(true); // still available
  });

  it('should NOT trip on mixed transient + validation errors', () => {
    mod.recordFailure('p1', true);  // transient
    mod.recordFailure('p1', false); // validation
    mod.recordFailure('p1', true);  // transient → only 2 transient
    expect(mod.isAvailable('p1')).toBe(true);
  });

  it('should skip provider during cooldown (OPEN state)', () => {
    for (let i = 0; i < 3; i++) mod.recordFailure('p1', true);
    expect(mod.isAvailable('p1')).toBe(false);
  });

  it('should transition to HALF_OPEN after cooldown', () => {
    for (let i = 0; i < 3; i++) mod.recordFailure('p1', true);
    expect(mod.isAvailable('p1')).toBe(false);

    const originalNow = Date.now;
    Date.now = () => originalNow() + 61_000;
    expect(mod.isAvailable('p1')).toBe(true); // HALF_OPEN
    Date.now = originalNow;
  });

  it('should close on HALF_OPEN success', () => {
    for (let i = 0; i < 3; i++) mod.recordFailure('p1', true);
    const originalNow = Date.now;
    Date.now = () => originalNow() + 61_000;
    expect(mod.isAvailable('p1')).toBe(true); // HALF_OPEN
    mod.recordSuccess('p1');
    expect(mod.isAvailable('p1')).toBe(true); // CLOSED
    Date.now = originalNow;
  });

  it('should re-open on HALF_OPEN failure', () => {
    for (let i = 0; i < 3; i++) mod.recordFailure('p1', true);
    const originalNow = Date.now;
    Date.now = () => originalNow() + 61_000;
    expect(mod.isAvailable('p1')).toBe(true); // HALF_OPEN
    mod.recordFailure('p1', true); // trial failed
    expect(mod.isAvailable('p1')).toBe(false); // back to OPEN
    Date.now = originalNow;
  });

  it('should reset failures on success in CLOSED', () => {
    mod.recordFailure('p1', true);
    mod.recordFailure('p1', true);
    mod.recordSuccess('p1'); // reset
    mod.recordFailure('p1', true);
    mod.recordFailure('p1', true);
    // Only 2 transient failures, should still be available
    expect(mod.isAvailable('p1')).toBe(true);
  });

  it('should track multiple providers independently', () => {
    for (let i = 0; i < 3; i++) mod.recordFailure('p1', true);
    expect(mod.isAvailable('p1')).toBe(false);
    expect(mod.isAvailable('p2')).toBe(true);
  });

  it('should report cooldownRemaining in status', () => {
    for (let i = 0; i < 3; i++) mod.recordFailure('p1', true);
    const status = mod.getCircuitStatus();
    expect(status.p1.state).toBe('OPEN');
    expect(status.p1.cooldownRemaining).toBeTypeOf('number');
    expect(status.p1.cooldownRemaining).toBeGreaterThan(0);
  });

  it('should reset individual circuit', () => {
    for (let i = 0; i < 3; i++) mod.recordFailure('p1', true);
    mod.resetCircuit('p1');
    expect(mod.isAvailable('p1')).toBe(true);
  });

  it('should reset all circuits', () => {
    for (let i = 0; i < 3; i++) mod.recordFailure('p1', true);
    mod.resetAll();
    expect(mod.isAvailable('p1')).toBe(true);
  });
});

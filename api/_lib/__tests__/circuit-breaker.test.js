// Unit tests for circuit-breaker.js — open/half-open states
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('circuit-breaker', () => {
  let isAvailable, recordSuccess, recordFailure, getCircuitStatus, resetCircuit, resetAll;

  beforeEach(async () => {
    const mod = await import('../circuit-breaker.js');
    isAvailable = mod.isAvailable;
    recordSuccess = mod.recordSuccess;
    recordFailure = mod.recordFailure;
    getCircuitStatus = mod.getCircuitStatus;
    resetCircuit = mod.resetCircuit;
    resetAll = mod.resetAll;
    resetAll();
  });

  it('should start in closed state (available)', () => {
    expect(isAvailable('test-provider')).toBe(true);
  });

  it('should stay closed under threshold failures', () => {
    for (let i = 0; i < 2; i++) {
      recordFailure('test-provider');
    }
    expect(isAvailable('test-provider')).toBe(true);
  });

  it('should trip to open after 3 failures', () => {
    for (let i = 0; i < 3; i++) {
      recordFailure('test-provider');
    }
    expect(isAvailable('test-provider')).toBe(false);
  });

  it('should reset failures on success', () => {
    for (let i = 0; i < 2; i++) {
      recordFailure('test-provider');
    }
    recordSuccess('test-provider');
    expect(isAvailable('test-provider')).toBe(true);

    // Failure count reset — need 3 more to trip again
    for (let i = 0; i < 2; i++) {
      recordFailure('test-provider');
    }
    expect(isAvailable('test-provider')).toBe(true);
  });

  it('should transition to half-open after cooldown', async () => {
    // Trip the circuit
    for (let i = 0; i < 3; i++) {
      recordFailure('test-provider');
    }
    expect(isAvailable('test-provider')).toBe(false);

    // Mock Date.now to simulate cooldown passing
    const originalNow = Date.now;
    Date.now = () => originalNow() + 61_000; // 61 seconds later

    expect(isAvailable('test-provider')).toBe(true); // half-open

    Date.now = originalNow;
  });

  it('should re-open on half-open failure', async () => {
    // Trip
    for (let i = 0; i < 3; i++) {
      recordFailure('test-provider');
    }

    // Simulate cooldown
    const originalNow = Date.now;
    Date.now = () => originalNow() + 61_000;

    // Half-open trial
    expect(isAvailable('test-provider')).toBe(true);
    recordFailure('test-provider'); // trial failed

    expect(isAvailable('test-provider')).toBe(false); // back to open

    Date.now = originalNow;
  });

  it('should close on half-open success', async () => {
    // Trip
    for (let i = 0; i < 3; i++) {
      recordFailure('test-provider');
    }

    // Simulate cooldown
    const originalNow = Date.now;
    Date.now = () => originalNow() + 61_000;

    // Half-open trial
    expect(isAvailable('test-provider')).toBe(true);
    recordSuccess('test-provider'); // trial succeeded

    expect(isAvailable('test-provider')).toBe(true); // closed
    Date.now = originalNow;
  });

  it('should track multiple providers independently', () => {
    for (let i = 0; i < 3; i++) {
      recordFailure('provider-a');
    }
    expect(isAvailable('provider-a')).toBe(false);
    expect(isAvailable('provider-b')).toBe(true);
  });

  it('should report circuit status', () => {
    recordFailure('test-provider');
    const status = getCircuitStatus();
    expect(status['test-provider']).toBeDefined();
    expect(status['test-provider'].state).toBe('closed');
    expect(status['test-provider'].failures).toBe(1);
  });

  it('should report cooldown remaining for open circuits', () => {
    for (let i = 0; i < 3; i++) {
      recordFailure('test-provider');
    }
    const status = getCircuitStatus();
    expect(status['test-provider'].state).toBe('open');
    expect(status['test-provider'].cooldownRemaining).toBeGreaterThan(0);
    expect(status['test-provider'].cooldownRemaining).toBeLessThanOrEqual(60_000);
  });

  it('should reset individual circuit', () => {
    for (let i = 0; i < 3; i++) {
      recordFailure('test-provider');
    }
    resetCircuit('test-provider');
    expect(isAvailable('test-provider')).toBe(true);
  });

  it('should reset all circuits', () => {
    for (let i = 0; i < 3; i++) {
      recordFailure('test-provider');
    }
    resetAll();
    expect(isAvailable('test-provider')).toBe(true);
  });
});

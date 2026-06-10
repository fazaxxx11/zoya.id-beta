// api/_lib/circuit-breaker.js
// Per-provider circuit breaker (in-memory only, no persistence)
// States: closed → open → half-open → closed
// Trip after 3 transient failures, cooldown 60s

const TRIP_THRESHOLD = 3;
const COOLDOWN_MS = 60_000;

// ── Circuit state per provider ────────────────────────────────────
// Map<providerId, { state, failures, openedAt }>
const circuits = new Map();

function getState(providerId) {
  if (!circuits.has(providerId)) {
    circuits.set(providerId, { state: 'closed', failures: 0, openedAt: 0 });
  }
  return circuits.get(providerId);
}

// ── Check if provider is available (not open) ─────────────────────
export function isAvailable(providerId) {
  const c = getState(providerId);

  if (c.state === 'closed') return true;

  if (c.state === 'open') {
    // Check if cooldown expired → transition to half-open
    if (Date.now() - c.openedAt >= COOLDOWN_MS) {
      c.state = 'half-open';
      return true; // Allow one trial request
    }
    return false;
  }

  // half-open: allow trial request
  return true;
}

// ── Record success → reset circuit ────────────────────────────────
export function recordSuccess(providerId) {
  const c = getState(providerId);
  c.failures = 0;
  c.state = 'closed';
}

// ── Record transient failure → possibly trip ──────────────────────
export function recordFailure(providerId) {
  const c = getState(providerId);

  if (c.state === 'half-open') {
    // Trial request failed → re-open
    c.state = 'open';
    c.openedAt = Date.now();
    console.warn(`[circuit-breaker] ${providerId}: half-open trial failed → re-opened`);
    return;
  }

  c.failures += 1;
  if (c.failures >= TRIP_THRESHOLD) {
    c.state = 'open';
    c.openedAt = Date.now();
    console.warn(`[circuit-breaker] ${providerId}: tripped after ${c.failures} failures → open (cooldown ${COOLDOWN_MS / 1000}s)`);
  }
}

// ── Get circuit status for health endpoint (no secrets) ───────────
export function getCircuitStatus() {
  const status = {};
  for (const [id, c] of circuits.entries()) {
    status[id] = {
      state: c.state,
      failures: c.failures,
      ...(c.state === 'open' && {
        cooldownRemaining: Math.max(0, COOLDOWN_MS - (Date.now() - c.openedAt)),
      }),
    };
  }
  return status;
}

// ── Reset circuit (for testing) ───────────────────────────────────
export function resetCircuit(providerId) {
  circuits.delete(providerId);
}

// ── Reset all circuits (for testing) ──────────────────────────────
export function resetAll() {
  circuits.clear();
}

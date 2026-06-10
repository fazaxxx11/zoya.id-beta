/**
 * @typedef {Object} CircuitState
 * @property {'closed' | 'open' | 'half-open'} state
 * @property {number} failures - Consecutive transient failures
 * @property {number | null} openedAt - Timestamp when circuit opened (null if closed)
 */

/**
 * Circuit breaker implementation for per-provider fault tolerance
 * @module api/_lib/circuit-breaker
 */

/** @type {Map<string, CircuitState>} */
const circuits = new Map();

/** @constant {number} */
const TRIP_THRESHOLD = 3;

/** @constant {number} */
const COOLDOWN_MS = 60000;

/**
 * Get or initialize circuit state for a provider
 * @param {string} providerId
 * @returns {CircuitState}
 */
function getCircuit(providerId) {
  if (!circuits.has(providerId)) {
    circuits.set(providerId, {
      state: 'closed',
      failures: 0,
      openedAt: null
    });
  }
  return circuits.get(providerId);
}

/**
 * Check if circuit is available for requests
 * @param {string} providerId
 * @returns {boolean}
 */
export function isAvailable(providerId) {
  const circuit = getCircuit(providerId);
  
  if (circuit.state === 'closed') {
    return true;
  }
  
  if (circuit.state === 'open') {
    const now = Date.now();
    if (now - circuit.openedAt >= COOLDOWN_MS) {
      circuit.state = 'half-open';
      circuit.openedAt = null;
      return true;
    }
    return false;
  }
  
  // half-open state - allow one trial
  return true;
}

/**
 * Record a successful request
 * @param {string} providerId
 */
export function recordSuccess(providerId) {
  const circuit = getCircuit(providerId);
  
  if (circuit.state === 'half-open') {
    console.warn(`Circuit breaker: ${providerId} half-open trial succeeded, resetting to closed`);
    circuit.state = 'closed';
    circuit.failures = 0;
  } else if (circuit.state === 'closed') {
    circuit.failures = 0;
  }
  // open state remains unchanged until cooldown
}

/**
 * Record a transient failure
 * @param {string} providerId
 */
export function recordFailure(providerId) {
  const circuit = getCircuit(providerId);
  
  if (circuit.state === 'half-open') {
    console.warn(`Circuit breaker: ${providerId} half-open trial failed, reopening circuit`);
    circuit.state = 'open';
    circuit.openedAt = Date.now();
    return;
  }
  
  circuit.failures++;
  
  if (circuit.state === 'closed' && circuit.failures >= TRIP_THRESHOLD) {
    console.warn(`Circuit breaker: ${providerId} tripped to open after ${circuit.failures} failures`);
    circuit.state = 'open';
    circuit.openedAt = Date.now();
  }
}

/**
 * Get current status of all circuits (safe for logging/monitoring)
 * @returns {Object<string, {state: string, failures: number, openedAt: number | null}>}
 */
export function getCircuitStatus() {
  const status = {};
  
  for (const [providerId, circuit] of circuits.entries()) {
    status[providerId] = {
      state: circuit.state,
      failures: circuit.failures,
      openedAt: circuit.openedAt
    };
  }
  
  return status;
}

/**
 * Reset circuit for a specific provider (for testing)
 * @param {string} providerId
 */
export function resetCircuit(providerId) {
  circuits.delete(providerId);
}

/**
 * Reset all circuits (for testing)
 */
export function resetAll() {
  circuits.clear();
}
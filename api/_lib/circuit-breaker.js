/**
 * @typedef {Object} CircuitState
 * @property {'CLOSED' | 'OPEN' | 'HALF_OPEN'} state
 * @property {number} failures
 * @property {number} [openedAt]
 */

/**
 * @typedef {Object} CircuitStatus
 * @property {'CLOSED' | 'OPEN' | 'HALF_OPEN'} state
 * @property {number} failures
 * @property {number} [cooldownRemaining]
 */

/**
 * Circuit breaker implementation for managing provider availability.
 * Tracks transient failures and opens circuit after threshold is reached.
 */
class CircuitBreaker {
  /** @type {Map<string, CircuitState>} */
  #circuits = new Map();

  /** @type {number} */
  #tripThreshold = 3;

  /** @type {number} */
  #cooldownMs = 60 * 1000;

  /**
   * Check if circuit is available for requests.
   * @param {string} providerId - Provider identifier
   * @returns {boolean} True if circuit is CLOSED or HALF_OPEN
   */
  isAvailable(providerId) {
    try {
      const circuit = this.#circuits.get(providerId);
      
      if (!circuit) {
        return true; // No circuit exists, provider is available
      }

      if (circuit.state === 'CLOSED') {
        return true;
      }

      if (circuit.state === 'HALF_OPEN') {
        return true; // Allow trial request
      }

      if (circuit.state === 'OPEN') {
        const now = Date.now();
        const elapsed = now - circuit.openedAt;
        
        if (elapsed >= this.#cooldownMs) {
          this.#transitionToHalfOpen(providerId, circuit);
          return true; // Cooldown expired, allow trial request
        }
        
        return false; // Still in cooldown period
      }

      return false;
    } catch (error) {
      console.error('Error checking circuit availability:', error);
      return false; // Fail closed on error
    }
  }

  /**
   * Record a successful request.
   * @param {string} providerId - Provider identifier
   */
  recordSuccess(providerId) {
    try {
      const circuit = this.#circuits.get(providerId);
      
      if (!circuit) {
        return; // No circuit exists, nothing to update
      }

      if (circuit.state === 'HALF_OPEN') {
        console.warn(`Circuit for ${providerId}: HALF_OPEN → CLOSED (trial succeeded)`);
        this.#circuits.set(providerId, {
          state: 'CLOSED',
          failures: 0
        });
      } else if (circuit.state === 'CLOSED') {
        this.#circuits.set(providerId, {
          ...circuit,
          failures: 0 // Reset failures on success
        });
      }
    } catch (error) {
      console.error('Error recording success:', error);
    }
  }

  /**
   * Record a failed request.
   * @param {string} providerId - Provider identifier
   * @param {boolean} [isTransient] - Whether failure is transient (timeout, network, 5xx, 429)
   */
  recordFailure(providerId, isTransient = false) {
    try {
      let circuit = this.#circuits.get(providerId);
      
      if (!circuit) {
        circuit = {
          state: 'CLOSED',
          failures: 0
        };
      }

      if (circuit.state === 'HALF_OPEN') {
        console.warn(`Circuit for ${providerId}: HALF_OPEN → OPEN (trial failed)`);
        this.#circuits.set(providerId, {
          state: 'OPEN',
          failures: circuit.failures,
          openedAt: Date.now()
        });
        return;
      }

      if (!isTransient) {
        // Non-transient failures don't affect circuit state
        return;
      }

      const newFailures = circuit.failures + 1;
      
      if (newFailures >= this.#tripThreshold && circuit.state === 'CLOSED') {
        console.warn(`Circuit for ${providerId}: CLOSED → OPEN (${newFailures} transient failures)`);
        this.#circuits.set(providerId, {
          state: 'OPEN',
          failures: newFailures,
          openedAt: Date.now()
        });
      } else if (circuit.state === 'CLOSED') {
        this.#circuits.set(providerId, {
          ...circuit,
          failures: newFailures
        });
      }
    } catch (error) {
      console.error('Error recording failure:', error);
    }
  }

  /**
   * Get current status of all circuits.
   * @returns {Object<string, CircuitStatus>} Circuit status by provider
   */
  getCircuitStatus() {
    try {
      const status = {};
      const now = Date.now();
      
      for (const [providerId, circuit] of this.#circuits.entries()) {
        /** @type {CircuitStatus} */
        const circuitStatus = {
          state: circuit.state,
          failures: circuit.failures
        };

        if (circuit.state === 'OPEN' && circuit.openedAt) {
          const elapsed = now - circuit.openedAt;
          circuitStatus.cooldownRemaining = Math.max(0, this.#cooldownMs - elapsed);
        }

        status[providerId] = circuitStatus;
      }
      
      return status;
    } catch (error) {
      console.error('Error getting circuit status:', error);
      return {};
    }
  }

  /**
   * Reset circuit for specific provider.
   * @param {string} providerId - Provider identifier
   */
  resetCircuit(providerId) {
    try {
      this.#circuits.delete(providerId);
    } catch (error) {
      console.error('Error resetting circuit:', error);
    }
  }

  /**
   * Reset all circuits.
   */
  resetAll() {
    try {
      this.#circuits.clear();
    } catch (error) {
      console.error('Error resetting all circuits:', error);
    }
  }

  /**
   * Transition circuit from OPEN to HALF_OPEN after cooldown.
   * @param {string} providerId - Provider identifier
   * @param {CircuitState} circuit - Current circuit state
   * @private
   */
  #transitionToHalfOpen(providerId, circuit) {
    try {
      console.warn(`Circuit for ${providerId}: OPEN → HALF_OPEN (cooldown expired)`);
      this.#circuits.set(providerId, {
        state: 'HALF_OPEN',
        failures: circuit.failures
      });
    } catch (error) {
      console.error('Error transitioning to half-open:', error);
    }
  }
}

// Singleton instance
const circuitBreaker = new CircuitBreaker();

export const isAvailable = (providerId) => circuitBreaker.isAvailable(providerId);
export const recordSuccess = (providerId) => circuitBreaker.recordSuccess(providerId);
export const recordFailure = (providerId, isTransient) => circuitBreaker.recordFailure(providerId, isTransient);
export const getCircuitStatus = () => circuitBreaker.getCircuitStatus();
export const resetCircuit = (providerId) => circuitBreaker.resetCircuit(providerId);
export const resetAll = () => circuitBreaker.resetAll();
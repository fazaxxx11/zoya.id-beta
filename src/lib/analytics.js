// Analytics — Umami Cloud (privacy-friendly, no cookies, ~2KB)
// Script loaded via index.html <script> tag.
// API: trackEvent(name, data?) — manual events
//      trackPageview() — no-op, Umami auto-tracks pageviews

/**
 * Track a custom event.
 * @param {string} name - Event name (e.g. 'analyze', 'assess')
 * @param {Record<string, string|number>} [data] - Optional event properties
 */
export function trackEvent(name, data) {
  try {
    if (typeof window !== 'undefined' && window.umami) {
      window.umami.track(name, data)
    }
  } catch {
    // silently fail — analytics must never break the app
  }
}

/**
 * Manual pageview tracking — no-op since Umami auto-tracks via script.
 * Kept for backward compat with existing imports.
 */
export function trackPageview() {
  // Umami script handles this automatically
}

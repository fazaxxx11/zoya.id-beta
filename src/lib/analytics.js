import Plausible from 'plausible-tracker'

const plausible = Plausible({
  domain: 'azezmen.vercel.app',
  trackLocalhost: false,
})

export const { trackEvent, trackPageview } = plausible

// Auto-track page views on route change
export function setupPageTracking() {
  trackPageview()
}

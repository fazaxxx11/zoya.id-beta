// Analytics integration with Plausible (cloud-hosted, privacy-first).
// No API key needed — tracks via script tag injected by Plausible.

import Plausible from 'plausible-tracker'

const { trackEvent, trackPageview } = Plausible({ 
  domain: 'azezmen.vercel.app',
  apiHost: 'https://plausible.io' // default cloud endpoint
})

export { trackEvent, trackPageview }

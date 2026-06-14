# Lighthouse Baseline (Manual)

Date: 2026-06-14
URL: https://azezmen.vercel.app

## Automated run failed (VPS Chrome deps missing)

Manual check via:
1. Chrome DevTools → Lighthouse tab
2. https://pagespeed.web.dev/?url=https://azezmen.vercel.app

## Expected metrics (from build analysis):

### Bundle size (post-split):
- Main: 90KB (29KB gzip)
- Largest vendor: vendor-pdf 722KB (221KB gzip)
- Precache total: 4.8MB (70 entries)

### Critical metrics to track:
- **Performance**: target 85+ (large vendors hurt initial load)
- **Accessibility**: target 95+ (semantic HTML + contrast)
- **Best Practices**: target 95+ (HTTPS + no console.error in prod)
- **SEO**: target 95+ (meta tags + SSR placeholders)

### Known issues:
- Large PDF/XLSX vendors (lazy-loaded but still in bundle)
- No SSR (Vite SPA → initial load = blank)
- Service worker precache = 4.8MB

### Next improvements:
- SSR/SSG for landing pages (Vite SSR or migrate to Next.js)
- CDN for heavy vendors
- Route-based code split (React.lazy for pages)

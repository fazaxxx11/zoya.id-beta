# Lighthouse Baseline

Date: 2026-06-14
URL: https://azezmen.vercel.app

## Scores (from automated run)

| Metric | Score |
|---|---|
| Performance | 17 |
| Accessibility | 96 |
| Best Practices | 100 |
| SEO | 100 |

> Performance rendah karena: SPA blank initial load + vendor chunks besar + no SSR.
> VPS CPU throttled → score lebih rendah dari production Vercel edge.

## Bundle Analysis (post code-split)

- Main: 90KB (29KB gzip)
- vendor-pdf: 722KB (221KB gzip)
- vendor-mammoth: 493KB (129KB gzip)
- vendor-xlsx: 428KB (143KB gzip)
- vendor-docx: 352KB (101KB gzip) ← NEW
- vendor-supabase: 202KB (52KB gzip)
- html2canvas: 201KB (48KB gzip)
- vendor-ui: 194KB (56KB gzip)
- vendor-stats: 53KB (18KB gzip)
- Precache total: 4.5MB (70 entries)

## Next Improvements

1. Lazy load html2canvas (dynamic import)
2. Route-based code split (React.lazy for pages)
3. SSR/SSG for landing page (Next.js migration or Vite SSR)
4. CDN for heavy vendors
5. Re-run Lighthouse on Vercel edge for accurate score

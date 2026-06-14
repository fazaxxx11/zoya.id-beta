# Lighthouse Baseline — Azezmen (zoya.id-beta)

**Date**: 2026-06-14 22:09 WIB  
**URL**: https://azezmen.vercel.app  
**Tool**: Lighthouse 12.2.1 (headless Chrome, VPS)

---

## 📊 Category Scores

| Category | Score | Target |
|----------|-------|--------|
| **Performance** | 🟠 **72** | 85+ |
| **Accessibility** | 🟢 **97** | 95+ |
| **Best Practices** | 🟢 **96** | 95+ |
| **SEO** | 🟢 **100** | 95+ |

---

## ⚡ Core Web Vitals

| Metric | Value | Rating |
|--------|-------|--------|
| **FCP** (First Contentful Paint) | 0.9s | 🟢 Good |
| **LCP** (Largest Contentful Paint) | 2.3s | 🟢 Good |
| **TBT** (Total Blocking Time) | 400ms | 🟠 Needs Improvement |
| **CLS** (Cumulative Layout Shift) | 0.004 | 🟢 Good |
| **Speed Index** | 1.6s | 🟢 Good |

---

## 🔴 Performance Bottlenecks (Score: 72)

### Top Issues:
1. **Reduce unused JavaScript** — 3.5MB transferred, ~800KB unused
   - `vendor-pdf-*.js` (722KB), `vendor-mammoth-*.js` (493KB), `vendor-xlsx-*.js` (427KB)
   - Already code-split, but loaded upfront in service worker precache
   - **Fix**: Route-based lazy load (React.lazy per page)

2. **Eliminate render-blocking resources** — 1.2s potential savings
   - `index.css` (40KB) blocks first paint
   - **Fix**: Inline critical CSS, defer non-critical

3. **Total Blocking Time: 400ms** (target <200ms)
   - Main thread busy during initial load
   - **Fix**: Code split by route, defer non-critical JS

---

## 🟢 Strengths

- **Accessibility: 97** — semantic HTML, ARIA, contrast pass
- **Best Practices: 96** — HTTPS, no console errors, modern APIs
- **SEO: 100** — meta tags, structured data, crawlable
- **CLS: 0.004** — stable layout, no sudden shifts
- **LCP: 2.3s** — acceptable, hero image optimized

---

## 🎯 Next Improvements (Priority)

### High Impact:
1. **Route-based code split** — lazy load pages with `React.lazy()`
   - Split `/assessment`, `/statistik`, `/kuesioner` into separate chunks
   - Defer PDF/XLSX/DOCX vendors until export action triggered
   - Target: reduce initial bundle from 4.8MB → <1MB

2. **Critical CSS inline** — inline 10KB critical styles, defer rest
   - Tools: `critical` npm package, or Vite `@vitejs/plugin-legacy`

3. **Preconnect to origins** — add `<link rel="preconnect">` for Supabase, CDN

### Medium Impact:
4. **SSR/SSG** — server-side render landing pages (migrate to Next.js or Vite SSR)
5. **Image optimization** — AVIF/WebP, lazy load below-the-fold images
6. **Service worker strategy** — shift from precache-all → runtime cache for heavy vendors

---

## 📦 Current Bundle Breakdown (post-split)

```
Main:                90KB (29KB gzip)
Vendor (generic):   272KB (75KB gzip)  ← New split from TASK 3
Vendor UI:          193KB (56KB gzip)
Vendor Supabase:    202KB (52KB gzip)
Vendor Stats:        53KB (18KB gzip)
Vendor html2canvas: 201KB (48KB gzip)  ← Separated in TASK 3
Vendor XLSX:        428KB (143KB gzip)
Vendor Mammoth:     493KB (129KB gzip)
Vendor PDF:         722KB (221KB gzip)
Statistik:          200KB (54KB gzip)
Kuesioner:           80KB (23KB gzip)
Assessment:          66KB (20KB gzip)
-------------------------------------------
Precache Total:     4.8MB (70 entries)
```

**Problem**: All chunks precached by service worker → 4.8MB downloaded on first visit.

**Solution**: Remove heavy vendors from precache, lazy load on-demand.

---

## 🔗 Resources

- **Lighthouse JSON**: `lighthouse-baseline.json`
- **PageSpeed Insights**: https://pagespeed.web.dev/?url=https://azezmen.vercel.app
- **Web Vitals Chrome Extension**: https://chromewebstore.google.com/detail/web-vitals/

---

**Baseline established** ✅ — track improvements in next audit.

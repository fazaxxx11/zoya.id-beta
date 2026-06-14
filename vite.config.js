import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  esbuild: { drop: ['console', 'debugger'] },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Z-Research Tools',
        short_name: 'Z-Research',
        description: 'Alat bantu riset dan analisis statistik lengkap',
        theme_color: '#4f46e5',
        background_color: '#fafafa',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Only precache the app shell (HTML + critical CSS + main bundle)
        // Heavy vendor chunks are loaded on-demand via runtime caching
        globPatterns: ['**/*.{html,css,ico,png,svg,woff2}', 'assets/vendor-react*.js', 'assets/index-*.js'],
        globIgnores: [
          '**/sw.js', '**/workbox-*.js',
          // Exclude heavy vendor chunks from precache
          'assets/vendor-pdf*.js',
          'assets/vendor-xlsx*.js',
          'assets/vendor-mammoth*.js',
          'assets/vendor-docx*.js',
          'assets/vendor-supabase*.js',
          'assets/vendor-stats*.js',
          'assets/vendor-html2canvas*.js',
        ],
        cleanupOutdatedCaches: true,
        // Skip waiting so new SW activates immediately
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          // Supabase API — network-first with short cache
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 3600 },
              networkTimeoutSeconds: 5,
            },
          },
          // CDN resources — cache-first for fonts/icons
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 86400 },
            },
          },
          // Lazy-loaded JS chunks — stale-while-revalidate
          // Once loaded, cached for fast revisits; updates in background
          {
            urlPattern: /\/assets\/.*\.js$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'js-chunks',
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 3600 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 600,
    // No sourcemaps in production — saves ~30% build size
    sourcemap: false,
    // Target modern browsers for smaller output
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react'
            }
            if (id.includes('@radix-ui') || id.includes('lucide-react')) {
              return 'vendor-ui'
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            if (id.includes('jstat') || id.includes('simple-statistics')) {
              return 'vendor-stats'
            }
            if (id.includes('xlsx')) return 'vendor-xlsx'
            if (id.includes('pdfjs-dist') || id.includes('pdf-lib') || id.includes('jspdf')) return 'vendor-pdf'
            if (id.includes('mammoth')) return 'vendor-mammoth'
            if (id.includes('docx')) return 'vendor-docx'
            if (id.includes('html2canvas')) return 'vendor-html2canvas'
          }
        },
      },
    },
  },
})

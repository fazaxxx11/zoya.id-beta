import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { nodeResolve } from '@rollup/plugin-node-resolve'

export default defineConfig({
  esbuild: {
    drop: ['debugger'],
    // Hanya drop console.log/debug/info di production; PERTAHANKAN
    // console.error & console.warn — diperlukan untuk debugging production.
    pure: ['console.log', 'console.debug', 'console.info'],
  },
  optimizeDeps: {
    include: ['recharts'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Z-Research Tools',
        short_name: 'Z-Research',
        description: 'Alat bantu riset dan analisis statistik lengkap',
        theme_color: '#A8782A',
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
        globPatterns: ['**/*.{html,css,ico,png,svg,woff2}', 'assets/vendor-react*.js', 'assets/index-*.js'],
        globIgnores: [
          '**/sw.js', '**/workbox-*.js',
          'assets/vendor-pdf*.js',
          'assets/vendor-pdfjs*.js',
          'assets/vendor-xlsx*.js',
          'assets/vendor-mammoth*.js',
          'assets/vendor-docx*.js',
          'assets/vendor-supabase*.js',
          'assets/vendor-stats*.js',
          'assets/vendor-html2canvas*.js',
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 3600 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 86400 },
            },
          },
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
    chunkSizeWarningLimit: 800,
    sourcemap: false,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Core framework — always needed
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react'
            }
            // Supabase client
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            // Statistics engine — only needed for stats pages
            if (id.includes('jstat') || id.includes('simple-statistics')) {
              return 'vendor-stats'
            }
            // Heavy file parsers — only loaded on demand
            if (id.includes('xlsx')) return 'vendor-xlsx'
            if (id.includes('mammoth')) return 'vendor-mammoth'
            if (id.includes('docx')) return 'vendor-docx'
            if (id.includes('html2canvas')) return 'vendor-html2canvas'
            // Charts library
            if (id.includes('recharts')) return 'vendor-recharts'
            // NOTE: jspdf, pdfjs-dist, pdf-lib NOT manually chunked
            // — Rolldown auto-splits them with lazy consumers
            // @radix-ui, lucide-react also auto-split (not critical path)
          }
        },
      },
    },
  },
})

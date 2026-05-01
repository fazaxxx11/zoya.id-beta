import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual chunking — pisahkan vendor heavy yang spesifik saja.
        // Sisanya biar Vite handle otomatis (lebih aman dari OOM build).
        manualChunks: {
          'vendor-xlsx':     ['xlsx'],
          'vendor-pdf':      ['jspdf', 'pdf-lib', 'pdfjs-dist'],
          'vendor-mammoth':  ['mammoth'],
          'vendor-stats':    ['jstat', 'simple-statistics'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})

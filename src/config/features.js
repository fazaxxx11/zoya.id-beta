// src/config/features.js
// Feature flags for gradual rollouts. Toggle via Vercel env vars.
export const FEATURES = {
  USE_EXCELJS: import.meta.env.VITE_USE_EXCELJS === 'true',
}

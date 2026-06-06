import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { initTheme } from './lib/theme'
import { initAuth } from './lib/auth'
import { initWallet } from './lib/wallet'
import { initOrders } from './lib/orders'
import { initSentry } from './lib/sentry.config'

// Init error tracking (Poin #5: Sentry)
initSentry()

// Init theme SEBELUM render supaya tidak ada flash of light mode
initTheme()

// Subscribe wallet & orders ke auth changes (auto-fetch dari Supabase saat login).
// Harus DI-CALL sebelum initAuth supaya listener-nya sudah terdaftar saat
// session pertama di-load.
initWallet()
initOrders()

// Init Supabase auth SEBELUM render supaya getCurrentUser() di komponen
// langsung punya nilai sync dari session yang tersimpan.
initAuth().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})

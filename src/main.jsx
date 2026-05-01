import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { initTheme } from './lib/theme'
import { initAuth } from './lib/auth'

// Init theme SEBELUM render supaya tidak ada flash of light mode
initTheme()

// Init Supabase auth SEBELUM render supaya getCurrentUser() di komponen
// langsung punya nilai sync dari session yang tersimpan.
initAuth().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})

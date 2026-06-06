import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN tidak ditemukan, error tracking dinonaktifkan.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      new Sentry.BrowserTracing({
        tracePropagationTargets: ['localhost', window.location.hostname],
      }),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE || 'development',
    beforeSend(event) {
      // Jangan kirim event di development
      if (import.meta.env.DEV) return null;
      return event;
    },
  });

  // Tangkap global error
  window.addEventListener('error', (event) => {
    Sentry.captureException(event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    Sentry.captureException(event.reason);
  });

  console.log('[Sentry] Inisialisasi berhasil');
}

export { Sentry };

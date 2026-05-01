// Lightweight toast system tanpa library eksternal.
// Pakai pub-sub pattern supaya bisa dipanggil dari mana saja:
//   import { toast } from '@/lib/toast'
//   toast.success('Berhasil!')
//   toast.error('Saldo tidak cukup', { duration: 5000 })

const listeners = new Set()
let counter = 0

/** Subscribe ke event toast. Return unsubscribe fn. */
export function subscribeToast(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit(toast) {
  listeners.forEach(fn => fn(toast))
}

/**
 * @typedef {object} ToastOptions
 * @property {number} [duration] ms sebelum auto-dismiss (default 4000)
 * @property {string} [action] label tombol aksi (opsional)
 * @property {() => void} [onAction] handler tombol
 */

function makeToast(type, message, options = {}) {
  const id = ++counter
  emit({
    id,
    type,
    message,
    duration: options.duration ?? 4000,
    action: options.action,
    onAction: options.onAction,
  })
  return id
}

export const toast = {
  success: (msg, opts) => makeToast('success', msg, opts),
  error:   (msg, opts) => makeToast('error',   msg, opts),
  warning: (msg, opts) => makeToast('warning', msg, opts),
  info:    (msg, opts) => makeToast('info',    msg, opts),
}

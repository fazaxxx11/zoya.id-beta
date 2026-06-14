import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Reusable Modal wrapper.
 * - Renders to document.body via portal → escapes any ancestor with
 *   backdrop-filter / transform / filter that would otherwise become the
 *   containing block for `position: fixed` and break centering.
 * - Locks body scroll while open.
 * - Closes on Escape and on backdrop click (unless dismissOnBackdrop=false).
 *
 * Children should be the modal panel (white card). Backdrop + centering
 * handled here.
 */
export default function Modal({
  open,
  onClose,
  children,
  panelClassName = 'bg-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col',
  dismissOnBackdrop = true,
  zIndex = 100,
}) {
  // Lock body scroll
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
      style={{ zIndex }}
      onClick={dismissOnBackdrop ? onClose : undefined}
    >
      <div className={panelClassName} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  )
}

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '../../lib/cn'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close
const DialogPortal = DialogPrimitive.Portal

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) =>
  React.createElement(DialogPrimitive.Overlay, {
    className: cn('fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out', className),
    ref,
    ...props
  })
)
DialogOverlay.displayName = 'DialogOverlay'

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) =>
  React.createElement(DialogPortal, null,
    React.createElement(DialogOverlay),
    React.createElement(DialogPrimitive.Content, {
      className: cn('fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border bg-white p-6 shadow-lg focus:outline-none', className),
      ref,
      ...props
    }, children)
  )
)
DialogContent.displayName = 'DialogContent'

const DialogHeader = ({ className, ...props }) =>
  React.createElement('div', { className: cn('flex flex-col space-y-1.5 text-center sm:text-left', className), ...props })

const DialogTitle = React.forwardRef(({ className, ...props }, ref) =>
  React.createElement(DialogPrimitive.Title, {
    className: cn('text-lg font-semibold leading-none tracking-tight', className),
    ref,
    ...props
  })
)
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = React.forwardRef(({ className, ...props }, ref) =>
  React.createElement(DialogPrimitive.Description, {
    className: cn('text-sm text-gray-500', className),
    ref,
    ...props
  })
)
DialogDescription.displayName = 'DialogDescription'

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription }

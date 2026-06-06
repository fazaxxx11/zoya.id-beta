import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '../../lib/cn'

const variants = {
  default: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow',
  destructive: 'bg-red-600 text-white hover:bg-red-700 shadow',
  outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700',
  ghost: 'hover:bg-gray-100 text-gray-700',
  link: 'text-indigo-600 underline-offset-4 hover:underline',
}

const sizes = {
  sm: 'h-8 px-3 text-xs rounded-md',
  md: 'h-10 px-4 text-sm rounded-lg',
  lg: 'h-12 px-6 text-base rounded-lg',
  icon: 'h-9 w-9 rounded-lg',
}

const Button = React.forwardRef(({ className, variant = 'default', size = 'md', asChild = false, children, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return React.createElement(Comp, {
    className: cn(
      'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:pointer-events-none disabled:opacity-50',
      variants[variant],
      sizes[size],
      className
    ),
    ref,
    ...props
  }, children)
})

Button.displayName = 'Button'

export { Button, variants as buttonVariants }

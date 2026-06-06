import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * cn() - Utility untuk menggabungkan class Tailwind dengan aman
 * Digunakan oleh komponen Shadcn UI / Radix UI
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

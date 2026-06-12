'use client'

/**
 * Travel Wallet — UI Kit · Form primitives
 *
 * Thin styled wrappers over native form elements. One canonical control style:
 * h-12 (48px, satisfies the 44px tap target rule), rounded-xl, token-driven
 * focus ring. Never write the control class string inline again.
 *
 *   import { Field, Input, Select, FOCUS_RING } from '@/components/ui-kit'
 *
 *   <Field label="Destination" error={errors.destination}>
 *     <Select value={value} onChange={...}>
 *       <option value="">Select a country</option>
 *     </Select>
 *   </Field>
 */

import { forwardRef, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Shared keyboard focus ring for buttons, rows, and other non-form interactive
 * elements. Apply to every hand-rolled interactive element.
 */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

// The single canonical control style — ends the h-11/h-12 px-3/px-4 drift
const CONTROL_CLS =
  'w-full h-12 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(CONTROL_CLS, className)} {...props} />
  }
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        // appearance-none matches the existing select treatment app-wide
        // (no rendered chevron — see app/trips/new/add-trip-form.tsx)
        className={cn(CONTROL_CLS, 'appearance-none', className)}
        {...props}
      >
        {children}
      </select>
    )
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// FIELD
// Label + control + optional error message
// ─────────────────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  error?: string
  children: ReactNode
  className?: string
}

export function Field({ label, error, children, className }: FieldProps) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-status-at-risk mt-1.5">{error}</p>}
    </div>
  )
}

/**
 * Travel Wallet — UI Kit · Status module
 *
 * The single source of truth for status → colour/label mapping. Any
 * status-coloured element (pill, chip, banner) renders through this module —
 * never redefine the map elsewhere.
 *
 * No 'use client' directive — safe to import from server and client components.
 *
 *   import { StatusBadge, statusClasses } from '@/components/ui-kit'
 *   // or directly from a server component:
 *   import { statusClasses } from '@/components/ui-kit/status'
 */

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StatusValue = 'compliant' | 'incomplete' | 'at_risk' | 'verified'

export type StatusBadgeSize = 'sm' | 'md'

interface StatusVariant {
  label: string
  /** Text colour on light surfaces */
  text: string
  /** Background on light surfaces — the pastel -bg token */
  bg: string
  /** Text colour on dark surfaces (navy gradient etc.) — the pastel token reads near-white with a status tint */
  onDarkText: string
  /** Background on dark surfaces — the saturated token at reduced opacity */
  onDarkBg: string
}

export const STATUS_BADGE_VARIANTS: Record<StatusValue, StatusVariant> = {
  compliant: {
    label: 'Ready',
    text: 'text-status-compliant',
    bg: 'bg-status-compliant-bg',
    onDarkText: 'text-status-compliant-bg',
    onDarkBg: 'bg-status-compliant/30',
  },
  incomplete: {
    label: 'Incomplete',
    text: 'text-status-incomplete',
    bg: 'bg-status-incomplete-bg',
    onDarkText: 'text-status-incomplete-bg',
    onDarkBg: 'bg-status-incomplete/30',
  },
  at_risk: {
    label: 'At Risk',
    text: 'text-status-at-risk',
    bg: 'bg-status-at-risk-bg',
    onDarkText: 'text-status-at-risk-bg',
    onDarkBg: 'bg-status-at-risk/30',
  },
  verified: {
    label: 'Verified',
    text: 'text-status-verified',
    bg: 'bg-status-verified-bg',
    onDarkText: 'text-status-verified-bg',
    onDarkBg: 'bg-status-verified/30',
  },
}

/**
 * Derived class parts for non-pill status surfaces (chips with icons, banners,
 * custom-labelled pills). Pass `onDark: true` for dark surfaces such as the
 * passport card gradient.
 */
export function statusClasses(
  status: StatusValue,
  options?: { onDark?: boolean }
): { label: string; text: string; bg: string } {
  const v = STATUS_BADGE_VARIANTS[status]
  if (options?.onDark) {
    return { label: v.label, text: v.onDarkText, bg: v.onDarkBg }
  }
  return { label: v.label, text: v.text, bg: v.bg }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// Compliance status pill — compliant / incomplete / at_risk / verified
// ─────────────────────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: StatusValue
  size?: StatusBadgeSize
  icon?: ReactNode
  /** High-contrast variant for dark surfaces */
  onDark?: boolean
  className?: string
}

const SIZE_CLS: Record<StatusBadgeSize, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
}

export function StatusBadge({ status, size = 'sm', icon, onDark = false, className }: StatusBadgeProps) {
  const v = statusClasses(status, { onDark })
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold leading-none',
        SIZE_CLS[size],
        v.bg,
        v.text,
        className
      )}
    >
      {icon}
      {v.label}
    </span>
  )
}

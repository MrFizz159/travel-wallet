/**
 * Travel Wallet — UI Kit · ProgressBar
 *
 * Track + fill progress indicator (case progress, requirement completion).
 *
 *   import { ProgressBar } from '@/components/ui-kit'
 *
 *   <ProgressBar value={travelCase.progress} />
 *   <ProgressBar value={60} className="h-1" />   // thinner track
 */

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  /** 0–100 */
  value: number
  className?: string
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className={cn('h-1.5 rounded-full bg-muted overflow-hidden', className)}>
      <div
        className="h-full rounded-full bg-foreground transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

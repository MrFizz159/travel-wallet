import { CheckCircle } from 'lucide-react'

export type StepState = 'complete' | 'in_progress' | 'not_started'

export function StepIndicator({ state, num }: { state: StepState; num: number }) {
  if (state === 'complete') {
    return (
      <div className="w-7 h-7 rounded-full bg-status-compliant-bg flex items-center justify-center shrink-0 mt-0.5">
        <CheckCircle size={14} className="text-status-compliant" />
      </div>
    )
  }
  if (state === 'in_progress') {
    return (
      <div className="w-7 h-7 rounded-full bg-status-incomplete-bg border border-status-incomplete flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-xs font-bold text-status-incomplete leading-none">{num}</span>
      </div>
    )
  }
  return (
    <div className="w-7 h-7 rounded-full border-2 border-border bg-background flex items-center justify-center shrink-0 mt-0.5">
      <span className="text-xs font-semibold text-muted-foreground leading-none">{num}</span>
    </div>
  )
}

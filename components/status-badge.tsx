import { StatusBadge as UiStatusBadge } from '@/components/ui-kit'
import { cn } from '@/lib/utils'
import type { ComplianceStatus, TripState } from '@/lib/types'

interface Props {
  status: ComplianceStatus | null
  state?: TripState
  className?: string
}

export function StatusBadge({ status, state, className }: Props) {
  if (state === 'exploratory') {
    return (
      <span className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground',
        className
      )}>
        Exploratory
      </span>
    )
  }
  if (!status || status === 'not_started') return null
  return <UiStatusBadge status={status} className={className} />
}

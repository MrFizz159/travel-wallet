import { statusClasses, type StatusValue } from '@/components/ui-kit'
import { cn } from '@/lib/utils'
import type { RequirementStatus, SubTask } from '@/lib/types'

// ── Status chip ───────────────────────────────────────────────────────────────

// Colours come from the ui-kit status module; labels stay drawer-specific
// ('In progress' / 'Complete' rather than the badge defaults).

const STATUS_VALUE: Record<Exclude<RequirementStatus, 'not_started'>, StatusValue> = {
  in_progress: 'incomplete',
  at_risk: 'at_risk',
  complete: 'compliant',
}

const STATUS_LABEL: Record<RequirementStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  at_risk: 'At Risk',
  complete: 'Complete',
}

export function StatusChip({ status }: { status: RequirementStatus }) {
  const colours = status === 'not_started'
    ? { bg: 'bg-muted', text: 'text-muted-foreground' }
    : statusClasses(STATUS_VALUE[status])
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold leading-none', colours.bg, colours.text)}>
      {STATUS_LABEL[status]}
    </span>
  )
}

// ── Timeline helpers ──────────────────────────────────────────────────────────

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function getStartByDate(
  latestStartDate: string | null,
  tripStartDate: string | undefined,
  timeRequiredDays: number,
): string | null {
  if (latestStartDate) return formatShortDate(latestStartDate)
  if (tripStartDate) {
    const base = new Date(tripStartDate + 'T00:00:00')
    base.setDate(base.getDate() - timeRequiredDays)
    return formatShortDate(base.toISOString().slice(0, 10))
  }
  return null
}

// ── At-risk message ───────────────────────────────────────────────────────────

export function getAtRiskMessage(
  tripStartDate: string | undefined,
  latestStartDate: string | null,
  timeRequiredDays: number,
  portalTask: SubTask | undefined,
): string | null {
  if (!tripStartDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const travel = new Date(tripStartDate + 'T00:00:00')
  const isSubmitted = portalTask?.status === 'submitted'

  if (!isSubmitted) {
    if (!latestStartDate) return null
    const latest = new Date(latestStartDate + 'T00:00:00')
    if (today > latest) {
      const daysLeft = Math.max(0, Math.round((travel.getTime() - today.getTime()) / 86400000))
      return `Deadline to start passed — ${timeRequiredDays} day${timeRequiredDays !== 1 ? 's' : ''} needed, ${daysLeft} day${daysLeft !== 1 ? 's' : ''} until travel.`
    }
    return null
  }

  if (portalTask?.submitted_at) {
    const cutoff = new Date(portalTask.submitted_at)
    cutoff.setDate(cutoff.getDate() + 7) // 5 processing + 2 buffer
    if (cutoff >= travel) {
      const travelStr = travel.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      return `Application submitted — approval may not arrive before travel on ${travelStr}`
    }
  }

  return null
}

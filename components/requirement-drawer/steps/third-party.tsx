'use client'

import { useState, useTransition } from 'react'
import { ExternalLink } from 'lucide-react'
import { markApplicationSubmitted } from '@/app/actions/trips'
import { cn } from '@/lib/utils'
import type { SubTask } from '@/lib/types'
import { StepIndicator, type StepState } from './step-indicator'

export function ThirdPartyStep({ task, stepNumber, isManaged, reqComplete, tripId, requirementId, externalLink }: {
  task: SubTask; stepNumber: number; isManaged: boolean; reqComplete: boolean
  tripId: string; requirementId: string; externalLink: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isSubmitted = task.status === 'submitted'
  const state: StepState = reqComplete ? 'complete' : isSubmitted ? 'in_progress' : 'not_started'

  const submittedDate = task.submitted_at
    ? new Date(task.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null

  function handleMarkSubmitted() {
    setError(null)
    const fd = new FormData()
    fd.append('subTaskId', task.id)
    fd.append('requirementId', requirementId)
    fd.append('tripId', tripId)
    startTransition(async () => {
      try { await markApplicationSubmitted(fd) }
      catch (err) { setError(err instanceof Error ? err.message : 'Failed to update') }
    })
  }

  return (
    <div className="flex gap-3 py-3.5">
      <StepIndicator state={state} num={stepNumber} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', state === 'complete' && 'text-muted-foreground')}>{task.name}</p>

        {state === 'not_started' && (
          <>
            {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
            {externalLink && (
              <a
                href={externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border font-semibold min-h-[32px]"
              >
                Visit portal
                <ExternalLink size={11} />
              </a>
            )}
            {!isManaged && (
              <button
                onClick={handleMarkSubmitted}
                disabled={isPending}
                className="mt-2 block text-xs text-muted-foreground underline underline-offset-2 min-h-[32px] disabled:opacity-50"
              >
                {isPending ? 'Saving…' : "I've submitted my application"}
              </button>
            )}
          </>
        )}

        {state === 'in_progress' && (
          <>
            <p className="text-xs text-status-incomplete mt-0.5">
              Submitted{submittedDate ? ` ${submittedDate}` : ''}
            </p>
            {externalLink && (
              <a
                href={externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground"
              >
                Visit portal
                <ExternalLink size={11} />
              </a>
            )}
          </>
        )}

        {state === 'complete' && (
          <p className="text-xs text-status-compliant mt-0.5">Application approved</p>
        )}

        {error && <p className="text-xs text-status-at-risk mt-1">{error}</p>}
      </div>
    </div>
  )
}

import { cn } from '@/lib/utils'
import type { SubTask } from '@/lib/types'
import { StepIndicator } from './step-indicator'

export function AutomatedStep({ task, stepNumber, reqComplete }: {
  task: SubTask; stepNumber: number; reqComplete: boolean
}) {
  const isComplete = task.status === 'complete' || reqComplete
  return (
    <div className="flex gap-3 py-3.5">
      <StepIndicator state={isComplete ? 'complete' : 'not_started'} num={stepNumber} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', isComplete && 'text-muted-foreground')}>{task.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isComplete ? 'Auto-verified' : (task.description ?? 'Checked automatically')}
        </p>
      </div>
    </div>
  )
}

import { cn } from '@/lib/utils'
import type { SubTask } from '@/lib/types'
import { StepIndicator } from './step-indicator'

export function InformationalStep({ task, stepNumber, reqComplete }: {
  task: SubTask; stepNumber: number; reqComplete: boolean
}) {
  return (
    <div className="flex gap-3 py-3.5">
      <StepIndicator state={reqComplete ? 'complete' : 'not_started'} num={stepNumber} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', reqComplete && 'text-muted-foreground')}>{task.name}</p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
        )}
      </div>
    </div>
  )
}

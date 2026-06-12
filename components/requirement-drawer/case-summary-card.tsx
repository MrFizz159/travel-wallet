'use client'

import Link from 'next/link'
import { Briefcase, ArrowRight } from 'lucide-react'
import { ProgressBar } from '@/components/ui-kit'
import type { TravelCase } from '@/lib/types'

export function CaseSummaryCard({ travelCase, tripId, onClose }: {
  travelCase: TravelCase
  tripId: string
  onClose: () => void
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Briefcase size={14} className="text-muted-foreground shrink-0" />
          <span className="text-xs font-mono text-muted-foreground">{travelCase.case_reference}</span>
        </div>
        <span className="text-xs text-muted-foreground">{travelCase.progress}% complete</span>
      </div>
      <div>
        <p className="text-sm font-medium">{travelCase.status}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Sarah Johnson — Case Manager</p>
      </div>
      <ProgressBar value={travelCase.progress} className="h-1" />
      <Link
        href={`/trips/${tripId}/cases/${travelCase.id}`}
        onClick={onClose}
        className="flex items-center justify-between text-sm font-medium pt-1"
      >
        View case
        <ArrowRight size={14} />
      </Link>
    </div>
  )
}

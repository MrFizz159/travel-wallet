'use client'

import { useState, useTransition } from 'react'
import {
  X, CheckCircle, ExternalLink, ChevronRight, Briefcase, AlertTriangle,
} from 'lucide-react'
import { initiateCase } from '@/app/actions/cases'
import { BottomSheet } from '@/components/ui-kit'
import type { RequirementRow } from '@/lib/db-types'
import type { TravelCase } from '@/lib/types'
import { StatusChip, getStartByDate, getAtRiskMessage } from './helpers'
import { CaseSummaryCard } from './case-summary-card'
import { ApprovalDrawerBody } from './approval-body'
import { CenturoConfirmModal } from './centuro-confirm'
import { AutomatedStep } from './steps/automated'
import { GeneratableStep } from './steps/generatable'
import { ThirdPartyStep } from './steps/third-party'
import { InformationalStep } from './steps/informational'
import { PrimaryActionStep } from './steps/primary-action'

interface Props {
  requirement: RequirementRow
  tripId: string
  tripStartDate?: string
  travelCase?: TravelCase | null
  onClose: () => void
}

export function RequirementDrawer({ requirement, tripId, tripStartDate, travelCase, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const isManaged = requirement.has_active_case
  const reqComplete = requirement.status === 'complete'
  const sortedTasks = [...requirement.sub_tasks].sort((a, b) => a.sort_order - b.sort_order)
  const portalTask = sortedTasks.find(t => t.type === 'third_party')

  // Show the Centuro CTA if any step could be managed
  const hasManualSteps = sortedTasks.some(t => t.type !== 'automated' && t.type !== 'informational')

  const showTimeline = requirement.time_required_days > 0
  const startByDate = showTimeline
    ? getStartByDate(requirement.latest_start_date, tripStartDate, requirement.time_required_days)
    : null

  const atRiskMessage = getAtRiskMessage(tripStartDate, requirement.latest_start_date, requirement.time_required_days, portalTask)

  function handleInitiateCenturo() {
    const targetTask = portalTask ?? sortedTasks.find(t => t.type === 'primary_action')
    if (!targetTask) return
    setModalError(null)
    const fd = new FormData()
    fd.append('subTaskId', targetTask.id)
    fd.append('requirementId', requirement.id)
    fd.append('tripId', tripId)
    fd.append('visaType', requirement.name)
    fd.append('destinationCountry', requirement.why_it_applies ?? '')
    startTransition(async () => {
      try { await initiateCase(fd); setShowModal(false); onClose() }
      catch (err) { setModalError(err instanceof Error ? err.message : 'Failed to initiate case') }
    })
  }

  return (
    <>
      <BottomSheet open onClose={onClose} layer="sheet">
        <div className="px-5 pb-8 pt-2">

          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-lg font-bold flex-1 pr-3 leading-tight">{requirement.name}</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-3">
            <StatusChip status={requirement.status} />
          </div>

          {/* Context */}
          {requirement.why_it_applies && (
            <p className="text-sm text-muted-foreground mb-5">{requirement.why_it_applies}</p>
          )}

          {/* Timeline */}
          {showTimeline && (
            <div className="grid grid-cols-2 gap-2 mb-5">
              <div className="bg-card border border-border rounded-xl px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Time required</p>
                <p className="font-semibold text-sm">{requirement.time_required_days} days</p>
              </div>
              {startByDate && (
                <div className="bg-card border border-border rounded-xl px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Start by</p>
                  <p className="font-semibold text-sm">{startByDate}</p>
                </div>
              )}
            </div>
          )}

          {/* At-risk message */}
          {atRiskMessage && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-status-at-risk-bg mb-5">
              <AlertTriangle size={14} className="text-status-at-risk shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-status-at-risk">{atRiskMessage}</p>
            </div>
          )}

          {/* Documents Required */}
          {requirement.what_you_need && requirement.what_you_need.length > 0 && (
            <div className="rounded-xl border border-border bg-card px-4 py-4 mb-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Documents Required
              </h3>
              <ul className="flex flex-col gap-1.5">
                {requirement.what_you_need.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground shrink-0 mt-0.5">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Guidance */}
          {requirement.guidance && (
            <div className="rounded-xl border border-border bg-card px-4 py-4 mb-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Guidance
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{requirement.guidance}</p>
              {requirement.external_link && (
                <a
                  href={requirement.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-primary text-primary font-semibold text-sm"
                >
                  Apply at official portal
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          )}

          {/* Manager approval — completely different body */}
          {requirement.type === 'manager_approval' ? (
            <ApprovalDrawerBody requirement={requirement} tripId={tripId} onClose={onClose} />
          ) : (
            <>
              {/* Centuro CTA or managed banner */}
              {(isManaged || hasManualSteps) && (
                <div className="mb-5">
                  {isManaged ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-border bg-muted px-4 py-3 flex items-center gap-3">
                        <Briefcase size={15} className="text-muted-foreground shrink-0" />
                        <p className="text-sm font-medium">
                          Managed by Centuro
                          {travelCase?.initiated_at && (
                            <span className="text-muted-foreground font-normal">
                              {' · Initiated '}
                              {new Date(travelCase.initiated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </p>
                      </div>
                      {travelCase && (
                        <CaseSummaryCard travelCase={travelCase} tripId={tripId} onClose={onClose} />
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowModal(true)}
                      disabled={isPending}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-primary/30 bg-primary/5 text-left disabled:opacity-60 active:bg-primary/10 transition-colors duration-100"
                    >
                      <div>
                        <p className="text-sm font-semibold text-primary">Initiate with Centuro</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Full end-to-end management</p>
                      </div>
                      <ChevronRight size={16} className="text-primary/60 shrink-0" />
                    </button>
                  )}
                </div>
              )}

              {/* Steps */}
              {sortedTasks.length > 0 && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 pt-3 pb-1">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Steps</h3>
                  </div>
                  <div className="divide-y divide-border/60 px-4">
                    {sortedTasks.map((task, i) => {
                      const stepNumber = i + 1
                      if (task.type === 'automated') {
                        return <AutomatedStep key={task.id} task={task} stepNumber={stepNumber} reqComplete={reqComplete} />
                      }
                      if (task.type === 'generatable') {
                        return (
                          <GeneratableStep
                            key={task.id}
                            task={task}
                            stepNumber={stepNumber}
                            isManaged={isManaged}
                            reqComplete={reqComplete}
                            tripId={tripId}
                            requirementId={requirement.id}
                            documents={requirement.documents}
                            onClose={onClose}
                          />
                        )
                      }
                      if (task.type === 'third_party') {
                        return (
                          <ThirdPartyStep
                            key={task.id}
                            task={task}
                            stepNumber={stepNumber}
                            isManaged={isManaged}
                            reqComplete={reqComplete}
                            tripId={tripId}
                            requirementId={requirement.id}
                            externalLink={requirement.external_link}
                          />
                        )
                      }
                      if (task.type === 'informational') {
                        return <InformationalStep key={task.id} task={task} stepNumber={stepNumber} reqComplete={reqComplete} />
                      }
                      if (task.type === 'primary_action') {
                        return (
                          <PrimaryActionStep
                            key={task.id}
                            task={task}
                            stepNumber={stepNumber}
                            isManaged={isManaged}
                            reqComplete={reqComplete}
                            tripId={tripId}
                            requirementId={requirement.id}
                            requirementName={requirement.name}
                            requirementType={requirement.type}
                            documents={requirement.documents}
                            onClose={onClose}
                          />
                        )
                      }
                      return null
                    })}
                  </div>
                </div>
              )}

              {/* Completion confirmation */}
              {reqComplete && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-status-compliant-bg mt-5">
                  <CheckCircle size={16} className="text-status-compliant shrink-0" />
                  <p className="text-sm font-medium text-status-compliant">Requirement complete</p>
                </div>
              )}
            </>
          )}
        </div>
      </BottomSheet>

      {showModal && (
        <CenturoConfirmModal
          requirementName={requirement.name}
          onConfirm={handleInitiateCenturo}
          onDismiss={() => { setShowModal(false); setModalError(null) }}
          isPending={isPending}
          error={modalError}
        />
      )}
    </>
  )
}

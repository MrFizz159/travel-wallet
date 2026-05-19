'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  X, CheckCircle, ExternalLink, Upload, FileText, ChevronRight,
  Briefcase, ArrowRight, Download, AlertTriangle, Loader2,
} from 'lucide-react'
import {
  uploadEvidence,
  markApplicationSubmitted,
  generateLetter,
  uploadSignedLetter,
} from '@/app/actions/trips'
import { initiateCase } from '@/app/actions/cases'
import { PrimaryButton } from '@/components/ui-kit'
import { cn } from '@/lib/utils'
import type { RequirementRow } from '@/lib/db-types'
import type { RequirementStatus, TravelCase, SubTask } from '@/lib/types'

interface Props {
  requirement: RequirementRow
  tripId: string
  tripStartDate?: string
  travelCase?: TravelCase | null
  onClose: () => void
}

// ── Status chip ───────────────────────────────────────────────────────────────

const STATUS_CHIP: Record<RequirementStatus, { label: string; cls: string }> = {
  not_started: { label: 'Not started', cls: 'bg-muted text-muted-foreground' },
  in_progress:  { label: 'In progress', cls: 'bg-status-incomplete-bg text-status-incomplete' },
  at_risk:      { label: 'At Risk',     cls: 'bg-status-at-risk-bg text-status-at-risk' },
  complete:     { label: 'Complete',    cls: 'bg-status-compliant-bg text-status-compliant' },
}

function StatusChip({ status }: { status: RequirementStatus }) {
  const v = STATUS_CHIP[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold leading-none ${v.cls}`}>
      {v.label}
    </span>
  )
}

// ── Timeline helpers ──────────────────────────────────────────────────────────

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function getStartByDate(
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

// ── Case summary card ─────────────────────────────────────────────────────────

function CaseSummaryCard({ travelCase, tripId, onClose }: {
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
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-foreground" style={{ width: `${travelCase.progress}%` }} />
      </div>
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

// ── At-risk message ───────────────────────────────────────────────────────────

function getAtRiskMessage(
  tripStartDate: string | undefined,
  latestStartDate: string | null,
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
      return `Deadline to start passed — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} required before travel`
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

// ── Step indicator ────────────────────────────────────────────────────────────

type StepState = 'complete' | 'in_progress' | 'not_started'

function StepIndicator({ state, num }: { state: StepState; num: number }) {
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

// ── Automated step ────────────────────────────────────────────────────────────

function AutomatedStep({ task, stepNumber, reqComplete }: {
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

// ── Generatable (letter) step ─────────────────────────────────────────────────

function GeneratableStep({ task, stepNumber, isManaged, reqComplete, tripId, requirementId }: {
  task: SubTask; stepNumber: number; isManaged: boolean; reqComplete: boolean
  tripId: string; requirementId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const hasGenerated = !!task.ai_generated_content
  const hasUploaded = !!task.evidence_document_id || task.approval_status === 'signed'
  const state: StepState = reqComplete || hasUploaded ? 'complete' : hasGenerated ? 'in_progress' : 'not_started'

  function handleGenerate() {
    setError(null)
    const fd = new FormData()
    fd.append('subTaskId', task.id)
    fd.append('requirementId', requirementId)
    fd.append('tripId', tripId)
    startTransition(async () => {
      try { await generateLetter(fd) }
      catch (err) { setError(err instanceof Error ? err.message : 'Failed to generate') }
    })
  }

  function handleDownload() {
    const content = task.ai_generated_content ?? '[Letter content placeholder]'
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${task.name.toLowerCase().replace(/\s+/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleUpload(file: File) {
    setError(null)
    const fd = new FormData()
    fd.append('subTaskId', task.id)
    fd.append('requirementId', requirementId)
    fd.append('tripId', tripId)
    fd.append('file', file)
    startTransition(async () => {
      try { await uploadSignedLetter(fd) }
      catch (err) { setError(err instanceof Error ? err.message : 'Upload failed') }
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
            {!isManaged && (
              <button
                onClick={handleGenerate}
                disabled={isPending}
                className="mt-2 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-semibold min-h-[32px] disabled:opacity-50 flex items-center gap-1"
              >
                {isPending && <Loader2 size={10} className="animate-spin" />}
                {isPending ? 'Generating…' : 'Generate'}
              </button>
            )}
          </>
        )}

        {state === 'in_progress' && (
          <>
            <p className="text-xs text-status-incomplete mt-0.5">
              Downloaded — upload signed copy to complete this step
            </p>
            {!isManaged && (
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={handleDownload}
                  className="text-xs px-3 py-1.5 rounded-full border border-border font-semibold min-h-[32px] flex items-center gap-1"
                >
                  <Download size={11} />
                  Download again
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={e => { const f = e.currentTarget.files?.[0]; if (f) handleUpload(f) }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={isPending}
                  className="text-xs px-3 py-1.5 rounded-full bg-foreground text-background font-semibold min-h-[32px] flex items-center gap-1 disabled:opacity-50"
                >
                  {isPending ? <Loader2 size={10} className="animate-spin" /> : <Upload size={11} />}
                  Upload signed copy
                </button>
              </div>
            )}
          </>
        )}

        {state === 'complete' && (
          <p className="text-xs text-status-compliant mt-0.5">Signed copy uploaded</p>
        )}

        {error && <p className="text-xs text-status-at-risk mt-1">{error}</p>}
      </div>
    </div>
  )
}

// ── Third-party portal step ───────────────────────────────────────────────────

function ThirdPartyStep({ task, stepNumber, isManaged, reqComplete, tripId, requirementId, externalLink }: {
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

// ── Informational step ────────────────────────────────────────────────────────

function InformationalStep({ task, stepNumber, reqComplete }: {
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

// ── Primary action (upload / completion gate) step ────────────────────────────

const AUTH_REQ_TYPES = ['visa', 'eta', 'residence_permit', 'right_to_work']

function PrimaryActionStep({ task, stepNumber, isManaged, reqComplete, tripId, requirementId, requirementName, requirementType, documents, onClose }: {
  task: SubTask; stepNumber: number; isManaged: boolean; reqComplete: boolean
  tripId: string; requirementId: string; requirementName: string; requirementType: string
  documents: RequirementRow['documents']; onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [authName, setAuthName] = useState(requirementName)
  const fileRef = useRef<HTMLInputElement>(null)

  const isAuth = AUTH_REQ_TYPES.includes(requirementType)
  const completionDoc = documents.find(d => d.id === task.evidence_document_id) ?? documents.find(d => d.type === requirementType)

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try { await uploadEvidence(fd); onClose() }
      catch (err) { setError(err instanceof Error ? err.message : 'Upload failed') }
    })
  }

  if (reqComplete || task.status === 'complete') {
    return (
      <div className="flex gap-3 py-3.5">
        <StepIndicator state="complete" num={stepNumber} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-muted-foreground">{task.name}</p>
          {completionDoc && (
            <Link
              href={`/trips/${tripId}/documents/${completionDoc.id}`}
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs text-status-compliant mt-0.5"
            >
              <FileText size={11} />
              {completionDoc.name}
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 py-3.5">
      <StepIndicator state="not_started" num={stepNumber} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{task.name}</p>
        {task.description && !expanded && (
          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
        )}

        {!isManaged && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="mt-2 text-xs px-3 py-1.5 rounded-full bg-foreground text-background font-semibold min-h-[32px] flex items-center gap-1"
          >
            <Upload size={11} />
            Upload confirmation
          </button>
        )}

        {!isManaged && expanded && (
          <form onSubmit={handleUpload} className="mt-3 flex flex-col gap-2.5">
            <input type="hidden" name="requirementId" value={requirementId} />
            <input type="hidden" name="tripId" value={tripId} />
            <input type="hidden" name="requirement_type" value={requirementType} />

            {isAuth && (
              <>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1.5">
                    Authorisation name
                  </label>
                  <input
                    type="text"
                    name="auth_name"
                    value={authName}
                    onChange={e => setAuthName(e.target.value)}
                    required
                    className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1.5">Issue date</label>
                    <input type="date" name="issue_date" required className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1.5">Expiry date</label>
                    <input type="date" name="expiry_date" required className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
              </>
            )}

            <input
              ref={fileRef}
              type="file"
              name="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={e => {
                const file = e.currentTarget.files?.[0] ?? null
                if (isAuth) {
                  setSelectedFile(file)
                } else if (file) {
                  e.currentTarget.form?.requestSubmit()
                }
              }}
            />

            {isAuth ? (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-11 rounded-xl border border-dashed border-border text-sm text-left px-4 truncate"
                >
                  <span className={selectedFile ? 'text-foreground' : 'text-muted-foreground'}>
                    {selectedFile ? selectedFile.name : 'Select confirmation file…'}
                  </span>
                </button>
                {error && <p className="text-xs text-status-at-risk">{error}</p>}
                <PrimaryButton type="submit" disabled={!selectedFile} loading={isPending}>
                  {isPending ? 'Saving…' : 'Save'}
                </PrimaryButton>
              </>
            ) : (
              <>
                {error && <p className="text-xs text-status-at-risk">{error}</p>}
                <PrimaryButton onClick={() => fileRef.current?.click()} loading={isPending}>
                  {!isPending && <Upload size={16} />}
                  {isPending ? 'Uploading…' : 'Upload confirmation'}
                </PrimaryButton>
              </>
            )}

            <button
              type="button"
              onClick={() => { setExpanded(false); setSelectedFile(null) }}
              className="text-xs text-muted-foreground text-center min-h-[36px]"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Centuro confirmation modal ────────────────────────────────────────────────

function CenturoConfirmModal({ requirementName, onConfirm, onDismiss, isPending, error }: {
  requirementName: string; onConfirm: () => void; onDismiss: () => void
  isPending: boolean; error: string | null
}) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onDismiss} />
      <div className="fixed inset-x-0 bottom-0 z-[61] bg-card rounded-t-2xl px-5 pt-5 pb-10">
        <div className="flex justify-center mb-4">
          <div className="w-8 h-1 rounded-full bg-border" />
        </div>
        <h3 className="text-lg font-bold mb-2">Let Centuro handle this</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Our team will manage your {requirementName} end to end — preparation, application, and tracking.
          We'll update you here as things progress.
        </p>
        {error && <p className="text-xs text-status-at-risk mb-3">{error}</p>}
        <PrimaryButton onClick={onConfirm} loading={isPending} className="mb-3">
          Initiate service
        </PrimaryButton>
        <button
          onClick={onDismiss}
          className="w-full text-sm text-muted-foreground flex items-center justify-center min-h-[44px]"
        >
          I'll do this myself
        </button>
      </div>
    </>
  )
}

// ── Main drawer ───────────────────────────────────────────────────────────────

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

  const atRiskMessage = getAtRiskMessage(tripStartDate, requirement.latest_start_date, portalTask)

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
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-background max-h-[85vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 rounded-full bg-border" />
        </div>

        <div className="px-5 pb-10 pt-2">

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
              <div className="bg-muted rounded-xl px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Time required</p>
                <p className="font-semibold text-sm">{requirement.time_required_days} days</p>
              </div>
              {startByDate && (
                <div className="bg-muted rounded-xl px-3 py-3">
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
            <div className="mb-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
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
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-border bg-muted text-left disabled:opacity-60 active:bg-border/60 transition-colors duration-100"
                >
                  <div>
                    <p className="text-sm font-semibold">Let Centuro handle this for you</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Full end-to-end management</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                </button>
              )}
            </div>
          )}

          {/* Steps */}
          {sortedTasks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Steps</h3>
              <div className="divide-y divide-border/60">
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
        </div>
      </div>

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

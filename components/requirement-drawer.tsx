'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X, CheckCircle, ExternalLink, Upload, FileText, ChevronRight, Briefcase, ArrowRight } from 'lucide-react'
import { uploadEvidence } from '@/app/actions/trips'
import { initiateCase } from '@/app/actions/cases'
import { PrimaryButton, SubTaskRow } from '@/components/ui-kit'
import type { RequirementRow } from '@/lib/db-types'
import type { RequirementStatus, TravelCase } from '@/lib/types'

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
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
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
    const iso = base.toISOString().slice(0, 10)
    return formatShortDate(iso)
  }
  return null
}

// ── Case summary card ─────────────────────────────────────────────────────────

function CaseSummaryCard({ travelCase, tripId, onClose }: { travelCase: TravelCase; tripId: string; onClose: () => void }) {
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
        <div
          className="h-full rounded-full bg-foreground"
          style={{ width: `${travelCase.progress}%` }}
        />
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

// ── Path choice ───────────────────────────────────────────────────────────────

function PathChoice({
  onChooseManaged,
  onChooseSelf,
  isPending,
}: {
  onChooseManaged: () => void
  onChooseSelf: () => void
  isPending: boolean
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        How would you like to handle this?
      </p>
      <button
        onClick={onChooseManaged}
        disabled={isPending}
        className="w-full flex flex-col items-start px-4 py-3.5 rounded-xl bg-foreground text-background disabled:opacity-60 text-left"
      >
        <span className="text-sm font-semibold">Get Centuro to handle this</span>
        <span className="text-xs opacity-70 mt-0.5">We manage the application end to end</span>
      </button>
      <button
        onClick={onChooseSelf}
        className="w-full text-sm text-muted-foreground flex items-center justify-center gap-1 min-h-[44px]"
      >
        Apply online yourself
        <ExternalLink size={12} />
      </button>
    </div>
  )
}

// ── Main drawer ───────────────────────────────────────────────────────────────

export function RequirementDrawer({ requirement, tripId, tripStartDate, travelCase, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showSelfApply, setShowSelfApply] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const primaryTask = requirement.sub_tasks.find(t => t.type === 'primary_action' || t.type === 'third_party')
  const isManaged = primaryTask?.service_mode === 'managed'
  const showUploadSection = requirement.status !== 'complete' && !!primaryTask

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setUploadError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await uploadEvidence(fd)
        onClose()
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
      }
    })
  }

  function handleSubTaskUpload(file: File) {
    setUploadError(null)
    const fd = new FormData()
    fd.append('requirementId', requirement.id)
    fd.append('tripId', tripId)
    fd.append('file', file)
    startTransition(async () => {
      try {
        await uploadEvidence(fd)
        onClose()
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
      }
    })
  }

  function handleInitiateCase() {
    if (!primaryTask) return
    const fd = new FormData()
    fd.append('subTaskId', primaryTask.id)
    fd.append('requirementId', requirement.id)
    fd.append('tripId', tripId)
    fd.append('visaType', requirement.name)
    fd.append('destinationCountry', requirement.why_it_applies ?? '')
    startTransition(async () => {
      try {
        const { caseId } = await initiateCase(fd)
        router.push(`/trips/${tripId}/cases/${caseId}`)
        onClose()
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Failed to initiate case')
      }
    })
  }

  const sortedTasks = [...requirement.sub_tasks].sort((a, b) => a.sort_order - b.sort_order)

  const showTimeline = requirement.time_required_days > 0
  const startByDate = showTimeline
    ? getStartByDate(requirement.latest_start_date, tripStartDate, requirement.time_required_days)
    : null

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

          {requirement.why_it_applies && (
            <p className="text-sm text-muted-foreground mb-5">{requirement.why_it_applies}</p>
          )}

          {showTimeline && (
            <div className="grid grid-cols-2 gap-2 mb-5">
              <div className="bg-muted rounded-xl px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Time required
                </p>
                <p className="font-semibold text-sm">{requirement.time_required_days} days</p>
              </div>
              {startByDate && (
                <div className="bg-muted rounded-xl px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Start by
                  </p>
                  <p className="font-semibold text-sm">{startByDate}</p>
                </div>
              )}
            </div>
          )}

          {sortedTasks.length > 0 && (
            <div className="mb-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Steps</h3>
              {sortedTasks.map(task => {
                const uiType =
                  task.type === 'third_party' ? 'primary_action' : task.type as 'automated' | 'generatable' | 'primary_action'
                return (
                  <SubTaskRow
                    key={task.id}
                    name={task.name}
                    type={uiType}
                    status={task.status}
                    isPending={isPending}
                    onGenerate={() => {}}
                    onGetStarted={() => {}}
                    onUpload={uiType === 'primary_action' && !isManaged ? handleSubTaskUpload : undefined}
                    onViewCase={task.case_id ? () => { router.push(`/trips/${tripId}/cases/${task.case_id}`); onClose() } : undefined}
                  />
                )
              })}
            </div>
          )}

          {requirement.guidance && !isManaged && (
            <div className="mb-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">How to apply</h3>
              <p className="text-sm">{requirement.guidance}</p>
            </div>
          )}

          {requirement.what_you_need && requirement.what_you_need.length > 0 && !isManaged && (
            <div className="mb-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">What you need</h3>
              <ul className="flex flex-col gap-1">
                {requirement.what_you_need.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground shrink-0 mt-0.5">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Upload / case section */}
          {showUploadSection && (
            <>
              {isManaged && travelCase ? (
                /* Case in progress — show summary card */
                <CaseSummaryCard travelCase={travelCase} tripId={tripId} onClose={onClose} />
              ) : showSelfApply ? (
                /* Self-apply path — show upload form + option to switch */
                <div className="space-y-3">
                  {requirement.external_link && (
                    <a
                      href={requirement.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-xl border border-border bg-transparent font-semibold text-sm text-foreground transition-colors duration-100 active:bg-muted"
                    >
                      Apply online
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <form onSubmit={handleUpload}>
                    <input type="hidden" name="requirementId" value={requirement.id} />
                    <input type="hidden" name="tripId" value={tripId} />
                    <input
                      ref={fileRef}
                      type="file"
                      name="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => {
                        if (e.currentTarget.files?.[0]) {
                          e.currentTarget.form?.requestSubmit()
                        }
                      }}
                    />
                    {uploadError && (
                      <p className="text-sm text-status-at-risk mb-2">{uploadError}</p>
                    )}
                    <PrimaryButton
                      onClick={() => fileRef.current?.click()}
                      loading={isPending}
                    >
                      {!isPending && <Upload size={16} />}
                      {isPending ? 'Uploading…' : 'Upload confirmation'}
                    </PrimaryButton>
                  </form>
                  <button
                    onClick={handleInitiateCase}
                    disabled={isPending}
                    className="w-full text-xs text-muted-foreground flex items-center justify-center gap-1 min-h-[44px]"
                  >
                    Changed your mind? Let Centuro handle this
                    <ChevronRight size={12} />
                  </button>
                </div>
              ) : (
                /* No choice yet — show path selection */
                <>
                  {uploadError && (
                    <p className="text-sm text-status-at-risk mb-2">{uploadError}</p>
                  )}
                  <PathChoice
                    onChooseManaged={handleInitiateCase}
                    onChooseSelf={() => setShowSelfApply(true)}
                    isPending={isPending}
                  />
                </>
              )}
            </>
          )}

          {requirement.status === 'complete' && (
            <div className="flex flex-col gap-3">
              {requirement.documents.length > 0 && (
                <div className="flex flex-col gap-2">
                  {requirement.documents.map(doc => (
                    <Link
                      key={doc.id}
                      href={`/trips/${tripId}/documents/${doc.id}`}
                      onClick={onClose}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card"
                    >
                      <FileText size={16} className="text-muted-foreground shrink-0" />
                      <span className="text-sm flex-1 min-w-0 truncate">{doc.name}</span>
                      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-status-compliant-bg">
                <CheckCircle size={16} className="text-status-compliant shrink-0" />
                <p className="text-sm font-medium text-status-compliant">Requirement complete</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { countryImageUrl } from '@/lib/countries'
import { runAssessment } from '@/lib/assessment/stub'
import { activateTrip, uploadEvidence } from '@/app/actions/trips'
import { StatusBadge } from '@/components/status-badge'
import { RequirementDrawer } from '@/components/requirement-drawer'
import { TravelEssentialsSection } from '@/components/travel-essentials-section'
import { HistoricalDocSection } from '@/components/historical-doc-section'
import { effectiveStatus } from '@/lib/compliance'
import { cn } from '@/lib/utils'
import {
  Card,
  Divider,
  SectionHeader,
  RequirementRow as RequirementRowCard,
  SubTaskRow,
  PrimaryButton,
} from '@/components/ui-kit'
import type { RequirementStatusValue } from '@/components/ui-kit'
import type { TripDetail, RequirementRow } from '@/lib/db-types'
import type { SubTask } from '@/lib/types'

interface Props {
  trip: TripDetail
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${new Date(start + 'T00:00:00').toLocaleDateString('en-GB', opts)} – ${new Date(end + 'T00:00:00').toLocaleDateString('en-GB', opts)}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ── Compliance chip (hero overlay) ───────────────────────────────────────────

function ComplianceChip({ status }: { status: string | null; }) {
  if (!status) return null
  const variants: Record<string, { label: string; cls: string; icon: ReactNode }> = {
    compliant:  { label: 'Ready',      cls: 'bg-status-compliant-bg text-status-compliant',   icon: <CheckCircle size={14} /> },
    incomplete: { label: 'Incomplete', cls: 'bg-status-incomplete-bg text-status-incomplete', icon: <AlertTriangle size={14} /> },
    at_risk:    { label: 'At Risk',    cls: 'bg-status-at-risk-bg text-status-at-risk',       icon: <AlertTriangle size={14} /> },
  }
  const v = variants[status] ?? { label: status, cls: 'bg-card/90 text-muted-foreground', icon: null }
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold leading-none shadow-sm', v.cls)}>
      {v.icon}
      {v.label}
    </span>
  )
}

function durationDays(start: string, end: string) {
  return Math.round((new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / 86400000) + 1
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(dateStr + 'T00:00:00').getTime() - today.getTime()) / 86400000)
}

function latestStartLabel(startDate: string, daysRequired: number): string {
  const d = new Date(startDate + 'T00:00:00')
  d.setDate(d.getDate() - daysRequired)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ── Sub-task connected row ────────────────────────────────────────────────────

const AUTH_REQ_TYPES = ['visa', 'eta', 'residence_permit', 'right_to_work']

function SubTaskRowConnected({
  task,
  requirementId,
  requirementType,
  tripId,
  onOpenDrawer,
}: {
  task: SubTask
  requirementId: string
  requirementType: string
  tripId: string
  onOpenDrawer: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [uploadError, setUploadError] = useState<string | null>(null)

  function handleUpload(file: File) {
    setUploadError(null)
    const fd = new FormData()
    fd.append('requirementId', requirementId)
    fd.append('tripId', tripId)
    fd.append('file', file)
    startTransition(async () => {
      try {
        await uploadEvidence(fd)
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
      }
    })
  }

  const uiType = (task.type === 'third_party' ? 'primary_action' : task.type) as 'automated' | 'generatable' | 'primary_action'
  const isManaged = task.service_mode === 'managed'
  const isAuthReq = AUTH_REQ_TYPES.includes(requirementType)

  return (
    <div>
      {uploadError && (
        <p className="text-xs text-status-at-risk px-4 pb-1">{uploadError}</p>
      )}
      <SubTaskRow
        name={task.name}
        type={uiType}
        status={task.status}
        onGenerate={onOpenDrawer}
        onGetStarted={onOpenDrawer}
        onUpload={isManaged || isAuthReq ? undefined : handleUpload}
        onViewCase={task.case_id ? () => router.push(`/trips/${tripId}/cases/${task.case_id}`) : undefined}
        isPending={isPending}
      />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function TripDetailView({ trip }: Props) {
  const [openReq, setOpenReq] = useState<RequirementRow | null>(null)
  const duration = durationDays(trip.start_date, trip.end_date)
  const purposeLabel = trip.purpose.charAt(0).toUpperCase() + trip.purpose.slice(1)

  // ── Shared hero section ──────────────────────────────────────────────────────
  const heroSection = (
    <>
      {/* Full-bleed destination image (breaks out of parent px-4) */}
      <div className="relative -mx-4 h-56 bg-muted overflow-hidden rounded-b-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={countryImageUrl(trip.destination_country)}
          alt={trip.destination_country}
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay — fades image into content below */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        {/* Status chip overlaid on gradient */}
        {trip.state === 'active' && (
          <div className="absolute bottom-3 left-4">
            <ComplianceChip status={trip.compliance_status} />
          </div>
        )}
        {trip.state === 'exploratory' && (
          <div className="absolute bottom-3 left-4">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-card/90 text-muted-foreground shadow-sm">
              Exploratory
            </span>
          </div>
        )}
      </div>

      {/* Destination header */}
      <h1 className="text-3xl font-extrabold leading-tight mt-4 mb-3">
        {trip.destination_country}
      </h1>

      {/* Date boxes — Arrival / Departure side-by-side */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-card border border-border rounded-xl px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Arrival</p>
          <p className="font-semibold text-sm">{formatDate(trip.start_date)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Departure</p>
          <p className="font-semibold text-sm">{formatDate(trip.end_date)}</p>
        </div>
      </div>

      {/* Purpose + duration + origin (historical trips only) */}
      <p className="text-sm text-muted-foreground capitalize mb-5">
        {purposeLabel} · {duration} day{duration !== 1 ? 's' : ''}
        {trip.origin_country && ` · From ${trip.origin_country}`}
      </p>
    </>
  )

  // ── Exploratory ─────────────────────────────────────────────────────────────
  if (trip.state === 'exploratory') {
    const assessment = runAssessment(trip.destination_country_code)
    const hasRequirements = assessment.requirements.length > 0

    return (
      <div>
        {heroSection}

        {hasRequirements && (
          <div className="flex flex-col gap-4 mb-6">
            <SectionHeader label="Requirements" />
            {assessment.requirements.map((req, i) => {
              return (
                <Card key={i}>
                  {/* Header */}
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold flex-1">{req.name}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{req.why_it_applies}</p>
                    {req.time_required_days > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Allow {req.time_required_days} days · start by {latestStartLabel(trip.start_date, req.time_required_days)}
                      </p>
                    )}
                  </div>

                  {/* Steps */}
                  {req.sub_tasks.length > 0 && (
                    <div className="border-t border-border px-4 py-3 flex flex-col gap-2">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Steps</p>
                      {req.sub_tasks.map((task, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <div className={cn('w-3.5 h-3.5 rounded-full shrink-0', task.type === 'automated' ? 'border border-muted-foreground/40' : 'border-2 border-border')} />
                          <span className="text-sm flex-1">{task.name}</span>
                          {task.type === 'automated' && (
                            <span className="text-xs text-muted-foreground shrink-0">Auto</span>
                          )}
                          {task.type === 'generatable' && (
                            <span className="text-xs text-muted-foreground shrink-0">Generated for you</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* What you need */}
                  {req.what_you_need && req.what_you_need.length > 0 && (
                    <div className="border-t border-border px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">What you need</p>
                      <ul className="flex flex-col gap-1">
                        {req.what_you_need.map((item, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm">
                            <span className="text-muted-foreground shrink-0 mt-0.5">·</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {/* Already covered */}
        <div className="flex flex-col gap-3 mb-6">
          <SectionHeader label="Already covered" />
          <Card className="px-4 py-3 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-status-compliant shrink-0" />
              <span className="text-sm">Passport validity — checked automatically on activation</span>
            </div>
            {!hasRequirements && (
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-status-compliant shrink-0" />
                <span className="text-sm">No visa or pre-travel authorisation required</span>
              </div>
            )}
          </Card>
        </div>

        <form action={activateTrip}>
          <input type="hidden" name="tripId" value={trip.id} />
          <PrimaryButton type="submit">Activate trip</PrimaryButton>
        </form>
      </div>
    )
  }

  // ── Active ───────────────────────────────────────────────────────────────────
  if (trip.state === 'active') {
    const reqStatusOrder: Record<string, number> = { at_risk: 0, not_started: 1, in_progress: 2, complete: 3 }
    const sortedReqs = [...trip.requirements].sort((a, b) =>
      (reqStatusOrder[effectiveStatus(a)] ?? 4) - (reqStatusOrder[effectiveStatus(b)] ?? 4)
    )

    return (
      <div>
        {heroSection}

        {sortedReqs.length > 0 && (
          <section className="mb-6">
            <SectionHeader label="Compliance" />
            <div className="flex flex-col gap-3">
              {sortedReqs.map(req => {
                const status = effectiveStatus(req) as RequirementStatusValue
                const sortedSubTasks = [...req.sub_tasks].sort((a, b) => a.sort_order - b.sort_order)
                const completedCount = sortedSubTasks.filter(t => t.status === 'complete').length
                const totalCount = sortedSubTasks.length

                return (
                  <Card key={req.id}>
                    <RequirementRowCard
                      name={req.name}
                      status={status}
                      latestStartDate={req.latest_start_date ?? undefined}
                      timeRequiredDays={req.time_required_days}
                      completedCount={completedCount}
                      totalCount={totalCount}
                      onClick={() => setOpenReq(req)}
                    />
                    {sortedSubTasks.length > 0 && (
                      <>
                        <Divider />
                        <div className="divide-y divide-border">
                          {sortedSubTasks.map(task => (
                            <SubTaskRowConnected
                              key={task.id}
                              task={task}
                              requirementId={req.id}
                              requirementType={req.type}
                              tripId={trip.id}
                              onOpenDrawer={() => setOpenReq(req)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        {sortedReqs.length === 0 && (
          <div className="flex items-start gap-3 mb-6 px-4 py-3 rounded-xl bg-status-compliant-bg">
            <CheckCircle size={18} className="text-status-compliant shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-status-compliant">No action required</p>
              <p className="text-sm text-muted-foreground mt-0.5">Your existing documents cover this trip.</p>
            </div>
          </div>
        )}

        <TravelEssentialsSection
          documents={trip.documents.filter(d => d.layer === 'travel_essentials')}
          tripId={trip.id}
        />

        {openReq && (
          <RequirementDrawer
            requirement={openReq}
            tripId={trip.id}
            tripStartDate={trip.start_date}
            travelCase={trip.cases?.find(c => c.requirement_id === openReq.id) ?? null}
            onClose={() => setOpenReq(null)}
          />
        )}
      </div>
    )
  }

  // ── Completed ────────────────────────────────────────────────────────────────
  if (trip.state === 'completed') {
    return (
      <div>
        {heroSection}

        {trip.requirements.length > 0 && (
          <section className="mb-6">
            <SectionHeader label="Compliance" />
            <div className="flex flex-col gap-2">
              {trip.requirements.map(req => (
                <Card key={req.id} className="flex items-center gap-3 px-4 py-3">
                  <CheckCircle size={16} className="text-status-compliant shrink-0" />
                  <p className="text-sm font-semibold flex-1 truncate">{req.name}</p>
                  <span className="text-xs text-status-compliant font-semibold shrink-0">Done</span>
                </Card>
              ))}
            </div>
          </section>
        )}

        {trip.is_historical ? (
          <HistoricalDocSection
            documents={trip.documents}
            tripId={trip.id}
            destinationCountryCode={trip.destination_country_code}
            destinationCountry={trip.destination_country}
          />
        ) : (
          <TravelEssentialsSection
            documents={trip.documents.filter(d => d.layer === 'travel_essentials')}
            tripId={trip.id}
          />
        )}
      </div>
    )
  }

  // ── Cancelled ────────────────────────────────────────────────────────────────
  return (
    <div>
      {heroSection}
      <p className="text-sm text-muted-foreground">This trip was cancelled.</p>
    </div>
  )
}

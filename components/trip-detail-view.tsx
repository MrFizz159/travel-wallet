'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, AlertTriangle, ArrowLeft, MoreVertical } from 'lucide-react'
import { countryFlag } from '@/lib/countries'
import { runAssessment } from '@/lib/assessment/stub'
import { activateTrip } from '@/app/actions/trips'
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
import type { TripDetail, LegDetail, RequirementRow, TransitWithRequirement } from '@/lib/db-types'
import type { SubTask } from '@/lib/types'

interface Props {
  trip: TripDetail
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function durationDays(start: string, end: string) {
  return Math.max(1, Math.round((new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / 86400000) + 1)
}

function tripTitle(legs: { destination_country: string }[]) {
  return legs.map(l => l.destination_country).join(' + ')
}

// ── Compliance chip (hero overlay) ───────────────────────────────────────────

function ComplianceChip({ status }: { status: string | null }) {
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

// ── Transit section header (shared) ──────────────────────────────────────────

function TransitSectionHeader({ transit }: { transit: TransitWithRequirement }) {
  const flag = countryFlag(transit.transit_country_code)
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-lg">{flag}</span>
      <div className="flex-1">
        <p className="font-semibold">Transit: {transit.transit_country}</p>
        {transit.transit_date && (
          <p className="text-xs text-muted-foreground">{formatDate(transit.transit_date)}</p>
        )}
      </div>
    </div>
  )
}

// ── Transit info row (no authorisation required, or unchecked) ───────────────

function TransitInfoRow({ transit }: { transit: TransitWithRequirement }) {
  const noVisaRequired = transit.visa_required === false

  return (
    <section className="mb-6">
      <TransitSectionHeader transit={transit} />
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border bg-muted/30">
        <div className="flex-1 min-w-0">
          {noVisaRequired && (
            <p className="text-sm text-status-compliant font-semibold">No authorisation required for this transit.</p>
          )}
          {!noVisaRequired && (
            <p className="text-sm text-muted-foreground">Transit visa check pending.</p>
          )}
        </div>
        <div className="shrink-0">
          {noVisaRequired && <CheckCircle size={18} className="text-status-compliant" />}
        </div>
      </div>
    </section>
  )
}

// ── Transit section (visa/eTA required — full requirement card) ───────────────

function TransitSection({
  transit,
  tripId,
  onOpenReq,
}: {
  transit: TransitWithRequirement
  tripId: string
  onOpenReq: (req: RequirementRow, startDate: string) => void
}) {
  const req = transit.requirement!
  const status = effectiveStatus(req) as RequirementStatusValue
  const sortedSubTasks = [...req.sub_tasks].sort((a, b) => a.sort_order - b.sort_order)
  const completedCount = sortedSubTasks.filter(t => t.status === 'complete').length
  const totalCount = sortedSubTasks.length
  const startDate = transit.transit_date ?? ''

  return (
    <section className="mb-6">
      <TransitSectionHeader transit={transit} />
      <div className="flex flex-col gap-3">
        <Card>
          <RequirementRowCard
            name={req.name}
            status={status}
            latestStartDate={req.latest_start_date ?? undefined}
            timeRequiredDays={req.time_required_days}
            completedCount={completedCount}
            totalCount={totalCount}
            onClick={() => onOpenReq(req, startDate)}
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
                    requirementStatus={req.status}
                    tripId={tripId}
                    onOpenDrawer={() => onOpenReq(req, startDate)}
                  />
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </section>
  )
}

// ── Sub-task connected row ────────────────────────────────────────────────────

function SubTaskRowConnected({
  task,
  requirementId,
  requirementType,
  requirementStatus,
  tripId,
  onOpenDrawer,
}: {
  task: SubTask
  requirementId: string
  requirementType: string
  requirementStatus: string
  tripId: string
  onOpenDrawer: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <SubTaskRow
      name={task.name}
      type={task.type}
      status={task.status}
      onGenerate={onOpenDrawer}
      onGetStarted={onOpenDrawer}
      onViewCase={task.case_id ? () => router.push(`/trips/${tripId}/cases/${task.case_id}`) : undefined}
      isPending={isPending}
    />
  )
}

// ── Leg section (active state) ────────────────────────────────────────────────

function LegSection({
  leg,
  tripId,
  cases,
  onOpenReq,
}: {
  leg: LegDetail
  tripId: string
  cases: TripDetail['cases']
  onOpenReq: (req: RequirementRow, legStartDate: string) => void
}) {
  const reqStatusOrder: Record<string, number> = { at_risk: 0, not_started: 1, in_progress: 2, complete: 3 }
  const sortedReqs = [...leg.requirements].sort((a, b) =>
    (reqStatusOrder[effectiveStatus(a)] ?? 4) - (reqStatusOrder[effectiveStatus(b)] ?? 4)
  )
  const purposeLabel = leg.purpose.charAt(0).toUpperCase() + leg.purpose.slice(1)
  const duration = durationDays(leg.start_date, leg.end_date)

  return (
    <section className="mb-6">
      {/* Leg header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{countryFlag(leg.destination_country_code)}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold">{leg.destination_country}</p>
            {leg.compliance_status && <ComplianceChip status={leg.compliance_status} />}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDate(leg.start_date)} – {formatDate(leg.end_date)} · {duration} day{duration !== 1 ? 's' : ''} · {purposeLabel}
          </p>
        </div>
      </div>

      {sortedReqs.length > 0 && (
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
                  onClick={() => onOpenReq(req, leg.start_date)}
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
                          requirementStatus={req.status}
                          tripId={tripId}
                          onOpenDrawer={() => onOpenReq(req, leg.start_date)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {sortedReqs.length === 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-status-compliant-bg">
          <CheckCircle size={18} className="text-status-compliant shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-status-compliant">No action required</p>
            <p className="text-sm text-muted-foreground mt-0.5">Your existing documents cover this destination.</p>
          </div>
        </div>
      )}
    </section>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function TripDetailView({ trip }: Props) {
  const [openReq, setOpenReq] = useState<RequirementRow | null>(null)
  const [openReqLegStart, setOpenReqLegStart] = useState<string | undefined>(undefined)

  const legs = trip.legs ?? []
  const firstLeg = legs[0]
  const lastLeg = legs[legs.length - 1]
  const title = tripTitle(legs)
  const tripStartDate = firstLeg?.start_date
  const tripEndDate = lastLeg?.end_date

  function handleOpenReq(req: RequirementRow, legStartDate: string) {
    setOpenReq(req)
    setOpenReqLegStart(legStartDate)
  }

  // ── Shared hero section ──────────────────────────────────────────────────────
  const heroSection = (
    <div className="relative -mx-4 bg-[#2D1A5C] overflow-hidden rounded-b-3xl mb-5">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '14px 14px' }}
      />
      <div className="relative z-10 flex flex-col gap-2.5 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link
            href="/trips"
            className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white"
          >
            <ArrowLeft size={18} />
          </Link>
          <button className="w-10 h-10 flex items-center justify-center text-white/40" aria-label="More options">
            <MoreVertical size={18} />
          </button>
        </div>

        {/* Flags + title + status */}
        <div className="flex items-center gap-2 flex-wrap">
          {legs.slice(0, 3).map(l => (
            <span
              key={l.id}
              className="text-lg leading-none w-7 h-5 rounded-sm border border-white/25 overflow-hidden inline-flex items-center justify-center shrink-0"
              role="img"
              aria-label={l.destination_country}
            >
              {countryFlag(l.destination_country_code)}
            </span>
          ))}
          <span className="text-[22px] font-extrabold text-white leading-tight">{title}</span>
          {trip.state === 'active' && <ComplianceChip status={trip.compliance_status} />}
          {trip.state === 'exploratory' && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 text-white">
              Exploratory
            </span>
          )}
          {trip.state === 'completed' && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 text-white">
              Completed
            </span>
          )}
          {trip.state === 'cancelled' && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/15 text-white/70">
              Cancelled
            </span>
          )}
        </div>

        {/* Date chips */}
        <div className="flex items-center gap-1.5 flex-wrap pb-1">
          {tripStartDate && (
            <span className="bg-white/15 rounded-md px-2 py-1 text-xs font-semibold text-white">
              {formatDate(tripStartDate)}
            </span>
          )}
          {tripStartDate && tripEndDate && <span className="text-white/40 text-xs">›</span>}
          {tripEndDate && (
            <span className="bg-white/15 rounded-md px-2 py-1 text-xs font-semibold text-white">
              {formatDate(tripEndDate)}
            </span>
          )}
          {legs.length > 1 && (
            <>
              <div className="w-px h-3.5 bg-white/20 mx-0.5 shrink-0" />
              <span className="text-xs text-white/60">{legs.length} destinations</span>
            </>
          )}
        </div>
      </div>
    </div>
  )

  // ── Exploratory ─────────────────────────────────────────────────────────────
  if (trip.state === 'exploratory') {
    return (
      <div>
        {heroSection}

        {legs.map((leg, idx) => {
          const assessment = runAssessment(leg.destination_country_code)
          const hasRequirements = assessment.requirements.length > 0
          return (
            <div key={leg.id} className="mb-6">
              {/* Leg label */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{countryFlag(leg.destination_country_code)}</span>
                <p className="font-semibold">{leg.destination_country}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(leg.start_date)} – {formatDate(leg.end_date)}
                </p>
              </div>

              {hasRequirements && (
                <div className="flex flex-col gap-4">
                  <SectionHeader label="Requirements" />
                  {assessment.requirements.map((req, i) => (
                    <Card key={i}>
                      <div className="px-4 pt-4 pb-3">
                        <p className="font-semibold">{req.name}</p>
                        <p className="text-sm text-muted-foreground">{req.why_it_applies}</p>
                        {req.time_required_days > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Allow {req.time_required_days} days · start by{' '}
                            {(() => {
                              const d = new Date(leg.start_date + 'T00:00:00')
                              d.setDate(d.getDate() - req.time_required_days)
                              return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                            })()}
                          </p>
                        )}
                      </div>
                      {req.sub_tasks.length > 0 && (
                        <div className="border-t border-border px-4 py-3 flex flex-col gap-2">
                          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Steps</p>
                          {req.sub_tasks.map((task, j) => (
                            <div key={j} className="flex items-center gap-2">
                              <div className={cn('w-3.5 h-3.5 rounded-full shrink-0', task.type === 'automated' ? 'border border-muted-foreground/40' : 'border-2 border-border')} />
                              <span className="text-sm flex-1">{task.name}</span>
                              {task.type === 'automated' && <span className="text-xs text-muted-foreground shrink-0">Auto</span>}
                              {task.type === 'generatable' && <span className="text-xs text-muted-foreground shrink-0">Generated for you</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              {!hasRequirements && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-status-compliant-bg mb-2">
                  <CheckCircle size={16} className="text-status-compliant shrink-0" />
                  <p className="text-sm text-status-compliant">No visa or authorisation required for this destination.</p>
                </div>
              )}
            </div>
          )
        })}

        <div className="flex flex-col gap-3 mb-6">
          <SectionHeader label="Also covered on activation" />
          <Card className="px-4 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-status-compliant shrink-0" />
              <span className="text-sm">Passport validity — checked automatically</span>
            </div>
          </Card>
        </div>

        <form action={activateTrip}>
          <input type="hidden" name="tripId" value={trip.id} />
          <PrimaryButton type="submit">Get Started</PrimaryButton>
        </form>
      </div>
    )
  }

  // ── Active ───────────────────────────────────────────────────────────────────
  if (trip.state === 'active') {
    const transitsByOrder = Object.fromEntries((trip.transits ?? []).map(t => [t.sort_order, t]))

    return (
      <div>
        {heroSection}

        <SectionHeader label="Compliance" />

        {/* Chronological itinerary: transit → leg → transit → leg → transit */}
        {legs.map((leg, idx) => (
          <div key={leg.id}>
            {/* Transit before this leg */}
            {transitsByOrder[idx] && (
              transitsByOrder[idx].visa_required === true && transitsByOrder[idx].requirement
                ? <TransitSection transit={transitsByOrder[idx]} tripId={trip.id} onOpenReq={handleOpenReq} />
                : <TransitInfoRow transit={transitsByOrder[idx]} />
            )}

            <LegSection
              leg={leg}
              tripId={trip.id}
              cases={trip.cases}
              onOpenReq={handleOpenReq}
            />
          </div>
        ))}

        {/* Transit after last leg */}
        {transitsByOrder[legs.length] && (
          transitsByOrder[legs.length].visa_required === true && transitsByOrder[legs.length].requirement
            ? <TransitSection transit={transitsByOrder[legs.length]} tripId={trip.id} onOpenReq={handleOpenReq} />
            : <TransitInfoRow transit={transitsByOrder[legs.length]} />
        )}

        {/* Manager approval — trip-level */}
        {trip.tripRequirements && trip.tripRequirements.length > 0 && (
          <section className="mb-6">
            <SectionHeader label="Trip approval" />
            <div className="flex flex-col gap-3">
              {trip.tripRequirements.map(req => {
                const status = effectiveStatus(req) as RequirementStatusValue
                return (
                  <Card key={req.id}>
                    <RequirementRowCard
                      name={req.name}
                      status={status}
                      latestStartDate={req.latest_start_date ?? undefined}
                      timeRequiredDays={req.time_required_days}
                      completedCount={req.status === 'complete' ? 1 : 0}
                      totalCount={1}
                      onClick={() => handleOpenReq(req, tripStartDate ?? '')}
                    />
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        <TravelEssentialsSection
          documents={trip.documents.filter(d => d.layer === 'travel_essentials')}
          tripId={trip.id}
        />

        {openReq && (
          <RequirementDrawer
            requirement={openReq}
            tripId={trip.id}
            tripStartDate={openReqLegStart}
            travelCase={trip.cases?.find(c => c.requirement_id === openReq.id) ?? null}
            onClose={() => { setOpenReq(null); setOpenReqLegStart(undefined) }}
          />
        )}
      </div>
    )
  }

  // ── Completed ────────────────────────────────────────────────────────────────
  if (trip.state === 'completed') {
    const allRequirements = [...legs.flatMap(l => l.requirements), ...(trip.tripRequirements ?? [])]
    return (
      <div>
        {heroSection}

        {allRequirements.length > 0 && (
          <section className="mb-6">
            <SectionHeader label="Compliance" />
            <div className="flex flex-col gap-2">
              {allRequirements.map(req => (
                <Card key={req.id} className="flex items-center gap-3 px-4 py-3">
                  <CheckCircle size={16} className="text-status-compliant shrink-0" />
                  <p className="text-sm font-semibold flex-1 truncate">{req.name}</p>
                  <span className="text-xs text-status-compliant font-semibold shrink-0">Done</span>
                </Card>
              ))}
            </div>
          </section>
        )}

        {trip.is_historical && firstLeg ? (
          <HistoricalDocSection
            documents={trip.documents}
            tripId={trip.id}
            destinationCountryCode={firstLeg.destination_country_code}
            destinationCountry={firstLeg.destination_country}
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

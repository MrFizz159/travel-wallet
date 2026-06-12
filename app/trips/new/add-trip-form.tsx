'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, CheckCircle, Loader2, Plus, X } from 'lucide-react'
import { COUNTRIES, countryFlag } from '@/lib/countries'
import type { AssessmentOutput } from '@/lib/assessment/stub'
import { previewAssessment } from '@/app/actions/assessment'
import { createTrip, createAndActivateTrip, previewTransitCheck } from '@/app/actions/trips'
import type { TransitCheckResult } from '@/lib/assessment/transit'
import { Field, Input, PrimaryButton, SecondaryButton, SectionHeader, Select } from '@/components/ui-kit'
import { durationDays } from '@/lib/dates'
import { cn } from '@/lib/utils'

interface PassportOption {
  id: string
  issuing_country: string
  nationality: string
  expiry_date: string
  is_primary: boolean
}

interface Props {
  passports: PassportOption[]
}

type LegDraft = {
  id: string
  countryCode: string
  startDate: string
  endDate: string
  purpose: string
  passportId: string
  assessment: AssessmentOutput | null
}

type TransitDraft = {
  sortOrder: number
  countryCode: string
  transitDate: string
  checkResult: TransitCheckResult | null
  isChecking: boolean
}

const PURPOSES = [
  { value: 'business', label: 'Business' },
  { value: 'tourism', label: 'Tourism' },
  { value: 'education', label: 'Education' },
  { value: 'relocation', label: 'Relocation' },
  { value: 'other', label: 'Other' },
]

function today() {
  return new Date().toISOString().split('T')[0]
}

function isHistoricalDate(dateStr: string) {
  return dateStr < today()
}

function formatChipDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function latestStartLabel(startDate: string, daysRequired: number): string {
  const d = new Date(startDate + 'T00:00:00')
  d.setDate(d.getDate() - daysRequired)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function newLeg(primaryPassportId: string): LegDraft {
  return { id: Math.random().toString(36).slice(2), countryCode: '', startDate: '', endDate: '', purpose: 'business', passportId: primaryPassportId, assessment: null }
}

function tripTitle(legs: LegDraft[]) {
  const names = legs.map(l => COUNTRIES.find(c => c.code === l.countryCode)?.name).filter(Boolean)
  return names.length > 0 ? names.join(' + ') : 'New trip'
}

// ── Transit slot (itinerary step) ───────────────────────────────────────────
// Module scope, not inside AddTripForm: inline definitions remount on every
// parent state change, and the country/date inputs lose focus while typing.

function TransitSlot({
  sortOrder,
  label,
  transit,
  expanded,
  onToggle,
  onUpdate,
  onRemove,
}: {
  sortOrder: number
  label: string
  transit: TransitDraft | undefined
  expanded: boolean
  onToggle: (sortOrder: number) => void
  onUpdate: (sortOrder: number, patch: { countryCode?: string; transitDate?: string }) => void
  onRemove: (sortOrder: number) => void
}) {
  const isExpanded = expanded || !!transit

  return (
    <div className="flex flex-col items-center py-1">
      <div className="w-px h-4 bg-border" />
      {isExpanded ? (
        <div className="w-full border border-dashed border-border rounded-xl px-4 py-3 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <button
              type="button"
              onClick={() => onRemove(sortOrder)}
              className="text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <Select
              value={transit?.countryCode ?? ''}
              onChange={e => onUpdate(sortOrder, { countryCode: e.target.value })}
            >
              <option value="">Transit country</option>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{countryFlag(c.code)} {c.name}</option>
              ))}
            </Select>
            <Input
              type="date"
              value={transit?.transitDate ?? ''}
              placeholder="Transit date (optional)"
              onChange={e => onUpdate(sortOrder, { transitDate: e.target.value })}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onToggle(sortOrder)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground py-1 min-h-[44px] px-2"
        >
          <Plus size={12} />
          Add transit stop {label.toLowerCase().includes('home') ? 'before departure' : label.toLowerCase().includes('return') ? 'on return' : 'between destinations'}
        </button>
      )}
      <div className="w-px h-4 bg-border" />
    </div>
  )
}

// ── Transit result card (review step) ───────────────────────────────────────

function TransitResultCard({ transit, className }: { transit: TransitDraft; className?: string }) {
  const countryName = COUNTRIES.find(c => c.code === transit.countryCode)?.name ?? transit.countryCode
  const r = transit.checkResult

  // Loading state
  if (transit.isChecking) {
    return (
      <div className={cn('flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/50 border border-dashed border-border', className)}>
        <span className="text-base shrink-0">{countryFlag(transit.countryCode)}</span>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 size={10} className="animate-spin" />
          Checking transit visa requirement…
        </p>
      </div>
    )
  }

  // Pending / not yet checked
  if (!r) {
    return (
      <div className={cn('flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/50 border border-dashed border-border', className)}>
        <span className="text-base shrink-0">{countryFlag(transit.countryCode)}</span>
        <p className="text-xs text-muted-foreground">Transit visa check pending…</p>
      </div>
    )
  }

  // No authorisation required — lightweight informational row
  if (!r.visa_required) {
    return (
      <div className={cn('flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/50 border border-dashed border-border', className)}>
        <span className="text-base shrink-0">{countryFlag(transit.countryCode)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">Transit: {countryName}</p>
          {transit.transitDate && (
            <p className="text-xs text-muted-foreground">{formatChipDate(transit.transitDate)}</p>
          )}
          <p className="text-xs text-status-compliant font-semibold mt-0.5">No authorisation required.</p>
        </div>
        <CheckCircle size={16} className="text-status-compliant shrink-0" />
      </div>
    )
  }

  // Authorisation required — full requirement card matching destination leg cards
  const days = r.time_required_days ?? 0
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="rounded-xl border border-border bg-card px-4 py-4">
        {/* Row 1: country + date */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base shrink-0">{countryFlag(transit.countryCode)}</span>
          <p className="text-xs font-semibold flex-1">Transit: {countryName}</p>
          {transit.transitDate && (
            <span className="text-xs text-muted-foreground">{formatChipDate(transit.transitDate)}</span>
          )}
        </div>
        {/* Row 2: authorisation name */}
        <p className="font-semibold text-base">{r.authorisation_name ?? 'Authorisation'} required</p>
        {/* Row 3: reason */}
        {r.reason && (
          <p className="text-sm text-muted-foreground mt-1">{r.reason}</p>
        )}
      </div>
      {days > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-card px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Processing time</p>
            <p className="font-semibold text-sm">{days} days</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Start by</p>
            <p className="font-semibold text-sm">
              {transit.transitDate ? latestStartLabel(transit.transitDate, days) : '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function AddTripForm({ passports }: Props) {
  const primaryPassport = passports.find(p => p.is_primary) ?? passports[0] ?? null

  const [step, setStep] = useState<'itinerary' | 'review'>('itinerary')
  const [legs, setLegs] = useState<LegDraft[]>([newLeg(primaryPassport?.id ?? '')])
  const [transits, setTransits] = useState<TransitDraft[]>([])
  const [expandedTransits, setExpandedTransits] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isAssessing, setIsAssessing] = useState(false)
  const [isCheckingTransits, setIsCheckingTransits] = useState(false)
  const [isSaving, startSaveTransition] = useTransition()
  const [isStarting, startStartTransition] = useTransition()

  const allHistorical = legs.every(l => l.startDate && isHistoricalDate(l.startDate))

  // ── Leg mutations ─────────────────────────────────────────────────────────

  function updateLeg(id: string, patch: Partial<LegDraft>) {
    setLegs(prev => prev.map(l => l.id === id ? { ...l, ...patch, assessment: 'countryCode' in patch || 'startDate' in patch || 'endDate' in patch ? null : l.assessment } : l))
  }

  function addLeg() {
    setLegs(prev => [...prev, newLeg(primaryPassport?.id ?? '')])
  }

  function removeLeg(id: string) {
    setLegs(prev => {
      const next = prev.filter(l => l.id !== id)
      // Remove any transit that's now out of range
      setTransits(t => t.filter(tr => tr.sortOrder <= next.length))
      return next
    })
  }

  // ── Transit mutations ─────────────────────────────────────────────────────

  function toggleTransit(sortOrder: number) {
    const hasTransit = transits.some(t => t.sortOrder === sortOrder)
    if (hasTransit) {
      setTransits(prev => prev.filter(t => t.sortOrder !== sortOrder))
      setExpandedTransits(prev => { const s = new Set(prev); s.delete(sortOrder); return s })
    } else {
      setExpandedTransits(prev => new Set(prev).add(sortOrder))
    }
  }

  function updateTransit(sortOrder: number, patch: { countryCode?: string; transitDate?: string }) {
    setTransits(prev => {
      const existing = prev.find(t => t.sortOrder === sortOrder)
      // Reset check result if country changes
      const reset = patch.countryCode && patch.countryCode !== existing?.countryCode
        ? { checkResult: null, isChecking: false }
        : {}
      if (existing) return prev.map(t => t.sortOrder === sortOrder ? { ...t, ...patch, ...reset } : t)
      return [...prev, { sortOrder, countryCode: patch.countryCode ?? '', transitDate: patch.transitDate ?? '', checkResult: null, isChecking: false }]
    })
  }

  function removeTransit(sortOrder: number) {
    setTransits(prev => prev.filter(t => t.sortOrder !== sortOrder))
    setExpandedTransits(prev => { const s = new Set(prev); s.delete(sortOrder); return s })
  }

  function getTransit(sortOrder: number): TransitDraft | undefined {
    return transits.find(t => t.sortOrder === sortOrder)
  }

  // ── Assess + advance ──────────────────────────────────────────────────────

  async function handleContinue() {
    setError(null)
    for (let i = 0; i < legs.length; i++) {
      const l = legs[i]
      if (!l.countryCode) { setError(`Select a destination for leg ${i + 1}.`); return }
      if (!l.startDate) { setError(`Enter a departure date for leg ${i + 1}.`); return }
      if (!l.endDate) { setError(`Enter a return date for leg ${i + 1}.`); return }
      if (l.endDate < l.startDate) { setError(`Return date must be after departure date (leg ${i + 1}).`); return }
    }

    // Run leg assessments via the server action seam. Awaited before the step
    // flips so the review step never renders an empty assessment as
    // "no action required". Historical legs stay client-side — no stub needed.
    setIsAssessing(true)
    try {
      const assessments = await Promise.all(legs.map(l =>
        isHistoricalDate(l.startDate)
          ? Promise.resolve<AssessmentOutput>({ result: 'no_action_required', requirements: [] })
          : previewAssessment(l.countryCode)
      ))
      setLegs(prev => prev.map((l, i) => ({ ...l, assessment: assessments[i] })))
    } catch {
      setError('Could not run the compliance check. Please try again.')
      return
    } finally {
      setIsAssessing(false)
    }

    // Run transit checks (async, via server action) for all populated transits
    const populatedTransits = transits.filter(t => t.countryCode)
    if (populatedTransits.length > 0) {
      setIsCheckingTransits(true)
      setStep('review')
      await Promise.all(populatedTransits.map(async t => {
        setTransits(prev => prev.map(tr => tr.sortOrder === t.sortOrder ? { ...tr, isChecking: true } : tr))
        try {
          const result = await previewTransitCheck(t.countryCode)
          setTransits(prev => prev.map(tr => tr.sortOrder === t.sortOrder ? { ...tr, checkResult: result, isChecking: false } : tr))
        } catch {
          setTransits(prev => prev.map(tr => tr.sortOrder === t.sortOrder
            ? { ...tr, checkResult: { visa_required: true, authorisation_name: null, reason: 'Could not determine — verify manually before travel.', confidence: 'low' as const, time_required_days: 0 }, isChecking: false }
            : tr
          ))
        }
      }))
      setIsCheckingTransits(false)
    } else {
      setStep('review')
    }
  }

  // ── Submit helpers ────────────────────────────────────────────────────────

  function buildLegsJson() {
    return JSON.stringify(legs.map(l => {
      const country = COUNTRIES.find(c => c.code === l.countryCode)!
      return {
        destination_country: country.name,
        destination_country_code: l.countryCode,
        start_date: l.startDate,
        end_date: l.endDate,
        purpose: l.purpose,
        passport_id: l.passportId,
      }
    }))
  }

  function buildTransitsJson() {
    return JSON.stringify(transits.filter(t => t.countryCode).map(t => {
      const country = COUNTRIES.find(c => c.code === t.countryCode)
      return {
        sort_order: t.sortOrder,
        transit_country: country?.name ?? t.countryCode,
        transit_country_code: t.countryCode,
        transit_date: t.transitDate || null,
        visa_required: t.checkResult?.visa_required ?? null,
        authorisation_name: t.checkResult?.authorisation_name ?? null,
        transit_note: t.checkResult?.reason ?? null,
        checked_at: t.checkResult ? new Date().toISOString() : null,
        time_required_days: t.checkResult?.time_required_days ?? 0,
      }
    }))
  }

  // ── Itinerary step ────────────────────────────────────────────────────────

  if (step === 'itinerary') {
    return (
      <div className="max-w-lg mx-auto pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/trips" className="text-muted-foreground min-h-[44px] min-w-[44px] flex items-center">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold">New trip</h1>
        </div>

        {/* Transit before first leg */}
        <TransitSlot
          sortOrder={0}
          label="Outbound transit"
          transit={getTransit(0)}
          expanded={expandedTransits.has(0)}
          onToggle={toggleTransit}
          onUpdate={updateTransit}
          onRemove={removeTransit}
        />

        {legs.map((leg, idx) => {
          const country = COUNTRIES.find(c => c.code === leg.countryCode)
          return (
            <div key={leg.id}>
              {/* Leg card */}
              <div className="border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {country ? `${countryFlag(leg.countryCode)} ${country.name}` : `Destination ${idx + 1}`}
                  </p>
                  {legs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLeg(leg.id)}
                      className="text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-4 px-4 py-4">
                  <Select
                    value={leg.countryCode}
                    onChange={e => updateLeg(leg.id, { countryCode: e.target.value })}
                  >
                    <option value="">Select destination</option>
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{countryFlag(c.code)} {c.name}</option>
                    ))}
                  </Select>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Arrival">
                      <Input
                        type="date"
                        value={leg.startDate}
                        onChange={e => {
                          const val = e.target.value
                          updateLeg(leg.id, { startDate: val, ...(leg.endDate && val > leg.endDate ? { endDate: val } : {}) })
                        }}
                      />
                    </Field>
                    <Field label="Departure">
                      <Input
                        type="date"
                        value={leg.endDate}
                        min={leg.startDate || undefined}
                        onChange={e => updateLeg(leg.id, { endDate: e.target.value })}
                      />
                    </Field>
                  </div>

                  <Select
                    value={leg.purpose}
                    onChange={e => updateLeg(leg.id, { purpose: e.target.value })}
                  >
                    {PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </Select>

                  {passports.length > 0 && (
                    <Select
                      value={leg.passportId}
                      onChange={e => updateLeg(leg.id, { passportId: e.target.value })}
                    >
                      {passports.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.issuing_country} passport{p.is_primary ? ' (primary)' : ''}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              </div>

              {/* Transit slot after this leg */}
              <TransitSlot
                sortOrder={idx + 1}
                label={idx === legs.length - 1 ? 'Return transit' : 'Transit between destinations'}
                transit={getTransit(idx + 1)}
                expanded={expandedTransits.has(idx + 1)}
                onToggle={toggleTransit}
                onUpdate={updateTransit}
                onRemove={removeTransit}
              />
            </div>
          )
        })}

        {/* Add destination */}
        <button
          type="button"
          onClick={addLeg}
          className="w-full h-12 rounded-xl border border-dashed border-border text-sm text-muted-foreground flex items-center justify-center gap-2 mt-1 mb-6"
        >
          <Plus size={16} />
          Add another destination
        </button>

        {error && <p className="text-sm text-status-at-risk mb-3">{error}</p>}

        <PrimaryButton onClick={handleContinue} loading={isAssessing || isCheckingTransits}>
          {isAssessing || isCheckingTransits ? (
            'Checking requirements…'
          ) : (
            <>Review requirements <ChevronRight size={16} /></>
          )}
        </PrimaryButton>
      </div>
    )
  }

  // ── Review step ───────────────────────────────────────────────────────────

  const populatedTransits = transits.filter(t => t.countryCode)

  return (
    <div className="max-w-lg mx-auto">
      {/* Compact header */}
      <div className="relative -mx-4 bg-[#2D1A5C] overflow-hidden rounded-b-3xl mb-5">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '14px 14px' }}
        />
        <div className="relative z-10 flex flex-col gap-2.5 px-4 py-3">
          <div>
            <button
              onClick={() => setStep('itinerary')}
              className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white"
            >
              <ArrowLeft size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {legs.slice(0, 3).map(l => l.countryCode && (
              <span key={l.id} className="text-lg leading-none w-7 h-5 rounded-sm border border-white/25 overflow-hidden inline-flex items-center justify-center shrink-0">
                {countryFlag(l.countryCode)}
              </span>
            ))}
            <span className="text-[22px] font-extrabold text-white leading-tight">
              {tripTitle(legs)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap pb-1">
            <span className="bg-white/15 rounded-md px-2 py-1 text-xs font-semibold text-white">
              {legs[0]?.startDate ? formatChipDate(legs[0].startDate) : '—'}
            </span>
            <span className="text-white/40 text-xs">›</span>
            <span className="bg-white/15 rounded-md px-2 py-1 text-xs font-semibold text-white">
              {legs[legs.length - 1]?.endDate ? formatChipDate(legs[legs.length - 1].endDate) : '—'}
            </span>
            {legs.length > 1 && (
              <span className="text-xs text-white/60">{legs.length} destinations</span>
            )}
          </div>
        </div>
      </div>

      {allHistorical && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-muted text-sm text-muted-foreground">
          These dates are in the past. This trip will be saved as a historical record — no compliance assessment needed.
        </div>
      )}

      {/* Per-leg assessments */}
      {legs.map((leg, idx) => {
        const country = COUNTRIES.find(c => c.code === leg.countryCode)
        const assess = leg.assessment
        const legHistorical = isHistoricalDate(leg.startDate)

        // Transit before this leg
        const transitBefore = populatedTransits.find(t => t.sortOrder === idx)
        // Transit after last leg
        const transitAfter = idx === legs.length - 1 ? populatedTransits.find(t => t.sortOrder === idx + 1) : null

        return (
          <div key={leg.id} className="mb-6">
            {/* Transit before this leg */}
            {transitBefore && (
              <TransitResultCard transit={transitBefore} />
            )}

            {/* Leg header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">{country ? countryFlag(leg.countryCode) : ''}</span>
              <div>
                <p className="font-semibold">{country?.name ?? 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">
                  {leg.startDate && leg.endDate
                    ? `${formatChipDate(leg.startDate)} – ${formatChipDate(leg.endDate)} · ${durationDays(leg.startDate, leg.endDate)} day${durationDays(leg.startDate, leg.endDate) !== 1 ? 's' : ''}`
                    : ''}
                  {' · '}
                  <span className="capitalize">{leg.purpose}</span>
                </p>
              </div>
            </div>

            {legHistorical && (
              <div className="px-3 py-2 rounded-xl bg-muted text-xs text-muted-foreground mb-3">
                Historical leg — no compliance assessment needed.
              </div>
            )}

            {!legHistorical && assess?.result === 'review_required' && (
              <div className="mb-3 px-4 py-3 rounded-xl bg-status-incomplete-bg border border-status-incomplete/20 text-sm">
                <p className="font-semibold text-status-incomplete">Review recommended</p>
                <p className="text-muted-foreground mt-1">Check entry requirements directly with the relevant embassy or consulate.</p>
              </div>
            )}

            {!legHistorical && assess?.requirements && assess.requirements.length > 0 && (
              <div className="flex flex-col gap-4">
                <SectionHeader label="Requirements" />
                {assess.requirements.map((req, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="rounded-xl border border-border bg-card px-4 py-4">
                      <p className="font-semibold text-base">{req.name}</p>
                      {req.why_it_applies && (
                        <p className="text-sm text-muted-foreground mt-1">{req.why_it_applies}</p>
                      )}
                    </div>
                    {req.time_required_days > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-border bg-card px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Processing time</p>
                          <p className="font-semibold text-sm">{req.time_required_days} days</p>
                        </div>
                        <div className="rounded-xl border border-border bg-card px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Start by</p>
                          <p className="font-semibold text-sm">{latestStartLabel(leg.startDate, req.time_required_days)}</p>
                        </div>
                      </div>
                    )}
                    {req.what_you_need && req.what_you_need.length > 0 && (
                      <div className="rounded-xl border border-border bg-card px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Documents required</p>
                        <ul className="flex flex-col gap-2">
                          {req.what_you_need.map((item, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm">
                              <span className="text-muted-foreground shrink-0 mt-0.5">·</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {req.sub_tasks.length > 0 && (
                      <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="px-4 pt-3 pb-1">
                          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Steps</p>
                        </div>
                        <div className="divide-y divide-border px-4 pb-2">
                          {req.sub_tasks.map((task, j) => (
                            <div key={j} className="flex items-center gap-2 py-2.5">
                              <div className={cn('w-3.5 h-3.5 rounded-full shrink-0', task.type === 'automated' ? 'border border-muted-foreground/40' : 'border-2 border-border')} />
                              <span className="text-sm flex-1">{task.name}</span>
                              {task.type === 'automated' && <span className="text-xs text-muted-foreground shrink-0">Auto</span>}
                              {task.type === 'generatable' && <span className="text-xs text-muted-foreground shrink-0">AI-generated</span>}
                              {(task.type === 'primary_action' || task.type === 'third_party') && <span className="text-xs text-muted-foreground shrink-0">Apply</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!legHistorical && assess?.result === 'no_action_required' && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-status-compliant-bg">
                <CheckCircle size={18} className="text-status-compliant shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-status-compliant">No action required</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Your existing documents cover this destination.</p>
                </div>
              </div>
            )}

            {/* Transit after last leg */}
            {transitAfter && (
              <TransitResultCard transit={transitAfter} className="mt-3" />
            )}
          </div>
        )
      })}

      {/* CTAs */}
      <div className="mt-6 pb-8">
        {submitError && <p className="text-xs text-status-at-risk mb-2 px-1">{submitError}</p>}

        {allHistorical ? (
          <PrimaryButton
            loading={isSaving || isCheckingTransits}
            onClick={() => {
              setSubmitError(null)
              const fd = new FormData()
              fd.append('legs', buildLegsJson())
              fd.append('transits', buildTransitsJson())
              fd.append('is_historical', 'true')
              startSaveTransition(async () => {
                try { await createTrip(fd) } catch (err) {
                  setSubmitError(err instanceof Error ? err.message : 'Failed to save trip. Please try again.')
                }
              })
            }}
          >
            {isCheckingTransits ? 'Checking transit requirements…' : isSaving ? 'Saving…' : 'Save trip'}
          </PrimaryButton>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Both CTAs gate on isCheckingTransits: activating mid-check would
                persist transits with checked_at: null, leaving the trip
                permanently incomplete (no post-activation recheck exists). */}
            <PrimaryButton
              loading={isStarting || isCheckingTransits}
              disabled={isSaving}
              onClick={() => {
                setSubmitError(null)
                const fd = new FormData()
                fd.append('legs', buildLegsJson())
                fd.append('transits', buildTransitsJson())
                startStartTransition(async () => {
                  try { await createAndActivateTrip(fd) } catch (err) {
                    setSubmitError(err instanceof Error ? err.message : 'Failed to save trip. Please try again.')
                  }
                })
              }}
            >
              {isCheckingTransits ? 'Checking transit requirements…' : isStarting ? 'Setting up…' : 'Get Started'}
            </PrimaryButton>
            <SecondaryButton
              disabled={isSaving || isStarting || isCheckingTransits}
              onClick={() => {
                setSubmitError(null)
                const fd = new FormData()
                fd.append('legs', buildLegsJson())
                fd.append('transits', buildTransitsJson())
                fd.append('is_historical', 'false')
                startSaveTransition(async () => {
                  try { await createTrip(fd) } catch (err) {
                    setSubmitError(err instanceof Error ? err.message : 'Failed to save trip. Please try again.')
                  }
                })
              }}
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {isSaving ? 'Saving…' : 'Save Trip'}
            </SecondaryButton>
          </div>
        )}
      </div>
    </div>
  )
}

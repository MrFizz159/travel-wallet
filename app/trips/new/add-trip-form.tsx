'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, CheckCircle, Loader2 } from 'lucide-react'
import { COUNTRIES, countryFlag } from '@/lib/countries'
import { runAssessment, type AssessmentOutput } from '@/lib/assessment/stub'
import { createTrip, createAndActivateTrip } from '@/app/actions/trips'
import { SectionHeader } from '@/components/ui-kit'
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

function formatDateRange(start: string, end: string) {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const sDay = s.getDate()
  const eDay = e.getDate()
  const sMonth = s.toLocaleString('en-GB', { month: 'short' })
  const eMonth = e.toLocaleString('en-GB', { month: 'short' })
  const year = e.getFullYear()
  if (sMonth === eMonth) return `${sDay}–${eDay} ${sMonth} ${year}`
  return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${year}`
}

function durationDays(start: string, end: string) {
  const ms = new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()
  return Math.round(ms / 86400000) + 1
}

function formatChipDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function latestStartLabel(startDate: string, daysRequired: number): string {
  const d = new Date(startDate + 'T00:00:00')
  d.setDate(d.getDate() - daysRequired)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function AddTripForm({ passports }: Props) {
  const router = useRouter()
  const primaryPassport = passports.find(p => p.is_primary) ?? passports[0] ?? null

  const [step, setStep] = useState<'form' | 'result'>('form')
  const [countryCode, setCountryCode] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [purpose, setPurpose] = useState('business')
  const [passportId, setPassportId] = useState(primaryPassport?.id ?? '')
  const [assessment, setAssessment] = useState<AssessmentOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSaving, startSaveTransition] = useTransition()
  const [isStarting, startStartTransition] = useTransition()

  const selectedCountry = COUNTRIES.find(c => c.code === countryCode)
  const historical = startDate ? isHistoricalDate(startDate) : false

  function handleAssess(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!countryCode) { setError('Select a destination.'); return }
    if (!startDate) { setError('Enter a departure date.'); return }
    if (!endDate) { setError('Enter a return date.'); return }
    if (endDate < startDate) { setError('Return date must be after departure date.'); return }

    const result = historical ? { result: 'no_action_required' as const, requirements: [] } : runAssessment(countryCode)
    setAssessment(result)
    setStep('result')
  }

  const isHistoricalAssessment = historical || assessment?.result === 'no_action_required'

  return (
    <div className="max-w-lg mx-auto">
      {step === 'form' && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <Link href="/trips" className="text-muted-foreground min-h-[44px] min-w-[44px] flex items-center">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold">New trip</h1>
          </div>

          <form onSubmit={handleAssess} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Where are you going?
              </label>
              <select
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
              >
                <option value="">Select destination</option>
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {countryFlag(c.code)} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                When?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Departure</p>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => {
                      setStartDate(e.target.value)
                      if (endDate && e.target.value > endDate) setEndDate(e.target.value)
                    }}
                    className="w-full h-12 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Return</p>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Purpose
              </label>
              <select
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
              >
                {PURPOSES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {passports.length > 0 && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Travelling on
                </label>
                <select
                  value={passportId}
                  onChange={e => setPassportId(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                >
                  {passports.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.issuing_country} passport{p.is_primary ? ' (primary)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && <p className="text-sm text-status-at-risk">{error}</p>}

            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm flex items-center justify-center gap-2"
            >
              Assess requirements
              <ChevronRight size={16} />
            </button>
          </form>
        </>
      )}

      {step === 'result' && assessment && selectedCountry && (
        <>
          {/* Compact header */}
          <div className="relative -mx-4 bg-[#2D1A5C] overflow-hidden rounded-b-3xl mb-5">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
                backgroundSize: '14px 14px',
              }}
            />
            <div className="relative z-10 flex flex-col gap-2.5 px-4 py-3">
              {/* Row 1: back */}
              <div>
                <button
                  onClick={() => setStep('form')}
                  className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white"
                >
                  <ArrowLeft size={18} />
                </button>
              </div>
              {/* Row 2: flag + country name */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-lg leading-none w-7 h-5 rounded-sm border border-white/25 overflow-hidden inline-flex items-center justify-center shrink-0"
                  role="img"
                  aria-label={selectedCountry.name}
                >
                  {countryFlag(countryCode)}
                </span>
                <span className="text-[22px] font-extrabold text-white leading-tight">
                  {selectedCountry.name}
                </span>
              </div>
              {/* Row 3: date chips + purpose · duration */}
              <div className="flex items-center gap-1.5 flex-wrap pb-1">
                <span className="bg-white/15 rounded-md px-2 py-1 text-xs font-semibold text-white">
                  {formatChipDate(startDate)}
                </span>
                <span className="text-white/40 text-xs">›</span>
                <span className="bg-white/15 rounded-md px-2 py-1 text-xs font-semibold text-white">
                  {formatChipDate(endDate)}
                </span>
                <div className="w-px h-3.5 bg-white/20 mx-0.5 shrink-0" />
                <span className="text-xs text-white/60 capitalize">
                  {purpose} · {durationDays(startDate, endDate)} day{durationDays(startDate, endDate) !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {historical && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-muted text-sm text-muted-foreground">
              These dates are in the past. This trip will be saved as a historical record — no compliance assessment needed.
            </div>
          )}

          {!historical && assessment.result === 'review_required' && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-status-incomplete-bg border border-status-incomplete/20 text-sm">
              <p className="font-semibold text-status-incomplete">Review recommended</p>
              <p className="text-muted-foreground mt-1">
                We don't have specific guidance for this destination. Check entry requirements directly with the relevant embassy or consulate before travelling.
              </p>
            </div>
          )}

          {assessment.requirements.length > 0 && (
            <div className="flex flex-col gap-6 mb-6">
              <SectionHeader label="Requirements" />
              {assessment.requirements.map((req, i) => (
                <div key={i} className="flex flex-col gap-3">

                  {/* Requirement name + description */}
                  <div className="rounded-xl border border-border bg-card px-4 py-4">
                    <p className="font-semibold text-base">{req.name}</p>
                    {req.why_it_applies && (
                      <p className="text-sm text-muted-foreground mt-1">{req.why_it_applies}</p>
                    )}
                  </div>

                  {/* Processing time info */}
                  {req.time_required_days > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-border bg-card px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Processing time</p>
                        <p className="font-semibold text-sm">{req.time_required_days} days</p>
                      </div>
                      <div className="rounded-xl border border-border bg-card px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Start by</p>
                        <p className="font-semibold text-sm">{latestStartLabel(startDate, req.time_required_days)}</p>
                      </div>
                    </div>
                  )}

                  {/* Documents required */}
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

                  {/* Steps */}
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
                            {task.type === 'automated' && (
                              <span className="text-xs text-muted-foreground shrink-0">Auto</span>
                            )}
                            {task.type === 'generatable' && (
                              <span className="text-xs text-muted-foreground shrink-0">AI-generated</span>
                            )}
                            {(task.type === 'primary_action' || task.type === 'third_party') && (
                              <span className="text-xs text-muted-foreground shrink-0">Apply</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}

          {isHistoricalAssessment && assessment.requirements.length === 0 && !historical && (
            <div className="flex items-start gap-3 mb-6 px-4 py-3 rounded-xl bg-status-compliant-bg">
              <CheckCircle size={18} className="text-status-compliant shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-status-compliant">No action required</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Your existing documents cover this trip.
                </p>
              </div>
            </div>
          )}

          <div className="sticky bottom-20 mt-2">
            {submitError && <p className="text-xs text-status-at-risk mb-2 px-1">{submitError}</p>}
            {historical ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setSubmitError(null)
                  const fd = new FormData()
                  fd.append('destination_country', selectedCountry.name)
                  fd.append('destination_country_code', countryCode)
                  fd.append('start_date', startDate)
                  fd.append('end_date', endDate)
                  fd.append('purpose', purpose)
                  fd.append('passport_id', passportId)
                  fd.append('is_historical', 'true')
                  fd.append('assessment_result', assessment.result)
                  startSaveTransition(async () => {
                    try { await createTrip(fd) } catch (err) {
                      setSubmitError(err instanceof Error ? err.message : 'Failed to save trip. Please try again.')
                    }
                  })
                }}
                className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {isSaving ? 'Saving…' : 'Save trip'}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={isStarting || isSaving}
                  onClick={() => {
                    setSubmitError(null)
                    const fd = new FormData()
                    fd.append('destination_country', selectedCountry.name)
                    fd.append('destination_country_code', countryCode)
                    fd.append('start_date', startDate)
                    fd.append('end_date', endDate)
                    fd.append('purpose', purpose)
                    fd.append('passport_id', passportId)
                    fd.append('assessment_result', assessment.result)
                    startStartTransition(async () => {
                      try { await createAndActivateTrip(fd) } catch (err) {
                        setSubmitError(err instanceof Error ? err.message : 'Failed to save trip. Please try again.')
                      }
                    })
                  }}
                  className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isStarting && <Loader2 size={16} className="animate-spin" />}
                  {isStarting ? 'Setting up…' : 'Get Started'}
                </button>
                <button
                  type="button"
                  disabled={isSaving || isStarting}
                  onClick={() => {
                    setSubmitError(null)
                    const fd = new FormData()
                    fd.append('destination_country', selectedCountry.name)
                    fd.append('destination_country_code', countryCode)
                    fd.append('start_date', startDate)
                    fd.append('end_date', endDate)
                    fd.append('purpose', purpose)
                    fd.append('passport_id', passportId)
                    fd.append('is_historical', 'false')
                    fd.append('assessment_result', assessment.result)
                    startSaveTransition(async () => {
                      try { await createTrip(fd) } catch (err) {
                        setSubmitError(err instanceof Error ? err.message : 'Failed to save trip. Please try again.')
                      }
                    })
                  }}
                  className="w-full h-12 rounded-xl border border-border text-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving && <Loader2 size={16} className="animate-spin" />}
                  {isSaving ? 'Saving…' : 'Save Trip'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

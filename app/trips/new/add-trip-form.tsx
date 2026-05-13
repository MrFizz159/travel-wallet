'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, CheckCircle } from 'lucide-react'
import { COUNTRIES, countryFlag } from '@/lib/countries'
import { runAssessment, type AssessmentOutput } from '@/lib/assessment/stub'
import { createTrip } from '@/app/actions/trips'
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
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStep('form')} className="text-muted-foreground min-h-[44px] min-w-[44px] flex items-center">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold">
                {countryFlag(countryCode)} {selectedCountry.name}
              </h1>
              <p className="text-sm text-muted-foreground capitalize">
                {formatDateRange(startDate, endDate)} · {purpose}
              </p>
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
            <div className="flex flex-col gap-4 mb-6">
              <SectionHeader label="Requirements" />
              {assessment.requirements.map((req, i) => (
                <div key={i} className="rounded-xl border border-border bg-card">
                  {/* Header */}
                  <div className="px-4 pt-4 pb-3">
                    <p className="font-semibold">{req.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{req.why_it_applies}</p>
                    {req.time_required_days > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Allow {req.time_required_days} days · start by {latestStartLabel(startDate, req.time_required_days)}
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
                            <span className="text-xs text-muted-foreground shrink-0">AI-generated</span>
                          )}
                          {(task.type === 'primary_action' || task.type === 'third_party') && (
                            <span className="text-xs text-muted-foreground shrink-0">Apply</span>
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

          <form action={createTrip}>
            <input type="hidden" name="destination_country" value={selectedCountry.name} />
            <input type="hidden" name="destination_country_code" value={countryCode} />
            <input type="hidden" name="start_date" value={startDate} />
            <input type="hidden" name="end_date" value={endDate} />
            <input type="hidden" name="purpose" value={purpose} />
            <input type="hidden" name="passport_id" value={passportId} />
            <input type="hidden" name="is_historical" value={String(historical)} />
            <input type="hidden" name="assessment_result" value={assessment.result} />
            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm"
            >
              {historical ? 'Save trip' : 'Add this trip'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

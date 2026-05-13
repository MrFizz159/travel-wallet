import Link from 'next/link'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/status-badge'
import { countryImageUrl } from '@/lib/countries'
import { PageHeader, Avatar, TripCard, SectionHeader } from '@/components/ui-kit'
import { cn } from '@/lib/utils'
import type { Trip, Requirement, SubTask } from '@/lib/types'

// ── Local types ──────────────────────────────────────────────────────────────

interface RequirementWithSubTasks extends Requirement {
  sub_tasks: SubTask[]
}

interface TripWithRequirements extends Trip {
  requirements: RequirementWithSubTasks[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tomorrow(today: string): string {
  const d = new Date(today + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function formatDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const s = new Date(start + 'T00:00:00').toLocaleDateString('en-GB', opts)
  const e = new Date(end + 'T00:00:00').toLocaleDateString('en-GB', opts)
  return `${s} – ${e}`
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function departsInDays(startDate: string, today: string): number {
  return Math.round(
    (new Date(startDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: profile },
    { data: activeTrips },
    { data: passports },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user!.id)
      .single(),
    supabase
      .from('trips')
      .select('*, requirements(*, sub_tasks(*))')
      .eq('user_id', user!.id)
      .eq('state', 'active')
      .order('start_date', { ascending: true }),
    supabase
      .from('passports')
      .select('id')
      .eq('user_id', user!.id)
      .limit(1),
  ])

  const trips = (activeTrips ?? []) as TripWithRequirements[]
  const mostImminentTrip = trips[0] ?? null
  const upcomingTrips = trips.slice(1)

  const today = new Date().toISOString().split('T')[0]
  const tomorrowDate = tomorrow(today)

  const needsSetup = !(profile as { full_name: string | null } | null)?.full_name || !passports?.length
  const name = (profile as { full_name: string | null } | null)?.full_name ?? null
  const firstName = name?.split(' ')[0] ?? null

  const topTask = mostImminentTrip
    ? mostImminentTrip.requirements.find(
        (r) => r.status !== 'complete' && r.is_mandatory === true
      ) ?? null
    : null

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <PageHeader
        title={`${getGreeting()}${firstName ? `, ${firstName}` : ''}`}
        rightSlot={
          <>
            <button className="relative w-10 h-10 flex items-center justify-center text-muted-foreground">
              <Bell size={20} strokeWidth={1.5} />
            </button>
            <Avatar name={name} size="sm" />
          </>
        }
      />

      {/* ── State A: no active trips ──────────────────────────────────────── */}
      {!mostImminentTrip && (
        <>
          {needsSetup && (
            <Link
              href="/profile/setup"
              className="flex flex-col gap-1 px-5 py-4 rounded-xl border-2 border-dashed border-border bg-card shadow-sm mb-5"
            >
              <p className="font-semibold text-sm">Complete your profile</p>
              <p className="text-xs text-muted-foreground">
                Add your name and passport to get personalised compliance checks.
              </p>
            </Link>
          )}
          <div className="rounded-xl border border-border bg-card shadow-sm px-5 py-8 flex flex-col items-center text-center gap-4">
            <p className="text-muted-foreground text-sm">No active trips yet.</p>
            <Link
              href="/trips/new"
              className="inline-flex items-center px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold min-h-[44px]"
            >
              + Add a trip
            </Link>
          </div>
        </>
      )}

      {/* ── State B: hero card ────────────────────────────────────────────── */}
      {mostImminentTrip && (() => {
        const isDepartingToday = mostImminentTrip.start_date === today
        const isDepartingTomorrow = mostImminentTrip.start_date === tomorrowDate
        const isDeparting = isDepartingToday || isDepartingTomorrow
        const isUrgent = isDeparting && mostImminentTrip.compliance_status === 'incomplete'

        return (
          <>
            <Link
              href={`/trips/${mostImminentTrip.id}`}
              className={cn(
                'block rounded-xl border border-border bg-card shadow-sm overflow-hidden mb-4',
                isUrgent && 'border-l-4 border-l-status-incomplete'
              )}
            >
              {/* Destination image */}
              <div className="w-full h-24 bg-muted overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={countryImageUrl(mostImminentTrip.destination_country)}
                  alt={mostImminentTrip.destination_country}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content below image */}
              <div className="px-4 pt-3 pb-4">
                {/* Destination name */}
                <h2 className="text-xl font-bold leading-tight mb-1">
                  {mostImminentTrip.destination_country}
                </h2>

                {/* Date · purpose */}
                <p className="text-sm text-muted-foreground capitalize mb-2">
                  {formatDateRange(mostImminentTrip.start_date, mostImminentTrip.end_date)}
                  {' · '}
                  {mostImminentTrip.purpose}
                </p>

                {/* Departure pill + compliance status */}
                <div className="flex items-center gap-2 mb-3">
                  {isDepartingToday && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-status-incomplete-bg text-status-incomplete">
                      Departing today
                    </span>
                  )}
                  {isDepartingTomorrow && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-status-incomplete-bg text-status-incomplete">
                      Departing tomorrow
                    </span>
                  )}
                  {mostImminentTrip.compliance_status && (
                    <StatusBadge status={mostImminentTrip.compliance_status} />
                  )}
                </div>

                {/* Outstanding task CTA — always shown when action needed */}
                {topTask ? (
                  <div className="rounded-xl bg-foreground text-background px-4 py-3 flex items-center justify-between min-h-[48px]">
                    <p className="text-sm font-semibold truncate pr-3">{topTask.name}</p>
                    <span className="text-sm font-semibold shrink-0">Continue →</span>
                  </div>
                ) : isDeparting ? (
                  <p className="text-sm font-semibold text-status-compliant">
                    You&apos;re all set — safe travels.
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-status-compliant">
                    You&apos;re ready to travel.
                  </p>
                )}
              </div>
            </Link>

            {/* ── Upcoming trips strip ────────────────────────────────────── */}
            {upcomingTrips.length > 0 && (
              <section className="mb-4">
                <SectionHeader label="Coming up" />
                <div className="flex flex-col gap-2">
                  {upcomingTrips.map((trip) => (
                    <Link key={trip.id} href={`/trips/${trip.id}`} className="block">
                      <TripCard
                        destination={trip.destination_country}
                        countryCode={trip.destination_country_code}
                        dateRange={formatDateRange(trip.start_date, trip.end_date)}
                        purpose={trip.purpose}
                        status={trip.compliance_status}
                        requirements={trip.requirements}
                        departsIn={departsInDays(trip.start_date, today)}
                      />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── Setup banner — shown after trip content ─────────────────── */}
            {needsSetup && (
              <Link
                href="/profile/setup"
                className="flex flex-col gap-1 px-5 py-4 rounded-xl border-2 border-dashed border-border bg-card shadow-sm mb-4"
              >
                <p className="font-semibold text-sm">Complete your profile</p>
                <p className="text-xs text-muted-foreground">
                  Add your name and passport to get personalised compliance checks.
                </p>
              </Link>
            )}

            {/* ── Add a trip CTA ──────────────────────────────────────────── */}
            <Link
              href="/trips/new"
              className="flex items-center justify-center w-full px-6 py-3 rounded-xl border border-border bg-card text-sm font-semibold min-h-[44px] mt-2"
            >
              + Plan a trip
            </Link>
          </>
        )
      })()}
    </div>
  )
}

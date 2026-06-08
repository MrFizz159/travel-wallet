import Link from 'next/link'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/status-badge'
import { countryImageUrl } from '@/lib/countries'
import { PageHeader, Avatar, TripCard, SectionHeader } from '@/components/ui-kit'
import { cn } from '@/lib/utils'
import type { Trip, TripLeg, SubTask } from '@/lib/types'

// ── Local types ───────────────────────────────────────────────────────────────

interface LegRequirement {
  id: string
  name: string
  status: string
  is_mandatory: boolean
  leg_id: string | null
  sub_tasks: SubTask[]
}

interface LegWithRequirements extends TripLeg {
  requirements: LegRequirement[]
}

interface TripWithLegs extends Trip {
  trip_legs: LegWithRequirements[]
  requirements: LegRequirement[]  // all requirements for the trip (used for trip-level reqs)
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

function sortedLegs(trip: TripWithLegs): LegWithRequirements[] {
  return [...(trip.trip_legs ?? [])].sort((a, b) => a.sort_order - b.sort_order)
}

function tripTitle(trip: TripWithLegs): string {
  return sortedLegs(trip).map(l => l.destination_country).join(' + ')
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
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase
      .from('trips')
      .select('*, trip_legs(*, requirements(id, name, status, is_mandatory, leg_id, sub_tasks(*))), requirements(id, name, status, is_mandatory, leg_id)')
      .eq('user_id', user!.id)
      .eq('state', 'active'),
    supabase.from('passports').select('id').eq('user_id', user!.id).limit(1),
  ])

  // Sort client-side by first leg start_date (trips no longer have start_date directly)
  const trips = ([...(activeTrips ?? [])] as TripWithLegs[]).sort((a, b) => {
    const aDate = sortedLegs(a)[0]?.start_date ?? ''
    const bDate = sortedLegs(b)[0]?.start_date ?? ''
    return aDate.localeCompare(bDate)
  })

  const today = new Date().toISOString().split('T')[0]
  const tomorrowDate = tomorrow(today)

  const needsSetup = !(profile as { full_name: string | null } | null)?.full_name || !passports?.length
  const name = (profile as { full_name: string | null } | null)?.full_name ?? null
  const firstName = name?.split(' ')[0] ?? null

  const mostImminentTrip = trips[0] ?? null
  const upcomingTrips = trips.slice(1)

  const mostImminentLegs = mostImminentTrip ? sortedLegs(mostImminentTrip) : []
  const mostImminentFirstLeg = mostImminentLegs[0] ?? null
  const mostImminentLastLeg = mostImminentLegs[mostImminentLegs.length - 1] ?? null

  // Top task: first incomplete mandatory requirement across all legs + trip-level
  const topTask = mostImminentTrip
    ? [
        ...mostImminentLegs.flatMap(l => l.requirements),
        ...((mostImminentTrip.requirements ?? []).filter(r => r.leg_id === null)),
      ].find(r => r.status !== 'complete' && r.is_mandatory === true) ?? null
    : null

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">

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

      {/* State A: no active trips */}
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

      {/* State B: hero card */}
      {mostImminentTrip && mostImminentFirstLeg && (() => {
        const startDate = mostImminentFirstLeg.start_date
        const endDate = mostImminentLastLeg?.end_date ?? mostImminentFirstLeg.end_date
        const isDepartingToday = startDate === today
        const isDepartingTomorrow = startDate === tomorrowDate
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
              <div className="w-full h-24 bg-muted overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={countryImageUrl(mostImminentFirstLeg.destination_country)}
                  alt={mostImminentFirstLeg.destination_country}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="px-4 pt-3 pb-4">
                <h2 className="text-xl font-bold leading-tight mb-1">
                  {tripTitle(mostImminentTrip)}
                </h2>

                <p className="text-sm text-muted-foreground capitalize mb-2">
                  {formatDateRange(startDate, endDate)}
                  {' · '}
                  {mostImminentFirstLeg.purpose}
                </p>

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

                {topTask ? (
                  <div className="rounded-xl bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between min-h-[48px]">
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

            {upcomingTrips.length > 0 && (
              <section className="mb-4">
                <SectionHeader label="Coming up" />
                <div className="flex flex-col gap-2">
                  {upcomingTrips.map(trip => {
                    const legs = sortedLegs(trip)
                    const fl = legs[0]
                    const ll = legs[legs.length - 1]
                    if (!fl) return null
                    return (
                      <Link key={trip.id} href={`/trips/${trip.id}`} className="block">
                        <TripCard
                          destination={tripTitle(trip)}
                          countryCode={fl.destination_country_code}
                          dateRange={formatDateRange(fl.start_date, ll?.end_date ?? fl.end_date)}
                          purpose={fl.purpose}
                          status={trip.compliance_status}
                          requirements={[...legs.flatMap(l => l.requirements), ...(trip.requirements ?? []).filter(r => r.leg_id === null)]}
                          departsIn={departsInDays(fl.start_date, today)}
                        />
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

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

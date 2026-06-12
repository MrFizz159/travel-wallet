import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ExploratoryTripCard } from '@/components/trip-card-exploratory'
import { PageHeader, SectionHeader, TripCard } from '@/components/ui-kit'
import { cn } from '@/lib/utils'
import type { Trip, TripLeg, TripPurpose } from '@/lib/types'

interface TripLegSummary {
  destination_country: string
  destination_country_code: string
  start_date: string
  end_date: string
  purpose: TripPurpose
  sort_order: number
}

interface TripRequirement {
  id: string
  name: string
  status: string
  is_mandatory: boolean
  leg_id: string | null
}

interface TripWithLegs extends Trip {
  trip_legs: TripLegSummary[]
  requirements: TripRequirement[]
}

function formatDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${new Date(start + 'T00:00:00').toLocaleDateString('en-GB', opts)} – ${new Date(end + 'T00:00:00').toLocaleDateString('en-GB', opts)}`
}

function firstLeg(trip: TripWithLegs): TripLegSummary | undefined {
  return [...(trip.trip_legs ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]
}

function lastLeg(trip: TripWithLegs): TripLegSummary | undefined {
  const sorted = [...(trip.trip_legs ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  return sorted[sorted.length - 1]
}

function tripTitle(trip: TripWithLegs): string {
  return [...(trip.trip_legs ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(l => l.destination_country)
    .join(' + ')
}

export default async function TripsPage(props: { searchParams: Promise<{ tab?: string }> }) {
  const searchParams = await props.searchParams
  const activeTab = searchParams.tab ?? 'upcoming'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]

  // Auto-complete active trips whose last leg has already ended
  const { data: activeTripsForCompletion } = await supabase
    .from('trips')
    .select('id, trip_legs(end_date, sort_order)')
    .eq('user_id', user!.id)
    .eq('state', 'active')

  const expiredTripIds = (activeTripsForCompletion ?? [])
    .filter((t: { id: string; trip_legs: { end_date: string; sort_order: number }[] | null }) => {
      const legs = t.trip_legs ?? []
      if (legs.length === 0) return false
      const lastEnd = [...legs].sort((a, b) => b.sort_order - a.sort_order)[0].end_date
      return lastEnd < today
    })
    .map(t => t.id)

  if (expiredTripIds.length > 0) {
    await supabase
      .from('trips')
      .update({ state: 'completed' })
      .in('id', expiredTripIds)
  }

  const { data: trips } = await supabase
    .from('trips')
    .select('*, trip_legs(destination_country, destination_country_code, start_date, end_date, purpose, sort_order), requirements(id, name, status, is_mandatory, leg_id)')
    .eq('user_id', user!.id)

  const allTrips = (trips ?? []) as TripWithLegs[]

  // Sort by first leg start_date
  allTrips.sort((a, b) => {
    const aDate = firstLeg(a)?.start_date ?? ''
    const bDate = firstLeg(b)?.start_date ?? ''
    return aDate.localeCompare(bDate)
  })

  const exploratory = allTrips.filter(t => t.state === 'exploratory')
  const upcoming = allTrips.filter(t => t.state === 'active')
  const past = allTrips.filter(t => t.state === 'completed' || t.state === 'cancelled')

  const tabCls = (tab: string) => cn(
    'pb-3 text-sm font-semibold border-b-2 -mb-px transition-colors',
    activeTab === tab
      ? 'border-foreground text-foreground'
      : 'border-transparent text-muted-foreground'
  )

  return (
    <div className="max-w-lg mx-auto pb-4">

      <div className="px-4 pt-6">
        <PageHeader
          title="Trips"
          rightSlot={
            <Link
              href="/trips/new"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-semibold min-h-[44px]"
            >
              <Plus size={16} />
              Add a trip
            </Link>
          }
        />
      </div>

      <div className="flex gap-6 border-b border-border px-4 mb-5">
        <Link href="?tab=upcoming" className={tabCls('upcoming')}>Upcoming</Link>
        <Link href="?tab=past" className={tabCls('past')}>
          Past{past.length > 0 ? ` (${past.length})` : ''}
        </Link>
      </div>

      <div className="px-4">

        {activeTab === 'upcoming' && (
          <>
            {upcoming.length === 0 && exploratory.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <p className="text-muted-foreground text-sm">No upcoming trips.</p>
                <Link href="/trips/new" className="px-6 py-3 rounded-xl bg-foreground text-background text-sm font-semibold">
                  Plan your first trip
                </Link>
              </div>
            )}

            {upcoming.length > 0 && (
              <section className="mb-5">
                {exploratory.length > 0 && <SectionHeader label="Confirmed" />}
                <div className="flex flex-col gap-3">
                  {upcoming.map(trip => {
                    const fl = firstLeg(trip)
                    const ll = lastLeg(trip)
                    const start = fl?.start_date ?? ''
                    const end = ll?.end_date ?? fl?.end_date ?? ''
                    const departsIn = start
                      ? Math.round((new Date(start + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000)
                      : null
                    return (
                      <Link key={trip.id} href={`/trips/${trip.id}`} className="block">
                        <TripCard
                          destination={tripTitle(trip)}
                          countryCode={fl?.destination_country_code ?? ''}
                          dateRange={start && end ? formatDateRange(start, end) : ''}
                          purpose={fl?.purpose ?? ''}
                          status={trip.compliance_status}
                          requirements={trip.requirements}
                          departsIn={departsIn}
                        />
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {exploratory.length > 0 && (
              <section className="mb-5">
                <SectionHeader label="Exploratory" />
                <div className="flex flex-col gap-3">
                  {exploratory.map(trip => (
                    <div key={trip.id}>
                      <ExploratoryTripCard trip={trip} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === 'past' && (
          <>
            {past.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-muted-foreground text-sm">No past trips yet.</p>
              </div>
            )}
            {past.length > 0 && (
              <div className="flex flex-col gap-3">
                {past.map(trip => {
                  const fl = firstLeg(trip)
                  const ll = lastLeg(trip)
                  const start = fl?.start_date ?? ''
                  const end = ll?.end_date ?? fl?.end_date ?? ''
                  return (
                    <Link key={trip.id} href={`/trips/${trip.id}`} className="block">
                      <TripCard
                        destination={tripTitle(trip)}
                        countryCode={fl?.destination_country_code ?? ''}
                        dateRange={start && end ? formatDateRange(start, end) : ''}
                        purpose={fl?.purpose ?? ''}
                        status={null}
                        className="opacity-60"
                      />
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

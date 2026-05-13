import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ExploratoryTripCard } from '@/components/trip-card-exploratory'
import { PageHeader, SectionHeader, TripCard } from '@/components/ui-kit'
import { cn } from '@/lib/utils'
import type { Trip } from '@/lib/types'

interface TripWithRequirements extends Trip {
  requirements: Array<{ id: string; name: string; status: string; is_mandatory: boolean }>
}

function formatDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${new Date(start + 'T00:00:00').toLocaleDateString('en-GB', opts)} – ${new Date(end + 'T00:00:00').toLocaleDateString('en-GB', opts)}`
}

export default async function TripsPage(props: { searchParams: Promise<{ tab?: string }> }) {
  const searchParams = await props.searchParams
  const activeTab = searchParams.tab ?? 'upcoming'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]

  await supabase
    .from('trips')
    .update({ state: 'completed' })
    .eq('user_id', user!.id)
    .eq('state', 'active')
    .lt('end_date', today)

  const { data: trips } = await supabase
    .from('trips')
    .select('*, requirements(id, name, status, is_mandatory)')
    .eq('user_id', user!.id)
    .order('start_date', { ascending: true })

  const allTrips = (trips ?? []) as TripWithRequirements[]
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

      {/* ── Page header ───────────────────────────────────────────────────── */}
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

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div className="flex gap-6 border-b border-border px-4 mb-5">
        <Link href="?tab=upcoming" className={tabCls('upcoming')}>
          Upcoming
        </Link>
        <Link href="?tab=past" className={tabCls('past')}>
          Past{past.length > 0 ? ` (${past.length})` : ''}
        </Link>
      </div>

      <div className="px-4">

        {/* ── Upcoming tab ──────────────────────────────────────────────── */}
        {activeTab === 'upcoming' && (
          <>
            {upcoming.length === 0 && exploratory.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <p className="text-muted-foreground text-sm">No upcoming trips.</p>
                <Link
                  href="/trips/new"
                  className="px-6 py-3 rounded-xl bg-foreground text-background text-sm font-semibold"
                >
                  Plan your first trip
                </Link>
              </div>
            )}

            {upcoming.length > 0 && (
              <section className="mb-5">
                {exploratory.length > 0 && <SectionHeader label="Confirmed" />}
                <div className="flex flex-col gap-3">
                  {upcoming.map((trip) => (
                    <Link key={trip.id} href={`/trips/${trip.id}`} className="block">
                      <TripCard
                        destination={trip.destination_country}
                        countryCode={trip.destination_country_code}
                        dateRange={formatDateRange(trip.start_date, trip.end_date)}
                        purpose={trip.purpose}
                        status={trip.compliance_status}
                        requirements={trip.requirements}
                        departsIn={Math.round((new Date(trip.start_date + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000)}
                      />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {exploratory.length > 0 && (
              <section className="mb-5">
                <SectionHeader label="Exploratory" />
                <div className="flex flex-col gap-3">
                  {exploratory.map((trip) => (
                    <div key={trip.id}>
                      <ExploratoryTripCard trip={trip} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── Past tab ──────────────────────────────────────────────────── */}
        {activeTab === 'past' && (
          <>
            {past.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-muted-foreground text-sm">No past trips yet.</p>
              </div>
            )}

            {past.length > 0 && (
              <div className="flex flex-col gap-3">
                {past.map((trip) => (
                  <Link key={trip.id} href={`/trips/${trip.id}`} className="block">
                    <TripCard
                      destination={trip.destination_country}
                      countryCode={trip.destination_country_code}
                      dateRange={formatDateRange(trip.start_date, trip.end_date)}
                      purpose={trip.purpose}
                      status={null}
                      className="opacity-60"
                    />
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}

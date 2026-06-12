import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { subtractDays, durationDays } from '@/lib/dates'
import { countryFlag } from '@/lib/countries'
import { SectionHeader } from '@/components/ui-kit'

function formatDateRange(start: string, end: string) {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const sDay = s.getDate()
  const eDay = e.getDate()
  const sMonth = s.toLocaleString('en-GB', { month: 'short' })
  const eMonth = e.toLocaleString('en-GB', { month: 'short' })
  if (sMonth === eMonth) return `${sDay}–${eDay} ${sMonth}`
  return `${sDay} ${sMonth} – ${eDay} ${eMonth}`
}

const RANGES = [
  { value: '12mo', label: '12 months' },
  { value: '2yr',  label: '2 years'   },
  { value: 'all',  label: 'All time'  },
]

interface LegRow {
  destination_country: string
  destination_country_code: string
  start_date: string
  end_date: string
  purpose: string
  sort_order: number
}

interface TripRow {
  id: string
  trip_legs: LegRow[]
}

export default async function TravelHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range = '12mo' } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]
  let fromDate: string | null = null
  if (range === '12mo') fromDate = subtractDays(today, 365)
  else if (range === '2yr') fromDate = subtractDays(today, 730)

  const { data: trips } = await supabase
    .from('trips')
    .select('id, trip_legs(destination_country, destination_country_code, start_date, end_date, purpose, sort_order)')
    .eq('user_id', user!.id)
    .eq('state', 'completed')

  const tripList = (trips ?? []) as TripRow[]

  // Flatten to individual leg entries for display; use first leg's start_date for date filter
  type FlatEntry = LegRow & { tripId: string }
  const flatEntries: FlatEntry[] = []
  for (const trip of tripList) {
    const sortedLegs = [...(trip.trip_legs ?? [])].sort((a, b) => a.sort_order - b.sort_order)
    for (const leg of sortedLegs) {
      if (fromDate && leg.start_date < fromDate) continue
      flatEntries.push({ ...leg, tripId: trip.id })
    }
  }

  // Sort by start_date descending
  flatEntries.sort((a, b) => b.start_date.localeCompare(a.start_date))

  // Group by year using start_date
  const grouped: Record<number, FlatEntry[]> = {}
  for (const entry of flatEntries) {
    const year = new Date(entry.start_date + 'T00:00:00').getFullYear()
    if (!grouped[year]) grouped[year] = []
    grouped[year].push(entry)
  }
  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a)

  // Days per country
  const daysByCountry: Record<string, { days: number; code: string }> = {}
  for (const entry of flatEntries) {
    const days = durationDays(entry.start_date, entry.end_date)
    if (!daysByCountry[entry.destination_country]) {
      daysByCountry[entry.destination_country] = { days: 0, code: entry.destination_country_code }
    }
    daysByCountry[entry.destination_country].days += days
  }
  const sortedCountries = Object.entries(daysByCountry).sort((a, b) => b[1].days - a[1].days)

  const totalCountries = sortedCountries.length
  const totalDays = flatEntries.reduce((sum, e) => sum + durationDays(e.start_date, e.end_date), 0)

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/wallet" className="text-muted-foreground min-h-[44px] min-w-[44px] flex items-center">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold flex-1">Travel History</h1>
        <Link
          href="/wallet/history/new"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-foreground text-background text-sm font-semibold min-h-[44px]"
        >
          <Plus size={16} />
          Log travel
        </Link>
      </div>

      <div className="flex gap-2 mb-5">
        {RANGES.map(r => (
          <Link
            key={r.value}
            href={`/wallet/history?range=${r.value}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium min-h-[32px] flex items-center ${
              range === r.value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      {flatEntries.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-6">
          <div className="bg-muted rounded-xl px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Countries</p>
            <p className="font-bold text-2xl">{totalCountries}</p>
          </div>
          <div className="bg-muted rounded-xl px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Days tracked</p>
            <p className="font-bold text-2xl">{totalDays}</p>
          </div>
        </div>
      )}

      {sortedCountries.length > 0 && (
        <section className="mb-6">
          <SectionHeader label="Days per country" />
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {sortedCountries.map(([country, { days, code }]) => (
              <div key={country} className="flex items-center gap-3 px-4 py-3">
                <span className="text-base leading-none shrink-0">{countryFlag(code)}</span>
                <p className="text-sm flex-1 min-w-0 truncate">{country}</p>
                <p className="text-sm font-semibold tabular-nums shrink-0">{days} day{days !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {years.map(year => (
        <section key={year} className="mb-6">
          <SectionHeader label={String(year)} />
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {grouped[year].map((entry, i) => (
              <Link
                key={`${entry.tripId}-${entry.sort_order}-${i}`}
                href={`/trips/${entry.tripId}`}
                className="flex items-center gap-3 px-4 py-3 min-h-[44px]"
              >
                <span className="text-base leading-none shrink-0">{countryFlag(entry.destination_country_code)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{entry.destination_country}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateRange(entry.start_date, entry.end_date)} · {durationDays(entry.start_date, entry.end_date)} days · <span className="capitalize">{entry.purpose}</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {flatEntries.length === 0 && (
        <div className="py-14 text-center">
          <p className="text-sm text-muted-foreground">No trips in this period.</p>
          <p className="text-xs text-muted-foreground mt-1">Add a trip with past dates to log historical travel.</p>
        </div>
      )}
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { countryFlagUrl } from '@/lib/countries'
import { activateTrip } from '@/app/actions/trips'
import type { Trip } from '@/lib/types'

interface Props {
  trip: Trip
}

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

function durationDays(start: string, end: string) {
  const ms = new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()
  return Math.round(ms / 86400000) + 1
}

export function ExploratoryTripCard({ trip }: Props) {
  const router = useRouter()
  const duration = durationDays(trip.start_date, trip.end_date)
  const purposeLabel = trip.purpose.charAt(0).toUpperCase() + trip.purpose.slice(1)

  return (
    <div
      className="rounded-xl border-2 border-dashed border-border bg-card shadow-sm overflow-hidden cursor-pointer p-3"
      onClick={() => router.push(`/trips/${trip.id}`)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={countryFlagUrl(trip.destination_country_code)}
              alt=""
              aria-hidden
              className="w-7 h-7 rounded-full object-cover shrink-0 border border-border/30"
            />
            <h3 className="text-[17px] font-bold leading-tight">
              {trip.destination_country}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {formatDateRange(trip.start_date, trip.end_date)} · {duration}d · {purposeLabel}
          </p>
        </div>

        <form
          action={activateTrip}
          onClick={e => e.stopPropagation()}
          className="shrink-0"
        >
          <input type="hidden" name="tripId" value={trip.id} />
          <button
            type="submit"
            className="px-3 py-2 rounded-lg bg-foreground text-background text-xs font-semibold min-h-[36px]"
          >
            Activate
          </button>
        </form>
      </div>
    </div>
  )
}

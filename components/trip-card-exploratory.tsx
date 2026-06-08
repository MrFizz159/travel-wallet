'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { countryFlagUrl } from '@/lib/countries'
import { activateTrip } from '@/app/actions/trips'
import type { Trip, TripLeg } from '@/lib/types'

interface TripWithLegs extends Trip {
  trip_legs: Pick<TripLeg, 'destination_country' | 'destination_country_code' | 'start_date' | 'end_date' | 'purpose' | 'sort_order'>[]
}

interface Props {
  trip: TripWithLegs
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

export function ExploratoryTripCard({ trip }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const legs = [...(trip.trip_legs ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const firstLeg = legs[0]
  const lastLeg = legs[legs.length - 1]

  if (!firstLeg) return null

  const title = legs.map(l => l.destination_country).join(' + ')
  const dateRange = formatDateRange(firstLeg.start_date, lastLeg?.end_date ?? firstLeg.end_date)
  const purposeLabel = firstLeg.purpose.charAt(0).toUpperCase() + firstLeg.purpose.slice(1)

  function handleActivate(e: React.MouseEvent) {
    e.stopPropagation()
    const fd = new FormData()
    fd.append('tripId', trip.id)
    startTransition(async () => { await activateTrip(fd) })
  }

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
              src={countryFlagUrl(firstLeg.destination_country_code)}
              alt=""
              aria-hidden
              className="w-7 h-7 rounded-full object-cover shrink-0 border border-border/30"
            />
            <h3 className="text-[17px] font-bold leading-tight truncate">{title}</h3>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {dateRange} · {purposeLabel}
          </p>
        </div>

        <button
          type="button"
          onClick={handleActivate}
          disabled={isPending}
          className="shrink-0 px-3 py-2 rounded-lg bg-foreground text-background text-xs font-semibold min-h-[44px] flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Activating…
            </>
          ) : 'Activate'}
        </button>
      </div>
    </div>
  )
}

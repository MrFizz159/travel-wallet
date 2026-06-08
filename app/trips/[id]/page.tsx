import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TripDetailView } from '@/components/trip-detail-view'
import { cancelTrip } from '@/app/actions/trips'
import type { TripDetail, LegDetail, RequirementRow } from '@/lib/db-types'

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: raw, error } = await supabase
    .from('trips')
    .select(`
      *,
      trip_legs (
        *,
        requirements (
          *,
          sub_tasks ( * ),
          documents ( * )
        )
      ),
      trip_transits (
        *,
        requirements (
          *,
          sub_tasks ( * ),
          documents ( * )
        )
      ),
      requirements (
        *,
        sub_tasks ( * ),
        documents ( * )
      ),
      documents ( * ),
      cases ( * )
    `)
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (error) console.error('[TripDetailPage] Supabase error:', error)
  if (!raw) notFound()

  // Shape raw data into TripDetail
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawAny = raw as any
  const tripDetail: TripDetail = {
    ...rawAny,
    legs: ([...(rawAny.trip_legs ?? [])] as LegDetail[]).sort((a, b) => a.sort_order - b.sort_order),
    transits: ([...(rawAny.trip_transits ?? [])] as any[]).sort((a, b) => a.sort_order - b.sort_order).map(t => ({
      ...t,
      requirement: ((t.requirements ?? []) as RequirementRow[])[0] ?? null,
    })),
    // manager_approval only — transit reqs have transit_id set and are excluded here
    tripRequirements: (rawAny.requirements ?? []).filter((r: any) => r.type === 'manager_approval' && r.leg_id === null),
    documents: rawAny.documents ?? [],
    cases: rawAny.cases ?? [],
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-4">
      <TripDetailView trip={tripDetail} />
      {(raw.state === 'exploratory' || raw.state === 'active') && (
        <div className="mt-8 pt-6 border-t border-border">
          <form action={cancelTrip}>
            <input type="hidden" name="tripId" value={raw.id} />
            <button
              type="submit"
              className="w-full h-12 rounded-xl border border-border text-sm text-muted-foreground font-medium"
            >
              Cancel trip
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TripDetailView } from '@/components/trip-detail-view'
import { cancelTrip } from '@/app/actions/trips'
import { runAssessment, type AssessmentOutput } from '@/lib/assessment/stub'
import type { TripDetail, LegDetail, RequirementRow, TransitWithRequirement } from '@/lib/db-types'
import type { Trip, TripLeg, TransitStop, Document, TravelCase } from '@/lib/types'

type RawTrip = Trip & {
  trip_legs: TripLeg[] | null
  trip_transits: TransitStop[] | null
  documents: Document[] | null
  cases: TravelCase[] | null
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [tripRes, reqRes] = await Promise.all([
    supabase
      .from('trips')
      .select(`
        *,
        trip_legs ( * ),
        trip_transits ( * ),
        documents ( * ),
        cases ( * )
      `)
      .eq('id', id)
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('requirements')
      .select(`
        *,
        sub_tasks ( * ),
        documents ( * )
      `)
      .eq('trip_id', id),
  ])

  if (tripRes.error) console.error('[TripDetailPage] Supabase error:', tripRes.error)
  if (reqRes.error) console.error('[TripDetailPage] Supabase error:', reqRes.error)

  const raw = tripRes.data as RawTrip | null
  if (!raw) notFound()

  // Group requirements: leg_id → leg, transit_id → transit, neither → trip level
  const requirements = (reqRes.data ?? []) as RequirementRow[]
  const legRequirements = new Map<string, RequirementRow[]>()
  const transitRequirements = new Map<string, RequirementRow>()
  const tripRequirements: RequirementRow[] = []

  for (const req of requirements) {
    if (req.leg_id) {
      const list = legRequirements.get(req.leg_id)
      if (list) list.push(req)
      else legRequirements.set(req.leg_id, [req])
    } else if (req.transit_id) {
      if (!transitRequirements.has(req.transit_id)) transitRequirements.set(req.transit_id, req)
    } else if (req.type === 'manager_approval') {
      // manager_approval only — leg and transit reqs are attached above
      tripRequirements.push(req)
    }
  }

  const legs: LegDetail[] = [...(raw.trip_legs ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(leg => ({ ...leg, requirements: legRequirements.get(leg.id) ?? [] }))

  const transits: TransitWithRequirement[] = [...(raw.trip_transits ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(t => ({ ...t, requirement: transitRequirements.get(t.id) ?? null }))

  const tripDetail: TripDetail = {
    ...raw,
    legs,
    transits,
    tripRequirements,
    documents: raw.documents ?? [],
    cases: raw.cases ?? [],
  }

  // Exploratory trips: compute assessment previews server-side (the stub is the
  // seam a real assessment engine replaces — it never runs in the client).
  const legPreviews: Record<string, AssessmentOutput> | undefined =
    raw.state === 'exploratory'
      ? Object.fromEntries(legs.map(l => [l.id, runAssessment(l.destination_country_code)]))
      : undefined

  return (
    <div className="max-w-lg mx-auto px-4 pb-4">
      <TripDetailView trip={tripDetail} legPreviews={legPreviews} />
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

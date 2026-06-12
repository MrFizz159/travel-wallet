// Internal helpers and types shared by the trip action modules.
// NOT server actions — no 'use server' here. Plain server-side code.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { runAssessment } from '@/lib/assessment/stub'
import { getTransitSubTasks, getTransitGuidance } from '@/lib/assessment/transit'
import { subtractDays, addDays } from '@/lib/dates'

type Supabase = Awaited<ReturnType<typeof createClient>>

// Payload shapes expected from the itinerary form (JSON-encoded in FormData).
// Note: assessment_result is intentionally absent — it's derived server-side
// at insert time, never trusted from the client.
export type LegPayload = {
  destination_country: string
  destination_country_code: string
  start_date: string
  end_date: string
  purpose: string
  passport_id: string
}

export type TransitPayload = {
  sort_order: number
  transit_country: string
  transit_country_code: string
  transit_date: string
  visa_required: boolean | null
  authorisation_name: string | null
  transit_note: string | null
  checked_at: string | null
  time_required_days: number
}

// Create a Supabase client and resolve the authenticated user, redirecting to
// /auth when there is no session. Every mutating action starts with this.
export async function requireUser(): Promise<{ supabase: Supabase; user: NonNullable<Awaited<ReturnType<Supabase['auth']['getUser']>>['data']['user']> }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')
  return { supabase, user }
}

// Fetch expiry dates for a set of passport ids in one query.
// Legs can reference different passports, so callers pass every distinct id.
export async function fetchPassportExpiries(
  supabase: Supabase,
  passportIds: Array<string | null | undefined>,
): Promise<Map<string, string | null>> {
  const ids = [...new Set(passportIds.filter((id): id is string => Boolean(id)))]
  const expiries = new Map<string, string | null>()
  if (ids.length === 0) return expiries

  const { data } = await supabase
    .from('passports')
    .select('id, expiry_date')
    .in('id', ids)

  for (const row of data ?? []) expiries.set(row.id, row.expiry_date)
  return expiries
}

// Insert requirements + sub_tasks for a single leg. Sub-tasks correlate with
// their parent requirement by array index (PostgREST returns inserted rows in
// input order), so legs can be processed in parallel safely.
export async function insertLegRequirements(
  supabase: Supabase,
  tripId: string,
  legId: string,
  destinationCountryCode: string,
  legStartDate: string,
  legEndDate: string,
  passportExpiry: string | null,
) {
  const assessment = runAssessment(destinationCountryCode)
  if (assessment.requirements.length === 0) return []

  const { data: insertedReqs } = await supabase
    .from('requirements')
    .insert(assessment.requirements.map(stubReq => ({
      trip_id: tripId,
      leg_id: legId,
      name: stubReq.name,
      type: stubReq.type,
      is_mandatory: stubReq.is_mandatory,
      status: 'not_started',
      time_required_days: stubReq.time_required_days,
      latest_start_date: stubReq.time_required_days > 0
        ? subtractDays(legStartDate, stubReq.time_required_days)
        : null,
      why_it_applies: stubReq.why_it_applies,
      guidance: stubReq.guidance,
      external_link: stubReq.external_link ?? null,
      what_you_need: stubReq.what_you_need ?? null,
    })))
    .select()

  if (!insertedReqs || insertedReqs.length === 0) return []
  if (insertedReqs.length !== assessment.requirements.length) {
    throw new Error(
      `Requirement insert mismatch for leg ${legId}: expected ${assessment.requirements.length} rows, got ${insertedReqs.length}`
    )
  }

  const minExpiry = addDays(legEndDate, 180)
  const subTaskPayloads = assessment.requirements.flatMap((stubReq, i) => {
    const req = insertedReqs[i]
    return stubReq.sub_tasks.map(stubTask => ({
      requirement_id: req.id,
      name: stubTask.name,
      type: stubTask.type,
      status: (stubTask.type === 'automated' && passportExpiry && passportExpiry >= minExpiry)
        ? 'complete' as const
        : 'pending' as const,
      sort_order: stubTask.sort_order,
      description: stubTask.description ?? null,
    }))
  })

  if (subTaskPayloads.length > 0) {
    await supabase.from('sub_tasks').insert(subTaskPayloads)
  }

  return insertedReqs
}

// Insert a Requirement + sub_tasks for each transit that requires a visa/eTA.
// Transits with visa_required !== true are skipped — they need no compliance record.
export async function insertTransitRequirements(
  supabase: Supabase,
  tripId: string,
  transits: Array<{
    id: string
    transit_country_code: string
    transit_date: string | null
    visa_required: boolean | null
    authorisation_name: string | null
    transit_note: string | null
    time_required_days: number
  }>,
  passportExpiry: string | null,
) {
  for (const transit of transits) {
    if (transit.visa_required !== true) continue

    const days = transit.time_required_days ?? 0
    const latestStartDate = (transit.transit_date && days > 0)
      ? subtractDays(transit.transit_date, days)
      : null

    const guidance = getTransitGuidance(transit.transit_country_code)
    const reqName = transit.authorisation_name ?? 'Transit authorisation'

    const { data: insertedReq } = await supabase
      .from('requirements')
      .insert({
        trip_id: tripId,
        leg_id: null,
        transit_id: transit.id,
        name: reqName,
        type: 'transit_eta',
        is_mandatory: true,
        status: 'not_started',
        time_required_days: days,
        latest_start_date: latestStartDate,
        why_it_applies: transit.transit_note ?? null,
        guidance: guidance.guidance,
        external_link: guidance.external_link,
        what_you_need: guidance.what_you_need,
      })
      .select()
      .single()

    if (!insertedReq) continue

    const subTasks = getTransitSubTasks(transit.authorisation_name)
    const minExpiry = transit.transit_date ? addDays(transit.transit_date, 180) : null

    const subTaskPayloads = subTasks.map(task => ({
      requirement_id: insertedReq.id,
      name: task.name,
      type: task.type,
      status: (task.type === 'automated' && passportExpiry && minExpiry && passportExpiry >= minExpiry)
        ? 'complete' as const
        : 'pending' as const,
      sort_order: task.sort_order,
      description: task.description ?? null,
    }))

    if (subTaskPayloads.length > 0) {
      await supabase.from('sub_tasks').insert(subTaskPayloads)
    }
  }
}

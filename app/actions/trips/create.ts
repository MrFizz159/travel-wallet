'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { runAssessment } from '@/lib/assessment/stub'
import { computeLegComplianceStatus } from '@/lib/compliance'
import { durationDays } from '@/lib/dates'
import { syncComplianceStatus } from '../_utils'
import {
  requireUser,
  fetchPassportExpiries,
  insertLegRequirements,
  insertTransitRequirements,
  type LegPayload,
  type TransitPayload,
} from './_shared'

export async function createTrip(formData: FormData) {
  const { supabase, user } = await requireUser()

  const legs = JSON.parse(formData.get('legs') as string) as LegPayload[]
  const transitsRaw = formData.get('transits') as string | null
  const transits: TransitPayload[] = transitsRaw ? JSON.parse(transitsRaw) : []
  const is_historical = formData.get('is_historical') === 'true'

  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      user_id: user.id,
      is_historical,
      state: is_historical ? 'completed' : 'exploratory',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await supabase.from('trip_legs').insert(
    legs.map((leg, i) => ({
      trip_id: trip.id,
      destination_country: leg.destination_country,
      destination_country_code: leg.destination_country_code,
      start_date: leg.start_date,
      end_date: leg.end_date,
      duration_days: durationDays(leg.start_date, leg.end_date),
      purpose: leg.purpose,
      passport_id: leg.passport_id || null,
      assessment_result: is_historical
        ? 'no_action_required'
        : runAssessment(leg.destination_country_code).result,
      sort_order: i,
    }))
  )

  // Persist transit rows for exploratory trips (requirements created at activation)
  if (transits.length > 0) {
    await supabase.from('trip_transits').insert(
      transits.map(t => ({
        trip_id: trip.id,
        transit_country: t.transit_country,
        transit_country_code: t.transit_country_code,
        transit_date: t.transit_date || null,
        sort_order: t.sort_order,
        visa_required: t.visa_required ?? null,
        authorisation_name: t.authorisation_name ?? null,
        transit_note: t.transit_note ?? null,
        checked_at: t.checked_at ?? null,
        time_required_days: t.time_required_days ?? 0,
      }))
    )
  }

  redirect('/trips')
}

export async function createAndActivateTrip(formData: FormData) {
  const { supabase, user } = await requireUser()

  const legs = JSON.parse(formData.get('legs') as string) as LegPayload[]
  const transits = JSON.parse(formData.get('transits') as string) as TransitPayload[]

  // 1. Create trip container
  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      user_id: user.id,
      is_historical: false,
      state: 'active',
      activated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // 2. Insert all legs
  const { data: insertedLegs } = await supabase
    .from('trip_legs')
    .insert(legs.map((leg, i) => ({
      trip_id: trip.id,
      destination_country: leg.destination_country,
      destination_country_code: leg.destination_country_code,
      start_date: leg.start_date,
      end_date: leg.end_date,
      duration_days: durationDays(leg.start_date, leg.end_date),
      purpose: leg.purpose,
      passport_id: leg.passport_id || null,
      assessment_result: runAssessment(leg.destination_country_code).result,
      sort_order: i,
    })))
    .select()

  if (!insertedLegs) throw new Error('Failed to insert legs')

  // 3. For each leg (in parallel): insert requirements + sub_tasks, then set leg status
  const passportExpiries = await fetchPassportExpiries(supabase, insertedLegs.map(l => l.passport_id))

  await Promise.all(insertedLegs.map(async dbLeg => {
    const passportExpiry = dbLeg.passport_id
      ? passportExpiries.get(dbLeg.passport_id) ?? null
      : null
    const insertedReqs = await insertLegRequirements(
      supabase, trip.id, dbLeg.id,
      dbLeg.destination_country_code,
      dbLeg.start_date, dbLeg.end_date,
      passportExpiry,
    )
    const legStatus = computeLegComplianceStatus(insertedReqs)
    await supabase.from('trip_legs').update({ compliance_status: legStatus }).eq('id', dbLeg.id)
  }))

  // 4. Manager approval — trip-level (leg_id = null, transit_id = null)
  await supabase.from('requirements').insert({
    trip_id: trip.id,
    leg_id: null,
    name: 'Manager Approval',
    type: 'manager_approval',
    is_mandatory: true,
    status: 'not_started',
    time_required_days: 0,
    latest_start_date: null,
    why_it_applies: 'Your organisation requires manager sign-off before travel can proceed.',
    guidance: 'Select your manager and send a request for approval. Your trip cannot be marked compliant until this is approved.',
    external_link: null,
    what_you_need: null,
    approval_state: 'unsent',
    approver_name: null,
    approval_log: [],
  })

  // 5. Insert transit rows and create requirements for those needing authorisation
  if (transits.length > 0) {
    const { data: insertedTransits } = await supabase
      .from('trip_transits')
      .insert(
        transits.map(t => ({
          trip_id: trip.id,
          transit_country: t.transit_country,
          transit_country_code: t.transit_country_code,
          transit_date: t.transit_date || null,
          sort_order: t.sort_order,
          visa_required: t.visa_required ?? null,
          authorisation_name: t.authorisation_name ?? null,
          transit_note: t.transit_note ?? null,
          checked_at: t.checked_at ?? null,
          time_required_days: t.time_required_days ?? 0,
        }))
      )
      .select()

    if (insertedTransits && insertedTransits.length > 0) {
      const firstLegPassportId = legs[0]?.passport_id || null
      const firstLegExpiry = firstLegPassportId
        ? passportExpiries.get(firstLegPassportId) ?? null
        : null
      await insertTransitRequirements(supabase, trip.id, insertedTransits, firstLegExpiry)
    }
  }

  // 6. Compute overall trip compliance
  await syncComplianceStatus(supabase, trip.id, user.id)

  revalidatePath(`/trips/${trip.id}`)
  revalidatePath('/trips')
  redirect(`/trips/${trip.id}`)
}

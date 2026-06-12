'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { computeLegComplianceStatus } from '@/lib/compliance'
import { syncComplianceStatus } from '../_utils'
import {
  requireUser,
  fetchPassportExpiries,
  insertLegRequirements,
  insertTransitRequirements,
} from './_shared'

export async function activateTrip(formData: FormData) {
  const { supabase, user } = await requireUser()

  const tripId = formData.get('tripId') as string

  // Verify ownership
  const { data: trip } = await supabase
    .from('trips')
    .select('id, state')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single()
  if (!trip) throw new Error('Trip not found')

  // Fetch legs (created at exploratory stage)
  const { data: legs } = await supabase
    .from('trip_legs')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order')

  const passportExpiries = await fetchPassportExpiries(supabase, (legs ?? []).map(l => l.passport_id))

  await Promise.all((legs ?? []).map(async leg => {
    const passportExpiry = leg.passport_id
      ? passportExpiries.get(leg.passport_id) ?? null
      : null
    const insertedReqs = await insertLegRequirements(
      supabase, tripId, leg.id,
      leg.destination_country_code,
      leg.start_date, leg.end_date,
      passportExpiry,
    )
    const legStatus = computeLegComplianceStatus(insertedReqs)
    await supabase.from('trip_legs').update({ compliance_status: legStatus }).eq('id', leg.id)
  }))

  // Manager approval
  await supabase.from('requirements').insert({
    trip_id: tripId,
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

  // Fetch existing transit rows and create requirements for those needing authorisation
  const { data: existingTransits } = await supabase
    .from('trip_transits')
    .select('*')
    .eq('trip_id', tripId)

  if (existingTransits && existingTransits.length > 0) {
    const firstLegPassportId = legs?.[0]?.passport_id ?? null
    const firstLegExpiry = firstLegPassportId
      ? passportExpiries.get(firstLegPassportId) ?? null
      : null
    await insertTransitRequirements(supabase, tripId, existingTransits, firstLegExpiry)
  }

  await supabase
    .from('trips')
    .update({ state: 'active', activated_at: new Date().toISOString() })
    .eq('id', tripId)
    .eq('user_id', user.id)

  await syncComplianceStatus(supabase, tripId, user.id)

  revalidatePath(`/trips/${tripId}`)
  revalidatePath('/trips')
  redirect(`/trips/${tripId}`)
}

export async function cancelTrip(formData: FormData) {
  const { supabase, user } = await requireUser()

  const tripId = formData.get('tripId') as string

  const { data: trip } = await supabase
    .from('trips')
    .select('state')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single()

  if (!trip) throw new Error('Trip not found')
  if (trip.state === 'completed' || trip.state === 'cancelled') redirect('/trips')

  await supabase
    .from('trips')
    .update({ state: 'cancelled' })
    .eq('id', tripId)
    .eq('user_id', user.id)

  revalidatePath('/trips')
  revalidatePath(`/trips/${tripId}`)
  redirect('/trips')
}

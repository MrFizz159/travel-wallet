'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { runTransitCheck } from '@/lib/assessment/transit'
import { syncComplianceStatus } from '../_utils'
import { requireUser } from './_shared'

export async function checkTransit(formData: FormData) {
  const { supabase, user } = await requireUser()

  const transitId = formData.get('transitId') as string
  const tripId = formData.get('tripId') as string

  // Fetch transit row
  const { data: transit } = await supabase
    .from('trip_transits')
    .select('transit_country_code, trip_id')
    .eq('id', transitId)
    .single()
  if (!transit) throw new Error('Transit not found')

  // Fetch traveller nationality from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('nationality')
    .eq('id', user.id)
    .single()

  // Nationality stored as country name in profiles — look up code from primary passport
  const { data: passport } = await supabase
    .from('passports')
    .select('nationality')
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .single()

  const nationalityName = passport?.nationality ?? profile?.nationality ?? 'Unknown'

  const result = await runTransitCheck(transit.transit_country_code, nationalityName)

  await supabase
    .from('trip_transits')
    .update({
      visa_required: result.visa_required,
      authorisation_name: result.authorisation_name ?? null,
      transit_note: result.reason,
      checked_at: new Date().toISOString(),
      time_required_days: result.time_required_days,
    })
    .eq('id', transitId)

  await syncComplianceStatus(supabase, tripId, user.id)

  revalidatePath(`/trips/${tripId}`)
}

export async function confirmTransitVisa(formData: FormData) {
  const { supabase, user } = await requireUser()

  const transitId = formData.get('transitId') as string
  const tripId = formData.get('tripId') as string

  await supabase
    .from('trip_transits')
    .update({ user_confirmed: true })
    .eq('id', transitId)

  await syncComplianceStatus(supabase, tripId, user.id)

  revalidatePath(`/trips/${tripId}`)
}

// Pre-save transit check — called from the intake form before any trip is created.
// Returns the check result without writing to DB.
// Note: does NOT use requireUser() — an unauthenticated call returns a fallback
// result instead of redirecting.
export async function previewTransitCheck(transitCountryCode: string): Promise<import('@/lib/assessment/transit').TransitCheckResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { visa_required: true, authorisation_name: null, reason: 'Not authenticated', confidence: 'low', time_required_days: 0 }

  const { data: passport } = await supabase
    .from('passports')
    .select('nationality')
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('nationality')
    .eq('id', user.id)
    .single()

  const nationality = passport?.nationality ?? profile?.nationality ?? 'Unknown'
  return runTransitCheck(transitCountryCode, nationality)
}

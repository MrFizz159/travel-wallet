import type { SupabaseClient } from '@supabase/supabase-js'
import {
  computeLegComplianceStatus,
  computeTripComplianceStatus,
  transitComplianceStatus,
} from '@/lib/compliance'
import type { TransitStop, ComplianceStatus, Requirement } from '@/lib/types'

export async function syncComplianceStatus(
  supabase: SupabaseClient,
  tripId: string,
  userId: string,
): Promise<void> {
  // 1. Fetch all legs with their requirements
  const { data: legs } = await supabase
    .from('trip_legs')
    .select('id, requirements(*)')
    .eq('trip_id', tripId)
    .order('sort_order')

  const legStatuses: ComplianceStatus[] = []
  for (const leg of legs ?? []) {
    const status = computeLegComplianceStatus(leg.requirements ?? [])
    legStatuses.push(status)
    await supabase
      .from('trip_legs')
      .update({ compliance_status: status })
      .eq('id', leg.id)
  }

  // 2. Fetch transits with their linked requirements
  const { data: transits } = await supabase
    .from('trip_transits')
    .select('*, requirements(*)')
    .eq('trip_id', tripId)

  const transitStatuses: ComplianceStatus[] = (transits ?? []).map(transit => {
    const linkedReqs = (transit.requirements ?? []) as Requirement[]
    if (linkedReqs.length > 0) {
      // Use the same logic as leg requirements for proper at_risk surfacing
      return computeLegComplianceStatus(linkedReqs)
    }
    // Fallback: legacy boolean check for unchecked / no-visa-required transits
    return transitComplianceStatus(transit as TransitStop)
  })

  // 3. Fetch manager_approval requirements only (transit reqs have transit_id set)
  const { data: managerReqs } = await supabase
    .from('requirements')
    .select('*')
    .eq('trip_id', tripId)
    .eq('type', 'manager_approval')
    .is('leg_id', null)

  // 4. Roll up into overall trip compliance
  const tripStatus = computeTripComplianceStatus(legStatuses, transitStatuses, managerReqs ?? [])

  await supabase
    .from('trips')
    .update({ compliance_status: tripStatus })
    .eq('id', tripId)
    .eq('user_id', userId)
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { computeComplianceStatus } from '@/lib/compliance'

export async function syncComplianceStatus(
  supabase: SupabaseClient,
  tripId: string,
  userId: string,
): Promise<void> {
  const { data: allRequirements } = await supabase
    .from('requirements')
    .select('*')
    .eq('trip_id', tripId)

  const newStatus = computeComplianceStatus(allRequirements ?? [])

  await supabase
    .from('trips')
    .update({ compliance_status: newStatus })
    .eq('id', tripId)
    .eq('user_id', userId)
}

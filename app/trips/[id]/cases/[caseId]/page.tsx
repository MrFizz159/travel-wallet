import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CaseDetailView } from '@/components/case-detail-view'
import type { TravelCase } from '@/lib/types'

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string; caseId: string }>
}) {
  const { id: tripId, caseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: travelCase } = await supabase
    .from('cases')
    .select(`*, requirements ( name )`)
    .eq('id', caseId)
    .eq('trip_id', tripId)
    .eq('user_id', user!.id)
    .single()

  if (!travelCase) notFound()

  const backLabel = (travelCase as TravelCase & { requirements: { name: string } | null })
    .requirements?.name ?? 'Trip'

  return (
    <CaseDetailView
      travelCase={travelCase as TravelCase}
      tripId={tripId}
      backLabel={backLabel}
    />
  )
}

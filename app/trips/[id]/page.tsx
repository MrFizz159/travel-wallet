import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TripDetailView } from '@/components/trip-detail-view'
import { cancelTrip } from '@/app/actions/trips'
import type { TripDetail } from '@/lib/db-types'

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select(`
      *,
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

  if (tripError) {
    console.error('[TripDetailPage] Supabase error:', tripError)
  }
  if (!trip) notFound()

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <Link href="/trips" className="inline-flex items-center text-muted-foreground min-h-[44px] min-w-[44px] mb-1 -ml-1">
        <ArrowLeft size={20} />
      </Link>
      <TripDetailView trip={trip as TripDetail} />
      {(trip.state === 'exploratory' || trip.state === 'active') && (
        <div className="mt-8 pt-6 border-t border-border">
          <form action={cancelTrip}>
            <input type="hidden" name="tripId" value={trip.id} />
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

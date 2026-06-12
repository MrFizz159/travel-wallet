import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/dates'
import { Card } from '@/components/ui-kit'

interface DocRow {
  id: string
  trip_id: string | null
  name: string
  type: string | null
  upload_date: string
}

interface TripRow {
  id: string
  trip_legs: { destination_country: string; sort_order: number }[]
}

const TYPE_LABELS: Record<string, string> = {
  flight_confirmation: 'Flight',
  boarding_pass: 'Boarding pass',
  hotel_confirmation: 'Hotel',
  travel_insurance: 'Insurance',
  visa: 'Visa',
  letter_draft: 'Letter',
}

function typeLabel(type: string | null): string | null {
  if (!type) return null
  return TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')
}

export default async function WalletDocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: documents }, { data: trips }] = await Promise.all([
    supabase
      .from('documents')
      .select('id, trip_id, name, type, upload_date')
      .eq('user_id', user!.id)
      .order('upload_date', { ascending: false }),
    supabase
      .from('trips')
      .select('id, trip_legs(destination_country, sort_order)')
      .eq('user_id', user!.id),
  ])

  const docList = (documents ?? []) as DocRow[]
  const tripList = (trips ?? []) as TripRow[]

  const tripLabels = new Map<string, string>()
  for (const trip of tripList) {
    const label = [...(trip.trip_legs ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(l => l.destination_country)
      .join(' + ')
    if (label) tripLabels.set(trip.id, label)
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/wallet" className="text-muted-foreground min-h-[44px] min-w-[44px] flex items-center">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold flex-1">Documents</h1>
      </div>

      {docList.length > 0 ? (
        <Card className="divide-y divide-border mb-4">
          {docList.map(doc => {
            const tripLabel = doc.trip_id ? tripLabels.get(doc.trip_id) : null
            const subline = [tripLabel, `Uploaded ${formatDate(doc.upload_date.split('T')[0])}`]
              .filter(Boolean)
              .join(' · ')
            const inner = (
              <>
                <FileText size={16} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{subline}</p>
                </div>
                {typeLabel(doc.type) && (
                  <span className="text-xs text-muted-foreground shrink-0">{typeLabel(doc.type)}</span>
                )}
              </>
            )

            return doc.trip_id ? (
              <Link
                key={doc.id}
                href={`/trips/${doc.trip_id}/documents/${doc.id}`}
                className="flex items-center gap-3 px-4 py-3 min-h-[44px]"
              >
                {inner}
              </Link>
            ) : (
              <div key={doc.id} className="flex items-center gap-3 px-4 py-3 min-h-[44px]">
                {inner}
              </div>
            )
          })}
        </Card>
      ) : (
        <div className="py-14 text-center">
          <p className="text-sm text-muted-foreground">No documents yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Documents you upload or generate will appear here.</p>
        </div>
      )}
    </div>
  )
}

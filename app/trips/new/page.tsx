import { createClient } from '@/lib/supabase/server'
import { AddTripForm } from './add-trip-form'

export default async function NewTripPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: passports } = await supabase
    .from('passports')
    .select('id, issuing_country, nationality, expiry_date, is_primary')
    .eq('user_id', user!.id)
    .order('is_primary', { ascending: false })

  return (
    <div className="min-h-screen px-4 pt-6">
      <AddTripForm passports={passports ?? []} />
    </div>
  )
}

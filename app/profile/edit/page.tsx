import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { EditProfileForm } from './edit-profile-form'

export default async function EditProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name, nationality, country_of_residence').eq('id', user!.id).single()

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="text-muted-foreground min-h-[44px] min-w-[44px] flex items-center">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">Edit profile</h1>
      </div>

      <p className="text-sm text-muted-foreground -mt-4 mb-6">Used to personalise your compliance assessments.</p>

      <EditProfileForm
        fullName={(profile as any)?.full_name ?? ''}
        nationality={(profile as any)?.nationality ?? ''}
        countryOfResidence={(profile as any)?.country_of_residence ?? ''}
      />
    </div>
  )
}

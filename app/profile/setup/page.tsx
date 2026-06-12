import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProfileSetupForm } from './profile-setup-form'

export default async function ProfileSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name, nationality, country_of_residence').eq('id', user!.id).single()

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <div className="mb-2">
        <div className="flex gap-1.5 mb-5">
          <div className="h-1 flex-1 rounded-full bg-foreground" />
          <div className="h-1 flex-1 rounded-full bg-border" />
        </div>
        <h1 className="text-2xl font-bold">Tell us about you</h1>
        <p className="text-sm text-muted-foreground mt-1">
          We use this to personalise your compliance assessments.
        </p>
      </div>

      <ProfileSetupForm
        fullName={profile?.full_name ?? ''}
        nationality={profile?.nationality ?? ''}
        countryOfResidence={profile?.country_of_residence ?? ''}
      />

      <Link
        href="/profile/setup/passport"
        className="block text-center text-sm text-muted-foreground py-4 min-h-[44px] flex items-center justify-center"
      >
        Skip for now
      </Link>
    </div>
  )
}

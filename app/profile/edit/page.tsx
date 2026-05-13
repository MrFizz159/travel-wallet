import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { updateProfile } from '@/app/actions/profile'

const inputClass = 'w-full h-12 px-4 rounded-xl border border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

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

      <form action={updateProfile} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Full name</label>
          <input
            type="text"
            name="full_name"
            defaultValue={(profile as any)?.full_name ?? ''}
            placeholder="As it appears on your passport"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelClass}>Nationality</label>
          <input
            type="text"
            name="nationality"
            defaultValue={(profile as any)?.nationality ?? ''}
            placeholder="e.g. British"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelClass}>Country of residence</label>
          <input
            type="text"
            name="country_of_residence"
            defaultValue={(profile as any)?.country_of_residence ?? ''}
            placeholder="e.g. United Kingdom"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm"
        >
          Save changes
        </button>
      </form>
    </div>
  )
}

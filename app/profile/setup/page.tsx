import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { updateProfileWizard } from '@/app/actions/profile'

const inputClass = 'w-full h-12 px-4 rounded-xl border border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

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

      <form action={updateProfileWizard} className="flex flex-col gap-6 mt-8">
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
          Continue →
        </button>
      </form>

      <Link
        href="/profile/setup/passport"
        className="block text-center text-sm text-muted-foreground py-4 min-h-[44px] flex items-center justify-center"
      >
        Skip for now
      </Link>
    </div>
  )
}

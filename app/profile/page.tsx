import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Avatar, PageHeader } from '@/components/ui-kit'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, nationality, country_of_residence, job_title, employer')
    .eq('id', user!.id)
    .single()

  const p = profile as {
    full_name: string | null
    nationality: string | null
    country_of_residence: string | null
    job_title: string | null
    employer: string | null
  } | null

  const name = p?.full_name ?? null
  const nationality = p?.nationality ?? null
  const residence = p?.country_of_residence ?? null

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <PageHeader
        title="Profile"
        rightSlot={
          <Link href="/profile/edit" className="text-sm text-muted-foreground min-h-[44px] flex items-center">
            Edit
          </Link>
        }
      />

      {/* Identity card */}
      <div className="flex items-center gap-4 mb-6">
        <Avatar name={name} size="lg" />
        <div className="min-w-0">
          <p className="font-bold text-lg leading-tight truncate">
            {name ?? <span className="text-muted-foreground font-normal">Add your name</span>}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {[nationality, residence].filter(Boolean).join(' · ') || 'Add nationality & residence'}
          </p>
        </div>
      </div>

      {/* Personal details */}
      <div className="flex items-center gap-3 mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground shrink-0">Personal details</p>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden mb-4">
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Nationality</p>
          <p className="text-sm font-medium mt-0.5">{nationality ?? <span className="text-muted-foreground">Not set</span>}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Country of residence</p>
          <p className="text-sm font-medium mt-0.5">{residence ?? <span className="text-muted-foreground">Not set</span>}</p>
        </div>
        {p?.job_title && (
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Job title</p>
            <p className="text-sm font-medium mt-0.5">{p.job_title}</p>
          </div>
        )}
        {p?.employer && (
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Employer</p>
            <p className="text-sm font-medium mt-0.5">{p.employer}</p>
          </div>
        )}
      </div>

      {/* Account */}
      <div className="flex items-center gap-3 mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground shrink-0">Account</p>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden mb-4">
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="text-sm font-medium mt-0.5">{user?.email}</p>
        </div>
      </div>
    </div>
  )
}

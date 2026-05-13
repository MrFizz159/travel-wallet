import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PassportCard from '@/components/passport-card'
import { deletePassport } from '@/app/actions/profile'
import type { Passport } from '@/lib/types'

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function PassportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data, error } = await supabase
    .from('passports')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) notFound()

  const passport = data as Passport

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/wallet" className="text-muted-foreground min-h-[44px] min-w-[44px] flex items-center">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">Passport</h1>
      </div>

      <div className="mb-4">
        <PassportCard passport={passport} />
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Issuing country</p>
          <p className="text-sm font-medium mt-0.5">{passport.issuing_country}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Nationality</p>
          <p className="text-sm font-medium mt-0.5">{passport.nationality}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Passport number</p>
          <p className="text-sm font-medium mt-0.5">{passport.passport_number}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Issue date</p>
          <p className="text-sm font-medium mt-0.5">{formatDate(passport.issue_date)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Expiry date</p>
          <p className="text-sm font-medium mt-0.5">{formatDate(passport.expiry_date)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="text-sm font-medium mt-0.5">{passport.is_primary ? 'Primary' : 'Secondary'}</p>
        </div>
      </div>

      <div className="mt-6">
        <form action={deletePassport}>
          <input type="hidden" name="id" value={passport.id} />
          <button
            type="submit"
            className="w-full h-12 rounded-xl border border-destructive text-destructive font-semibold text-sm bg-transparent"
          >
            Delete passport
          </button>
        </form>
      </div>
    </div>
  )
}

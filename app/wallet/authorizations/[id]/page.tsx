import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VisaSticker from '@/components/visa-sticker'
import { deleteAuthorization } from '@/app/actions/wallet'
import type { Authorization, Passport } from '@/lib/types'

export default async function AuthorizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: authData } = await supabase
    .from('authorizations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!authData) notFound()

  const auth = authData as Authorization

  let passport: Pick<Passport, 'passport_number' | 'issuing_country'> | null = null
  if (auth.passport_id) {
    const { data: passportData } = await supabase
      .from('passports')
      .select('passport_number, issuing_country')
      .eq('id', auth.passport_id)
      .single()
    passport = passportData ?? null
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/wallet" className="text-muted-foreground min-h-[44px] min-w-[44px] flex items-center">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">Authorization</h1>
      </div>

      <div className="mb-4">
        <VisaSticker authorization={auth} />
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Name</p>
          <p className="text-sm font-medium mt-0.5">{auth.name}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Country</p>
          <p className="text-sm font-medium mt-0.5">{auth.country}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Issue date</p>
          <p className="text-sm font-medium mt-0.5">{formatDate(auth.issue_date)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Expiry date</p>
          <p className="text-sm font-medium mt-0.5">{formatDate(auth.expiry_date)}</p>
        </div>
        {auth.passport_id && (
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Connected passport</p>
            <p className="text-sm font-medium mt-0.5">
              {passport
                ? `${passport.issuing_country} ••• ${passport.passport_number.slice(-4)}`
                : 'Unknown'}
            </p>
          </div>
        )}
      </div>

      <form action={deleteAuthorization} className="mt-6">
        <input type="hidden" name="id" value={auth.id} />
        <button
          type="submit"
          className="w-full h-12 rounded-xl border border-destructive text-destructive font-semibold text-sm bg-transparent"
        >
          Delete authorization
        </button>
      </form>
    </div>
  )
}

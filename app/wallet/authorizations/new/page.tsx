import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { COUNTRIES, countryFlag } from '@/lib/countries'
import { createAuthorization } from '@/app/actions/wallet'
import type { Passport } from '@/lib/types'

const inputClass = 'w-full h-12 px-4 rounded-xl border border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

export default async function AddAuthorizationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: passports } = await supabase
    .from('passports')
    .select('id, issuing_country, passport_number, is_primary')
    .eq('user_id', user.id)
    .order('is_primary', { ascending: false })

  const passportList = (passports ?? []) as Pick<Passport, 'id' | 'issuing_country' | 'passport_number' | 'is_primary'>[]

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/wallet" className="text-muted-foreground min-h-[44px] min-w-[44px] flex items-center">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">Add authorization</h1>
      </div>

      <form action={createAuthorization} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Name</label>
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. UK Skilled Worker Visa"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelClass}>Country</label>
          <select name="country_code" required className={inputClass}>
            <option value="">Select country</option>
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>
                {countryFlag(c.code)} {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Issue date</label>
            <input
              type="date"
              name="issue_date"
              required
              className="h-12 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Expiry date</label>
            <input
              type="date"
              name="expiry_date"
              required
              className="h-12 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {passportList.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className={labelClass}>
              Connected passport <span className="normal-case font-normal text-muted-foreground">(optional)</span>
            </label>
            <select name="passport_id" className={inputClass}>
              <option value="">None</option>
              {passportList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.issuing_country} ••• {p.passport_number.slice(-4)}{p.is_primary ? ' (Primary)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm"
        >
          Save authorization
        </button>
      </form>
    </div>
  )
}

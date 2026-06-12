import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { COUNTRIES, countryFlag } from '@/lib/countries'
import { createAuthorization } from '@/app/actions/wallet'
import type { Passport } from '@/lib/types'
import { Field, Input, Select, PrimaryButton } from '@/components/ui-kit'

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
        <Field label="Name">
          <Input
            type="text"
            name="name"
            required
            placeholder="e.g. UK Skilled Worker Visa"
          />
        </Field>

        <Field label="Country">
          <Select name="country_code" required>
            <option value="">Select country</option>
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>
                {countryFlag(c.code)} {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Issue date">
            <Input type="date" name="issue_date" required />
          </Field>
          <Field label="Expiry date">
            <Input type="date" name="expiry_date" required />
          </Field>
        </div>

        {passportList.length > 0 && (
          <div className="flex flex-col gap-2">
            {/* Hand-rolled label: Field's label prop is string-only and the
                "(optional)" suffix needs normal-case styling */}
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Connected passport <span className="normal-case font-normal text-muted-foreground">(optional)</span>
            </label>
            <Select name="passport_id">
              <option value="">None</option>
              {passportList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.issuing_country} ••• {p.passport_number.slice(-4)}{p.is_primary ? ' (Primary)' : ''}
                </option>
              ))}
            </Select>
          </div>
        )}

        <PrimaryButton type="submit">Save authorization</PrimaryButton>
      </form>
    </div>
  )
}

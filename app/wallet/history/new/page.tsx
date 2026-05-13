import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { COUNTRIES, countryFlag } from '@/lib/countries'
import { createTravelHistoryEntry } from '@/app/actions/history'

const inputClass = 'w-full h-12 px-4 rounded-xl border border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

export default async function LogTravelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/wallet/history" className="text-muted-foreground min-h-[44px] min-w-[44px] flex items-center">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">Log travel</h1>
      </div>

      <form action={createTravelHistoryEntry} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Travelling from</label>
          <select name="origin_country_code" required className={inputClass}>
            <option value="">Select country</option>
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>
                {countryFlag(c.code)} {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelClass}>Destination</label>
          <select name="destination_country_code" required className={inputClass}>
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
            <label className={labelClass}>Arrival</label>
            <input
              type="date"
              name="start_date"
              required
              max={today}
              className="h-12 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Departure</label>
            <input
              type="date"
              name="end_date"
              required
              max={today}
              className="h-12 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelClass}>Purpose</label>
          <select name="purpose" required className={inputClass}>
            <option value="business">Business</option>
            <option value="tourism">Tourism</option>
            <option value="education">Education</option>
            <option value="relocation">Relocation</option>
            <option value="other">Other</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm"
        >
          Save trip
        </button>
      </form>
    </div>
  )
}

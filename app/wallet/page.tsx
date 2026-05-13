import Link from 'next/link'
import { ChevronRight, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui-kit'
import PassportCard from '@/components/passport-card'
import type { Passport } from '@/lib/types'

function monthsUntilExpiry(expiryDate: string) {
  const today = new Date()
  const expiry = new Date(expiryDate + 'T00:00:00')
  return (expiry.getFullYear() - today.getFullYear()) * 12 + (expiry.getMonth() - today.getMonth())
}

export default async function WalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: passports }, { count: completedTripCount }, { data: completedTrips }] = await Promise.all([
    supabase.from('passports').select('*').eq('user_id', user!.id).order('is_primary', { ascending: false }),
    supabase.from('trips').select('id', { count: 'exact', head: true }).eq('user_id', user!.id).eq('state', 'completed'),
    supabase.from('trips').select('destination_country_code').eq('user_id', user!.id).eq('state', 'completed'),
  ])

  const passportList = (passports ?? []) as Passport[]
  const primary = passportList.find(p => p.is_primary) ?? passportList[0] ?? null
  const expiryMonths = primary ? monthsUntilExpiry(primary.expiry_date) : null
  const expiryWarning = expiryMonths !== null && expiryMonths <= 6
  const countriesVisited = new Set((completedTrips ?? []).map((t: { destination_country_code: string }) => t.destination_country_code)).size

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <PageHeader title="Wallet" />

      {/* Urgent expiry alert — only shown for ≤6 months since card handles 6–12 month warning */}
      {expiryWarning && primary && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-status-at-risk-bg mb-4">
          <AlertTriangle size={16} className="text-status-at-risk shrink-0" />
          <p className="text-sm text-status-at-risk font-medium">
            {primary.issuing_country} passport expires in {expiryMonths} month{expiryMonths !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Passports */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Passports</p>
        <Link href="/profile/passports/new" className="text-xs font-semibold text-primary min-h-[44px] flex items-center">
          + Add
        </Link>
      </div>
      {passportList.length > 0 ? (
        <div className="flex flex-col gap-3 mb-6">
          {passportList.map(passport => (
            <PassportCard key={passport.id} passport={passport} />
          ))}
        </div>
      ) : (
        <Link
          href="/profile/passports/new"
          className="rounded-2xl border-2 border-dashed border-border bg-card px-5 py-4 flex items-center gap-3 mb-6 min-h-[112px]"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Add your passport</p>
            <p className="text-xs text-muted-foreground mt-1">Required for compliance checks and travel history</p>
          </div>
          <span className="text-sm font-semibold text-primary shrink-0">Add →</span>
        </Link>
      )}

      {/* Authorizations */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Authorizations</p>
        <Link href="/wallet/authorizations/new" className="text-xs font-semibold text-primary min-h-[44px] flex items-center">
          + Add
        </Link>
      </div>
      <div className="rounded-xl border-2 border-dashed border-border bg-card px-4 py-4 flex items-center gap-3 mb-6 min-h-[88px]">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">No active authorizations</p>
          <p className="text-xs text-muted-foreground mt-1">Visas, permits, ETAs, and rights to work or reside</p>
        </div>
      </div>

      {/* History & tracking */}
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">History & tracking</p>
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden mb-4">
        <Link href="/wallet/history" className="flex items-center gap-3 px-4 py-3 min-h-[44px]">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Travel History</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {(completedTripCount ?? 0) > 0
                ? `${completedTripCount} trip${completedTripCount !== 1 ? 's' : ''} · ${countriesVisited} countr${countriesVisited !== 1 ? 'ies' : 'y'}`
                : 'No history yet'}
            </p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground shrink-0" />
        </Link>
        <div className="flex items-center gap-3 px-4 py-3 min-h-[44px] opacity-40">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Thresholds</p>
            <p className="text-xs text-muted-foreground mt-0.5">183-day, Schengen 90/180, and custom rules</p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">Coming soon</span>
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Documents</p>
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden mb-4">
        <div className="flex items-center gap-3 px-4 py-3 min-h-[44px] opacity-40">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">All Documents</p>
            <p className="text-xs text-muted-foreground mt-0.5">Every document across all trips</p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">Coming soon</span>
        </div>
      </div>
    </div>
  )
}

import { cn } from '@/lib/utils'
import { COUNTRIES, countryFlag } from '@/lib/countries'
// Imported directly (not via the ui-kit index) so this stays a server component
import { statusClasses, type StatusValue } from '@/components/ui-kit/status'
import type { Passport } from '@/lib/types'

function countryToFlag(countryName: string): string {
  const match = COUNTRIES.find(c => c.name === countryName)
  if (!match) return '🌍'
  return countryFlag(match.code)
}

interface PassportCardProps {
  passport: Passport
  className?: string
}

export default function PassportCard({ passport, className }: PassportCardProps) {
  const today = new Date()
  const expiry = new Date(passport.expiry_date)
  const monthsUntilExpiry =
    (expiry.getFullYear() - today.getFullYear()) * 12 +
    (expiry.getMonth() - today.getMonth())

  const last4 = passport.passport_number.slice(-4)
  const formattedExpiry = expiry.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  const flag = countryToFlag(passport.issuing_country)

  let pillLabel: string | null = null
  let pillStatus: StatusValue | null = null
  if (monthsUntilExpiry <= 0) {
    pillLabel = 'Expired'
    pillStatus = 'at_risk'
  } else if (monthsUntilExpiry <= 6) {
    pillLabel = 'Expiring'
    pillStatus = 'at_risk'
  } else if (monthsUntilExpiry <= 12) {
    pillLabel = 'Expiring soon'
    pillStatus = 'incomplete'
  }
  // onDark variant — high-contrast status colours for the navy gradient
  const pill = pillStatus ? statusClasses(pillStatus, { onDark: true }) : null

  return (
    <div
      className={cn(
        'relative w-full min-h-[112px] rounded-2xl shadow-md overflow-hidden flex flex-col justify-between px-5 py-4',
        monthsUntilExpiry <= 0 && 'opacity-70',
        className
      )}
      style={{ background: 'linear-gradient(135deg, #2C3E70 0%, #1A2848 100%)' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-3xl leading-none">{flag}</span>
          <span className="font-bold text-xl text-white leading-none">{passport.issuing_country}</span>
        </div>
        {passport.is_primary && (
          <span className="text-[10px] font-semibold tracking-widest uppercase text-white/60">Primary</span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-xs text-white/50 font-mono">••• {last4}</span>
        <div className="flex flex-col items-end gap-0.5">
          {pillLabel && pill && (
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', pill.bg, pill.text)}>
              {pillLabel}
            </span>
          )}
          <span className="text-xs text-white/70">Exp {formattedExpiry}</span>
        </div>
      </div>
    </div>
  )
}

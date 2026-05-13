import { cn } from '@/lib/utils'
import { Visa } from '@/lib/types'

function countryToFlag(code: string): string {
  if (!code || code.length !== 2) return '🌍'
  return code.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface VisaStickerProps {
  visa: Visa
  className?: string
}

export default function VisaSticker({ visa, className }: VisaStickerProps) {
  const today = new Date()
  const expiry = new Date(visa.valid_until + 'T00:00:00')
  const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const accentClass =
    daysUntilExpiry > 60
      ? 'bg-status-compliant'
      : daysUntilExpiry > 0
      ? 'bg-status-incomplete'
      : 'bg-status-verified'

  const isExpired = daysUntilExpiry <= 0

  const entryLabel =
    visa.entry_type === 'single'
      ? 'Single entry'
      : visa.entry_type === 'double'
      ? 'Double entry'
      : 'Multiple entry'

  return (
    <div
      className={cn(
        'relative overflow-hidden flex flex-col justify-between px-4 py-3 min-h-[88px] border border-border rounded-xl',
        isExpired && 'opacity-60',
        className
      )}
      style={{
        backgroundColor: '#F9F6F0',
        backgroundImage:
          'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.025) 4px, rgba(0,0,0,0.025) 5px)',
      }}
    >
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-xl', accentClass)} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{countryToFlag(visa.country_code)}</span>
          <span className="text-sm font-semibold text-foreground">{visa.country}</span>
        </div>
        <span className="bg-muted text-muted-foreground text-xs font-medium px-2.5 py-1 rounded-full capitalize">
          {visa.visa_type}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {formatDate(visa.valid_from)} – {formatDate(visa.valid_until)}
        </span>
        <span className="text-xs text-muted-foreground">{entryLabel}</span>
      </div>
    </div>
  )
}

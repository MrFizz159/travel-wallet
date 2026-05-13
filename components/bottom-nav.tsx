'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, Wallet, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/trips', label: 'Trips', Icon: Briefcase },
  { href: '/wallet', label: 'Wallet', Icon: Wallet },
  { href: '/profile', label: 'Profile', Icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  if (pathname.startsWith('/auth') || pathname.startsWith('/profile/setup')) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-6 py-2 min-w-[44px] min-h-[44px] justify-center',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
              <span className={cn('text-xs', active ? 'font-semibold' : 'font-normal')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

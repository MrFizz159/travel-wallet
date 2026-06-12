'use client'

import { Printer } from 'lucide-react'
import { SecondaryButton } from '@/components/ui-kit'

export default function PrintLetterButton({ className }: { className?: string }) {
  return (
    <SecondaryButton onClick={() => window.print()} className={className}>
      <Printer size={16} />
      Print / PDF
    </SecondaryButton>
  )
}

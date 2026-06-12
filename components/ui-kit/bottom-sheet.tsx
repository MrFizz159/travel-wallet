'use client'

/**
 * Travel Wallet — UI Kit · BottomSheet
 *
 * The app's one modal pattern. Owns its overlay, drag handle, z-index layer,
 * Escape handling, body scroll lock, and entrance animation — call sites never
 * set z-index or duplicate the shell.
 *
 *   import { BottomSheet } from '@/components/ui-kit'
 *
 *   <BottomSheet open={open} onClose={() => setOpen(false)}>
 *     <div className="px-5 pb-8">…</div>
 *   </BottomSheet>
 *
 * Use layer="modal" for a sheet that must stack above an open sheet
 * (e.g. a confirmation inside a drawer).
 *
 * TODO: add a focus trap (focus is not yet contained within the sheet).
 */

import { useEffect, type ReactNode, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type SheetLayer = 'sheet' | 'modal'

// z-index tokens defined in app/globals.css @theme (fallbacks match the scale)
const LAYER_Z: Record<SheetLayer, { overlay: CSSProperties; sheet: CSSProperties }> = {
  sheet: {
    overlay: { zIndex: 'calc(var(--z-sheet, 60) - 1)' },
    sheet: { zIndex: 'var(--z-sheet, 60)' },
  },
  modal: {
    overlay: { zIndex: 'calc(var(--z-modal, 70) - 1)' },
    sheet: { zIndex: 'var(--z-modal, 70)' },
  },
}

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  layer?: SheetLayer
}

export function BottomSheet({ open, onClose, children, className, layer = 'sheet' }: BottomSheetProps) {
  // Escape closes; body scroll locks while open
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const z = LAYER_Z[layer]

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 animate-in fade-in duration-200"
        style={z.overlay}
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed inset-x-0 bottom-0 rounded-t-2xl bg-card max-h-[85vh] overflow-y-auto',
          'animate-in slide-in-from-bottom fade-in duration-200',
          className
        )}
        style={z.sheet}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 rounded-full bg-border" />
        </div>

        {children}
      </div>
    </>
  )
}

'use client'

import { PrimaryButton, BottomSheet } from '@/components/ui-kit'

export function CenturoConfirmModal({ requirementName, onConfirm, onDismiss, isPending, error }: {
  requirementName: string; onConfirm: () => void; onDismiss: () => void
  isPending: boolean; error: string | null
}) {
  return (
    <BottomSheet open onClose={onDismiss} layer="modal">
      <div className="px-5 pt-3 pb-10">
        <h3 className="text-lg font-bold mb-2">Let Centuro handle this</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Our team will manage your {requirementName} end to end — preparation, application, and tracking.
          We&apos;ll update you here as things progress.
        </p>
        {error && <p className="text-xs text-status-at-risk mb-3">{error}</p>}
        <PrimaryButton onClick={onConfirm} loading={isPending} className="mb-3">
          Initiate service
        </PrimaryButton>
        <button
          onClick={onDismiss}
          className="w-full text-sm text-muted-foreground flex items-center justify-center min-h-[44px]"
        >
          I&apos;ll do this myself
        </button>
      </div>
    </BottomSheet>
  )
}

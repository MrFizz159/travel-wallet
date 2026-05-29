'use client'

import { useTransition, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { updateProfile } from '@/app/actions/profile'

const inputClass = 'w-full h-12 px-4 rounded-xl border border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

interface Props {
  fullName: string
  nationality: string
  countryOfResidence: string
}

export function EditProfileForm({ fullName, nationality, countryOfResidence }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await updateProfile(fd)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save changes. Please try again.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Full name</label>
        <input
          type="text"
          name="full_name"
          defaultValue={fullName}
          placeholder="As it appears on your passport"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Nationality</label>
        <input
          type="text"
          name="nationality"
          defaultValue={nationality}
          placeholder="e.g. British"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Country of residence</label>
        <input
          type="text"
          name="country_of_residence"
          defaultValue={countryOfResidence}
          placeholder="e.g. United Kingdom"
          className={inputClass}
        />
      </div>

      {error && <p className="text-xs text-status-at-risk">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending && <Loader2 size={16} className="animate-spin" />}
        {isPending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}

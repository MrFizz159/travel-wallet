'use client'

import { useTransition, useState } from 'react'
import { updateProfileWizard } from '@/app/actions/profile'
import { Field, Input, PrimaryButton } from '@/components/ui-kit'

interface Props {
  fullName: string
  nationality: string
  countryOfResidence: string
}

export function ProfileSetupForm({ fullName, nationality, countryOfResidence }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await updateProfileWizard(fd)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-8">
      <Field label="Full name">
        <Input
          type="text"
          name="full_name"
          defaultValue={fullName}
          placeholder="As it appears on your passport"
        />
      </Field>

      <Field label="Nationality">
        <Input
          type="text"
          name="nationality"
          defaultValue={nationality}
          placeholder="e.g. British"
        />
      </Field>

      <Field label="Country of residence">
        <Input
          type="text"
          name="country_of_residence"
          defaultValue={countryOfResidence}
          placeholder="e.g. United Kingdom"
        />
      </Field>

      {error && <p className="text-xs text-status-at-risk">{error}</p>}

      <PrimaryButton type="submit" loading={isPending}>
        {isPending ? 'Saving…' : 'Continue →'}
      </PrimaryButton>
    </form>
  )
}

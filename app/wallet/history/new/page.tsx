'use client'

import { useTransition, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { COUNTRIES, countryFlag } from '@/lib/countries'
import { createTravelHistoryEntry } from '@/app/actions/history'
import { Field, Input, Select, PrimaryButton } from '@/components/ui-kit'

export default function LogTravelPage() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createTravelHistoryEntry(fd)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
      }
    })
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/wallet/history" className="text-muted-foreground min-h-[44px] min-w-[44px] flex items-center">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">Log travel</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Field label="Travelling from">
          <Select name="origin_country_code" required>
            <option value="">Select country</option>
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>
                {countryFlag(c.code)} {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Destination">
          <Select name="destination_country_code" required>
            <option value="">Select country</option>
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>
                {countryFlag(c.code)} {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Arrival">
            <Input type="date" name="start_date" required max={today} />
          </Field>
          <Field label="Departure">
            <Input type="date" name="end_date" required max={today} />
          </Field>
        </div>

        <Field label="Purpose">
          <Select name="purpose" required>
            <option value="business">Business</option>
            <option value="tourism">Tourism</option>
            <option value="education">Education</option>
            <option value="relocation">Relocation</option>
            <option value="other">Other</option>
          </Select>
        </Field>

        {error && <p className="text-xs text-status-at-risk">{error}</p>}

        <PrimaryButton type="submit" loading={isPending}>
          {isPending ? 'Saving…' : 'Save trip'}
        </PrimaryButton>
      </form>
    </div>
  )
}

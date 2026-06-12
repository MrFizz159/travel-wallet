import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createPassport } from '@/app/actions/profile'
import { Field, Input, PrimaryButton } from '@/components/ui-kit'

export default function AddPassportPage() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/wallet" className="text-muted-foreground min-h-[44px] min-w-[44px] flex items-center">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">Add passport</h1>
      </div>

      <form action={createPassport} className="flex flex-col gap-6">
        <Field label="Issuing country">
          <Input
            type="text"
            name="issuing_country"
            required
            placeholder="e.g. United Kingdom"
          />
        </Field>

        <Field label="Nationality">
          <Input
            type="text"
            name="nationality"
            required
            placeholder="e.g. British"
          />
        </Field>

        <Field label="Passport number">
          <Input
            type="text"
            name="passport_number"
            required
            placeholder="e.g. 123456789"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Issue date">
            <Input type="date" name="issue_date" required />
          </Field>
          <Field label="Expiry date">
            <Input type="date" name="expiry_date" required />
          </Field>
        </div>

        {/* File input stays hand-rolled: Field's label prop is string-only and the
            "(optional)" suffix needs normal-case styling; the dashed picker label
            is a custom pattern the Input primitive doesn't cover. */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Passport scan <span className="normal-case font-normal text-muted-foreground">(optional)</span>
          </label>
          <label className="flex items-center gap-3 h-12 px-4 rounded-xl border border-dashed border-input bg-background cursor-pointer text-sm text-muted-foreground">
            <input type="file" name="document_file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
            <span>Choose file</span>
          </label>
        </div>

        <PrimaryButton type="submit">Save passport</PrimaryButton>
      </form>
    </div>
  )
}

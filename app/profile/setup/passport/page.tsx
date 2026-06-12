import Link from 'next/link'
import { createPassportWizard } from '@/app/actions/profile'
import { Field, Input, PrimaryButton } from '@/components/ui-kit'

export default function PassportSetupPage() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <div className="mb-2">
        <div className="flex gap-1.5 mb-5">
          <div className="h-1 flex-1 rounded-full bg-foreground" />
          <div className="h-1 flex-1 rounded-full bg-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Add your passport</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your passport details power automated compliance checks.
        </p>
      </div>

      <form action={createPassportWizard} className="flex flex-col gap-6 mt-8">
        <Field label="Issuing country">
          <Input type="text" name="issuing_country" required placeholder="e.g. United Kingdom" />
        </Field>

        <Field label="Nationality">
          <Input type="text" name="nationality" required placeholder="e.g. British" />
        </Field>

        <Field label="Passport number">
          <Input type="text" name="passport_number" required placeholder="e.g. 123456789" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Issue date">
            <Input type="date" name="issue_date" required />
          </Field>
          <Field label="Expiry date">
            <Input type="date" name="expiry_date" required />
          </Field>
        </div>

        <PrimaryButton type="submit">Finish →</PrimaryButton>
      </form>

      <Link
        href="/"
        className="block text-center text-sm text-muted-foreground py-4 min-h-[44px] flex items-center justify-center"
      >
        Skip for now
      </Link>
    </div>
  )
}

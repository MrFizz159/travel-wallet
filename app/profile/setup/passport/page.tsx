import Link from 'next/link'
import { createPassportWizard } from '@/app/actions/profile'

const inputClass = 'w-full h-12 px-4 rounded-xl border border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

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
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Issuing country</label>
          <input type="text" name="issuing_country" required placeholder="e.g. United Kingdom" className={inputClass} />
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelClass}>Nationality</label>
          <input type="text" name="nationality" required placeholder="e.g. British" className={inputClass} />
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelClass}>Passport number</label>
          <input type="text" name="passport_number" required placeholder="e.g. 123456789" className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Issue date</label>
            <input type="date" name="issue_date" required className="h-12 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Expiry date</label>
            <input type="date" name="expiry_date" required className="h-12 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        <button
          type="submit"
          className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm"
        >
          Finish →
        </button>
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

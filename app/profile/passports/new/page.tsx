import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createPassport } from '@/app/actions/profile'

const inputClass = 'w-full h-12 px-4 rounded-xl border border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

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
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Issuing country</label>
          <input
            type="text"
            name="issuing_country"
            required
            placeholder="e.g. United Kingdom"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelClass}>Nationality</label>
          <input
            type="text"
            name="nationality"
            required
            placeholder="e.g. British"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelClass}>Passport number</label>
          <input
            type="text"
            name="passport_number"
            required
            placeholder="e.g. 123456789"
            className={inputClass}
          />
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

        <div className="flex flex-col gap-2">
          <label className={labelClass}>
            Passport scan <span className="normal-case font-normal text-muted-foreground">(optional)</span>
          </label>
          <label className="flex items-center gap-3 h-12 px-4 rounded-xl border border-dashed border-input bg-background cursor-pointer text-sm text-muted-foreground">
            <input type="file" name="document_file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
            <span>Choose file</span>
          </label>
        </div>

        <button
          type="submit"
          className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm"
        >
          Save passport
        </button>
      </form>
    </div>
  )
}

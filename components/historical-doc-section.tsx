'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight, Shield, FileText } from 'lucide-react'
import { uploadHistoricalDocument } from '@/app/actions/history'
import type { Document } from '@/lib/types'
import { SectionHeader } from '@/components/ui-kit'

interface Props {
  documents: Document[]
  tripId: string
  destinationCountryCode: string
  destinationCountry: string
}

const AUTH_TYPES = [
  { value: 'visa', label: 'Visa' },
  { value: 'eta', label: 'ETA' },
  { value: 'residence_permit', label: 'Residence permit' },
  { value: 'right_to_work', label: 'Right to work' },
]

const NON_AUTH_TYPES = [
  { value: 'arrival_card', label: 'Arrival card' },
  { value: 'boarding_pass', label: 'Boarding pass' },
  { value: 'travel_insurance', label: 'Travel insurance' },
  { value: 'other', label: 'Other document' },
]

const ALL_TYPES = [...AUTH_TYPES, ...NON_AUTH_TYPES]

function isAuthType(type: string) {
  return AUTH_TYPES.some(t => t.value === type)
}

function defaultAuthName(type: string, country: string): string {
  const suffixes: Record<string, string> = {
    visa: 'Visa',
    eta: 'ETA',
    residence_permit: 'Residence Permit',
    right_to_work: 'Right to Work',
  }
  return `${country} ${suffixes[type] ?? type}`
}

function formatDocType(type: string): string {
  return ALL_TYPES.find(t => t.value === type)?.label ?? type.replace(/_/g, ' ')
}

const inputClass = 'w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1.5'

export function HistoricalDocSection({ documents, tripId, destinationCountryCode, destinationCountry }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [docType, setDocType] = useState('visa')
  const [authName, setAuthName] = useState(defaultAuthName('visa', destinationCountry))
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const showAuthFields = isAuthType(docType)

  function handleTypeChange(value: string) {
    setDocType(value)
    if (isAuthType(value)) setAuthName(defaultAuthName(value, destinationCountry))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedFile) return
    setUploadError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('file', selectedFile)
    startTransition(async () => {
      try {
        await uploadHistoricalDocument(fd)
        setShowForm(false)
        setSelectedFile(null)
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
      }
    })
  }

  function cancel() {
    setShowForm(false)
    setSelectedFile(null)
    setUploadError(null)
  }

  return (
    <section>
      <SectionHeader label="Documents" />
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {documents.map(doc => (
          <Link
            key={doc.id}
            href={`/trips/${tripId}/documents/${doc.id}`}
            className="flex items-center gap-3 px-4 py-3 min-h-[44px]"
          >
            {isAuthType(doc.type)
              ? <Shield size={16} className="text-muted-foreground shrink-0" />
              : <FileText size={16} className="text-muted-foreground shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{doc.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDocType(doc.type)}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground shrink-0" />
          </Link>
        ))}

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground min-h-[44px]"
          >
            <Plus size={16} />
            Add document
          </button>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="px-4 py-4 flex flex-col gap-4">
            <div>
              <label className={labelClass}>Document type</label>
              <select
                name="documentType"
                value={docType}
                onChange={e => handleTypeChange(e.target.value)}
                className={inputClass}
              >
                <optgroup label="Visas & authorizations">
                  {AUTH_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </optgroup>
                <optgroup label="Other documents">
                  {NON_AUTH_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </optgroup>
              </select>
            </div>

            {showAuthFields && (
              <>
                <div>
                  <label className={labelClass}>Authorization name</label>
                  <input
                    type="text"
                    name="auth_name"
                    value={authName}
                    onChange={e => setAuthName(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Issue date</label>
                    <input
                      type="date"
                      name="issue_date"
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Expiry date</label>
                    <input
                      type="date"
                      name="expiry_date"
                      required
                      className={inputClass}
                    />
                  </div>
                </div>
              </>
            )}

            <input type="hidden" name="tripId" value={tripId} />
            <input type="hidden" name="country_code" value={destinationCountryCode} />
            <input
              ref={fileRef}
              type="file"
              name="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={e => setSelectedFile(e.currentTarget.files?.[0] ?? null)}
            />

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full h-11 rounded-xl border border-dashed border-border text-sm text-left px-4 truncate"
            >
              <span className={selectedFile ? 'text-foreground' : 'text-muted-foreground'}>
                {selectedFile ? selectedFile.name : 'Select file…'}
              </span>
            </button>

            {uploadError && (
              <p className="text-sm text-status-at-risk">{uploadError}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancel}
                className="flex-1 h-11 rounded-xl border border-border text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedFile || isPending}
                className="flex-1 h-11 rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-60"
              >
                {isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}

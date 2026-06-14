'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight, Plane, Building2, Shield, FileText } from 'lucide-react'
import { uploadTravelEssential } from '@/app/actions/trips'
import type { Document } from '@/lib/types'
import { SectionHeader, Select, PrimaryButton, SecondaryButton } from '@/components/ui-kit'

interface Props {
  documents: Document[]
  tripId: string
}

const DOCUMENT_TYPES = [
  { value: 'flight_confirmation', label: 'Flight confirmation' },
  { value: 'boarding_pass', label: 'Boarding pass' },
  { value: 'hotel_confirmation', label: 'Hotel booking' },
  { value: 'travel_insurance', label: 'Travel insurance' },
  { value: 'other', label: 'Other document' },
]

const SUGGESTED_TYPES = [
  { value: 'flight_confirmation', label: 'Flight confirmation', Icon: Plane },
  { value: 'hotel_confirmation', label: 'Hotel booking', Icon: Building2 },
  { value: 'travel_insurance', label: 'Travel insurance', Icon: Shield },
]

function formatDocType(type: string): string {
  const match = DOCUMENT_TYPES.find(t => t.value === type)
  if (match) return match.label
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function DocTypeIcon({ type }: { type: string }) {
  if (type === 'flight_confirmation' || type === 'boarding_pass') {
    return <Plane size={16} className="text-muted-foreground shrink-0" />
  }
  if (type === 'hotel_confirmation') return <Building2 size={16} className="text-muted-foreground shrink-0" />
  if (type === 'travel_insurance') return <Shield size={16} className="text-muted-foreground shrink-0" />
  return <FileText size={16} className="text-muted-foreground shrink-0" />
}

export function TravelEssentialsSection({ documents, tripId }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [docType, setDocType] = useState('flight_confirmation')
  const [isPending, startTransition] = useTransition()
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setUploadError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await uploadTravelEssential(fd)
        setShowForm(false)
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
      }
    })
  }

  return (
    <section>
      <SectionHeader
        label="Travel Essentials"
        subLabel="Does not affect compliance status"
      />

      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {documents.map(doc => (
          <Link
            key={doc.id}
            href={`/trips/${tripId}/documents/${doc.id}`}
            className="flex items-center gap-3 px-4 py-3"
          >
            <DocTypeIcon type={doc.type} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium flex-1 min-w-0 truncate">{doc.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDocType(doc.type)}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground shrink-0" />
          </Link>
        ))}

        {documents.length === 0 && !showForm && (
          <div className="px-4 py-4">
            <p className="text-xs text-muted-foreground mb-3">
              Store documents you&apos;ll need at the airport or border — they don&apos;t affect your compliance status.
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTED_TYPES.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => { setDocType(value); setShowForm(true) }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed border-border text-sm text-left hover:bg-muted/50 transition-colors"
                >
                  <Icon size={16} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 w-full flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground"
            >
              <Plus size={16} />
              Other document
            </button>
          </div>
        )}

        {showForm ? (
          <form onSubmit={handleUpload} className="px-4 py-3">
            <Select
              name="documentType"
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="mb-2"
            >
              {DOCUMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
            <input type="hidden" name="tripId" value={tripId} />
            <input
              ref={fileRef}
              type="file"
              name="file"
              accept="*/*"
              className="hidden"
              onChange={e => {
                if (e.currentTarget.files?.[0]) {
                  e.currentTarget.form?.requestSubmit()
                }
              }}
            />
            {uploadError && (
              <p className="text-sm text-status-at-risk mb-2">{uploadError}</p>
            )}
            <div className="flex gap-2">
              <SecondaryButton onClick={() => setShowForm(false)} className="flex-1">
                Cancel
              </SecondaryButton>
              <PrimaryButton
                onClick={() => fileRef.current?.click()}
                loading={isPending}
                className="flex-1"
              >
                {isPending ? 'Uploading…' : 'Select file'}
              </PrimaryButton>
            </div>
          </form>
        ) : documents.length > 0 ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground"
          >
            <Plus size={16} />
            Add document
          </button>
        ) : null}
      </div>
    </section>
  )
}

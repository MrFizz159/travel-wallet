'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { FileText, Upload } from 'lucide-react'
import { uploadEvidence } from '@/app/actions/trips'
import { PrimaryButton, Input, Field } from '@/components/ui-kit'
import type { RequirementRow } from '@/lib/db-types'
import type { SubTask } from '@/lib/types'
import { StepIndicator } from './step-indicator'

const AUTH_REQ_TYPES = ['visa', 'eta', 'transit_eta', 'residence_permit', 'right_to_work']

export function PrimaryActionStep({ task, stepNumber, isManaged, reqComplete, tripId, requirementId, requirementName, requirementType, documents, onClose }: {
  task: SubTask; stepNumber: number; isManaged: boolean; reqComplete: boolean
  tripId: string; requirementId: string; requirementName: string; requirementType: string
  documents: RequirementRow['documents']; onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [authName, setAuthName] = useState(requirementName)
  const fileRef = useRef<HTMLInputElement>(null)

  const isAuth = AUTH_REQ_TYPES.includes(requirementType)
  const completionDoc = documents.find(d => d.id === task.evidence_document_id) ?? documents.find(d => d.type === requirementType)

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try { await uploadEvidence(fd); onClose() }
      catch (err) { setError(err instanceof Error ? err.message : 'Upload failed') }
    })
  }

  if (reqComplete || task.status === 'complete') {
    return (
      <div className="flex gap-3 py-3.5">
        <StepIndicator state="complete" num={stepNumber} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-muted-foreground">{task.name}</p>
          {completionDoc && (
            <Link
              href={`/trips/${tripId}/documents/${completionDoc.id}`}
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs text-status-compliant mt-0.5"
            >
              <FileText size={11} />
              {completionDoc.name}
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 py-3.5">
      <StepIndicator state="not_started" num={stepNumber} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{task.name}</p>
        {task.description && !expanded && (
          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
        )}

        {!isManaged && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="mt-2 text-xs px-3 py-1.5 rounded-full bg-foreground text-background font-semibold min-h-[32px] flex items-center gap-1"
          >
            <Upload size={11} />
            Upload confirmation
          </button>
        )}

        {!isManaged && expanded && (
          <form onSubmit={handleUpload} className="mt-3 flex flex-col gap-2.5">
            <input type="hidden" name="requirementId" value={requirementId} />
            <input type="hidden" name="tripId" value={tripId} />
            <input type="hidden" name="requirement_type" value={requirementType} />

            {isAuth && (
              <>
                <Field label="Authorisation name">
                  <Input
                    type="text"
                    name="auth_name"
                    value={authName}
                    onChange={e => setAuthName(e.target.value)}
                    required
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Issue date">
                    <Input type="date" name="issue_date" required />
                  </Field>
                  <Field label="Expiry date">
                    <Input type="date" name="expiry_date" required />
                  </Field>
                </div>
              </>
            )}

            <input
              ref={fileRef}
              type="file"
              name="file"
              accept="*/*"
              className="hidden"
              onChange={e => {
                const file = e.currentTarget.files?.[0] ?? null
                if (isAuth) {
                  setSelectedFile(file)
                } else if (file) {
                  e.currentTarget.form?.requestSubmit()
                }
              }}
            />

            {isAuth ? (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-11 rounded-xl border border-dashed border-border text-sm text-left px-4 truncate"
                >
                  <span className={selectedFile ? 'text-foreground' : 'text-muted-foreground'}>
                    {selectedFile ? selectedFile.name : 'Select confirmation file…'}
                  </span>
                </button>
                {error && <p className="text-xs text-status-at-risk">{error}</p>}
                <PrimaryButton type="submit" disabled={!selectedFile} loading={isPending}>
                  {isPending ? 'Saving…' : 'Save'}
                </PrimaryButton>
              </>
            ) : (
              <>
                {error && <p className="text-xs text-status-at-risk">{error}</p>}
                <PrimaryButton onClick={() => fileRef.current?.click()} loading={isPending}>
                  {!isPending && <Upload size={16} />}
                  {isPending ? 'Uploading…' : 'Upload confirmation'}
                </PrimaryButton>
              </>
            )}

            <button
              type="button"
              onClick={() => { setExpanded(false); setSelectedFile(null) }}
              className="text-xs text-muted-foreground text-center min-h-[36px]"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

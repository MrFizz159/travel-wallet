'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { Download, FileText, Loader2, Upload } from 'lucide-react'
import { generateLetter, uploadSignedLetter } from '@/app/actions/letters'
import { cn } from '@/lib/utils'
import type { RequirementRow } from '@/lib/db-types'
import type { SubTask } from '@/lib/types'
import { StepIndicator, type StepState } from './step-indicator'

export function GeneratableStep({ task, stepNumber, isManaged, reqComplete, tripId, requirementId, documents, onClose }: {
  task: SubTask; stepNumber: number; isManaged: boolean; reqComplete: boolean
  tripId: string; requirementId: string
  documents: RequirementRow['documents']; onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [hasDownloaded, setHasDownloaded] = useState(false)
  const [generated, setGenerated] = useState<{ documentId: string; source: 'ai' | 'stub' } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const hasGenerated = !!task.ai_generated_content
  const hasUploaded = !!task.evidence_document_id || task.approval_status === 'signed'
  const state: StepState = reqComplete || hasUploaded ? 'complete' : hasGenerated ? 'in_progress' : 'not_started'

  // Resolve the draft document id: prefer the result from this session's generation,
  // otherwise (e.g. drawer re-opened after a refresh) derive it from the
  // requirement's documents written by the server action.
  const draftDocumentId = generated?.documentId
    ?? documents.find(d => d.type === 'letter_draft' && d.name.startsWith(task.name))?.id
    ?? null

  function handleGenerate() {
    setError(null)
    const fd = new FormData()
    fd.append('subTaskId', task.id)
    fd.append('requirementId', requirementId)
    fd.append('tripId', tripId)
    startTransition(async () => {
      try {
        const result = await generateLetter(fd)
        setGenerated(result)
      }
      catch (err) { setError(err instanceof Error ? err.message : 'Failed to generate') }
    })
  }

  function handleDownload() {
    const content = task.ai_generated_content ?? '[Letter content placeholder]'
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${task.name.toLowerCase().replace(/\s+/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setHasDownloaded(true)
  }

  function handleUpload(file: File) {
    setError(null)
    const fd = new FormData()
    fd.append('subTaskId', task.id)
    fd.append('requirementId', requirementId)
    fd.append('tripId', tripId)
    fd.append('file', file)
    startTransition(async () => {
      try { await uploadSignedLetter(fd) }
      catch (err) { setError(err instanceof Error ? err.message : 'Upload failed') }
    })
  }

  return (
    <div className="flex gap-3 py-3.5">
      <StepIndicator state={state} num={stepNumber} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', state === 'complete' && 'text-muted-foreground')}>{task.name}</p>

        {state === 'not_started' && (
          <>
            {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
            {!isManaged && (
              <>
                <button
                  onClick={handleGenerate}
                  disabled={isPending}
                  className="mt-2 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-semibold min-h-[32px] disabled:opacity-50 flex items-center gap-1"
                >
                  {isPending && <Loader2 size={10} className="animate-spin" />}
                  {isPending ? 'Generating…' : 'Generate'}
                </button>
              </>
            )}
          </>
        )}

        {state === 'in_progress' && !hasDownloaded && (
          <>
            <p className="text-xs text-status-incomplete mt-0.5">Draft ready</p>
            {!isManaged && (
              <>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                  <button
                    onClick={handleDownload}
                    className="text-xs px-3 py-1.5 rounded-full bg-foreground text-background font-semibold min-h-[32px] flex items-center gap-1"
                  >
                    <Download size={11} />
                    Download
                  </button>
                  {draftDocumentId && (
                    <Link
                      href={`/trips/${tripId}/documents/${draftDocumentId}`}
                      onClick={onClose}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 min-h-[44px]"
                    >
                      <FileText size={11} />
                      View letter
                    </Link>
                  )}
                </div>
                {generated?.source === 'stub' && (
                  <p className="text-xs text-muted-foreground mt-1.5">AI generation is stubbed in this prototype.</p>
                )}
              </>
            )}
          </>
        )}

        {state === 'in_progress' && hasDownloaded && (
          <>
            <p className="text-xs text-status-incomplete mt-0.5">
              Downloaded — upload signed copy to complete this step
            </p>
            {!isManaged && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                <button
                  onClick={handleDownload}
                  className="text-xs px-3 py-1.5 rounded-full border border-border font-semibold min-h-[32px] flex items-center gap-1"
                >
                  <Download size={11} />
                  Download again
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={e => { const f = e.currentTarget.files?.[0]; if (f) handleUpload(f) }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={isPending}
                  className="text-xs px-3 py-1.5 rounded-full bg-foreground text-background font-semibold min-h-[32px] flex items-center gap-1 disabled:opacity-50"
                >
                  {isPending ? <Loader2 size={10} className="animate-spin" /> : <Upload size={11} />}
                  Upload signed copy
                </button>
                {draftDocumentId && (
                  <Link
                    href={`/trips/${tripId}/documents/${draftDocumentId}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 min-h-[44px]"
                  >
                    <FileText size={11} />
                    View letter
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        {state === 'complete' && (
          <p className="text-xs text-status-compliant mt-0.5">Signed copy uploaded</p>
        )}

        {error && <p className="text-xs text-status-at-risk mt-1">{error}</p>}
      </div>
    </div>
  )
}

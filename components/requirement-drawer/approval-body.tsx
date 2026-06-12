'use client'

import { useState } from 'react'
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { sendManagerApproval, resolveManagerApproval } from '@/app/actions/trips'
import { PrimaryButton, Select, Field } from '@/components/ui-kit'
import type { RequirementRow } from '@/lib/db-types'
import type { ApprovalLogEntry } from '@/lib/types'
import { STUB_MANAGERS as MANAGERS } from '@/lib/types'

function formatLogDate(isoString: string): string {
  return new Date(isoString).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const APPROVAL_STATE_LABELS: Record<string, string> = {
  unsent: 'Not sent',
  pending: 'Pending',
  approved: 'Approved',
  not_approved: 'Not approved',
}

function ApprovalLogList({ entries }: { entries: ApprovalLogEntry[] }) {
  return (
    <div className="mt-4 space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Approval log</h3>
      {entries.map((entry, i) => (
        <div key={i} className="flex items-start gap-2.5 py-2 border-t border-border/60 first:border-t-0">
          <CheckCircle size={13} className="text-status-compliant shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">{APPROVAL_STATE_LABELS[entry.state] ?? entry.state}</p>
            <p className="text-xs text-muted-foreground">{entry.actor} · {formatLogDate(entry.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ApprovalDrawerBody({
  requirement,
  tripId,
  onClose,
}: {
  requirement: RequirementRow
  tripId: string
  onClose: () => void
}) {
  const [selectedManager, setSelectedManager] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [localState, setLocalState] = useState<{
    approval_state: string
    approver_name: string | null
    approval_log: ApprovalLogEntry[]
  }>({
    approval_state: requirement.approval_state ?? 'unsent',
    approver_name: requirement.approver_name ?? null,
    approval_log: requirement.approval_log ?? [],
  })

  async function handleSend() {
    if (!selectedManager || isSending) return
    setIsSending(true)

    const fd = new FormData()
    fd.append('requirementId', requirement.id)
    fd.append('tripId', tripId)
    fd.append('approverName', selectedManager)

    setLocalState(prev => ({ ...prev, approval_state: 'pending', approver_name: selectedManager }))
    await sendManagerApproval(fd)

    await new Promise<void>(resolve => setTimeout(resolve, 3000))

    const timestamp = new Date().toISOString()
    const fd2 = new FormData()
    fd2.append('requirementId', requirement.id)
    fd2.append('tripId', tripId)
    fd2.append('approverName', selectedManager)
    await resolveManagerApproval(fd2)

    setLocalState({
      approval_state: 'approved',
      approver_name: selectedManager,
      approval_log: [{ state: 'approved', actor: selectedManager, timestamp }],
    })
    setIsSending(false)
  }

  const approvalState = localState.approval_state
  const approverName = localState.approver_name
  const approvalLog = localState.approval_log

  if (approvalState === 'unsent') {
    return (
      <div className="mt-2">
        {requirement.why_it_applies && (
          <p className="text-sm text-muted-foreground mb-5">{requirement.why_it_applies}</p>
        )}
        <Field label="Select approver" className="mb-4">
          <Select value={selectedManager} onChange={e => setSelectedManager(e.target.value)}>
            <option value="">Choose a manager…</option>
            {MANAGERS.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </Select>
        </Field>
        <PrimaryButton onClick={handleSend} disabled={!selectedManager || isSending} loading={isSending}>
          {isSending ? 'Sending…' : 'Send for approval'}
        </PrimaryButton>
      </div>
    )
  }

  if (approvalState === 'pending') {
    return (
      <div className="mt-2">
        <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-status-incomplete-bg">
          <Clock size={16} className="text-status-incomplete shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-status-incomplete">Waiting for approval from {approverName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Request sent — your manager will review and approve your trip.</p>
          </div>
        </div>
      </div>
    )
  }

  if (approvalState === 'approved') {
    return (
      <div className="mt-2">
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-status-compliant-bg">
          <CheckCircle size={16} className="text-status-compliant shrink-0" />
          <p className="text-sm font-semibold text-status-compliant">Approved by {approverName}</p>
        </div>
        {approvalLog.length > 0 && <ApprovalLogList entries={approvalLog} />}
      </div>
    )
  }

  if (approvalState === 'not_approved') {
    return (
      <div className="mt-2">
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-status-at-risk-bg">
          <AlertTriangle size={16} className="text-status-at-risk shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-status-at-risk">Not approved</p>
            {approverName && (
              <p className="text-xs text-muted-foreground mt-0.5">Contact {approverName} to discuss.</p>
            )}
          </div>
        </div>
        {approvalLog.length > 0 && <ApprovalLogList entries={approvalLog} />}
      </div>
    )
  }

  return null
}

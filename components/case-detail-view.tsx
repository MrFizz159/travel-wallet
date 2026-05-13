'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Briefcase, CheckCircle2, Circle, MessageSquare, Sparkles, Bell, ChevronRight } from 'lucide-react'
import type { TravelCase } from '@/lib/types'

const MILESTONES = [
  'Case Initiated',
  'Process Recommended',
  'Documents Collected',
  'Application Prepared',
  'Application Submitted',
  'Official Agency Response',
  'Passport Returned',
  'Case Completed',
]

const STUB_MANAGER = {
  name: 'Sarah Johnson',
  role: 'Case Manager',
  initials: 'SJ',
}

interface Props {
  travelCase: TravelCase
  tripId: string
  backLabel: string
}

export function CaseDetailView({ travelCase, tripId, backLabel }: Props) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [messagingToast, setMessagingToast] = useState(false)

  const currentMilestoneIndex = MILESTONES.indexOf(travelCase.status)
  const activeMilestoneIndex = currentMilestoneIndex === -1 ? 0 : currentMilestoneIndex

  function showMessagingStub() {
    setMessagingToast(true)
    setTimeout(() => setMessagingToast(false), 3000)
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <Link
          href={`/trips/${tripId}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <ArrowLeft size={16} />
          {backLabel}
        </Link>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Case identity */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
              {travelCase.case_reference}
            </span>
          </div>
          <h1 className="text-lg font-semibold">{travelCase.visa_type}</h1>
          <p className="text-sm text-muted-foreground">{travelCase.destination_country}</p>
        </div>

        {/* Status panel */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Current status</p>
              <p className="text-sm font-semibold">{travelCase.status}</p>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
              On Track
            </span>
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Overall progress</span>
              <span>{travelCase.progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground transition-all"
                style={{ width: `${travelCase.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Milestone timeline */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-4">Timeline</p>
          <div className="space-y-0">
            {MILESTONES.map((milestone, index) => {
              const isComplete = index < activeMilestoneIndex
              const isCurrent = index === activeMilestoneIndex
              const isUpcoming = index > activeMilestoneIndex
              const isLast = index === MILESTONES.length - 1

              return (
                <div key={milestone} className="flex gap-3">
                  {/* Stepper column */}
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5
                      ${isComplete ? 'bg-foreground' : isCurrent ? 'border-2 border-foreground bg-background' : 'border border-border bg-background'}
                    `}>
                      {isComplete && <CheckCircle2 size={14} className="text-background" />}
                      {isCurrent && <div className="w-2 h-2 rounded-full bg-foreground" />}
                      {isUpcoming && <Circle size={10} className="text-border" />}
                    </div>
                    {!isLast && (
                      <div className={`w-px flex-1 my-1 ${isComplete ? 'bg-foreground' : 'bg-border'}`} style={{ minHeight: '20px' }} />
                    )}
                  </div>
                  {/* Label */}
                  <p className={`text-sm pb-5 ${isComplete ? 'text-foreground' : isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {milestone}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          <button
            onClick={showMessagingStub}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left"
          >
            <MessageSquare size={16} className="text-muted-foreground shrink-0" />
            <span className="flex-1">Message Case Manager</span>
            <ChevronRight size={16} className="text-muted-foreground shrink-0" />
          </button>
          <button
            onClick={showMessagingStub}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left"
          >
            <Sparkles size={16} className="text-muted-foreground shrink-0" />
            <span className="flex-1">Ask AI about this case</span>
            <ChevronRight size={16} className="text-muted-foreground shrink-0" />
          </button>
        </div>

        {/* Team assigned */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Team assigned</p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-muted-foreground">{STUB_MANAGER.initials}</span>
            </div>
            <div>
              <p className="text-sm font-medium">{STUB_MANAGER.name}</p>
              <p className="text-xs text-muted-foreground">{STUB_MANAGER.role}</p>
            </div>
          </div>
        </div>

        {/* Case settings */}
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Bell size={16} className="text-muted-foreground shrink-0" />
              <span className="text-sm">Receive notifications</span>
            </div>
            <button
              role="switch"
              aria-checked={notificationsEnabled}
              onClick={() => setNotificationsEnabled(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notificationsEnabled ? 'bg-foreground' : 'bg-muted'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Messaging coming soon toast */}
      {messagingToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm px-4 py-2 rounded-full shadow-lg z-50 whitespace-nowrap">
          Coming soon
        </div>
      )}
    </div>
  )
}

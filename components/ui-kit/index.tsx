'use client'

/**
 * Travel Wallet — UI Kit
 *
 * Production-ready reusable components. All components are typed with TypeScript
 * and use Tailwind classes against the design tokens defined in app/globals.css.
 *
 * Named exports only — import what you need:
 *   import { TripCard, StatusBadge, PrimaryButton } from '@/components/ui-kit'
 */

import React, { type ReactNode, type ButtonHTMLAttributes } from 'react'
import { ChevronRight, CheckCircle, AlertTriangle, Clock, Loader2, Upload, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import { countryFlagUrl } from '@/lib/countries'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type StatusValue = 'compliant' | 'incomplete' | 'at_risk' | 'verified'
export type RequirementStatusValue = 'not_started' | 'in_progress' | 'at_risk' | 'complete'
export type SubTaskType = 'automated' | 'generatable' | 'primary_action' | 'informational'
export type SubTaskStatus = 'pending' | 'complete' | 'case_in_progress' | 'submitted'
export type AvatarSize = 'sm' | 'md' | 'lg'
export type TripStatus = 'compliant' | 'incomplete' | 'at_risk' | null

// ─────────────────────────────────────────────────────────────────────────────
// CARD
// Generic white card container
// ─────────────────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className, onClick }: CardProps) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full text-left bg-card rounded-xl border border-border shadow-sm overflow-hidden',
          'active:scale-[0.99] transition-transform duration-100',
          className
        )}
      >
        {children}
      </button>
    )
  }

  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border shadow-sm overflow-hidden',
        className
      )}
    >
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DIVIDER
// Internal card row separator
// ─────────────────────────────────────────────────────────────────────────────

export function Divider({ className }: { className?: string }) {
  return <div className={cn('border-t border-border w-full', className)} />
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// Compliance status pill — compliant / incomplete / at_risk / verified
// ─────────────────────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: StatusValue
  className?: string
}

const STATUS_BADGE_VARIANTS: Record<StatusValue, { label: string; cls: string }> = {
  compliant:  { label: 'Ready',       cls: 'bg-status-compliant-bg text-status-compliant'   },
  incomplete: { label: 'Incomplete',  cls: 'bg-status-incomplete-bg text-status-incomplete' },
  at_risk:    { label: 'At Risk',     cls: 'bg-status-at-risk-bg text-status-at-risk'       },
  verified:   { label: 'Verified',    cls: 'bg-status-verified-bg text-status-verified'     },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const v = STATUS_BADGE_VARIANTS[status]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold leading-none',
        v.cls,
        className
      )}
    >
      {v.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// Small-caps section label, optional right-hand action link
// ─────────────────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  label: string
  subLabel?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function SectionHeader({ label, subLabel, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)}>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </h2>
        {subLabel && (
          <p className="text-[10px] text-muted-foreground mt-0.5 normal-case tracking-normal font-normal">
            {subLabel}
          </p>
        )}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="text-xs font-semibold text-primary min-h-[44px] flex items-center"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE HEADER
// Top of each main screen — title + optional subtitle + right slot
// ─────────────────────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string
  subtitle?: string
  rightSlot?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, rightSlot, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-6', className)}>
      <div className="flex-1 min-w-0 pr-3">
        <h1 className="text-2xl font-bold leading-tight tracking-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {rightSlot && (
        <div className="shrink-0 flex items-center gap-2">{rightSlot}</div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR
// User initials circle — sm/md/lg sizes
// ─────────────────────────────────────────────────────────────────────────────

interface AvatarProps {
  name: string | null
  size?: AvatarSize
  className?: string
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const AVATAR_SIZE_CLS: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-xs',   // 32px
  md: 'w-10 h-10 text-sm', // 40px
  lg: 'w-14 h-14 text-lg', // 56px
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <div
      aria-label={name ?? 'User avatar'}
      className={cn(
        'rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold select-none shrink-0',
        AVATAR_SIZE_CLS[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY BUTTON
// Full-width solid CTA — the single primary action on a screen
// ─────────────────────────────────────────────────────────────────────────────

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  children: ReactNode
}

export function PrimaryButton({
  loading = false,
  children,
  className,
  disabled,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'w-full flex items-center justify-center gap-2',
        'min-h-[48px] px-6 rounded-xl',
        'bg-foreground text-background',
        'font-semibold text-sm',
        'transition-opacity duration-100',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:opacity-80',
        className
      )}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin shrink-0" />}
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECONDARY BUTTON
// Outlined, no fill — secondary action
// ─────────────────────────────────────────────────────────────────────────────

interface SecondaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export function SecondaryButton({
  children,
  className,
  ...props
}: SecondaryButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'w-full flex items-center justify-center gap-2',
        'min-h-[48px] px-6 rounded-xl',
        'border border-border bg-transparent',
        'font-semibold text-sm text-foreground',
        'transition-colors duration-100',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:bg-muted',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIP CARD
// Two-column layout: left image/flag block (~30%), right text + status + summary
// at_risk variant gets a red left border accent for urgency
// ─────────────────────────────────────────────────────────────────────────────

export type TripRequirement = {
  name: string
  status: string
  is_mandatory: boolean
}

interface TripCardProps {
  destination: string
  countryCode: string
  dateRange: string
  purpose: string
  status: TripStatus
  requirements?: TripRequirement[]
  departsIn?: number | null
  onClick?: () => void
  className?: string
}

function DepartsInPill({ days }: { days: number }) {
  const cls = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-status-incomplete-bg text-status-incomplete'
  if (days < 0) return null
  if (days === 0) return <span className={cls}>Departing today</span>
  if (days === 1) return <span className={cls}>Departing tomorrow</span>
  if (days <= 7) return <span className={cls}>{days} days away</span>
  return null
}

function ComplianceSummaryRow({
  requirements,
  status,
}: {
  requirements: TripRequirement[]
  status: TripStatus
}) {
  if (!status || status === 'compliant') return null
  const mandatory = requirements.filter(r => r.is_mandatory)
  if (mandatory.length === 0) return null

  if (mandatory.length <= 2) {
    return (
      <div className="mt-1.5 flex flex-col gap-0.5">
        {mandatory.map((r, i) => (
          <p
            key={i}
            className={cn(
              'text-xs leading-tight',
              r.status === 'complete' ? 'text-status-compliant' : 'text-muted-foreground'
            )}
          >
            {r.status === 'complete' ? '✓' : '✗'} {r.name}
          </p>
        ))}
      </div>
    )
  }

  const completeCount = mandatory.filter(r => r.status === 'complete').length
  return (
    <p className="text-xs text-muted-foreground mt-1.5">
      {completeCount} of {mandatory.length} requirements complete
    </p>
  )
}

export function TripCard({
  destination,
  countryCode,
  dateRange,
  purpose,
  status,
  requirements,
  departsIn,
  onClick,
  className,
}: TripCardProps) {
  const isAtRisk = status === 'at_risk'
  const isUrgent = status === 'incomplete' && typeof departsIn === 'number' && departsIn <= 1

  const inner = (
    <div
      className={cn(
        'bg-card rounded-xl border border-border shadow-sm overflow-hidden',
        isAtRisk && 'border-l-4 border-l-status-at-risk',
        isUrgent && !isAtRisk && 'border-l-4 border-l-status-incomplete',
        className
      )}
    >
      <div className="px-3 py-3 flex flex-col">
        {/* Departure urgency pill */}
        {typeof departsIn === 'number' && departsIn >= 0 && departsIn <= 7 && (
          <div className="mb-1.5">
            <DepartsInPill days={departsIn} />
          </div>
        )}

        {/* Flag bubble + destination name */}
        <div className="flex items-center gap-2 mb-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={countryFlagUrl(countryCode)}
            alt=""
            aria-hidden
            className="w-7 h-7 rounded-full object-cover shrink-0 border border-border/30"
          />
          <h3 className="text-[17px] font-bold leading-tight">{destination}</h3>
        </div>

        {/* Date range + purpose */}
        <p className="text-xs text-muted-foreground capitalize truncate mb-1.5">
          {dateRange}
          {purpose && ` · ${purpose}`}
        </p>

        {/* Status badge */}
        {status && <StatusBadge status={status} className="self-start" />}

        {/* Compliance summary */}
        {requirements && (
          <ComplianceSummaryRow requirements={requirements} status={status} />
        )}
      </div>
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left active:scale-[0.99] transition-transform duration-100 block"
      >
        {inner}
      </button>
    )
  }

  return inner
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENT ROW
// Compliance requirement card row — header only, sub-tasks attach below
// ─────────────────────────────────────────────────────────────────────────────

interface RequirementRowProps {
  name: string
  status: RequirementStatusValue
  latestStartDate?: string
  timeRequiredDays?: number
  completedCount?: number
  totalCount?: number
  onClick: () => void
  className?: string
}

function RequirementIcon({ status }: { status: RequirementStatusValue }) {
  if (status === 'complete') {
    return <CheckCircle size={16} className="text-status-compliant shrink-0" />
  }
  if (status === 'at_risk') {
    return <AlertTriangle size={16} className="text-status-at-risk shrink-0" />
  }
  return <Clock size={16} className="text-muted-foreground shrink-0" />
}

function RequirementSubline({
  status,
  latestStartDate,
  timeRequiredDays,
  completedCount,
  totalCount,
}: Pick<RequirementRowProps, 'status' | 'latestStartDate' | 'timeRequiredDays' | 'completedCount' | 'totalCount'>) {
  if (status === 'complete') {
    return <p className="text-xs text-status-compliant mt-0.5">All steps complete</p>
  }

  if (status === 'at_risk' && latestStartDate) {
    const formatted = new Date(latestStartDate + 'T00:00:00').toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })
    return (
      <p className="text-xs text-status-at-risk mt-0.5">
        Should have started by {formatted}
      </p>
    )
  }

  const hasCounts = typeof completedCount === 'number' && typeof totalCount === 'number' && totalCount > 0
  const hasDays = timeRequiredDays && timeRequiredDays > 0

  if (hasCounts || hasDays) {
    return (
      <p className="text-xs text-muted-foreground mt-0.5">
        {hasCounts ? `${completedCount} of ${totalCount} steps done` : ''}
        {hasCounts && hasDays ? ' · ' : ''}
        {hasDays ? `Allow ${timeRequiredDays} days` : ''}
      </p>
    )
  }

  return null
}

export function RequirementRow({
  name,
  status,
  latestStartDate,
  timeRequiredDays,
  completedCount,
  totalCount,
  onClick,
  className,
}: RequirementRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left min-h-[56px]',
        className
      )}
    >
      <RequirementIcon status={status} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{name}</p>
        <RequirementSubline
          status={status}
          latestStartDate={latestStartDate}
          timeRequiredDays={timeRequiredDays}
          completedCount={completedCount}
          totalCount={totalCount}
        />
      </div>
      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-TASK ROW
// One step within a requirement — handles all three task types
// ─────────────────────────────────────────────────────────────────────────────

interface SubTaskRowProps {
  name: string
  type: SubTaskType
  status: SubTaskStatus
  onGenerate?: () => void
  onGetStarted?: () => void
  onUpload?: (file: File) => void
  onViewCase?: () => void
  isPending?: boolean
  className?: string
}

export function SubTaskRow({
  name,
  type,
  status,
  onGenerate,
  onGetStarted,
  onUpload,
  onViewCase,
  isPending = false,
  className,
}: SubTaskRowProps) {
  const isComplete = status === 'complete'
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0]
    if (file && onUpload) onUpload(file)
  }

  return (
    <div className={cn('flex items-center gap-3 px-4 py-2.5 min-h-[44px]', className)}>
      {/* State indicator */}
      {isComplete ? (
        <CheckCircle size={14} className="text-status-compliant shrink-0" />
      ) : (
        <div
          className={cn(
            'w-3.5 h-3.5 rounded-full shrink-0',
            type === 'automated'
              ? 'border border-muted-foreground/40'
              : 'border-2 border-border'
          )}
        />
      )}

      {/* Task name */}
      <span
        className={cn(
          'text-sm flex-1 min-w-0 truncate',
          isComplete && 'text-muted-foreground'
        )}
      >
        {name}
      </span>

      {/* Right-side action / state */}
      {isComplete && type === 'automated' && (
        <span className="text-xs text-muted-foreground shrink-0">Auto-verified</span>
      )}

      {isComplete && type !== 'automated' && (
        <span className="text-xs font-semibold text-status-compliant shrink-0">Done</span>
      )}

      {!isComplete && type === 'automated' && (
        <span className="text-xs text-muted-foreground shrink-0">Checking…</span>
      )}

      {!isComplete && type === 'generatable' && (
        <button
          type="button"
          onClick={onGenerate}
          className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold shrink-0 min-h-[28px]"
        >
          Generate
        </button>
      )}

      {status === 'case_in_progress' && (
        onViewCase ? (
          <button
            type="button"
            onClick={onViewCase}
            className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground min-h-[28px] px-2.5 py-1 rounded-full border border-border font-medium"
          >
            <Briefcase size={11} />
            View case
          </button>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <Briefcase size={11} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Case in progress</span>
          </div>
        )
      )}

      {!isComplete && status !== 'case_in_progress' && type === 'primary_action' && (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onGetStarted}
            className="text-xs px-2.5 py-1 rounded-full border border-border font-semibold text-foreground min-h-[28px]"
          >
            Get started
          </button>

          {/* Hidden file input for upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-60 min-h-[28px]"
          >
            {isPending ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <Upload size={10} />
            )}
            Upload
          </button>
        </div>
      )}
    </div>
  )
}

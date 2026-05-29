import type { Requirement, RequirementStatus, ComplianceStatus } from './types'

export function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function effectiveStatus(req: Requirement): RequirementStatus {
  if (req.status === 'complete') return 'complete'
  if (req.has_active_case) return 'in_progress'
  if (req.latest_start_date && todayStr() >= req.latest_start_date) return 'at_risk'
  return req.status
}

export function computeComplianceStatus(requirements: Requirement[]): ComplianceStatus {
  if (requirements.length === 0) return 'not_started'
  const mandatory = requirements.filter(r => r.is_mandatory)
  if (mandatory.length === 0) return 'not_started'
  const statuses = mandatory.map(effectiveStatus)
  if (statuses.some(s => s === 'at_risk')) return 'at_risk'
  if (statuses.some(s => s !== 'complete')) return 'incomplete'
  return 'compliant'
}

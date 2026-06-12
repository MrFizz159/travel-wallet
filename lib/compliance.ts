import type { Requirement, RequirementStatus, ComplianceStatus, TransitStop } from './types'
import { todayStr } from './dates'

// Re-exported so existing import sites (e.g. app/actions/trips.ts) keep working.
export { subtractDays, addDays } from './dates'

export function effectiveStatus(req: Requirement): RequirementStatus {
  if (req.status === 'complete') return 'complete'
  if (req.has_active_case) return 'in_progress'
  // PRD §9.2: At Risk means the latest start date has passed and the user
  // still hasn't started — strictly after the deadline, not on the day itself.
  if (req.status === 'not_started' && req.latest_start_date && todayStr() > req.latest_start_date) return 'at_risk'
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

// Semantic alias — identical to computeComplianceStatus but named for leg-level call sites.
export const computeLegComplianceStatus = computeComplianceStatus

export function transitComplianceStatus(transit: TransitStop): 'compliant' | 'incomplete' {
  if (transit.checked_at === null) return 'incomplete'
  if (transit.visa_required === false) return 'compliant'
  if (transit.visa_required === true && transit.user_confirmed) return 'compliant'
  return 'incomplete'
}

export function computeTripComplianceStatus(
  legStatuses: ComplianceStatus[],
  transitStatuses: ComplianceStatus[],
  managerApprovalReqs: Requirement[]
): ComplianceStatus {
  const managerStatus = computeComplianceStatus(managerApprovalReqs)
  const all: ComplianceStatus[] = [...legStatuses, ...transitStatuses, managerStatus]
  if (all.length === 0) return 'not_started'
  if (all.some(s => s === 'at_risk')) return 'at_risk'
  if (all.some(s => s === 'incomplete' || s === 'not_started')) return 'incomplete'
  return 'compliant'
}

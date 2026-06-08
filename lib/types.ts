export type TripState = 'exploratory' | 'active' | 'completed' | 'cancelled'
export type ApprovalState = 'unsent' | 'pending' | 'approved' | 'not_approved'

export interface ApprovalLogEntry {
  state: ApprovalState
  actor: string
  timestamp: string
}

export const STUB_MANAGERS = [
  'Sarah Chen',
  'James Mitchell',
  'Priya Patel',
  'Tom Walker',
  'Emma Rodriguez',
]
export type ComplianceStatus = 'compliant' | 'incomplete' | 'at_risk' | 'not_started'
export type RequirementStatus = 'not_started' | 'in_progress' | 'at_risk' | 'complete'
export type SubTaskType = 'automated' | 'generatable' | 'primary_action' | 'third_party' | 'informational'
export type SubTaskStatus = 'pending' | 'complete' | 'case_in_progress' | 'submitted'
export type DocumentLayer = 'compliance' | 'travel_essentials' | 'profile'
export type TripPurpose = 'business' | 'tourism' | 'education' | 'relocation' | 'other'
export type AssessmentResult = 'action_required' | 'no_action_required' | 'review_required'
export type ThresholdRuleType = 'minimum' | 'maximum'
export type ThresholdStatus = 'on_track' | 'approaching' | 'at_risk' | 'breached'
export type ApprovalStatus = 'draft' | 'approved' | 'signed'
export type PeriodType = 'rolling_12_months' | 'calendar_year' | 'custom'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  date_of_birth: string | null
  nationality: string | null
  country_of_residence: string | null
  tax_residency: string | null
  address: string | null
  job_title: string | null
  employer: string | null
  work_address: string | null
  created_at: string
  updated_at: string
}

export interface Passport {
  id: string
  user_id: string
  passport_number: string
  issuing_country: string
  nationality: string
  issue_date: string
  expiry_date: string
  is_primary: boolean
  document_url: string | null
  created_at: string
}

export interface TripLeg {
  id: string
  trip_id: string
  destination_country: string
  destination_country_code: string
  start_date: string
  end_date: string
  duration_days: number
  purpose: TripPurpose
  passport_id: string | null
  assessment_result: AssessmentResult | null
  compliance_status: ComplianceStatus | null
  sort_order: number
  created_at: string
}

export interface TransitStop {
  id: string
  trip_id: string
  transit_country: string
  transit_country_code: string
  transit_date: string | null
  sort_order: number
  visa_required: boolean | null
  authorisation_name: string | null
  transit_note: string | null
  checked_at: string | null
  user_confirmed: boolean
  time_required_days?: number
  created_at: string
}

export interface Trip {
  id: string
  user_id: string
  origin_country: string | null
  origin_country_code: string | null
  state: TripState
  compliance_status: ComplianceStatus | null
  is_historical: boolean
  created_at: string
  activated_at: string | null
}

export type RequirementType = 'visa' | 'eta' | 'transit_eta' | 'manager_approval' | 'letter'

export type CaseStatus =
  | 'Case Initiated'
  | 'Process Recommended'
  | 'Documents Collected'
  | 'Application Prepared'
  | 'Application Submitted'
  | 'Official Agency Response'
  | 'Passport Returned'
  | 'Case Completed'

export interface Requirement {
  id: string
  trip_id: string
  leg_id: string | null
  transit_id?: string | null
  name: string
  type: RequirementType
  is_mandatory: boolean
  status: RequirementStatus
  time_required_days: number
  latest_start_date: string | null
  completed_at: string | null
  why_it_applies: string | null
  guidance: string | null
  external_link: string | null
  what_you_need: string[] | null
  has_active_case: boolean
  created_at: string
  approval_state?: ApprovalState | null
  approver_name?: string | null
  approval_log?: ApprovalLogEntry[]
}

export interface SubTask {
  id: string
  requirement_id: string
  name: string
  type: SubTaskType
  status: SubTaskStatus
  service_mode: 'managed' | null
  case_id: string | null
  ai_generated_content: string | null
  approval_status: ApprovalStatus | null
  evidence_document_id: string | null
  submitted_at: string | null
  description: string | null
  sort_order: number
  created_at: string
}

export interface TravelCase {
  id: string
  user_id: string
  trip_id: string
  requirement_id: string
  sub_task_id: string
  case_reference: string
  visa_type: string
  destination_country: string
  status: CaseStatus
  progress: number
  initiated_at: string
  updated_at: string
}

export interface Document {
  id: string
  user_id: string
  name: string
  type: string
  layer: DocumentLayer
  trip_id: string | null
  requirement_id: string | null
  file_url: string
  file_size: number | null
  mime_type: string | null
  upload_date: string
}

export interface CountryRecord {
  id: string
  user_id: string
  country: string
  country_code: string
  total_days: number
  trip_ids: string[]
  updated_at: string
}

export interface Threshold {
  id: string
  user_id: string
  country_or_region: string
  rule_type: ThresholdRuleType
  target_days: number
  period_type: PeriodType
  period_start: string | null
  period_end: string | null
  status: ThresholdStatus
  notification_at_percentage: number
  created_at: string
}

export interface Authorization {
  id: string
  user_id: string
  passport_id: string | null
  document_id: string | null
  name: string
  country: string
  country_code: string
  issue_date: string
  expiry_date: string
  created_at: string
}

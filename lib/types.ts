export type TripState = 'exploratory' | 'active' | 'completed' | 'cancelled'
export type ComplianceStatus = 'compliant' | 'incomplete' | 'at_risk'
export type RequirementStatus = 'not_started' | 'in_progress' | 'at_risk' | 'complete'
export type SubTaskType = 'automated' | 'generatable' | 'primary_action' | 'third_party'
export type SubTaskStatus = 'pending' | 'complete' | 'case_in_progress'
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

export interface Trip {
  id: string
  user_id: string
  destination_country: string
  destination_country_code: string
  start_date: string
  end_date: string
  duration_days: number
  purpose: TripPurpose
  state: TripState
  compliance_status: ComplianceStatus | null
  passport_id: string | null
  assessment_result: AssessmentResult | null
  is_historical: boolean
  created_at: string
  activated_at: string | null
}

export interface Requirement {
  id: string
  trip_id: string
  name: string
  type: string
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
  status: string
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
  name: string
  country: string
  country_code: string
  issue_date: string
  expiry_date: string
  created_at: string
}

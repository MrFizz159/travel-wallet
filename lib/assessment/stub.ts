export type AssessmentResult = 'action_required' | 'no_action_required' | 'review_required'

export interface StubSubTask {
  name: string
  type: 'automated' | 'generatable' | 'primary_action' | 'third_party'
  sort_order: number
}

export interface StubRequirement {
  name: string
  type: string
  is_mandatory: boolean
  time_required_days: number
  why_it_applies: string
  guidance: string
  external_link?: string
  what_you_need?: string[]
  sub_tasks: StubSubTask[]
}

export interface AssessmentOutput {
  result: AssessmentResult
  requirements: StubRequirement[]
}

const NO_ACTION: AssessmentOutput = { result: 'no_action_required', requirements: [] }
const REVIEW: AssessmentOutput = { result: 'review_required', requirements: [] }

const STUBS: Record<string, AssessmentOutput> = {
  IN: {
    result: 'action_required',
    requirements: [
      {
        name: 'e-Business Visa',
        type: 'visa',
        is_mandatory: true,
        time_required_days: 10,
        why_it_applies:
          'UK nationals require a visa to enter India. For business travel, an e-Business Visa is the standard route and can be obtained online.',
        guidance:
          'Apply via the Indian government e-Visa portal. Processing takes 3–5 working days. You will receive your Electronic Travel Authorisation (ETA) by email — no embassy visit required.',
        external_link: 'https://indianvisaonline.gov.in',
        what_you_need: [
          'Valid passport (minimum 6 months remaining beyond return date)',
          'Recent passport photograph (white background)',
          'Letter of support from your employer',
          'Letter of invitation from your Indian host company',
          'Application fee (USD 25)',
        ],
        sub_tasks: [
          { name: 'Passport validity', type: 'automated', sort_order: 0 },
          { name: 'Letter of support', type: 'generatable', sort_order: 1 },
          { name: 'Letter of invitation', type: 'generatable', sort_order: 2 },
          { name: 'Apply for e-Business Visa', type: 'primary_action', sort_order: 3 },
        ],
      },
    ],
  },

  US: {
    result: 'action_required',
    requirements: [
      {
        name: 'ESTA',
        type: 'eta',
        is_mandatory: true,
        time_required_days: 3,
        why_it_applies:
          'UK nationals travelling to the USA under the Visa Waiver Programme must obtain ESTA authorisation before boarding. Travel without a valid ESTA will result in denied boarding.',
        guidance:
          'Apply at the official CBP website. Approval is usually instant but allow 72 hours before travel. A valid ESTA covers multiple trips for 2 years or until your passport expires.',
        external_link: 'https://esta.cbp.dhs.gov',
        what_you_need: [
          'Valid passport',
          'Credit or debit card (USD 21 fee)',
          'Approximate travel itinerary',
        ],
        sub_tasks: [
          { name: 'Passport validity', type: 'automated', sort_order: 0 },
          { name: 'Apply for ESTA', type: 'primary_action', sort_order: 1 },
        ],
      },
    ],
  },

  AU: {
    result: 'action_required',
    requirements: [
      {
        name: 'Electronic Travel Authority (ETA)',
        type: 'eta',
        is_mandatory: true,
        time_required_days: 3,
        why_it_applies:
          'UK nationals require an ETA to enter Australia for tourism or business stays of up to 3 months.',
        guidance:
          'Apply via the Australian ETA app (iOS or Android) or through a registered travel agent. Approval is typically instant.',
        external_link:
          'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601',
        what_you_need: ['Valid passport', 'AUD 20 application charge'],
        sub_tasks: [
          { name: 'Passport validity', type: 'automated', sort_order: 0 },
          { name: 'Apply for ETA', type: 'primary_action', sort_order: 1 },
        ],
      },
    ],
  },

  CA: {
    result: 'action_required',
    requirements: [
      {
        name: 'eTA (Electronic Travel Authorisation)',
        type: 'eta',
        is_mandatory: true,
        time_required_days: 3,
        why_it_applies:
          'UK nationals flying to or transiting through Canada need an eTA. It is linked to your passport and valid for 5 years or until your passport expires.',
        guidance:
          'Apply online via the Government of Canada website. Processing takes a few minutes in most cases, but can take several days — apply before booking flights.',
        external_link: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html',
        what_you_need: ['Valid passport', 'Credit or debit card (CAD 7 fee)', 'Email address'],
        sub_tasks: [
          { name: 'Passport validity', type: 'automated', sort_order: 0 },
          { name: 'Apply for eTA', type: 'primary_action', sort_order: 1 },
        ],
      },
    ],
  },

  // Schengen and other visa-free destinations for UK passport holders
  DE: NO_ACTION,
  FR: NO_ACTION,
  IT: NO_ACTION,
  ES: NO_ACTION,
  NL: NO_ACTION,
  BE: NO_ACTION,
  AT: NO_ACTION,
  CH: NO_ACTION,
  PT: NO_ACTION,
  GR: NO_ACTION,
  IE: NO_ACTION,
  SE: NO_ACTION,
  NO: NO_ACTION,
  DK: NO_ACTION,
  FI: NO_ACTION,
  PL: NO_ACTION,
  CZ: NO_ACTION,
  HR: NO_ACTION,
  HU: NO_ACTION,
  RO: NO_ACTION,
  SG: NO_ACTION,
  AE: NO_ACTION,
  JP: NO_ACTION,
  NZ: NO_ACTION,
  GB: NO_ACTION,
  HK: NO_ACTION,
  IL: NO_ACTION,
  ZA: NO_ACTION,
  MX: NO_ACTION,
  TH: NO_ACTION,
  MY: NO_ACTION,
  TW: NO_ACTION,
  KR: NO_ACTION,
  JO: NO_ACTION,
  QA: NO_ACTION,
}

export function runAssessment(countryCode: string): AssessmentOutput {
  return STUBS[countryCode.toUpperCase()] ?? REVIEW
}

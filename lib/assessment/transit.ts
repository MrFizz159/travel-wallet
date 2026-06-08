import Anthropic from '@anthropic-ai/sdk'
import { findCountry } from '@/lib/countries'

export type TransitCheckResult = {
  visa_required: boolean          // true = any authorisation is required (visa, eTA, ESTA, etc.)
  authorisation_name: string | null  // specific name e.g. "eTA", "ESTA", "Transit visa"
  reason: string
  confidence: 'high' | 'medium' | 'low'
  time_required_days: number      // processing time; 0 = instant / not applicable
}

const FALLBACK: TransitCheckResult = {
  visa_required: true,
  authorisation_name: null,
  reason: 'Could not determine — verify with the relevant embassy or consulate before travel.',
  confidence: 'low',
  time_required_days: 0,
}

// Hardcoded results for common transit countries when no API key is present.
// These cover the most likely PoC test cases; real checks use the API path below.
const TRANSIT_STUBS: Record<string, { visa_required: boolean; authorisation_name: string | null; reason: string; time_required_days: number }> = {
  CA: { visa_required: true,  authorisation_name: 'eTA', reason: 'UK nationals transiting through Canada require an eTA (Electronic Travel Authorisation) even for airside transit.', time_required_days: 3 },
  US: { visa_required: true,  authorisation_name: 'ESTA', reason: 'UK nationals transiting through the US under the Visa Waiver Programme require a valid ESTA.', time_required_days: 3 },
  AU: { visa_required: true,  authorisation_name: 'eTA', reason: 'An Electronic Travel Authority (ETA) is required to transit through Australia.', time_required_days: 3 },
  IN: { visa_required: true,  authorisation_name: 'Transit visa', reason: 'Most nationalities require a transit visa to transit through India unless holding a connecting boarding pass.', time_required_days: 14 },
  CN: { visa_required: false, authorisation_name: null, reason: 'UK nationals can transit through major Chinese airports for up to 144 hours without a visa under the TWOV policy.', time_required_days: 0 },
  DE: { visa_required: false, authorisation_name: null, reason: 'No transit authorisation required for UK nationals transiting through Germany.', time_required_days: 0 },
  NL: { visa_required: false, authorisation_name: null, reason: 'No transit authorisation required for UK nationals transiting through the Netherlands.', time_required_days: 0 },
  AE: { visa_required: false, authorisation_name: null, reason: 'No transit authorisation required for UK nationals transiting through the UAE.', time_required_days: 0 },
  SG: { visa_required: false, authorisation_name: null, reason: 'No transit authorisation required for UK nationals transiting through Singapore.', time_required_days: 0 },
  QA: { visa_required: false, authorisation_name: null, reason: 'No transit authorisation required for UK nationals transiting through Qatar.', time_required_days: 0 },
}

// ── Sub-task templates for transit requirements ───────────────────────────────

export type TransitSubTaskStub = {
  name: string
  type: 'automated' | 'generatable' | 'primary_action' | 'third_party' | 'informational'
  sort_order: number
  description?: string
}

export const TRANSIT_SUB_TASKS: Record<string, TransitSubTaskStub[]> = {
  default_eta: [
    { name: 'Passport validity',   type: 'automated',      sort_order: 0 },
    { name: 'Apply online',        type: 'third_party',    sort_order: 1, description: 'Visit the official portal and complete your application.' },
    { name: 'Upload confirmation', type: 'primary_action', sort_order: 2, description: 'Return once approved and upload your authorisation confirmation.' },
  ],
  default_visa: [
    { name: 'Passport validity',        type: 'automated',      sort_order: 0 },
    { name: 'Submit application',       type: 'third_party',    sort_order: 1, description: 'Apply at the official consular portal.' },
    { name: 'Await approval',           type: 'informational',  sort_order: 2, description: 'Processing typically takes several working days.' },
    { name: 'Upload visa confirmation', type: 'primary_action', sort_order: 3, description: 'Return once approved and upload your transit visa.' },
  ],
}

export function getTransitSubTasks(authorisationName: string | null): TransitSubTaskStub[] {
  const name = (authorisationName ?? '').toLowerCase()
  return name.includes('visa') ? TRANSIT_SUB_TASKS.default_visa : TRANSIT_SUB_TASKS.default_eta
}

// ── Guidance data for transit requirements ────────────────────────────────────

type TransitGuidance = {
  guidance: string
  external_link: string | null
  what_you_need: string[]
}

export const TRANSIT_GUIDANCE: Record<string, TransitGuidance> = {
  CA: {
    guidance: 'Apply via the Government of Canada website. Most applications are approved within minutes, but allow up to 72 hours.',
    external_link: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta/apply.html',
    what_you_need: ['Valid passport', 'Credit or debit card (CAD 7 fee)', 'Email address'],
  },
  US: {
    guidance: 'Apply at the official CBP ESTA portal. Approval is usually instant, but allow 72 hours in case of manual review.',
    external_link: 'https://esta.cbp.dhs.gov',
    what_you_need: ['Valid passport', 'Credit or debit card (USD 21 fee)', 'Email address'],
  },
  AU: {
    guidance: 'Apply via the Australian ETA app or through a travel agent. Most applications are decided within minutes.',
    external_link: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601',
    what_you_need: ['Valid passport', 'Credit or debit card (AUD 20 fee)', 'Email address'],
  },
  IN: {
    guidance: 'Apply for an Indian transit visa via the Indian Visa Online portal. Allow at least 4 business days for processing.',
    external_link: 'https://indianvisaonline.gov.in',
    what_you_need: ['Valid passport (6+ months validity)', 'Passport-sized photograph', 'Confirmed onward ticket', 'Application fee'],
  },
}

const TRANSIT_GUIDANCE_FALLBACK: TransitGuidance = {
  guidance: 'Apply for the required authorisation via the official government portal for the transit country. Check processing times and apply well in advance of travel.',
  external_link: null,
  what_you_need: ['Valid passport'],
}

export function getTransitGuidance(countryCode: string): TransitGuidance {
  return TRANSIT_GUIDANCE[countryCode.toUpperCase()] ?? TRANSIT_GUIDANCE_FALLBACK
}

// ── Transit check ─────────────────────────────────────────────────────────────

export async function runTransitCheck(
  transitCountryCode: string,
  nationality: string
): Promise<TransitCheckResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    const stub = TRANSIT_STUBS[transitCountryCode.toUpperCase()]
    if (stub) {
      return { ...stub, confidence: 'high' }
    }
    return {
      visa_required: true,
      authorisation_name: null,
      reason: 'Could not determine without API access — verify with the relevant embassy or consulate before travel.',
      confidence: 'low',
      time_required_days: 0,
    }
  }

  const transitCountry = findCountry(transitCountryCode)?.name ?? transitCountryCode

  console.log('[transit] checking:', transitCountryCode, 'for nationality:', nationality)
  try {
    const client = new Anthropic()
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system:
        'You are a travel compliance expert. When asked about transit requirements, respond ONLY with a valid JSON object. Example when authorisation required: {"visa_required": true, "authorisation_name": "eTA", "reason": "UK nationals require an eTA to transit Canada.", "confidence": "high", "time_required_days": 3}. Example when none required: {"visa_required": false, "authorisation_name": null, "reason": "No authorisation required.", "confidence": "high", "time_required_days": 0}. Set visa_required to true if ANY authorisation is needed (transit visa, eTA, ESTA, transit permit, or any other travel authority). Set authorisation_name to the specific name (e.g. "eTA", "ESTA", "Transit visa") or null. Set time_required_days to the typical processing time in calendar days (0 if instant or not applicable). No markdown, no extra text.',
      messages: [
        {
          role: 'user',
          content: `A traveller holding a ${nationality} passport is making an airside transit through ${transitCountry}. Do they need any authorisation to transit — including transit visas, eTAs, ESTAs, or any other travel authority? Respond with JSON only.`,
        },
      ],
    })

    const raw = (message.content[0].type === 'text' ? message.content[0].text.trim() : '')
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()
    console.log('[transit] raw response:', raw)
    const parsed = JSON.parse(raw) as TransitCheckResult
    console.log('[transit] parsed:', parsed)

    if (typeof parsed.visa_required !== 'boolean') return FALLBACK
    return {
      visa_required: parsed.visa_required,
      authorisation_name: typeof parsed.authorisation_name === 'string' ? parsed.authorisation_name : null,
      reason: typeof parsed.reason === 'string' ? parsed.reason : '',
      confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium',
      time_required_days: typeof parsed.time_required_days === 'number' ? parsed.time_required_days : 3,
    }
  } catch (err) {
    console.error('[transit] error:', err)
    return FALLBACK
  }
}

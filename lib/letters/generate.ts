import Anthropic from '@anthropic-ai/sdk'

export type LetterType = 'support' | 'invitation'

export interface LetterInput {
  letterType: LetterType
  today: string // pre-formatted date string, passed in by the caller
  traveller: {
    fullName: string | null
    jobTitle: string | null
    employer: string | null
    nationality: string | null
  }
  leg: {
    destinationCountry: string
    startDate: string
    endDate: string
    purpose: string
  }
  requirement: {
    name: string
    whyItApplies: string | null
  }
}

const LETTER_SYSTEM_PROMPT =
  'You draft formal business letters for international travel compliance, specifically letters submitted in support of visa applications. ' +
  'Output ONLY the letter text: plain text, no markdown, no preamble or commentary before or after the letter. ' +
  'Use UK English throughout. Date the letter with the provided date. ' +
  'If a detail is missing from the context, use a clearly bracketed placeholder (for example "[Employer name]") rather than inventing facts.'

function buildUserPrompt(input: LetterInput): string {
  const { letterType, today, traveller, leg, requirement } = input
  const intent =
    letterType === 'invitation'
      ? 'a letter of invitation in which the host company in the destination country invites the traveller for the visit'
      : 'a letter of support in which the employer confirms the traveller\'s employment and the purpose of the trip'

  return [
    `Draft ${intent}.`,
    '',
    `Letter date: ${today}`,
    `Traveller name: ${traveller.fullName ?? '[Traveller name]'}`,
    `Job title: ${traveller.jobTitle ?? '[Job title]'}`,
    `Employer: ${traveller.employer ?? '[Employer name]'}`,
    `Nationality: ${traveller.nationality ?? '[Nationality]'}`,
    `Destination country: ${leg.destinationCountry}`,
    `Travel dates: ${leg.startDate} to ${leg.endDate}`,
    `Purpose of travel: ${leg.purpose}`,
    `Compliance requirement: ${requirement.name}`,
    `Why this requirement applies: ${requirement.whyItApplies ?? 'Not specified'}`,
  ].join('\n')
}

// Deterministic fallback used when no API key is present or the API call fails.
function buildTemplateLetter(input: LetterInput): string {
  const { letterType, today, traveller, leg, requirement } = input
  const fullName = traveller.fullName ?? '[Traveller name]'
  const jobTitle = traveller.jobTitle ?? '[Job title]'
  const employer = traveller.employer ?? '[Employer name]'
  const nationality = traveller.nationality ?? '[Nationality]'

  const header = [
    today,
    '',
    'To the Visa Officer',
    `Embassy/Consulate of ${leg.destinationCountry}`,
    '',
    'Dear Sir or Madam,',
    '',
  ]

  const body =
    letterType === 'invitation'
      ? [
          `Re: Letter of invitation for ${fullName}`,
          '',
          `On behalf of [Host company name], I am pleased to invite ${fullName}, ${jobTitle} at ${employer} and a ${nationality} national, to visit us in ${leg.destinationCountry} from ${leg.startDate} to ${leg.endDate} for the purpose of ${leg.purpose}.`,
          '',
          `During the visit, ${fullName} will remain employed and remunerated by ${employer}, and [Host company name] will provide the facilities necessary for the visit. This letter is provided in support of the requirement "${requirement.name}".`,
          '',
          'Please contact us should you require any further information.',
          '',
          'Yours faithfully,',
          '',
          '[Authorised signatory]',
          '[Host company name]',
        ]
      : [
          `Re: Letter of support for ${fullName}`,
          '',
          `I am writing to confirm that ${fullName}, a ${nationality} national, is employed by ${employer} as ${jobTitle}. ${fullName} will be travelling to ${leg.destinationCountry} from ${leg.startDate} to ${leg.endDate} for the purpose of ${leg.purpose}.`,
          '',
          `${employer} will remain responsible for ${fullName}'s employment and remuneration for the duration of the trip, and ${fullName} is expected to resume their duties on return. This letter is provided in support of the requirement "${requirement.name}".`,
          '',
          'Please contact us should you require any further information.',
          '',
          'Yours faithfully,',
          '',
          '[Authorised signatory]',
          employer,
        ]

  return [...header, ...body].join('\n')
}

export async function generateLetterContent(
  input: LetterInput
): Promise<{ content: string; source: 'ai' | 'stub' }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { content: buildTemplateLetter(input), source: 'stub' }
  }

  try {
    const client = new Anthropic()
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      system: LETTER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    })

    const content = (message.content[0].type === 'text' ? message.content[0].text : '').trim()
    if (content) return { content, source: 'ai' }

    console.error('[letters] empty response from model, falling back to template')
    return { content: buildTemplateLetter(input), source: 'stub' }
  } catch (err) {
    console.error('[letters] error:', err)
    return { content: buildTemplateLetter(input), source: 'stub' }
  }
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { runAssessment } from '@/lib/assessment/stub'
import { runTransitCheck, getTransitSubTasks, getTransitGuidance } from '@/lib/assessment/transit'
import { computeLegComplianceStatus } from '@/lib/compliance'
import { subtractDays, addDays, durationDays } from '@/lib/dates'
import { syncComplianceStatus } from './_utils'

// Payload shapes expected from the itinerary form (JSON-encoded in FormData).
// Note: assessment_result is intentionally absent — it's derived server-side
// at insert time, never trusted from the client.
type LegPayload = {
  destination_country: string
  destination_country_code: string
  start_date: string
  end_date: string
  purpose: string
  passport_id: string
}

type TransitPayload = {
  sort_order: number
  transit_country: string
  transit_country_code: string
  transit_date: string
  visa_required: boolean | null
  authorisation_name: string | null
  transit_note: string | null
  checked_at: string | null
  time_required_days: number
}

// Fetch expiry dates for a set of passport ids in one query.
// Legs can reference different passports, so callers pass every distinct id.
async function fetchPassportExpiries(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  passportIds: Array<string | null | undefined>,
): Promise<Map<string, string | null>> {
  const ids = [...new Set(passportIds.filter((id): id is string => Boolean(id)))]
  const expiries = new Map<string, string | null>()
  if (ids.length === 0) return expiries

  const { data } = await supabase
    .from('passports')
    .select('id, expiry_date')
    .in('id', ids)

  for (const row of data ?? []) expiries.set(row.id, row.expiry_date)
  return expiries
}

// Insert requirements + sub_tasks for a single leg. Sub-tasks correlate with
// their parent requirement by array index (PostgREST returns inserted rows in
// input order), so legs can be processed in parallel safely.
async function insertLegRequirements(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  tripId: string,
  legId: string,
  destinationCountryCode: string,
  legStartDate: string,
  legEndDate: string,
  passportExpiry: string | null,
) {
  const assessment = runAssessment(destinationCountryCode)
  if (assessment.requirements.length === 0) return []

  const { data: insertedReqs } = await supabase
    .from('requirements')
    .insert(assessment.requirements.map(stubReq => ({
      trip_id: tripId,
      leg_id: legId,
      name: stubReq.name,
      type: stubReq.type,
      is_mandatory: stubReq.is_mandatory,
      status: 'not_started',
      time_required_days: stubReq.time_required_days,
      latest_start_date: stubReq.time_required_days > 0
        ? subtractDays(legStartDate, stubReq.time_required_days)
        : null,
      why_it_applies: stubReq.why_it_applies,
      guidance: stubReq.guidance,
      external_link: stubReq.external_link ?? null,
      what_you_need: stubReq.what_you_need ?? null,
    })))
    .select()

  if (!insertedReqs || insertedReqs.length === 0) return []
  if (insertedReqs.length !== assessment.requirements.length) {
    throw new Error(
      `Requirement insert mismatch for leg ${legId}: expected ${assessment.requirements.length} rows, got ${insertedReqs.length}`
    )
  }

  const minExpiry = addDays(legEndDate, 180)
  const subTaskPayloads = assessment.requirements.flatMap((stubReq, i) => {
    const req = insertedReqs[i]
    return stubReq.sub_tasks.map(stubTask => ({
      requirement_id: req.id,
      name: stubTask.name,
      type: stubTask.type,
      status: (stubTask.type === 'automated' && passportExpiry && passportExpiry >= minExpiry)
        ? 'complete' as const
        : 'pending' as const,
      sort_order: stubTask.sort_order,
      description: stubTask.description ?? null,
    }))
  })

  if (subTaskPayloads.length > 0) {
    await supabase.from('sub_tasks').insert(subTaskPayloads)
  }

  return insertedReqs
}

// Insert a Requirement + sub_tasks for each transit that requires a visa/eTA.
// Transits with visa_required !== true are skipped — they need no compliance record.
async function insertTransitRequirements(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  tripId: string,
  transits: Array<{
    id: string
    transit_country_code: string
    transit_date: string | null
    visa_required: boolean | null
    authorisation_name: string | null
    transit_note: string | null
    time_required_days: number
  }>,
  passportExpiry: string | null,
) {
  for (const transit of transits) {
    if (transit.visa_required !== true) continue

    const days = transit.time_required_days ?? 0
    const latestStartDate = (transit.transit_date && days > 0)
      ? subtractDays(transit.transit_date, days)
      : null

    const guidance = getTransitGuidance(transit.transit_country_code)
    const reqName = transit.authorisation_name ?? 'Transit authorisation'

    const { data: insertedReq } = await supabase
      .from('requirements')
      .insert({
        trip_id: tripId,
        leg_id: null,
        transit_id: transit.id,
        name: reqName,
        type: 'transit_eta',
        is_mandatory: true,
        status: 'not_started',
        time_required_days: days,
        latest_start_date: latestStartDate,
        why_it_applies: transit.transit_note ?? null,
        guidance: guidance.guidance,
        external_link: guidance.external_link,
        what_you_need: guidance.what_you_need,
      })
      .select()
      .single()

    if (!insertedReq) continue

    const subTasks = getTransitSubTasks(transit.authorisation_name)
    const minExpiry = transit.transit_date ? addDays(transit.transit_date, 180) : null

    const subTaskPayloads = subTasks.map(task => ({
      requirement_id: insertedReq.id,
      name: task.name,
      type: task.type,
      status: (task.type === 'automated' && passportExpiry && minExpiry && passportExpiry >= minExpiry)
        ? 'complete' as const
        : 'pending' as const,
      sort_order: task.sort_order,
      description: task.description ?? null,
    }))

    if (subTaskPayloads.length > 0) {
      await supabase.from('sub_tasks').insert(subTaskPayloads)
    }
  }
}

// ── Public actions ────────────────────────────────────────────────────────────

export async function createTrip(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const legs = JSON.parse(formData.get('legs') as string) as LegPayload[]
  const transitsRaw = formData.get('transits') as string | null
  const transits: TransitPayload[] = transitsRaw ? JSON.parse(transitsRaw) : []
  const is_historical = formData.get('is_historical') === 'true'

  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      user_id: user.id,
      is_historical,
      state: is_historical ? 'completed' : 'exploratory',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await supabase.from('trip_legs').insert(
    legs.map((leg, i) => ({
      trip_id: trip.id,
      destination_country: leg.destination_country,
      destination_country_code: leg.destination_country_code,
      start_date: leg.start_date,
      end_date: leg.end_date,
      duration_days: durationDays(leg.start_date, leg.end_date),
      purpose: leg.purpose,
      passport_id: leg.passport_id || null,
      assessment_result: is_historical
        ? 'no_action_required'
        : runAssessment(leg.destination_country_code).result,
      sort_order: i,
    }))
  )

  // Persist transit rows for exploratory trips (requirements created at activation)
  if (transits.length > 0) {
    await supabase.from('trip_transits').insert(
      transits.map(t => ({
        trip_id: trip.id,
        transit_country: t.transit_country,
        transit_country_code: t.transit_country_code,
        transit_date: t.transit_date || null,
        sort_order: t.sort_order,
        visa_required: t.visa_required ?? null,
        authorisation_name: t.authorisation_name ?? null,
        transit_note: t.transit_note ?? null,
        checked_at: t.checked_at ?? null,
        time_required_days: t.time_required_days ?? 0,
      }))
    )
  }

  redirect('/trips')
}

export async function createAndActivateTrip(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const legs = JSON.parse(formData.get('legs') as string) as LegPayload[]
  const transits = JSON.parse(formData.get('transits') as string) as TransitPayload[]

  // 1. Create trip container
  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      user_id: user.id,
      is_historical: false,
      state: 'active',
      activated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // 2. Insert all legs
  const { data: insertedLegs } = await supabase
    .from('trip_legs')
    .insert(legs.map((leg, i) => ({
      trip_id: trip.id,
      destination_country: leg.destination_country,
      destination_country_code: leg.destination_country_code,
      start_date: leg.start_date,
      end_date: leg.end_date,
      duration_days: durationDays(leg.start_date, leg.end_date),
      purpose: leg.purpose,
      passport_id: leg.passport_id || null,
      assessment_result: runAssessment(leg.destination_country_code).result,
      sort_order: i,
    })))
    .select()

  if (!insertedLegs) throw new Error('Failed to insert legs')

  // 3. For each leg (in parallel): insert requirements + sub_tasks, then set leg status
  const passportExpiries = await fetchPassportExpiries(supabase, insertedLegs.map(l => l.passport_id))

  await Promise.all(insertedLegs.map(async dbLeg => {
    const passportExpiry = dbLeg.passport_id
      ? passportExpiries.get(dbLeg.passport_id) ?? null
      : null
    const insertedReqs = await insertLegRequirements(
      supabase, trip.id, dbLeg.id,
      dbLeg.destination_country_code,
      dbLeg.start_date, dbLeg.end_date,
      passportExpiry,
    )
    const legStatus = computeLegComplianceStatus(insertedReqs)
    await supabase.from('trip_legs').update({ compliance_status: legStatus }).eq('id', dbLeg.id)
  }))

  // 4. Manager approval — trip-level (leg_id = null, transit_id = null)
  await supabase.from('requirements').insert({
    trip_id: trip.id,
    leg_id: null,
    name: 'Manager Approval',
    type: 'manager_approval',
    is_mandatory: true,
    status: 'not_started',
    time_required_days: 0,
    latest_start_date: null,
    why_it_applies: 'Your organisation requires manager sign-off before travel can proceed.',
    guidance: 'Select your manager and send a request for approval. Your trip cannot be marked compliant until this is approved.',
    external_link: null,
    what_you_need: null,
    approval_state: 'unsent',
    approver_name: null,
    approval_log: [],
  })

  // 5. Insert transit rows and create requirements for those needing authorisation
  if (transits.length > 0) {
    const { data: insertedTransits } = await supabase
      .from('trip_transits')
      .insert(
        transits.map(t => ({
          trip_id: trip.id,
          transit_country: t.transit_country,
          transit_country_code: t.transit_country_code,
          transit_date: t.transit_date || null,
          sort_order: t.sort_order,
          visa_required: t.visa_required ?? null,
          authorisation_name: t.authorisation_name ?? null,
          transit_note: t.transit_note ?? null,
          checked_at: t.checked_at ?? null,
          time_required_days: t.time_required_days ?? 0,
        }))
      )
      .select()

    if (insertedTransits && insertedTransits.length > 0) {
      const firstLegPassportId = legs[0]?.passport_id || null
      const firstLegExpiry = firstLegPassportId
        ? passportExpiries.get(firstLegPassportId) ?? null
        : null
      await insertTransitRequirements(supabase, trip.id, insertedTransits, firstLegExpiry)
    }
  }

  // 6. Compute overall trip compliance
  await syncComplianceStatus(supabase, trip.id, user.id)

  revalidatePath(`/trips/${trip.id}`)
  revalidatePath('/trips')
  redirect(`/trips/${trip.id}`)
}

export async function activateTrip(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const tripId = formData.get('tripId') as string

  // Verify ownership
  const { data: trip } = await supabase
    .from('trips')
    .select('id, state')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single()
  if (!trip) throw new Error('Trip not found')

  // Fetch legs (created at exploratory stage)
  const { data: legs } = await supabase
    .from('trip_legs')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order')

  const passportExpiries = await fetchPassportExpiries(supabase, (legs ?? []).map(l => l.passport_id))

  await Promise.all((legs ?? []).map(async leg => {
    const passportExpiry = leg.passport_id
      ? passportExpiries.get(leg.passport_id) ?? null
      : null
    const insertedReqs = await insertLegRequirements(
      supabase, tripId, leg.id,
      leg.destination_country_code,
      leg.start_date, leg.end_date,
      passportExpiry,
    )
    const legStatus = computeLegComplianceStatus(insertedReqs)
    await supabase.from('trip_legs').update({ compliance_status: legStatus }).eq('id', leg.id)
  }))

  // Manager approval
  await supabase.from('requirements').insert({
    trip_id: tripId,
    leg_id: null,
    name: 'Manager Approval',
    type: 'manager_approval',
    is_mandatory: true,
    status: 'not_started',
    time_required_days: 0,
    latest_start_date: null,
    why_it_applies: 'Your organisation requires manager sign-off before travel can proceed.',
    guidance: 'Select your manager and send a request for approval. Your trip cannot be marked compliant until this is approved.',
    external_link: null,
    what_you_need: null,
    approval_state: 'unsent',
    approver_name: null,
    approval_log: [],
  })

  // Fetch existing transit rows and create requirements for those needing authorisation
  const { data: existingTransits } = await supabase
    .from('trip_transits')
    .select('*')
    .eq('trip_id', tripId)

  if (existingTransits && existingTransits.length > 0) {
    const firstLegPassportId = legs?.[0]?.passport_id ?? null
    const firstLegExpiry = firstLegPassportId
      ? passportExpiries.get(firstLegPassportId) ?? null
      : null
    await insertTransitRequirements(supabase, tripId, existingTransits, firstLegExpiry)
  }

  await supabase
    .from('trips')
    .update({ state: 'active', activated_at: new Date().toISOString() })
    .eq('id', tripId)
    .eq('user_id', user.id)

  await syncComplianceStatus(supabase, tripId, user.id)

  revalidatePath(`/trips/${tripId}`)
  revalidatePath('/trips')
  redirect(`/trips/${tripId}`)
}

export async function cancelTrip(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const tripId = formData.get('tripId') as string

  const { data: trip } = await supabase
    .from('trips')
    .select('state')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single()

  if (!trip) throw new Error('Trip not found')
  if (trip.state === 'completed' || trip.state === 'cancelled') redirect('/trips')

  await supabase
    .from('trips')
    .update({ state: 'cancelled' })
    .eq('id', tripId)
    .eq('user_id', user.id)

  revalidatePath('/trips')
  revalidatePath(`/trips/${tripId}`)
  redirect('/trips')
}

export async function checkTransit(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const transitId = formData.get('transitId') as string
  const tripId = formData.get('tripId') as string

  // Fetch transit row
  const { data: transit } = await supabase
    .from('trip_transits')
    .select('transit_country_code, trip_id')
    .eq('id', transitId)
    .single()
  if (!transit) throw new Error('Transit not found')

  // Fetch traveller nationality from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('nationality')
    .eq('id', user.id)
    .single()

  // Nationality stored as country name in profiles — look up code from primary passport
  const { data: passport } = await supabase
    .from('passports')
    .select('nationality')
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .single()

  const nationalityName = passport?.nationality ?? profile?.nationality ?? 'Unknown'

  const result = await runTransitCheck(transit.transit_country_code, nationalityName)

  await supabase
    .from('trip_transits')
    .update({
      visa_required: result.visa_required,
      authorisation_name: result.authorisation_name ?? null,
      transit_note: result.reason,
      checked_at: new Date().toISOString(),
      time_required_days: result.time_required_days,
    })
    .eq('id', transitId)

  await syncComplianceStatus(supabase, tripId, user.id)

  revalidatePath(`/trips/${tripId}`)
}

export async function confirmTransitVisa(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const transitId = formData.get('transitId') as string
  const tripId = formData.get('tripId') as string

  await supabase
    .from('trip_transits')
    .update({ user_confirmed: true })
    .eq('id', transitId)

  await syncComplianceStatus(supabase, tripId, user.id)

  revalidatePath(`/trips/${tripId}`)
}

// Pre-save transit check — called from the intake form before any trip is created.
// Returns the check result without writing to DB.
export async function previewTransitCheck(transitCountryCode: string): Promise<import('@/lib/assessment/transit').TransitCheckResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { visa_required: true, authorisation_name: null, reason: 'Not authenticated', confidence: 'low', time_required_days: 0 }

  const { data: passport } = await supabase
    .from('passports')
    .select('nationality')
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('nationality')
    .eq('id', user.id)
    .single()

  const nationality = passport?.nationality ?? profile?.nationality ?? 'Unknown'
  return runTransitCheck(transitCountryCode, nationality)
}

const AUTH_REQ_TYPES = ['visa', 'eta', 'transit_eta', 'residence_permit', 'right_to_work']

export async function uploadEvidence(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const file = formData.get('file') as File
  const requirementId = formData.get('requirementId') as string
  const tripId = formData.get('tripId') as string
  const reqType = (formData.get('requirement_type') as string) || 'evidence'
  const issueDate = (formData.get('issue_date') as string) || null
  const expiryDate = (formData.get('expiry_date') as string) || null
  const authName = (formData.get('auth_name') as string) || null

  if (!file || file.size === 0) throw new Error('No file provided')

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${user.id}/${tripId}/${requirementId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, file, { contentType: file.type })

  if (uploadError) throw new Error(uploadError.message)

  const isAuthType = AUTH_REQ_TYPES.includes(reqType)

  const { data: doc } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      name: file.name,
      type: isAuthType ? reqType : 'evidence',
      layer: 'compliance',
      trip_id: tripId,
      requirement_id: requirementId,
      file_url: path,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single()

  if (isAuthType && issueDate && expiryDate && authName && doc) {
    const { data: reqData } = await supabase
      .from('requirements')
      .select('leg_id, transit_id')
      .eq('id', requirementId)
      .single()

    if (reqData?.leg_id) {
      // Destination leg requirement — look up via leg
      const { data: legData } = await supabase
        .from('trip_legs')
        .select('destination_country, destination_country_code')
        .eq('id', reqData.leg_id)
        .single()

      if (legData) {
        await supabase.from('authorizations').insert({
          user_id: user.id,
          name: authName,
          country: legData.destination_country,
          country_code: legData.destination_country_code,
          issue_date: issueDate,
          expiry_date: expiryDate,
          document_id: doc.id,
        })
        revalidatePath('/wallet')
      }
    } else if (reqData?.transit_id) {
      // Transit requirement — look up via transit stop
      const { data: transitData } = await supabase
        .from('trip_transits')
        .select('transit_country, transit_country_code')
        .eq('id', reqData.transit_id)
        .single()

      if (transitData) {
        await supabase.from('authorizations').insert({
          user_id: user.id,
          name: authName,
          country: transitData.transit_country,
          country_code: transitData.transit_country_code,
          issue_date: issueDate,
          expiry_date: expiryDate,
          document_id: doc.id,
        })
        revalidatePath('/wallet')
      }
    }
  }

  const { data: primaryTask } = await supabase
    .from('sub_tasks')
    .select('id')
    .eq('requirement_id', requirementId)
    .eq('type', 'primary_action')
    .single()

  if (primaryTask) {
    await supabase
      .from('sub_tasks')
      .update({ status: 'complete', evidence_document_id: doc?.id ?? null })
      .eq('id', primaryTask.id)
  }

  await supabase
    .from('requirements')
    .update({ status: 'complete', completed_at: new Date().toISOString() })
    .eq('id', requirementId)

  await syncComplianceStatus(supabase, tripId, user.id)

  revalidatePath(`/trips/${tripId}`)
}

export async function markApplicationSubmitted(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const subTaskId = formData.get('subTaskId') as string
  const requirementId = formData.get('requirementId') as string
  const tripId = formData.get('tripId') as string

  await supabase
    .from('sub_tasks')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', subTaskId)

  await supabase
    .from('requirements')
    .update({ status: 'in_progress' })
    .eq('id', requirementId)

  await syncComplianceStatus(supabase, tripId, user.id)

  revalidatePath(`/trips/${tripId}`)
}

export async function sendManagerApproval(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const requirementId = formData.get('requirementId') as string
  const tripId = formData.get('tripId') as string
  const approverName = formData.get('approverName') as string

  await supabase
    .from('requirements')
    .update({
      approval_state: 'pending',
      approver_name: approverName,
      status: 'in_progress',
    })
    .eq('id', requirementId)

  await syncComplianceStatus(supabase, tripId, user.id)

  revalidatePath(`/trips/${tripId}`)
}

export async function resolveManagerApproval(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const requirementId = formData.get('requirementId') as string
  const tripId = formData.get('tripId') as string
  const approverName = formData.get('approverName') as string
  const timestamp = new Date().toISOString()

  const logEntry = { state: 'approved', actor: approverName, timestamp }

  const { data: req } = await supabase
    .from('requirements')
    .select('approval_log')
    .eq('id', requirementId)
    .single()

  const existingLog = Array.isArray(req?.approval_log) ? req.approval_log : []

  await supabase
    .from('requirements')
    .update({
      approval_state: 'approved',
      status: 'complete',
      completed_at: timestamp,
      approval_log: [...existingLog, logEntry],
    })
    .eq('id', requirementId)

  await syncComplianceStatus(supabase, tripId, user.id)

  revalidatePath(`/trips/${tripId}`)
}

export async function uploadTravelEssential(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const file = formData.get('file') as File
  const tripId = formData.get('tripId') as string
  const documentType = (formData.get('documentType') as string) || 'other'

  if (!file || file.size === 0) throw new Error('No file provided')

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${user.id}/${tripId}/essentials/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, file, { contentType: file.type })

  if (uploadError) throw new Error(uploadError.message)

  await supabase.from('documents').insert({
    user_id: user.id,
    name: file.name,
    type: documentType,
    layer: 'travel_essentials',
    trip_id: tripId,
    requirement_id: null,
    file_url: path,
    file_size: file.size,
    mime_type: file.type,
  })

  revalidatePath(`/trips/${tripId}`)
}

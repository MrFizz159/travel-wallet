'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { runAssessment } from '@/lib/assessment/stub'
import { subtractDays, addDays, computeComplianceStatus } from '@/lib/compliance'

export async function createTrip(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const destination_country = formData.get('destination_country') as string
  const destination_country_code = formData.get('destination_country_code') as string
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string
  const purpose = formData.get('purpose') as string
  const passport_id = (formData.get('passport_id') as string) || null
  const is_historical = formData.get('is_historical') === 'true'
  const assessment_result = formData.get('assessment_result') as string

  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      user_id: user.id,
      destination_country,
      destination_country_code,
      start_date,
      end_date,
      purpose,
      passport_id,
      is_historical,
      assessment_result,
      state: is_historical ? 'completed' : 'exploratory',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  redirect(`/trips`)
}

export async function activateTrip(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const tripId = formData.get('tripId') as string

  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single()

  if (!trip) throw new Error('Trip not found')

  let passport: { expiry_date: string } | null = null
  if (trip.passport_id) {
    const { data } = await supabase
      .from('passports')
      .select('expiry_date')
      .eq('id', trip.passport_id)
      .single()
    passport = data
  }

  const assessment = runAssessment(trip.destination_country_code)

  // Batch insert all assessment requirements in one call
  const { data: insertedRequirements } = await supabase
    .from('requirements')
    .insert(assessment.requirements.map(stubReq => ({
      trip_id: tripId,
      name: stubReq.name,
      type: stubReq.type,
      is_mandatory: stubReq.is_mandatory,
      status: 'not_started',
      time_required_days: stubReq.time_required_days,
      latest_start_date: stubReq.time_required_days > 0
        ? subtractDays(trip.start_date, stubReq.time_required_days)
        : null,
      why_it_applies: stubReq.why_it_applies,
      guidance: stubReq.guidance,
      external_link: stubReq.external_link ?? null,
      what_you_need: stubReq.what_you_need ?? null,
    })))
    .select()

  if (!insertedRequirements) throw new Error('Failed to insert requirements')

  // Build sub_task payloads using returned requirement IDs, matched by name
  const minExpiry = addDays(trip.end_date, 180)
  const subTaskPayloads = assessment.requirements.flatMap(stubReq => {
    const req = insertedRequirements.find(r => r.name === stubReq.name)
    if (!req) return []
    return stubReq.sub_tasks.map(stubTask => ({
      requirement_id: req.id,
      name: stubTask.name,
      type: stubTask.type,
      // Automated passport validity check: must be valid 6 months beyond return date
      status: (stubTask.type === 'automated' && passport && passport.expiry_date >= minExpiry)
        ? 'complete' as const
        : 'pending' as const,
      sort_order: stubTask.sort_order,
      description: stubTask.description ?? null,
    }))
  })

  // Batch insert sub_tasks and manager approval requirement in parallel
  const [, { data: managerReq }] = await Promise.all([
    subTaskPayloads.length > 0
      ? supabase.from('sub_tasks').insert(subTaskPayloads)
      : Promise.resolve(null),
    supabase.from('requirements').insert({
      trip_id: tripId,
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
    }).select().single(),
  ])

  // Compute compliance status from in-memory data — no re-fetch needed
  const allRequirements = [...insertedRequirements, ...(managerReq ? [managerReq] : [])]
  const complianceStatus = computeComplianceStatus(allRequirements)

  await supabase
    .from('trips')
    .update({
      state: 'active',
      activated_at: new Date().toISOString(),
      compliance_status: complianceStatus,
    })
    .eq('id', tripId)
    .eq('user_id', user.id)

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
    .select('*')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single()

  if (!trip) throw new Error('Trip not found')

  if (trip.state === 'completed' || trip.state === 'cancelled') {
    redirect('/trips')
  }

  await supabase
    .from('trips')
    .update({ state: 'cancelled' })
    .eq('id', tripId)
    .eq('user_id', user.id)

  revalidatePath('/trips')
  revalidatePath(`/trips/${tripId}`)
  redirect('/trips')
}

const AUTH_REQ_TYPES = ['visa', 'eta', 'residence_permit', 'right_to_work']

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
    const { data: trip } = await supabase
      .from('trips')
      .select('destination_country, destination_country_code')
      .eq('id', tripId)
      .single()
    if (trip) {
      await supabase.from('authorizations').insert({
        user_id: user.id,
        name: authName,
        country: trip.destination_country,
        country_code: trip.destination_country_code,
        issue_date: issueDate,
        expiry_date: expiryDate,
        document_id: doc.id,
      })
      revalidatePath('/wallet')
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

  const { data: allRequirements } = await supabase
    .from('requirements')
    .select('*')
    .eq('trip_id', tripId)

  const newStatus = computeComplianceStatus(allRequirements ?? [])

  await supabase
    .from('trips')
    .update({ compliance_status: newStatus })
    .eq('id', tripId)
    .eq('user_id', user.id)

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

  const { data: allRequirements } = await supabase
    .from('requirements')
    .select('*')
    .eq('trip_id', tripId)

  const newStatus = computeComplianceStatus(allRequirements ?? [])
  await supabase
    .from('trips')
    .update({ compliance_status: newStatus })
    .eq('id', tripId)
    .eq('user_id', user.id)

  revalidatePath(`/trips/${tripId}`)
}

export async function generateLetter(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const subTaskId = formData.get('subTaskId') as string
  const requirementId = formData.get('requirementId') as string
  const tripId = formData.get('tripId') as string

  // Stub: stores placeholder content so the step advances to "generated" state
  const content = `[Generated letter — download and have it signed, then upload the signed copy to complete this step.]`

  await supabase
    .from('sub_tasks')
    .update({ ai_generated_content: content, approval_status: 'draft' })
    .eq('id', subTaskId)

  await supabase
    .from('requirements')
    .update({ status: 'in_progress' })
    .eq('id', requirementId)

  revalidatePath(`/trips/${tripId}`)
}

export async function uploadSignedLetter(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const file = formData.get('file') as File
  const subTaskId = formData.get('subTaskId') as string
  const requirementId = formData.get('requirementId') as string
  const tripId = formData.get('tripId') as string

  if (!file || file.size === 0) throw new Error('No file provided')

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${user.id}/${tripId}/${requirementId}/letters/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, file, { contentType: file.type })

  if (uploadError) throw new Error(uploadError.message)

  const { data: doc } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      name: file.name,
      type: 'letter',
      layer: 'compliance',
      trip_id: tripId,
      requirement_id: requirementId,
      file_url: path,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single()

  await supabase
    .from('sub_tasks')
    .update({ status: 'complete', approval_status: 'signed', evidence_document_id: doc?.id ?? null })
    .eq('id', subTaskId)

  revalidatePath(`/trips/${tripId}`)
}

export async function sendManagerApproval(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const requirementId = formData.get('requirementId') as string
  const tripId = formData.get('tripId') as string
  const approverName = formData.get('approverName') as string

  const [, { data: allRequirements }] = await Promise.all([
    supabase
      .from('requirements')
      .update({
        approval_state: 'pending',
        approver_name: approverName,
        status: 'in_progress',
      })
      .eq('id', requirementId),
    supabase
      .from('requirements')
      .select('*')
      .eq('trip_id', tripId),
  ])

  const newStatus = computeComplianceStatus(allRequirements ?? [])
  await supabase
    .from('trips')
    .update({ compliance_status: newStatus })
    .eq('id', tripId)
    .eq('user_id', user.id)

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

  const { data: allRequirements } = await supabase
    .from('requirements')
    .select('*')
    .eq('trip_id', tripId)

  const newStatus = computeComplianceStatus(allRequirements ?? [])
  await supabase
    .from('trips')
    .update({ compliance_status: newStatus })
    .eq('id', tripId)
    .eq('user_id', user.id)

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

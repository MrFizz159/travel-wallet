'use server'

import { revalidatePath } from 'next/cache'
import { syncComplianceStatus } from '../_utils'
import { requireUser } from './_shared'

const AUTH_REQ_TYPES = ['visa', 'eta', 'transit_eta', 'residence_permit', 'right_to_work']

export async function uploadEvidence(formData: FormData) {
  const { supabase, user } = await requireUser()

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
  const { supabase, user } = await requireUser()

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

export async function uploadTravelEssential(formData: FormData) {
  const { supabase, user } = await requireUser()

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

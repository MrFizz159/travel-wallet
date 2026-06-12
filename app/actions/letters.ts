'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { todayStr } from '@/lib/dates'
import { generateLetterContent, type LetterType } from '@/lib/letters/generate'

// Full en-GB date (day month year) for letters. formatDate in lib/dates omits
// the year, so build it here, parsing UTC-safe per the lib/dates convention.
function formatFullDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export async function generateLetter(
  formData: FormData
): Promise<{ documentId: string; source: 'ai' | 'stub' }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const subTaskId = formData.get('subTaskId') as string
  const requirementId = formData.get('requirementId') as string
  const tripId = formData.get('tripId') as string

  const { data: subTask } = await supabase
    .from('sub_tasks')
    .select('id, name')
    .eq('id', subTaskId)
    .single()

  const { data: requirement } = await supabase
    .from('requirements')
    .select('id, name, why_it_applies, leg_id, trip_id')
    .eq('id', requirementId)
    .single()

  if (!subTask || !requirement) throw new Error('Sub-task or requirement not found')

  // The requirement's leg, falling back to the trip's first leg by sort_order.
  type LegRow = { destination_country: string; start_date: string; end_date: string; purpose: string }
  let leg: LegRow | null = null
  if (requirement.leg_id) {
    const { data } = await supabase
      .from('trip_legs')
      .select('destination_country, start_date, end_date, purpose')
      .eq('id', requirement.leg_id)
      .single()
    leg = data
  }
  if (!leg) {
    const { data } = await supabase
      .from('trip_legs')
      .select('destination_country, start_date, end_date, purpose')
      .eq('trip_id', tripId)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()
    leg = data
  }
  if (!leg) throw new Error('No trip leg found for this letter')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, job_title, employer, nationality')
    .eq('id', user.id)
    .single()

  // Primary passport nationality as fallback when the profile lacks one.
  let nationality = profile?.nationality ?? null
  if (!nationality) {
    const { data: passport } = await supabase
      .from('passports')
      .select('nationality')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .limit(1)
      .maybeSingle()
    nationality = passport?.nationality ?? null
  }

  const letterType: LetterType = subTask.name.toLowerCase().includes('invitation')
    ? 'invitation'
    : 'support'

  const { content, source } = await generateLetterContent({
    letterType,
    today: formatFullDate(todayStr()),
    traveller: {
      fullName: profile?.full_name ?? null,
      jobTitle: profile?.job_title ?? null,
      employer: profile?.employer ?? null,
      nationality,
    },
    leg: {
      destinationCountry: leg.destination_country,
      startDate: formatFullDate(leg.start_date),
      endDate: formatFullDate(leg.end_date),
      purpose: leg.purpose,
    },
    requirement: {
      name: requirement.name,
      whyItApplies: requirement.why_it_applies,
    },
  })

  await supabase
    .from('sub_tasks')
    .update({ ai_generated_content: content, approval_status: 'draft' })
    .eq('id', subTaskId)

  // Preserved from the previous implementation: generating moves the
  // requirement into progress.
  await supabase
    .from('requirements')
    .update({ status: 'in_progress' })
    .eq('id', requirementId)

  const path = `${user.id}/${tripId}/${requirementId}/letters/draft-${Date.now()}.txt`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, new Blob([content], { type: 'text/plain' }), { contentType: 'text/plain' })

  if (uploadError) throw new Error(uploadError.message)

  // Re-generating replaces the existing draft row rather than accumulating one
  // per click.
  const draftName = `${subTask.name} (draft)`
  const { data: existing } = await supabase
    .from('documents')
    .select('id')
    .eq('requirement_id', requirementId)
    .eq('type', 'letter_draft')
    .eq('name', draftName)
    .maybeSingle()

  let documentId: string
  if (existing) {
    await supabase
      .from('documents')
      .update({ file_url: path, upload_date: new Date().toISOString(), file_size: content.length })
      .eq('id', existing.id)
    documentId = existing.id
  } else {
    const { data: doc, error: insertError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        name: draftName,
        type: 'letter_draft',
        layer: 'compliance',
        trip_id: tripId,
        requirement_id: requirementId,
        file_url: path,
        mime_type: 'text/plain',
        file_size: content.length,
      })
      .select()
      .single()

    if (insertError || !doc) throw new Error(insertError?.message ?? 'Failed to record letter draft')
    documentId = doc.id
  }

  revalidatePath(`/trips/${tripId}`)
  return { documentId, source }
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

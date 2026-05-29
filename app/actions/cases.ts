'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { syncComplianceStatus } from './_utils'

function generateCaseReference(): string {
  const year = new Date().getFullYear()
  const suffix = Math.floor(100 + Math.random() * 900)
  return `#CG-${year}-${suffix}`
}

export async function initiateCase(formData: FormData): Promise<{ caseId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const subTaskId = formData.get('subTaskId') as string
  const requirementId = formData.get('requirementId') as string
  const tripId = formData.get('tripId') as string
  const visaType = formData.get('visaType') as string
  const destinationCountry = formData.get('destinationCountry') as string

  const { data: newCase, error: caseError } = await supabase
    .from('cases')
    .insert({
      user_id: user.id,
      trip_id: tripId,
      requirement_id: requirementId,
      sub_task_id: subTaskId,
      case_reference: generateCaseReference(),
      visa_type: visaType,
      destination_country: destinationCountry,
      status: 'Case Initiated',
      progress: 5,
    })
    .select()
    .single()

  if (caseError || !newCase) throw new Error(caseError?.message ?? 'Failed to create case')

  await Promise.all([
    supabase
      .from('sub_tasks')
      .update({ service_mode: 'managed', status: 'case_in_progress', case_id: newCase.id })
      .eq('id', subTaskId),
    supabase
      .from('requirements')
      .update({ status: 'in_progress', has_active_case: true })
      .eq('id', requirementId),
  ])

  await syncComplianceStatus(supabase, tripId, user.id)

  revalidatePath(`/trips/${tripId}`)

  return { caseId: newCase.id }
}

'use server'

import { revalidatePath } from 'next/cache'
import { syncComplianceStatus } from '../_utils'
import { requireUser } from './_shared'

export async function sendManagerApproval(formData: FormData) {
  const { supabase, user } = await requireUser()

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
  const { supabase, user } = await requireUser()

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

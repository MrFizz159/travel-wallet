'use server'

import { createClient } from '@/lib/supabase/server'
import { COUNTRIES } from '@/lib/countries'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createTravelHistoryEntry(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const origin_country_code = formData.get('origin_country_code') as string
  const destination_country_code = formData.get('destination_country_code') as string
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string
  const purpose = formData.get('purpose') as string

  const origin = COUNTRIES.find(c => c.code === origin_country_code)
  const destination = COUNTRIES.find(c => c.code === destination_country_code)

  if (!origin || !destination) throw new Error('Invalid country selection')

  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      user_id: user.id,
      origin_country: origin.name,
      origin_country_code,
      destination_country: destination.name,
      destination_country_code,
      start_date,
      end_date,
      purpose,
      is_historical: true,
      state: 'completed',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/wallet/history')
  redirect(`/trips/${trip.id}`)
}

const AUTH_DOC_TYPES = ['visa', 'eta', 'residence_permit', 'right_to_work']

export async function uploadHistoricalDocument(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const file = formData.get('file') as File
  const tripId = formData.get('tripId') as string
  const documentType = formData.get('documentType') as string
  const issueDate = (formData.get('issue_date') as string) || null
  const expiryDate = (formData.get('expiry_date') as string) || null
  const authName = (formData.get('auth_name') as string) || null
  const countryCode = formData.get('country_code') as string

  if (!file || file.size === 0) throw new Error('No file provided')

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${user.id}/${tripId}/history/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, file, { contentType: file.type })

  if (uploadError) throw new Error(uploadError.message)

  const isAuthType = AUTH_DOC_TYPES.includes(documentType)

  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      name: file.name,
      type: documentType,
      layer: isAuthType ? 'compliance' : 'travel_essentials',
      trip_id: tripId,
      requirement_id: null,
      file_url: path,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single()

  if (docError) throw new Error(docError.message)

  if (isAuthType && issueDate && expiryDate && authName && doc) {
    const country = COUNTRIES.find(c => c.code === countryCode)
    await supabase.from('authorizations').insert({
      user_id: user.id,
      name: authName,
      country: country?.name ?? countryCode,
      country_code: countryCode,
      issue_date: issueDate,
      expiry_date: expiryDate,
      document_id: doc.id,
    })
    revalidatePath('/wallet')
  }

  revalidatePath(`/trips/${tripId}`)
}

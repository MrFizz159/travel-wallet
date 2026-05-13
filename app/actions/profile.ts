'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  await supabase.from('profiles').upsert({
    id: user.id,
    full_name: (formData.get('full_name') as string | null)?.trim() || null,
    nationality: (formData.get('nationality') as string | null)?.trim() || null,
    country_of_residence: (formData.get('country_of_residence') as string | null)?.trim() || null,
    updated_at: new Date().toISOString(),
  })

  revalidatePath('/profile')
  revalidatePath('/')
  redirect('/profile')
}

export async function updateProfileWizard(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  await supabase.from('profiles').upsert({
    id: user.id,
    full_name: (formData.get('full_name') as string | null)?.trim() || null,
    nationality: (formData.get('nationality') as string | null)?.trim() || null,
    country_of_residence: (formData.get('country_of_residence') as string | null)?.trim() || null,
    updated_at: new Date().toISOString(),
  })

  revalidatePath('/profile')
  revalidatePath('/')
  redirect('/profile/setup/passport')
}

async function insertPassportRecord(formData: FormData, userId: string) {
  const supabase = await createClient()

  const passport_number = (formData.get('passport_number') as string).trim()
  const issuing_country = (formData.get('issuing_country') as string).trim()
  const nationality = (formData.get('nationality') as string).trim()
  const issue_date = formData.get('issue_date') as string
  const expiry_date = formData.get('expiry_date') as string

  const { data: existing } = await supabase
    .from('passports')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  const is_primary = !existing || existing.length === 0

  const { data: passport, error } = await supabase
    .from('passports')
    .insert({ user_id: userId, passport_number, issuing_country, nationality, issue_date, expiry_date, is_primary })
    .select()
    .single()

  if (error || !passport) throw new Error(error?.message ?? 'Failed to save passport')

  const file = formData.get('document_file') as File
  if (file && file.size > 0) {
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${userId}/profile/passport-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, file, { contentType: file.type })
    if (!uploadError) {
      await supabase.from('passports').update({ document_url: path }).eq('id', passport.id)
    }
  }

  revalidatePath('/profile')
}

export async function createPassport(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')
  await insertPassportRecord(formData, user.id)
  redirect('/profile')
}

export async function createPassportWizard(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')
  await insertPassportRecord(formData, user.id)
  redirect('/')
}

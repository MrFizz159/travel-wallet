'use server'

import { createClient } from '@/lib/supabase/server'
import { COUNTRIES } from '@/lib/countries'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createAuthorization(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const name = (formData.get('name') as string).trim()
  const country_code = (formData.get('country_code') as string).trim()
  const issue_date = formData.get('issue_date') as string
  const expiry_date = formData.get('expiry_date') as string
  const passport_id = (formData.get('passport_id') as string) || null

  const country = COUNTRIES.find(c => c.code === country_code)?.name ?? country_code

  await supabase.from('authorizations').insert({
    user_id: user.id,
    name,
    country,
    country_code,
    issue_date,
    expiry_date,
    passport_id: passport_id || null,
  })

  revalidatePath('/wallet')
  redirect('/wallet')
}

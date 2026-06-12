'use server'

import { createClient } from '@/lib/supabase/server'
import { runAssessment, type AssessmentOutput } from '@/lib/assessment/stub'

// Pre-save assessment — called from the intake review step before any trip is
// created. Returns the full stub output (result + requirements) so the review
// step can render the process preview without writing to DB.
//
// This is the seam where the real assessment engine will plug in: replace the
// runAssessment call with the engine, keeping the AssessmentOutput shape.
export async function previewAssessment(countryCode: string): Promise<AssessmentOutput> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { result: 'review_required', requirements: [] }

  return runAssessment(countryCode)
}

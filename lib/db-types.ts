import type { Trip, TripLeg, TransitStop, Requirement, SubTask, Document, TravelCase } from './types'

export interface RequirementRow extends Requirement {
  sub_tasks: SubTask[]
  documents: Document[]
}

export interface LegDetail extends TripLeg {
  requirements: RequirementRow[]
}

export type TransitWithRequirement = TransitStop & {
  requirement: RequirementRow | null
}

export interface TripDetail extends Trip {
  legs: LegDetail[]
  transits: TransitWithRequirement[]
  tripRequirements: RequirementRow[]  // manager_approval only; leg_id = null, transit_id = null
  documents: Document[]
  cases: TravelCase[]
}

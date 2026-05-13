import type { Trip, Requirement, SubTask, Document, TravelCase } from './types'

export interface RequirementRow extends Requirement {
  sub_tasks: SubTask[]
  documents: Document[]
}

export interface TripDetail extends Trip {
  requirements: RequirementRow[]
  documents: Document[]
  cases: TravelCase[]
}

# Trip Model v2: Multi-Country + Transit

## Where we started

Originally a trip was a single flat object: one destination country, one date range, one purpose, one passport. The assessment engine ran once and produced one set of requirements. Compliance status lived directly on the trip row.

This worked for the simplest case — a traveller flying direct to one country and back — but broke immediately for anything more realistic: a multi-city itinerary, a layover requiring an ESTA, or a two-country business trip.

---

## What a trip is now

A trip is a container. It has no destination of its own. All destination and compliance data lives in child objects — legs and transit stops — and the trip row aggregates their combined status.

```
Trip (container)
  └── TransitStop?  [outbound transit]
  └── TripLeg       [first destination]
  └── TransitStop?  [transit between]
  └── TripLeg       [second destination]
  └── TransitStop?  [return transit]
```

Transit slots are structurally optional at every position. A direct single-destination trip is just one leg with no transits — the model is backwards-compatible with the original shape.

---

## Data model

### Trip (the container)

```
trips
  id, user_id
  origin_country, origin_country_code   -- home base; used for travel history only
  state                                  -- exploratory | active | completed | cancelled
  compliance_status                      -- rolled up from legs + transits + manager approval
  is_historical
  activated_at
```

Destination columns (`destination_country`, `start_date`, `end_date`, `purpose`, `passport_id`, `assessment_result`) were dropped in migration 009 and moved to `trip_legs`.

### TripLeg

```
trip_legs
  id, trip_id
  destination_country, destination_country_code
  start_date, end_date, duration_days
  purpose                    -- business | tourism | education | relocation | other
  passport_id                -- which passport for this leg
  assessment_result          -- action_required | no_action_required | review_required
  compliance_status          -- compliant | incomplete | at_risk | not_started
  sort_order                 -- chronological position within the trip
```

Each leg has its own compliance status computed from its linked requirements. Legs are independent — different countries, different dates, different passports if needed.

### TransitStop

```
trip_transits
  id, trip_id
  transit_country, transit_country_code
  transit_date               -- optional; the date of the layover
  sort_order                 -- positions it in the timeline (0 = before leg 0, 1 = between leg 0 and leg 1, etc.)
  visa_required              -- boolean | null (null = not yet checked)
  authorisation_name         -- specific name e.g. "eTA", "ESTA", "Transit visa"
  transit_note               -- reason text from the AI check
  checked_at                 -- timestamp when the check ran
  user_confirmed             -- user has acknowledged the requirement
  time_required_days         -- processing time; persisted at check time for later use
```

Transit stops are lighter than legs. They carry just enough data to know: does this traveller need an authorisation, what is it called, and how long does it take?

### Requirements

```
requirements
  trip_id
  leg_id        -- FK to trip_legs; null for trip-level requirements (manager approval)
  transit_id    -- FK to trip_transits; null unless this is a transit-sourced requirement
```

A requirement belongs to exactly one of:
- A leg (`leg_id` set, `transit_id` null) — the standard case
- A transit (`transit_id` set, `leg_id` null) — only created if `visa_required = true`
- The trip (`leg_id` null, `transit_id` null) — only `manager_approval`

---

## Intake flow

The intake is a two-step form: **Itinerary → Review**.

**Step 1 — Itinerary**

The user builds their itinerary as a sequence. The default state is one empty leg. They can:
- Fill in a leg: country, arrival date, departure date, purpose, passport
- Add another destination (appends a new leg)
- Add a transit stop at any slot in the sequence — before the first leg, between any two legs, or after the last leg

Each transit slot renders as a lightweight "Add transit stop" prompt between legs. Expanding it shows two inputs: transit country and (optional) transit date.

**Step 2 — Review**

On Continue:
1. Leg assessments run synchronously (stub lookup by country code)
2. Transit checks run asynchronously in parallel via server action, each calling `runTransitCheck`
3. The form advances to the Review step immediately; transit cards show a loading state while checks are in flight

The review step renders the full itinerary chronologically: transit result → leg assessment → transit result → leg assessment, etc.

At the bottom, two CTAs:
- **Get Started** — creates the trip in `active` state and writes all legs, transits, and requirements to the database
- **Save Trip** — creates in `exploratory` state; assessment results stored but requirements not yet persisted

Historical trips (all leg dates in the past) show a single **Save trip** CTA with no assessment shown.

---

## Assessment: how it works

### Per leg

Leg assessment is unchanged from the original model. `runAssessment(countryCode)` does a stub lookup and returns `action_required | no_action_required | review_required` plus a list of requirements. This is purely synchronous.

The assessment runs at intake time (on Continue) and is re-run at activation if the trip was saved in exploratory state.

### Per transit

Transit assessment is a separate, AI-powered check. It runs at intake time via `runTransitCheck(transitCountryCode, nationality)`.

The function:
1. If no `ANTHROPIC_API_KEY` is set, returns from a hardcoded stub table keyed by country code (covers common PoC routes)
2. If the key is present, calls `claude-haiku-4-5` with a single structured prompt asking whether the traveller's nationality requires any transit authorisation in that country
3. Returns `TransitCheckResult`: `visa_required`, `authorisation_name`, `reason`, `confidence`, `time_required_days`

Transit assessment is deliberately narrower than leg assessment. It answers one question: does this nationality need any authorisation to transit this country? It does not produce a full requirement set or run the Layer 1/Layer 2 compliance framework.

---

## Transit requirements: how they're treated

A transit requirement is only created if `visa_required === true`. When created at activation:
- `transit_id` is set, `leg_id` is null
- Type is `transit_eta` or `visa` depending on the `authorisation_name`
- `latest_start_date` is computed from `transit_date - time_required_days`
- Sub-tasks are assigned from `TRANSIT_SUB_TASKS`: either the `default_eta` template (passport validity, apply online, upload confirmation) or `default_visa` (longer flow with await-approval step)
- Guidance and `external_link` come from `TRANSIT_GUIDANCE` keyed by country code

Transit requirements participate in the full requirement lifecycle (status tracking, drawers, sub-task completion) in the same way as leg requirements. In the trip detail view they render as a `TransitRequirementSection` — visually lighter than a leg section, but the underlying data model is the same.

If `visa_required === false`, the transit stop is stored but no requirement row is created. It renders in the UI as an informational "No authorisation required" row.

---

## Compliance sign-off

### Per leg

`computeLegComplianceStatus(requirements)` — all mandatory requirements for that leg must be `complete` (or `in_progress` via active case) before the leg is compliant.

### Per transit

`transitComplianceStatus(transit)` — lighter check:
- Not yet checked → `incomplete`
- `visa_required === false` → `compliant` (no action needed)
- `visa_required === true` and `user_confirmed` → `compliant`
- Otherwise → `incomplete`

Transit compliance is separate from requirement compliance. A transit stop with a requirement becomes compliant when the underlying requirement is completed. The `user_confirmed` flag is a fallback path (user acknowledges rather than uploads evidence).

### Trip-level

```
computeTripComplianceStatus(legStatuses, transitStatuses, managerApprovalReqs)
```

All three must resolve to `compliant` for the trip to be compliant:

```
all leg statuses compliant
AND all transit statuses compliant
AND manager approval requirement complete (if present)
= trip compliant
```

Any `at_risk` in any component surfaces as `at_risk` at trip level. Any `incomplete` or `not_started` surfaces as `incomplete`.

---

## Trip naming

Auto-generated from destination legs only: `"Singapore + Mumbai"`. Transit countries are excluded from the name — they're stops, not destinations. Beyond 3 legs, behaviour is unresolved (truncation or user-defined title is an open question).

---

## What else changed

**Requirements table** — `leg_id` and `transit_id` columns added. `leg_id` is how requirements are scoped to a specific leg rather than the whole trip. Manager approval requirements have both as null.

**Trip detail view** — renders chronologically. Leg sections and transit sections interleave in `sort_order` sequence. Transits with no requirement show an informational row; transits with a requirement show a full `RequirementDrawer`-accessible section.

**Trip card** — shows multiple destination flags and a composite date range (first leg start to last leg end).

**Travel history** — logs one entry per leg at trip completion, not one per trip.

**Manager approval** — sits at trip level, not leg level. One approval covers all legs and transits.

# Explore: Multi-Leg Trip Model

## What was explored
How to support multi-country trips and transit visa requirements without rebuilding the assessment engine.

## Key decisions

**Core model:** The trip becomes the container for multi-country travel. The assessment engine stays atomic (single country, single requirement). It runs once per leg and once per transit stop — N times total.

**Timeline model:** `[Transit] → Leg → [Transit] → Leg → [Transit]`
- Transit slots are always present structurally; empty if flying direct.
- Legs are full destination assessments (existing stub/engine approach).
- Transits are lightweight objects: country + date only.

**Transit assessment:** A separate lightweight check — nationality (from profile) + transit country → does this traveller need a transit visa? Returns a simple yes/no result with action item if needed. Not a full assessment. Built as a small AI-powered check rather than a stub.

**Manager approval:** Sits at trip level, not leg level. One approval covers the whole trip.

**Overall compliance formula:** All legs compliant AND all transits compliant AND manager approval = trip compliant.

**Trip naming:** Auto-generated from destination legs only (e.g. "Singapore + Mumbai"). Transits not included in the name.

**PoC scope:** Build the full multi-leg flow. Existing single-destination stubs still serve full leg assessments. Add the itinerary intake flow (add legs, add transit stops). Build the transit assessment check as functional (not stubbed). Make the trip detail UI show multiple legs and transits chronologically so the interaction can be experienced and tested.

## Underlying principles
- Keep assessment atomic and scalable — complexity lives at the trip container level, not inside the engine.
- Transit is a structurally different object from a leg (narrower scope, one-and-done), even though it lives in the same timeline.
- The "bolt-on" feel of transits in the UI reflects their lighter weight, not their data model position (they're independent stops, not sub-objects of legs).
- Chronological/itinerary presentation within a trip view.

## Open questions (deliberately unresolved)
- Exact UX for the itinerary intake form — how adding legs and transits flows step-by-step (needs design work).
- What happens to the trip name beyond 3 legs (truncation, abbreviation, or user-defined title).
- Whether transit compliance blocks trip progression explicitly in the UI or just rolls up into the overall status.

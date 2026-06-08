# Explore: Assessment Result CTAs

## What was explored
Replacing the single "Add this trip" CTA on the assessment result screen with two distinct CTAs that map to the two different user intents at that moment.

## Direction chosen
**Assessment result screen — two CTAs:**
- "Get Started" (primary) — creates an active trip directly, skips exploratory state, lands on trip detail
- "Save Trip" (secondary) — creates an exploratory trip, user comes back to commit later

**Exploratory trip screen:**
- Rename "Activate trip" to "Get Started" — same action, consistent language across both entry points

## Underlying principles
- "Get Started" means one thing everywhere: I am committing to this trip
- "Save Trip" is a real, distinct use case: comparing destinations, checking flights before deciding
- The state machine is unchanged — this is a UX shortcut and naming fix, not a model change
- Exploratory earns its place because the save-then-return intent is genuine, not just inaction

## Open questions
None — fully resolved.

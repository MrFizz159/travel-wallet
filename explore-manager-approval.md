# Explore: Manager Approval Requirement

## What was explored
Adding a manager approval step as a requirement on every trip — modelled as a company-level compliance gate equal in weight to a visa requirement.

## Key decisions

- **Layer 1 requirement:** Approval blocks trip readiness like any other compliance requirement. Absence of approval = trip not ready to travel.
- **PoC scope:** All trips require approval by default. In production, configurable at client level (all trips, by country, by risk level).
- **States:** `unsent` → `pending` → `approved`. `not_approved` exists in the model (manager can reject and later reverse). Only the approver can change state — the trip owner cannot.
- **Simulated approval for PoC:** Stubbed manager list (placeholder names). Send for approval → 3s delay → auto-approved. No real manager login.
- **Audit log:** All state transitions logged with timestamp and actor. Reversals also logged (e.g. not_approved → approved).
- **Trip view card:** State-based CTA — "Send for approval" (unsent), "Pending approval" (pending), ticked (approved).
- **Drawer content:** Unsent = manager dropdown + send button. Pending = waiting message. Approved = audit log showing who approved and when. Not_approved = log entry.

## Underlying principles
- Approval is a company-compliance gate, not a government-immigration requirement, but treated with equal weight in the trip readiness model.
- The approver owns the state; the traveller owns the request.
- The feature is designed to extend: future approval types (financial sign-off, legal review) follow the same pattern.

## Open questions (deliberately unresolved for PoC)
- Manager-side flow: how does a manager see and act on pending requests? (needs a manager view / notification system — not built in PoC)
- State change by manager: how does a manager change an existing approved/rejected state? (UI for that flow not designed)
- Client configuration UI: how does an admin configure which trips require approval? (not built in PoC)
- Notification mechanism: email, in-app, or both when a request is sent?

# Code & Architecture Review — Travel Wallet

**Date:** 2026-06-12. Code-only review of the Travel Wallet PoC (Next.js 16 App Router, React 19, TypeScript, Supabase, Tailwind v4). Scope: server actions, data layer, migrations, auth, compliance computation, and the quality of the deliberate PoC seams (stubbed assessment engine, Haiku transit checks). The PRD was used for intent; the code is treated as current. Stubs are assessed on how cleanly a real engine could replace them, and they're labelled as stubs where relevant rather than defects.

---

## What's working well

- **Centralised compliance computation.** All status rules live in `lib/compliance.ts` and every status write funnels through `syncComplianceStatus` (`app/actions/_utils.ts:9`). The Layer 1 / Layer 2 split from the PRD is respected: documents with `layer: 'travel_essentials'` never touch compliance.
- **RLS coverage is complete.** Every table (profiles, passports, trips, requirements, sub_tasks, documents, cases, authorizations, trip_legs, trip_transits) has RLS enabled with owner policies, and the storage bucket has per-user folder policies (`supabase/migrations/002_storage_policies.sql:4-23`). Postgres applies `USING` as the write check when `WITH CHECK` is omitted, so inserts are covered too.
- **Sound schema normalisation.** The multi-leg migration (`supabase/migrations/009_multi_leg_trips.sql`) elevates trips to containers, moves destination data to `trip_legs`, includes a real data migration for existing rows, and uses CHECK constraints and cascades sensibly. Migration 011's `transit_id` FK with cascade is a clean way to promote transits to requirements.
- **Strong domain typing.** `lib/types.ts` and `lib/db-types.ts` give the UI well-shaped union types (`TripState`, `ComplianceStatus`, `SubTaskType`) rather than strings everywhere.
- **The transit stub seam is good.** `lib/assessment/transit.ts` is server-only, returns one typed `TransitCheckResult`, validates the LLM's JSON field by field (`transit.ts:150-157`), and degrades to hardcoded stubs then a conservative fallback. A real engine can replace `runTransitCheck` without touching callers.
- **Client forms handle action errors.** `add-trip-form.tsx` and `requirement-drawer.tsx` wrap action calls in try/catch and surface messages instead of white-screening.

---

## Critical

### 1. Multi-step trip creation has no transactional integrity
**What:** `createAndActivateTrip` performs 6+ sequential writes (trip, legs, requirements, sub_tasks, manager approval, transits) with no transaction and several unchecked errors. `createTrip` ignores the result of the legs insert entirely, so a failed legs insert leaves an orphaned trip container with zero legs.
**Where:** `app/actions/trips.ts:218-231` (unchecked legs insert), `app/actions/trips.ts:262-359` (activation chain), `app/actions/history.ts:40-49` (same pattern).
**Why it matters:** Any mid-chain failure (constraint violation, network blip) persists a half-built trip. The trips list then renders cards with empty titles and dates (`app/trips/page.tsx:36-50` returns `undefined` for missing legs), and there's no cleanup path because trips can't be deleted.
**Suggested solution:** Move trip creation/activation into a Postgres function called via `supabase.rpc()` so it's atomic, or at minimum check every insert's `error` and delete the trip container on failure (cascade cleans the rest).

### 2. Transit check race leaves active trips permanently incomplete
**What:** `handleContinue` flips to the review step before awaiting transit checks (`add-trip-form.tsx:173-185`), and the Get Started / Save Trip buttons only gate on `isStarting || isSaving` (`add-trip-form.tsx:704,723`). A user can activate while checks are in flight, persisting transits with `checked_at: null`. After activation there's no recovery: `checkTransit` and `confirmTransitVisa` (`app/actions/trips.ts:465,516`) are exported but have zero call sites in the UI, and `insertTransitRequirements` only runs at activation (`trips.ts:349,421`).
**Where:** `app/trips/new/add-trip-form.tsx:151-190`, `app/actions/trips.ts:465-532`, `app/actions/_utils.ts:37-45`.
**Why it matters:** An unchecked transit falls to the legacy boolean path (`lib/compliance.ts:39-44`), which returns `incomplete` forever when `checked_at` is null. The trip can never reach compliant and the detail view shows "Transit visa check pending" (`components/trip-detail-view.tsx:85`) with no action to resolve it. There are also two divergent transit compliance models living side by side: requirement-backed (evidence needed) and boolean self-confirmation (no evidence).
**Suggested solution:** Disable both CTAs while `isCheckingTransits` is true, and have `checkTransit` call `insertTransitRequirements` when a post-activation check returns `visa_required: true`. Then delete the legacy boolean path so one model remains.

### 3. Timezone off-by-one in the date helpers
**What:** `subtractDays`/`addDays` parse the input as local midnight (`new Date(dateStr + 'T00:00:00')`) then serialise via `toISOString()`, which converts to UTC. On any server east of UTC (including UK BST, UTC+1) local midnight is the previous day in UTC, so every computed date comes back one day early.
**Where:** `lib/compliance.ts:3-13`. Consumed at `app/actions/trips.ts:71` (`latest_start_date`), `trips.ts:92` (passport min-expiry), `trips.ts:146,175`.
**Why it matters:** `latest_start_date` drives `at_risk` escalation (`lib/compliance.ts:19-24`), so requirements flag at risk a day early, and the 180-day passport validity check shifts by a day. `todayStr()` uses the UTC date while the helpers use local parsing, so the two halves of the comparison disagree. This reproduces in local UK development from late March to late October.
**Suggested solution:** Do pure string-date arithmetic in one shared module (e.g. `Date.UTC(y, m, d)` construction, or a tiny `lib/dates.ts` with all helpers), and make `todayStr` use the same convention.

### 4. State mutation inside a page render
**What:** `TripsPage` auto-completes expired trips by issuing a DB `update` during the server render of a GET request.
**Where:** `app/trips/page.tsx:62-83`.
**Why it matters:** Renders should be side-effect free: Next.js may render speculatively or concurrently, and the write bypasses `syncComplianceStatus`, so a completed trip keeps whatever `compliance_status` it last had. The logic also only runs when the user happens to visit `/trips`, so the home page and trip detail can disagree about whether a trip is active.
**Suggested solution:** Move completion into a server action triggered explicitly, or compute "effectively completed" at read time (`lastLegEnd < today`) and display that, persisting the state change in a scheduled job or on a mutation path.

---

## Should-fix

### 5. `app/actions/trips.ts` is a 860-line monolith
**What:** One file holds 14 exported actions plus the requirement-insertion helpers: creation, activation, transit checks, evidence upload, letters, manager approval, and essentials upload.
**Where:** `app/actions/trips.ts:1-861`.
**Why it matters:** Every feature touches the same file, the auth-check/parse/mutate/sync boilerplate repeats 14 times, and merge conflicts are guaranteed once more than one person works on it.
**Suggested solution:** Split by lifecycle: `app/actions/trips/create.ts`, `activate.ts` (with the two insert helpers), `transits.ts`, `evidence.ts`, `approvals.ts`, plus a shared `withUser()` wrapper that handles auth and FormData extraction.

### 6. The assessment stub seam leaks into the client
**What:** `runAssessment` is imported by two client components, and the server trusts a client-computed `assessment_result` when persisting legs. The exploratory trip detail re-runs the assessment on every render instead of reading persisted data.
**Where:** `app/trips/new/add-trip-form.tsx:7,162-167`, `components/trip-detail-view.tsx:8,428`, `app/actions/trips.ts:228` (client-supplied `assessment_result` stored).
**Why it matters:** This is the seam the PoC is meant to keep clean. A real assessment engine will be async, server-side, and credentialed; today's synchronous client calls mean replacing the stub forces a UI refactor, and persisted `assessment_result` is whatever the browser sent. (The requirements themselves are server-derived in `insertLegRequirements`, which is right.)
**Suggested solution:** Wrap assessment in a server action like `previewTransitCheck` already does for transits, have the form call it, and derive `assessment_result` server-side at insert time. Persist exploratory assessment output instead of recomputing in the view.

### 7. No input validation layer on server actions
**What:** Every action casts FormData with `as string` and `JSON.parse`s the legs/transits payloads with no schema, no try/catch, and no checks on country codes, dates, purposes, or file type/size.
**Where:** `app/actions/trips.ts:201-204,259-260` (raw `JSON.parse`), `trips.ts:565-576` (file upload: any MIME, any size, extension taken from `file.name`), similar across `wallet.ts`, `profile.ts`. `history.ts:19-22` is the one action that validates country codes.
**Why it matters:** Malformed payloads produce opaque 500s; out-of-vocabulary country codes flow into requirements and the LLM prompt; unbounded uploads land in storage. DB CHECK constraints catch purpose and date ordering, but only after partial writes (see finding 1). Injection risk is low (parameterised queries, storage paths prefixed by `user.id`), so this is integrity rather than security.
**Suggested solution:** Add zod schemas per action payload in `lib/validation/`, parse at the top of each action, and validate uploads (allowlist MIME types, cap size, derive extension from MIME).

### 8. Ownership checks rest entirely on RLS
**What:** Most mutations target rows by bare id with no `user_id` scoping or trip-ownership lookup: `checkTransit`, `confirmTransitVisa`, `uploadEvidence`, `markApplicationSubmitted`, `generateLetter`, `uploadSignedLetter`, `sendManagerApproval`, `resolveManagerApproval`, `initiateCase`.
**Where:** e.g. `app/actions/trips.ts:524-527` (update by `transitId` only), `trips.ts:685-693`, `trips.ts:812-820`; contrast with `activateTrip` (`trips.ts:369-375`) and `cancelTrip`, which verify ownership. RLS policies do cover every table, so cross-tenant writes silently no-op today.
**Why it matters:** Single point of failure: one permissive policy edit or a future service-role code path turns silent no-ops into cross-tenant writes. Failed RLS updates also don't error, so a tampered id gives the user a success response for a write that never happened.
**Suggested solution:** Standardise on a `requireTripOwnership(supabase, tripId, userId)` helper called at the top of every mutation, and check `error`/row counts on updates.

### 9. Trip detail page fetches requirements three times
**What:** The detail query nests `requirements(*, sub_tasks(*), documents(*))` under `trip_legs`, under `trip_transits`, and again at trip level, where the trip-level branch returns every requirement on the trip (the manager-approval filter happens in JS afterwards).
**Where:** `app/trips/[id]/page.tsx:16-46`, filter at line 62.
**Why it matters:** Each requirement with its sub-tasks and documents crosses the wire up to three times per page load. On a mobile-first product that's wasted payload, and it invites subtle bugs where the three copies of the same row diverge after a partial update.
**Suggested solution:** Drop the nested requirements from the trip-level select and fetch them once with `leg_id`/`transit_id` columns, grouping in JS; or constrain the trip-level branch server-side with a `.eq('requirements.type', 'manager_approval')` filter.

### 10. `durationDays` is implemented four times
**What:** The same day-count function exists as `daysBetween` in the actions file and `durationDays` in three components.
**Where:** `app/actions/trips.ts:34-38`, `components/trip-detail-view.tsx:38-40`, `app/trips/new/add-trip-form.tsx:59-61`, `app/wallet/history/page.tsx:8`.
**Why it matters:** Trip duration feeds threshold and travel-history maths in the PRD. Four copies will drift, and they all carry the same local-time parsing as finding 3.
**Suggested solution:** One `lib/dates.ts` exporting `durationDays`, `subtractDays`, `addDays`, `todayStr`, `formatDate`; delete the copies.

### 11. Requirement-to-sub-task linking matches by name
**What:** After bulk-inserting requirements, sub-task payloads find their parent via `insertedReqs.find(r => r.name === stubReq.name)`. The comment at `trips.ts:40-41` admits legs must be processed sequentially to avoid name collisions.
**Where:** `app/actions/trips.ts:93-94`.
**Why it matters:** Two requirements with the same name in one leg would attach all sub-tasks to the first. It also forces the sequential per-leg loop (`trips.ts:296-306`), making activation latency linear in leg count. A real assessment engine returning richer requirement sets will hit this.
**Suggested solution:** Insert requirements one at a time capturing ids (as `insertTransitRequirements` already does at `trips.ts:152-170`), or carry a client-side correlation key through the insert.

### 12. No error boundaries; plain form actions throw to a blank error page
**What:** There's no `error.tsx`, `global-error.tsx`, `loading.tsx`, or `not-found.tsx` anywhere under `app/`. Actions wired directly to `<form action={...}>` (`activateTrip` at `components/trip-detail-view.tsx:498`, `cancelTrip` at `app/trips/[id]/page.tsx:72`) throw bare `Error`s with no catch.
**Where:** `app/` (absent files), `app/actions/trips.ts:216,274,375,451`.
**Why it matters:** Any DB error during activation drops the user on Next's default error screen mid-flow, with the trip possibly half-activated (finding 1).
**Suggested solution:** Add a root `app/error.tsx` and `app/trips/[id]/error.tsx`, and return `{ error: string }` results from actions invoked by forms (or wrap them with `useActionState`).

### 13. Requirement status transitions are scattered and partially desynced
**What:** Status writes are spread across actions with differing rigour: `uploadEvidence` marks the requirement `complete` unconditionally even when other sub-tasks (signed letters) are still pending (`trips.ts:666-669`); `generateLetter` and `uploadSignedLetter` mutate sub-task/requirement state without calling `syncComplianceStatus` (`trips.ts:700-722,724-767`); `createAndActivateTrip` computes per-leg status inline (`trips.ts:304-305`) and then `syncComplianceStatus` recomputes the same thing at `trips.ts:354`.
**Where:** as cited.
**Why it matters:** Today the drift is benign because `in_progress` and `not_started` both map to `incomplete`, but the invariant ("trip status always reflects requirement rows") holds by coincidence rather than construction. The next status added to the model breaks it silently.
**Suggested solution:** Make requirement status derived: compute it from sub-task states inside `syncComplianceStatus`, call sync from every mutation, and delete the inline per-leg computation in the activation paths.

---

## Nice-to-have

### 14. Dead types and dead actions
**What:** `CountryRecord` and `Threshold` (`lib/types.ts:183-205`) have no backing tables in any migration and no query sites; the wallet Thresholds card is static UI (`app/wallet/page.tsx:121`). `checkTransit`/`confirmTransitVisa` are unreferenced (finding 2).
**Why it matters:** Dead code reads as implemented features during handover.
**Suggested solution:** Delete or mark with a `// not yet backed by schema` comment until the thresholds phase starts.

### 15. Untyped Supabase client forces `any` escapes
**What:** Two `eslint-disable @typescript-eslint/no-explicit-any` blocks shape raw query results by hand.
**Where:** `app/trips/[id]/page.tsx:52-62`, `app/trips/page.tsx:69-76`.
**Suggested solution:** Generate DB types (`supabase gen types typescript`) and create the client as `createServerClient<Database>`; the nested selects then type themselves and the casts go.

### 16. `user!.id` non-null assertions in pages
**What:** Pages assume the proxy guaranteed a session: `app/trips/page.tsx:65,86`, `app/trips/[id]/page.tsx:45`, `app/page.tsx:77-83`.
**Why it matters:** The proxy matcher (`proxy.ts:54`) excludes image extensions and could drift from page routes; an unguarded hit throws instead of redirecting.
**Suggested solution:** A shared `requireUser()` helper that redirects to `/auth` when null.

### 17. Debug logging in the transit check path
**What:** `console.log` of inputs, raw LLM output, and parsed results on every transit check.
**Where:** `lib/assessment/transit.ts:126,146,148`.
**Suggested solution:** Remove or gate behind an env flag before anyone points monitoring at the logs.

### 18. Inline component definitions inside `AddTripForm`
**What:** `TransitSlot` and `TransitResultCard` are declared inside the parent component body (`app/trips/new/add-trip-form.tsx:228,418`), so React remounts them on every parent state change; the transit country/date inputs lose focus while typing.
**Suggested solution:** Lift both to module scope and pass state via props.

### 19. Case references can collide; package name is the template default
**What:** `generateCaseReference` uses a random 3-digit suffix with no uniqueness constraint (`app/actions/cases.ts:8-12`); `package.json` still says `"my-app-name"`.
**Suggested solution:** Use the case row id (short hash) for the reference; rename the package.

### 20. `RequirementType` union is out of sync with runtime lists
**What:** `AUTH_REQ_TYPES` includes `residence_permit` and `right_to_work` (`app/actions/trips.ts:558`) which the `RequirementType` union (`lib/types.ts:102`) doesn't contain, and the DB has no CHECK constraint on `requirements.type` at all.
**Suggested solution:** Derive the runtime list from the union (`satisfies RequirementType[]`) and add the DB constraint.

---

## Production-readiness notes

Fine for a PoC, needed before production:

- **Stubs behaving as designed (not defects):** the assessment engine (`lib/assessment/stub.ts`) hardcodes UK-passport assumptions; `resolveManagerApproval` lets the traveller approve their own trip against `STUB_MANAGERS` (`lib/types.ts:10-16`); `generateLetter` writes placeholder text (`trips.ts:709`). All are flagged as PoC seams in the code or PRD.
- **LLM as compliance source:** transit answers come straight from Haiku with no caching, no audit table, and the `confidence` field is dropped before persistence (`trips.ts:500-509`). Production needs a verified rules source or at least cached, versioned, human-reviewable answers.
- **Cost and rate limiting:** `previewTransitCheck` lets any authenticated user trigger unlimited paid LLM calls (`trips.ts:536-556`).
- **Storage lifecycle:** no code path ever calls `storage.remove()`. Deleting a passport (`app/actions/profile.ts:103-114`) or authorisation (`app/actions/wallet.ts:35-46`) orphans the underlying file, and document rows linked to deleted authorisations linger.
- **Passport validity is a point-in-time check:** the automated sub-task is evaluated once at activation (`trips.ts:100-102`); replacing or expiring a passport afterwards never re-evaluates it.
- **Migrations:** 11 additive files designed for manual dashboard execution, no down migrations, no migration runner state. Adopt the Supabase CLI workflow before a second environment exists.
- **Error observability:** bare throws and console logging only; no Sentry-equivalent, no structured logs.
- **Auth callback:** `app/auth/callback/route.ts` ignores the `exchangeCodeForSession` error and always redirects to `/`; a failed exchange loops the user silently.

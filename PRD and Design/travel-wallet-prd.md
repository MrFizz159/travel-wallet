# Product Requirements Document: Travel Wallet

> Sandbox — exploratory. Not committed or scheduled for build.

---

## 1. Overview

Travel Wallet is a standalone B2C product for individual travellers. It helps them plan trips compliantly, manage their travel authorizations and documents, and build a structured travel history — all in one place.

It is not a corporate tool. There are no employers, managers, or mobility teams. The individual is their own compliance officer. The product tells them what they need, guides them to get it, stores the evidence, and keeps a record of everywhere they have been.

---

## 2. Problem Statement

International travellers face three connected problems:

**No compliance guidance.** When planning a trip, a traveller has to figure out independently what visa, authorization, or entry requirement applies to them. This involves external research, often from unreliable sources, with no personalisation to their specific nationality, purpose of travel, or existing authorizations.

**No document organisation.** Travel documents accumulate across trips — visas, arrival cards, eVisa confirmations, letters of support, invitation letters — stored across email inboxes, phone photos, and paper. There is no single place to find the right document at the right moment, whether that is at the border or during a visa application.

**No travel history.** Visa applications routinely ask for a travel history — countries visited in the last 10 years, days spent in specific countries or regions. Travellers reconstruct this manually from memory and passport stamps, a process that is slow, error-prone, and increasingly unreliable as digital entry removes the stamps entirely.

---

## 3. Target User

An individual who travels internationally — for business, tourism, relocation, or a mix — and needs to manage their own compliance without institutional support.

They are not necessarily a frequent traveller, but they travel to places that require authorizations, and they want to do it correctly. They may have a residence permit, a right to work in a second country, or a track record of multi-country travel that creates complexity.

They do not have a corporate mobility team. They are responsible for knowing what they need, getting it, and proving they have it.

---

## 4. Core Concept

**Trip is the primary object.** Everything organises around it.

Each trip has a compliance status — the user is either ready to travel or they are not. The wallet tells them which, shows them what is outstanding, guides them to resolve it, and stores the evidence when they do.

Over time, trips accumulate into a travel history. That history becomes a utility: a reference for future visa applications, a tracker of days in countries, and a complete record of every authorization the user has held.

---

## 5. Navigation Structure

Four-tab bottom navigation: **Home · Trips · Wallet · Profile.**

| Tab | Owns |
|---|---|
| Home | Dashboard. Active trip hero card and upcoming strip. Compliance alerts. |
| Trips | Full trip list — Active, Exploratory, Past. Trip creation entry point. |
| Wallet | Passports, active authorizations, document repository, travel history, thresholds. |
| Profile | Personal information (§7.1), account settings. The data that powers assessment — not a document store. |

The Wallet tab is a primary navigation surface, not a sub-section of Profile. Travel history, passports, and document access live here because they are utilities the user reaches at the border or during a visa application — not settings.

---

## 6. Key Principles

**1. The individual is the compliance officer.**
There is no employer, no manager, no case handler. The product gives the user everything they need to make decisions and take action themselves. It does not defer decisions to someone else.

**2. Sub-tasks represent work, not states.**
A checklist item is something the user (or the system) actively does. It is never a status update — "receive confirmation" is not a task. The completion gate for a primary action is always uploading the outcome. One continuous action is one task.

**3. Two layers per trip, kept strictly separate.**
Every trip has a compliance layer (what you must do to be legally permitted to travel) and a travel essentials layer (documents you want to have to hand for the journey). Compliance status is computed from Layer 1 only. Layer 2 items never affect compliance status.

**4. The trip object owns travel history.**
When a user creates a trip, that trip creates the travel history record. Uploaded documents validate or supplement the trip — they do not independently create history records. No duplication.

**5. The profile enables the product.**
Personalised compliance assessment, automated validity checks, AI-generated documents, and travel history filtering all depend on profile data. The profile is not an afterthought — it is the foundation.

**6. Progressive data collection.**
The product never hard-blocks the user for missing profile data. It prompts inline when a gap matters: "We need your passport details to run this assessment." Users can skip and return. The system surfaces what it cannot do, and why, without preventing progress.

**7. Mobile-first.**
The primary product is a mobile app. All UX decisions — navigation patterns, document display, speed — are made for mobile first. A web version is available as a secondary access point but does not drive design decisions.

**8. Access in two taps.**
At the border or in a queue, a user must be able to reach any document in two taps from the home screen. The product is not just a planning tool — it is an access layer.

---

## 7. User Data Model

The user data model is split across two tabs: **Profile** (personal information — §7.1, §7.7) and **Wallet** (documents, history, and tracking — §7.2–7.6). The data model is unified; the distinction is purely navigational.

The profile is the foundation of the assessment engine, AI document generation, and travel history. An incomplete profile limits what the product can do.

### 7.1 Personal Information

| Field | Purpose |
|---|---|
| Full name (as on passport) | Document generation, account |
| Date of birth | Compliance assessments |
| Nationality | Drives compliance assessment |
| Country of residence | Assessment context |
| Tax residency | Distinct from residence; relevant for 183-day and tax threshold assessments |
| Address | Document generation |
| Email address | Account and notifications |
| Job title | AI-generated letters |
| Employer / company | AI-generated letters |
| Work address | AI-generated letters of support |

### 7.2 Passports

Passports are held as both structured data and a document copy. Structured data powers automated validity checks. Document copies are available for uploads and border access.

**Per passport:**
- Passport number
- Issuing country
- Nationality on passport
- Issue date
- Expiry date
- Document copy (scan or photo)

Multiple passports supported. One marked as primary. The user selects which passport applies to each trip — assessment and validity check run against that passport.

### 7.3 Active Authorizations

A structured registry of visas, permits, ETAs, and rights to work or reside. This is the data the assessment engine reads — not a document folder, though document copies are linked from here.

| Field | Notes |
|---|---|
| Type | Visa / residence permit / right to work / ETA / arrival card / etc. |
| Country or region | What it covers |
| Issue date | |
| Expiry date | Powers expiry reminders |
| Entry conditions | Single / multiple / unlimited |
| Status | Active / expired |
| Document copy | Linked |

Expired authorizations are retained — they are part of travel history and may be required by future applications.

### 7.4 Document Repository

A flat, searchable index of every document in the wallet — profile-level and trip-level. Filterable by type, trip, country, and date. Exists so the user can find any document without knowing which trip it was attached to.

Profile-level documents (passport, global insurance policy, professional certifications) are available across all trips without re-uploading.

### 7.5 Travel History

A read-only record of every trip the user has taken, accumulated from trip objects. Not manually editable.

**Filters:**

| Filter | Use case |
|---|---|
| Country | All trips to a specific country |
| Region | All Schengen trips, all GCC trips, etc. |
| Date range | Last 6 months / last 2 years / last 10 years / custom |
| Purpose | Business / tourism / etc. |

**Accumulation views:**

| View | What it shows |
|---|---|
| Days per country | Total days in each country within a selected period |
| Days per region | Total days in a system-defined region (e.g. Schengen zone) |
| Countries visited | Deduplicated list of countries visited within a period |
| Consecutive days | Longest consecutive stay in a country |

Regional groupings (Schengen, EU, GCC, etc.) are system-defined. The user selects a region from a list.

**Export.** Travel history is exportable as a structured PDF or plain text list: country, entry date, exit date, duration, purpose. Filtered by date range. This is what the user submits when a visa application asks for a travel history.

### 7.6 Thresholds

User-configured rules that monitor accumulation against a target. The system evaluates these on a rolling basis.

| Field | Notes |
|---|---|
| Country or region | What the threshold applies to |
| Rule type | Minimum days / maximum days |
| Target | e.g. 183 |
| Period | Rolling 12 months / calendar year / custom |
| Status | On track / approaching / at risk / breached |
| Notification trigger | e.g. alert at 80% of maximum |

Examples: UAE residence permit minimum (183 days/year); Schengen 90/180 maximum; UK non-dom maximum (183 days/tax year).

### 7.7 Profile Setup

Standard onboarding wizard on first login. Every step is skippable — the user completes what they have and returns for the rest. When a missing field blocks a specific action, the system prompts inline at that moment. No hard blocks.

---

## 8. Trip Lifecycle

### 8.1 Trip States

| State | Meaning |
|---|---|
| Exploratory | Assessment complete. The user has not committed to this trip — they may never go. No compliance tracking. No urgency. Activate Trip is the only available action. |
| Active | User has committed. Checklist live. Compliance tracking on. Urgency and At Risk calculations apply. |
| Completed | Travel date has passed. Read-only. Retained in travel history. |
| Cancelled | User withdrew. Retained for record. Removed from travel history accumulation. |

**Exploratory state is a saved assessment result, not a trip in progress.** A user may run assessments on several potential destinations and activate only some of them. Exploratory trips should never be treated as committed or imminent. Timing information (e.g. "Allow 21 days for visa processing") is shown in exploratory state as neutral context only — never as a warning, never coloured amber or red. The user has not decided to go, so urgency framing is meaningless and misleading.

**The assessment result view and the exploratory trip detail are the same content.** The exploratory detail is the persisted version of the assessment result shown at the end of trip creation. Sub-tasks are displayed as an informational process preview — the user can see the steps they will need to take, but cannot take any action on them. Action buttons (generate, upload) only appear once the trip is activated.

### 8.2 Compliance Status (Active trips only)

Computed from Layer 1 requirements only. Compliance status, At Risk calculations, deadline warnings, and all urgency language apply exclusively to Active trips. Exploratory trips have no compliance status.

| Status | Condition |
|---|---|
| Compliant | All mandatory requirements complete |
| Incomplete | One or more mandatory requirements not started or in progress |
| At Risk | Latest start date passed on one or more mandatory requirements still Not Started |

No action required trips (where the assessment finds no mandatory requirements) go straight to Compliant on activation.

### 8.3 Past Trips

Trips created with historical dates skip the compliance assessment — there is nothing actionable. They open directly as a storage view: trip details, document section, travel essentials. They add to travel history and country accumulation.

---

## 9. Compliance Layer (Layer 1)

### 9.1 Assessment

When a user creates a trip, a compliance assessment runs automatically against:
- Destination country
- Travel dates and duration
- Purpose of travel
- User's nationality
- User's passport (validity, issuing country)
- User's active authorizations (existing visas, permits, rights)

The assessment returns one of:

| Result | Meaning |
|---|---|
| Action required | One or more mandatory requirements identified |
| No action required | User's existing profile covers this trip — no new authorization needed |
| Review required | Uncertainty in the assessment — user advised to seek guidance before proceeding |

The assessment result is the primary content of the Exploratory trip view. On activation, it is accessible via a "View Assessment" link — it is no longer primary, but it remains available.

### 9.2 Requirements

Each mandatory requirement identified by the assessment becomes a checklist item. Requirements have a compliance status that rolls up to the trip.

| Requirement status | Trigger |
|---|---|
| Not started | No action taken |
| In progress | User has begun the guided steps |
| At Risk | Latest start date passed, still Not Started |
| Complete | Evidence uploaded |

**At Risk calculation.** Each requirement carries a Time Required value. Latest start date = travel date − Time Required. At Risk triggers when that date passes and the requirement is still Not Started.

**At Risk display.** Never a generic "Resolve" button. Instead: an explanatory line in amber describing why it is at risk — e.g. "Deadline to start passed — 10 days required before travel." The action is always the upload on the relevant sub-task.

### 9.3 Sub-task Model

Sub-tasks represent work, not states. There are four types.

**Type 1 — Automated verification**
The system checks this automatically from profile data. Ticks itself off. Never requires user action.
*Examples: passport validity for destination, existing authorization coverage.*

**Type 2 — Generatable document**
A document specific to this trip that must be created. The product drafts it using AI. The user reviews, approves, and if required, gets it signed. Has its own mini-lifecycle: Draft → Approved → Signed.
*Examples: letter of support, letter of invitation.*

This is a sub-task because it requires creation (not just collection), it is trip-specific, it blocks the primary action, and the product can meaningfully accelerate it.

**Type 3 — Primary action**
The main thing the user must do to satisfy the requirement. An application, registration, or formal submission. The product provides: a direct link to the right authority or portal, what to bring, and estimated processing time. Completion is evidenced by uploading the outcome.
*Examples: apply for e-visa, submit arrival card application, register with local authority.*

One primary action per requirement. Sub-tasks exist to enable it, not to describe its stages.

**Type 4 — Third-party obtainable**
Something that requires meaningful coordination with another person or institution — real lead time or dependency on someone else's action.
*Examples: employer HR letter (requires HR), consulate appointment, criminal record check.*

Only raised as a sub-task if obtaining it requires real effort. Routine document collection (passport copy, passport photo) is not a sub-task — it is an assumed input to the primary action and listed in the "what to bring" guidance.

**What is never a sub-task:**
- States presented as tasks ("receive confirmation", "await approval")
- Stages of a single continuous action ("submitted" + "confirmed" = one task)
- Routine document collection where no creation or coordination is needed

**Applied example — India e-Business Visa:**

```
Requirement: e-Business Visa (India)

[✓] Passport validity          Auto-verified — 18 months remaining
[ ] Letter of support          Generate with AI → review and approve
[ ] Letter of invitation       Generate with AI → review and approve
[ ] Apply for e-Business Visa  Apply at indianvisaonline.gov.in → upload confirmation
```

Passport copy, passport photo, and other standard inputs are listed in the "what you'll need" guidance on the Apply step — not as separate checklist items.

### 9.4 Requirement Detail View

Each requirement opens a drawer with:
- Why it applies to this specific trip (personalised, not generic)
- What it is (plain language)
- The process, end to end
- Time Required and latest start date
- Sub-tasks with their current status and actions
- Link to Ask AI with trip and requirement context pre-loaded

### 9.5 Completion Gate

The document upload is always the completion gate. Not a checkbox or a "mark complete." Uploading the outcome closes the requirement and timestamps the submission. This creates a consistent evidence trail.

---

## 10. Travel Essentials Layer (Layer 2)

Documents and confirmations the user wants accessible for the journey. Not assessed. Not required for compliance. Do not affect compliance status.

The user adds these themselves — no checklist is generated.

**Empty state.** When no documents have been added, the section shows three tappable suggestion chips (Flight confirmation, Hotel booking, Travel insurance) with a brief explanation: "Store documents you'll need at the airport or border." Tapping a chip pre-selects that document type and opens the upload form. An "Other document" option opens the form with no pre-selection. Chips disappear once any document has been added — from that point the section shows the "Add document" row at the bottom of the list.

| Document type | System action |
|---|---|
| Flight confirmation | Stored. May validate trip dates if they differ from what was entered. Does not create a new travel history record — the trip object owns that. |
| Boarding pass | Stored only |
| Hotel confirmation | Stored only |
| Travel insurance | Stored only |
| Car hire / transport booking | Stored only |
| Emergency contacts | Stored only |

**Flight confirmation and travel history.** The trip object creates the travel history record when the trip is created. A flight confirmation uploaded later stores the document and may validate the dates — it does not create a second record. The only scenario where a flight confirmation might inform trip creation is if the user uploads it before creating a trip, but the preferred flow is always: create the trip first, then upload documents into it.

---

## 11. My Trips — List View

The Trips tab is the primary navigation for all trip management.

**The home screen (hero card and "Also coming up" strip) shows Active trips only.** Exploratory trips do not appear on the home screen — they are accessible via the Trips tab only.

**Add a Trip** CTA is persistent, always accessible.

**Tab structure in the Trips tab:**
- **Upcoming tab (default):** Active and Exploratory trips. If both are present, Active trips are labelled "Confirmed" and appear above Exploratory. At Risk trips pinned to top within each group.
- **Past tab:** Completed and cancelled trips. Tab label shows count when trips exist (e.g. "Past (3)").

The user's attention should be on active trips first. Exploratory trips are secondary.

**Trip card — Active:**
- Small circular flag bubble (left of destination name, not a left column)
- Destination name · date range · purpose
- Compliance status badge (Compliant / Incomplete / At Risk)
- At Risk: red left border + inline warning
- Urgent state (Incomplete + departing ≤1 day): amber left border
- Compliance summary: 1–2 requirements shown individually; 3+ shown as count
- Full card is a tap target

**Trip card — Exploratory:**
- Small circular flag bubble inline with destination name
- Dashed border to visually differentiate from confirmed trips
- Explicit Activate CTA inline on the card — the only card type with a visible action button, because activation is a deliberate decision

**Trip card — Past:**
- Compact single row
- Reduced opacity
- No actions — taps to read-only view

---

## 12. User Flows

### Flow A: Plan ahead — full compliance required
1. User adds trip: India, May 14–20, Business
2. Trip created (Exploratory). Travel history record created.
3. Assessment runs. Returns: e-Business Visa required. Result shown with process preview — timing shown as neutral context ("Allow 10 days"). No urgency, no actions available.
4. User reviews the assessment and decides to go. Taps Activate Trip.
5. Trip moves to Active. Checklist generated. Status: Incomplete. Urgency and deadline calculations now apply.
6. User generates letter of support via AI. Reviews and approves.
7. User generates letter of invitation via AI. Reviews and approves.
8. User follows link to Indian visa portal. Completes application. Returns. Uploads confirmation.
9. Requirement complete. Status: Compliant.
10. User uploads flight confirmation and hotel booking to Travel Essentials.
11. Trip: Compliant + essentials stored.

### Flow B: No compliance required — existing authorization
1. User adds trip: Germany, June 3–6, Conference
2. Trip created (Exploratory). Assessment runs. Detects valid Schengen residence permit in profile. Result shown as neutral context — no urgency.
3. Result: No action required.
4. User activates. Trip moves to Active. Status goes straight to Compliant.
5. User uploads flight and hotel to Travel Essentials. Done.

### Flow C: Logging a past trip
1. User adds trip: Singapore, March 10–15, Business. Dates in the past.
2. Trip created. Assessment skipped — historical. Travel history record created.
3. Trip opens as storage view. No checklist.
4. User uploads arrival card and boarding pass.
5. Singapore appears in travel history with correct dates and day count.

### Flow D: Re-engagement mid-process
1. User opens wallet. India trip card shows: Incomplete — letters done, visa not started. At Risk if deadline passed.
2. User opens trip. Taps Apply for e-Business Visa.
3. Guidance shown. Generated letters are linked and accessible from within this step.
4. User completes application externally. Returns. Uploads confirmation.
5. Status: Compliant.

### Flow E: Day-of travel — border access
1. User opens wallet. India trip surfaced at top — departure imminent.
2. Taps trip. All requirements green. Travel Essentials present.
3. Taps e-Business Visa requirement. Drawer opens. Visa document and reference number displayed.
4. User shows at border or references at check-in.

---

## 13. Data Model

### Trip

| Field | Description |
|---|---|
| Trip ID | Unique identifier |
| User ID | Owner |
| Destination | Country |
| Start date | |
| End date | |
| Duration | Calculated |
| Purpose | Business / tourism / education / relocation / etc. |
| State | Exploratory / Active / Completed / Cancelled |
| Compliance status | Compliant / Incomplete / At Risk (Active trips only) |
| Passport used | Which passport this trip is assessed against |
| Assessment ID | Link to assessment result |
| Is historical | Boolean — skips assessment if true |
| Created date | |
| Activated date | |

### Requirement

| Field | Description |
|---|---|
| Requirement ID | |
| Trip ID | Parent trip |
| Type | Visa / arrival card / letter / registration / etc. |
| Is mandatory | Boolean — drives compliance status |
| Status | Not started / In progress / At Risk / Complete |
| Time required | Days needed before travel |
| Latest start date | Calculated: travel date − time required |
| Completed date | When evidence was uploaded |

### Sub-task

| Field | Description |
|---|---|
| Sub-task ID | |
| Requirement ID | Parent requirement |
| Type | Automated / generatable / primary action / third-party |
| Status | Pending / Complete |
| AI-generated content | For generatable document type |
| Approval status | Draft / Approved / Signed (generatable type only) |
| Evidence document ID | Linked uploaded document |

### Document

| Field | Description |
|---|---|
| Document ID | |
| User ID | Owner |
| Type | Visa / arrival card / flight confirmation / passport / letter / etc. |
| Layer | Compliance (Layer 1) / Travel essentials (Layer 2) / Profile |
| Trip ID | Linked trip (nullable for profile-level documents) |
| Requirement ID | Linked requirement (nullable) |
| Upload date | |
| Parsed destination | Extracted from document if applicable |
| Parsed dates | Extracted from document if applicable |
| Parsed reference | Extracted reference number if applicable |

### Country Record

| Field | Description |
|---|---|
| User ID | |
| Country | |
| Total days | Cumulative across all non-cancelled trips |
| Trip IDs | All trips that contribute to this record |
| Active authorization IDs | Current valid authorizations for this country |

### Threshold

| Field | Description |
|---|---|
| Threshold ID | |
| User ID | |
| Country or region | |
| Rule type | Minimum / maximum |
| Target days | |
| Period type | Rolling 12 months / calendar year / custom |
| Status | On track / approaching / at risk / breached |
| Notification at | Percentage of maximum, or days before minimum deadline |

---

## 14. Notifications & Alerts

| Trigger | Message |
|---|---|
| Upcoming trip, requirements incomplete | "Your trip to [country] is in X days — [N] requirements outstanding" |
| Requirement At Risk | "Deadline to start [requirement] has passed — [N] days required before travel" |
| Active authorization expiring | "[Visa type] for [country] expires in 90 days" |
| Threshold approaching maximum | "You have used [N] of your [X]-day allowance in [country/region]" |
| Threshold approaching minimum | "You need [N] more days in [country] to meet your [X]-day requirement by [date]" |
| Exploratory trip not activated | "Your planned trip to [country] hasn't been activated — [N] days until travel" |

Notifications apply to Active trips only, except authorization expiry and threshold alerts which are profile-level. The exploratory trip notification is a soft reminder only — it does not carry urgency language or compliance framing. The user may not be going on this trip.

---

## 15. Proof of Concept Scope

The PoC validates the core compliance flow and travel history accumulation. It is not a full build.

### In scope

| Area | Detail |
|---|---|
| Profile | Basic setup: name, nationality, passport details, country of residence. Skippable onboarding wizard. |
| Trip creation | Destination, dates, purpose. Creates trip object and travel history record. |
| Assessment | Stubbed — returns a pre-configured result for a small set of test destinations. Assessment engine is not built. Result is shown as a neutral process preview in the exploratory state — no urgency, no action buttons. |
| Trip activation | The gate between assessment and compliance tracking. Exploratory → Active. Checklist generated from stubbed assessment result. Urgency and deadline calculations begin only after activation. |
| Compliance checklist | Mandatory requirements with sub-tasks. Automated verification (passport validity). Primary action with upload gate. |
| AI document generation | CTA present on generatable document sub-tasks. Engine not built — button is visible but non-functional or returns a placeholder. |
| Evidence upload | User uploads a file. Stored against the requirement. Document name used as the file label. No parsing. |
| Managed service cases | User can initiate a Centuro-managed case from a primary action sub-task. Case record created, at_risk suppressed, case detail view with milestone timeline. See §16. |
| Travel essentials (Layer 2) | User can upload flight confirmation, hotel booking, and other documents to a trip. Stored and accessible. |
| Travel history | All trips accumulate into a travel history. Basic views: trips list, days per country, countries visited. Filterable by date range. |
| My Trips list | Upcoming, exploratory, and past trip cards. Compliance status badges. |
| Border access | Documents accessible in two taps from the trip view. |

### Out of scope for PoC

| Area | Reason |
|---|---|
| Document parsing | Not in scope — documents are stored as-is. Date extraction, visa validation against trip dates, and cross-checks are a later phase. |
| Thresholds | Deferred — travel history must be established first before threshold monitoring adds value. |
| Active authorizations registry | Deferred — assessment engine will use this at full build; stubbed assessment doesn't require it. |
| Multiple passports | Single passport only for PoC. |
| Travel history export | Deferred to post-PoC. |
| Notifications and alerts | Deferred. |
| Multi-destination trips | Single destination per trip only. |
| Trip members | Individual traveller only. |
| Monetisation | Not applicable at PoC stage. |

---

## 16. Managed Service Cases

Users with a `primary_action` sub-task (e.g. "Apply for e-Business Visa") can choose to handle the application themselves or hand it to Centuro to manage end to end.

### 16.1 CTA Design

When the requirement drawer is open and the primary action sub-task is pending, the user sees a path choice:

- **Primary CTA:** "Get Centuro to handle this" — filled button. Subtitle: "We manage the application end to end."
- **Secondary option:** "Apply online yourself" — text link below. Opens the upload form in the same drawer.

Once the user has chosen self-apply, the upload form is shown with a secondary escape: "Changed your mind? Let Centuro handle this" — small text link at the bottom of the form.

### 16.2 State Machine

```
primary_action sub-task:
  pending (no choice)
    → initiateCase()  → service_mode: 'managed', status: 'case_in_progress'  [one-way]
    → self-apply      → status: 'complete' (via upload)  [can switch to managed at any point]
  case_in_progress    → case completes → status: 'complete'  [production: platform sync]
  complete            → done
```

No reversal from managed to self-apply. A user on the self-apply path can always initiate a case instead.

### 16.3 Compliance Logic

Initiating a case sets `has_active_case = true` on the requirement. `effectiveStatus()` checks this flag before evaluating the `at_risk` deadline — if a case is active, the requirement stays `in_progress` regardless of whether the latest start date has passed. The trip will not escalate to `at_risk` while Centuro is handling an active case.

### 16.4 Case Object

Each case stores: case reference (e.g. #CG-2026-001), visa type, destination country, current milestone, overall progress (0–100), initiated date.

Standard milestone sequence:
1. Case Initiated
2. Process Recommended
3. Documents Collected
4. Application Prepared
5. Application Submitted
6. Official Agency Response
7. Passport Returned
8. Case Completed

### 16.5 Case Detail View

Accessible via: Trip → requirement drawer → "View case" link. URL: `/trips/[id]/cases/[caseId]`.

Sections:
- Case header: reference chip, visa type, destination
- Status panel: current milestone, on track/ahead/delayed indicator, progress bar
- Milestone timeline: vertical stepper, completed/current/upcoming states
- Team assigned: case manager name and role (stubbed: Sarah Johnson — Case Manager)
- Quick actions: Message Case Manager, Ask AI (both non-functional in PoC — show "Coming soon" toast)
- Case settings: notification toggle (UI only)

### 16.6 PoC Scope

| In scope | Detail |
|---|---|
| Case initiation | User taps "Get Centuro to handle this" — case record created locally, sub-task status updated, compliance recalculated |
| Case detail view | Milestone timeline, status panel, stubbed team data, messaging stub |
| at_risk suppression | Case initiation prevents at_risk escalation while case is active |
| Sub-task visual state | "Case in progress" chip on the sub-task row |

| Out of scope | Reason |
|---|---|
| Live platform sync | Production intent — PoC uses stubbed case data. Case status does not update automatically. |
| Messaging | UI represented (buttons visible, "Coming soon" toast). Comms layer not built. |
| Document requests | Centuro requesting specific documents from the user within a case — deferred to post-PoC. |
| Case list view | Cases are accessed from within trips only. No standalone cases tab. |

### 16.7 Production Intent

Travel Wallet is an extension of the Centuro platform. In production, the `cases` table will sync with live case records via the Centuro API. Case status, milestones, and document requests will update in real time. The case detail messaging section will connect to the platform's comms layer. The PoC local record is a stub for this connection.

---

## 17. Decisions & Open Questions

**Resolved:**

| Decision | Detail |
|---|---|
| Platform | Mobile-first. The primary product is a mobile app. A web version is available as a secondary access point. All UX decisions — navigation, document access, speed — are made for mobile first. |
| Assessment engine | Treated as a black box. The product sends inputs (destination, dates, purpose, nationality, passport, active authorizations) and receives a structured result (requirements, Time Required values, outcome type). The assessment engine itself is a separate component to be defined and integrated. |

**Open:**

| Question | Why it matters |
|---|---|
| How are Time Required values sourced per requirement type per destination? | Directly affects At Risk calculation accuracy — this may come from the assessment engine or be a separate data layer |
| How does the product handle multi-destination trips (e.g. India then Singapore on one journey)? | Single trip object with multiple compliance sets, or separate trip objects? |
| What is the minimum profile data required to run an assessment, and how does the system gracefully degrade when data is missing? | Affects onboarding and first-run experience |
| What is the monetisation model? | Free vs. paid; which features sit behind a paywall |
| How does the product handle countries where entry requirements change frequently? | Assessment accuracy and liability — does the product disclaim real-time accuracy? |
| Can a user add trip members (e.g. travelling with a partner or colleague) or is this always strictly individual? | Scope question for v1 |

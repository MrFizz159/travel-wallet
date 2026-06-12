# UI/UX Review — Travel Wallet PoC

**Scope:** code-only review of the built app against the PRD's UX principles (`PRD and Design/travel-wallet-prd.md`) and the UI component spec. No runtime walkthrough; behaviour is traced from source. Anything inferred rather than read directly is labelled. Date: 2026-06-12.

---

## What's working well

- **Layer separation is honoured everywhere.** Compliance status is computed from Layer 1 only (`lib/compliance.ts:26-34`), and the Travel Essentials section always carries the "Does not affect compliance status" sub-label (`components/travel-essentials-section.tsx:70-73`).
- **The Layer 2 empty state matches PRD §10 exactly.** Three tappable suggestion chips (Flight confirmation, Hotel booking, Travel insurance), the explanatory line, an "Other document" escape, and chips that disappear once a document exists (`components/travel-essentials-section.tsx:91-115, 164-172`).
- **Exploratory state is mostly clean.** Cards show no badge, no urgency pill, no deadline framing (`components/trip-card-exploratory.tsx`); the exploratory detail shows timing as neutral muted text ("Allow 10 days · start by 4 May", `components/trip-detail-view.tsx:449-457`) with no action buttons and a single activation CTA. The memory rule held.
- **No generic Resolve button anywhere.** At Risk surfaces as an explanatory amber line in the drawer (`components/requirement-drawer.tsx:852-857`) and "Should have started by {date}" on requirement rows (`components/ui-kit/index.tsx:477-487`), per PRD §9.2.
- **Status never needs a tap to discover.** Badge on every card, compliance chip in the trip hero, icons on requirement rows, progress count in the hero ("2 of 4 requirements complete", `components/trip-detail-view.tsx:412-417`).
- **Pending states are consistently handled.** Nearly every async button uses `useTransition` with a spinner plus a label change ("Saving…", "Activating…", "Setting up…") and disables itself. The transit check failure path has a defined fallback message rather than a silent error (`app/trips/new/add-trip-form.tsx:179-184`).
- **Empty states exist on every list**: home (`app/page.tsx:144-153`), trips, wallet passports, past tab, each with a single CTA where one makes sense.
- **Case detail handles stubs honestly**: Message Case Manager and Ask AI show a "Coming soon" toast (`components/case-detail-view.tsx:38-41, 183-187`) rather than failing silently.

---

## Critical

### 1. "Review required" destinations render as all-clear

**What:** The stub returns `review_required` with zero requirements for any country not in its list (`lib/assessment/stub.ts:28, 210`). The exploratory detail and the active leg view key only off `requirements.length`, so an uncertain assessment renders the green "No visa or authorisation required" / "No action required" box (`components/trip-detail-view.tsx:428-429, 478-483` exploratory; `295-303` active). The intake review step does handle it with an amber "Review recommended" block (`app/trips/new/add-trip-form.tsx:591-595`), so the warning appears once, then is permanently inverted to a green tick.
**Why it matters:** This is the worst possible failure mode for a compliance product: it tells the user they're clear when the assessment said "seek guidance". It also contradicts PRD §9.1, which treats Review required as a first-class outcome.
**Suggested improvement:** Persist `assessment_result` per leg (it's already saved at `app/actions/trips.ts:228`) and branch on it in both trip-detail states, reusing the intake's amber block. A `review_required` leg should never show the compliant green box.

### 2. Completed compliance evidence is unreachable, so border access is broken

**What:** Once a requirement is complete, there's no path to its uploaded document. The requirement row's tap toggles collapse when sub-tasks exist (`components/trip-detail-view.tsx:123`), and completed sub-task rows render a plain "Done" label with no action (`components/ui-kit/index.tsx:614-616`), so the drawer (which holds the evidence link, `components/requirement-drawer.tsx:445-453`) can no longer be opened. Trip detail lists Layer 2 documents only (`components/trip-detail-view.tsx:566-569`).
**Why it matters:** This breaks PRD §6.8 ("Access in two taps") and Flow E outright. The exact moment the product promises value (showing the visa at the border) is the moment the document becomes invisible. Layer 2 documents do meet the two-tap rule (home → hero → document row), which makes the Layer 1 gap more jarring.
**Suggested improvement:** When a requirement is complete, make the row tap open the drawer (or surface the evidence document as a tappable row directly under the requirement). Consider a "Documents" group on trip detail listing all trip documents across both layers.

### 3. Cancel trip is one tap, unconfirmed, and irreversible

**What:** The Cancel trip button at the bottom of trip detail submits immediately with no confirmation (`app/trips/[id]/page.tsx:71-81`). Cancelled is a terminal state with no reactivation path; the cancelled view is a single line, "This trip was cancelled" (`components/trip-detail-view.tsx:624-629`).
**Why it matters:** A stray tap permanently destroys an active trip's checklist context: requirements, uploads, approval history all become unreachable behind a dead-end screen. The Centuro modal proves the codebase already has a confirmation pattern (`components/requirement-drawer.tsx:735-764`).
**Suggested improvement:** Reuse the bottom-sheet confirm pattern ("Cancel this trip? Your documents stay in your wallet."). Longer term, let a cancelled trip's documents remain browsable.

---

## Should-fix

### 4. At Risk fires on in-progress requirements, against PRD §9.2

**What:** `effectiveStatus()` returns `at_risk` whenever today ≥ `latest_start_date` and the requirement isn't complete (`lib/compliance.ts:19-24`). PRD §8.2/§9.2 define At Risk as deadline passed while **still Not Started**. The `>=` also fires on the deadline day itself rather than after it.
**Why it matters:** A user who has generated letters and submitted an application still gets escalated to red. False alarms train users to ignore the real ones.
**Suggested improvement:** Gate the `at_risk` branch on `req.status === 'not_started'` (the drawer's `getAtRiskMessage` already distinguishes submitted applications; the roll-up should match).

### 5. The At Risk message shows the wrong number

**What:** `getAtRiskMessage` renders "Deadline to start passed — X days required before travel" where X is days remaining until departure, not the requirement's Time Required (`components/requirement-drawer.tsx:121-123`). PRD §9.2's example uses Time Required ("10 days required").
**Why it matters:** The copy says "required" but shows "remaining". When 4 days remain on a 10-day visa, "4 days required before travel" understates the problem.
**Suggested improvement:** "Deadline to start passed — {time_required_days} days needed, {daysLeft} days until travel."

### 6. Failed or unrunnable passport checks display as "Checking…" forever

**What:** The automated passport sub-task is set to `complete` only if the passport passes the 180-day rule at creation; otherwise it stays `pending` (`app/actions/trips.ts:100-105`) and the row renders "Checking…" indefinitely (`components/ui-kit/index.tsx:618-620`). With no passport on file, the intake form silently hides the passport select (`app/trips/new/add-trip-form.tsx:363`) and never prompts, against PRD §6.6 (prompt inline when a gap matters).
**Why it matters:** The user can't distinguish "still checking", "your passport fails the validity rule", and "we have no passport". A failed validity check is exactly the thing this product exists to catch.
**Suggested improvement:** Add a failed/blocked state on the automated row ("Passport expires {date} — 6 months validity needed") and an inline "Add your passport to run this check" prompt in intake when `passports.length === 0`.

### 7. Letter generation copy describes things that didn't happen

**What:** Tapping Generate only writes placeholder text server-side (`app/actions/trips.ts:709`). The step then shows "Downloaded — upload signed copy to complete this step" and a "Download again" button (`components/requirement-drawer.tsx:259-271`) even though nothing has been downloaded. The download itself is a `.txt` placeholder with no on-screen note that AI generation is stubbed.
**Why it matters:** Two false statements in one step erode trust in every other status message, and a demo user will hunt for a download that never arrived.
**Suggested improvement:** After generating, show "Draft ready" with a primary Download button; switch to "upload signed copy" framing only after the first download. Add a one-line stub notice for the PoC.

### 8. Manager approval's 3-second simulation is fragile and uncommunicated

**What:** The pending → approved transition runs inside the drawer component: `await sendManagerApproval` → `setTimeout` 3s → `resolveManagerApproval`, with local state mirroring it (`components/requirement-drawer.tsx:626-653`). The pending view says a manager "will review and approve" with no progress indicator. Inference: if the user closes the drawer during the 3 seconds, the server action still completes, but the trip view behind shows stale status until the next revalidation, and reopening the drawer shows whatever the stale prop says.
**Why it matters:** The PoC's scripted demo moment depends on the user keeping a drawer open for 3 seconds with no cue to do so.
**Suggested improvement:** Show an explicit animated pending state ("Simulating manager response…" for PoC honesty), and router.refresh() after resolution so the page behind updates.

### 9. Activation vocabulary is inconsistent and consequence-free

**What:** The same action is "Activate" on the exploratory card (`components/trip-card-exploratory.tsx:83`), "Get Started" on exploratory detail (`components/trip-detail-view.tsx:500`), and "Get Started" vs "Save Trip" at intake review (`app/trips/new/add-trip-form.tsx:719, 739`). Nothing explains what activation does (checklist goes live, deadlines start counting). The exploratory detail's form also has no pending state while activation runs several sequential inserts (`components/trip-detail-view.tsx:498-501`).
**Why it matters:** PRD §8.1 calls activation "a deliberate decision"; three labels for one decision, with no consequence copy, makes it feel arbitrary. "Save Trip" gives no clue the trip becomes exploratory or where it goes (it redirects to /trips with no toast, `app/actions/trips.ts:251`).
**Suggested improvement:** One verb everywhere ("Activate trip"), a one-line subtitle at intake ("Start tracking deadlines now" / "Save for later — no tracking yet"), and `useFormStatus` on the exploratory detail button.

### 10. The saved exploratory trip loses information the review step showed

**What:** Exploratory detail re-runs the stub client-side and renders legs only; transits are ignored entirely in that branch (`components/trip-detail-view.tsx:422-504`). A transit needing an eTA, shown prominently at review, vanishes from the saved exploratory trip until activation.
**Why it matters:** PRD §8.1 says the exploratory detail **is** the persisted assessment result. A user comparing two saved options is missing a requirement that may decide between them.
**Suggested improvement:** Render `trip.transits` in the exploratory branch using the same neutral cards as the review step.

### 11. At Risk trips aren't pinned in the Trips list

**What:** PRD §11 requires At Risk trips pinned to the top within each group; the list sorts by start date only (`app/trips/page.tsx:93-97`).
**Why it matters:** The trip most needing attention can sit below three healthy ones; date order hides exactly what the red border is meant to surface.
**Suggested improvement:** Sort by `(compliance_status === 'at_risk' ? 0 : 1)` then date within the upcoming group.

### 12. Sub-task action chips are well under the 44px tap rule

**What:** Generate/Apply/Upload chips on sub-task rows are `min-h-[28px]` (`components/ui-kit/index.tsx:626, 659, 670`), drawer step buttons are 32px (`components/requirement-drawer.tsx:250, 268, 283`), and the wallet "+ Add" pills are 28px (`app/wallet/page.tsx:52, 81`). The essentials suggestion chips land around 40px (`components/travel-essentials-section.tsx:101`).
**Why it matters:** These are the primary progression actions in the whole compliance flow, on the screen the spec sets a hard 44px floor for.
**Suggested improvement:** Keep the visual chip small but extend the hit area (padding or a pseudo-element) to 44px, as already done for the nav and close buttons.

### 13. "Await approval" steps contradict the PRD's own sub-task model

**What:** The India stub includes "Complete the application" and "Await approval" steps (`lib/assessment/stub.ts:63-64`), and the transit visa stub includes "Await approval" (`lib/assessment/transit.ts:53`). They render as numbered steps in the drawer (`components/requirement-drawer.tsx:978-979`). PRD §9.3 names "await approval" as the canonical example of what is never a sub-task.
**Why it matters:** It pads the checklist with states masquerading as work, exactly the bloat the model was designed to prevent, and these stubs are the template future destinations will copy.
**Suggested improvement:** Fold processing-time info into the Submit step's description and the Guidance block; drop the informational steps.

### 14. Bottom nav clearance is likely short on notched devices

**What:** Content gets `pb-20` (80px, `app/layout.tsx:24`); the nav is `h-16` (64px) plus `env(safe-area-inset-bottom)` (`components/bottom-nav.tsx:21`, `app/globals.css:174-176`). Inference: on a device with a ~34px home indicator the nav totals ~98px, so the last row (often the Cancel trip button or the intake CTA) sits partially under it. Can't be confirmed without runtime.
**Suggested improvement:** `padding-bottom: calc(5rem + env(safe-area-inset-bottom))` on main, or move the safe-area inset inside the 80px budget.

### 15. Dead controls with no feedback

**What:** The notification bell on home (`app/page.tsx:122-124`) and the overflow (⋮) button on trip detail (`components/trip-detail-view.tsx:354-356`) do nothing on tap: no toast, no disabled treatment.
**Why it matters:** Silent non-response reads as breakage. The case detail screen already solved this with a "Coming soon" toast; two screens behaving differently for the same situation is the inconsistency that gets noticed in a demo.
**Suggested improvement:** Either remove them for the PoC or wire both to the existing toast pattern.

---

## Nice-to-have

### 16. 'Ready' vs 'Compliant': the two docs disagree, pick one

The PRD (§8.2, §11) says Compliant; the UI spec and code say Ready (`components/ui-kit/index.tsx:89`). Ready is the better word for a traveller; update the PRD so the next contributor doesn't "fix" the code. Also: `ComplianceChip` falls back to rendering the raw status string for unknown values (`components/trip-detail-view.tsx:55`); map or hide instead.

### 17. Past trip cards aren't the compact row the PRD describes

PRD §11 wants past trips as a compact single row, reduced opacity, no badge. The code reuses the full TripCard at 60% opacity (`app/trips/page.tsx:208-217`), including the urgency-pill logic (suppressed only because `departsIn` isn't passed). A dedicated compact row would also shorten a long Past tab.

### 18. Everything defaults to expanded on trip detail

Every leg, transit, and requirement card initialises open (`components/trip-detail-view.tsx:106, 244`). A two-leg trip with a transit and approval is a long scroll where complete items occupy as much space as urgent ones. Default-collapse complete requirements (the collapsed summary "3/3 complete" already exists at `components/trip-detail-view.tsx:177, 270`).

### 19. Hero CTA doesn't deep-link to the task

The component spec says the hero's outstanding-task block deep-links to the requirement; the whole card links to plain trip detail (`app/page.tsx:167-225`), with the "Continue →" block inside the same Link. A `?req={id}` param that auto-opens the drawer would close the loop.

### 20. Small copy and consistency sweeps

"Coming up" vs PRD's "Also coming up" (`app/page.tsx:229`); `capitalize` on the whole date·purpose line (`app/page.tsx:188`) where only purpose needs it; the transit date input sets a `placeholder` on `type=date`, which native pickers ignore (`app/trips/new/add-trip-form.tsx:258-264`); per-leg passport selects render even with a single passport on file (`app/trips/new/add-trip-form.tsx:363-375`), one more decision than the typical single-leg, single-passport trip needs.

---

## Quick wins

1. **Show the amber "Review recommended" block in exploratory and active leg views** by branching on the stored `assessment_result`: the block already exists in the intake form, this is a copy-paste plus condition (finding 1).
2. **Open the drawer from completed requirement rows** by changing the `onClick` ternary in `CollapsibleRequirementCard` to route to `onOpenReq` when `status === 'complete'` (finding 2).
3. **Add a confirm sheet to Cancel trip** by reusing the `CenturoConfirmModal` pattern (finding 3).
4. **Gate `at_risk` on `not_started`** in `effectiveStatus()`: a one-line change that removes false alarms (finding 4).
5. **Rename "Get Started" to "Activate trip"** on exploratory detail and intake review, and pass the correct number into the At Risk message (findings 5, 9).
6. **Wire the home bell and trip-detail overflow to the existing "Coming soon" toast** or delete them (finding 15).

# Travel Wallet — Review Summary

**Date:** 2026-06-12. Code-only review across three lenses, each with a detailed report in this folder. This is the read-first document: key takeaways, what to do about them, and what it buys you. New feature recommendations at the end.

**Framing:** this is a PoC built to show what's possible. The goals are an optimal, fast architecture and a correct design system to keep iterating on. Happy flows are acceptable; full country coverage and hostile-input hardening are not goals. The detailed reports tier findings on absolute severity; this summary re-triages them against the PoC lens, so the tiers here are the ones to work from.

> **Execution status (2026-06-12): all 4 steps of the order of attack are DONE** (commits `e7a68a7`, `a327b86`), plus AI letter generation shipped from the recommendations list. See the annotations in the order of attack below. The detailed reports (01–03) describe the codebase as reviewed; their Critical and Should-fix findings within steps 1–4 scope are resolved. Still open: the de-prioritised items above each verdict, the production-readiness notes in report 01, and the remaining new-feature recommendations.

| Report | Findings (absolute tiers) |
|---|---|
| [01 — Code & architecture](01-code-architecture.md) | 4 Critical · 9 Should-fix · 7 Nice-to-have |
| [02 — Design system](02-design-system.md) | 4 Critical · 8 Should-fix · 5 Nice-to-have |
| [03 — UI/UX](03-ui-ux.md) | 3 Critical · 12 Should-fix · 5 Nice-to-have |

---

## 1. Code & architecture — sound shape, two bugs in the happy flow

**Verdict:** the architecture is right (server actions, centralised compliance logic, complete RLS, clean transit-stub seam). Under the PoC lens the priority shifts from defensive hardening to two things: bugs that surface in a normal demo, and the seams that decide whether this prototype evolves into the real system or gets rewritten.

**Breaks the happy flow (fix first):**
- **Timezone off-by-one** (01 §3): date helpers mix local and UTC, so at-risk deadlines fire a day early. This reproduces in UK development right now (BST). Any demo with tight dates shows wrong at-risk states.
- **Transit race** (01 §2): a normally-paced demo can hit it — add a transit, the check takes a few seconds, tap Get Started too soon, and the trip is permanently stuck incomplete with no UI path to recover. The gate is one line (disable the CTA while checks are in flight).

**Iteration-critical (your stated goals):**
- **The assessment seam leaks into the client** (01 §6): the stub runs client-side and the server trusts a client-computed result. The most important architecture item under this lens — moving assessment behind a server action now (as transits already do) means the real engine drops in later without a UI refactor. The difference between a prototype that evolves and one you rewrite.
- **Fast:** the trip detail page fetches every requirement three times (01 §9), and activation inserts legs sequentially so latency grows per leg (01 §11). Both directly fight "optimal and fast".
- **Velocity:** split the 860-line `app/actions/trips.ts` (01 §5) and consolidate the four copies of `durationDays` into `lib/dates.ts` (01 §10) — the dates move also fixes the timezone bug in one place.

**De-prioritised for PoC (production notes, not tasks):**
- Transactional integrity in trip creation (01 §1) — mid-chain DB failures won't happen in a demo.
- Input validation layer, ownership-check hardening, error boundaries (01 §7, §8, §12) — defend against input a happy flow never sends.
- Mutation-in-render auto-complete (01 §4) — works in practice; note it and move on.

## 2. Design system — set up to grow, drift caught early

**Verdict:** the foundation is genuinely good (OKLch token system, semantic status tokens, a real typed ui-kit) and the app can grow on it. You said you want the design system correct for continued iteration, so all four Criticals here stay Critical: each one is a drift vector that compounds with every feature you add.

**Key takeaways:**
- **No form input primitive** (02 §1): the input class string is copy-pasted across 10+ files in 4 variants. The single biggest drift vector.
- **Status colours mapped in 4 places** (02 §2): the core semantic of a compliance product has four independent colour maps plus two raw-palette escapes that already render a different red and green.
- **Dark mode is claimed but broken** (02 §3): given the PoC framing, take option (b) from the report — delete the `.dark` block and the claim, and stop paying the ambiguity tax. Re-derive it properly if and when dark mode becomes a goal.
- **The bottom sheet is hand-rolled twice in one file** (02 §4): extract one `BottomSheet` primitive before a third copy appears.
- The 1,027-line requirement drawer (02 §5) is where every new compliance feature will land; decompose it into a folder as iteration-velocity work. The duplicated purple hero (02 §7) and 46 raw card divs (02 §6) follow opportunistically.

**Impact:** report 02 ends with 8 written growth rules (token-only colour, one status module, one sheet, where new components go). Adopt those and every future feature lands consistent by default instead of by vigilance. Roughly 2–3 days of extraction work locks it in.

## 3. UI/UX — principles internalised, one flow-level break that matters

**Verdict:** the PRD's UX principles held up well at component level (Layer 2 empty state, exploratory neutrality, no generic Resolve buttons, consistent pending states). Under the happy-flow lens, one Critical stays, one drops, and two small gates matter because they corrupt the demo story.

**Stays critical:**
- **Border access is broken for completed requirements** (03 §2): once a requirement completes, the drawer holding the evidence document can never be reopened. Flow E (show your visa at the border) is the money demo moment, and it's the one that's broken. Top priority of the whole review.
- **At Risk fires on in-progress requirements** (03 §4): false red states mid-demo undermine the compliance story. One-line gate in `effectiveStatus()`.
- **At-risk message shows the wrong number** (03 §5) and **letter step claims "Downloaded" before any download** (03 §7): both put false statements on screen during the scripted demo path.

**De-prioritised for PoC:**
- **"Review required" renders as all-clear** (03 §1): this is exactly the "not every country works" case you've accepted. Demo the stubbed countries (IN, US, AU, CA, SG, Schengen) and it never appears. The fix stays cheap (~30 minutes, the amber block already exists in the intake form) if you ever demo an unknown destination.
- **Cancel trip unconfirmed** (03 §3): demo-avoidable; add the confirm sheet whenever you next touch that screen.
- Tap-target sizes, nav clearance, copy sweeps: polish for later passes.

---

## Order of attack (PoC lens) — all four steps executed 2026-06-12

1. ~~**Happy-flow fixes:**~~ **DONE.** Completed requirements open the drawer and sub-tasks link to their evidence document (Flow E restored); UTC-safe `lib/dates.ts` replaced all 4 duplicate helpers; CTAs disable while transit checks run; at-risk fires only on `not_started` strictly past the deadline; at-risk message shows Time Required; letter step says "Draft ready" until actually downloaded.
2. ~~**Architecture for iteration:**~~ **DONE.** Assessment runs server-side (`app/actions/assessment.ts` seam; the server derives `assessment_result`, exploratory previews computed in the page); trip detail fetches requirements once (the `any`-escape went with it); leg inserts are collision-safe (index correlation) and parallel, passport lookups batched.
3. ~~**Design-system extraction:**~~ **DONE.** `Input`/`Select`/`Field`, `BottomSheet` (Escape, scroll lock, z-tokens), `ProgressBar`, and `status.tsx` as the single status module — 10+ files migrated off inline input strings, both drawer sheets and the raw-palette pills converted. Dark mode deleted, z-index scale added, growth rules written into `CLAUDE.md`.
4. ~~**Decompositions:**~~ **DONE** (not just opportunistically). `app/actions/trips.ts` → `app/actions/trips/` (create / lifecycle / transits / evidence / approvals + `_shared` with `requireUser()`, barrel index, export parity verified). `components/requirement-drawer.tsx` → `components/requirement-drawer/` (shell + helpers + approval-body + one file per step type; verbatim move verified by normalised diff).
5. **Build new features** on the cleaned base — this is where things stand now. First one shipped: see AI letter generation below.

---

## New feature recommendations

Grounded in the PRD's deferred scope and what the code now supports. Value/effort signals are rough.

**Near-term, high value:**
- **Thresholds (PRD §7.6).** The Wallet card already says "Coming soon", the types exist, and multi-leg travel history is accumulating real day counts. This is the feature that makes the wallet sticky between trips (Schengen 90/180 is the obvious first rule). Medium effort: one table, one evaluation function over existing leg data, one screen.
- **Travel history export (PRD §7.5).** The data is already structured per leg; a filtered PDF/text export is low effort and directly serves the "visa application asks for travel history" job the PRD opens with.
- ~~**Document repository (PRD §7.4).**~~ **SHIPPED (basic).** The wallet's All Documents card is live with a flat list at `/wallet/documents` (built alongside letter generation). Remaining headroom: filters by type/trip/country/date per the PRD.
- **Authorization-aware assessment.** The authorizations registry is built but the stub ignores it. Teaching the stub to return `no_action_required` when a valid authorization covers the destination (the PRD's Flow B) would make the demo materially smarter for near-zero engine work.

**Medium-term:**
- **Expiry notifications.** Passport and authorization expiry dates are stored; a home-screen alerts strip (before any push infrastructure) covers the PRD §14 triggers cheaply.
- ~~**Real AI letter generation.**~~ **SHIPPED.** `lib/letters/generate.ts` drafts support/invitation letters via Claude (Opus 4.8) from profile + trip context, with a template fallback when no API key. Drafts are viewable as styled letters from the trip and the wallet, with print and download.
- **Trip notes / multi-passport per user.** Both deferred in the PoC; multi-passport is partially supported in the schema already (per-leg `passport_id`).

**Strategic (flagging, not specing):**
- **Assessment engine integration** is the real unlock; the seam fix in step 2 above is the prerequisite.
- **Manager-side approval view** (PRD §17.7) is the gap between PoC and a corporate pilot.
- **Trip sharing / household travellers** came up as a PRD open question; the trip-container model from v2 would extend to it naturally.

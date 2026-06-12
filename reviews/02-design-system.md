# Design System & Component Library Review — Travel Wallet

**Scope:** code-only review of the styling layer, conducted 2026-06-12. Covers `app/globals.css` (tokens), `components/ui-kit/index.tsx` (hand-rolled library), `components/ui/` (shadcn), all feature components and App Router pages, checked against `PRD and Design/ui-component-spec.md`. No runtime testing; every citation verified against source.

**Verdict:** the foundation is genuinely good and the app can grow on it. The token system in `globals.css` is better than most production apps of this size, and `ui-kit` is typed, documented, and consistently used for page scaffolding. The risk sits one layer up: there's no primitive for form inputs, bottom sheets, or status pills outside `ui-kit`, so feature code has started copy-pasting class strings (10+ files for inputs alone, 46 raw card divs, 4 separate status colour maps). That drift is still cheap to reverse today. In 6 months of feature work it won't be.

---

## What's working well

This deserves specific credit, because it's the part that makes everything else fixable.

- **Semantic status tokens with paired backgrounds.** `--status-compliant/-incomplete/-at-risk/-verified`, each with a `-bg` partner, defined in OKLch and mapped to Centuro brand values with comments (`app/globals.css:60-73`). Exposed to Tailwind via `@theme inline` (`globals.css:11-18`), so `bg-status-at-risk-bg text-status-at-risk` works everywhere. This is the correct architecture for a compliance product whose core UI language is status.
- **Full OKLch palette, branded.** Primary purple, destructive, border, ring, charts all derive from the Centuro palette with hex references in comments (`globals.css:78-126`). One radius source (`--radius: 0.75rem`, line 117) with a derived scale (`--radius-sm` through `--radius-4xl`, lines 51-57). Change one variable, the whole app re-rounds.
- **Two-layer surface system implemented as specced.** `bg-surface` on `<body>` (`app/layout.tsx:23`), `bg-card` on elevated elements, exactly as `ui-component-spec.md` requires. Safe-area handling exists (`.safe-area-pb`, `globals.css:174-176`) and is used by the bottom nav (`components/bottom-nav.tsx:21`).
- **`ui-kit` is a real component library, not a junk drawer.** 677 lines, named exports, typed props, a usage comment at the top, `cn()` throughout, status colours via tokens only, 44px tap targets baked into headers and rows (`components/ui-kit/index.tsx:139,521,584`). `PageHeader` and `SectionHeader` are used on every main screen, which is why the app feels consistent page-to-page.
- **Colour discipline is mostly holding.** Across ~6,000 lines of UI code there are only around 8 hardcoded colour instances (detailed below). For an AI-built PoC that's a strong signal the token system is actually being used, and the exceptions are concentrated in 4 files.
- **Spacing rhythm is reasonable.** Cards sit in `gap-3` lists, sections use `mb-6`, card internals use `px-4 py-3`. Uncodified, but visually coherent.

---

## Critical

### 1. No form input primitive — the single biggest drift vector

**What:** the input/select class string (`w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring`) is copy-pasted across the codebase in at least 4 variants: `h-11 px-3 text-sm`, `h-12 px-4 text-base`, `h-12 px-3 text-sm`, and with/without `appearance-none`. Six files each define their own local `inputClass` const; others inline it.

**Where:** `components/historical-doc-section.tsx:51-52` (extracted consts), `components/requirement-drawer.tsx:497,503,507,672` (inline), `app/trips/new/add-trip-form.tsx:251,263,322,340,350,358,367` (inline, mixing h-11 and h-12 in the same file), plus duplicate `inputClass` consts in `app/profile/setup/profile-setup-form.tsx:7`, `app/profile/setup/passport/page.tsx:4`, `app/profile/edit/edit-profile-form.tsx:7`, `app/wallet/authorizations/new/page.tsx:9`, `app/profile/passports/new/page.tsx:5`, `app/wallet/history/new/page.tsx:9`.

**Why it matters:** every new form copies whichever file the author saw last, so the variants multiply. Inputs are already two different heights and two different text sizes depending on screen. When you decide to change input styling (focus colour, radius, height) you'll be editing 10+ files and will miss some.

**Suggested solution:** create `Input`, `Select`, and `Field` (label + input + error) primitives. Either add them via `npx shadcn@latest add input select label` into `components/ui/` and restyle the defaults to the h-12/rounded-xl mobile spec, or add them to `ui-kit`. Pick one height (`h-12` matches the 44px+ tap target rule better) and delete every local `inputClass` const.

### 2. Status colour mapping is duplicated in four places, plus two escapes from the token system

**What:** the claim that `STATUS_BADGE_VARIANTS` is the single source of truth for status colours doesn't hold. The status→{label, classes} mapping exists independently in:

- `components/ui-kit/index.tsx:88-93` — `STATUS_BADGE_VARIANTS` (StatusBadge)
- `components/requirement-drawer.tsx:34-39` — `STATUS_CHIP` (near-identical pill, different labels: "Complete" vs "Ready")
- `components/trip-detail-view.tsx:50-55` — `ComplianceChip` variants (same colours again, plus icons)
- `components/ui-kit/index.tsx:319` — `DepartsInPill` hardcodes the incomplete pair inline

And two components bypass the tokens entirely for status-coloured UI:

- `components/passport-card.tsx:31-37` — expiry pills use `bg-red-500/20 text-red-300` and `bg-amber-500/20 text-amber-300` (raw Tailwind palette, not `--status-at-risk`/`--status-incomplete`)
- `components/case-detail-view.tsx:75` — "On Track" pill uses `bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400`

**Why it matters:** status colour is the product's core semantic (the PRD makes compliance state the whole point of the app). Four mappings means a colour or label change requires four edits, and the two raw-palette escapes already render a *different* red and green from the rest of the app. Each new surface (notifications, email previews, thresholds) adds a fifth and sixth copy.

**Suggested solution:** extend `StatusBadge` in `ui-kit` with `size` ('sm' | 'md') and `icon` props, and export a `statusClasses(status)` helper for non-pill uses. Replace `STATUS_CHIP`, `ComplianceChip`, and the passport/case pills with it. Rule: any status-coloured element renders through this one module. The passport pills on the dark gradient may need a high-contrast variant; add it as a variant there rather than as local classes.

### 3. Dark mode is claimed but structurally broken

**What:** `CLAUDE.md` and the codebase claim dark mode support via the `.dark` class, and `globals.css:129-162` carries a full dark remap. Three problems:

1. The `.dark` block is the stock shadcn neutral palette: `--primary` becomes near-white grey (`globals.css:137`), so the Centuro purple brand disappears entirely in dark mode.
2. The status tokens are **not remapped** in `.dark`. The `-bg` tokens are ~0.96 lightness pastels (`globals.css:64,67,70,73`); on a 0.205-lightness dark card every status pill, at-risk banner, and "no action required" block becomes a glowing light slab.
3. The hardcoded hexes are fixed: visa sticker cream `#F9F6F0` (`components/visa-sticker.tsx:40`), hero `#2D1A5C` (`components/trip-detail-view.tsx:341`, `app/trips/new/add-trip-form.tsx:507`), passport gradient (`components/passport-card.tsx:47`). The single component that *does* handle dark mode does it ad hoc with `dark:` raw-palette classes (`case-detail-view.tsx:75`).

**Why it matters:** there's no theme toggle today, so this is invisible — which is exactly how it compounds. Every new component written against the current state inherits the breakage, and the eventual "add dark mode" ticket becomes a full-app audit instead of a token edit.

**Suggested solution:** decide now. Either (a) dark mode is in scope: re-derive the `.dark` block from brand values, add dark values for all 8 status tokens, and tokenise the three hex surfaces; or (b) it's out of scope for the PoC: delete the `.dark` block and the claim, and stop paying the ambiguity tax. Option (b) is the honest PoC answer; option (a) costs about a day if done while the drift is this small.

### 4. The bottom sheet is hand-rolled twice inside one file and reusable by nobody

**What:** the app's modal pattern (per CLAUDE.md: bottom sheets) exists only as inline JSX inside `requirement-drawer.tsx`: the main drawer (overlay `z-[59]`, sheet `z-[60]`, `rounded-t-2xl`, drag-handle div — `components/requirement-drawer.tsx:806-811`) and `CenturoConfirmModal` (overlay `z-[70]`, sheet `z-[71]`, its own copy of the handle — `requirement-drawer.tsx:741-745`). Neither has a focus trap, Escape handling, body scroll lock, or open/close animation (despite `tw-animate-css` being imported at `globals.css:2`).

**Why it matters:** the next feature needing a sheet (document preview, trip actions menu, threshold detail) will copy one of these, pick its own z-index, and fork the pattern a third time. Accessibility gaps (no focus trap, background still scrollable) get duplicated along with the markup.

**Suggested solution:** extract one `BottomSheet` primitive — either hand-rolled in `ui-kit` (overlay + sheet + handle + Escape + scroll lock, ~60 lines) or `npx shadcn@latest add drawer` (Vaul-based, gives focus trap and swipe-to-dismiss for free). Both inline sheets become consumers. Z-index lives inside the primitive, not in call sites.

---

## Should-fix

### 5. `requirement-drawer.tsx` is a 1,027-line component holding eight concerns

**What:** one file contains: a status chip system (`:34-48`), timeline date maths (`:52-68`), a case summary card (`:72-103`), at-risk messaging logic (`:107-138`), a step indicator (`:144-164`), five step-type components (`AutomatedStep:168`, `GeneratableStep:187`, `ThirdPartyStep:305`, `InformationalStep:394`, `PrimaryActionStep:414` — the last with an embedded upload form), a manager-approval state machine with log rendering (`:588-731`), a confirmation modal (`:735-764`), and the drawer shell itself (`:768-1027`).

**Where:** `components/requirement-drawer.tsx` (entire file).

**Why it matters:** it's the most-touched feature surface in the app (every requirement interaction lands here). At this size, every change is a search exercise, the file can't be code-split, and parallel agents/devs collide on it constantly (your own memory notes flag batching UI work across agents — this file defeats that).

**Suggested solution:** decompose into `components/requirement-drawer/`: `index.tsx` (shell + orchestration, ~200 lines), `steps/` (one file per step type + shared `StepIndicator`), `approval-body.tsx`, `case-summary-card.tsx`, `centuro-confirm.tsx`. The shell consumes the extracted `BottomSheet` (finding 4) and `StatusBadge` (finding 2). No behaviour change required.

### 6. The `Card` primitive exists but raw card divs outnumber it

**What:** `ui-kit` exports `Card` (`components/ui-kit/index.tsx:40-67`), yet the literal pattern `rounded-xl border border-border bg-card` appears 46 times across 15 files as raw divs — 9 in `add-trip-form.tsx`, 7 in `requirement-drawer.tsx`, 5 in `case-detail-view.tsx`, 5 in `app/trips/[id]/documents/[docId]/page.tsx`, and so on.

**Why it matters:** when card styling changes (shadow, radius, dark-mode border), `Card` updates and the 46 raw copies don't. It also hides the real component inventory: "Documents Required" boxes, timeline stat tiles, and list-row containers are all the same unextracted div.

**Suggested solution:** adopt the rule "if it reads `bg-card` + `border` + `rounded`, it's `<Card>`". Migrate opportunistically (whenever a file is touched), and extract the two repeated card shapes that appear 4+ times: a `StatTile` (the `text-[10px]` label + value tile at `requirement-drawer.tsx:838-847` and `add-trip-form.tsx:484-494,610-619`) and a `ListCard` (the `divide-y` row container at `historical-doc-section.tsx:96`, `travel-essentials-section.tsx:75`, `case-detail-view.tsx:130,164`).

### 7. The trip hero is duplicated wholesale, hex and all

**What:** the purple hero header — `-mx-4 bg-[#2D1A5C] rounded-b-3xl` with an inline radial-gradient dot pattern, white/15 chips, flag row, `text-[22px]` title — exists twice, near-identically: `components/trip-detail-view.tsx:341-419` and `app/trips/new/add-trip-form.tsx:507-544`.

**Why it matters:** this is the app's most distinctive visual element and it's already forked. The hex `#2D1A5C` is close to, but not the same as, `--primary` (#592D5D-derived), so the brand purple now has two definitions. Any hero change (status chip, date chips, multi-leg flags) must be made twice and will diverge.

**Suggested solution:** extract `TripHero` into `ui-kit` (props: legs, dates, state chip, back href/onBack, optional right slot). Add `--hero` (and `--hero-foreground`) tokens to `globals.css` and replace `bg-[#2D1A5C]`; move the dot pattern into a class or keep it inside the one component.

### 8. Passport card and visa sticker: code and spec disagree, and neither is tokenised

**What:** `ui-component-spec.md:261` specifies the passport gradient `from-[#1C2440] to-[#0D1118]`; the code ships `linear-gradient(135deg, #2C3E70 0%, #1A2848 100%)` as an inline style (`components/passport-card.tsx:47`). The visa sticker's cream `#F9F6F0` + striped `repeating-linear-gradient` (`components/visa-sticker.tsx:39-43`) matches spec (`spec:306-309`) but lives as inline styles. The spec also calls for a visa type chip, "Valid" label, and entry type (`spec:299-302`) that the component doesn't render.

**Why it matters:** the spec is the contract AI code writers build against (its own header says so). When spec and code disagree on the flagship wallet components, the next generation pass "fixes" the code back to the stale spec. Inline `style` attributes also sit outside `cn()`/tailwind-merge, so they can't be overridden by callers.

**Suggested solution:** decide the real values, then encode them once: add `--passport-card-from/--passport-card-to` and `--visa-paper` tokens (the stripe pattern can stay as a one-off utility class in `globals.css`). Update the spec to match shipped reality. These two are legitimate "physical object" exceptions to the semantic palette, which is exactly why they deserve named tokens rather than loose hexes.

### 9. Keyboard focus states are absent from every hand-rolled interactive element

**What:** `ui-kit`'s `PrimaryButton`, `SecondaryButton`, clickable `Card`, `TripCard`, `RequirementRow`, and `SubTaskRow` action pills define `active:` states but no `focus-visible:` styles (`components/ui-kit/index.tsx:242-250,277-285,517-523,626,637,659,670`). The only component in the repo with proper focus rings is shadcn's `Button` (`components/ui/button.tsx:8`) — which is imported by zero files. Form inputs do have `focus:ring-2 focus:ring-ring`. The global `outline-ring/50` (`globals.css:166`) softens default outlines without guaranteeing visibility.

**Why it matters:** mobile-first doesn't mean touch-only — external keyboards, switch access, and desktop review all use focus. Because the gap is in the shared library, every consumer inherits it, and fixing later means retesting every screen. Related: the `SubTaskRow` action pills are `min-h-[28px]` (`ui-kit/index.tsx:626,637,659,670`) and drawer step buttons `min-h-[32px]` (`requirement-drawer.tsx:250,268,283,345`), under the spec's 44px minimum (`ui-component-spec.md:221`).

**Suggested solution:** add one shared focus utility (e.g. `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`) as a const in `ui-kit` and apply it to every interactive primitive there — one edit point, library-wide fix. Bump small action pills to a 44px hit area (padding or an expanded tap target) even if the visual pill stays compact.

### 10. No z-index scale

**What:** stacking values in use: `z-10` (sticky header, `case-detail-view.tsx:46`), `z-50` (bottom nav `bottom-nav.tsx:21`, toast `case-detail-view.tsx:184`), `z-[59]/z-[60]` (drawer, `requirement-drawer.tsx:806,808`), `z-[70]/z-[71]` (nested modal, `requirement-drawer.tsx:741-742`). The 59/60 and 70/71 values are ad hoc "beat the nav, then beat the drawer" arithmetic.

**Why it matters:** the next overlay author has to reverse-engineer the implicit ordering. The first time a toast needs to appear above a sheet, someone writes `z-[72]` and the escalation continues.

**Suggested solution:** define the scale once — `--z-sticky: 10; --z-nav: 50; --z-sheet: 60; --z-modal: 70; --z-toast: 80` in `@theme` — and make the `BottomSheet` primitive (finding 4) own its layer. Five tokens, done.

### 11. `case-detail-view.tsx` ignores the kit it sits next to

**What:** template-literal classNames instead of `cn()` (`components/case-detail-view.tsx:107-113,116,120,174,176`), an inline `style={{ minHeight: '20px' }}` (`:116`), a hand-rolled initials avatar (`:153-158`) duplicating `ui-kit` `Avatar`, a hand-rolled toggle switch (`:170-177`), the raw-palette "On Track" pill (`:75`), and a progress bar whose markup duplicates `requirement-drawer.tsx:90-92` (`:84-89`).

**Why it matters:** this file is the template for the next case-management screens (a core Centuro work area). Each pattern it forks — avatar, switch, progress bar — becomes the de facto second implementation that future code copies.

**Suggested solution:** mechanical cleanup: `cn()` throughout, `Avatar` from `ui-kit`, `min-h-5` for the inline style. Extract `ProgressBar` (track + fill, value prop) into `ui-kit` and use it in both files. Add `Switch` via shadcn when settings screens grow.

### 12. `add-trip-form.tsx` re-implements ui-kit patterns it doesn't import

**What:** beyond the duplicated hero (finding 7) and inputs (finding 1), the 746-line form hand-rolls its primary CTAs as `h-12 rounded-xl bg-foreground text-background...` instead of `PrimaryButton` (`app/trips/new/add-trip-form.tsx:404,695,716,736`), and renders sub-task preview rows with its own dot-circle markup (`:641-647`) — a third copy of the pattern in `ui-kit` `SubTaskRow` (`ui-kit/index.tsx:589-596`) and `trip-detail-view.tsx:464-470`. It also defines components inside the component body (`TransitSlot:228`, `TransitResultCard:418`), which remounts them on every render and resets focus state.

**Why it matters:** the trip form is the app's main acquisition flow and its highest-churn file. Inline component definitions are a live correctness bug waiting to surface (inputs losing focus mid-typing), and the third sub-task-row fork means read-only previews drift from the interactive rows users see post-activation.

**Suggested solution:** hoist `TransitSlot` and `TransitResultCard` to module scope (or own files). Swap CTAs to `PrimaryButton`/`SecondaryButton`. Add a `readOnly` variant to `SubTaskRow` and delete both preview forks.

---

## Nice-to-have

### 13. Typography uses arbitrary pixel values instead of a scale

**What:** `text-[17px]` for card titles (`ui-kit/index.tsx:404`, `trip-card-exploratory.tsx:65`), `text-[22px]` for hero titles (`trip-detail-view.tsx:371`, `add-trip-form.tsx:527`), and `text-[10px]` for micro-labels in 8 files (~15 uses). Everything else uses the standard scale.

**Why it matters:** three unofficial sizes that exist only as magic numbers. New code guesses between `text-[17px]` and `text-base`/`text-lg`. Pixel literals also ignore root font-size scaling, which the spec's "all sizing relative" rule (`ui-component-spec.md:217`) prohibits.

**Suggested solution:** either round to the standard scale (`text-base`/`text-lg`, `text-xl`, `text-[0.625rem]`→just use `text-xs` with tighter tracking) or, if 17/22/10 are deliberate, name them in `@theme` (`--text-card-title`, `--text-hero`, `--text-micro`) so they're chooseable, not memorable.

### 14. Radius usage is fine but unwritten

**What:** `rounded-xl` is the de facto card standard; `rounded-2xl` marks bigger surfaces (passport card `passport-card.tsx:43`, leg form cards `add-trip-form.tsx:302`, sheet tops `requirement-drawer.tsx:742,808`); `rounded-b-3xl` is the hero. All resolve through the derived `--radius` scale (`globals.css:51-57`), so this is drift in convention, not in tokens.

**Suggested solution:** write the rule down (cards = xl, sheets/featured surfaces = 2xl, hero = b-3xl) in the component spec. No code change needed.

### 15. Icon sizing has no convention

**What:** Lucide `size` values in use: 10, 11, 12, 13, 14, 15, 16, 18, 20, 22 — chosen per call site. `CheckCircle` and `CheckCircle2` are used interchangeably (`trip-detail-view.tsx:6` vs `case-detail-view.tsx:5`). `strokeWidth` is varied only in `bottom-nav.tsx:34`.

**Suggested solution:** adopt 3-4 named steps (12 inline-label, 14 row-meta, 16 row-leading, 20 header) and one check icon. A small `ICON_SIZE` const in `ui-kit` makes it self-documenting.

### 16. Transitions are ad hoc and sheets don't animate

**What:** `tw-animate-css` is imported (`globals.css:2`) but the drawers appear/disappear instantly; durations mix `duration-100` (`ui-kit/index.tsx:48,247`) and `duration-200` (`ui-kit/index.tsx:542`) without a rule; `case-detail-view.tsx:86` uses bare `transition-all`.

**Suggested solution:** fold motion into the `BottomSheet` primitive (slide-up/fade via tw-animate-css), and standardise: 100ms for press feedback, 200ms for layout/reveal.

### 17. Spec and tokens have quietly diverged in smaller ways

**What:** spec says surface is cool-grey `oklch(0.960 0.008 250)` (`ui-component-spec.md:13`); actual is neutral `oklch(0.965 0 0)` (`globals.css:76`). Spec's trip-detail hero is a destination photo with gradient overlay (`spec:137`); shipped is the purple block. Spec's home hero card has an image layer (`spec:106`); `TripCard` is image-less by design (`spec:57` says no image column, then `:106` requires one — the spec disagrees with itself).

**Suggested solution:** one pass over `ui-component-spec.md` to match shipped reality. Cheap now; expensive after the next "build it from the spec" generation run.

---

## Growth rules

Adopt these as written conventions (CLAUDE.md or the component spec) so new code stays on the rails:

- **Token-only colour.** No raw Tailwind palette colours (`red-500`, `green-50`) and no hex literals in components. If a real new colour is needed (passport gradient, visa paper), add a named token to `globals.css` first, then use it.
- **One status module.** Status→colour/label/icon mapping lives only in `ui-kit` `StatusBadge` (+ a `statusClasses` helper). New status surfaces extend it with variants; they never redefine the map.
- **Two layers, one rule for placement.** `components/ui/` = generic primitives, generated via shadcn CLI and restyled to mobile spec (Input, Select, Drawer, Switch). `components/ui-kit/` = domain composites built from tokens and primitives (TripCard, TripHero, StatusBadge). Never hand-roll a primitive shadcn already ships; never put domain components in `components/ui/`.
- **One BottomSheet.** Every overlay composes the shared sheet primitive, which owns z-index, scroll lock, Escape, focus trap, and animation. The z-index scale (`--z-nav` 50 / `--z-sheet` 60 / `--z-modal` 70 / `--z-toast` 80) lives in `@theme` and nowhere else.
- **Forms use Field/Input/Select.** The input class string is never written inline again. One input height (h-12), one focus treatment.
- **`cn()` always; arbitrary values are review flags.** Template-literal classNames, `text-[Npx]`, `z-[N]`, `bg-[#...]`, and inline `style` colour values all require justification in review, and usually mean "add a token or use the scale".
- **Interactive means focusable and tappable.** Every interactive element gets the shared `focus-visible` ring const and a ≥44px hit area, enforced at the `ui-kit` level so consumers inherit it.
- **Components over ~400 lines get a folder.** One concern per file; `requirement-drawer/` is the template for the decomposition pattern. Never define a component inside another component's body.

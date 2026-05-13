# Travel Wallet — UI Component Specification

> Handoff document for AI code writers. Covers component anatomy, information hierarchy, and layout rules for the core UI components. Does not specify colour tokens, exact type sizes, or spacing values — those live in `app/globals.css`. All sizing is relative and mobile-first (390px base, scales up).

---

## Design System Fundamentals

### Surface vs Card (two-layer background)

The app uses a two-layer background system to create visual depth:

- **`bg-surface`** (`--surface`): The page background. A light cool-grey (`oklch(0.960 0.008 250)` light / `oklch(0.110 0.006 250)` dark). Applied to `<body>` in `layout.tsx`. Never apply `bg-background` to the root layout.
- **`bg-card`** (`--card`): White. Applied to interactive cards, modals, and sheet surfaces so they appear elevated above the surface.

Rule: if an element needs to "sit on" the page, use `bg-surface`. If it needs to "lift off" the page, use `bg-card`. Never put `bg-card` on the root body.

### Card elevation

All tappable cards (TripCard, ExploratoryTripCard, requirement cards, home hero card) use `shadow-sm` to reinforce the surface/card depth relationship. Cards without a shadow on a white background look flat; on a coloured surface the shadow becomes visible and communicates elevation.

- Use `shadow-sm` on any interactive card with `bg-card`
- Do not add shadow to non-interactive containers (section headers, inline metadata rows)

### Bottom navigation

Four fixed tabs: **Home · Trips · Wallet · Profile**. Always four — do not reduce to three. Defined in `components/bottom-nav.tsx`. The nav uses `bg-background` (white) and `border-t border-border` to float above the surface.

---

## Principles

Read these before building any component. Every layout decision should trace back to one of these.

1. **Destination is the primary identifier.** City name is the largest text on a trip card. Not "Trip to India" — just "India". The destination does the emotional anchoring; dates and status are secondary metadata.

2. **Status is always visible at card level.** A user should never have to tap into a trip to know if action is required. The compliance badge (Ready / Incomplete / At Risk) appears on every trip card.

3. **Layout implies relationship — labels don't.** Two equal-weight boxes side by side communicates "these are comparable data points" without a heading. Smaller text beneath larger text communicates "this is detail for the thing above." Use structure before text.

4. **Images replace location labels.** A destination photograph or country symbol identifies the place. No "Destination:" label needed.

5. **Compliance summary scales with complexity.** 1–2 requirements: show each individually with a tick or cross. 3+ requirements: show a single count ("2 of 5 requirements complete"). The card stays scannable regardless of destination complexity.

6. **Compliance and travel essentials are never visually equal.** In trip detail, these are separate sections with distinct headers. Only compliance requirements drive the status badge. This distinction must be architecturally visible in the UI — not just a different label.

7. **Progressive disclosure.** Home → Trip → Requirement. Each level shows more detail. Nothing on a list card requires a label — context comes from the level above.

---

## Component 1 — Trip Card (List View)

Used on: Trips screen (full list), Home screen (upcoming trips section below the hero).

### Layout

Single-column padded card. No left image column.

Content, top to bottom:

| Layer | Content | Visual weight |
|---|---|---|
| 1 | Departure urgency pill | Only shown when departing within 7 days — appears above the name row |
| 2 | Flag bubble + city name | Circular flag (`w-7 h-7 rounded-full`) sits inline left of the destination name. Primary — largest text on the card. |
| 3 | Date range · purpose | Secondary — smaller, muted |
| 4 | Status badge | Coloured pill: Ready (green), Incomplete (amber), At Risk (red) |
| 5 | Compliance summary | Tertiary — see rules below |

The circular flag is a visual identifier, not a structural column. Similar flags will not dominate the card or sit adjacently when multiple cards are listed.

**Compliance summary rules:**
- 1 requirement: show the item text with ✓ or ✗
- 2 requirements: show both, each with ✓ or ✗
- 3+ requirements: show "X of Y requirements complete" — no individual items listed
- All complete (Ready): omit the compliance summary — the badge is sufficient

### Interaction
- Full card is tappable → navigates to Trip Detail
- No buttons or secondary actions on list cards
- Min tap target: full card height and width

### States

| State | Treatment |
|---|---|
| Upcoming, Incomplete | Amber badge · 1–2 outstanding items or count shown |
| Upcoming, Incomplete + departing ≤1 day | Amber left border (`border-l-4 border-l-status-incomplete`) · departure pill + badge both shown · CTA visible |
| Upcoming, At Risk | Red left border · red badge · outstanding item surfaced · visually most prominent card in the list |
| Upcoming, Ready | Green badge · no compliance summary needed |
| Past trip | No badge · muted visual treatment · dates and destination only |

---

## Component 2 — Home Screen Hero Card

Used on: Home screen only. Shows the single most imminent upcoming trip.

The hero card is an expanded version of the trip card. It is the only card on the home screen that carries a CTA.

### Layout

Full-width card (no left/right image split). Structure top to bottom:

| Layer | Content | Notes |
|---|---|---|
| 1 | Destination image | Full-width, `h-24`. Visual anchor for the card. |
| 2 | City name | Bold, prominent. Immediately below the image. |
| 3 | Date range · trip purpose | One line: "14–21 May · Business" |
| 4 | Departure pill + status badge | Shown side by side in a flex row. Departure pill ("Departing today / tomorrow") does not replace the status badge — both are visible simultaneously. |
| 5 | Top outstanding requirement + CTA | Single dark CTA block deep-linking to the outstanding requirement. Shown whenever an outstanding task exists — departure imminence does not suppress it. |

No "NEXT TRIP" label — card position and visual weight communicate its role without a redundant heading.

### States

| State | Hero card treatment |
|---|---|
| No upcoming trips | "No upcoming trips." + [+ Add a trip] CTA |
| Ready | Green badge · "You're ready to travel." · No CTA |
| Incomplete | Amber badge · top outstanding item surfaced · CTA to that item |
| At Risk | Red badge · urgent item surfaced · CTA |
| Departing today/tomorrow, Ready | Departure pill + green badge · "You're all set — safe travels." |
| Departing today/tomorrow, Incomplete | Amber left border · departure pill + amber badge · outstanding task CTA still shown — this is when it matters most |

---

## Component 3 — Trip Detail View

Accessed by tapping any trip card.

### Layout, top to bottom

**1. Back navigation**
Back arrow + page title. No additional controls needed at this level.

**2. Hero section**
Full-width destination image (same source as card image, expanded). Height: `h-56` (taller than the home hero card). The image container has `rounded-b-3xl` — soft rounded bottom corners so the image flows into the page content rather than cutting hard. A gradient overlay (`bg-gradient-to-t from-black/50 via-black/10 to-transparent`) fades the bottom of the image into the content below. The compliance status chip is overlaid at the bottom-left of the hero (`absolute bottom-3 left-4`), sitting on top of the gradient. The chip uses the same colour system as the card badge but is larger and includes an icon.

**3. Destination header**
City + Country in large text — this is the h1 equivalent for the page. No "Destination:" label.

**4. Date boxes**
Two boxes, side-by-side, equal width, equal visual weight:
- Left: small muted label "Arrival" · larger date below
- Right: small muted label "Departure" · larger date below
- Below both boxes: single line — "Business · 7 days"

Styling: `bg-card border border-border rounded-xl` — white card with outlined border. Do not use `bg-muted` here; that reads as an inactive form input. The outlined treatment communicates "structured data display", not "editable field".

**5. Days in-country row** *(only render if the destination has a days-based threshold)*
"X of Y days used this period" — a data row, not part of the date boxes.

**6. COMPLIANCE section**
- Section header: clearly labelled, visually distinct (see Section Header rules below)
- Requirement rows sorted: At Risk → Not Started → In Progress → Complete
- Each row: status icon + requirement name + chevron (→)
- Sub-tasks visible inline below each requirement row — no tap needed to see steps
- At-risk and not-started rows are visually prominent; complete rows are de-emphasised

**7. TRAVEL ESSENTIALS section**
- Full visual separation from the compliance section — section header gap is larger than the gap between requirement rows
- Section header includes a sub-label: "Does not affect compliance status"
- Content: user-uploaded documents (flight confirmation, hotel booking, etc.)
- Empty state: single [+ Add document] row

---

## Component 4 — Section Headers

Section headers (COMPLIANCE, TRAVEL ESSENTIALS, and any others) follow a consistent pattern:

- All-caps or small-caps label text
- Muted colour — readable but visually receding
- No divider lines — spacing alone creates the separation
- No containing box or card — they float above the content they label
- More space above the header than below — the header belongs to the content that follows, not the content above

---

## Component 5 — Status Communication

Status is expressed at three levels using the same colour system at different visual weights.

### The three states

| State | Colour | Meaning |
|---|---|---|
| Ready | Green | All compliance requirements met. No action needed. |
| Incomplete | Amber | Requirements exist but not all complete. Action needed before travel. |
| At Risk | Red | A requirement has passed its latest start date, or departure is imminent with incomplete items. |

### Expression at each level

**List card:**
Coloured pill badge with text label. No icon needed at this size. Positioned consistently on every card.

**Hero card:**
Same pill badge. If Incomplete or At Risk, the outstanding task is surfaced below the badge. If At Risk, urgency context is added ("Departs in 4 days").

**Trip detail — page level:**
Status chip overlaid on or immediately below the hero image. Larger than the card badge. Includes an icon (✓ for Ready, ! for Incomplete/At Risk).

**Individual requirement rows:**
Icon-only state: ✓ complete · ○ not started · → in progress · ! at risk. No text label — position and icon are sufficient. At-risk rows have a distinct left-border or background treatment.

### Rule: status never requires a tap to discover
At every level, the user sees the compliance state of a trip without opening anything. Progressive disclosure applies to the *detail* of why — not to the state itself.

---

## Structural Rules

**Responsive behaviour:**
- Base layout: 390px mobile viewport
- All sizing: relative units (rem, %, viewport units) — no fixed px in component layout
- Card image dimensions scale proportionally
- Text scales with viewport — use fluid sizing or Tailwind responsive prefixes
- Bottom nav is fixed; content scrolls above it

**Tap targets:**
- Minimum 44px height on all interactive elements
- Full-card tap areas — not just the text inside a card
- No hover-dependent interactions anywhere

**Spacing:**
- Consistent internal padding within cards
- Consistent gap between cards in a list
- Section headers: more space above than below

**Empty states:**
- Every list component has a defined empty state — not a blank screen
- Empty states have a single CTA (the most logical next action)
- No placeholder or skeleton data in production views

**Loading states:**
- Assessment (after adding a trip): named loading state — "Checking requirements for India…" — not a generic spinner
- Card lists: skeleton loading is acceptable

---

## Component 6 — Passport Card

Used on: Wallet screen (passports section). Replaces the flat list row treatment.

### Purpose
A passport is a physical object with visual identity. The card design makes it feel held, not listed.

### Layout

Full-width horizontal card. Height: ~112px. Single surface — no sections within the card.

| Zone | Content |
|---|---|
| Top-left | Flag emoji (large, ~1.75rem) + country name (bold, white, text-xl) inline |
| Top-right | "PRIMARY" label in tiny tracked uppercase (white/60% opacity) — only if `is_primary` |
| Bottom-left | Masked passport number — last 4 digits: "••• 1234" (small, white/50% opacity) |
| Bottom-right | Expiry: "Exp Jun 2028" (small, white/70% opacity) |

### Background

All passport cards use the same dark gradient — `from-[#1C2440] to-[#0D1118]`. Consistent, premium, neutral. The flag emoji provides all country identity needed without a per-country colour table.

The card uses `rounded-2xl shadow-md` to feel elevated. No border.

### Status treatment

Status is communicated through a badge overlaid at the card's bottom-right corner, not through card colour (which would conflict with the dark gradient aesthetic):

| Status | Treatment |
|---|---|
| Valid (> 12 months) | No badge — expiry date is sufficient |
| Expiring soon (≤ 12 months, > 6) | Small amber pill: "Expiring soon" overlaid above expiry date |
| Expiring (≤ 6 months, > 0) | Small red pill: "Expiring" overlaid above expiry date |
| Expired | Red pill: "Expired" + card surface dims to 70% opacity |

### Flag emoji helper

Derive flag emoji from country name using the `COUNTRIES` array in `lib/countries.ts` (name → code lookup), then convert the 2-letter ISO code to the regional indicator emoji pair. Fallback: 🌍.

### Interaction
Full card is tappable (future: navigate to passport detail). No secondary actions on the card.

---

## Component 7 — Visa Sticker

Used on: Wallet screen (authorizations section). Forward-looking component — no live DB data yet in PoC.

### Purpose
A visa is physically a sticker inside a passport. The card evokes that: a labelled, decorated document credential, clearly distinct from the passport card above it.

### Layout

Full-width horizontal card. Height: ~88px. Slightly shorter than the passport card to signal hierarchy.

| Zone | Content |
|---|---|
| Left accent | 4px solid vertical bar in status colour |
| Top-left | Flag emoji (small, ~1.1rem) + country name (medium weight, dark foreground) |
| Top-right | Visa type chip — "Business" / "Tourist" / "Work" / "Transit" etc. (small pill, muted bg) |
| Bottom-left | "Valid" label + date range: "12 Jan 2026 – 11 Jan 2027" |
| Bottom-right | Entry type: "Single entry" / "Multiple entry" (xs, muted foreground) |

### Background

Off-white/cream: `bg-[#F9F6F0]`. A subtle diagonal line pattern is applied via inline `backgroundImage` CSS:

```
repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.025) 4px, rgba(0,0,0,0.025) 5px)
```

This gives a faint striped texture that evokes a visa sticker without being decorative for its own sake.

Border: `border border-border rounded-xl`. No shadow — it sits on the page, not above it.

### Left accent colour by status

| Status | Accent colour |
|---|---|
| Active | `border-status-compliant` (green) |
| Expiring (≤ 60 days) | `border-status-incomplete` (amber) |
| Expired | `border-status-verified` (grey) |

### Visa type chip

Small muted pill (`bg-muted text-muted-foreground text-xs font-medium`). Always present — visa type is a primary identifier.

### Expired state
Full card surface opacity: 60%. Visa type chip label appended with " · Expired" (no separate badge needed — the accent bar going grey and the opacity communicate expiry).

### Empty state (no visas)
Single row in a dashed-border card: "No active authorizations" + future CTA for when visa upload is live.

### Data model (`Visa` interface)
```
id: string
user_id: string
passport_id: string
country: string
country_code: string
visa_type: 'tourist' | 'business' | 'work' | 'transit' | 'student' | 'other'
entry_type: 'single' | 'double' | 'multiple'
valid_from: string
valid_until: string
created_at: string
```

This interface should live in `lib/types.ts`.
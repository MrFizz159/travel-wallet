# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Product Context

- **PRD:** `PRD and Design/travel-wallet-prd.md` — full requirements, data model, user flows, and PoC scope. Read this before implementing any feature.
- **UI component spec:** `PRD and Design/ui-component-spec.md` — component anatomy, information hierarchy, layout rules, and state variations. Read this before building any UI.

Key constraints from these docs:
- Mobile-first (390px base). No hover-gated interactions. Min 44px tap targets. Single-column forms. Bottom sheet pattern for modals.
- Four-tab bottom nav: Home · Trips · Wallet · Profile.
- Wallet tab owns: passports, active authorizations, document repository, travel history, thresholds.
- Profile tab owns: personal information (name, nationality, residence, job details), account settings.
- Compliance status is computed from Layer 1 (compliance requirements) only — never from Layer 2 (travel essentials).
- The trip object is the primary unit. Everything — checklist, documents, travel history — hangs off it.
- PoC uses stubbed assessment results for a small set of test destinations. The assessment engine is not built.

---

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server (requires build first)
```

No test runner is configured yet.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **React 19**
- **Tailwind CSS v4** — configuration lives in `globals.css` via `@theme`, not in a separate config file
- **shadcn/ui** (Radix Nova style) + **Radix UI v1** + **Lucide React** icons
- Path alias `@/*` maps to the project root

## Architecture

```
app/          # App Router pages and layouts
components/
  ui/         # shadcn/ui primitives (generated via CLI, not manually edited)
lib/
  utils.ts    # cn() helper — combines clsx + tailwind-merge
public/       # Static assets
```

**Adding shadcn components:** use `npx shadcn@latest add <component>` — this writes into `components/ui/`. Do not manually edit generated files.

**Class merging:** always use `cn()` from `lib/utils.ts` when combining Tailwind classes conditionally.

**Theming:** CSS variables for colours and radius are defined in `app/globals.css` under `@layer base`. Dark mode is supported via the `.dark` class variant.

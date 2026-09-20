# Decisions Log

## Baseline (Phase 0)
- Branch created: `chore/frontend-hardening`
- `npm run lint`: 0 errors, 3 warnings (`Image` unused in `queue/page.tsx`, `Link` unused in `setup/page.tsx`, `no-page-custom-font` in `layout.tsx`).
- `npx next typegen; npx tsc --noEmit`: Clean pass (0 errors).
- `npm run build`: Clean pass (10/10 static pages generated).
- Pointer added to `AGENTS.md` outside generated block: `Frontend work follows docs/frontend-hardening-spec.md.`
- `seed-prompts.json` copied to `app/_data/seed-prompts.json`.
- Spec saved at `docs/frontend-hardening-spec.md`.

## Decisions

- **Decision 1 (Phase 1): Color token merge**: Merged `#606561` into `--color-ink-muted` (`#585C59`) per spec item 4.2 / Section 10.
- **Decision 2 (Phase 1): UI Primitives & SVG House Art**: Built `HouseArt` deterministic SVG component to replace all 6 Google Stitch CDN images. Removed `images.remotePatterns` from `next.config.ts`.
- **Decision 3 (Phase 1): Security Hygiene**: Removed all hard-coded credentials, access tokens, and API key defaults. Neutral placeholder used for Google AI Studio input.
- **Decision 4 (Phase 1): Timezone & Dynamic Dates**: Centralized all date/time calculations in `_lib/dates.ts` using `Intl.DateTimeFormat` with `Asia/Manila`. Eliminated all hardcoded months/years from JSX text.
- **Decision 5 (Phase 1): Step Definitions & Mock Configuration**: Unified onboarding and setup steps in `_lib/steps.ts`. Created `_lib/mock-config.ts` for AI models and generation configuration.
- **Decision 6 (Phase 1): Stub Routes & Navigation**: Created stub routes for `/dashboard/review`, `/dashboard/schedule`, `/dashboard/posts`, `/dashboard/settings`, `/login`, `/privacy`, `/terms`, `not-found.tsx`, and `dashboard/error.tsx` so all navigation links resolve cleanly without 404s.
- **Decision 7 (Phase 1): Layout Structure**: Extracted `DashboardShell` to coordinate sidebar, top header, mobile drawer navigation, and footer cleanly across all dashboard sub-routes without duplicate footers or layout shift.

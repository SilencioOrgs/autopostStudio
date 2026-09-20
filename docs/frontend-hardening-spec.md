# AutoPost Studio: Frontend Hardening Spec (Mock Mode, No Backend)

- **Repo:** `SilencioOrgs/autopostStudio`, audited at commit `c520488` ("autopost frontend")
- **Stack (from package.json):** Next.js 16.3.5 (App Router), React 19.2.8, Tailwind CSS v4, TypeScript strict
- **Audience:** an agentic coding tool (Codex CLI, Cursor, or Antigravity). Owner: Asnor.
- **Save this file as:** `docs/frontend-hardening-spec.md`. Copy `seed-prompts.json` (delivered with this spec) to `app/_data/seed-prompts.json`.

---

## 0. How to run this spec

Kickoff prompt to paste into the agent:

```
Read docs/frontend-hardening-spec.md fully. Then read AGENTS.md and the bundled Next.js docs in
node_modules/next/dist/docs/ for every Next API you use. Execute Phase 0 and Phase 1 only, then
stop and report against that phase's acceptance checklist, including verification command output.
Do not start the next phase until I reply "continue".
```

Working agreement (applies to every phase):

1. Work on branch `chore/frontend-hardening`. One commit per phase, message `phase-N: <summary>`.
2. **The design language is fixed.** Follow the Monochrome Engineering design system documented in `docs/design-system.md`. Tokenize and componentize.
3. **Frontend only.** No Supabase, no network calls, no environment variables, no API routes. Everything must run offline against mock state.
4. **Never persist secrets.** API keys and access tokens live only in component state while typing. The store keeps `last4` and boolean flags only.
5. **Next.js 16 differs from your training data.** Before using routing, `searchParams`, `useSearchParams`, Suspense requirements, metadata, or typed-routes APIs, read the matching guide in `node_modules/next/dist/docs/`. Do not edit the generated block in `AGENTS.md`; add one pointer line to this spec *outside* that block.
6. **No new dependencies** except the allow-list in section 4.4.
7. When something is ambiguous, pick the simplest option, log it in `docs/DECISIONS.md` (1 to 3 lines), and continue. Stop only for a blocking question from section 10 (each has a default you may use).
8. After each phase, run the verification commands in section 8 and include the output in your report.

---

## 1. Goal and non-goals

**Goal:** every page, section, tab, button, form, dialog and menu works and behaves correctly using realistic mock data; layouts work from 320px to 1440px+; the code is clean enough that a backend can later be attached by replacing the implementations in `app/_services/` without touching UI components.

**Non-goals:** real auth, Supabase, Facebook Graph API, Gemini calls, payments, TikTok automation, dark mode, i18n, SEO work beyond per-route metadata.

---

## 2. Baseline audit (verified in the repo)

### 2.1 Structure and function

| # | Finding | Where |
|---|---------|-------|
| S1 | Only 7 routes exist: `/`, `/get-started`, `/get-started/connect`, `/get-started/setup`, `/dashboard`, `/dashboard/prompts`, `/dashboard/queue`. | `app/` |
| S2 | Sidebar links to 4 routes that do not exist and 404: `/dashboard/review`, `/dashboard/schedule`, `/dashboard/posts`, `/dashboard/settings`. | `_design-system/tokens.ts` (`navItems`) |
| S3 | No page has state or handlers. No `<button>` has an `onClick`. `PlatformCard` supports `onSelect` but no page passes it. Three pages are marked `"use client"` without needing it. | all pages |
| S4 | 10 `href="#"` placeholders. Landing nav links to `#pricing`, which has no target section (only `#how-it-works` and `#features` exist). Footer links are dead. | `_components/footer.tsx`, prompts page, others |
| S5 | Platform cards, checkboxes, radios, toggles, selects and inputs are visually styled but uncontrolled: e.g. aspect-ratio "selected" styling is hard-coded, not bound to the radio. | `get-started/setup`, `platform-card.tsx` |
| S6 | `PlatformCard` renders `<Icon name="">` for unselected cards (empty icon element). Cards are clickable `<div>`s (not keyboard accessible). | `platform-card.tsx` |
| S7 | Footer is rendered inside `dashboard/page.tsx` only, not in the dashboard layout. Prompts and queue pages have none. | `dashboard/page.tsx` |

### 2.2 Data, content, security hygiene

| # | Finding | Where |
|---|---------|-------|
| D1 | Token-looking values are hard-coded as `defaultValue` (a Facebook-style page token; an `AIzaSy...` Google-style key). They will trip secret scanners and teach the wrong pattern. Remove. | `connect/page.tsx`, `setup/page.tsx` |
| D2 | 6 image references hot-link Stitch CDN URLs (`lh3.googleusercontent.com/aida-public/...`), plus `remotePatterns` in `next.config.ts`. These URLs can expire. | landing, connect, setup, dashboard |
| D3 | Hard-coded dates: "Oct 24", "Oct 25", chart axis "Sep 25 ... Today (Oct 24)", "May 2025" calendar mock, footer "© 2025". Current date is September 2026. | dashboard, landing, footer |
| D4 | Mock prompts differ from the owner's real data. Real data: 150 rows, 3 collections x 50, 5 columns (`No.`, `Style`, `Image Prompt`, `Facebook Caption + CTA`, `Hashtags`), 38 unique captions (max repeated 5x), 7 to 9 hashtags per row. | prompts page |
| D5 | Copy contradicts itself: connect page says "Gemini or OpenAI key", setup page says Google AI Studio only (the product uses Google AI Studio). Setup claims "client-side encryption". Model list includes a "Vision" model for image generation and unverified model names. | `connect`, `setup` |
| D6 | Fake operational strings: "v2.4 active", "Legacy Sync", plan/quota "Pro 680 / 1000", landing metrics "0 Delay / Direct Facebook API". | sidebar, connect, setup, landing |
| D7 | "Good morning, Operator" is static; header page name and follower count are static. | dashboard, header |

### 2.3 Responsive

| # | Finding | Where |
|---|---------|-------|
| R1 | Dashboard sidebar is a fixed `w-64` with no mobile treatment. On phones it eats the screen. | `sidebar.tsx`, `dashboard/layout.tsx` |
| R2 | Landing navbar hides links below `md` with no mobile menu. | `top-nav-bar.tsx` |
| R3 | Dashboard header is `h-20 px-8` with an always-full-width page switcher and text button; will overflow on phones. | `dashboard-header.tsx` |
| R4 | Hero image is fixed `h-[460px]`; floating Facebook card uses negative offsets (`-left-6`, `-bottom-6`) that cause horizontal overflow at 320 to 375px. | `app/page.tsx` |
| R5 | Inputs use 15px or 13px text (`text-body-md` / `text-body-sm`). iOS Safari zooms into inputs below 16px. | all inputs |
| R6 | Prompts floating bulk bar uses `fixed left-1/2`, so it centers on the viewport instead of the content area, and overflows on narrow screens. Search field has `min-w-[280px]`. Prompts table has 8 columns with no small-screen alternative. | `prompts/page.tsx` |
| R7 | `min-h-screen` / `h-screen` (100vh) are used for shells; on mobile browsers use `dvh`. Dashboard content wrapper has `overflow-y-auto` without a fixed height, creating ambiguous nested scrolling. | layouts |
| R8 | Dashboard chart SVG uses `preserveAspectRatio="none"`, which squashes the point markers on resize. | `dashboard/page.tsx` |

### 2.4 Code quality

| # | Finding |
|---|---------|
| Q1 | Raw hex repeated instead of tokens: `#D9CFBC` x120, `#585C59` / `#606561` x31, hover green `#245532` x12. |
| Q2 | Duplicated UI: Facebook SVG path x3, "roofing" logo tile x4, page-header pattern x3, button class strings on every button. Step lists defined 5 times (`onboardingSteps`, `setupSteps` in tokens, plus local copies in `get-started/page.tsx`, `connect/page.tsx`, `setup/page.tsx` with differing descriptions). `_design-system/tokens.ts` also exports `colors`, `fontFamilies`, `spacing` that nothing imports (only `navItems` is used); they duplicate the CSS `@theme` block. |
| Q3 | ESLint: 0 errors, 3 warnings (unused `Image` in `queue/page.tsx`; unused `Link` in `setup/page.tsx`; custom font `<link>` in `layout.tsx`). |
| Q4 | `npx tsc --noEmit` passes **only after** `npx next typegen` (the global `LayoutProps` type is generated). Do not "fix" `LayoutProps`; just run typegen before tsc. |
| Q5 | Material Symbols is loaded via `<link ...display=swap>`. With `swap`, icon ligature names (e.g. `space_dashboard`) can flash as visible text before the font loads. |
| Q6 | `next build` was not run in the audit environment (needs network for Google Fonts). Run it locally. |
| Q7 | README is still the create-next-app default. |

---

## 3. Target system design

### 3.1 Folder layout (extend the existing `_components` / `_design-system` convention)

```
app/
  _components/
    ui/                 # primitives (section 4.1)
    layout/             # shell pieces: app-shell, sidebar, drawer, header, marketing-nav, footer
  _features/            # feature modules: interactive client components + their local hooks
    onboarding/  dashboard/  prompts/  queue/  review/  schedule/  posts/  settings/
  _lib/                 # pure, testable helpers: types.ts status.ts dates.ts csv.ts hashtags.ts scheduling.ts cn.ts mock-config.ts
  _data/                # seed-prompts.json, seed-state.ts (builds demo + empty states)
  _store/               # provider.tsx reducer.ts selectors.ts persist.ts
  _services/            # prompts.ts queue.ts review.ts schedule.ts posts.ts connections.ts settings.ts (mock implementations)
  dashboard/{review,schedule,posts,settings}/page.tsx      # NEW routes
  login/page.tsx  privacy/page.tsx  terms/page.tsx  not-found.tsx
```

Add tsconfig path aliases matching the existing style: `@/_lib/*`, `@/_store/*`, `@/_services/*`, `@/_features/*`, `@/_data/*`.

Convention: `page.tsx` stays a **server component** (so `export const metadata` works) and renders a client component from `_features/` when interactivity is needed.

### 3.2 State model

One typed store: React context + `useReducer`, no state library.

```ts
type PromptStatus = "unused" | "queued" | "generating" | "ready" | "approved" | "scheduled" | "posted" | "failed";
```

Allowed transitions (enforce in the reducer; ignore or toast on illegal ones):

```
unused -> queued -> generating -> ready -> approved -> scheduled -> posted
                        \-> failed  (retry -> queued)          scheduled -> failed (retry -> scheduled)
ready -> unused   (reject)          scheduled -> approved (unschedule)
```

Entities (all in `_lib/types.ts`): `Prompt`, `Collection`, `QueueJob` (promptId, startedAt, durationMs, attempts, error?), `Draft` (imageSeed, caption, hashtags, regenerations), `ScheduledPost` (promptId, scheduledAt ISO UTC, status, failureReason?), `PostRecord`, `Settings`, `Connections`, `Notification`, `Toast`.

Rules:

- Timestamps are ISO strings in UTC; render with `Intl.DateTimeFormat` and the user's chosen time zone (default `Asia/Manila`). No date library.
- **Progress is derived from timestamps** (`(now - startedAt) / durationMs`), not counted by an interval, so a page refresh mid-generation resumes correctly.
- A single runner in the provider ticks every 1s while the tab is visible: promotes queued jobs (up to `maxConcurrent`), completes finished jobs, publishes due scheduled posts (catch-up on load too).
- Persist to `localStorage` under `autopost:mock:v1` (versioned; on version mismatch reset to seed). Debounce writes ~300ms. Sync across tabs via the `storage` event. Never persist raw keys or tokens.
- Hydration-safe: render skeletons until the store is hydrated on the client; no hydration warnings.
- `mock-config.ts` holds tunables: generation duration range (default 8 to 20s), `maxConcurrent` default 3, mock failure rate (default 0.1, seeded and deterministic), publish failure switch, mock latency for "verify" actions (~800 to 1500ms).

### 3.3 Service seam (for the later backend phase)

Components call hooks (`usePrompts()`, `useQueue()`, ...). Hooks call functions in `_services/*`. Services return Promises and, in mock mode, read and write the store. Each service function gets a one-line comment naming the future table or API it will use (e.g. `// BACKEND: supabase.from("prompts")`). UI must never touch `localStorage` or the reducer directly.

### 3.4 Seed data

- Build the demo state from `app/_data/prompts.ts` (SaaS prompt collections).
- Two seed presets built by `seed-state.ts`:
  - **Demo** (default first load): onboarding complete, Facebook page "AutoPost Studio Official" connected, AI key present (`last4` only), ~20 prompts spread across statuses so every dashboard section is populated: some `queued`, 2 to 3 `generating`, ~8 `ready`, ~14 `scheduled` over the next 2 weeks, ~60 `posted` over the last 30 days, 1 `failed` (reason: Facebook Page access token expired).
  - **New account** (empty): nothing connected, no prompts, to exercise empty states and the full onboarding flow.
- Settings has buttons for both ("Reset to demo data", "Start as new account").
- Generated and placeholder images use a deterministic SVG component `PostGraphic` (props: `title`, `aspect`), drawing product diagrams and editorial layouts in the existing tokens. It replaces every Stitch CDN image. Owner may later drop real images into `public/images/`.

---

## 4. Shared UI infrastructure

### 4.1 Primitives to build (in `app/_components/ui/`)

Build only what the pages need, styled with existing tokens. Prefer native elements (`<dialog>`, `<details>`, `<button>`, `<input>`) over custom widgets.

| Primitive | Requirements |
|-----------|--------------|
| `Button` | variants `primary` / `secondary` / `ghost` / `danger`; sizes; `loading` (spinner + `aria-busy`, disabled); icon-only variant requires `aria-label`; renders `<a>` via `Link` when `href` given; always `type="button"` unless submit. |
| `Dialog` / `ConfirmDialog` | native `<dialog>` with `showModal()`; focus moves in and returns on close; Esc closes; backdrop click closes (configurable); scroll lock; on mobile becomes a full-width bottom sheet. |
| `Drawer` | off-canvas panel for the mobile sidebar: overlay, Esc, focus trap, closes on route change, locks body scroll. |
| `Menu` / `Popover` | button-triggered menu with arrow-key navigation, Esc, outside-click close, `aria-expanded`, `role="menu"`. Used for row actions, page switcher, notifications, avatar. |
| `Tabs` | `role="tablist"`; arrow-key navigation; optional URL sync (`?tab=`). |
| `Toast` | global region with `aria-live="polite"`; variants; optional **Undo** action; auto-dismiss ~5s; pauses on hover/focus. |
| Form controls | `FormField` (label, hint, error with `aria-describedby`), `Input`, `PasswordInput` (working show/hide toggle), `Select`, `Textarea`, `Switch` (real `role="switch"`), `Checkbox`, `RadioCardGroup`, `ChipInput` (hashtags). Inputs use `text-base` (16px) below `md`. |
| `Pagination`, `EmptyState`, `Skeleton`, `Panel`, `PageHeader`, `Avatar`, `Logo`, `FacebookIcon`, `TikTokIcon` | as used across pages. `EmptyState` supports clean surface background. |
| `PostGraphic` | deterministic SVG product image, sizes via aspect ratio, never fixed pixel height. |
| `FacebookPostPreview` | reusable feed-style preview (image, caption, hashtags, Page name). Used on landing hero, review, schedule popover. |

### 4.2 Tokens

Add to the `@theme inline` block in `globals.css` and replace raw hex everywhere (Q1):

- `--color-line: #D9CFBC` (borders/dividers)
- `--color-primary-hover: #245532`
- `--color-ink-muted: #585C59` (also replaces `#606561`; log the merge in DECISIONS.md)
- status colors used by `StatusBadge` (single map in `_lib/status.ts`)

Keep utility class names in `docs/design-system.md` in sync.

### 4.3 Icons

Keep Material Symbols. Change the stylesheet `display=swap` to `display=block`, and constrain the icon box (`width: 1em; overflow: hidden`) in `.material-symbols-outlined` so an unloaded ligature never renders as long text. Silence the `no-page-custom-font` warning with a targeted `eslint-disable-next-line` and a one-line reason (it is an icon font, loaded for all routes from the root layout).

### 4.4 Dependency allow-list

| Package | Why |
|---------|-----|
| `read-excel-file` | parse `.xlsx` in the browser for the import dialog |
| `papaparse` + `@types/papaparse` | parse `.csv` |
| `vitest` (dev) | unit tests for pure `_lib` logic only |

Do **not** use the npm `xlsx` package (stale on npm). Do not add a UI kit, animation library, state library, or date library.

---

## 5. Phased plan

Each phase ends with an acceptance checklist and a commit. Stop at the end of each phase and report.

### Phase 0: Prep (no code changes to the app)

1. Create branch `chore/frontend-hardening`.
2. Read `AGENTS.md` and skim `node_modules/next/dist/docs/01-app` (routing, layouts, metadata, `searchParams`, Suspense with `useSearchParams`, client components).
3. Run baseline and record output in `docs/DECISIONS.md` under "Baseline": `npm run lint`, `npx next typegen && npx tsc --noEmit`, `npm run build`.
4. Add a pointer line to `AGENTS.md` **outside** the generated `BEGIN/END` block: `Frontend work follows docs/frontend-hardening-spec.md.`
5. Copy `seed-prompts.json` to `app/_data/`.

**Accept:** baseline recorded; branch exists; no functional changes.

### Phase 1: Cleanup and foundations (no new behavior)

1. Tokens (4.2): replace all raw hex with tokens (Q1).
2. Extract `Logo`, `FacebookIcon`, `TikTokIcon`, `Panel`, `PageHeader`, and a first version of `Button`; replace the duplicates (Q2).
3. Single source for step lists in `_lib/steps.ts` (onboarding 3 steps, setup 3 steps); delete the 5 duplicated definitions and fix inconsistent descriptions. In `_design-system/tokens.ts` delete the unused `colors`, `fontFamilies` and `spacing` exports (the CSS `@theme` block is the single source of truth) and keep `navItems`.
4. Security hygiene (D1): remove hard-coded token/key defaults; inputs start empty with neutral placeholders (`Paste your Page access token`).
5. Images (D2): replace all 6 Stitch CDN images with `PostGraphic`; delete `images.remotePatterns` from `next.config.ts`.
6. Dates (D3): create `_lib/dates.ts` (`now()`, `formatInZone`, `relativeDays`). Chart axis, "Today", calendar mock month, footer year all derive from it. No literal month/day strings remain.
7. Copy fixes (D5, D6, D7):
   - Connect page: "Bring your Google AI Studio key" (remove OpenAI).
   - Remove "client-side encryption" claim; use "Your key is hidden after you save it."
   - Remove fake versions and plan/quota strings (`v2.4 active`, `Legacy Sync`, `Pro 680 / 1000`). The sidebar widget becomes "Images generated this month: N" (derived in Phase 2; static placeholder until then).
   - Landing metrics: replace "0 Delay / Direct Facebook API" and "100% manual approval gate" with statements the product will truthfully support: "30 days of posts from one import", "You approve every post", "Posts to your own Facebook Page".
   - Model list moves to `MODEL_OPTIONS` in `_lib/mock-config.ts`, each labelled `// mock: verify against Google AI Studio docs in the backend phase`. Remove the "Vision" entry from image-generation choices. Do not invent model IDs.
8. Fix lint warnings (Q3) and icon font loading (4.3). Fix `PlatformCard` (S6): render as a `role="radio"` inside a `role="radiogroup"`, keyboard operable, no empty icon.
9. Add stub routes so nothing 404s: `dashboard/review|schedule|posts|settings` (page header + `EmptyState` "Coming next"), `login`, `privacy`, `terms`, global `not-found.tsx`, `dashboard/error.tsx`.
10. Footer (S7): render once in the marketing layout and once in the dashboard layout; dynamic year.
11. Per-route `metadata` with title template `%s · AutoPost Studio`.
12. Rewrite `README.md` (run instructions, route map, "mock mode" note) and update `docs/design-system.md` (tokens, new components).

**Accept:** `npm run lint` = 0 warnings; typegen + tsc clean; build passes; every sidebar/nav link resolves (no 404); `grep -rn "googleusercontent" app next.config.ts` returns nothing; `grep -rnE "AIzaSy|EAA[A-Za-z0-9]{6,}" app` returns nothing; `grep -rn 'href="#"' app` returns nothing except intentional in-page anchors (`#how-it-works`, `#features`, `#pricing`); no literal month names or years remain in JSX.

### Phase 2: Store, seed data, services, primitives

1. Implement `_lib/types.ts`, `_lib/status.ts` (transition table, labels, colors; `StatusBadge` consumes it), `_lib/mock-config.ts`.
2. Implement `_store/` (reducer, actions, selectors, persist, provider, hydration guard, runner) per section 3.2. Selectors needed: counts by status, next N scheduled, failed posts, review queue, posts per day for a range, generated this month, notifications.
3. Implement `_data/seed-state.ts` with **Demo** and **New account** presets (3.4).
4. Implement `_services/*` and hooks. Add `// BACKEND:` comments.
5. Build the remaining primitives (4.1).
6. Add Vitest with unit tests for: status transitions, hashtag parsing (`"#a, b  #c #a"` -> `["#a","#b","#c"]`), sheet-row to `Prompt` mapping (incl. the 5 real column headers), slot allocation (rules: posts/day, times, skip days, timezone `Asia/Manila`), date-in-zone helpers, CSV export round-trip.

**Accept:** `npm run test` green; provider mounts with no hydration warning; reloading the page keeps state; refreshing mid-generation resumes progress; primitives each have a usage in at least one page or a story-like demo route `/dev/ui` (remove or gate behind `NODE_ENV !== "production"` before finishing).

### Phase 3: Responsive shells

Implement the responsive rules in section 6 for: marketing layout (nav + mobile menu + footer), onboarding layout (header, stepper, sticky footer), dashboard layout (sidebar/drawer, header, content container).

**Accept:** at 320, 375, 768, 1024, 1440 px, on `/`, `/get-started*`, `/dashboard*`: no horizontal scrollbar; sidebar becomes a drawer below `lg`; all tap targets at least 40x40px; inputs are 16px on mobile; keyboard-only navigation reaches every shell control with visible focus.

### Phase 4: Page-by-page functionality

Build in this order, one sub-phase per commit (`phase-4a`, `4b`, ...). Each table row is a requirement; "Done when" is what you must be able to demonstrate. Every mutation shows a toast. Every list has loading (skeleton), empty, and no-results states.

**Cross-cutting rules:** list filters and tabs sync to the URL (`?q=&collection=&status=&page=&tab=`) so dashboard tiles can deep link (wrap `useSearchParams` consumers in Suspense per the Next docs). Destructive actions use `ConfirmDialog`; reversible ones (unschedule, reject, remove from queue) use toast **Undo**. Downloads (CSV/JSON export) use `Blob` + object URL, no server.

#### 4a. Landing `/`, login, legal

| Element | Behavior | Done when |
|---------|----------|-----------|
| Nav anchors (How it works, Features, Pricing) | Smooth-scroll to sections; active link follows scroll position (today "How it works" is permanently styled active); sticky offset accounts for header height. | Clicking each lands with the heading visible; active style changes on scroll. |
| Mobile menu | Hamburger below `md` opens `Drawer` with the same links plus Log in / Get started. | Works at 320px; Esc and link click close it. |
| `#pricing` (new section) | One "Free during beta" panel. **No invented prices.** Mark `TODO(content)`. | Nav link scrolls to it. |
| Log in | `/login`: email + password, "Continue" accepts anything (mock), routes to `/dashboard` if onboarding complete else `/get-started`. Banner: "Mock sign-in: no account is created." | Works, validates empty fields. |
| Get started / final CTA | Route to `/get-started`. | Both buttons work. |
| Hero preview and feature mockups | Use `FacebookPostPreview` + real seed caption; decorative mockups are `aria-hidden` and never overflow; calendar mock month derives from `now()`. | No overflow at 320px; no hard-coded month. |
| Footer | Privacy -> `/privacy`, Terms -> `/terms` (placeholder pages, marked "Placeholder: replace before launch"). Remove "Platform Status" and "Documentation" until they exist. | No dead footer links. |

#### 4b. Onboarding `/get-started` -> `/connect` -> `/setup`

Onboarding progress lives in the store (`onboarding.step`, `platform`, `pageConnected`, `keyVerified`, `testImageDone`, `completed`).

| Element | Behavior | Done when |
|---------|----------|-----------|
| Platform cards | Facebook is a selectable radio card (default selected). TikTok is disabled with "Notify me": clicking toggles a saved "notify" flag, shows toast, button changes to "You're on the list" (toggle off allowed). | Keyboard: arrow keys move, Space/Enter selects; TikTok never selectable. |
| Continue with Facebook | Enabled only when a platform is selected; routes to `/get-started/connect`. | Disabled state explained by helper text. |
| Stepper | Derived from real state (completed steps show check). Remove the hard-coded "Page linked" text; use the connected Page name from the store. | Correct on refresh and when going Back. |
| **Continue with Facebook (OAuth button)** | Opens a *mock* permission dialog styled like Facebook's: shows requested permissions and a list of 2 mock Pages (radio) with "Continue as..." and "Cancel". Choosing a Page shows a 1s connecting state, then sets connected. | Cancel leaves state unchanged; success shows the connected card. |
| Advanced manual config | Empty inputs. Validate: Page ID digits only (8 to 20); token at least 20 chars, no spaces. "Verify" runs mock latency, then connects the mock Page; error text if a field is invalid. Show/hide toggle actually toggles `type`. Token is **not** stored, only `last4`. "Where do I find these?" opens a `Dialog` with generic numbered steps (marked mock copy). | Invalid input shows inline errors with `aria-describedby`; success sets connected. |
| Connected card | Renders **only** when connected; shows Page name, mock follower count, Connected badge. "Disconnect" opens `ConfirmDialog`, then clears connection and disables Next. | Next disabled until connected; `statusText` reflects state. |
| Back / Next footer | Real navigation with guards: `/setup` without a connected Page redirects (client-side) to `/connect` with a toast. | Deep-linking to `/setup` cold is handled. |
| API key input | Empty by default; working show/hide; **Test key** button with 1.2s spinner. Valid = at least 30 chars, no spaces, mock rule: contains `invalid` -> error state "Key rejected. Check it in Google AI Studio and paste it again." Success sets `keyVerified` and stores `last4` only. The raw key is cleared from component state after success (input shows masked placeholder). | "Key works" badge appears only after a successful test. |
| Model select | Controlled; options from `MODEL_OPTIONS`; helper text under the select changes per choice. Persisted to settings. | Reload keeps choice. |
| Aspect ratio | `RadioCardGroup` controlled; selected styling driven by state; default 4:5 with "Best for Facebook feed"; persisted to settings. | Clicking or keyboard changes selection visibly. |
| Test and finish | Checklist rows derive from state (Page connected / key works / test image generated). **Generate test image** runs ~2s then shows a `PostGraphic` preview and marks the third check. | Rows show pending / done / error states correctly. |
| Draft toggle | Real `Switch`; persisted; description states it saves a draft on the Page (mock). | Toggle state persists. |
| Go to dashboard | Disabled until all 3 checks pass; sets `onboarding.completed`, routes to `/dashboard`. | Dashboard then shows populated or new-account state correctly. |

#### 4c. Global chrome (header, sidebar, drawer)

| Element | Behavior | Done when |
|---------|----------|-----------|
| Sidebar nav | `aria-current="page"` on active; badges derived from the store (prompts, queue = queued + generating, review = ready, schedule = scheduled, posts = posted); hide badge at 0; `startsWith` matching must not highlight two items. | Badges update live after actions. |
| Sidebar widget | "Images generated this month: N" (derived). `TODO(backend): real Google AI Studio quota`. | No fake limits. |
| "Creator support" | Replace with "Help" opening a dialog containing the setup checklist (derived from onboarding state) and the Reset/Start-new-account shortcuts. | No dead item. |
| Page switcher | Menu listing connected Pages (1 mock, current checked) and "Connect another Page" -> `/get-started/connect`. Shows name + follower count from the store; truncates on small screens. | Keyboard operable. |
| "Sync active" chip | Derived: "Runner active" when queue is running, "Queue paused" when paused. | Reflects Pause/Resume. |
| New prompt batch | Opens the shared **Add to queue** dialog (choose collection, count N, sequential or random, only `unused` prompts). | Adds N jobs, toast "Added N to queue" with link. |
| Notifications | Popover from derived events (generation finished, review ready, post failed, token nearing expiry). Unread dot/count; "Mark all read"; empty state. Click an item routes to the relevant page. | Read state persists. |
| Avatar menu | Settings, "Reset to demo data", Log out (clears mock session, routes to `/`). | All three work. |

#### 4d. Dashboard `/dashboard`

| Element | Behavior | Done when |
|---------|----------|-----------|
| Greeting | Time-of-day greeting in the chosen time zone; name from settings (default "Operator"). Status line derived (`N images are ready for your review` / all caught up). | Changes with data. |
| Import sheet | Opens the shared **Import dialog** (see 4e). | Imported prompts appear in counts. |
| "Preset filters" | Replace with a range select: Last 7 / 30 / 90 days; drives chart and totals. (Log in DECISIONS.md.) | Chart and stats change. |
| Pipeline tiles | Counts derived. Each tile is a link: Prompt library `/dashboard/prompts?status=unused`, Generating `/dashboard/queue`, Ready `/dashboard/review`, Scheduled `/dashboard/schedule`, Posted `/dashboard/posts`. "Action" badge shows only when review count > 0; pulsing only while jobs run (and respect reduced motion). | Each navigates with filter applied. |
| Up next list | Next 3 scheduled posts (real data, relative date labels). "View calendar" -> `/dashboard/schedule`. Row menu: Edit in review, Reschedule (opens schedule with that post), Unschedule (Undo toast). Empty state when none. | Menu actions change status and counts. |
| Needs attention | Cards derived from state and hidden at 0. "Review now" -> `/dashboard/review`; "See why" -> `/dashboard/posts?status=failed` with that row expanded. Failure text comes from the failed post's reason. | Resolves after retry succeeds. |
| Active batch card | Derived stats (approval rate = approved / decided; average generation time from finished jobs). Hidden when no batch. | No hard-coded "94%" / "42s". |
| Chart | Real posts-per-day from store for the selected range; viewBox scaled without `preserveAspectRatio="none"` (R8); axis labels derived; focusable points with tooltip (date + count); text alternative for screen readers (`<title>` + summary line). | Correct on resize; no squashed markers. |

#### 4e. Prompt library `/dashboard/prompts`

| Element | Behavior | Done when |
|---------|----------|-----------|
| Data | Seeded from the 150 real prompts. Columns: select, No., Style, Image prompt, Caption, Hashtags (first 2 + "+N"), Status, actions. Add a small "Caption used N times" badge when a caption repeats. | 3 collections x 50 visible via filters. |
| Search | Debounced 200ms over prompt, caption, hashtags, style; input `w-full` (no `min-w`). | Typing filters and syncs `?q=`. |
| Collections / Status / Quick filters | Real filters with live counts. Quick filters: Favorites (star toggle per row), Recently imported (last import batch), Missing hashtags (`hashtags.length === 0`). Active filter highlighted; "Clear filters". | Combination filtering works; counts match table. |
| Sort and pagination | Sortable by No. and Status; page size 10 / 25 / 50; footer text derived ("Showing 1 to 10 of 150"); page buttons real, with ellipsis logic. | Page state in URL. |
| Selection | Per-row and header checkbox (page), "Select all N matching" link; selection persists across pages and filters; no rows are pre-checked. | Bar count matches Set size. |
| Bulk bar | Renders only when selection > 0, **sticky inside the content column** (not `fixed left-1/2`). **Add to queue**: skips ineligible (already queued/posted) and reports "Added 3, skipped 1". **Export selected**: downloads CSV with the same 5 columns as the source sheets. **Delete**: confirm. **Clear selection**. | Works across pages; icon-only labels on mobile. |
| Row menu | Edit, Duplicate, Favorite, Add to queue, Delete (confirm). | Each mutates the store and updates counts. |
| New / Edit prompt | `Dialog` with fields: collection (select, or create new), image prompt (min 20 chars), caption (required), hashtags (`ChipInput`: split on space/comma/newline, auto `#`, dedupe). Validation messages inline. | Created prompt appears with status `unused`. |
| **Import dialog** | Steps: (1) drop or browse `.xlsx` / `.csv` (max 5 MB, drag-over state); (2) auto-map columns by header, exact match for `No.`, `Style`, `Image Prompt`, `Facebook Caption + CTA`, `Hashtags`, with manual `Select` override; (3) preview first 5 rows + validation summary (missing prompt/caption rows listed by row number; duplicates by identical image prompt with "Skip duplicates" toggle); (4) confirm "Import N prompts". Unknown Style creates a collection. Wrong file type or empty sheet shows an error. | Importing the three real sheets works and yields 150 prompts (or skips duplicates). |
| Small screens | Below `md`, render rows as cards (same actions, same selection); filters collapse into a "Filters" button opening a `Drawer`. | No horizontal scroll at 320px. |
| Empty states | No prompts: `EmptyState` with **Import prompt sheet**. No results: **Clear filters**. | Both reachable via the New account preset. |

#### 4f. Queue `/dashboard/queue`

| Element | Behavior | Done when |
|---------|----------|-----------|
| Header status line | Derived (`N rendering, N queued, N ready`). | Matches sections. |
| Pause / Resume | Toggles the runner (persisted). Label and icon switch. Paused jobs keep their progress. | Progress freezes and resumes correctly. |
| Add prompts to queue | Opens the shared **Add to queue** dialog (same as header). | Jobs appear as `queued`. |
| Stat cards | Derived counts and average time. | No hard-coded values. |
| Currently generating | Up to `maxConcurrent` jobs; progress bar and "~Ns remaining" from timestamps; completes -> `ready`, toast + notification. Step text (e.g. "Step 28/40") derived from progress. Mock failures follow `mock-config` (deterministic). | Leave the tab, come back: progress correct. |
| Ready for review | Thumbnail (`PostGraphic`), **Preview** opens a `Dialog` with image + caption + hashtags; **Review all** -> `/dashboard/review`. | Both work. |
| Queued | Reorder via "Move to top" and "Move up/down" menu (drag optional); **Remove** with Undo. | Order persists. |
| Failed (new section) | Shows reason; **Retry** (attempts + 1), **Edit prompt**, **Remove**. Hidden when none. | Retry re-enters the queue. |
| Empty state | "Nothing in the queue yet" with **Choose prompts from your library**. | Shown in New account preset. |

#### 4g. Review `/dashboard/review` (new route)

| Element | Behavior | Done when |
|---------|----------|-----------|
| Layout | Header "Review" with position "3 of 8", prev/next buttons and `ArrowLeft`/`ArrowRight` keys; strip of thumbnails to jump. Left: 4:5 image preview (`PostGraphic`). Right: editors. Stacks vertically on mobile with sticky action bar. | Keyboard and touch both work. |
| Image actions | **Regenerate**: 2 to 3s mock, new `imageSeed`, increments `regenerations`. **Edit prompt**: dialog edits the prompt, then offers Regenerate. | Image visibly changes. |
| Caption editor | Textarea with live character count and an emoji picker (fixed set: 🏡 🌿 🇵🇭 ✨ ❤️ 🌴 🤎 ☕ 🌾) inserting at the cursor. | Edits persist to the draft. |
| Hashtags | `ChipInput` (Enter/comma/space adds, Backspace removes last, dedupe, auto `#`). | Chips persist. |
| Edit / Preview | `Tabs`; Preview renders `FacebookPostPreview` from the draft. | Preview matches edits. |
| Duplicate-caption warning | Banner when the same caption exists on other prompts or posts: "This caption was used in N other posts." **Rewrite caption** inserts a variant from a small local list of Taglish captions (mock; `TODO(backend): Gemini text`). | Banner disappears after the caption changes. |
| Reject / Approve / Approve and schedule | Reject: status back to `unused`, Undo toast. Approve: status `approved`, advance to next. **Approve and schedule**: assigns the next free slot per posting rules, status `scheduled`, toast shows the date/time with a link. If no slot is free in 60 days, show an error toast. | Sidebar badges and dashboard update instantly. |
| Empty state | "Nothing to review" -> Queue. | Shown when review count is 0. |

#### 4h. Schedule `/dashboard/schedule` (new route)

| Element | Behavior | Done when |
|---------|----------|-----------|
| View tabs | Month / Week / List (`Tabs`, synced to `?view=`). Prev / Next / Today controls; month title in the chosen time zone. | All three views render the same data. |
| Month grid | Days show up to 3 thumbnails + "+N"; today highlighted; days outside the month dimmed. Below `md`: dots per day; tapping a day opens the day's list in a bottom `Dialog`. | Usable at 320px. |
| Moving posts | Desktop: drag a thumbnail to another day (HTML5 DnD, keep the time). Everyone: post menu **Reschedule** opens a date + time dialog (keyboard-accessible alternative). Past dates are rejected. | Both methods update the post. |
| Post popover | Click a post: `FacebookPostPreview`, time, actions: Edit in review, Reschedule, **Post now** (mock publish, ~1.5s, moves to Posts), Unschedule (Undo). | Actions update counts. |
| Posting rules panel | Posts per day (stepper 1 to 5), editable time chips (time inputs), skip-days toggles, time zone select (short IANA list, default `Asia/Manila`). Persisted in settings; shown also in Settings > Posting (same component). Changing rules never rewrites existing scheduled posts. | Values persist; validation prevents duplicate times. |
| **Fill the next 14 days** | Allocates approved posts to free slots per rules; result toast "Scheduled N posts (M approved left)". Hint text "N approved posts waiting for a slot" derived. Disabled with reason when none approved. | Idempotent: pressing twice does not double-book. |
| Empty slots | Dashed outline; "+" opens "Pick an approved post" dialog. | Selecting assigns the slot. |
| Auto-publish (mock) | When app is open, due posts publish automatically (tick + catch-up on load). Honors the "Simulate expired Facebook token" dev switch (Settings) so failed states can be tested. | Failed post appears on Posts + Dashboard attention. |

#### 4i. Posts `/dashboard/posts` (new route)

| Element | Behavior | Done when |
|---------|----------|-----------|
| Filters | Date range presets (7 / 30 / 90 days / all), status (Posted / Scheduled / Failed), collection, search. URL-synced. | Combination works. |
| Table | Thumbnail (4:5), caption (2 lines), collection chip, posted/scheduled time in the chosen zone, status chip. Cards on mobile. Sort by time; pagination. | Correct at all widths. |
| View on Facebook | Mock posts have `fbPostUrl: null`; render the control **disabled** with tooltip "Link becomes available once posting is live". Never link to a fake permalink. | No misleading links. |
| Failed row | Expands inline: reason + **Reconnect Page** (-> `/get-started/connect`) and **Retry post** (mock republish; fails again while the token switch is on). Deep link `?status=failed` auto-expands the first failed row. | Retry success moves it to Posted. |
| Export | **Export CSV** of the filtered rows. | Downloads a valid CSV. |
| Empty state | "No posts yet" -> Review / Schedule. | New account shows it. |

#### 4j. Settings `/dashboard/settings` (new route)

Tabs (`?tab=`): **Connections | Image generation | Posting | Account**. A form tab shows **Save changes** / **Discard** when dirty and warns before navigating away with unsaved edits.

| Tab | Behavior | Done when |
|-----|----------|-----------|
| Connections | Facebook: connected Page card with token status ("valid for N more days" from mock `tokenExpiresAt`; turns to "Expired" when the dev switch is on), **Reconnect** (mock OAuth dialog), **Disconnect** (confirm). Google AI Studio: masked key `•••• last4`, **Test key**, **Replace key** (inline input with the same validation as onboarding), **Remove key** (confirm). TikTok: "Coming soon" + Notify me toggle (shared flag). | Disconnecting flips the header, dashboard and onboarding state. |
| Image generation | Default model (`MODEL_OPTIONS`), default aspect ratio, max concurrent jobs (1 to 3). Affects new jobs only. | Queue respects `maxConcurrent`. |
| Posting | The shared posting-rules component from 4h; "Require approval before scheduling" switch (default on; off = auto-schedule when generation finishes). | Values shared with the Schedule page. |
| Account | Display name, email (mock, read-only). **Reset to demo data**, **Start as new account**, **Export all data (JSON)** (secrets excluded), **Dev tools** (visible in development only): "Simulate expired Facebook token", mock failure rate. Danger zone: **Delete all data and disconnect** requires typing `DELETE`; red is used only on that control. | Each action works and shows a toast. |

**Accept (Phase 4):** every row in every table above is demonstrably working; run the interaction checklist in section 9 and paste it completed.

### Phase 5: QA and tests

1. Walk the QA checklist (section 9) at all five viewports; fix defects; re-run.
2. Run `npm run test`, lint, typegen + tsc, `npm run build`, then `npm run start` and re-check the top flows in the production build (hydration issues often appear only there).
3. Search for leftovers with the commands in section 8 (dead links, `console.log`, `TODO` without owner, unused exports/files).
4. Test both seed presets end to end: **New account** (complete onboarding from `/` to a scheduled post) and **Demo**.
5. Optional stretch (only if everything above is green): one Playwright smoke test that walks onboarding -> import -> queue -> review -> schedule. Do not add Playwright without asking.

**Accept:** section 8 fully green; QA checklist complete with any known gaps listed in `docs/DECISIONS.md`.

### Phase 6: Documentation and backend handoff (documentation only)

1. Update `README.md` (run, test, route map, mock mode, how to reset state).
2. Update `docs/design-system.md` (tokens, primitives, patterns like `HouseArt`).
3. Create `docs/BACKEND_HANDOFF.md` containing:
   - A table of every `_services/*` function: name, input type, output type, current mock behavior, and the intended real source (Supabase table/RPC, Facebook Graph API, or Google AI Studio call).
   - A **draft** entity list derived from `_lib/types.ts` (tables and key columns) and the status enum and transitions.
   - Secrets policy: keys and tokens are stored server-side only; the UI only ever receives `last4`, `hasKey`, `expiresAt`.
   - Facts the UI already assumes: 4:5 default images, `Asia/Manila` default time zone, 7 to 9 hashtags per post, approval gate default on.
   - Open questions for the backend phase: Facebook app review requires a public privacy policy URL (the `/privacy` placeholder must be replaced), exact Google AI Studio image model IDs to use, rate limits and quota handling, how scheduled publishing runs (cron/queue) once the browser is closed.

**Accept:** a new developer can read the two docs and know exactly what to implement to go live.

---

## 6. Responsive specification

Use Tailwind's default breakpoints: base (320+), `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Design mobile first; add up.

### 6.1 Global rules

- Page container: `px-4 sm:px-6 lg:px-8`, `max-w-7xl mx-auto`. No fixed pixel heights for images; use `aspect-*` and `w-full`.
- Use `min-h-dvh` / `h-dvh` instead of `100vh`. Exactly one vertical scroll container per screen (body scroll; sidebar is `sticky top-0 h-dvh`). Remove the `overflow-y-auto` wrapper from `dashboard/layout.tsx` unless it gets a definite height.
- Any wide content (tables, code, calendars) scrolls inside its own `overflow-x-auto` wrapper; the page body never scrolls sideways.
- Tap targets at least 40x40px (icon buttons get padding, not just a larger icon).
- Inputs, selects and textareas: `text-base` (16px) below `md`, `text-sm` allowed from `md` up.
- Sticky footers/bars respect `env(safe-area-inset-bottom)`.
- Long text (`truncate`, `line-clamp`, `min-w-0` on flex children) so names, captions and hashtags never force overflow.
- Negative offsets for decorative elements (`-left-8`, `-bottom-6`) must be wrapped so they cannot exceed the viewport (`overflow-x-clip` on the section, or use `left-2` below `md`).

### 6.2 Component behavior

| Component | < 640 (`base`) | 640 to 1023 (`sm`, `md`) | >= 1024 (`lg`+) |
|-----------|----------------|--------------------------|-----------------|
| Marketing nav | Logo + hamburger (drawer with links and both CTAs) | same as base until `md` | Inline links + Log in + Get started |
| Landing hero | Single column, image `aspect-[4/5]` capped `max-h`, floating post card sits inside the image area (not outside) | Single column, larger | Two columns; floating card may overhang |
| Onboarding header/footer | Footer buttons stack (Back above Next), full-width Next; status text hidden | Row layout | Row layout |
| Stepper (horizontal) | Numbers only, current label shown below | Numbers + labels | Numbers + labels |
| Setup layout | Stepper card collapses to a compact progress bar above the form | Single column | 4 / 8 column split, sticky left card |
| Dashboard shell | Sidebar hidden; header hamburger opens `Drawer`; header `h-14`; page switcher shows avatar + truncated name; "New prompt batch" becomes icon-only | Same drawer; header `h-16` | Static 256px sidebar; header `h-20` |
| Pipeline tiles | 2 columns (last tile spans 2) | 3 columns | 5 columns |
| Dashboard columns | Stacked | Stacked | 7 / 5 split |
| Prompts | Card list, filters in a `Drawer`, bulk bar sticky bottom with icon-only actions | Table with horizontal scroll, filter rail stacked above | Filter rail (3 cols) + table (9 cols) |
| Queue rows | Two-line layout: title + meta on top, status + time below; actions in a menu | Single row | Single row |
| Review | Image on top, editors below, sticky action bar | Two columns | Two columns |
| Schedule | Month shows dots; day list in bottom sheet; rules panel below the calendar in an accordion | Calendar + rules below | Calendar + right rail |
| Posts | Card list | Table with horizontal scroll | Table |
| Settings | Tabs become a horizontally scrollable tab bar | same | Tabs left rail (optional) or top bar |
| Dialogs | Bottom sheet, full width, max 90dvh, internal scroll | Centered, `max-w-lg` | Centered |

### 6.3 Viewport matrix (test each)

`320x568`, `375x667`, `768x1024`, `1024x768`, `1440x900`. Also test 200% browser zoom at 1280 wide (behaves like ~640).

### 6.4 Overflow debugging snippet (run in DevTools console)

```js
[...document.querySelectorAll("*")].filter(
  (el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1
);
```

---

## 7. Accessibility and quality bar

- **Landmarks:** exactly one `<main>` per page; a "Skip to content" link as the first focusable element; `<nav aria-label>` on each nav.
- **Focus:** visible `focus-visible` ring (token-based) on every interactive element; never remove outlines without a replacement. Dialogs and drawers trap and restore focus.
- **Semantics:** buttons are `<button type="button">`; links are `<a>`/`Link`; radio and switch controls use real inputs or correct ARIA roles; tabs use `role="tablist"`; the active nav item has `aria-current="page"`.
- **Labels:** every input has a `<label>`; every icon-only button has `aria-label`; decorative icons `aria-hidden`.
- **Motion:** `animate-ping`, `animate-pulse`, `animate-spin` must be disabled under `prefers-reduced-motion: reduce` (global CSS rule).
- **Contrast (measured on the current tokens):**

  | Pair | Ratio | Action |
  |------|-------|--------|
  | `text-muted` `#71717A` on background `#FFFFFF` | 4.61:1 | passes WCAG AA for text |
  | `text-foreground` `#09090B` on background `#FFFFFF` | 19.8:1 | passes WCAG AAA for text |
  | `#A1A1AA` on dark `#09090B` | 7.82:1 | passes WCAG AAA for text |
  | white on Facebook blue `#1877F2` | 4.23:1 | keep brand color, use 14px+ semibold for button text |
  | `text-foreground` on surface `#18181B` | 15.2:1 | passes: use for all secondary text |

  Rule: high-contrast monochrome tokens ensure full WCAG compliance. Any text uses `--foreground` or `--muted`.
- **States:** every async action shows a loading state; every list has empty, loading, and error states; errors say what happened and what to do next (no apologies), per the existing copy tone.
- **Performance:** no layout shift from icon fonts (4.3); memoize selectors; lists over 100 rows are paginated (never render all 150 at once).

---

## 8. Definition of done and verification commands

All must pass before the work is considered complete:

```bash
npm run lint                                   # 0 errors, 0 warnings
npx next typegen && npx tsc --noEmit           # clean
npm run test                                   # Vitest green
npm run build                                  # succeeds (needs network for Google Fonts)

# leftovers (each must print nothing, except noted)
grep -rn 'href="#"' app                                   # none
grep -rn "googleusercontent" app next.config.ts           # none
grep -rnE "AIzaSy|EAA[A-Za-z0-9]{6,}" app                 # none (no key/token-like literals)
grep -rn "console\.log" app                               # none
grep -rnE "#D9CFBC|#245532|#585C59|#606561" app --include=*.tsx   # none (tokens only)
grep -rnE "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* [0-9]{1,2}|20(2[0-9])" app --include=*.tsx   # review hits: only date literals in JSX text are violations (ignore code like "Decision 1")
grep -rn "localStorage" app | grep -v "_store/persist.ts"  # none: UI never touches storage
```

Behavioral requirements:

- Zero console errors or warnings and no hydration warnings on any route, in both `npm run dev` and `npm run start`.
- Every route reachable from the UI; every visible control does something or is visibly disabled with a reason.
- No `404` from any link or nav item; unknown URLs render `not-found.tsx`.
- No horizontal scroll at any viewport in 6.3.
- Refresh preserves state; **Reset to demo data** and **Start as new account** both work from any page without a crash.
- No secret ever appears in `localStorage` (verify in DevTools > Application after completing onboarding with a fake key).

---

## 9. QA checklist (paste back completed)

Route x viewport smoke (mark each: OK / issue):

| Route | 320 | 375 | 768 | 1024 | 1440 |
|-------|-----|-----|-----|------|------|
| `/` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/login` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/get-started` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/get-started/connect` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/get-started/setup` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/dashboard` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/dashboard/prompts` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/dashboard/queue` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/dashboard/review` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/dashboard/schedule` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/dashboard/posts` | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/dashboard/settings` (all 4 tabs) | [ ] | [ ] | [ ] | [ ] | [ ] |
| `/privacy`, `/terms`, unknown URL | [ ] | [ ] | [ ] | [ ] | [ ] |

End-to-end flows (New account preset, then again on Demo where noted):

- [ ] Landing -> Get started -> Facebook -> mock OAuth -> connect Page -> add key -> test key -> generate test image -> finish -> dashboard shows empty states.
- [ ] Import the three real `.xlsx` sheets (150 prompts) -> counts and collection filters correct.
- [ ] Select 5 prompts -> Add to queue -> watch generation -> jobs reach Ready -> notification + sidebar badge appear.
- [ ] Pause and Resume; refresh mid-generation; progress resumes.
- [ ] Review: edit caption and hashtags, regenerate, reject one (Undo), approve one, approve-and-schedule one.
- [ ] Schedule: Fill next 14 days; drag one post to another day; reschedule via dialog; unschedule (Undo); Post now.
- [ ] Turn on "Simulate expired Facebook token" -> a post fails -> dashboard "Needs attention" -> Posts failed row -> Reconnect / Retry.
- [ ] Settings: change model and aspect ratio (affects new jobs), edit posting rules (Schedule reflects them), export JSON (no secrets), reset to demo, delete all data (typed `DELETE`).
- [ ] Keyboard-only pass: onboarding, prompts table selection, a dialog, the mobile drawer, review with arrow keys.
- [ ] Screen-reader spot check (VoiceOver or NVDA): nav, a dialog, the toast region, tabs.

---

## 10. Owner decisions (defaults are pre-approved; only ask if you disagree)

| Question | Default the agent should use |
|----------|------------------------------|
| Pricing content on landing | Single "Free during beta" panel, no prices. |
| Privacy / Terms text | Placeholder pages clearly marked "replace before launch". |
| "New prompt batch" button meaning | Opens the Add to queue dialog. |
| "Preset filters" button on dashboard | Replaced by a 7 / 30 / 90 day range select. |
| Default seed on first load | Demo preset (onboarding complete). |
| Real model IDs for image generation | Mock labels only; verified during backend phase. |
| Real Stitch images | Replaced by `HouseArt`; owner can drop real images into `public/images/` later. |
| TikTok | Stays a disabled "Coming soon" option with a Notify me flag. |
| Merge of `#606561` into `#585C59` | Approved. |
| Playwright | Not added unless the owner says so. |

**Out of scope, do not start:** Supabase schema, auth, API routes, Facebook or Gemini integrations, deployment config. The backend phase is a separate task that starts from `docs/BACKEND_HANDOFF.md`.

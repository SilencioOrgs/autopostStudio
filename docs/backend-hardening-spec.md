# AutoPost Studio (aistudio): Backend Hardening Spec

- **Repo:** `SilencioOrgs/aistudio`, audited at commit `adef6b0`
- **Stack (from package.json):** Next.js 16.3.5 (App Router), React 19.2.8, Supabase (`@supabase/ssr` + `supabase-js`), zod 4, SWR, `@google/genai`
- **Audience:** an agentic coding tool (Codex CLI, Cursor, or Antigravity). Owner: Asnor.
- **Save as:** `docs/backend-hardening-spec.md`. Save `env.example` (delivered with this spec) over `.env.example`.
- **Supersedes:** the "frontend only / no Supabase / mock mode" rules in `docs/frontend-hardening-spec.md` and `README.md`. UI rules in that file (design tokens, responsive, accessibility) still apply.

---

## 0. Read first: security incident (human actions, do these before any agent work)

`.env.example` was committed at `4d95c51` and is still in `HEAD`. It contains **real** Supabase keys for project ref `tzkiadgxwomipreefaau`: an `anon` key and a **`service_role` key** (the JWT payloads decode to `role: service_role` and `role: anon`, expiry year 2036). The repository can be cloned without credentials, so it is public. The `service_role` key bypasses Row Level Security and gives full read/write access to every table, user, and storage object in the project. Treat it as compromised.

**Owner does now (agent cannot do this):**

1. **Rotate the Supabase keys.** In the Supabase dashboard, open Project Settings, then the API / JWT keys area. Roll the `service_role` (secret) key. If you use the legacy JWT secret, rotating it changes both keys and signs everyone out; that is acceptable at this stage. Menu names change over time, so follow the current dashboard wording.
2. Put the new values in your local `.env.local` **and** in Vercel Environment Variables, then redeploy. Never paste them into chat, issues, or commits.
3. Set a real `CRON_SECRET` (32+ random bytes; it is empty in the template) and confirm `ENCRYPTION_KEY` is a 32-byte base64 value. Note: changing `ENCRYPTION_KEY` later makes existing encrypted tokens unreadable.
4. In the Supabase dashboard, check Authentication > Users and the logs for sign-ups or activity you do not recognize since the commit date. Check Storage buckets too.
5. On GitHub: Settings > Code security, enable **secret scanning** and **push protection**. Strongly consider making the repository **private**; nothing in it needs to be public.
6. Scrubbing history (optional, after rotating): `git filter-repo --path .env.example --invert-paths` then force-push. This rewrites history; the agent must **not** run it. Rotation is what protects you; scrubbing only reduces noise.

**Agent does in Phase 0:** replace `.env.example` with placeholders (use the delivered `env.example`), add a secret-scan script, and add env validation. See Phase 0.

---

## 1. How to run this spec

Kickoff prompt to paste into the agent:

```
Read docs/backend-hardening-spec.md fully. Then read AGENTS.md and the bundled Next.js docs in
node_modules/next/dist/docs/ (especially the authentication guide and the proxy file convention)
for every Next API you use. Execute Phase 0 and Phase 1 only, then stop and report against each
task's acceptance criteria with verification output. Do not start the next phase until I reply
"continue". Never print, echo, log, or commit any environment variable value.
```

Working agreement (applies to every phase):

1. Branch `chore/backend-hardening`. One commit per phase, message `phase-N: <summary>`.
2. **Secrets:** `.env.local` exists on the owner's machine. Never print, echo, log, paste, or commit values. To check configuration, use `node scripts/check-env.mjs` (Phase 0), which prints only present/absent and length checks.
3. **Database changes go in new migration files** under `supabase/migrations/` with a later timestamp. Never edit `20260919000001_init.sql`.
4. **The agent never touches the hosted Supabase project.** Do not run `supabase db push`, `db reset`, or execute SQL against production. Write migrations and tests, verify on a local stack (`npx supabase start`, requires Docker) if available, and otherwise finish with an "Apply manually" checklist for the owner listing each migration in order.
5. **Next.js 16 differs from your training data.** Read the relevant guide in `node_modules/next/dist/docs/` before using proxy, route handlers, `cookies()`, `params`, caching, or route segment config. Do not edit the generated block in `AGENTS.md`; change the pointer line outside it to also reference this spec.
6. Allowed new dependencies: `server-only`, `vitest` (dev), and whichever spreadsheet parser Phase 4 selects. Nothing else without asking.
7. Ambiguity: choose the simplest safe option, log it in `docs/DECISIONS.md` (1 to 3 lines), continue. Owner decisions in section 8 have defaults.
8. End of every phase: run the verification commands in section 6 and paste the output. Do not claim a fix without showing the test or command that proves it.

---

## 2. Audit baseline (verified by reading the code)

Baseline tooling: `npm run lint` passes with 0 warnings; `npx next typegen && npx tsc --noEmit` is clean; no tests exist; `next build` was not run (needs network for fonts).

Severity: **C** critical, **H** high, **M** medium, **L** low.

### 2.1 Critical

| ID | Finding | Where |
|----|---------|-------|
| C1 | Live Supabase `service_role` and `anon` keys committed and public (section 0). | `.env.example` |
| C2 | The worker endpoint **fails open**: it only checks the bearer token `if (cronSecret && ...)`, and `.env.example` ships `CRON_SECRET=` empty, so an unset secret means anyone can trigger it. Comparison is not constant-time. It only accepts `POST`, nothing schedules it (no `vercel.json`, no `pg_cron`), and there is no `maxDuration`. | `api/worker/tick/route.ts` |
| C3 | **Encrypted secrets cannot round-trip.** PostgREST returns `bytea` as a `\x...` hex string; `decrypt()` calls `Buffer.from(value, "hex")`, which returns an empty buffer for a leading `\` (confirmed in Node: `Buffer.from("\\x6162","hex").length === 0`), so `decrypt` throws "payload is too short". Also, two route families write different encodings: `api/facebook/pages` and `api/settings/ai-key` store plain hex (which Postgres stores as ASCII text bytes), while `api/integrations/facebook` and `api/keys/provider` prefix `\\x`. Onboarding uses the first family, Settings uses the second. Confirm with the round-trip test in task 1.1; if confirmed, image generation, Facebook verification and post retry all fail today. | `_lib/crypto.ts`, 4 routes |
| C4 | **Scheduling never publishes.** Scheduling a card only writes DB rows. The only caller of `publishPostToFacebook` is `posts/[id]/retry`. The job type `publish_post` exists in the schema but is never created or handled. Additionally `posts.upsert(..., { onConflict: "card_id" })` targets a column with no unique constraint, so Postgres rejects it and the error is ignored: the `posts` row is likely never created. | `board/cards/[id]`, `services/queue.ts`, migration |

### 2.2 High

| ID | Finding | Where |
|----|---------|-------|
| H1 | **Open redirect:** `next` query param goes straight to `router.push` (e.g. `?next=https://evil.example`). | `_components/auth/simple-auth-card.tsx` |
| H2 | RLS uses `FOR ALL` owner policies on **server-owned** tables. With only the anon key and their own JWT a user can call PostgREST directly and: insert/alter `jobs` (payload, attempts, `locked_by`), forge `posts`, delete their own `rate_limits` rows, edit `activity_log`, change `profiles` protected columns (`terms_accepted_at`, `onboarding_completed_at`, `daily_post_cap`), and read the ciphertext columns of `facebook_pages` / `provider_keys`. | migration |
| H3 | `PATCH /api/board/cards/[id]` accepts a client-supplied `status` (`published`, `publishing`, `failed`). `scheduledAt` is not validated (past or far-future). Facebook native scheduling is only used between 10 minutes and 30 days ahead; **outside that window the code falls through to an immediate publish**. Daily cap is checked only when the column changes, by counting cards regardless of status, without locking. | `board/cards/[id]`, `services/facebook.ts` |
| H4 | After a 429, the worker sets `profiles.generation_paused = true` and logs "auto-resume in 15 minutes", but **nothing ever clears it** (only manual resume or saving a new key). Users stall forever. | `services/queue.ts` |
| H5 | `POST /api/posts/[id]/retry` publishes any post regardless of status (a `published` post is republished) and has no lock (double click = duplicate Facebook posts). | `posts/[id]/retry` |
| H6 | `xlsx@0.18.5` (npm) parses user-uploaded files on the server. Known advisories: prototype pollution (CVE-2023-30533) and ReDoS (CVE-2024-22363), fixed only in SheetJS releases distributed outside npm. | `services/import.ts` |
| H7 | Email-confirmation flow is missing: no callback/confirm route, the UI ignores the `session` flag returned by signup, and `onboarding_completed_at` is **never written anywhere**, so `onboardingCompleted` is always false. There is no password reset. | auth routes, `api/settings` |

### 2.3 Medium

| ID | Finding |
|----|---------|
| M1 | `middleware.ts` is deprecated in Next 16 in favor of `proxy.ts` (bundled docs confirm; a codemod exists). Redirect responses created in the proxy do not carry cookies refreshed by `setAll`. `api/` is excluded from the matcher, so every route must authenticate itself (all 27 non-public routes do call `getAuthUser()`, good). |
| M2 | Raw `error.message` is returned to clients (500s and Supabase signup errors), leaking internals and enabling account enumeration (`User already registered`). |
| M3 | No rate limiting anywhere; the `rate_limits` table is never used. `rate_limits.user_id` is `NOT NULL`, so it cannot even hold anonymous (pre-login) buckets. |
| M4 | Multi-step writes are not atomic (approve, schedule, cancel, import). Approve is not idempotent: approving twice creates duplicate `board_cards`. |
| M5 | Board columns use `toISOString()` (UTC) while the default timezone is `Asia/Manila` (UTC+8), so "Today" is wrong for 8 hours a day. Titles like `Today (Sat, Sep 19)` are stored, so they go stale. The Backlog column uses `board_date NULL` under a `UNIQUE` constraint, but Postgres treats NULLs as distinct, so concurrent calls create several Backlogs. Column inserts race. |
| M6 | Missing indexes on foreign keys / `user_id`; no `updated_at` triggers (code sets it by hand); `handle_new_user()` is `SECURITY DEFINER` without `SET search_path`; `username UNIQUE` is case-sensitive and a duplicate username makes the trigger raise, so `signUp` fails with an opaque database error; policies call `auth.uid()` per row instead of `(select auth.uid())`; `uuid-ossp` is unnecessary. |
| M7 | `POST /api/queue/batch` does not filter prompt statuses or dedupe, so already queued / generating / posted prompts get duplicate jobs (duplicate cost). No batch size cap. |
| M8 | Prompt search interpolates user input into a PostgREST `.or()` string (`image_prompt.ilike.%${q}%,...`), so commas/parentheses/`%` change the filter. Scoped by `user_id`, so low blast radius, but it is filter injection. |
| M9 | Review page expects `imageUrl` from `GET /api/prompts?status=ready`, but that route joins `generations(*)` without signing `storage_path` (bucket is private), so real images cannot display. The Posts page still renders `MOCK_POSTS`; sidebar badges are static; Settings uses the mock model list. |
| M10 | Image model `imagen-3.0-generate-002` is hard-coded (worker and fallback); the model chosen in the UI is not persisted. Key verification in `api/keys/provider` sends the key as a URL query parameter and has a fail-open "offline" fallback whose condition is inverted (`!startsWith("AIzaSy") && length < 20`). |
| M11 | Deleting a card or cancelling a post only updates the DB. A post already natively scheduled on Facebook is **not** cancelled there and will still publish. |

### 2.4 Low

| ID | Finding |
|----|---------|
| L1 | `_lib/db/types.ts` (561 lines) is hand-written; will drift from the schema. |
| L2 | No tests or CI. `README.md` still says "Mock Mode (No Backend)". `AGENTS.md` points only to the frontend spec. |
| L3 | `admin.ts` guards with `typeof window`; use the `server-only` package. No runtime env validation. |

---

## 3. Target design decisions

- **Auth:** keep Supabase Auth with cookie sessions (`@supabase/ssr`). Add one server helper `requireUser()` used by every route (data access layer), plus a `withApiHandler` wrapper. The proxy is an optimistic redirect layer only; it never replaces per-route checks (this matches the bundled Next authentication guide).
- **Secrets at rest:** AES-256-GCM, versioned envelope, always written and read through two helpers (`encryptToBytea`, `decryptFromBytea`). Ciphertext columns are never selectable by the `authenticated` role; only server code using the admin client reads them.
- **Writes:** anything the user must not be able to forge (jobs, generations, posts, rate limits, activity log, statuses, ciphertext) is written only by server code after `requireUser()`, using either the admin client with an explicit `user_id` or a Postgres RPC. The `authenticated` role gets `SELECT` only on those tables.
- **Multi-step changes** (approve, schedule, unschedule, reject, claim jobs) are Postgres functions (single transaction, invariants enforced in SQL).
- **Publishing:** the worker performs every Facebook Graph call. Scheduled posts are submitted to Facebook's native scheduling when inside the allowed window, or published when due otherwise, with an atomic claim and idempotency guards.
- **Scheduler:** Supabase `pg_cron` + `pg_net` calls the worker route every minute with the bearer secret (works on free plans). Vercel Cron is the fallback; the route must accept `GET` and `POST`.
- **Time:** timestamps are UTC ISO strings; the user's time zone (`profiles.timezone`, default `Asia/Manila`) decides calendar-day columns; titles like "Today" are computed in the UI, never stored.

---

## 4. Phased plan

Each phase ends with acceptance criteria, verification output, and a commit. Stop at the end of each phase and report.

### Phase 0: Secrets and repo hygiene

| Task | Detail |
|------|--------|
| 0.1 | Replace `.env.example` with the delivered `env.example` (placeholders only, no real-looking values). |
| 0.2 | `scripts/check-env.mjs`: load `.env.local` (`process.loadEnvFile`), verify presence and **shape only**: `NEXT_PUBLIC_SUPABASE_URL` is https; anon key looks like a JWT or `sb_publishable_...`; service key present (JWT or `sb_secret_...`); `ENCRYPTION_KEY` decodes to 32 bytes; `CRON_SECRET` at least 32 chars; `GRAPH_API_VERSION` matches `v\d+\.\d+`; `NEXT_PUBLIC_SITE_URL` parses. Output only `OK` / `MISSING` / `BAD_SHAPE` and lengths. Never print values. |
| 0.3 | `app/_lib/env.ts` (`import "server-only"`): zod schema for server env, cached `getServerEnv()`, **fail closed** (throws a message that names the variable, never its value). `crypto.ts`, `admin.ts`, worker auth, and Graph helpers read config through it. |
| 0.4 | `scripts/check-secrets.mjs` + `npm run check:secrets`: scan `git ls-files` (skip `package-lock.json`) for JWT-shaped strings (`eyJ...\.eyJ...`), `AIza[0-9A-Za-z_-]{35}`, `EAA[0-9A-Za-z]{30,}`, `sb_secret_`, PEM blocks. Exit 1 on any hit. Document an optional `.git/hooks/pre-commit` that runs it (no husky). |
| 0.5 | Add `server-only` dependency; `import "server-only"` in `supabase/admin.ts`, `crypto.ts`, `services/*`, `ai/gemini.ts`, `env.ts`. Remove the `typeof window` guard. |
| 0.6 | `docs/SECURITY.md`: key-rotation runbook (section 0), history-scrub commands (documented, not executed), how to run `check:secrets`. Update `AGENTS.md` pointer line to reference both specs. Rewrite the "Mock mode" section of `README.md` (env var **names** only, migration order, scheduler setup). |

**Accept:** `npm run check:secrets` exits 0 on HEAD; `git grep -nE "eyJ[A-Za-z0-9_-]{20,}\.eyJ" -- .` prints nothing; `node scripts/check-env.mjs` runs and shows no values; importing the admin client from a client component fails `next build`.

### Phase 1: Data integrity (storing data correctly)

**1.1 Crypto and bytea (fixes C3).**
- In `_lib/crypto.ts` add `encryptToBytea(plaintext): string` (returns `\x` + hex, the PostgREST-safe form) and `decryptFromBytea(value: string | Uint8Array | Buffer): string` that accepts: `\x`-prefixed hex, bare hex, and buffers.
- Versioned envelope: `[1 byte version=1][12 IV][16 tag][ciphertext]`, with AES-GCM **AAD** = `<table>:<user_id>` so a ciphertext copied to another row fails authentication. Keep `getLast4`/`maskKey`.
- Tests (Vitest): round-trip; tamper detection (flip a byte, wrong AAD, wrong key all throw); accepts the exact string shape PostgREST returns (`"\\x" + hex`); rejects truncated input. **Integration test** on the local Supabase stack: write through the client, read back the row, decrypt, assert equal.
- Existing rows written by the old code are not trusted. Default decision: the migration deletes rows in `provider_keys` and `facebook_pages`, and the owner re-enters the key and Page token once (only the owner has data today).

**1.2 Consolidate duplicate routes.**
- One implementation each: `saveFacebookPage` / `saveProviderKey` in `_lib/services/`, used by exactly one route each: `/api/facebook/pages` (+ `[id]`, `[id]/verify`) and `/api/keys/provider`.
- Keep the union of behaviors (e.g. `settings/ai-key` clears `generation_paused` on save; `facebook/pages` supports multiple Pages and default selection). Update every caller in `get-started/connect`, `get-started/setup`, and `dashboard/settings`. Delete `api/integrations/facebook` and `api/settings/ai-key`.

**1.3 Migration `hardening_1` (integrity, no privilege changes yet).**
- `profiles`: add `timezone text not null default 'Asia/Manila'`, `image_model text`, `generation_paused_until timestamptz`; replace `UNIQUE(username)` with a unique index on `lower(username)`.
- `board_columns`: partial unique index `(user_id) WHERE board_date IS NULL` (single Backlog).
- `board_cards`: `UNIQUE(prompt_id)` (one active card per prompt).
- `posts`: `UNIQUE(card_id)` (fixes the broken upsert); extend `status` check with `'publishing'` and `'cancel_pending'`; add `publish_attempts int not null default 0`, `last_attempt_at`, `fb_submitted_at`, `fb_mode text check (fb_mode in ('native_schedule','immediate'))`; index `(status, scheduled_publish_time)`.
- `jobs`: partial unique index on `(user_id, (payload->>'prompt_id')) WHERE type='generate_image' AND status IN ('queued','running')`; index `(user_id, status)`.
- Indexes for foreign keys and hot filters: `generations(prompt_id)`, `generations(user_id)`, `board_cards(user_id)`, `board_cards(prompt_id)`, `posts(prompt_id)`, `facebook_pages(user_id)`, `activity_log(user_id, created_at desc)`.
- `set_updated_at()` trigger (with `SET search_path = ''`) on every table that has `updated_at`; remove manual `updated_at` assignments from code.
- Recreate `handle_new_user()` with `SET search_path = ''`, schema-qualified names, and a **collision-safe username** (append a short random suffix on conflict); it must never raise for a duplicate username.
- Storage: set bucket `file_size_limit` (images 10 MB, uploads 5 MB) and `allowed_mime_types` (`image/png`, `image/jpeg`, `image/webp`; xlsx/csv types for uploads).
- Rewrite all RLS policies to use `(select auth.uid())`.

**1.4 Migration `hardening_2` (privileges; fixes H2).** The `authenticated` role must not be able to forge server-owned data.
- `jobs`, `generations`, `posts`, `activity_log`, `rate_limit_counters`: revoke write privileges from `authenticated`; keep `SELECT` (owner policy) only.
- `facebook_pages`, `provider_keys`: column-level `REVOKE SELECT (token_ciphertext)` / `(key_ciphertext)` from `authenticated` and revoke insert/update/delete; writes and ciphertext reads use the admin client in server code only. Any code that does `select("*")` on these tables from a user client must change to explicit safe columns.
- `profiles`: revoke `UPDATE` from `authenticated`; `/api/settings` performs a whitelisted update with the admin client.
- `prompts.status`, `board_cards.status`, `board_cards.scheduled_at`: revoke column `UPDATE` from `authenticated`; changed only by RPCs (1.5).
- `waitlist`: remove the anonymous `INSERT (TRUE)` policy; add `POST /api/waitlist` (rate limited, admin insert, honeypot field) if a landing form exists.

**1.5 RPC functions (single-transaction invariants; fixes M4, M5, H3).** Put in a migration; `SECURITY DEFINER`, `SET search_path = ''`, and first line `IF auth.uid() IS NULL THEN RAISE EXCEPTION ...` for user-callable ones. Callers use `supabase.rpc(...)`.

| Function | Invariants |
|----------|-----------|
| `approve_prompt(p_prompt_id)` | prompt belongs to caller; status `ready`; a succeeded generation exists; ensures the Backlog column; **idempotent** (returns the existing card); sets prompt `approved`. |
| `reject_prompt(p_prompt_id, p_reason)` | prompt belongs to caller and is `ready`; returns it to `draft`; logs the reason to `activity_log`. |
| `schedule_card(p_card_id, p_scheduled_at, p_page_id)` | card and Page belong to caller; Page `token_status = 'valid'`; `p_scheduled_at` between `now()+15 min` and `now()+30 days`; daily cap evaluated in the profile's time zone, counting non-cancelled posts, under `pg_advisory_xact_lock`; upserts the `posts` row (status `scheduled`); sets card `scheduled` and prompt `scheduled`; returns the post id. |
| `unschedule_card(p_card_id)` | if the post was submitted to Facebook natively, sets `cancel_pending` and returns `fb_post_id` for the server to delete via Graph; otherwise `cancelled`; card back to `planned`; prompt back to `approved`. |
| `move_card(p_card_id, p_column_id, p_position)` | ownership only; no status changes. |
| `claim_jobs(p_worker, p_batch, p_per_user)` | `FOR UPDATE SKIP LOCKED`; skips users with `generation_paused` or `generation_paused_until > now()`; enforces the per-user running cap inside the statement; two concurrent calls never return the same job. |
| `reap_stuck_jobs(p_timeout)` | requeues or fails stuck `running` jobs **and** resets the prompt status accordingly. |

**1.6 Types.** Add `npm run db:types` (`supabase gen types typescript --local > app/_lib/db/types.ts`). Replace the hand-written file with generated output; fix resulting type errors.

**1.7 Board correctness.** Build day columns in the profile's time zone with `Intl.DateTimeFormat`; upsert with `ignoreDuplicates`; stop storing "Today/Tomorrow" in `title` (compute in UI from `board_date`).

**1.8 Signed image URLs.** Add `signImages(paths)` (batch `createSignedUrls`, short TTL) and use it in `/api/prompts` (for `ready`), `/api/board`, `/api/posts`. The review page must receive a working `imageUrl`.

**Accept:** unit + integration tests for 1.1 pass; migrations apply cleanly on a fresh local stack in order; RLS/privilege SQL tests (Phase 6 list) pass; `POST` to a table with the user JWT for `jobs`, `posts`, `rate_limit_counters` is rejected; selecting `token_ciphertext` with the user JWT is rejected; approving twice yields one card; two concurrent `claim_jobs` calls return disjoint sets; `npx tsc --noEmit` clean with generated types.

### Phase 2: Auth and session (login session handling)

| Task | Detail |
|------|--------|
| 2.1 | **Rename `middleware.ts` to `proxy.ts`** (export `proxy`; use the codemod or edit by hand; read `proxy.md` first). Keep the matcher. When redirecting, copy the refreshed auth cookies onto the redirect response (helper `redirectWithCookies`). Keep it optimistic: redirect signed-out users away from `/dashboard/*` and `/get-started/*`, and signed-in users away from `/login` and `/signup`. |
| 2.2 | `app/_lib/auth/require-user.ts` (`server-only`): `requireUser()` returns `{ user, supabase }` or throws `ApiAuthError` (401). `withApiHandler(handler, opts)`: try/catch, zod body parse (`.strict()`), same-origin check for mutating methods (compare `Origin` to `NEXT_PUBLIC_SITE_URL`/host; reject mismatches), request id, uniform `apiError` mapping. Unknown errors are logged server-side with the request id and returned as `INTERNAL_ERROR` with a generic message. Refactor **all** routes to use it (mechanical). |
| 2.3 | **Open redirect (H1):** `sanitizeNext(next)` returns a safe internal path only: must start with a single `/`, not `//`, not `/\`, no scheme, no control characters, and must be under an allowlist (`/dashboard`, `/get-started`); otherwise `/dashboard`. Use it in the auth card and anywhere `next` is read. Unit-test with payloads such as `//evil.example`, `/\evil.example`, `https://evil.example`, `javascript:alert(1)`, `/dashboard/../../x`, `%2F%2Fevil.example`. |
| 2.4 | **Email confirmation (H7).** Add `app/auth/confirm/route.ts` (`token_hash` + `type` -> `verifyOtp`, then redirect via `sanitizeNext`) and a PKCE `app/auth/callback/route.ts` (`code` -> `exchangeCodeForSession`). Pass `emailRedirectTo: ${SITE_URL}/auth/confirm` in `signUp`. The signup route returns `{ needsEmailConfirmation }`; the UI shows a "Check your inbox" state with a resend button (`POST /api/auth/resend`) instead of pushing to `/get-started` when there is no session. Login on an unconfirmed account returns `AUTH_EMAIL_NOT_VERIFIED`. Document the Supabase dashboard settings the owner must set (Site URL, Redirect URLs, Confirm email). |
| 2.5 | **Password reset.** `/forgot-password` and `/reset-password` pages; `POST /api/auth/forgot` (calls `resetPasswordForEmail`, always returns the same generic success), `POST /api/auth/reset` (requires the recovery session, calls `updateUser({ password })`, enforces the same min length as signup). |
| 2.6 | **Error normalization (M2).** Map Supabase auth error codes to stable app codes; never return `error.message` from Supabase. Signup with an existing email returns the same shape/message as a fresh signup when confirmation is on. Login always returns "Invalid email or password." |
| 2.7 | **Rate limiting (M3).** New table `rate_limit_counters(key text, bucket text, window_start timestamptz, count int, primary key (key, bucket, window_start))` and RPC `rate_limit_hit(p_key, p_bucket, p_window_seconds, p_limit)` (atomic upsert-increment; returns `allowed` and `retry_after`). Keys: hashed IP for anonymous routes, `user_id` for signed-in routes. Defaults: login 10 per 15 min per IP+email hash; signup 5 per hour per IP; forgot 5 per hour per IP; key verify 10 per hour per user; import 10 per hour per user; queue batch 30 per hour per user. Respond `429` with `Retry-After` and code `RATE_LIMITED`. Drop the unused `rate_limits` table in the migration. |
| 2.8 | **Client session handling.** `AuthProvider` (client) subscribes to `onAuthStateChange` from the browser client; on `SIGNED_OUT` or a failed refresh it clears the SWR cache and routes to `/login?next=<current>`. A shared `apiFetch` wrapper: on `401` do the same; on `429` show a toast with the wait time. On login and logout clear the SWR cache so one user's data never flashes for the next. Logout also works across tabs. |
| 2.9 | **Sign out everywhere.** `POST /api/auth/logout` (default local scope) and an option in Settings that uses global scope. |
| 2.10 | **Onboarding gate (H7).** `POST /api/onboarding/complete`: verify server-side that the caller has a valid Page and a valid AI key, then set `profiles.onboarding_completed_at`. The setup page calls it (and checks the response, today it ignores it). Login returns `redirectTo` (`/get-started` if incomplete, else `sanitizeNext(next)` or `/dashboard`). `/api/me` derives `onboardingCompleted` from it. |
| 2.11 | **Username.** `GET /api/auth/username-available?u=` (rate limited); case-insensitive uniqueness handled by the index and by the trigger fallback (1.3); reserved-name list (`admin`, `support`, `root`, `api`, ...). |
| 2.12 | **Security headers** in `next.config.ts`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `Permissions-Policy` (deny camera/mic/geolocation). Add a CSP in **report-only** mode first. |
| 2.13 | **`/api/me` performance.** Replace the five sequential count queries with one RPC (`dashboard_counts()`); keep the response shape. Share it in the UI with one `useMe()` SWR hook (sidebar, header, dashboard, settings). |

**Accept (tests + manual):** `sanitizeNext` unit tests pass; signup on a fresh email with confirmation on shows "Check your inbox" and no session; the confirm link signs in and lands on `/get-started`; login with wrong credentials and unknown email return identical responses; 11th login attempt in 15 min returns 429 with `Retry-After`; expired/invalid session on any page redirects to `/login?next=` and back after login; logout in one tab signs out the other; a new user who has not finished onboarding cannot skip it; no route returns raw Supabase error text (grep for `error.message` in `api/` returns only server logs).

### Phase 3: Worker and publishing (fixes C2, C4, H3 to H5, M11)

| Task | Detail |
|------|--------|
| 3.1 | **Worker auth (C2).** `verifyCron(request)`: throw if `CRON_SECRET` is unset or shorter than 32 chars (fail closed), compare with `crypto.timingSafeEqual`. Accept `POST` and `GET` (Vercel Cron sends `GET`). Add `export const maxDuration` (verify the allowed value for the owner's Vercel plan in the docs; default 60) and `export const dynamic = "force-dynamic"`. Enforce a time budget inside the tick (stop claiming work after ~45 s). |
| 3.2 | **Scheduler.** Create `supabase/manual/schedule_worker.sql` (**not** an auto-applied migration): enables `pg_cron` and `pg_net`, stores the secret in Supabase Vault, and schedules a per-minute `net.http_post` to `<SITE_URL>/api/worker/tick` with `Authorization: Bearer <secret>`. Document it in the README. Fallback documented: Vercel Cron (`vercel.json`) with the same header. The owner applies it manually. |
| 3.3 | **Claiming and concurrency.** Replace `claimJobs` with the `claim_jobs` RPC; run claimed jobs with bounded concurrency (`Promise.allSettled`, default 3); replace the N+1 reaper with `reap_stuck_jobs`. Check the `error` of every Supabase call in the worker (a small `must()` helper); no silent failures. |
| 3.4 | **Pause that resolves itself (H4).** On 429 set `profiles.generation_paused_until = now() + interval '15 minutes'` (never touch the user's manual `generation_paused`). The claim RPC treats a future `paused_until` as paused. Update the UI text to show the resume time. |
| 3.5 | **Model config (M10).** `app/_lib/ai/models.ts` holds an allowlist (single source of truth). The worker reads `profiles.image_model` (validated against the allowlist), not a literal. Keep the current default until the owner verifies model IDs against Google AI Studio docs; the setup and Settings pages persist the selection. Do not invent model IDs. |
| 3.6 | **Publishing pipeline.** Extend the tick with three steps after image jobs: (a) **submit**: claim `scheduled` posts that are not yet submitted and still have at least 12 minutes remaining (Facebook requires 10 minutes minimum; the buffer covers latency and clock skew) with an atomic `UPDATE ... SET status='publishing' WHERE id=$1 AND status='scheduled' RETURNING`; call Graph in native-schedule mode; store `fb_post_id`, `fb_photo_id`, `fb_mode`, `fb_submitted_at`; return the row to `scheduled`. (b) **immediate**: posts whose time has arrived and were never submitted are published now (`fb_mode='immediate'`, status `published`). (c) **reconcile**: for natively scheduled posts past their time, `GET /{fb_post_id}?fields=is_published,scheduled_publish_time`, then mark `published` or `failed`. Each Graph call gets a timeout (`AbortSignal.timeout`). Error 190 marks the Page `token_status='expired'` and writes an `activity_log` row. |
| 3.7 | **Explicit publish mode (H3).** `publishPostToFacebook` takes `mode: 'native_schedule' | 'immediate'` and never falls through implicitly. Scheduling API rejects times outside `[now+15 min, now+30 days]` (the RPC already does). |
| 3.8 | **Idempotency (H5).** `POST /api/posts/[id]/retry` only accepts `failed` posts, claims atomically (`failed -> publishing`), increments `publish_attempts`, and refuses at a max (default 5). Persist `fb_photo_id` immediately after the photo upload so a retry after a crash reuses the photo instead of uploading again. Document the residual risk (Graph success but DB write failure) in `docs/DECISIONS.md`. |
| 3.9 | **Cancel on Facebook (M11).** `unschedule_card` / cancel routes call `DELETE /{fb_post_id}` for natively scheduled posts; if Graph fails, keep `cancel_pending`, retry in the tick, and show it in the UI. |
| 3.10 | **Post now.** Add an explicit `POST /api/posts/[id]/publish-now` (same claim/idempotency path) so "publish immediately" is a deliberate action, not a side effect of scheduling. |
| 3.11 | **Observability.** Structured JSON logs (`requestId`, `jobId`, `postId`, `userId`, duration); `activity_log` rows for: generation succeeded/failed, post submitted/published/failed/cancelled, token expired. The tick response reports counts per step. |

**Accept:** with mocked Graph and Gemini clients, a Vitest integration run proves: an image job goes `queued -> running -> succeeded` and the prompt becomes `ready`; a 429 sets `paused_until` and jobs resume automatically after it passes; a scheduled post 2 hours out is submitted natively once (a second tick does nothing); a post whose time has arrived is published once; two simultaneous retries publish once; cancelling a natively scheduled post calls Graph delete; the tick refuses an unauthenticated request and an environment with no `CRON_SECRET`.

### Phase 4: API hardening (remaining)

| Task | Detail |
|------|--------|
| 4.1 | **Server-controlled state.** Remove `status` from the card PATCH schema; scheduling goes only through `schedule_card`. Reject unknown fields everywhere (`.strict()`); validate every `[id]` param as a UUID; cap pagination (`limit <= 100`). |
| 4.2 | **Search (M8).** Escape `%`, `_`, `\`, `,`, `(`, `)` in `q` (helper `escapeLike`) or build the filter with separate `ilike` calls; test with `a,b)` and `%%` payloads. |
| 4.3 | **Queue batch (M7).** Accept only prompts in `draft`/`failed`; skip and report others (`{ queued, skipped: [{id, reason}] }`); cap 100 per request; rely on the partial unique index to block duplicate active jobs. |
| 4.4 | **Spreadsheet import (H6).** Replace `xlsx@0.18.5`. Default: `read-excel-file` (Node entry) for `.xlsx` and `papaparse` for `.csv`, keeping the current parsing interface (headers `No.`, `Style`, `Image Prompt`, `Facebook Caption + CTA`, `Hashtags`; 500 row cap; 5 MB cap). Sanitize the stored filename (strip path separators, limit length). Do the whole import in one RPC or a single batched insert with a set-level rollback on failure. If the owner prefers SheetJS, install it from SheetJS's own distribution (not npm) and record it in `DECISIONS.md`. |
| 4.5 | **Google key verification (M10).** Send the key in the `x-goog-api-key` header (not the URL); remove the offline fail-open fallback; network failure returns `503 AI_VERIFY_UNAVAILABLE`, never "valid". |
| 4.6 | **Facebook verification.** Keep the permission check strict: require `pages_manage_posts` (the current code also accepts `pages_show_list` or `pages_read_engagement`, which cannot publish). Pin `GRAPH_API_VERSION` through `env.ts`. |
| 4.7 | **Waitlist.** If the landing page has an email form, wire it to `POST /api/waitlist` (rate limited); otherwise delete the table in the migration. |
| 4.8 | **Activity log.** A helper `logActivity(userId, entity, action, metadata)` (admin client), used by approve, reject, schedule, publish, key changes, and sign-in. |

**Accept:** unit tests for `escapeLike`, queue-batch eligibility, and filename sanitization pass; importing the three real `.xlsx` files (150 rows) works; uploading a crafted oversized/invalid file fails cleanly with `IMPORT_*` codes; `grep -rn "\"xlsx\"" package.json` shows the chosen parser only.

### Phase 5: Wire the remaining UI to the database

| Task | Detail |
|------|--------|
| 5.1 | **Posts page** uses `GET /api/posts` (real data, signed image URLs, pagination, status filters) with Retry, Cancel, and Publish now wired to the routes from Phase 3. Delete `MOCK_POSTS`. |
| 5.2 | **Sidebar badges** and header counts come from `useMe()` (`dashboard_counts()`), hidden at 0. |
| 5.3 | **Settings** uses `models.ts` (not `mock-config`), persists timezone and image model, and adds "Sign out everywhere". |
| 5.4 | **Review** shows `imageUrl` from the API; approve/reject call the RPC-backed routes; SWR revalidates sidebar counts after each action. |
| 5.5 | **Empty, loading, error states** for every SWR-backed page; a failed request shows a retry, never a blank screen. |
| 5.6 | Remove unused seed/mock modules (`app/_data/posts.ts`, `mock-config.ts` model list). Keep static marketing data (`faq`, `pricing`, `changelog`). |

**Accept:** with a fresh account, the whole loop works against the real database: import -> queue -> (worker tick) -> review -> approve -> schedule -> (worker tick) -> Posts shows the result; no page imports from a mock module (`grep -rn "MOCK_" app` prints nothing).

### Phase 6: Tests, CI, documentation

1. **Vitest (unit):** crypto, `sanitizeNext`, `escapeLike`, Graph/Gemini error mapping, schedule-window logic, `verifyCron`, filename sanitization, import row mapping.
2. **Database tests** (`supabase/tests/*.sql`, run with `npx supabase test db` on the local stack): user A cannot read or write user B's rows in any table; `authenticated` cannot insert into `jobs`/`posts`/`rate_limit_counters`; cannot select ciphertext columns; cannot update `profiles` protected columns; `approve_prompt` idempotent; `schedule_card` rejects past/too-far times and enforces the daily cap in `Asia/Manila`; `claim_jobs` concurrency (disjoint sets); unique-constraint behavior (single Backlog, one card per prompt, one post per card).
3. **Integration tests** for the worker steps with stubbed Graph and Gemini (as in the Phase 3 acceptance).
4. **CI** (`.github/workflows/ci.yml`): `npm ci`, `npm run check:secrets`, `npm run lint`, `npx next typegen && npx tsc --noEmit`, `npm test`, `npm run build` (dummy env values that pass `env.ts` shape checks). Optional job: `supabase test db` on the local stack.
5. **Docs:** `README.md` (setup, env var names, migrations in order, scheduler, testing), `docs/BACKEND.md` (data model, RPC list, worker flow diagram in Mermaid, error codes), `docs/DECISIONS.md` (all defaults taken).

**Accept:** CI green on a clean checkout; the Phase 1 to 5 acceptance lists are covered by named tests.

---

## 5. API conventions (apply while refactoring)

- Response shape stays `{ ok: true, data }` / `{ ok: false, error: { code, message, field?, details? } }`. `details` never contains raw upstream error text.
- Status codes: `400` validation, `401` unauthenticated, `403` forbidden (or same-origin failure), `404` not found **or not yours**, `409` state conflict (e.g. post not in a publishable state), `429` rate limited (with `Retry-After`), `503` upstream unavailable (Google or Meta), `500` unexpected (generic).
- Never trust client-supplied `user_id`, `status`, or timestamps that decide state. Derive the user from the session.
- Secrets never appear in responses, logs, error messages, or `activity_log.metadata`; only `last4`, status flags, and expiry.
- Mutations that need several writes go through an RPC. No route performs a read-modify-write across tables without one.

---

## 6. Definition of done and verification commands

```bash
npm run check:secrets                          # exit 0
node scripts/check-env.mjs                     # statuses only, no values
npm run lint                                   # 0 errors, 0 warnings
npx next typegen && npx tsc --noEmit           # clean (types generated from the DB)
npm test                                       # Vitest green
npx supabase test db                           # SQL/RLS tests green (local stack)
npm run build                                  # succeeds (needs network for fonts)

# leftovers (each must print nothing, unless noted)
git grep -nE "eyJ[A-Za-z0-9_-]{20,}\.eyJ" -- .
test ! -f middleware.ts && test -f proxy.ts && echo "proxy.ts in place"       # middleware.ts is gone
grep -rn "MOCK_\|mock-config" app                                             # none in production paths
grep -rnE "error\.message|err\.message" app/api                               # only inside logging, never returned
grep -rn "from(\"jobs\")\|from(\"posts\")" app/api | grep -v admin            # review each hit: no writes via the user client
```

Behavioral requirements:

- A signed-out request to any `/api/*` route (except auth, waitlist, and the cron-protected worker) returns `401` JSON; the worker returns `401` without the secret and refuses to run with no secret configured.
- Two browsers with two accounts never see each other's data (verify with the SQL tests and a manual pass).
- Reload keeps the session; an expired session sends the user to `/login?next=` and back after login.
- No secret value appears in `localStorage`, network responses, server logs, or the repo.
- The full loop in Phase 5's acceptance works on a fresh account.

---

## 7. Manual QA script (paste back completed)

Auth and session:

- [ ] Sign up with a new email: confirmation state, email link signs in, lands on `/get-started`.
- [ ] Sign up again with the same email: response indistinguishable from a fresh signup.
- [ ] Sign up with a taken username: friendly error, not a database error.
- [ ] Wrong password vs unknown email: identical message; the 11th attempt in 15 minutes gets 429.
- [ ] `/login?next=//evil.example` and `?next=https://evil.example` both land on `/dashboard`.
- [ ] Visit `/dashboard` signed out: redirected to `/login?next=/dashboard`, returns there after login.
- [ ] Forgot password: same response for known and unknown email; reset link works once.
- [ ] Log out in tab A: tab B redirects to `/login` within a few seconds.
- [ ] "Sign out everywhere" invalidates a second browser.
- [ ] Incomplete onboarding: `/dashboard` redirects to `/get-started`; completing it unlocks the dashboard.

Data and storage:

- [ ] Connect a Page (token verified against Graph) and add the Google key; both show only `last4`; DevTools > Network never shows the raw values in responses.
- [ ] Re-load the app: verification, queue, and publish still work (ciphertext round-trips).
- [ ] Import the 3 real sheets: 150 prompts, duplicates skipped, filenames safe.
- [ ] Queue 5 prompts twice: 5 jobs, not 10.
- [ ] Worker tick without the bearer secret: 401. With it: jobs run; images appear on Review through signed URLs.
- [ ] Trigger a 429 (stub or low quota): queue pauses and resumes by itself.
- [ ] Approve twice: one card. Schedule in the past: rejected. Schedule 3 posts on one day with cap 3, then a 4th: rejected.
- [ ] Schedule a post 2 hours out: appears as scheduled on Facebook (Page's Publishing Tools). Unschedule: it disappears there.
- [ ] Retry a failed post twice quickly: one Facebook post.
- [ ] Direct PostgREST call with a user JWT: cannot insert `jobs`/`posts`, cannot select ciphertext, cannot change `daily_post_cap`.

---

## 8. Owner decisions (defaults are pre-approved; only ask if you disagree)

| Question | Default the agent should use |
|----------|------------------------------|
| Email confirmation | On in production, off allowed on local dev; UI supports both. |
| Scheduler | Supabase `pg_cron` + `pg_net` every minute (manual SQL file); Vercel Cron as documented fallback. |
| Existing encrypted rows | Delete and re-enter (Phase 1.1). |
| Canonical routes | `/api/facebook/pages*` and `/api/keys/provider`. |
| Schedule window | From 15 minutes to 30 days ahead; "Post now" is a separate action. |
| Default daily cap and time zone | 3 per day, `Asia/Manila`. |
| Spreadsheet parser | `read-excel-file` + `papaparse`. |
| Image model IDs | Keep the current default until the owner verifies IDs in Google AI Studio; the code reads from `models.ts`. |
| Repo visibility | Recommend private; not the agent's decision. |
| Hosted DB changes | The agent writes migrations and tests only; the owner applies them. |

**Out of scope, do not start:** TikTok, payments/billing, team accounts, OAuth "Continue with Facebook" (the current manual Page token flow stays), mobile app, redesign of UI beyond wiring and states.

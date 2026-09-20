# AutoPost Studio

> **Modern Bahay Kubo Content Engine & Social Publisher**  
> Turn prompt spreadsheets into 30 days of photorealistic tropical architecture posts with creator-first manual approval.

---

## Overview

AutoPost Studio is an automated publishing engine designed specifically for Philippine residential architecture creators, interior designers, and social publishers. It ingests prompt sheets (CSV / Excel), coordinates batch image generation queues, provides a side-by-side creator review gate, and automates posting directly to Facebook Pages on optimal schedules.

## Backend & Database Setup

AutoPost Studio connects to a Supabase PostgreSQL backend with Row Level Security (RLS), AES-256-GCM encrypted provider credentials, and an automated publishing worker.

### Required Environment Variables

Copy `.env.example` to `.env.local` and configure:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project HTTPS URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon/publishable key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role secret (server-only)
- `ENCRYPTION_KEY`: 32-byte base64-encoded key for token encryption
- `CRON_SECRET`: 32+ character bearer secret for the `/api/worker/tick` endpoint
- `GRAPH_API_VERSION`: Meta Graph API version (default: `v26.0`)
- `NEXT_PUBLIC_SITE_URL`: Application origin (e.g., `http://localhost:3000`)

Validate your configuration with:
```bash
node scripts/check-env.mjs
```

### Database Migrations

Apply migrations to your Supabase project in sequential order:
1. `supabase/migrations/20260919000001_init.sql` (baseline schema, tables, initial RLS)
2. `supabase/migrations/20260919000002_hardening_1.sql` (integrity constraints, indexes, triggers)
3. `supabase/migrations/20260919000003_hardening_2.sql` (privilege hardening, atomic RPC functions)

### Worker & Scheduler Setup

The generation queue and Facebook publishing worker are triggered via `GET` or `POST` to `/api/worker/tick` with `Authorization: Bearer <CRON_SECRET>`.
- **Supabase pg_cron (Recommended)**: Follow `supabase/manual/schedule_worker.sql` to configure `pg_cron` and `pg_net` to trigger the worker every minute.
- **Vercel Cron (Alternative)**: Configure `cron` schedules in `vercel.json` pointing to `/api/worker/tick`.

---

## Getting Started

### Prerequisites
- Node.js 18.18+ or 20+
- npm 9+

### Installation & Run

```bash
# Install dependencies
npm install

# Run development server (Turbopack)
npm run dev

# Lint code (ESLint)
npm run lint

# Typecheck and Next.js route type validation
npx next typegen && npx tsc --noEmit

# Production build
npm run build
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Route Map

| Section | Route | Description |
|---|---|---|
| **Marketing** | `/` | Landing page featuring architectural hero, post preview, interactive feature showcase, and transparent pricing. |
| | `/login` | Creator login stub with simulated credentials. |
| | `/privacy` | Privacy policy describing localized data handling and zero-leakage security. |
| | `/terms` | Platform terms of service for architectural content publishers. |
| **Onboarding** | `/get-started` | Platform selection step (Facebook Page vs. TikTok). |
| | `/get-started/connect` | Page connection step with simulated permissions. |
| | `/get-started/setup` | AI model configuration, aspect ratio selector, and key validation. |
| **Dashboard** | `/dashboard` | Main hub: publishing cadence metrics, prompt balance chart, quick action links, and recent activity. |
| | `/dashboard/prompts` | Central prompt library with collections, filtering, search, and batch actions. |
| | `/dashboard/queue` | Batch generation queue monitor with active rendering progress and status badges. |
| | `/dashboard/review` | Creator approval gate for reviewing rendered images alongside captions before publishing. |
| | `/dashboard/schedule` | Weekly calendar slot allocator and peak-time publishing queue. |
| | `/dashboard/posts` | Published archive and live delivery logs. |
| | `/dashboard/settings` | Pipeline settings, connected page tokens, and demo state reset tools. |
| **Error / 404** | `/_not-found` | Branded 404 error page. |

---

## Architecture & Design System

The application is built on the **Bahay Kubo design language**:
- **Palette**: Earthy and tropical tones rooted in Philippine materials:
  - **Narra** (`#8B4513` / `#A55724`): Warm structural timber accents.
  - **Bamboo** (`#F7F4EC` / `#EBE4D5`): Natural woven surfaces and page backgrounds.
  - **Capiz** (`#FDFBF7`): Polished translucent panel surfaces.
  - **Timber** (`#2C221E`): High-contrast text and grounding structures.
  - **Forest Green** (`#1F4A2B`): Primary CTA and approval indicators.
  - **Line** (`#D9CFBC`): Structural dividers and framing borders.
- **Typography**:
  - `Bricolage Grotesque`: Structural headings and display branding.
  - `Work Sans`: Interface labels, buttons, navigation, and metrics.
  - `Figtree`: Editorial captions and body copy.
- **Visual Elements**:
  - `HouseArt`: Deterministic SVG house architecture graphics replacing external CDN dependencies.
  - `FacebookPostPreview`: Feed-accurate post preview cards for desktop and mobile review.
  - Motifs: Roofline clips, banig woven textures, and capiz shell grid frames.

---

## Frontend Hardening Standards

Follows [`docs/frontend-hardening-spec.md`](docs/frontend-hardening-spec.md) guidelines:
- Strict TypeScript (`tsc --noEmit` clean).
- Zero ESLint warnings (`npm run lint`).
- Next.js 16 App Router conventions with dynamic routing and Suspense guards.
- Accessible ARIA semantics, keyboard navigation, and responsive layouts (320px to 1440px+).
- Secure credential handling: API keys and access tokens are never persisted or exposed.
"# autopostStudio" 

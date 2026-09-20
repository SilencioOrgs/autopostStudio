# Cloudflare Workers AI Setup

AutoPost uses Cloudflare Workers AI directly via its REST API for server-side image generation. Users do not enter Gemini, OpenAI, or other personal model keys. All credentials are server-managed, and users can select their preferred model in Settings.

## 1. Cloudflare Credentials

You need two values from your Cloudflare account:

1. **Account ID**:
   - Sign in to the [Cloudflare dashboard](https://dash.cloudflare.com/).
   - Your Account ID is visible in the URL: `dash.cloudflare.com/<ACCOUNT_ID>`.
   - Or click on any domain/Workers page and find your **Account ID** in the right sidebar.

2. **API Token**:
   - In the Cloudflare dashboard, click **My Profile** (top right) → **API Tokens**.
   - Click **Create Token**.
   - Choose **Create Custom Token** (or use the Workers AI template if available).
   - Under Permissions, select:
     - **Account** → **Workers AI** → **Read** (allows calling the AI models)
   - Click **Continue to summary** → **Create Token**.
   - Copy the generated token (it will only be shown once).

## 2. Configure Environment Variables

Add these two variables to `.env.local` (and your production hosting environment):

```env
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
```

> [!CAUTION]
> Never prefix these with `NEXT_PUBLIC_` and never commit them to version control. They are strictly server-only.

## 3. Supported Models

Users can choose from available models in **Settings → Credentials & Models**:

- **FLUX.1 Schnell** (`@cf/black-forest-labs/flux-1-schnell`): Fast, high-quality 12B parameter model (recommended default).
- **Stable Diffusion XL** (`@cf/stabilityai/stable-diffusion-xl-base-1.0`): Classic SDXL for detailed images.
- **SDXL Lightning** (`@cf/bytedance/stable-diffusion-xl-lightning`): Optimised SDXL for fast generation.

## 4. How It Works

1. A generation job is scheduled in the background queue (`generations` / `queue.ts`).
2. The server reads the user's selected `image_model` from their profile (falling back to `FLUX.1 Schnell`).
3. The server issues a direct HTTPS request:
   `POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{MODEL}`
4. The output bytes are received, verified, and uploaded securely to Supabase Storage (`generated-images` bucket).
5. The prompt and generation records are updated to `ready` / `succeeded`.

## 5. Troubleshooting

- **AI_PROVIDER_UNAVAILABLE (503)**:
  Check that `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are valid and present in `.env.local`. Ensure your token has `Workers AI: Read` permission.
- **AI_QUOTA_EXCEEDED (429)**:
  Workers AI free tier or account quota rate limit reached. The queue automatically retries with backoff.

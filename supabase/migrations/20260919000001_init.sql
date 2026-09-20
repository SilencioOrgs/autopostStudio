-- ==============================================================================
-- AutoPost Studio: Initial Database Migration
-- Includes: profiles, facebook_pages, provider_keys, prompt_sets, prompts,
--           generations, jobs, board_columns, board_cards, posts, activity_log,
--           waitlist, rate_limits, storage buckets & policies, and RLS.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- 1. Profiles (1-to-1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  email TEXT NOT NULL,
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT,
  onboarding_completed_at TIMESTAMPTZ,
  generation_paused BOOLEAN NOT NULL DEFAULT FALSE,
  daily_post_cap INT NOT NULL DEFAULT 3,
  board_days INT NOT NULL DEFAULT 14,
  default_style_preset TEXT DEFAULT 'Modern architectural photography, photorealistic, 8k, natural lighting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Facebook Pages (multi-page per user, encrypted access tokens)
CREATE TABLE IF NOT EXISTS public.facebook_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  category TEXT,
  followers_count INT NOT NULL DEFAULT 0,
  token_ciphertext BYTEA NOT NULL,
  token_last4 TEXT NOT NULL,
  token_status TEXT NOT NULL DEFAULT 'unverified' CHECK (token_status IN ('valid', 'invalid', 'expired', 'unverified')),
  token_expires_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_facebook_pages_user_page UNIQUE (user_id, page_id)
);

-- 3. Provider Keys (BYO Google AI Studio key per user)
CREATE TABLE IF NOT EXISTS public.provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google_ai_studio' CHECK (provider IN ('google_ai_studio')),
  key_ciphertext BYTEA NOT NULL,
  key_last4 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'invalid', 'expired')),
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_provider_keys_user_provider UNIQUE (user_id, provider)
);

-- 4. Prompt Sets (Grouping for prompt imports)
CREATE TABLE IF NOT EXISTS public.prompt_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'upload' CHECK (source IN ('upload', 'manual', 'ai_assistant')),
  source_filename TEXT,
  style TEXT,
  total_rows INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Prompts (The Prompt Library items)
CREATE TABLE IF NOT EXISTS public.prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  set_id UUID REFERENCES public.prompt_sets(id) ON DELETE CASCADE,
  row_index INT,
  style TEXT,
  image_prompt TEXT NOT NULL,
  caption TEXT,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  aspect TEXT NOT NULL DEFAULT '4:5' CHECK (aspect IN ('4:5', '1:1', '16:9')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'queued', 'generating', 'ready', 'approved', 'scheduled', 'posted', 'failed')),
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_prompts_user_content_hash UNIQUE (user_id, content_hash)
);

-- 6. Generations (History of image generation results)
CREATE TABLE IF NOT EXISTS public.generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  job_id UUID,
  model TEXT NOT NULL,
  system_instruction TEXT,
  aspect TEXT NOT NULL DEFAULT '4:5',
  image_size TEXT NOT NULL DEFAULT '1K',
  storage_path TEXT,
  width INT,
  height INT,
  bytes INT,
  latency_ms INT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'succeeded', 'failed')),
  error_code TEXT,
  error_message TEXT,
  attempt INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Jobs (Worker queue with priority and locking)
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('generate_image', 'publish_post')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  priority INT NOT NULL DEFAULT 0,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Board Columns (Trello-style posting board calendar days + Backlog)
CREATE TABLE IF NOT EXISTS public.board_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  board_date DATE,
  title TEXT NOT NULL,
  position INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_board_columns_user_date UNIQUE (user_id, board_date)
);

-- 9. Board Cards (Approved posts planned on board)
CREATE TABLE IF NOT EXISTS public.board_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES public.board_columns(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES public.generations(id) ON DELETE SET NULL,
  facebook_page_id UUID REFERENCES public.facebook_pages(id) ON DELETE SET NULL,
  position NUMERIC NOT NULL,
  scheduled_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'Asia/Manila',
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'scheduled', 'publishing', 'published', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Posts (Publication ledger: record of truth for live / scheduled posts)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.board_cards(id) ON DELETE SET NULL,
  facebook_page_id UUID REFERENCES public.facebook_pages(id) ON DELETE SET NULL,
  prompt_id UUID REFERENCES public.prompts(id) ON DELETE SET NULL,
  generation_id UUID REFERENCES public.generations(id) ON DELETE SET NULL,
  caption_final TEXT,
  image_url TEXT,
  fb_post_id TEXT,
  fb_photo_id TEXT,
  published_at TIMESTAMPTZ,
  scheduled_publish_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'failed', 'cancelled')),
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Activity Log
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Waitlist (Public landing page lead capture)
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'landing_page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Rate Limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 1,
  CONSTRAINT uq_rate_limits UNIQUE (user_id, bucket, window_start)
);

-- Indexes for performance & concurrency
CREATE INDEX IF NOT EXISTS idx_prompts_user_status ON public.prompts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_prompts_set_id ON public.prompts(set_id);
CREATE INDEX IF NOT EXISTS idx_jobs_claim ON public.jobs(status, run_after, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_board_cards_column ON public.board_cards(column_id, position);
CREATE INDEX IF NOT EXISTS idx_posts_user_status ON public.posts(user_id, status);

-- Enable RLS on ALL tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Owner-scoped RLS policies (Strict user_id = auth.uid())
CREATE POLICY "profiles_owner" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "facebook_pages_owner" ON public.facebook_pages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "provider_keys_owner" ON public.provider_keys FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prompt_sets_owner" ON public.prompt_sets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prompts_owner" ON public.prompts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "generations_owner" ON public.generations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "jobs_owner" ON public.jobs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "board_columns_owner" ON public.board_columns FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "board_cards_owner" ON public.board_cards FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_owner" ON public.posts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "activity_log_owner" ON public.activity_log FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rate_limits_owner" ON public.rate_limits FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Waitlist is public insert only (no anon reads)
CREATE POLICY "waitlist_insert" ON public.waitlist FOR INSERT TO anon, authenticated WITH CHECK (TRUE);

-- Trigger: auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, terms_accepted_at, terms_version)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    CASE WHEN NEW.raw_user_meta_data->>'terms_accepted' = 'true' THEN NOW() ELSE NULL END,
    NEW.raw_user_meta_data->>'terms_version'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Storage Buckets & Policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', FALSE),
       ('prompt-uploads', 'prompt-uploads', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_owner_access" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id IN ('generated-images', 'prompt-uploads')
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id IN ('generated-images', 'prompt-uploads')
  AND auth.uid()::text = (storage.foldername(name))[1]
);

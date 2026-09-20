-- ==============================================================================
-- AutoPost Studio: Hardening 1 — Data Integrity & Schema Invariants
-- Phase 1.3: Integrity constraints, indexes, triggers, and RLS optimization
-- ==============================================================================

-- 1. Untrusted existing rows (Phase 1.1 default decision: delete old ciphertext rows)
DELETE FROM public.provider_keys;
DELETE FROM public.facebook_pages;

-- 2. Profiles: timezone, image_model, generation_paused_until, case-insensitive username
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Manila';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS image_model TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS generation_paused_until TIMESTAMPTZ;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_lower_username ON public.profiles (LOWER(username));

-- 3. Board Columns: single Backlog per user (board_date IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_board_columns_user_backlog ON public.board_columns (user_id) WHERE board_date IS NULL;

-- 4. Board Cards: one active card per prompt
ALTER TABLE public.board_cards DROP CONSTRAINT IF EXISTS uq_board_cards_prompt_id;
ALTER TABLE public.board_cards ADD CONSTRAINT uq_board_cards_prompt_id UNIQUE (prompt_id);

-- 5. Posts: UNIQUE(card_id), publishing & cancel_pending statuses, attempt counters
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS uq_posts_card_id;
ALTER TABLE public.posts ADD CONSTRAINT uq_posts_card_id UNIQUE (card_id);

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_status_check
  CHECK (status IN ('scheduled', 'publishing', 'published', 'failed', 'cancelled', 'cancel_pending'));

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS publish_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS fb_submitted_at TIMESTAMPTZ;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS fb_mode TEXT CHECK (fb_mode IN ('native_schedule', 'immediate'));

CREATE INDEX IF NOT EXISTS idx_posts_status_scheduled_time ON public.posts (status, scheduled_publish_time);

-- 6. Jobs: partial unique active prompt index and status index
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_active_prompt ON public.jobs (user_id, (payload->>'prompt_id'))
  WHERE type = 'generate_image' AND status IN ('queued', 'running');

CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON public.jobs (user_id, status);

-- 7. Foreign key and hot filter indexes
CREATE INDEX IF NOT EXISTS idx_generations_prompt_id ON public.generations (prompt_id);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations (user_id);
CREATE INDEX IF NOT EXISTS idx_board_cards_user_id ON public.board_cards (user_id);
CREATE INDEX IF NOT EXISTS idx_board_cards_prompt_id ON public.board_cards (prompt_id);
CREATE INDEX IF NOT EXISTS idx_posts_prompt_id ON public.posts (prompt_id);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_user_id ON public.facebook_pages (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_created ON public.activity_log (user_id, created_at DESC);

-- 8. Trigger function: set_updated_at() with empty search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_facebook_pages_updated_at ON public.facebook_pages;
CREATE TRIGGER tr_facebook_pages_updated_at BEFORE UPDATE ON public.facebook_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_provider_keys_updated_at ON public.provider_keys;
CREATE TRIGGER tr_provider_keys_updated_at BEFORE UPDATE ON public.provider_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_prompts_updated_at ON public.prompts;
CREATE TRIGGER tr_prompts_updated_at BEFORE UPDATE ON public.prompts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_jobs_updated_at ON public.jobs;
CREATE TRIGGER tr_jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_board_cards_updated_at ON public.board_cards;
CREATE TRIGGER tr_board_cards_updated_at BEFORE UPDATE ON public.board_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. Recreate handle_new_user with collision-safe username and empty search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  candidate_username TEXT;
  suffix_counter INT := 1;
BEGIN
  base_username := LOWER(COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)));
  candidate_username := base_username;

  -- Collision avoidance loop
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = candidate_username) LOOP
    candidate_username := base_username || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
    suffix_counter := suffix_counter + 1;
    IF suffix_counter > 10 THEN
      candidate_username := base_username || '_' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8);
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.profiles (
    id,
    username,
    email,
    terms_accepted_at,
    terms_version
  )
  VALUES (
    NEW.id,
    candidate_username,
    NEW.email,
    CASE WHEN NEW.raw_user_meta_data->>'terms_accepted' = 'true' THEN NOW() ELSE NULL END,
    NEW.raw_user_meta_data->>'terms_version'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 10. Storage limits and mime types
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'generated-images';

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv']
WHERE id = 'prompt-uploads';

-- 11. Rewrite all RLS policies to use (select auth.uid())
DROP POLICY IF EXISTS "profiles_owner" ON public.profiles;
CREATE POLICY "profiles_owner" ON public.profiles
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "facebook_pages_owner" ON public.facebook_pages;
CREATE POLICY "facebook_pages_owner" ON public.facebook_pages
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "provider_keys_owner" ON public.provider_keys;
CREATE POLICY "provider_keys_owner" ON public.provider_keys
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "prompt_sets_owner" ON public.prompt_sets;
CREATE POLICY "prompt_sets_owner" ON public.prompt_sets
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "prompts_owner" ON public.prompts;
CREATE POLICY "prompts_owner" ON public.prompts
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "generations_owner" ON public.generations;
CREATE POLICY "generations_owner" ON public.generations
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "jobs_owner" ON public.jobs;
CREATE POLICY "jobs_owner" ON public.jobs
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "board_columns_owner" ON public.board_columns;
CREATE POLICY "board_columns_owner" ON public.board_columns
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "board_cards_owner" ON public.board_cards;
CREATE POLICY "board_cards_owner" ON public.board_cards
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "posts_owner" ON public.posts;
CREATE POLICY "posts_owner" ON public.posts
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "activity_log_owner" ON public.activity_log;
CREATE POLICY "activity_log_owner" ON public.activity_log
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "rate_limits_owner" ON public.rate_limits;
CREATE POLICY "rate_limits_owner" ON public.rate_limits
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

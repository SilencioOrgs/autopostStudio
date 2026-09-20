-- ==============================================================================
-- AutoPost Studio: Hardening 2 — Privilege Hardening & Atomic RPC Invariants
-- Phase 1.4 & 1.5: Revoke forgeable writes from authenticated role and implement
--                  single-transaction RPC functions with advisory locks.
-- ==============================================================================

-- ── 1. Privilege Revocations (Fixes H2) ───────────────────────────────────────

-- Revoke write privileges on server-owned tables from authenticated role
REVOKE INSERT, UPDATE, DELETE ON public.jobs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.generations FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.posts FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.activity_log FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.rate_limits FROM authenticated;

-- Revoke direct writes to credentials; credentials written and read via admin client in server code only
REVOKE INSERT, UPDATE, DELETE ON public.facebook_pages FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.provider_keys FROM authenticated;

-- PostgreSQL table-level SELECT overrides a column-level REVOKE. Re-grant only
-- the safe projection so an authenticated PostgREST client cannot retrieve
-- ciphertext even with the default Supabase table grants.
REVOKE SELECT ON public.facebook_pages FROM authenticated;
GRANT SELECT (id, user_id, page_id, page_name, category, followers_count,
  token_last4, token_status, token_expires_at, last_verified_at, is_default,
  created_at, updated_at) ON public.facebook_pages TO authenticated;

REVOKE SELECT ON public.provider_keys FROM authenticated;
GRANT SELECT (id, user_id, provider, key_last4, status, last_verified_at,
  created_at, updated_at) ON public.provider_keys TO authenticated;

-- Revoke direct update on profiles; profile updates go through server route with admin client
REVOKE UPDATE ON public.profiles FROM authenticated;

-- Revoke direct status updates on prompts and board_cards
REVOKE UPDATE (status) ON public.prompts FROM authenticated;
REVOKE UPDATE (status, scheduled_at) ON public.board_cards FROM authenticated;

-- Revoke anonymous and direct inserts on waitlist
DROP POLICY IF EXISTS "waitlist_insert" ON public.waitlist;
REVOKE INSERT ON public.waitlist FROM anon, authenticated;


-- ── 2. Atomic RPC Invariants (Fixes M4, M5, H3) ──────────────────────────────

-- 2.1 approve_prompt
-- Idempotent: if a card exists for this prompt, returns the existing card.
-- Invariants: prompt belongs to caller; status is ready; generation succeeded.
CREATE OR REPLACE FUNCTION public.approve_prompt(p_prompt_id UUID)
RETURNS public.board_cards AS $$
DECLARE
  v_user_id UUID;
  v_prompt RECORD;
  v_generation RECORD;
  v_backlog_col RECORD;
  v_card public.board_cards;
  v_max_pos NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User not authenticated';
  END IF;

  -- 1. Check if card already exists for this prompt (idempotency)
  SELECT * INTO v_card
  FROM public.board_cards
  WHERE prompt_id = p_prompt_id AND user_id = v_user_id;

  IF FOUND THEN
    RETURN v_card;
  END IF;

  -- 2. Fetch and lock prompt
  SELECT * INTO v_prompt
  FROM public.prompts
  WHERE id = p_prompt_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prompt not found or unauthorized';
  END IF;

  IF v_prompt.status != 'ready' THEN
    RAISE EXCEPTION 'Prompt must be in ready status to approve (current: %)', v_prompt.status;
  END IF;

  -- 3. Verify succeeded generation exists
  SELECT * INTO v_generation
  FROM public.generations
  WHERE prompt_id = p_prompt_id AND user_id = v_user_id AND status = 'succeeded'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot approve prompt without a succeeded image generation';
  END IF;

  -- 4. Ensure Backlog column exists (board_date IS NULL)
  SELECT * INTO v_backlog_col
  FROM public.board_columns
  WHERE user_id = v_user_id AND board_date IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.board_columns (user_id, board_date, title, position)
    VALUES (v_user_id, NULL, 'Backlog', 0)
    RETURNING * INTO v_backlog_col;
  END IF;

  -- 5. Calculate next position
  SELECT COALESCE(MAX(position), 0) INTO v_max_pos
  FROM public.board_cards
  WHERE column_id = v_backlog_col.id;

  -- 6. Insert card
  INSERT INTO public.board_cards (
    user_id,
    column_id,
    prompt_id,
    generation_id,
    position,
    status
  )
  VALUES (
    v_user_id,
    v_backlog_col.id,
    p_prompt_id,
    v_generation.id,
    v_max_pos + 1,
    'planned'
  )
  RETURNING * INTO v_card;

  -- 7. Update prompt status
  UPDATE public.prompts
  SET status = 'approved'
  WHERE id = p_prompt_id;

  -- 8. Log activity
  INSERT INTO public.activity_log (user_id, entity_type, entity_id, action, metadata)
  VALUES (
    v_user_id,
    'prompt',
    p_prompt_id,
    'approved',
    jsonb_build_object('card_id', v_card.id, 'generation_id', v_generation.id)
  );

  RETURN v_card;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- 2.2 reject_prompt
CREATE OR REPLACE FUNCTION public.reject_prompt(p_prompt_id UUID, p_reason TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_prompt RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User not authenticated';
  END IF;

  SELECT * INTO v_prompt
  FROM public.prompts
  WHERE id = p_prompt_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prompt not found or unauthorized';
  END IF;

  IF v_prompt.status != 'ready' THEN
    RAISE EXCEPTION 'Only ready prompts can be rejected (current: %)', v_prompt.status;
  END IF;

  UPDATE public.prompts
  SET status = 'draft'
  WHERE id = p_prompt_id;

  INSERT INTO public.activity_log (user_id, entity_type, entity_id, action, metadata)
  VALUES (
    v_user_id,
    'prompt',
    p_prompt_id,
    'rejected',
    jsonb_build_object('reason', COALESCE(p_reason, 'Creator requested revisions'))
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- 2.3 schedule_card
-- Invariants: card & page belong to caller; page token valid; schedule window [now+15min, now+30days];
-- daily cap evaluated in user timezone under advisory xact lock.
CREATE OR REPLACE FUNCTION public.schedule_card(
  p_card_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_page_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_card RECORD;
  v_prompt RECORD;
  v_generation RECORD;
  v_page RECORD;
  v_profile RECORD;
  v_scheduled_date DATE;
  v_post_count INT;
  v_post_id UUID;
  v_lock_key BIGINT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User not authenticated';
  END IF;

  -- 1. Validate schedule window [now + 15 min, now + 30 days]
  IF p_scheduled_at < (NOW() + INTERVAL '15 minutes') THEN
    RAISE EXCEPTION 'Scheduled time must be at least 15 minutes in the future';
  END IF;
  IF p_scheduled_at > (NOW() + INTERVAL '30 days') THEN
    RAISE EXCEPTION 'Scheduled time cannot be more than 30 days in the future';
  END IF;

  -- 2. Verify card ownership
  SELECT * INTO v_card
  FROM public.board_cards
  WHERE id = p_card_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Board card not found or unauthorized';
  END IF;

  -- 3. Verify page ownership and token status
  SELECT * INTO v_page
  FROM public.facebook_pages
  WHERE id = p_page_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facebook Page not found or unauthorized';
  END IF;

  IF v_page.token_status != 'valid' THEN
    RAISE EXCEPTION 'Facebook Page token is not valid (status: %)', v_page.token_status;
  END IF;

  -- 4. Fetch prompt and generation
  SELECT * INTO v_prompt
  FROM public.prompts
  WHERE id = v_card.prompt_id AND user_id = v_user_id;

  SELECT * INTO v_generation
  FROM public.generations
  WHERE id = v_card.generation_id AND user_id = v_user_id;

  -- 5. Fetch user profile for timezone and daily cap
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id;

  -- Determine date in user's timezone
  v_scheduled_date := (p_scheduled_at AT TIME ZONE COALESCE(v_profile.timezone, 'Asia/Manila'))::DATE;

  -- 6. Advisory transaction lock per user + calendar date
  v_lock_key := hashtext(v_user_id::TEXT || ':' || v_scheduled_date::TEXT);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Count scheduled/published posts on this date excluding cancelled and current card
  SELECT COUNT(*) INTO v_post_count
  FROM public.posts p
  WHERE p.user_id = v_user_id
    AND p.status NOT IN ('cancelled')
    AND p.card_id != p_card_id
    AND (p.scheduled_publish_time AT TIME ZONE COALESCE(v_profile.timezone, 'Asia/Manila'))::DATE = v_scheduled_date;

  IF v_post_count >= COALESCE(v_profile.daily_post_cap, 3) THEN
    RAISE EXCEPTION 'Daily post cap of % reached for %', COALESCE(v_profile.daily_post_cap, 3), v_scheduled_date;
  END IF;

  -- 7. Upsert posts row (status scheduled)
  INSERT INTO public.posts (
    user_id,
    card_id,
    facebook_page_id,
    prompt_id,
    generation_id,
    caption_final,
    image_url,
    scheduled_publish_time,
    status
  )
  VALUES (
    v_user_id,
    p_card_id,
    p_page_id,
    v_card.prompt_id,
    v_card.generation_id,
    v_prompt.caption,
    v_generation.storage_path,
    p_scheduled_at,
    'scheduled'
  )
  ON CONFLICT (card_id) DO UPDATE SET
    facebook_page_id = EXCLUDED.facebook_page_id,
    scheduled_publish_time = EXCLUDED.scheduled_publish_time,
    status = 'scheduled',
    error_code = NULL,
    error_message = NULL
  RETURNING id INTO v_post_id;

  -- 8. Update board card
  UPDATE public.board_cards
  SET status = 'scheduled',
      scheduled_at = p_scheduled_at,
      facebook_page_id = p_page_id
  WHERE id = p_card_id;

  -- 9. Update prompt status
  UPDATE public.prompts
  SET status = 'scheduled'
  WHERE id = v_card.prompt_id;

  -- 10. Log activity
  INSERT INTO public.activity_log (user_id, entity_type, entity_id, action, metadata)
  VALUES (
    v_user_id,
    'post',
    v_post_id,
    'scheduled',
    jsonb_build_object(
      'card_id', p_card_id,
      'scheduled_at', p_scheduled_at,
      'facebook_page_id', p_page_id
    )
  );

  RETURN v_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- 2.4 unschedule_card
CREATE OR REPLACE FUNCTION public.unschedule_card(p_card_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_card RECORD;
  v_post RECORD;
  v_needs_fb_delete BOOLEAN := FALSE;
  v_fb_post_id TEXT := NULL;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User not authenticated';
  END IF;

  SELECT * INTO v_card
  FROM public.board_cards
  WHERE id = p_card_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Board card not found or unauthorized';
  END IF;

  -- Fetch associated post
  SELECT * INTO v_post
  FROM public.posts
  WHERE card_id = p_card_id AND user_id = v_user_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_post.fb_post_id IS NOT NULL OR v_post.fb_submitted_at IS NOT NULL THEN
      -- Submitted to Facebook natively: mark cancel_pending and return fb_post_id
      v_needs_fb_delete := TRUE;
      v_fb_post_id := v_post.fb_post_id;
      UPDATE public.posts
      SET status = 'cancel_pending'
      WHERE id = v_post.id;
    ELSE
      UPDATE public.posts
      SET status = 'cancelled'
      WHERE id = v_post.id;
    END IF;
  END IF;

  -- Return card to planned
  UPDATE public.board_cards
  SET status = 'planned',
      scheduled_at = NULL
  WHERE id = p_card_id;

  -- Return prompt to approved
  UPDATE public.prompts
  SET status = 'approved'
  WHERE id = v_card.prompt_id;

  INSERT INTO public.activity_log (user_id, entity_type, entity_id, action, metadata)
  VALUES (
    v_user_id,
    'card',
    p_card_id,
    'unscheduled',
    jsonb_build_object('post_id', v_post.id, 'cancel_pending', v_needs_fb_delete)
  );

  RETURN jsonb_build_object(
    'card_id', p_card_id,
    'post_id', v_post.id,
    'needs_fb_delete', v_needs_fb_delete,
    'fb_post_id', v_fb_post_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- 2.5 move_card
CREATE OR REPLACE FUNCTION public.move_card(
  p_card_id UUID,
  p_column_id UUID,
  p_position NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_card RECORD;
  v_col RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User not authenticated';
  END IF;

  SELECT * INTO v_card
  FROM public.board_cards
  WHERE id = p_card_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Board card not found or unauthorized';
  END IF;

  SELECT * INTO v_col
  FROM public.board_columns
  WHERE id = p_column_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target board column not found or unauthorized';
  END IF;

  -- Update position and column without changing status
  UPDATE public.board_cards
  SET column_id = p_column_id,
      position = p_position
  WHERE id = p_card_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- 2.6 claim_jobs (Worker queue atomic claim)
-- Skips paused users, enforces per-user concurrency cap, uses SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_jobs(
  p_worker TEXT,
  p_batch INT DEFAULT 3,
  p_per_user INT DEFAULT 1
)
RETURNS SETOF public.jobs AS $$
BEGIN
  RETURN QUERY
  WITH eligible_jobs AS (
    SELECT j.id
    FROM public.jobs j
    JOIN public.profiles pr ON pr.id = j.user_id
    WHERE j.status = 'queued'
      AND j.run_after <= NOW()
      AND pr.generation_paused = FALSE
      AND (pr.generation_paused_until IS NULL OR pr.generation_paused_until <= NOW())
      AND (
        SELECT COUNT(*)
        FROM public.jobs running_j
        WHERE running_j.user_id = j.user_id
          AND running_j.status = 'running'
      ) < p_per_user
    ORDER BY j.priority DESC, j.created_at ASC
    FOR UPDATE OF j SKIP LOCKED
    LIMIT p_batch
  )
  UPDATE public.jobs j
  SET status = 'running',
      locked_by = p_worker,
      locked_at = NOW(),
      attempts = j.attempts + 1
  FROM eligible_jobs ej
  WHERE j.id = ej.id
  RETURNING j.*;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- 2.7 reap_stuck_jobs
CREATE OR REPLACE FUNCTION public.reap_stuck_jobs(p_timeout INTERVAL DEFAULT INTERVAL '10 minutes')
RETURNS INT AS $$
DECLARE
  v_reaped_count INT := 0;
  v_stuck RECORD;
BEGIN
  FOR v_stuck IN
    SELECT *
    FROM public.jobs
    WHERE status = 'running'
      AND locked_at < (NOW() - p_timeout)
    FOR UPDATE SKIP LOCKED
  LOOP
    IF v_stuck.attempts < v_stuck.max_attempts THEN
      -- Requeue for retry
      UPDATE public.jobs
      SET status = 'queued',
          locked_at = NULL,
          locked_by = NULL,
          run_after = NOW() + INTERVAL '1 minute',
          last_error = 'Worker timed out; job requeued'
      WHERE id = v_stuck.id;
    ELSE
      -- Fail permanently
      UPDATE public.jobs
      SET status = 'failed',
          locked_at = NULL,
          last_error = 'Job timed out and exceeded maximum retry attempts'
      WHERE id = v_stuck.id;

      -- Reset prompt if generate_image
      IF v_stuck.type = 'generate_image' AND (v_stuck.payload->>'prompt_id') IS NOT NULL THEN
        UPDATE public.prompts
        SET status = 'failed'
        WHERE id = (v_stuck.payload->>'prompt_id')::UUID;
      END IF;
    END IF;

    v_reaped_count := v_reaped_count + 1;
  END LOOP;

  RETURN v_reaped_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

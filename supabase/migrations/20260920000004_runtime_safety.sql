-- Runtime safety and state-transition fixes. Apply after the existing hardening migrations.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Manila';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS image_model text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS generation_paused_until timestamptz;

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_status_check
  CHECK (status IN ('scheduled', 'publishing', 'published', 'failed', 'cancelled', 'cancel_pending'));
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS publish_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS fb_submitted_at timestamptz;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS fb_mode text CHECK (fb_mode IN ('native_schedule', 'immediate'));

CREATE UNIQUE INDEX IF NOT EXISTS jobs_one_active_generation_per_prompt
  ON public.jobs (user_id, (payload->>'prompt_id'))
  WHERE type = 'generate_image' AND status IN ('queued', 'running');
CREATE UNIQUE INDEX IF NOT EXISTS posts_one_per_card ON public.posts (card_id) WHERE card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_due_for_publish ON public.posts (status, scheduled_publish_time);

-- One transaction prevents duplicate generation spend. It only accepts draft/failed prompts.
CREATE OR REPLACE FUNCTION public.enqueue_generation_prompts(p_prompt_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_queued integer := 0;
  v_skipped integer := 0;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF cardinality(p_prompt_ids) IS NULL OR cardinality(p_prompt_ids) > 100 THEN
    RAISE EXCEPTION 'Select between 1 and 100 prompts';
  END IF;
  WITH candidates AS (
    SELECT id FROM public.prompts WHERE user_id = v_user_id AND id = ANY(p_prompt_ids)
      AND status IN ('draft', 'failed') FOR UPDATE
  ), inserted AS (
    INSERT INTO public.jobs (user_id, type, payload, status, priority, attempts, max_attempts, run_after)
    SELECT v_user_id, 'generate_image', jsonb_build_object('prompt_id', id, 'user_id', v_user_id),
      'queued', 0, 0, 3, now() FROM candidates ON CONFLICT DO NOTHING
    RETURNING payload->>'prompt_id' AS prompt_id
  ), updated AS (
    UPDATE public.prompts p SET status = 'queued'
    WHERE p.user_id = v_user_id AND p.id IN (SELECT prompt_id::uuid FROM inserted) RETURNING p.id
  ) SELECT count(*) INTO v_queued FROM updated;
  v_skipped := cardinality(p_prompt_ids) - v_queued;
  RETURN jsonb_build_object('queued', v_queued, 'skipped', v_skipped);
END;
$$;
GRANT EXECUTE ON FUNCTION public.enqueue_generation_prompts(uuid[]) TO authenticated;

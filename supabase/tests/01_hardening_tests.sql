-- ==============================================================================
-- AutoPost Studio: Hardening SQL Tests (pgTAP / Supabase db test)
-- Tests RLS policies, privilege revocations, RPC invariants, and constraints.
-- ==============================================================================

BEGIN;
SELECT plan(12);

-- 1. Test: Single Backlog column constraint per user
-- Inserting second Backlog (board_date IS NULL) for same user must fail
PREPARE insert_backlog AS
  INSERT INTO public.board_columns (user_id, board_date, title, position)
  VALUES ('00000000-0000-0000-0000-000000000001', NULL, 'Backlog Duplicate', 1);

-- First insert succeeds
INSERT INTO public.profiles (id, username, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'test_user_1', 'user1@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.board_columns (user_id, board_date, title, position)
VALUES ('00000000-0000-0000-0000-000000000001', NULL, 'Backlog', 0);

SELECT throws_ok(
  'insert_backlog',
  '23505', -- unique_violation
  NULL,
  'Cannot insert multiple Backlog columns (board_date IS NULL) for the same user'
);

-- 2. Test: Case-insensitive unique username
PREPARE insert_duplicate_username AS
  INSERT INTO public.profiles (id, username, email)
  VALUES ('00000000-0000-0000-0000-000000000002', 'TEST_USER_1', 'user2@example.com');

SELECT throws_ok(
  'insert_duplicate_username',
  '23505',
  NULL,
  'Profiles table enforces case-insensitive unique usernames'
);

-- 3. Test: One active board card per prompt
INSERT INTO public.prompts (id, user_id, image_prompt, content_hash)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000001',
  'Modern tropical villa',
  'hash_001'
);

INSERT INTO public.board_cards (id, user_id, column_id, prompt_id, position)
SELECT
  '22222222-2222-2222-2222-222222222221',
  '00000000-0000-0000-0000-000000000001',
  c.id,
  '11111111-1111-1111-1111-111111111111',
  1
FROM public.board_columns c
WHERE c.user_id = '00000000-0000-0000-0000-000000000001' AND c.board_date IS NULL
LIMIT 1;

PREPARE insert_duplicate_card_prompt AS
  INSERT INTO public.board_cards (id, user_id, column_id, prompt_id, position)
  SELECT
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    c.id,
    '11111111-1111-1111-1111-111111111111',
    2
  FROM public.board_columns c
  WHERE c.user_id = '00000000-0000-0000-0000-000000000001' AND c.board_date IS NULL
  LIMIT 1;

SELECT throws_ok(
  'insert_duplicate_card_prompt',
  '23505',
  NULL,
  'Only one active board card allowed per prompt'
);

-- 4. Test: One post per card constraint (posts.card_id UNIQUE)
INSERT INTO public.posts (id, user_id, card_id, status)
VALUES ('33333333-3333-3333-3333-333333333331', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222221', 'scheduled');

PREPARE insert_duplicate_post_card AS
  INSERT INTO public.posts (id, user_id, card_id, status)
  VALUES ('33333333-3333-3333-3333-333333333332', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222221', 'scheduled');

SELECT throws_ok(
  'insert_duplicate_post_card',
  '23505',
  NULL,
  'Only one post record allowed per card_id'
);

-- 5. Test: Posts status check constraint accepts publishing and cancel_pending
PREPARE insert_publishing_post AS
  INSERT INTO public.posts (id, user_id, status)
  VALUES ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'publishing');

PREPARE insert_cancel_pending_post AS
  INSERT INTO public.posts (id, user_id, status)
  VALUES ('33333333-3333-3333-3333-333333333334', '00000000-0000-0000-0000-000000000001', 'cancel_pending');

SELECT lives_ok('insert_publishing_post', 'Posts table allows status "publishing"');
SELECT lives_ok('insert_cancel_pending_post', 'Posts table allows status "cancel_pending"');

-- 6. Test: Revoked write privileges from authenticated role on jobs and posts
SET ROLE authenticated;

PREPARE auth_insert_job AS
  INSERT INTO public.jobs (user_id, type, payload)
  VALUES ('00000000-0000-0000-0000-000000000001', 'generate_image', '{}'::jsonb);

SELECT throws_ok(
  'auth_insert_job',
  '42501', -- permission_denied
  NULL,
  'authenticated role is denied INSERT on jobs table'
);

PREPARE auth_insert_post AS
  INSERT INTO public.posts (user_id, status)
  VALUES ('00000000-0000-0000-0000-000000000001', 'scheduled');

SELECT throws_ok(
  'auth_insert_post',
  '42501',
  NULL,
  'authenticated role is denied INSERT on posts table'
);

-- 7. Test: Column-level REVOKE SELECT on ciphertext columns
PREPARE auth_select_token_ciphertext AS
  SELECT token_ciphertext FROM public.facebook_pages;

SELECT throws_ok(
  'auth_select_token_ciphertext',
  '42501',
  NULL,
  'authenticated role is denied SELECT on facebook_pages.token_ciphertext'
);

PREPARE auth_select_key_ciphertext AS
  SELECT key_ciphertext FROM public.provider_keys;

SELECT throws_ok(
  'auth_select_key_ciphertext',
  '42501',
  NULL,
  'authenticated role is denied SELECT on provider_keys.key_ciphertext'
);

-- 8. Test: Revoked direct UPDATE on profiles
PREPARE auth_update_profile AS
  UPDATE public.profiles SET daily_post_cap = 100;

SELECT throws_ok(
  'auth_update_profile',
  '42501',
  NULL,
  'authenticated role is denied UPDATE on profiles'
);

-- 9. Test: Revoked direct status UPDATE on prompts
PREPARE auth_update_prompt_status AS
  UPDATE public.prompts SET status = 'posted';

SELECT throws_ok(
  'auth_update_prompt_status',
  '42501',
  NULL,
  'authenticated role is denied UPDATE (status) on prompts'
);

SELECT * FROM finish();
ROLLBACK;

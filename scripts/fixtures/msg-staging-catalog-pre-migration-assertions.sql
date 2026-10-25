\set ON_ERROR_STOP on
-- BEFORE migration: catalog-derived counts and current staging update authority.
DO $test$
DECLARE
  column_count integer;
  policy_count integer;
  constraint_count integer;
  legacy_policy_count integer;
BEGIN
  SELECT count(*) INTO column_count FROM pg_attribute a
    JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('users','orders','conversations','messages')
      AND a.attnum>0 AND NOT a.attisdropped;
  SELECT count(*) INTO policy_count FROM pg_policies
    WHERE (schemaname='public' AND tablename IN ('users','orders','conversations','messages'))
       OR (schemaname='storage' AND tablename='objects' AND policyname LIKE 'transaction_attachments%');
  SELECT count(*) INTO constraint_count FROM pg_constraint con
    JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('users','orders','conversations','messages');
  SELECT count(*) INTO legacy_policy_count FROM pg_policies
    WHERE schemaname='storage' AND policyname LIKE 'transaction_attachments%';
  IF column_count<>48 OR policy_count<>12 OR constraint_count<>25 OR legacy_policy_count<>4 THEN
    RAISE EXCEPTION 'CATALOG_MIRROR_COUNTS_MISMATCH: cols=%, policies=%, constraints=%, oldStorage=%',
      column_count,policy_count,constraint_count,legacy_policy_count;
  END IF;
  IF NOT has_table_privilege('authenticated','public.messages','UPDATE') THEN
    RAISE EXCEPTION 'ORIGINAL_MESSAGE_GRANT_NOT_REPRODUCED';
  END IF;
END $test$;
SELECT 'STAGING_CATALOG_MIRROR_COUNTS_AND_GRANTS_PASS';
-- The original staging participant policy allows a participant to change
-- the sender_id of another participant's message. Prove only on synthetic rows.
BEGIN;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
SET ROLE authenticated;
DO $test$
DECLARE affected integer;
BEGIN
  UPDATE public.messages SET sender_id='22222222-2222-4222-8222-222222222222'
  WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN
    RAISE EXCEPTION 'PRE_MIGRATION_ROLE_MUTATION_NOT_REPRODUCED count=%',affected;
  END IF;
END $test$;
RESET ROLE;
ROLLBACK;
DO $test$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.messages
 WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
   AND sender_id='11111111-1111-4111-8111-111111111111')
 THEN RAISE EXCEPTION 'PRE_MIGRATION_TEST_ROLLBACK_FAILED'; END IF;
END $test$;
SELECT 'SYNTHETIC_BASELINE_AUTHORIZATION_RISK_PROVED_AND_ROLLED_BACK';

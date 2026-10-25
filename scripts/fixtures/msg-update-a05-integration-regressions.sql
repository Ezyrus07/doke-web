\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
-- Applied both versioned migrations: MSG-A05 (older) followed by
-- MSG update authority (newer). Explicitly validate trigger cooperation.
DO $test$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.messages'::regclass
      AND tgname='messages_attachment_retention_after_removed')
 THEN RAISE EXCEPTION 'MISSING_ATTACHMENT_RETENTION_TRIGGER'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.messages'::regclass
      AND tgname='trg_messages_authenticated_update_authority')
 THEN RAISE EXCEPTION 'MISSING_MESSAGE_UPDATE_GUARD'; END IF;
END $test$;
SELECT 'BOTH_MESSAGE_TRIGGERS_INSTALLED';

SET ROLE service_role;
WITH x AS (
 SELECT public.prepare_transaction_attachment_uploads_internal(
  '11111111-1111-4111-8111-111111111111',
  'conversation',
  'synthetic-conversation',
  '[{"name":"integration.pdf","type":"application/pdf","size":2048}]'::jsonb
 ) AS payload
)
SELECT payload->'items'->0->>'attachmentId' AS attachment_id,
       payload->'items'->0->>'path' AS object_path FROM x \gset
RESET ROLE;
SELECT set_config('kontrat.integration_attachment_id', :'attachment_id',false);
SELECT set_config('kontrat.integration_object_path', :'object_path',false);
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SET ROLE authenticated;
INSERT INTO storage.objects(bucket_id,name,owner_id)
 VALUES('transaction-attachments',:'object_path','11111111-1111-4111-8111-111111111111');
RESET ROLE;
SET ROLE service_role;
SELECT public.confirm_transaction_attachment_uploads_internal(
 '11111111-1111-4111-8111-111111111111',
 ARRAY[:'attachment_id'::uuid]);
SELECT public.attach_transaction_attachments_to_message_internal(
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 ARRAY[:'attachment_id'::uuid]);
RESET ROLE;
DO $test$ BEGIN
 IF NOT EXISTS(
  SELECT 1 FROM private.transaction_attachment_lifecycle
   WHERE id=current_setting('kontrat.integration_attachment_id')::uuid AND status='attached'
 ) THEN RAISE EXCEPTION 'PRE_READ_ATTACHMENT_NOT_ATTACHED'; END IF;
END $test$;
SELECT 'ATTACHMENT_LINKED_TO_SYNTHETIC_MESSAGE';
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
SET ROLE authenticated;
UPDATE public.messages SET status='read'
 WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
RESET ROLE;
DO $test$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM private.transaction_attachment_lifecycle
  WHERE id=current_setting('kontrat.integration_attachment_id')::uuid AND status='attached')
 THEN RAISE EXCEPTION 'READ_INCORRECTLY_ORPHANED_ATTACHMENT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.messages
  WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND status='read')
 THEN RAISE EXCEPTION 'LEGITIMATE_READ_FAILED'; END IF;
END $test$;
SELECT 'RECIPIENT_READ_DOES_NOT_ORPHAN_ATTACHMENT';
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
SET ROLE authenticated;
DO $test$
DECLARE rejected boolean:=false;
BEGIN
 BEGIN
  UPDATE public.messages SET status='removed',body=''
   WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'NON_SENDER_REMOVAL_ALLOWED'; END IF;
END $test$;
RESET ROLE;
DO $test$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM private.transaction_attachment_lifecycle
  WHERE id=current_setting('kontrat.integration_attachment_id')::uuid AND status='attached')
 THEN RAISE EXCEPTION 'REJECTED_REMOVAL_ORPHANED_ATTACHMENT'; END IF;
END $test$;
SELECT 'DENIED_REMOVAL_DOES_NOT_ORPHAN_ATTACHMENT';
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SET ROLE authenticated;
UPDATE public.messages SET status='removed',body=''
 WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
RESET ROLE;
DO $test$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM private.transaction_attachment_lifecycle
  WHERE id=current_setting('kontrat.integration_attachment_id')::uuid
    AND status='orphaned'
    AND retain_until >= now()+interval '29 days')
 THEN RAISE EXCEPTION 'SENDER_REMOVAL_FAILED_TO_ORPHAN'; END IF;
END $test$;
SELECT 'SENDER_REMOVAL_ORPHANS_WITH_RETENTION';
-- A deliberate BLOCKER assertion for the source at PR #559:
-- row-returning helper still exposes EXECUTE to authenticated.
DO $test$ BEGIN
 IF NOT has_function_privilege('authenticated',
     'private.transaction_attachment_from_path(text)','EXECUTE') THEN
  RAISE EXCEPTION 'EXPECTED_SOURCE_GRANT_DRIFT_CHECK';
 END IF;
END $test$;
SELECT 'MSG_A05_KNOWN_UNSAFE_ROW_HELPER_GRANT_REQUIRES_SEPARATE_PATCH';
-- Positive demonstration of an undesired source permission: a synthetic
-- unrelated actor can receive the full private lifecycle record via the
-- function granted to authenticated. DO NOT run on hosted projects.
SELECT set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999999',false);
SET ROLE authenticated;
DO $test$
DECLARE extracted uuid;
BEGIN
 SELECT (private.transaction_attachment_from_path(
   current_setting('kontrat.integration_object_path'))).id INTO extracted;
 IF extracted IS DISTINCT FROM current_setting('kontrat.integration_attachment_id')::uuid
 THEN
  RAISE EXCEPTION 'EXPECTED_SYNTHETIC_EXPOSURE_NOT_REPRODUCED';
 END IF;
END $test$;
RESET ROLE;
SELECT 'PR559_SYNTHETIC_PRIVATE_ROW_EXPOSURE_CONFIRMED_NO_GO';
SELECT 'MSG_UPDATE_A05_TRIGGER_INTEGRATION_PASS_WITH_RECORDED_NO_GO';

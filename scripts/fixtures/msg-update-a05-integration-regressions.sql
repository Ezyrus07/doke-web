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
-- Hardened contract: a private row-returning SECURITY DEFINER function
-- is exclusively callable by the service role; public users cannot fetch it.
DO $test$
BEGIN
 IF has_function_privilege('authenticated',
      'private.transaction_attachment_from_path(text)','EXECUTE')
 THEN RAISE EXCEPTION 'AUTHENTICATED_PRIVATE_ROW_EXECUTE_EXPOSED'; END IF;
 IF has_function_privilege('anon',
      'private.transaction_attachment_from_path(text)','EXECUTE')
 THEN RAISE EXCEPTION 'ANON_PRIVATE_ROW_EXECUTE_EXPOSED'; END IF;
 IF NOT has_function_privilege('service_role',
      'private.transaction_attachment_from_path(text)','EXECUTE')
 THEN RAISE EXCEPTION 'SERVICE_PRIVATE_ROW_EXECUTE_MISSING'; END IF;
END $test$;
SELECT 'PRIVATE_ROW_HELPER_SERVICE_ROLE_ONLY';

SELECT set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999999',false);
SET ROLE authenticated;
DO $test$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM private.transaction_attachment_from_path(
    current_setting('kontrat.integration_object_path'));
 EXCEPTION WHEN insufficient_privilege THEN
  denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PRIVATE_LIFECYCLE_ROW_ACCESS_NOT_DENIED'; END IF;
 IF private.can_read_transaction_attachment(
     current_setting('kontrat.integration_object_path'),
     '11111111-1111-4111-8111-111111111111')
 THEN RAISE EXCEPTION 'SPOOFED_READ_ACTOR_ACCEPTED'; END IF;
END $test$;
RESET ROLE;
SELECT 'UNRELATED_USER_CANNOT_READ_PRIVATE_LIFECYCLE_ROW';

-- Separate pending intent tests a valid upload and actor-id spoofing.
SET ROLE service_role;
WITH prepared AS (
 SELECT public.prepare_transaction_attachment_uploads_internal(
  '11111111-1111-4111-8111-111111111111',
  'conversation',
  'synthetic-conversation',
  '[{"name":"pending-integration.pdf","type":"application/pdf","size":1024}]'::jsonb
 ) AS payload
)
SELECT payload->'items'->0->>'path' AS pending_object_path FROM prepared \gset
RESET ROLE;
SELECT set_config('kontrat.integration_pending_path', :'pending_object_path',false);
SELECT set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999999',false);
SET ROLE authenticated;
DO $test$
BEGIN
 IF private.can_upload_transaction_attachment(
     current_setting('kontrat.integration_pending_path'),
     '11111111-1111-4111-8111-111111111111')
 THEN RAISE EXCEPTION 'SPOOFED_UPLOAD_ACTOR_ACCEPTED'; END IF;
END $test$;
RESET ROLE;
SELECT 'UNRELATED_USER_CANNOT_SPOOF_UPLOAD';

SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SET ROLE authenticated;
DO $test$
BEGIN
 IF NOT private.can_upload_transaction_attachment(
     current_setting('kontrat.integration_pending_path'),
     '11111111-1111-4111-8111-111111111111')
 THEN RAISE EXCEPTION 'LEGITIMATE_UPLOAD_REGRESSION'; END IF;
 IF NOT private.can_read_transaction_attachment(
     current_setting('kontrat.integration_object_path'),
     '11111111-1111-4111-8111-111111111111')
 THEN RAISE EXCEPTION 'LEGITIMATE_READ_REGRESSION'; END IF;
END $test$;
RESET ROLE;
SELECT 'OWNER_CAN_READ_AND_UPLOAD_VALID_ATTACHMENTS';

SELECT 'MSG_UPDATE_A05_COMPOSITE_HARDENED_PASS';

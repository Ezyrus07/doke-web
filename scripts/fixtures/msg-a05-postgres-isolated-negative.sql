\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
-- These tests exclusively use local synthetic tables, never hosted databases.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    PERFORM public.prepare_transaction_attachment_uploads_internal(
      '11111111-1111-4111-8111-111111111111','order','synthetic-order','[]'::jsonb);
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'AUTHENTICATED_CAN_EXECUTE_PRIVILEGED_RPC'; END IF;
END $$;
SELECT 'DIRECT_AUTHENTICATED_RPC_DENIED';
RESET ROLE;
SET ROLE service_role;
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    PERFORM public.prepare_transaction_attachment_uploads_internal(
      '99999999-9999-4999-8999-999999999999','order','synthetic-order',
      '[{"name":"probe.pdf","type":"application/pdf","size":1024}]'::jsonb);
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'INACTIVE_ACTOR_WAS_AUTHORIZED'; END IF;
END $$;
SELECT 'INACTIVE_ACTOR_DENIED';
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    PERFORM public.prepare_transaction_attachment_uploads_internal(
      '11111111-1111-4111-8111-111111111111','order','synthetic-order',
      '[{"name":"unsafe.exe","type":"application/x-msdownload","size":1024}]'::jsonb);
  EXCEPTION WHEN invalid_parameter_value THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'UNSAFE_MIME_ACCEPTED'; END IF;
END $$;
SELECT 'UNSAFE_MIME_DENIED';
WITH result AS (
  SELECT public.prepare_transaction_attachment_uploads_internal(
   '11111111-1111-4111-8111-111111111111','conversation','synthetic-conversation',
   '[{"name":"photo.png","type":"image/png","size":100}]'::jsonb
  ) AS data
) SELECT data->'items'->0->>'attachmentId' AS conv_attachment_id,
         data->'items'->0->>'path' AS conv_path FROM result \gset
SELECT set_config('kontrat.conv_attachment_id', :'conv_attachment_id',false);
SELECT set_config('kontrat.conv_path', :'conv_path',false);
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
SET ROLE authenticated;
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO storage.objects(bucket_id,name,owner_id)
      VALUES('transaction-attachments',current_setting('kontrat.conv_path'),
             '22222222-2222-4222-8222-222222222222');
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'OTHER_USER_CAN_UPLOAD_TO_OWNER_INTENT'; END IF;
END $$;
SELECT 'CROSS_ACTOR_STORAGE_DENIED';
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SET ROLE authenticated;
INSERT INTO storage.objects(bucket_id,name,owner_id)
  VALUES('transaction-attachments',:'conv_path','11111111-1111-4111-8111-111111111111');
RESET ROLE;
SET ROLE service_role;
SELECT public.confirm_transaction_attachment_uploads_internal(
  '11111111-1111-4111-8111-111111111111',ARRAY[:'conv_attachment_id'::uuid]);
SELECT public.attach_transaction_attachments_to_message_internal(
  '11111111-1111-4111-8111-111111111111',
  '55555555-5555-4555-8555-555555555555',
  ARRAY[:'conv_attachment_id'::uuid]);
RESET ROLE;
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM private.transaction_attachment_lifecycle
      WHERE id=current_setting('kontrat.conv_attachment_id')::uuid
        AND status='attached' AND message_id='55555555-5555-4555-8555-555555555555')
  THEN RAISE EXCEPTION 'ATTACH_TO_MESSAGE_FAILED'; END IF;
END $$;
SELECT 'CONVERSATION_MESSAGE_BINDING_PASS';
UPDATE public.messages SET status='removed'
  WHERE id='55555555-5555-4555-8555-555555555555';
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM private.transaction_attachment_lifecycle
      WHERE id=current_setting('kontrat.conv_attachment_id')::uuid
        AND status='orphaned' AND retain_until>now()+interval '29 days')
  THEN RAISE EXCEPTION 'MESSAGE_REMOVAL_RETENTION_FAILED'; END IF;
END $$;
SELECT 'MESSAGE_RETENTION_TRIGGER_PASS';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
DECLARE updates integer; deletes integer;
BEGIN
  UPDATE storage.objects SET owner_id='22222222-2222-4222-8222-222222222222'
    WHERE name=current_setting('kontrat.conv_path');
  GET DIAGNOSTICS updates = ROW_COUNT;
  DELETE FROM storage.objects WHERE name=current_setting('kontrat.conv_path');
  GET DIAGNOSTICS deletes = ROW_COUNT;
  IF updates<>0 OR deletes<>0 THEN RAISE EXCEPTION 'UNAUTHORIZED_STORAGE_UPDATE_OR_DELETE:%:%',updates,deletes; END IF;
END $$;
SELECT 'AUTHENTICATED_UPDATE_DELETE_DENIED';
RESET ROLE;
SELECT 'MSG_A05_ISOLATED_NEGATIVE_AND_LIFECYCLE_PASS';

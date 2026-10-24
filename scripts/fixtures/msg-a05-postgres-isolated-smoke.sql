\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_catalog.pg_proc
   WHERE pronamespace='public'::regnamespace
     AND proname IN ('prepare_transaction_attachment_uploads_internal','confirm_transaction_attachment_uploads_internal','attach_transaction_attachments_to_message_internal','authorize_transaction_attachment_removal_internal','mark_transaction_attachment_removed_internal','list_transaction_attachment_cleanup_candidates_internal','mark_transaction_attachment_cleanup_result_internal');
  IF n<>7 THEN RAISE EXCEPTION 'EXPECTED_7_RPCS_GOT_%',n; END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND policyname LIKE 'transaction_attachments%')<>2 THEN RAISE EXCEPTION 'POLICY_REPLACEMENT_FAILURE'; END IF;
END $$;
SELECT 'SCHEMA_CREATED_RPCS_7_POLICIES_2';
DO $$
DECLARE x regprocedure;
BEGIN
  FOR x IN SELECT p.oid::regprocedure FROM pg_proc p
    WHERE p.pronamespace='public'::regnamespace
      AND p.proname LIKE '%transaction_attachment%_internal'
  LOOP
    IF has_function_privilege('anon',x::oid,'EXECUTE') THEN RAISE EXCEPTION 'ANON_EXECUTE_ENABLED_%',x; END IF;
    IF has_function_privilege('authenticated',x::oid,'EXECUTE') THEN RAISE EXCEPTION 'AUTHENTICATED_EXECUTE_ENABLED_%',x; END IF;
    IF NOT has_function_privilege('service_role',x::oid,'EXECUTE') THEN RAISE EXCEPTION 'SERVICE_ROLE_EXECUTE_MISSING_%',x; END IF;
  END LOOP;
END $$;
SELECT 'RPC_GRANTS_SERVICE_ROLE_ONLY';
SET ROLE service_role;
WITH result AS (
  SELECT public.prepare_transaction_attachment_uploads_internal(
    '11111111-1111-4111-8111-111111111111','order','synthetic-order',
    '[{"name":"synthetic.pdf","type":"application/pdf","size":2048}]'::jsonb
  ) AS payload
)
SELECT payload->'items'->0->>'attachmentId' AS order_attachment_id,
       payload->'items'->0->>'path' AS order_path FROM result \gset
\echo PREPARE_ORDER_PASS
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SET ROLE authenticated;
INSERT INTO storage.objects(bucket_id,name,owner_id)
 VALUES('transaction-attachments', :'order_path','11111111-1111-4111-8111-111111111111');
SELECT 'AUTHENTICATED_PENDING_INSERT_PASS';
RESET ROLE;
SET ROLE service_role;
SELECT public.confirm_transaction_attachment_uploads_internal(
   '11111111-1111-4111-8111-111111111111',ARRAY[:'order_attachment_id'::uuid]);
RESET ROLE;
SELECT set_config('kontrat.order_attachment_id', :'order_attachment_id', false);
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM private.transaction_attachment_lifecycle
    WHERE id = current_setting('kontrat.order_attachment_id')::uuid AND status='uploaded' AND uploaded_at IS NOT NULL)
 THEN RAISE EXCEPTION 'CONFIRM_FAILED'; END IF;
END $$;
SELECT 'CONFIRM_ORDER_PASS';

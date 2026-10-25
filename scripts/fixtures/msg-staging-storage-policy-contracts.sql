\set ON_ERROR_STOP on
-- Carry the synthetic object path across independent psql -f sessions.
SELECT name AS object_path FROM storage.objects WHERE bucket_id='transaction-attachments' AND owner_id='11111111-1111-4111-8111-111111111111' LIMIT 1 \gset
SELECT set_config('kontrat.integration_object_path', :'object_path', false);
-- This fixture runs AFTER the composite lifecycle test, when the synthetic
-- Storage object is orphaned. Direct writes must be denied to authenticated.
DO $checks$
DECLARE p_update integer; p_delete integer;
BEGIN
 IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage'
 AND tablename='objects' AND cmd IN ('UPDATE','DELETE')
 AND (policyname LIKE 'transaction_attachments%')) THEN
  RAISE EXCEPTION 'CLIENT_STORAGE_MUTATION_POLICY_STILL_EXISTS';
 END IF;
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='storage'
   AND tablename='objects' AND policyname IN
   ('transaction_attachments_lifecycle_select','transaction_attachments_lifecycle_insert'))<>2 THEN
  RAISE EXCEPTION 'LIFECYCLE_STORAGE_POLICY_MISSING';
 END IF;
END $checks$;
SELECT 'STORAGE_ATTACHMENT_INSERT_SELECT_ONLY_POLICY_PASS';
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SET ROLE authenticated;
DO $checks$
DECLARE changed integer;
BEGIN
 UPDATE storage.objects SET owner_id='99999999-9999-4999-8999-999999999999'
 WHERE bucket_id='transaction-attachments'
 AND name=current_setting('kontrat.integration_object_path');
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>0 THEN RAISE EXCEPTION 'DIRECT_STORAGE_UPDATE_ALLOWED'; END IF;
 DELETE FROM storage.objects
 WHERE bucket_id='transaction-attachments'
 AND name=current_setting('kontrat.integration_object_path');
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>0 THEN RAISE EXCEPTION 'DIRECT_STORAGE_DELETE_ALLOWED'; END IF;
END $checks$;
RESET ROLE;
DO $checks$ BEGIN
 IF NOT EXISTS (
 SELECT 1 FROM storage.objects WHERE bucket_id='transaction-attachments'
 AND name=current_setting('kontrat.integration_object_path')
 AND owner_id='11111111-1111-4111-8111-111111111111'
 ) THEN RAISE EXCEPTION 'DENIED_MUTATION_CHANGED_STORAGE_OBJECT'; END IF;
END $checks$;
SELECT 'DIRECT_CLIENT_STORAGE_UPDATE_DELETE_DENIED';
-- Trusted server-side Storage cleanup can still delete the object; rollback
-- the synthetic mutation so the rest of the test has no durable side effect.
BEGIN;
SET ROLE service_role;
DELETE FROM storage.objects WHERE bucket_id='transaction-attachments'
 AND name=current_setting('kontrat.integration_object_path');
DO $checks$ BEGIN
 IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='transaction-attachments'
 AND name=current_setting('kontrat.integration_object_path'))
 THEN RAISE EXCEPTION 'SERVICE_ROLE_STORAGE_DELETE_REGRESSED'; END IF;
END $checks$;
RESET ROLE;
ROLLBACK;
SELECT 'SERVICE_ROLE_STORAGE_CLEANUP_ALLOWED_AND_ROLLED_BACK';

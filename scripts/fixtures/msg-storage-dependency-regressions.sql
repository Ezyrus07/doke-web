\set ON_ERROR_STOP on
-- Synthetic, transaction-scoped assertions. Never select hosted/business data.
-- Definitions: P31 fe74f69d; KYC de8d7fea; ANA 6eb8e553 (full pins in dependency baseline).
-- Requires native Auth/Storage; does not INSERT/UPDATE/DELETE storage.objects.
\if :{?legacy}
\else
  \echo REFUSE_MISSING_FIXTURE_PHASE
  \quit 2
\endif
BEGIN;
SELECT set_config('kontrat.fixture.legacy', :'legacy', true);
DO $test$ BEGIN
 IF current_setting('kontrat.isolated_storage_fixture',true) IS DISTINCT FROM 'true'
 OR current_database()<>'postgres' OR current_user<>'postgres'
 OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 THEN
 RAISE EXCEPTION 'REFUSE_DEPENDENCY_REGRESSION_TARGET'; END IF;
 IF (SELECT prosecdef FROM pg_proc WHERE oid='public.current_user_role()'::regprocedure)
 OR (SELECT prosecdef FROM pg_proc WHERE oid='public.is_active_admin_or_moderator()'::regprocedure) THEN
 RAISE EXCEPTION 'IDENTITY_HELPER_INVOKER_DRIFT'; END IF;
 IF has_table_privilege('authenticated','public.messages','TRUNCATE')
 OR has_table_privilege('anon','public.users','TRUNCATE')
 OR has_table_privilege('authenticated','public.services','INSERT') THEN
 RAISE EXCEPTION 'NATIVE_DEFAULT_ACL_LEAK'; END IF;
 IF has_function_privilege('authenticated','public.record_analytics_behavior_event_v1(jsonb)','EXECUTE')
 OR has_function_privilege('anon','public.run_analytics_order_reconciliation_v1(timestamptz,timestamptz)','EXECUTE')
 OR has_table_privilege('authenticated','private.analytics_behavior_events_v1','INSERT')
 OR has_table_privilege('service_role','private.analytics_behavior_events_v1','INSERT') THEN
 RAISE EXCEPTION 'ANA_BROWSER_OR_DIRECT_LEDGER_AUTHORITY_LEAK'; END IF;
 IF (SELECT count(*) FROM pg_policy WHERE polrelid='storage.objects'::regclass
 AND polname='professional_verification_reference_read' AND polcmd='r')<>1 THEN
 RAISE EXCEPTION 'KYC_POLICY_MISSING'; END IF;
END $test$;

-- A03 exact recorder contract: transport idempotency, server events and conflict detection.
SET LOCAL ROLE service_role;
DO $test$
DECLARE e jsonb; first_id uuid; second_id uuid;
BEGIN
 e:=jsonb_build_object('eventName','service.detail_viewed','eventSchemaVersion',1,
 'taxonomyVersion','ana-event-taxonomy-v1','actorClass','authenticated',
 'actorId','11111111-1111-4111-8111-111111111111','clientEventId',gen_random_uuid(),
 'semanticKey','synthetic-a03-server:'||gen_random_uuid()::text,
 'payloadHash',repeat('a',64),'sourceSurface','service_detail','dimensions','{}'::jsonb);
 first_id:=public.record_analytics_behavior_event_v1(e);
 second_id:=public.record_analytics_behavior_event_v1(e);
 IF first_id IS DISTINCT FROM second_id THEN RAISE EXCEPTION 'A03_SERVER_RETRY_DUPLICATED'; END IF;
 BEGIN
  PERFORM public.record_analytics_behavior_event_v1(e||jsonb_build_object('payloadHash',repeat('b',64)));
  RAISE EXCEPTION 'A03_HASH_CONFLICT_ACCEPTED';
 EXCEPTION WHEN unique_violation THEN
  IF SQLERRM<>'DOKE_ANALYTICS_IDEMPOTENCY_CONFLICT' THEN RAISE; END IF;
 END;
 -- A semantic duplicate with a different transport id must resolve to the original event.
 IF public.record_analytics_behavior_event_v1(e||jsonb_build_object('clientEventId',gen_random_uuid()))<>first_id
 THEN RAISE EXCEPTION 'A03_SEMANTIC_DUPLICATE'; END IF;
 e:=e||jsonb_build_object('analyticsSessionId',gen_random_uuid(),'clientEventId',gen_random_uuid(),
 'semanticKey','synthetic-a03-session:'||gen_random_uuid()::text);
 first_id:=public.record_analytics_behavior_event_v1(e);
 IF public.record_analytics_behavior_event_v1(e)<>first_id THEN RAISE EXCEPTION 'A03_SESSION_RETRY_DUPLICATED'; END IF;
 BEGIN
  PERFORM public.record_analytics_behavior_event_v1(e||'{"email":"synthetic@example.invalid"}'::jsonb);
  RAISE EXCEPTION 'A03_UNKNOWN_FIELD_ACCEPTED';
 EXCEPTION WHEN invalid_parameter_value THEN
  IF SQLERRM<>'DOKE_ANALYTICS_EVENT_UNKNOWN_FIELD' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.record_analytics_behavior_event_v1(e||'{"actorClass":"anon"}'::jsonb);
  RAISE EXCEPTION 'A03_ACTOR_SHAPE_ACCEPTED';
 EXCEPTION WHEN invalid_parameter_value THEN
  IF SQLERRM<>'DOKE_ANALYTICS_EVENT_ACTOR_INVALID' THEN RAISE; END IF;
 END;
 IF EXISTS(SELECT 1 FROM private.analytics_behavior_events_v1 WHERE id=first_id AND occurred_at<>received_at)
 THEN RAISE EXCEPTION 'A03_SERVER_TIME_DRIFT'; END IF;
END $test$;
RESET ROLE;

-- A05 SQL appends evidence even when fingerprints do not change; this is not JS metric NO_CHANGE.
INSERT INTO private.order_domain_events(id,event_key,order_id,sequence_no,event_type,next_status,actor_role,action,payload,created_at)
VALUES('a0500000-0000-4000-8000-000000000001','synthetic-a05-source',
'33333333-3333-4333-8333-333333333333',991,'order.requested','draft','client','synthetic',
'{"serviceId":"66666666-6666-4666-8666-666666666666","clientId":"11111111-1111-4111-8111-111111111111","professionalId":"22222222-2222-4222-8222-222222222222"}',
'2026-01-01T12:00:00Z');
INSERT INTO private.order_metric_events(order_event_id,event_key,order_id,service_id,client_id,professional_id,event_type,occurred_at,dimensions)
SELECT e.id,e.event_key,e.order_id,(e.payload->>'serviceId')::uuid,(e.payload->>'clientId')::uuid,
(e.payload->>'professionalId')::uuid,e.event_type,e.created_at,
jsonb_build_object('serviceCategory',o.service_snapshot->>'category','serviceCity',o.service_snapshot->>'city',
'serviceState',o.service_snapshot->>'state','serviceVersionId',o.service_version_id::text)
FROM private.order_domain_events e JOIN public.orders o ON o.id=e.order_id
WHERE e.id='a0500000-0000-4000-8000-000000000001';
SELECT set_config('kontrat.fixture.source_before',
(SELECT row_to_json(e)::text FROM private.order_domain_events e WHERE id='a0500000-0000-4000-8000-000000000001'),true);
SET LOCAL ROLE service_role;
DO $test$
DECLARE a jsonb; b jsonb;
BEGIN
 a:=public.run_analytics_order_reconciliation_v1('2026-01-01','2026-01-02');
 b:=public.run_analytics_order_reconciliation_v1('2026-01-01','2026-01-02');
 IF a->>'reconciliationState'<>'matched' OR a->>'comparisonFingerprint' IS DISTINCT FROM b->>'comparisonFingerprint'
 OR a->>'runId'=b->>'runId' THEN RAISE EXCEPTION 'A05_STABILITY_OR_APPEND_DRIFT'; END IF;
 BEGIN
  PERFORM public.run_analytics_order_reconciliation_v1('2026-01-02','2026-01-01');
  RAISE EXCEPTION 'A05_REVERSED_WINDOW_ACCEPTED';
 EXCEPTION WHEN invalid_parameter_value THEN
  IF SQLERRM<>'DOKE_ANALYTICS_RECONCILIATION_WINDOW_INVALID' THEN RAISE; END IF;
 END;
END $test$;
RESET ROLE;
UPDATE private.order_metric_events SET event_key='synthetic-a05-wrong-key',dimensions='{"serviceCategory":"wrong"}'
WHERE order_event_id='a0500000-0000-4000-8000-000000000001';
SET LOCAL ROLE service_role;
DO $test$ DECLARE r jsonb; BEGIN
 r:=public.run_analytics_order_reconciliation_v1('2026-01-01','2026-01-02');
 IF r->>'reconciliationState'<>'diverged' OR (r#>>'{divergenceCounts,eventKeyMismatch}')::int<>1
 OR (r#>>'{divergenceCounts,dimensionMismatch}')::int<>1 THEN RAISE EXCEPTION 'A05_HARDENING_NOT_EFFECTIVE'; END IF;
END $test$;
RESET ROLE;
DO $test$ BEGIN
 IF current_setting('kontrat.fixture.source_before') IS DISTINCT FROM
 (SELECT row_to_json(e)::text FROM private.order_domain_events e WHERE id='a0500000-0000-4000-8000-000000000001')
 THEN RAISE EXCEPTION 'A05_MUTATED_SOURCE_FACT'; END IF;
END $test$;

SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
SELECT set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $test$ BEGIN
 IF public.current_user_role()<>'client' OR public.is_active_admin_or_moderator() THEN
 RAISE EXCEPTION 'IDENTITY_SELF_READ_OR_ROLE_DRIFT'; END IF;
 BEGIN
  PERFORM public.record_analytics_behavior_event_v1('{}'::jsonb);
  RAISE EXCEPTION 'A03_AUTHENTICATED_RECORDER_ACCEPTED';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $test$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888881',true);
SELECT set_config('request.jwt.claims','{"sub":"88888888-8888-4888-8888-888888888881","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $test$ BEGIN
 IF public.current_user_role()<>'admin' OR NOT public.is_active_admin_or_moderator() THEN
 RAISE EXCEPTION 'KYC_ACTIVE_REVIEWER_IDENTITY_DRIFT'; END IF;
END $test$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888882',true);
SELECT set_config('request.jwt.claims','{"sub":"88888888-8888-4888-8888-888888888882","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $test$ BEGIN
 IF public.current_user_role()<>'guest' OR public.is_active_admin_or_moderator() THEN
 RAISE EXCEPTION 'KYC_SUSPENDED_REVIEWER_ACCEPTED'; END IF;
END $test$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
SELECT set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);

\if :legacy
 SET LOCAL ROLE authenticated;
 DO $test$ BEGIN
  IF NOT private.can_access_transaction_attachment('conversations/44444444-4444-4444-8444-444444444444/11111111-1111-4111-8111-111111111111/test.pdf')
  OR private.can_access_transaction_attachment('conversations/not-a-uuid/owner/test.pdf')
  OR private.can_access_transaction_attachment('conversations/44444444-4444-4444-8444-444444444444/test.pdf') THEN
  RAISE EXCEPTION 'LEGACY_HELPER_PARTICIPATION_OR_FOLDER_DEPTH_DRIFT'; END IF;
 END $test$;
 RESET ROLE;
 DO $test$ BEGIN
  IF to_regclass('private.transaction_attachment_lifecycle') IS NOT NULL
  OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.messages'::regclass AND NOT tgisinternal) THEN
  RAISE EXCEPTION 'LEGACY_PHASE_ALREADY_MIGRATED'; END IF;
 END $test$;
\else
 -- The API test provides a real uploaded/attached object. No fake Storage DML here.
 SELECT set_config('kontrat.fixture.attachment_id', :'attachment_id', true);
 SELECT set_config('kontrat.fixture.object_path', :'object_path', true);
 DO $test$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.messages'::regclass
   AND tgname='trg_messages_authenticated_update_authority' AND tgtype=19 AND tgenabled='O')
  OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.messages'::regclass
   AND tgname='messages_attachment_retention_after_removed' AND tgtype=17 AND tgenabled='O') THEN
  RAISE EXCEPTION 'BEFORE_AFTER_UPDATE_TRIGGER_DRIFT'; END IF;
  IF has_function_privilege('authenticated','private.transaction_attachment_from_path(text)','EXECUTE')
  OR has_function_privilege('anon','private.can_read_transaction_attachment(text,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'PRIVATE_HELPER_ACL_LEAK'; END IF;
 END $test$;
 SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
 SELECT set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
 SET LOCAL ROLE authenticated;
 UPDATE public.messages SET status='read' WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 DO $test$ BEGIN
  BEGIN
   UPDATE public.messages SET status='removed',body='' WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
   RAISE EXCEPTION 'RECIPIENT_REMOVAL_ACCEPTED';
  EXCEPTION WHEN insufficient_privilege THEN
   IF SQLERRM<>'DOKE_MESSAGE_STATE_TRANSITION_FORBIDDEN' THEN RAISE; END IF;
  END;
 END $test$;
 RESET ROLE;
 DO $test$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM private.transaction_attachment_lifecycle
   WHERE id=current_setting('kontrat.fixture.attachment_id')::uuid AND status='attached' AND retain_until IS NULL)
  THEN RAISE EXCEPTION 'READ_OR_REJECTED_UPDATE_ORPHANED_ATTACHMENT'; END IF;
 END $test$;
 SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
 SELECT set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
 SET LOCAL ROLE authenticated;
 UPDATE public.messages SET status='removed',body='' WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 RESET ROLE;
 DO $test$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM private.transaction_attachment_lifecycle
   WHERE id=current_setting('kontrat.fixture.attachment_id')::uuid AND status='orphaned'
   AND retain_until=now()+interval '30 days') THEN RAISE EXCEPTION 'ACCEPTED_REMOVAL_RETENTION_DRIFT'; END IF;
 END $test$;
 SELECT set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999999',true);
 SELECT set_config('request.jwt.claims','{"sub":"99999999-9999-4999-8999-999999999999","role":"authenticated"}',true);
 SET LOCAL ROLE authenticated;
 DO $test$ BEGIN
  IF private.can_read_transaction_attachment(current_setting('kontrat.fixture.object_path'),
   '11111111-1111-4111-8111-111111111111') THEN RAISE EXCEPTION 'SPOOFED_JWT_ACTOR_ACCEPTED'; END IF;
 END $test$;
 RESET ROLE;
\endif
ROLLBACK;
SELECT 'DEPENDENCY_CONTRACT_REGRESSIONS_PASS_LOCAL_ONLY';

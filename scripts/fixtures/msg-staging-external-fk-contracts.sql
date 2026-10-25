\set ON_ERROR_STOP on
-- Four FK behaviors copied from catalog metadata; external tables are ID-only synthetic stubs.
DO $checks$
DECLARE matched integer;
BEGIN
 SELECT count(*) INTO matched
 FROM pg_constraint con
 JOIN pg_class c ON c.oid=con.conrelid
 WHERE c.relnamespace='public'::regnamespace
 AND con.conname IN ('users_id_fkey','orders_service_id_fkey',
 'orders_service_version_id_fkey','orders_schedule_reservation_id_fkey');
 IF matched<>4 THEN RAISE EXCEPTION 'FOUR_EXTERNAL_FKS_NOT_APPLIED'; END IF;
END $checks$;
SELECT 'ALL_FOUR_STAGING_EXTERNAL_FKS_INSTALLED';

-- Reject unknown reference IDs (nonexistent services) even for synthetic server writes.
DO $checks$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  UPDATE public.orders SET service_id='ffffffff-ffff-4fff-8fff-ffffffffffff'
  WHERE id='33333333-3333-4333-8333-333333333333';
 EXCEPTION WHEN foreign_key_violation THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'UNKNOWN_SERVICE_FK_ACCEPTED'; END IF;
 denied:=false;
 BEGIN
  UPDATE public.orders SET service_version_id='ffffffff-ffff-4fff-8fff-ffffffffffff'
  WHERE id='33333333-3333-4333-8333-333333333333';
 EXCEPTION WHEN foreign_key_violation THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'UNKNOWN_VERSION_FK_ACCEPTED'; END IF;
 denied:=false;
 BEGIN
  UPDATE public.orders SET schedule_reservation_id='ffffffff-ffff-4fff-8fff-ffffffffffff'
  WHERE id='33333333-3333-4333-8333-333333333333';
 EXCEPTION WHEN foreign_key_violation THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'UNKNOWN_SCHEDULE_FK_ACCEPTED'; END IF;
END $checks$;
SELECT 'INVALID_SERVICE_VERSION_AND_SCHEDULE_FKS_DENIED';

-- ON DELETE RESTRICT and default NO ACTION must prevent deletion of used references.
DO $checks$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  DELETE FROM public.service_versions
  WHERE id='77777777-7777-4777-8777-777777777777';
 EXCEPTION WHEN foreign_key_violation THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'USED_SERVICE_VERSION_DELETION_ALLOWED'; END IF;
 denied:=false;
 BEGIN
  DELETE FROM public.services
  WHERE id='66666666-6666-4666-8666-666666666666';
 EXCEPTION WHEN foreign_key_violation THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'USED_SERVICE_DELETION_ALLOWED'; END IF;
END $checks$;
SELECT 'REFERENCED_SERVICE_AND_VERSION_DELETE_DENIED';

-- Prove schedule reservation ON DELETE SET NULL and auth user ON DELETE CASCADE;
-- both operate only on a transaction that is rolled back.
BEGIN;
DELETE FROM public.schedule_reservations
WHERE id='88888888-8888-4888-8888-888888888888';
DO $checks$ BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.orders WHERE id='33333333-3333-4333-8333-333333333333'
    AND schedule_reservation_id IS NULL
 ) THEN RAISE EXCEPTION 'SCHEDULE_FK_SET_NULL_FAILED'; END IF;
END $checks$;
INSERT INTO auth.users(id) VALUES('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
INSERT INTO public.users(id,role,status)
 VALUES('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','client','active');
DELETE FROM auth.users WHERE id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
DO $checks$ BEGIN
 IF EXISTS (SELECT 1 FROM public.users
   WHERE id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')
 THEN RAISE EXCEPTION 'AUTH_USER_CASCADE_MISSING'; END IF;
END $checks$;
ROLLBACK;
DO $checks$ BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.orders WHERE id='33333333-3333-4333-8333-333333333333'
  AND schedule_reservation_id='88888888-8888-4888-8888-888888888888'
 ) THEN RAISE EXCEPTION 'SYNTHETIC_REFERENCE_RESTORE_FAILED'; END IF;
END $checks$;
SELECT 'SCHEDULE_NULL_AND_AUTH_CASCADE_PASS_ROLLED_BACK';
SELECT 'STAGING_CATALOG_FOUR_EXTERNAL_FK_BEHAVIORS_PASS';

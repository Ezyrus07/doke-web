BEGIN READ ONLY;
DO $gate$
DECLARE t text;
BEGIN
 IF current_setting('p31.target_ref',true) IS DISTINCT FROM 'bqmmbopwfgwffkbtheab' THEN RAISE EXCEPTION 'E2E target consent missing'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated') AND (rolsuper OR rolbypassrls)) THEN RAISE EXCEPTION 'Client role authority drift'; END IF;
 IF current_user <> 'postgres' THEN RAISE EXCEPTION 'Expected owner executor postgres'; END IF;
 IF current_setting('server_version_num')::int < 170000 THEN RAISE EXCEPTION 'PostgreSQL 17+ required'; END IF;
 FOREACH t IN ARRAY ARRAY['users','user_profiles','client_profiles','audit_logs','notifications'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=t AND c.relkind='r' AND c.relrowsecurity AND c.relowner='postgres'::regrole) THEN RAISE EXCEPTION 'Table ownership/RLS drift: %',t; END IF;
  IF EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=format('public.%I',t)::regclass AND a.attacl IS NOT NULL) THEN RAISE EXCEPTION 'Column ACL requires separate review: %',t; END IF;
  IF EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE c.oid=format('public.%I',t)::regclass AND (a.grantor <> 'postgres'::regrole OR (a.grantee <> 0 AND a.grantee NOT IN ('postgres'::regrole,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)))) THEN RAISE EXCEPTION 'Grantor/grantee drift: %',t; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_roles client CROSS JOIN pg_roles inherited WHERE client.rolname IN ('anon','authenticated') AND client.oid <> inherited.oid AND (pg_has_role(client.oid,inherited.oid,'USAGE') OR pg_has_role(client.oid,inherited.oid,'SET'))) THEN RAISE EXCEPTION 'Role inheritance/SET path requires separate review'; END IF;
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename IN ('users','user_profiles','client_profiles','audit_logs','notifications')) <> 1 OR NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='users_self_read' AND cmd='SELECT' AND roles=ARRAY['authenticated']::name[] AND md5(qual)='15c587ac9e0e9db4618a46c0502f35aa') THEN RAISE EXCEPTION 'Policy contract drift'; END IF;
END $gate$;
DO $verify$
DECLARE t text; r text; priv text;
BEGIN
 FOREACH t IN ARRAY ARRAY['users','user_profiles','client_profiles','audit_logs','notifications'] LOOP
  IF EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE c.oid=format('public.%I',t)::regclass AND a.grantee IN (0,'anon'::regrole,'authenticated'::regrole) AND (a.is_grantable OR a.grantee=0)) THEN RAISE EXCEPTION 'Unexpected delegation/PUBLIC grant'; END IF;
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
   FOREACH priv IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
    IF has_table_privilege(r,format('public.%I',t),priv) IS DISTINCT FROM (r='authenticated' AND t='users' AND priv='SELECT') THEN RAISE EXCEPTION 'Unexpected effective privilege: % % %',r,t,priv; END IF;
   END LOOP;
   FOREACH priv IN ARRAY ARRAY['INSERT','UPDATE','REFERENCES'] LOOP
    IF has_any_column_privilege(r,format('public.%I',t),priv) THEN RAISE EXCEPTION 'Unexpected column privilege'; END IF;
   END LOOP;
  END LOOP;
 END LOOP;
END $verify$;
COMMIT;

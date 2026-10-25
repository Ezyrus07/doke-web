\set ON_ERROR_STOP on
-- Only synthetic data in isolated GitHub Actions PostgreSQL 17.
-- PostgREST connects as a restricted authenticator and switches to JWT role.
DO $roles$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='msg_http_authenticator') THEN
    RAISE EXCEPTION 'ISOLATED_HTTP_AUTHENTICATOR_ALREADY_EXISTS';
  END IF;
END $roles$;
CREATE ROLE msg_http_authenticator LOGIN NOINHERIT
  PASSWORD 'synthetic-only-postgrest-db-password';
GRANT anon, authenticated TO msg_http_authenticator;
GRANT CONNECT ON DATABASE msg_http_jwt_ci TO msg_http_authenticator;
GRANT USAGE ON SCHEMA public TO authenticated, anon;
-- In this synthetic fixture auth.uid reads the JSON claim GUC
-- created by current PostgREST JWT processing.
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid LANGUAGE sql STABLE
AS $auth$
SELECT NULLIF(
  NULLIF(current_setting('request.jwt.claims',true),'')::jsonb ->> 'sub',
  ''
)::uuid;
$auth$;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
SELECT 'RESTRICTED_JWT_AUTHENTICATOR_CREATED';

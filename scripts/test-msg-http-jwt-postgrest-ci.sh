#!/usr/bin/env bash
set -euo pipefail
# Real PostgREST HTTP with signed synthetic JWTs; disposable GitHub CI PostgreSQL only.
[[ "$PGHOST" == "127.0.0.1" && "$PGPORT" == "5432" &&
   "$PGUSER" == "kontrat_sandbox" && "$PGDATABASE" == "msg_http_jwt_ci" &&
   "$PGPASSWORD" == "synthetic-only-postgres-http-ci" ]] ||
  { echo REFUSE_UNEXPECTED_DATABASE; exit 2; }
[[ "$RUN_SYNTHETIC_HTTP_TEST" == "true" &&
   "$JWT_TEST_SECRET" == "synthetic-jwt-secret-msg-http-2026-please-never-reuse" ]] ||
  { echo REFUSE_UNEXPECTED_JWT_TEST_CONTEXT; exit 2; }
identity="$(psql -wAtX -v ON_ERROR_STOP=1 -c "select current_user||'|'||current_database()||'|'||current_setting('server_version_num');")"
[[ "$identity" =~ ^kontrat_sandbox\|msg_http_jwt_ci\|17[0-9]{4}$ ]] ||
  { echo REFUSE_NOT_SYNTHETIC_POSTGRES17; exit 2; }
count="$(psql -wAtX -v ON_ERROR_STOP=1 -c "select count(*) from information_schema.tables where table_schema='public' and table_name in ('users','orders','conversations','messages');")"
[[ "$count" == "0" ]] || { echo REFUSE_NONEMPTY_DATABASE; exit 2; }
if curl --silent --max-time 1 http://127.0.0.1:30571/ >/dev/null; then
  echo REFUSE_HTTP_PORT_IN_USE; exit 2
fi
for tool in docker psql node curl; do command -v "$tool" >/dev/null || { echo MISSING_TEST_TOOL; exit 2; }; done
node scripts/generate-msg-staging-catalog-fixture.js --check
psql -wX -v ON_ERROR_STOP=1 -f scripts/fixtures/msg-staging-catalog-derived-baseline.sql
psql -wX -v ON_ERROR_STOP=1 -f scripts/fixtures/msg-staging-catalog-pre-migration-assertions.sql
psql -wX -v ON_ERROR_STOP=1 -f supabase/migrations/20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql
psql -wX -v ON_ERROR_STOP=1 -f supabase/migrations/20261025022849_message_update_authority_guard.sql
psql -wX -v ON_ERROR_STOP=1 -f scripts/fixtures/msg-http-jwt-postgrest-setup.sql
container=kontrat-synthetic-postgrest-jwt-ci
cleanup() { docker rm --force "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
if docker inspect "$container" >/dev/null 2>&1; then echo REFUSE_EXISTING_HTTP_CONTAINER; exit 2; fi
docker pull postgrest/postgrest:v14.18 >/dev/null
export PGRST_DB_URI="postgres://msg_http_authenticator:synthetic-only-postgrest-db-password@127.0.0.1:5432/msg_http_jwt_ci"
export PGRST_JWT_SECRET="$JWT_TEST_SECRET"
docker run --rm -d --name "$container" --network host \
  -e PGRST_DB_URI -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon \
  -e PGRST_JWT_SECRET -e PGRST_SERVER_HOST=127.0.0.1 \
  -e PGRST_SERVER_PORT=30571 postgrest/postgrest:v14.18 >/dev/null
ready=false
for _ in $(seq 1 40); do
  status="$(curl --silent --max-time 1 --output /dev/null --write-out '%{http_code}' http://127.0.0.1:30571/ || true)"
  if [[ "$status" == "200" || "$status" == "401" || "$status" == "403" ]]; then ready=true; break; fi
  sleep 1
done
if [[ "$ready" != true ]]; then
  echo POSTGREST_HTTP_NOT_READY
  docker logs "$container" --tail 60
  exit 1
fi
echo POSTGREST_HTTP_GATEWAY_READY_SYNTHETIC
node scripts/test-msg-http-jwt-postgrest.mjs
echo MSG_HTTP_JWT_GATEWAY_CI_PASS_NO_STORAGE_CERTIFICATION

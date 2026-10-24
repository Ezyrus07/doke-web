#!/usr/bin/env bash
set -euo pipefail
# CI-only, synthetic PostgreSQL Docker service. Never connect to Supabase.
[[ "$PGHOST" == "127.0.0.1" && "$PGPORT" == "5432" && "$PGUSER" == "kontrat_sandbox" && "$PGDATABASE" == "kontrat_msg_a05_ci" && -n "$PGPASSWORD" ]] || { echo REFUSE_UNEXPECTED_PG_TARGET; exit 2; }
# GitHub Actions publishes the PostgreSQL service at 127.0.0.1, but inside Docker
# inet_server_addr() is its bridge address, not 127.0.0.1.
identity="$(psql -wAtX -v ON_ERROR_STOP=1 -c "select current_user||'|'||current_database()||'|'||current_setting('server_version_num');")"
[[ "$identity" =~ ^kontrat_sandbox\|kontrat_msg_a05_ci\|17[0-9]{4}$ ]] || { echo REFUSE_PG_IDENTITY; exit 2; }
existing="$(psql -wAtX -v ON_ERROR_STOP=1 -c "select count(*) from information_schema.tables where table_schema in ('auth','storage','private') or (table_schema='public' and table_name in ('users','orders','conversations','messages'));")"
[[ "$existing" == "0" ]] || { echo REFUSE_NONEMPTY_SYNTHETIC_DATABASE; exit 2; }
# Ubuntu 24.04 apt supplies pg_dump 16, which cannot dump the PostgreSQL 17 server.
# Run backup and restore with the same PostgreSQL 17 image as the isolated service.
docker image inspect postgres:17 >/dev/null || { echo MISSING_POSTGRES_17_CLIENT_IMAGE; exit 2; }
backup="$(mktemp)"
restored="kontrat_msg_a05_ci_restored"
cleanup() { dropdb --if-exists "$restored" >/dev/null 2>&1 || true; rm -f "$backup"; }
postgres17() {
  docker run --rm -i --network host \
    -e PGHOST -e PGPORT -e PGUSER -e PGDATABASE -e PGPASSWORD \
    postgres:17 "$@"
}

trap cleanup EXIT
psql -wX -v ON_ERROR_STOP=1 -f scripts/fixtures/msg-a05-postgres-isolated-baseline.sql
postgres17 pg_dump -w -Fc "$PGDATABASE" > "$backup"
psql -wX -v ON_ERROR_STOP=1 -f supabase/migrations/20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql
psql -wX -v ON_ERROR_STOP=1 -f scripts/fixtures/msg-a05-postgres-isolated-smoke.sql
psql -wX -v ON_ERROR_STOP=1 -f scripts/fixtures/msg-a05-postgres-isolated-negative.sql
createdb -T template0 "$restored"
postgres17 pg_restore --exit-on-error -w -d "$restored" < "$backup"
restore_status="$(psql -wAtX -v ON_ERROR_STOP=1 -d "$restored" -c "select (to_regclass('private.transaction_attachment_lifecycle') is null)::text||'|'||(select count(*) from pg_policies where schemaname='storage' and policyname like 'transaction_attachments%')::text||'|'||(select count(*) from pg_proc where pronamespace='public'::regnamespace and proname like '%transaction_attachment%_internal')::text;")"
[[ "$restore_status" == "true|4|0" ]] || { echo RESTORE_GATE_FAILED; exit 1; }
echo MSG_A05_PG17_SYNTHETIC_CI_PASS

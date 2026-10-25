#!/usr/bin/env bash
set -euo pipefail
[[ "$PGHOST" == "127.0.0.1" && "$PGPORT" == "5432" && "$PGUSER" == "kontrat_sandbox" && "$PGDATABASE" == "msg_catalog_ci" && -n "$PGPASSWORD" ]] || { echo REFUSE_NON_CI_TARGET; exit 2; }
identity="$(psql -wAtX -v ON_ERROR_STOP=1 -c "select current_user||'|'||current_database()||'|'||current_setting('server_version_num')")"
[[ "$identity" =~ ^kontrat_sandbox\|msg_catalog_ci\|17[0-9]{4}$ ]] || { echo REFUSE_DB_IDENTITY; exit 2; }
existing="$(psql -wAtX -v ON_ERROR_STOP=1 -c "select count(*) from information_schema.tables where table_schema='public' and table_name in ('users','orders','conversations','messages')")"
[[ "$existing" == 0 ]] || { echo REFUSE_NONEMPTY_DATABASE; exit 2; }
names="$(psql -wAtX -v ON_ERROR_STOP=1 -c "select count(*) from pg_database where datname in ('msg_catalog_a05_first_ci','msg_catalog_message_first_ci','msg_catalog_restored_ci')")"
[[ "$names" == 0 ]] || { echo REFUSE_EXISTING_DATABASE_NAMES; exit 2; }
docker image inspect postgres:17 >/dev/null 2>&1 || { echo MISSING_POSTGRES17_CLIENT_IMAGE; exit 2; }
node scripts/generate-msg-staging-catalog-fixture.js --check
first=msg_catalog_a05_first_ci
second=msg_catalog_message_first_ci
restored=msg_catalog_restored_ci
created=""
backup="$(mktemp)"
cleanup() {
 for name in "$restored" "$second" "$first"; do
  case " $created " in *" $name "*) dropdb -w --if-exists "$name" >/dev/null 2>&1 || true;; esac
 done
 rm -f "$backup"
}
trap cleanup EXIT
postgres17() {
  docker run --rm -i --network host -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD postgres:17 "$@"
}
run_sql() { psql -wX -v ON_ERROR_STOP=1 -d "$1" -f "$2"; }
for order in a05-first message-first; do
 if [[ "$order" == a05-first ]]; then db="$first"; else db="$second"; fi
 createdb -w -T template0 "$db"
 created="$created $db"
 run_sql "$db" scripts/fixtures/msg-staging-catalog-derived-baseline.sql
 run_sql "$db" scripts/fixtures/msg-staging-catalog-pre-migration-assertions.sql
 run_sql "$db" scripts/fixtures/msg-staging-external-fk-contracts.sql
 if [[ "$order" == a05-first ]]; then
  postgres17 pg_dump -w -d "$db" -Fc > "$backup"
  test -s "$backup"
  run_sql "$db" supabase/migrations/20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql
  run_sql "$db" supabase/migrations/20261025022849_message_update_authority_guard.sql
 else
  run_sql "$db" supabase/migrations/20261025022849_message_update_authority_guard.sql
  run_sql "$db" supabase/migrations/20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql
 fi
 run_sql "$db" scripts/fixtures/msg-update-a05-integration-regressions.sql
 run_sql "$db" scripts/fixtures/msg-staging-storage-policy-contracts.sql
 echo "STAGING_CATALOG_SYNTHETIC_ORDER_$order"_PASS
done
createdb -w -T template0 "$restored"
created="$created $restored"
postgres17 pg_restore --exit-on-error -w -d "$restored" < "$backup"
result="$(psql -wAtX -v ON_ERROR_STOP=1 -d "$restored" -c "SELECT (to_regclass('private.transaction_attachment_lifecycle') IS NULL)::text||'|'||(SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND policyname LIKE 'transaction_attachments%')::text||'|'||(SELECT count(*) FROM pg_policies WHERE (schemaname='public' AND tablename IN ('users','orders','conversations','messages')) OR (schemaname='storage' AND tablename='objects' AND policyname LIKE 'transaction_attachments%'))::text||'|'||(SELECT count(*) FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('users','orders','conversations','messages'))::text||'|'||(SELECT count(*) FROM pg_trigger WHERE tgrelid='public.messages'::regclass AND NOT tgisinternal)::text")"
[[ "$result" == "true|4|12|25|0" ]] || { echo RESTORE_GATE_FAILED; exit 1; }
echo STAGING_CATALOG_SYNTHETIC_CI_PASS_NOT_HOSTED_CERTIFICATION

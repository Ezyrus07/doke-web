#!/usr/bin/env bash
set -euo pipefail
# Disposable PostgreSQL CI service only: never use external credentials.
[[ "$PGHOST" == "127.0.0.1" && "$PGPORT" == "5432" &&
   "$PGUSER" == "kontrat_sandbox" && "$PGDATABASE" == "msg_composite_ci" &&
   -n "$PGPASSWORD" ]] || { echo REFUSE_UNEXPECTED_DB; exit 2; }
identity="$(psql -wAtX -v ON_ERROR_STOP=1 -c "select current_user||'|'||current_database()||'|'||current_setting('server_version_num');")"
[[ "$identity" =~ ^kontrat_sandbox\|msg_composite_ci\|17[0-9]{4}$ ]] || { echo REFUSE_DB_IDENTITY; exit 2; }
original="$(psql -wAtX -v ON_ERROR_STOP=1 -c "select count(*) from information_schema.tables where table_schema='public' and table_name in ('users','messages','conversations','orders');")"
[[ "$original" == "0" ]] || { echo REFUSE_NONEMPTY_TARGET; exit 2; }
first=msg_composite_a05_first_ci
second=msg_composite_message_first_ci
existing="$(psql -wAtX -v ON_ERROR_STOP=1 -c "select count(*) from pg_database where datname in ('$first','$second');")"
[[ "$existing" == "0" ]] || { echo REFUSE_EXISTING_SYNTHETIC_DB; exit 2; }
cleanup() {
  dropdb --if-exists "$first" >/dev/null 2>&1 || true
  dropdb --if-exists "$second" >/dev/null 2>&1 || true
}
trap cleanup EXIT
run_sql() { psql -wX -v ON_ERROR_STOP=1 -d "$1" -f "$2"; }
for order in a05-first message-first; do
  if [[ "$order" == a05-first ]]; then db="$first"; else db="$second"; fi
  createdb -T template0 "$db"
  run_sql "$db" scripts/fixtures/msg-update-authority-baseline.sql
  run_sql "$db" scripts/fixtures/msg-update-a05-integration-baseline.sql
  if [[ "$order" == a05-first ]]; then
    run_sql "$db" supabase/migrations/20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql
    run_sql "$db" supabase/migrations/20261025022849_message_update_authority_guard.sql
  else
    run_sql "$db" supabase/migrations/20261025022849_message_update_authority_guard.sql
    run_sql "$db" supabase/migrations/20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql
  fi
  run_sql "$db" scripts/fixtures/msg-update-a05-integration-regressions.sql
  echo "MSG_A05_COMPOSITE_SYNTHETIC_PASS_ORDER_$order"
done
echo MSG_A05_COMPOSITE_CI_PASS_WITH_EXPECTED_SECURITY_NO_GO

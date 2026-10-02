#!/usr/bin/env python3
"""Build the WAL-B03-A03 rollback-only staging canary from the exact A02 candidate."""
from __future__ import annotations
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CANDIDATE = ROOT / "supabase/migrations/20261002140758_wal_b03_bank_data_protection_candidate.sql"
EXPECTED_SHA256 = "d0420d791c4d7af76843137133c0e1df1e3c755eba9b2f3a73e0a4ed0811af5c"
WORKER_MD5 = "2a0dc4cae0f72b7ff704cfda5c9d1733"
SANDBOX_MD5 = "e33b4fa265e64408d1e9340636ccb5d5"

ASSERTIONS = r"""
-- WAL-B03-A03 rollback assertions. This canary must never commit.
do $a03_canary_assertions$
declare
  worker_oid oid := to_regprocedure('private.invoke_order_event_worker_if_needed()');
  sandbox_oid oid := to_regprocedure('private.assert_staging_finance_sandbox()');
  required_secret_count integer;
begin
  if current_user <> 'postgres' then
    raise exception using message = 'WAL_B03_A03_POSTGRES_REQUIRED';
  end if;

  if has_schema_privilege('service_role', 'vault', 'USAGE') or
     exists (
       select 1
       from pg_catalog.pg_class c
       join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'vault'
         and c.relkind in ('r', 'v', 'm', 'f', 'p')
         and (
           has_table_privilege('service_role', c.oid,
             'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or
           has_any_column_privilege('service_role', c.oid,
             'SELECT,INSERT,UPDATE,REFERENCES')
         )
     ) or
     exists (
       select 1
       from pg_catalog.pg_proc p
       join pg_catalog.pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'vault'
         and p.prokind in ('f', 'p')
         and has_function_privilege('service_role', p.oid, 'EXECUTE')
     ) then
    raise exception using message = 'WAL_B03_A03_SERVICE_ROLE_VAULT_DENIAL_FAILED';
  end if;

  if not has_schema_privilege('postgres', 'vault', 'USAGE') or
     not has_table_privilege('postgres', 'vault.secrets', 'SELECT') or
     not has_table_privilege('postgres', 'vault.decrypted_secrets', 'SELECT') or
     not has_function_privilege('postgres', 'vault.create_secret(text,text,text,uuid)', 'EXECUTE') then
    raise exception using message = 'WAL_B03_A03_POSTGRES_VAULT_AUTHORITY_FAILED';
  end if;

  if worker_oid is null or sandbox_oid is null or
     pg_get_userbyid((select proowner from pg_catalog.pg_proc where oid = worker_oid)) <> 'postgres' or
     pg_get_userbyid((select proowner from pg_catalog.pg_proc where oid = sandbox_oid)) <> 'postgres' or
     md5(pg_get_functiondef(worker_oid)) <> '2a0dc4cae0f72b7ff704cfda5c9d1733' or
     md5(pg_get_functiondef(sandbox_oid)) <> 'e33b4fa265e64408d1e9340636ccb5d5' or
     has_function_privilege('service_role', worker_oid, 'EXECUTE') or
     has_function_privilege('service_role', sandbox_oid, 'EXECUTE') then
    raise exception using message = 'WAL_B03_A03_INTERNAL_CONSUMER_DRIFT';
  end if;

  perform private.assert_staging_finance_sandbox();

  -- Never invoke the worker: it can mutate claims and issue pg_net requests.
  select count(*) into required_secret_count
  from vault.decrypted_secrets
  where name in ('doke_project_url', 'doke_order_event_worker_token')
    and decrypted_secret is not null;
  if required_secret_count <> 2 then
    raise exception using message = 'WAL_B03_A03_WORKER_VAULT_DEPENDENCY_FAILED';
  end if;

  if to_regclass('private.wallet_bank_data_keys_v1') is null or
     to_regclass('private.wallet_bank_account_secrets_v1') is null or
     not exists (select 1 from vault.secrets where name = 'wal-bank-data-key-v1') then
    raise exception using message = 'WAL_B03_A03_CANDIDATE_INSTALLATION_FAILED';
  end if;
end;
$a03_canary_assertions$;

rollback;

select jsonb_build_object(
  'candidate_sha256', 'd0420d791c4d7af76843137133c0e1df1e3c755eba9b2f3a73e0a4ed0811af5c',
  'rollback_only', true,
  'candidate_objects_removed',
    to_regclass('private.wallet_bank_data_keys_v1') is null and
    to_regclass('private.wallet_bank_account_secrets_v1') is null,
  'candidate_key_removed',
    not exists (select 1 from vault.secrets where name = 'wal-bank-data-key-v1'),
  'service_role_vault_usage_restored',
    has_schema_privilege('service_role', 'vault', 'USAGE'),
  'service_role_decrypted_select_restored',
    has_table_privilege('service_role', 'vault.decrypted_secrets', 'SELECT'),
  'service_role_create_secret_restored',
    has_function_privilege('service_role', 'vault.create_secret(text,text,text,uuid)', 'EXECUTE'),
  'worker_preserved',
    to_regprocedure('private.invoke_order_event_worker_if_needed()') is not null and
    md5(pg_get_functiondef(to_regprocedure('private.invoke_order_event_worker_if_needed()'))) =
      '2a0dc4cae0f72b7ff704cfda5c9d1733',
  'sandbox_preserved',
    to_regprocedure('private.assert_staging_finance_sandbox()') is not null and
    md5(pg_get_functiondef(to_regprocedure('private.assert_staging_finance_sandbox()'))) =
      'e33b4fa265e64408d1e9340636ccb5d5',
  'bank_account_row_count_unchanged',
    (select count(*) from public.wallet_bank_accounts) = 1
) as wal_b03_a03_rollback_canary_evidence;
"""

def build() -> str:
    source = CANDIDATE.read_text()
    digest = hashlib.sha256(source.encode()).hexdigest()
    if digest != EXPECTED_SHA256:
        raise SystemExit(f"candidate digest drift: {digest}")
    if not source.rstrip().endswith("commit;"):
        raise SystemExit("candidate terminal COMMIT drift")
    source = source.replace(
        "set local statement_timeout = '30s';",
        "set local statement_timeout = '30s';\n"
        "set local doke.wal_b03_a03_execution = 'explicitly_authorized';",
        1,
    )
    source = source.rstrip()[:-len("commit;")]
    generated = source + ASSERTIONS
    if "\ncommit;\n" in generated.lower() or generated.lower().rstrip().endswith("commit;"):
        raise SystemExit("rollback canary contains COMMIT")
    if generated.lower().count("\nrollback;") != 1:
        raise SystemExit("rollback canary must contain exactly one ROLLBACK")
    if "private.invoke_order_event_worker_if_needed();" in generated.lower():
        raise SystemExit("worker invocation is forbidden")
    return generated

if __name__ == "__main__":
    print(build(), end="")

-- WAL-B03-A02: repository-only candidate. NOT APPLIED / NOT STAGING-READY.
-- A03 requires separate authorization plus fresh runtime Data API boundary evidence.
-- The session marker below is an accidental-execution tripwire, not authorization.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $preflight$
declare
  api_role text;
begin
  if current_user <> 'postgres' or
     current_setting('doke.wal_b03_a03_execution', true) is distinct from 'explicitly_authorized' then
    raise exception using message = 'WAL_B03_SEPARATE_A03_AUTHORIZATION_REQUIRED';
  end if;
  if to_regnamespace('private') is null or
     to_regclass('public.wallet_bank_accounts') is null or
     to_regclass('vault.secrets') is null or
     to_regclass('vault.decrypted_secrets') is null or
     to_regprocedure('vault.create_secret(text,text,text,uuid)') is null or
     to_regprocedure('vault.update_secret(uuid,text,text,text,uuid)') is null or
     to_regprocedure('vault._crypto_aead_det_decrypt(bytea,bytea,bigint,bytea,bytea)') is null or
     to_regprocedure('extensions.pgp_sym_encrypt(text,text,text)') is null or
     to_regprocedure('extensions.pgp_sym_decrypt(bytea,text)') is null or
     to_regprocedure('private.invoke_order_event_worker_if_needed()') is null or
     to_regprocedure('private.assert_staging_finance_sandbox()') is null then
    raise exception using message = 'WAL_B03_CAPABILITY_DRIFT';
  end if;
  -- Platform-compatible Data API boundary. Supabase-managed Vault grants are not application-owned.
  foreach api_role in array array['anon', 'authenticated'] loop
    if has_schema_privilege(api_role, 'vault', 'USAGE') or
       has_table_privilege(api_role, 'vault.decrypted_secrets', 'SELECT') or
       has_any_column_privilege(api_role, 'vault.decrypted_secrets', 'SELECT') or
       has_table_privilege(api_role, 'vault.secrets', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or
       has_any_column_privilege(api_role, 'vault.secrets', 'SELECT,INSERT,UPDATE,REFERENCES') then
      raise exception using message = 'WAL_B03_VAULT_DATA_API_AUTHORITY_DRIFT';
    end if;
  end loop;
  if has_schema_privilege('authenticator', 'vault', 'USAGE') or
     has_table_privilege('authenticator', 'vault.secrets', 'SELECT') or
     has_table_privilege('authenticator', 'vault.decrypted_secrets', 'SELECT') then
    raise exception using message = 'WAL_B03_VAULT_DATA_API_AUTHORITY_DRIFT';
  end if;
  if coalesce((select r.rolcanlogin from pg_catalog.pg_roles r
      where r.rolname = 'service_role'), true) then
    raise exception using message = 'WAL_B03_SERVICE_ROLE_LOGIN_DRIFT';
  end if;
  if not has_schema_privilege('postgres', 'vault', 'USAGE') or
     not has_table_privilege('postgres', 'vault.secrets', 'SELECT') or
     not has_table_privilege('postgres', 'vault.decrypted_secrets', 'SELECT') or
     not has_function_privilege('postgres', 'vault.create_secret(text,text,text,uuid)', 'EXECUTE') then
    raise exception using message = 'WAL_B03_POSTGRES_VAULT_AUTHORITY_DRIFT';
  end if;
  if exists (
      select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prokind in ('f', 'p')
        and pg_get_functiondef(p.oid) ilike '%vault.%'
    ) or exists (
      select 1 from pg_catalog.pg_views v
      where v.schemaname = 'public' and v.definition ilike '%vault.%'
    ) or exists (
      select 1 from pg_catalog.pg_matviews v
      where v.schemaname = 'public' and v.definition ilike '%vault.%'
    ) then
    raise exception using message = 'WAL_B03_PUBLIC_VAULT_WRAPPER_DRIFT';
  end if;
  if exists (
      select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname <> 'vault'
        and p.prokind in ('f', 'p')
        and pg_get_functiondef(p.oid) ilike '%vault.%'
        and not (
          n.nspname = 'private' and
          p.proname in ('invoke_order_event_worker_if_needed', 'assert_staging_finance_sandbox')
        )
    ) then
    raise exception using message = 'WAL_B03_PRIVATE_VAULT_CONSUMER_DRIFT';
  end if;
  if (
      select count(*)
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'private'
        and p.proname in ('invoke_order_event_worker_if_needed', 'assert_staging_finance_sandbox')
        and pg_get_userbyid(p.proowner) = 'postgres'
        and p.prosecdef
        and not has_function_privilege('service_role', p.oid, 'EXECUTE')
        and not has_function_privilege('anon', p.oid, 'EXECUTE')
        and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
    ) <> 2 then
    raise exception using message = 'WAL_B03_INTERNAL_CONSUMER_BOUNDARY_DRIFT';
  end if;
  if exists (select 1 from vault.secrets where name = 'wal-bank-data-key-v1') then
    raise exception using message = 'WAL_B03_KEY_ALIAS_COLLISION';
  end if;
end;
$preflight$;

-- Supabase-managed Vault ACLs are intentionally not mutated by application migrations.
-- A03 must supply fresh runtime evidence that the vault schema is absent from the
-- PostgREST/Data API schema cache before this candidate may execute.
-- Deliberately no IF NOT EXISTS: unexpected existing objects require reconciliation.
create table private.wallet_bank_data_keys_v1 (
  key_version integer primary key check (key_version > 0),
  vault_secret_id uuid not null unique references vault.secrets(id) on delete restrict,
  key_alias text not null unique,
  state text not null check (state in ('active', 'retired')),
  created_at timestamptz not null default transaction_timestamp(),
  retired_at timestamptz,
  constraint wallet_bank_key_alias check (key_alias = 'wal-bank-data-key-v' || key_version::text),
  constraint wallet_bank_key_lifecycle check ((state = 'active' and retired_at is null) or
    (state = 'retired' and retired_at is not null and retired_at >= created_at))
);
create unique index wallet_bank_one_active_key_v1
  on private.wallet_bank_data_keys_v1 (state) where state = 'active';
alter table private.wallet_bank_data_keys_v1 owner to postgres;
alter table private.wallet_bank_data_keys_v1 enable row level security;
revoke all on table private.wallet_bank_data_keys_v1 from public, anon, authenticated, service_role;

create table private.wallet_bank_account_secrets_v1 (
  secret_reference_id uuid primary key,
  user_id uuid not null,
  secret_version integer not null default 1 check (secret_version > 0),
  key_version integer not null references private.wallet_bank_data_keys_v1(key_version) on delete restrict,
  ciphertext bytea not null check (octet_length(ciphertext) > 40),
  created_at timestamptz not null default transaction_timestamp(),
  rotated_at timestamptz,
  retired_at timestamptz,
  purge_after timestamptz,
  destroyed_at timestamptz,
  constraint wallet_bank_secret_lifecycle check (
    (rotated_at is null or rotated_at >= created_at) and
    (retired_at is null or retired_at >= created_at)),
  -- No legal duration/purge authority exists. A future approved policy must unlock this.
  constraint wallet_bank_retention_not_activated check (purge_after is null and destroyed_at is null)
);
-- No cascade from public tables: erasure/retention must not follow an unrelated delete.
create unique index wallet_bank_one_active_secret_v1
  on private.wallet_bank_account_secrets_v1 (user_id) where retired_at is null;
alter table private.wallet_bank_account_secrets_v1 owner to postgres;
alter table private.wallet_bank_account_secrets_v1 enable row level security;
revoke all on table private.wallet_bank_account_secrets_v1 from public, anon, authenticated, service_role;

-- Material is generated only during a separately authorized future A03 execution.
-- No fixed key, KYC key reuse, plaintext key table, or secret returned to the caller.
do $key_bootstrap$
begin
  insert into private.wallet_bank_data_keys_v1 (key_version, vault_secret_id, key_alias, state)
  values (1, vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'),
    'wal-bank-data-key-v1', 'WAL-001 bank data encryption key version 1'),
    'wal-bank-data-key-v1', 'active');
exception when others then
  raise exception using message = 'WAL_B03_KEY_BOOTSTRAP_FAILED';
end;
$key_bootstrap$;

-- Only postgres may run this bounded maintenance operation. It is NOT a browser RPC.
-- Encryption/decryption remains local to this backfill; no reusable raw-data getter exists.
-- The operation never changes legacy bank accounts, metadata, snapshots or API responses.
create function private.backfill_wallet_bank_account_secrets_v1(p_expected_rows integer)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
set lock_timeout = '5s'
set statement_timeout = '30s'
as $backfill$
declare
  source_row record;
  secret_row record;
  wal_key text;
  wal_key_version integer;
  reference_id uuid;
  envelope jsonb;
  recovered jsonb;
  encrypted bytea;
  encrypted_again bytea;
  source_count bigint;
  inserted_count integer := 0;
  verified_count integer := 0;
  wrong_key_rejected boolean;
  api_role text;
begin
  if current_user <> 'postgres' or
     current_setting('doke.wal_b03_a03_execution', true) is distinct from 'explicitly_authorized' then
    raise exception using message = 'WAL_B03_BACKFILL_NOT_AUTHORIZED';
  end if;
  if p_expected_rows is distinct from 1 then
    raise exception using message = 'WAL_B03_RECONCILE_EXPECTED_COUNT';
  end if;
  -- Recheck the platform-compatible boundary at invocation.
  foreach api_role in array array['anon', 'authenticated'] loop
    if has_schema_privilege(api_role, 'vault', 'USAGE') or
       has_table_privilege(api_role, 'vault.decrypted_secrets', 'SELECT') or
       has_any_column_privilege(api_role, 'vault.decrypted_secrets', 'SELECT') or
       has_table_privilege(api_role, 'vault.secrets', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or
       has_any_column_privilege(api_role, 'vault.secrets', 'SELECT,INSERT,UPDATE,REFERENCES') then
      raise exception using message = 'WAL_B03_VAULT_DATA_API_AUTHORITY_DRIFT';
    end if;
  end loop;
  if has_schema_privilege('authenticator', 'vault', 'USAGE') or
     coalesce((select r.rolcanlogin from pg_catalog.pg_roles r
       where r.rolname = 'service_role'), true) then
    raise exception using message = 'WAL_B03_VAULT_DATA_API_AUTHORITY_DRIFT';
  end if;
  if exists (
      select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prokind in ('f', 'p')
        and pg_get_functiondef(p.oid) ilike '%vault.%'
    ) or exists (
      select 1 from pg_catalog.pg_views v
      where v.schemaname = 'public' and v.definition ilike '%vault.%'
    ) or exists (
      select 1 from pg_catalog.pg_matviews v
      where v.schemaname = 'public' and v.definition ilike '%vault.%'
    ) then
    raise exception using message = 'WAL_B03_PUBLIC_VAULT_WRAPPER_DRIFT';
  end if;
  if exists (
      select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname <> 'vault'
        and p.prokind in ('f', 'p')
        and pg_get_functiondef(p.oid) ilike '%vault.%'
        and not (
          n.nspname = 'private' and
          p.proname in (
            'invoke_order_event_worker_if_needed',
            'assert_staging_finance_sandbox',
            'backfill_wallet_bank_account_secrets_v1'
          )
        )
    ) then
    raise exception using message = 'WAL_B03_PRIVATE_VAULT_CONSUMER_DRIFT';
  end if;
  if has_function_privilege('service_role',
       'private.invoke_order_event_worker_if_needed()', 'EXECUTE') or
     has_function_privilege('service_role',
       'private.assert_staging_finance_sandbox()', 'EXECUTE') or
     has_function_privilege('service_role',
       'private.backfill_wallet_bank_account_secrets_v1(integer)', 'EXECUTE') then
    raise exception using message = 'WAL_B03_INTERNAL_CONSUMER_BOUNDARY_DRIFT';
  end if;
  if not has_schema_privilege('postgres', 'vault', 'USAGE') or
     not has_table_privilege('postgres', 'vault.decrypted_secrets', 'SELECT') then
    raise exception using message = 'WAL_B03_POSTGRES_VAULT_AUTHORITY_LOST';
  end if;
  lock table public.wallet_bank_accounts in share row exclusive mode;
  lock table private.wallet_bank_account_secrets_v1 in exclusive mode;
  lock table private.wallet_bank_data_keys_v1 in share mode;
  select count(*) into source_count from public.wallet_bank_accounts;
  if source_count <> p_expected_rows then
    raise exception using message = 'WAL_B03_SOURCE_COUNT_DRIFT';
  end if;
  if exists (select 1 from private.wallet_bank_account_secrets_v1 s
    where s.retired_at is not null or not exists (
      select 1 from public.wallet_bank_accounts b where b.user_id = s.user_id)) then
    raise exception using message = 'WAL_B03_SECRET_STORE_DRIFT';
  end if;
  select k.key_version, v.decrypted_secret into strict wal_key_version, wal_key
    from private.wallet_bank_data_keys_v1 k
    join vault.decrypted_secrets v on v.id = k.vault_secret_id
    where k.state = 'active' and k.key_version = 1 and v.name = k.key_alias;
  if wal_key is null or wal_key !~ '^[0-9a-f]{64}$' then
    raise exception using message = 'WAL_B03_INVALID_KEY_MATERIAL';
  end if;

  for source_row in select user_id, account_holder, document, branch, account_number, pix_key
    from public.wallet_bank_accounts order by user_id
  loop
    select secret_reference_id, secret_version, key_version, ciphertext
      into secret_row from private.wallet_bank_account_secrets_v1
      where user_id = source_row.user_id and retired_at is null;
    if found then
      reference_id := secret_row.secret_reference_id;
      if secret_row.key_version <> wal_key_version or secret_row.secret_version <> 1 then
        raise exception using message = 'WAL_B03_EXISTING_VERSION_DRIFT';
      end if;
    else
      reference_id := gen_random_uuid();
    end if;
    envelope := jsonb_build_object(
      'payload_version', 1, 'user_id', source_row.user_id,
      'secret_reference_id', reference_id, 'key_version', wal_key_version, 'secret_version', 1,
      'bank_data', jsonb_build_object('account_holder', source_row.account_holder,
        'document', source_row.document, 'branch', source_row.branch,
        'account_number', source_row.account_number, 'pix_key', source_row.pix_key));

    if secret_row.secret_reference_id is not null then
      encrypted := secret_row.ciphertext;
    else
      encrypted := extensions.pgp_sym_encrypt(envelope::text, wal_key,
        'cipher-algo=aes256,compress-algo=0,s2k-mode=3');
      encrypted_again := extensions.pgp_sym_encrypt(envelope::text, wal_key,
        'cipher-algo=aes256,compress-algo=0,s2k-mode=3');
      if encrypted = encrypted_again then
        raise exception using message = 'WAL_B03_NONDETERMINISM_FAILED';
      end if;
      insert into private.wallet_bank_account_secrets_v1
        (secret_reference_id, user_id, secret_version, key_version, ciphertext)
      values (reference_id, source_row.user_id, 1, wal_key_version, encrypted);
      inserted_count := inserted_count + 1;
    end if;
    recovered := extensions.pgp_sym_decrypt(encrypted, wal_key)::jsonb;
    -- Full equality verifies binding AND all five sensitive fields without returning either.
    if recovered is distinct from envelope then
      raise exception using message = 'WAL_B03_BINDING_OR_PAYLOAD_MISMATCH';
    end if;
    wrong_key_rejected := false;
    begin
      perform extensions.pgp_sym_decrypt(encrypted, encode(extensions.gen_random_bytes(32), 'hex'));
    exception when external_routine_invocation_exception then
      wrong_key_rejected := true;
    end;
    if not wrong_key_rejected then
      raise exception using message = 'WAL_B03_WRONG_KEY_ACCEPTED';
    end if;
    verified_count := verified_count + 1;
    envelope := null;
    recovered := null;
    encrypted := null;
    encrypted_again := null;
  end loop;
  wal_key := null;
  if verified_count <> source_count or
     (select count(*) from private.wallet_bank_account_secrets_v1) <> source_count then
    raise exception using message = 'WAL_B03_BACKFILL_COUNT_MISMATCH';
  end if;
  return jsonb_build_object('source_count', source_count, 'inserted_count', inserted_count,
    'verified_count', verified_count, 'legacy_plaintext_preserved', true,
    'runtime_cutover', false);
exception when others then
  -- Never forward SQLERRM, row values, key material or decryption diagnostics.
  raise exception using message = 'WAL_B03_BACKFILL_FAILED';
end;
$backfill$;
alter function private.backfill_wallet_bank_account_secrets_v1(integer) owner to postgres;
revoke all on function private.backfill_wallet_bank_account_secrets_v1(integer)
  from public, anon, authenticated, service_role;

-- Detect effective inherited privileges as well as direct grants before commit.
do $acl_assertion$
declare
  api_role text;
  protected_table text;
begin
  if coalesce((select r.rolcanlogin from pg_catalog.pg_roles r
      where r.rolname = 'service_role'), true) or
     has_schema_privilege('authenticator', 'vault', 'USAGE') then
    raise exception using message = 'WAL_B03_VAULT_DATA_API_AUTHORITY_DRIFT';
  end if;
  if exists (
      select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prokind in ('f', 'p')
        and pg_get_functiondef(p.oid) ilike '%vault.%'
    ) or exists (
      select 1 from pg_catalog.pg_views v
      where v.schemaname = 'public' and v.definition ilike '%vault.%'
    ) or exists (
      select 1 from pg_catalog.pg_matviews v
      where v.schemaname = 'public' and v.definition ilike '%vault.%'
    ) then
    raise exception using message = 'WAL_B03_PUBLIC_VAULT_WRAPPER_DRIFT';
  end if;
  if exists (
      select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname <> 'vault'
        and p.prokind in ('f', 'p')
        and pg_get_functiondef(p.oid) ilike '%vault.%'
        and not (
          n.nspname = 'private' and
          p.proname in (
            'invoke_order_event_worker_if_needed',
            'assert_staging_finance_sandbox',
            'backfill_wallet_bank_account_secrets_v1'
          )
        )
    ) then
    raise exception using message = 'WAL_B03_PRIVATE_VAULT_CONSUMER_DRIFT';
  end if;
  if has_function_privilege('service_role',
       'private.invoke_order_event_worker_if_needed()', 'EXECUTE') or
     has_function_privilege('service_role',
       'private.assert_staging_finance_sandbox()', 'EXECUTE') or
     has_function_privilege('service_role',
       'private.backfill_wallet_bank_account_secrets_v1(integer)', 'EXECUTE') then
    raise exception using message = 'WAL_B03_INTERNAL_CONSUMER_BOUNDARY_DRIFT';
  end if;
  if not has_schema_privilege('postgres', 'vault', 'USAGE') or
     not has_table_privilege('postgres', 'vault.decrypted_secrets', 'SELECT') then
    raise exception using message = 'WAL_B03_POSTGRES_VAULT_AUTHORITY_LOST';
  end if;
  foreach api_role in array array['anon', 'authenticated', 'service_role'] loop
    foreach protected_table in array array['private.wallet_bank_data_keys_v1',
      'private.wallet_bank_account_secrets_v1'] loop
      if has_table_privilege(api_role, protected_table, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or
         has_any_column_privilege(api_role, protected_table, 'SELECT,INSERT,UPDATE,REFERENCES') then
        raise exception using message = 'WAL_B03_EFFECTIVE_TABLE_PRIVILEGE_DRIFT';
      end if;
    end loop;
    if has_function_privilege(api_role, 'private.backfill_wallet_bank_account_secrets_v1(integer)', 'EXECUTE') then
      raise exception using message = 'WAL_B03_EFFECTIVE_FUNCTION_PRIVILEGE_DRIFT';
    end if;
  end loop;
end;
$acl_assertion$;
-- No backfill invocation here; A03 must authorize the bounded operation separately.
commit;

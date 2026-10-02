"""Offline source checks. No database execution or runtime certification."""
import copy
import hashlib
import json
import re
import unittest
from pathlib import Path

from pglast import parser

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / 'config/wal-b03-a02-bank-data-protection-migration-candidate.json'
CONTRACT = json.loads(CONFIG.read_text())
SOURCE = (ROOT / CONTRACT['migrationSource']).read_text()
TABLES = {'wallet_bank_data_keys_v1', 'wallet_bank_account_secrets_v1'}
SENSITIVE = {'account_holder', 'document', 'branch', 'account_number', 'pix_key'}


def require(condition, label):
    if not condition:
        raise ValueError(label)


def validate_contract(contract):
    require(contract['sourceHead'] == 'b0d18389fc5748f6b143f00f30104c3b487c96d4', 'source authority')
    require(contract['matrixVersion'] == '1.3.132', 'matrix authority')
    require(contract['scope'] == 'repository_only', 'scope')
    require(contract['authorization'] == {
        'repositoryWrite': True, 'createRepositoryMigrationSource': True,
        'migrationApply': False, 'stagingWrite': False, 'deploy': False,
        'production': False, 'merge': False, 'readyForReview': False,
        'historyRewrite': False}, 'authorization boundary')
    require(contract['effects'] == {
        'migrationPrepared': True, 'migrationApplied': False,
        'stagingMutationPerformed': False, 'runtimeIntegrated': False,
        'keyProvisioned': False, 'backfillExecuted': False,
        'plaintextRetired': False, 'productionChanged': False}, 'effect boundary')
    require(contract['stagingReadiness'] == 'blocked_candidate_not_applied_and_runtime_validation', 'Vault blocker')
    require(contract['vaultAclHardeningCandidate'] == {
        'serviceRoleSchemaUsage': 'revoke',
        'serviceRoleVaultRelations': 'revoke_all',
        'serviceRoleVaultFunctions': 'revoke_execute_all',
        'preservePostgresVaultAuthority': True,
        'preserveOrderEventWorker': True,
        'preserveStagingFinanceSandbox': True,
        'applied': False}, 'Vault ACL hardening candidate')
    require(contract['blockerStatus'] == 'WAL-B03_OPEN', 'blocker closure')
    require(contract['candidate']['retentionDurationDays'] is None, 'retention policy')


def validate_sql(source):
    # PostgreSQL parses the top-level AST and procedural bodies without connecting.
    statements = json.loads(parser.parse_sql_json(source))['stmts']
    plpgsql = json.loads(parser.parse_plpgsql_json(source))
    require(len(plpgsql) == 5, 'all five procedural bodies parsed')
    code = re.sub(r'--[^\n]*', '', source).lower()
    allowed = {'TransactionStmt', 'VariableSetStmt', 'DoStmt', 'CreateStmt',
               'IndexStmt', 'AlterTableStmt', 'GrantStmt', 'CreateFunctionStmt', 'AlterOwnerStmt'}
    require(all(next(iter(s['stmt'])) in allowed for s in statements), 'unexpected top-level effect')
    require(statements[0]['stmt']['TransactionStmt']['kind'] == 'TRANS_STMT_BEGIN', 'transaction begin')
    require(statements[-1]['stmt']['TransactionStmt']['kind'] == 'TRANS_STMT_COMMIT', 'transaction commit')
    tables = [s['stmt']['CreateStmt'] for s in statements if 'CreateStmt' in s['stmt']]
    require(len(tables) == 2, 'two private tables only')
    require({t['relation']['relname'] for t in tables} == TABLES, 'table identity')
    for table in tables:
        require(table['relation']['schemaname'] == 'private', 'private storage')
        columns = {c['ColumnDef']['colname'] for c in table['tableElts'] if 'ColumnDef' in c}
        require(not columns & SENSITIVE, 'plaintext storage column')
    for statement in statements:
        if 'GrantStmt' in statement['stmt']:
            require(not statement['stmt']['GrantStmt'].get('is_grant', False), 'no grants')
        if 'AlterTableStmt' in statement['stmt']:
            require(statement['stmt']['AlterTableStmt']['relation']['schemaname'] == 'private', 'no public alterations')
    functions = [s['stmt']['CreateFunctionStmt'] for s in statements if 'CreateFunctionStmt' in s['stmt']]
    require(len(functions) == 1, 'one purpose-bound function')
    function = functions[0]
    require([x['String']['sval'] for x in function['funcname']] ==
            ['private', 'backfill_wallet_bank_account_secrets_v1'], 'private backfill only')
    require(function['returnType']['names'] == [{'String': {'sval': 'jsonb'}}], 'no raw row return type')
    options = [o['DefElem'] for o in function['options']]
    require(any(o['defname'] == 'security' and o['arg'] == {'Boolean': {'boolval': False}} for o in options), 'invoker security')
    require('set search_path = pg_catalog' in code, 'fixed search path')
    require('security definer' not in code and not re.search(r'\bexecute\s+(?!on\b)', code), 'no definer or dynamic SQL')
    require('kyc_crypto_secrets' not in code, 'domain-separated keys')
    require(not re.search(r'\b(update|delete\s+from|insert\s+into|alter\s+table|truncate)\s+public\.', code), 'legacy write')
    require(not re.search(r'\b(drop|grant|create\s+policy|raise\s+(notice|warning|info|log|debug))\b', code), 'no expanded effects or sensitive logging')
    require('sqlerrm' not in code and 'raise exception using message = ' in code, 'sanitized errors')
    require("current_user <> 'postgres'" in code, 'executor check')
    require(code.count("current_setting('doke.wal_b03_a03_execution', true) is distinct from 'explicitly_authorized'") == 2, 'execution tripwire')
    require(code.index('$preflight$') < code.index('create table'), 'preflight before DDL')
    require(code.count("has_any_column_privilege(api_role, 'vault.decrypted_secrets', 'select')") == 2, 'column ACL checks')
    require('revoke all privileges on all tables in schema vault from service_role;' in code, 'service_role Vault relation hardening')
    require('revoke execute on all functions in schema vault from service_role;' in code, 'service_role Vault function hardening')
    require('revoke usage on schema vault from service_role;' in code, 'service_role Vault schema hardening')
    require("has_schema_privilege('service_role', 'vault', 'usage')" in code, 'effective Vault schema assertion')
    require("has_function_privilege('service_role', p.oid, 'execute')" in code, 'effective Vault function assertion')
    require("has_function_privilege('postgres', 'vault.create_secret(text,text,text,uuid)', 'execute')" in code, 'postgres Vault authority preserved')
    require("has_function_privilege('service_role', 'private.invoke_order_event_worker_if_needed()', 'execute')" in code, 'worker boundary preserved')
    require("has_function_privilege('service_role', 'private.assert_staging_finance_sandbox()', 'execute')" in code, 'sandbox boundary preserved')
    require(code.count("has_table_privilege(api_role, 'vault.decrypted_secrets', 'select')") == 2, 'table ACL checks')
    require(code.count("'wal_b03_vault_acl_review_required'") == 2, 'installation and invocation Vault guard')
    for table in TABLES:
        require(f'alter table private.{table} enable row level security;' in code, 'RLS')
        require(f'revoke all on table private.{table} from public, anon, authenticated, service_role;' in code, 'table revocation')
    require(re.search(r'revoke all on function private.backfill_wallet_bank_account_secrets_v1\(integer\)\s+from public, anon, authenticated, service_role;', code), 'function revocation')
    require('has_function_privilege' in code and 'has_any_column_privilege(api_role, protected_table' in code, 'effective ACL assertion')
    require('extensions.gen_random_bytes(32)' in code and 'vault.create_secret(encode(' in code, 'runtime key entropy')
    require('cipher-algo=aes256,compress-algo=0,s2k-mode=3' in code, 'AES option')
    require(not re.search(r'cipher-algo=(?!aes256)[a-z0-9]+', code), 'no weak ciphers')
    require('if encrypted = encrypted_again then' in code, 'nondeterminism canary')
    require('if not wrong_key_rejected then' in code, 'wrong-key canary')
    require('if recovered is distinct from envelope then' in code, 'roundtrip and binding check')
    for field in SENSITIVE:
        require(f"'{field}', source_row.{field}" in code, 'all sensitive fields')
    for binding in ["'user_id', source_row.user_id", "'secret_reference_id', reference_id",
                    "'key_version', wal_key_version", "'secret_version', 1", "'payload_version', 1"]:
        require(binding in code, 'identity and version binding')
    require('p_expected_rows is distinct from 1' in code and 'source_count <> p_expected_rows' in code, 'bounded count')
    require('lock table public.wallet_bank_accounts in share row exclusive mode;' in code, 'source write lock')
    require('lock table private.wallet_bank_account_secrets_v1 in exclusive mode;' in code, 'backfill serialization')
    require('encrypted := secret_row.ciphertext;' in code, 'retry reuses ciphertext')
    require('purge_after is null and destroyed_at is null' in code, 'unapproved purge disabled')
    returns = re.findall(r'\breturn\s+([^;]+);', code)
    require(len(returns) == 1, 'single return')
    require(re.sub(r'\s+', '', returns[0]) ==
            "jsonb_build_object('source_count',source_count,'inserted_count',inserted_count,'verified_count',verified_count,'legacy_plaintext_preserved',true,'runtime_cutover',false)", 'aggregate-only return')
    require(not re.search(r'(select|perform)\s+private.backfill_wallet_bank_account_secrets_v1', code), 'no automatic backfill')
    return len(statements)


class CandidateTests(unittest.TestCase):
    def test_candidate(self):
        validate_contract(CONTRACT)
        self.assertEqual(hashlib.sha256(SOURCE.encode()).hexdigest(), CONTRACT['migrationSha256'])
        self.assertEqual(validate_sql(SOURCE), 24)

    def test_canonical_predecessors_and_maturity(self):
        a01 = json.loads((ROOT / 'config/wal-b03-a01-bank-data-protection-authority.json').read_text())
        a02 = json.loads((ROOT / 'config/wal-a02-bank-account-sensitive-data-boundary.json').read_text())
        matrix = json.loads((ROOT / 'config/domain-completion-matrix.json').read_text())
        self.assertEqual(CONTRACT['dependsOn'], [a01['contractId'], a02['contractId']])
        self.assertEqual(matrix['version'], CONTRACT['matrixVersion'])
        wallet = next(d for d in matrix['domains'] if d['id'] == 'WAL-001')
        self.assertEqual(wallet['maturity'], 3)
        self.assertEqual(wallet['productionGate'], 'blocked')
        self.assertTrue(any(b['id'] == 'WAL-B03' for b in wallet['blockers']))

    def test_authority_mutations(self):
        for field in ['migrationApply', 'stagingWrite', 'deploy', 'production', 'merge', 'readyForReview', 'historyRewrite']:
            with self.subTest(field=field):
                contract = copy.deepcopy(CONTRACT)
                contract['authorization'][field] = True
                with self.assertRaises(ValueError):
                    validate_contract(contract)

    def test_sql_security_mutations(self):
        mutations = [
            ('security invoker', 'security definer'),
            ('set search_path = pg_catalog', 'set search_path = public'),
            ('create table private.wallet_bank_account_secrets_v1', 'create table public.wallet_bank_account_secrets_v1'),
            ('ciphertext bytea not null', 'account_number text, ciphertext bytea not null'),
            ('cipher-algo=aes256', 'cipher-algo=cast5'),
            ("'user_id', source_row.user_id", "'user_id', gen_random_uuid()"),
            ("'secret_reference_id', reference_id", "'reference', reference_id"),
            ("'key_version', wal_key_version", "'version', wal_key_version"),
            ('if recovered is distinct from envelope then', 'if false then'),
            ('if encrypted = encrypted_again then', 'if false then'),
            ('if not wrong_key_rejected then', 'if false then'),
            ('p_expected_rows is distinct from 1', 'p_expected_rows is null'),
            ('lock table public.wallet_bank_accounts in share row exclusive mode;', ''),
            ('lock table private.wallet_bank_account_secrets_v1 in exclusive mode;', ''),
            ("current_setting('doke.wal_b03_a03_execution', true) is distinct from 'explicitly_authorized'", 'false'),
            ("has_any_column_privilege(api_role, 'vault.decrypted_secrets', 'SELECT')", 'false'),
            ('revoke all privileges on all tables in schema vault from service_role;', ''),
            ('revoke execute on all functions in schema vault from service_role;', ''),
            ('revoke usage on schema vault from service_role;', ''),
            ("has_schema_privilege('service_role', 'vault', 'USAGE')", 'false'),
            ('revoke all on table private.wallet_bank_account_secrets_v1 from public, anon, authenticated, service_role;', ''),
            ('alter table private.wallet_bank_account_secrets_v1 enable row level security;', ''),
            ('purge_after is null and destroyed_at is null', 'true'),
            ("return jsonb_build_object('source_count', source_count, 'inserted_count', inserted_count,\n    'verified_count', verified_count, 'legacy_plaintext_preserved', true,\n    'runtime_cutover', false);", 'return recovered;'),
            ('commit;', 'grant select on private.wallet_bank_account_secrets_v1 to service_role; commit;'),
            ('commit;', 'update public.wallet_bank_accounts set document = null; commit;'),
            ('commit;', 'select private.backfill_wallet_bank_account_secrets_v1(1); commit;'),
            ('commit;', 'drop table public.wallet_bank_accounts; commit;'),
        ]
        for before, after in mutations:
            with self.subTest(mutation=before[:70]):
                self.assertIn(before, SOURCE)
                with self.assertRaises((ValueError, parser.ParseError)):
                    validate_sql(SOURCE.replace(before, after))


if __name__ == '__main__':
    unittest.main(verbosity=2)

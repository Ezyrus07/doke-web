'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const sqlPath = path.join(ROOT, 'supabase', 'tests', '013_platform_default_acl_validation.sql');
assert.ok(fs.existsSync(sqlPath), 'Platform default ACL validation SQL is missing.');
const sql = fs.readFileSync(sqlPath, 'utf8').toLowerCase();

[
  "n.nspname = 'public'",
  "not c.relrowsecurity",
  'not exists (',
  "pg_get_userbyid(c.relowner) = 'supabase_admin'",
  "grantee in ('public', 'anon', 'authenticated')",
  "owner_role.rolname = 'postgres'",
  'aclexplode(d.defaclacl)',
  'sec_platform_acl_validation',
].forEach((marker) => assert.ok(sql.includes(marker), `Missing ACL contract marker: ${marker}`));

assert.ok(!sql.includes('alter default privileges for role supabase_admin'), 'The project must not attempt to alter platform-owned defaults.');
assert.ok(!sql.includes('grant '), 'The validation must remain read-only.');
assert.ok(!sql.includes('revoke '), 'The validation must remain read-only.');

console.log('Platform default ACL contract: PASS');

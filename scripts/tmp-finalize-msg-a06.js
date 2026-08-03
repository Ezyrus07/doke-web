#!/usr/bin/env node
'use strict';

const fs = require('node:fs');

const matrixPath = 'config/domain-completion-matrix.json';
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const msg = matrix.domains.find((domain) => domain.id === 'MSG-001');
if (!msg) throw new Error('MSG-001 matrix domain not found');
const workflowPath = '.github/workflows/msg-001-a06-presence-typing-boundary.yml';
if (!msg.requiredPaths.includes(workflowPath)) msg.requiredPaths.push(workflowPath);
matrix.version = '1.3.83';
matrix.updatedAt = '2026-08-02T22:05:00-03:00';
fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2) + '\n');

const auditPath = 'scripts/audit-msg-001-a06-presence-typing-boundary.js';
let audit = fs.readFileSync(auditPath, 'utf8');
if (!audit.includes("const matrix = JSON.parse(read('config/domain-completion-matrix.json'))")) {
  audit = audit.replace(
    "const migration = read('supabase/migrations/20260802234000_msg_a06_presence_typing_realtime_authorization_contract.sql');",
    "const migration = read('supabase/migrations/20260802234000_msg_a06_presence_typing_realtime_authorization_contract.sql');\nconst matrix = JSON.parse(read('config/domain-completion-matrix.json'));\nconst msg = matrix.domains.find((domain) => domain.id === 'MSG-001');\nconst workflow = read('.github/workflows/msg-001-a06-presence-typing-boundary.yml');",
  );
}
if (!audit.includes("MSG-A06 workflow must remain read-only")) {
  audit = audit.replace(
    "console.log('MSG-A06 presence and typing boundary audit passed.');",
    `assert(matrix.version === '1.3.83', 'matrix version must be 1.3.83');
assert(msg, 'MSG-001 matrix domain missing');
[
  'assets/js/repositories/messages-presence-repository.js',
  'assets/js/features/chat-realtime-presence.js',
  'supabase/migrations/20260802234000_msg_a06_presence_typing_realtime_authorization_contract.sql',
  'config/msg-001-a06-presence-typing-boundary.json',
  'docs/MSG-001-A06-PRESENCE-TYPING-BOUNDARY.md',
  'docs/validation/MSG-001-A06-PRESENCE-TYPING-BOUNDARY.json',
  'scripts/audit-msg-001-a06-presence-typing-boundary.js',
  'scripts/test-msg-001-a06-presence-typing-runtime.js',
  '.github/workflows/msg-001-a06-presence-typing-boundary.yml'
].forEach((requiredPath) => assert(msg.requiredPaths.includes(requiredPath), 'matrix requiredPaths missing ' + requiredPath));
assert(msg.tests.includes('audit:msg-001-a06-presence-typing-boundary'), 'matrix audit test missing');
assert(msg.tests.includes('test:msg-001-a06-presence-typing-runtime'), 'matrix runtime test missing');
assert(workflow.includes('permissions:\\n  contents: read'), 'MSG-A06 workflow must remain read-only');
['contents: write', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'psql ', 'curl ', 'git push'].forEach((fragment) => {
  assert(!workflow.includes(fragment), 'MSG-A06 workflow contains prohibited fragment: ' + fragment);
});

console.log('MSG-A06 presence and typing boundary audit passed.');`,
  );
}
fs.writeFileSync(auditPath, audit);

console.log('MSG-A06 permanent gate and matrix finalized.');

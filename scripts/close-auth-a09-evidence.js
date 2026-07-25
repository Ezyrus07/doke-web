#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content, 'utf8');
}

const validationPath = 'docs/validation/AUTH-001-A09-PROVIDER-AUTHORITY.md';
let validation = read(validationPath);
validation = validation.replace(
  'Implemented; pending canonical CI validation.',
  'DONE — implemented and validated on the canonical branch head.'
);

const finalValidationMarker = '## Final validation';
if (!validation.includes(finalValidationMarker)) {
  validation = validation.trimEnd() + [
    '',
    '## Final validation',
    '',
    'Canonical validation head: `8ff0fedb57a4ec945b4ab4906193f2d195a31271`.',
    '',
    '- Doke Quality Gates #442: success;',
    '- static architecture and partition audits: success;',
    '- canonical auth/session runtime and AUTH-A09 provider-authority runtime: success;',
    '- blocking deterministic E2E lane: success;',
    '- 105 visual structural guards: success;',
    '- deterministic domain matrix, governance, asset and lane audits: success;',
    '- Doke Staging Edge HTTP Canary #216: success;',
    '- `git diff --check`: success.',
    '',
    'Doke Diagnostic E2E #237 was still running at mandatory closure and is explicitly non-blocking; no success claim is made for it.',
    ''
  ].join('\n');
}
write(validationPath, validation);

const jsonPath = 'docs/validation/AUTH-001-A09-PROVIDER-AUTHORITY.json';
const evidence = JSON.parse(read(jsonPath));
evidence.status = 'done';
evidence.validatedHead = '8ff0fedb57a4ec945b4ab4906193f2d195a31271';
evidence.validation = {
  qualityGates: { runNumber: 442, status: 'success' },
  staticAudits: 'success',
  canonicalAuthRuntime: 'success',
  providerAuthorityRuntime: 'success',
  blockingE2E: 'success',
  visualStructuralGuards: { count: 105, status: 'success' },
  stagingEdgeHttpCanary: { runNumber: 216, status: 'success' },
  diagnosticE2E: { runNumber: 237, status: 'in_progress_at_mandatory_closure', blocking: false },
  domainMatrix: 'success',
  diffCheck: 'success'
};
write(jsonPath, JSON.stringify(evidence, null, 2) + '\n');

const journalPath = 'docs/DOKE-ENGINEERING-JOURNAL.md';
let journal = read(journalPath);
const journalMarker = '## 2026-07-25 — AUTH-A09 browser-controlled auth provider selection retired';
if (!journal.includes(journalMarker)) {
  const anchor = '\n---\n\n# Entry template\n';
  if (!journal.includes(anchor)) {
    throw new Error('Engineering Journal entry-template anchor is missing.');
  }

  const entry = [
    '',
    journalMarker,
    '',
    '**Scope:** PR #9, branch `auth/auth-001-baseline-audit`',
    '',
    '**Outcome:** `DONE` for AUTH-A09; `BLOCKED` for MAIL-001 and PAID-001',
    '',
    '### Context',
    '',
    'Login and registration already used Supabase, but runtime configuration and the auth facade still accepted provider selection from query strings, localStorage and window configuration. Those browser-controlled values could redirect bootstrap, refresh and token resolution to the historical `/auth/*` adapter.',
    '',
    '### Decision',
    '',
    'Supabase Auth is the only active browser authentication authority. Historical `/auth/*` verification remains CLI-only and cannot mutate browser provider state.',
    '',
    '### Implementation',
    '',
    '- Fixed `authProvider`, `requestedAuthProvider` and `defaultAuthProvider` to `supabase` in runtime configuration.',
    '- Retired `doke.authProvider`, `dokeAuthProvider`, `dokeAuthIdentityCanary` and the browser canary storage key.',
    '- Removed public browser APIs for configuring or rolling back the auth provider canary.',
    '- Routed browser refresh, token resolution, logout and bootstrap through Supabase.',
    '- Kept the historical API smoke isolated in the CLI-only diagnostic harness.',
    '- Added deterministic malicious-override coverage and connected it to the mandatory canonical auth runtime chain.',
    '- Updated auth contracts, runbook, E2E setup and deterministic domain evidence.',
    '',
    '### Validation',
    '',
    'Canonical validation head: `8ff0fedb57a4ec945b4ab4906193f2d195a31271`.',
    '',
    '- Doke Quality Gates #442: success.',
    '- Static architecture and partition audits: success.',
    '- Canonical auth/session runtime and AUTH-A09 provider-authority runtime: success.',
    '- Blocking deterministic E2E lane: success.',
    '- 105 visual structural guards: success.',
    '- Doke Staging Edge HTTP Canary #216: success.',
    '- Deterministic matrix, governance, asset audits and `git diff --check`: success.',
    '- Doke Diagnostic E2E #237 remained in progress at mandatory closure and is non-blocking; no success claim was made.',
    '',
    '### Risks and boundaries',
    '',
    '- No production environment or Supabase configuration was changed.',
    '- No account, credential, contact, profile or role was changed.',
    '- No SMTP, SMS or OAuth provider was enabled.',
    '- Historical API helper functions remain private and unreachable pending a dedicated deletion audit.',
    '- Operational data-provider flags remain outside this auth-only sublot.',
    '- `MAIL-001` and `PAID-001 / SEC-B05` remain open.',
    '- PR #9 remains draft and must not be merged without explicit authorization.',
    '',
    '### Next step',
    '',
    'Plan AUTH-A10 to remove unreachable browser `/auth/*` adapter code and remaining dead auth helpers while preserving the standalone CLI diagnostic and canonical Supabase behavior.',
    ''
  ].join('\n');

  journal = journal.replace(anchor, '\n---\n' + entry + '\n---\n\n# Entry template\n');
  write(journalPath, journal);
}

console.log('AUTH-A09 closure evidence prepared.');

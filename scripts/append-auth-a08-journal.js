#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const journalPath = path.join(root, 'docs/DOKE-ENGINEERING-JOURNAL.md');
const marker = '## 2026-07-25 — AUTH-A08 legacy authority and unavailable providers retired';
const anchor = '\n---\n\n# Entry template\n';

const entry = `

## 2026-07-25 — AUTH-A08 legacy authority and unavailable providers retired

**Scope:** PR #9, branch \`auth/auth-001-baseline-audit\`

**Outcome:** \`DONE\` for AUTH-A08; \`BLOCKED\` for optional providers without real configuration

### Context

The active pages no longer loaded the old browser authentication service, but the file still contained a complete second authority that could be restored by a stale import. Login also advertised phone access, while login and signup exposed Google, Facebook and Apple controls without configured provider flows.

### Decision

Keep the historical path as a non-executable tombstone, expose e-mail as the only canonical login identifier, remove unavailable OAuth controls and make this contract part of the mandatory auth/session runtime gate.

### Implementation

- Replaced \`assets/js/core/auth-service.js\` with the \`AUTH-A08_RETIRED_AUTHORITY\` tombstone.
- Removed all executable credential, registration, recovery, storage and API-publication behavior from that path.
- Preserved only historical legacy identifiers for migration and audit traceability.
- Made \`auth/login.html\` e-mail-only and removed phone-login language and hooks.
- Removed Google, Facebook and Apple controls from login and signup.
- Strengthened \`scripts/test-real-auth-only-contract.js\`.
- Added the real-auth-only contract to \`scripts/test-auth-canonical-session-runtime.js\`.
- Added a restricted deterministic matrix synchronization workflow.
- Added Markdown and JSON closure evidence under \`docs/validation/\`.

### Validation

Runtime and visual-validation head: \`cae8fa312116ef2a2fa38507068e24067842a8d5\`.

- Doke Quality Gates #414: success.
- Blocking deterministic E2E: success.
- 105 visual structural guards: success.
- Doke Staging Edge HTTP Canary #188: success.
- Static audits, auth/session runtime, real-auth-only contract, matrix, governance, asset audits and \`git diff --check\`: success.
- Diagnostic E2E #209 was non-blocking and still executing when mandatory closure gates completed; no success claim was made for it.

### Risks and boundaries

- No production environment, authentication provider configuration or database object was changed.
- No existing account, credential, contact, profile or role was changed.
- No SMS or OAuth provider was enabled.
- Inactive social-auth CSS and a dormant phone-mask helper remain candidates for a dedicated dead-code/controller cleanup audit; they do not expose active controls.
- \`MAIL-001\` and \`PAID-001 / SEC-B05\` remain open.
- PR #9 remains draft and must not be merged without explicit authorization.

### Next step

Plan \`AUTH-A09\` around \`AUTH-B02\`: remove browser-controlled provider selection and promote remote authentication as the only production authority through controlled route-by-route canaries.
`;

if (!fs.existsSync(journalPath)) {
  console.error('Engineering Journal is missing.');
  process.exit(1);
}

const current = fs.readFileSync(journalPath, 'utf8');
if (current.includes(marker)) {
  console.log('AUTH-A08 journal entry is already present.');
  process.exit(0);
}
if (!current.includes(anchor)) {
  console.error('Engineering Journal entry-template anchor is missing.');
  process.exit(1);
}

const next = current.replace(anchor, `\n---\n${entry}\n---\n\n# Entry template\n`);
fs.writeFileSync(journalPath, next, 'utf8');
console.log('AUTH-A08 journal entry appended.');

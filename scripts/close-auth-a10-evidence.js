#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const validatedHead = 'b72d3fa414cf91563c13ef73e9f9d241c0b4ce77';

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function write(file, content) {
  const target = path.join(root, file);
  fs.writeFileSync(target, content.endsWith('\n') ? content : content + '\n', 'utf8');
}

function replaceOnce(content, search, replacement, label) {
  const first = content.indexOf(search);
  if (first < 0) throw new Error('Missing block: ' + label);
  if (content.indexOf(search, first + search.length) >= 0) throw new Error('Duplicate block: ' + label);
  return content.slice(0, first) + replacement + content.slice(first + search.length);
}

const mdPath = 'docs/validation/AUTH-001-A10-DEAD-ADAPTER-RETIREMENT.md';
let md = read(mdPath);
md = replaceOnce(
  md,
  'Implemented; pending canonical CI validation.',
  'DONE — implemented and validated on the canonical branch head.',
  'A10 status'
);
if (!md.includes('## Final validation')) {
  md += `\n## Final validation\n\nCanonical validation head: \`${validatedHead}\`.\n\n- Doke Quality Gates #464: success;\n- static architecture and partition audits: success;\n- canonical auth/session runtime and AUTH-A10 dead-adapter runtime: success;\n- blocking deterministic E2E lane: success;\n- 105 visual structural guards: success;\n- deterministic domain matrix, governance, asset and E2E-lane audits: success;\n- Doke Staging Edge HTTP Canary #238: success;\n- \`git diff --check\`: success.\n\nDoke Diagnostic E2E #259 was still running at mandatory closure and is explicitly non-blocking; no success claim is made for it.\n`;
}
write(mdPath, md);

const jsonPath = 'docs/validation/AUTH-001-A10-DEAD-ADAPTER-RETIREMENT.json';
const evidence = JSON.parse(read(jsonPath));
evidence.status = 'done';
evidence.validatedHead = validatedHead;
evidence.validation = {
  qualityGates: { runNumber: 464, status: 'success' },
  staticAudits: 'success',
  canonicalAuthRuntime: 'success',
  deadAdapterRetirementRuntime: 'success',
  blockingE2E: 'success',
  visualStructuralGuards: { count: 105, status: 'success' },
  stagingEdgeHttpCanary: { runNumber: 238, status: 'success' },
  diagnosticE2E: { runNumber: 259, status: 'in_progress_at_mandatory_closure', blocking: false },
  domainMatrix: 'success',
  diffCheck: 'success'
};
write(jsonPath, JSON.stringify(evidence, null, 2));

const journalPath = 'docs/DOKE-ENGINEERING-JOURNAL.md';
let journal = read(journalPath);
const entryTitle = '## 2026-07-25 — AUTH-A10 unreachable browser auth adapter physically removed';
if (!journal.includes(entryTitle)) {
  const marker = '# Entry template';
  const entry = `${entryTitle}\n\n**Scope:** PR #9, branch \`auth/auth-001-baseline-audit\`\n\n**Outcome:** \`DONE\` for AUTH-A10; \`BLOCKED\` for MAIL-001 and PAID-001\n\n### Context\n\nAUTH-A09 fixed Supabase as the only browser authentication authority, but \`assets/js/services/auth-service.js\` still retained unreachable \`/auth/*\` endpoints, request helpers, a volatile API token, provider-status facades and a no-op \`refreshApiSession\` compatibility path. Dormant authority-shaped code increased regression risk even though it could no longer be selected.\n\n### Decision\n\nDelete the historical browser adapter physically. Preserve only the standalone CLI diagnostic and public compatibility methods with proven active consumers.\n\n### Implementation\n\n- Removed browser constants and helpers for \`/auth/login\`, \`/auth/register\`, \`/auth/session\` and \`/auth/logout\`.\n- Removed the volatile API token and API request/session normalization helpers.\n- Removed \`refreshApiSession\`, \`refreshCurrentIdentity\`, \`getAuthProviderStatus\` and \`getAuthIdentityCanaryStatus\` from the public facade.\n- Migrated owner-profile identity confirmation to canonical \`refreshSession({ silent: true })\`.\n- Preserved \`getActiveAuthProvider()\` as a constant Supabase compatibility surface because it has an active verification-service consumer.\n- Preserved the CLI-only Auth/Identity diagnostic outside browser runtime.\n- Added deterministic source/runtime coverage and strengthened the AUTH-A09 regression test to require the retired facades to be absent.\n- Corrected active contracts and runbooks that still described the browser canary as active.\n\n### Validation\n\nCanonical validation head: \`${validatedHead}\`.\n\n- Doke Quality Gates #464: success.\n- Static architecture and partition audits: success.\n- Canonical auth/session runtime and AUTH-A10 dead-adapter runtime: success.\n- Blocking deterministic E2E lane: success.\n- 105 visual structural guards: success.\n- Doke Staging Edge HTTP Canary #238: success.\n- Deterministic matrix, governance, asset, E2E-lane and \`git diff --check\` audits: success.\n- Doke Diagnostic E2E #259 remained in progress at mandatory closure and is non-blocking; no success claim was made.\n\n### Risks and boundaries\n\n- No production environment or Supabase configuration was changed.\n- No account, credential, session, contact, profile or role was changed.\n- No SMTP, SMS or OAuth provider was enabled.\n- Generic domain repository providers remain outside this auth-only sublot.\n- Local/mock-shaped profile mutation helpers remain a separate authority concern and were not silently rewritten in A10.\n- \`MAIL-001\` and \`PAID-001 / SEC-B05\` remain open.\n- PR #9 remains draft and must not be merged without explicit authorization.\n\n### Next step\n\nPlan AUTH-A11 to separate profile/public-identity mutation from authentication authority, eliminating local mock session rewrites without conflating the work with blocked verified contact changes in AUTH-A07.\n\n---\n\n`;
  journal = replaceOnce(journal, marker, entry + marker, 'journal entry marker');
}
write(journalPath, journal);

console.log('AUTH-A10 closure evidence prepared.');

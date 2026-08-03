'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, content) => fs.writeFileSync(path.join(root, file), content);
const readJson = (file) => JSON.parse(read(file));
const writeJson = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
const uniquePush = (list, values) => {
  values.forEach((value) => { if (!list.includes(value)) list.push(value); });
};
const replaceRequired = (file, before, after) => {
  let content = read(file);
  if (!content.includes(before) && !content.includes(after)) throw new Error('PAY-A03 patch anchor missing in ' + file);
  content = content.replace(before, after);
  write(file, content);
};

const intentPath = 'backend/modules/payments/payment-provider-contract.js';
let intentContract = read(intentPath);
const oldPattern = "const SENSITIVE_FIELD_PATTERN = /(^|_)(card(number)?|pan|cvv|cvc|security(code)?|track[12]?|magnetic|raw(card|payment)|full(card|pan))($|_)/i;";
const newPattern = "const SENSITIVE_FIELD_PATTERN = /(^|_)(card_?number|card|pan|cvv|cvc|security_?code|track_?[12]?|magnetic|raw_?(card|payment)|full_?(card|pan))($|_)/i;";
if (!intentContract.includes(oldPattern) && !intentContract.includes(newPattern)) {
  throw new Error('PAY-A03 sensitive field pattern anchor missing.');
}
intentContract = intentContract.replace(oldPattern, newPattern);
write(intentPath, intentContract);

replaceRequired(
  'scripts/audit-pay-001-a01-authority-baseline.js',
  "assert(['1.3.86', '1.3.87'].includes(matrix.version), 'matrix version must be PAY-A01/PAY-A02 compatible');",
  "assert(/^1\\.3\\.(?:8[6-9]|9\\d|\\d{3,})$/.test(matrix.version), 'matrix version must remain PAY-A01 compatible');"
);
replaceRequired(
  'scripts/audit-pay-001-a02-authenticated-authority-boundary.js',
  "assert(matrix.version === '1.3.87', 'matrix version must be 1.3.87');",
  "assert(/^1\\.3\\.(?:8[7-9]|9\\d|\\d{3,})$/.test(matrix.version), 'matrix version must remain PAY-A02 compatible');"
);
replaceRequired(
  'scripts/audit-pay-001-a02-authenticated-authority-boundary.js',
  "assert(pay.nextActions[0].includes('PAY-A03'), 'PAY-A03 must be next');",
  "assert(pay.nextActions[0].includes('PAY-A03') || pay.nextActions[0].includes('PAY-A04'), 'PAY-A03/PAY-A04 progression mismatch');"
);
replaceRequired(
  'scripts/audit-pay-001-a03-psp-neutral-intent-webhook.js',
  "  const combined = [intentContract, webhookContract, eventLedger, JSON.stringify(config)].join('\\n').toLowerCase();\n  assert(!combined.includes(providerName), 'provider-specific dependency found: ' + providerName);",
  "  const combined = [intentContract, webhookContract, eventLedger, JSON.stringify(config)].join('\\n').toLowerCase();\n  const lexical = ' ' + combined.replace(/[^a-z0-9]+/g, ' ') + ' ';\n  const needle = ' ' + providerName.toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';\n  assert(!lexical.includes(needle), 'provider-specific dependency found: ' + providerName);"
);
replaceRequired(
  'scripts/test-pay-001-a03-psp-neutral-intent-webhook.js',
  "  assert.match(verification.rawBodyHash, /^[0-9a-f]{64}$/);\n\n  await expectReject(\n    () => Promise.resolve().then(() => verifyWebhookSignature({ rawBody, secret: SECRET, signatureHeader: signatureHeader.replace(/.$/, '0'), now: NOW_SECONDS })),",
  "  assert.match(verification.rawBodyHash, /^[0-9a-f]{64}$/);\n  const invalidSignatureHeader = signatureHeader.slice(0, -1) + (signatureHeader.endsWith('0') ? '1' : '0');\n\n  await expectReject(\n    () => Promise.resolve().then(() => verifyWebhookSignature({ rawBody, secret: SECRET, signatureHeader: invalidSignatureHeader, now: NOW_SECONDS })),"
);

const pkg = readJson('package.json');
pkg.scripts['audit:pay-001-a03-psp-neutral-intent-webhook'] = 'node scripts/audit-pay-001-a03-psp-neutral-intent-webhook.js';
pkg.scripts['test:pay-001-a03-psp-neutral-intent-webhook'] = 'node scripts/test-pay-001-a03-psp-neutral-intent-webhook.js';
writeJson('package.json', pkg);

const matrix = readJson('config/domain-completion-matrix.json');
matrix.version = '1.3.88';
matrix.updatedAt = '2026-08-03T09:55:00-03:00';
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');
if (!pay) throw new Error('PAY-001 matrix domain missing.');
uniquePush(pay.requiredPaths, [
  'backend/modules/payments/payment-provider-contract.js',
  'backend/modules/payments/provider-webhook-contract.js',
  'backend/modules/payments/provider-event-ledger.js',
  'config/pay-001-a03-psp-neutral-intent-webhook.json',
  'docs/PAY-001-A03-PSP-NEUTRAL-INTENT-WEBHOOK.md',
  'docs/validation/PAY-001-A03-PSP-NEUTRAL-INTENT-WEBHOOK.json',
  'scripts/audit-pay-001-a03-psp-neutral-intent-webhook.js',
  'scripts/test-pay-001-a03-psp-neutral-intent-webhook.js',
  '.github/workflows/pay-001-a03-psp-neutral-intent-webhook.yml'
]);
uniquePush(pay.tests, [
  'audit:pay-001-a03-psp-neutral-intent-webhook',
  'test:pay-001-a03-psp-neutral-intent-webhook'
]);
uniquePush(pay.evidence, [
  'PAY-A03 defines a PSP-neutral payment-intent envelope with deterministic request hashing, integer minor-unit amounts, authorize-then-hold semantics and recursive rejection of raw card data.',
  'PAY-A03 verifies HMAC-SHA256 signatures against the untouched raw body before JSON parsing, uses constant-time comparison and enforces a bounded timestamp replay window.',
  'Verified provider events reuse api_idempotency_keys through a service-role-only ledger keyed by provider and event ID; exact replay is safe, payload drift fails closed and failed events require reconciliation.',
  'No PSP, account, signing secret, webhook registration, migration, deploy or real-money evidence was introduced by PAY-A03.'
]);
pay.nextActions = [
  'PAY-A04 — define provider-neutral reconciliation, divergence classification, operator queue and controlled replay without selecting or activating a PSP.',
  'PAY-B01 — select and contract a PSP, configure signed webhook authority and run provider-specific staging conformance only after explicit authorization.',
  'PAY-B03 — approve commercial, fiscal, escrow, refund, dispute and payout rules.',
  'PAY-B04 — operationalize reconciliation and divergence handling before production.'
];
writeJson('config/domain-completion-matrix.json', matrix);

console.log('PAY-A03 package, matrix, cumulative audits and contract tests finalized.');

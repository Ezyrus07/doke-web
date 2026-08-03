'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const target = path.join(root, 'assets/js/services/payment-service.js');
let source = fs.readFileSync(target, 'utf8');

const replacements = [
  [
    "    if (shouldUseFinanceSandbox()) return confirmSandboxPaymentFlow(normalizedOrderId, payload);\n    assertLocalFinancialFixtureAllowed('confirmar pagamento');",
    "    if (shouldUseFinanceSandbox()) return confirmSandboxPaymentFlow(normalizedOrderId, payload);\n    try { assertLocalFinancialFixtureAllowed('confirmar pagamento'); }\n    catch (error) { return Promise.reject(error); }"
  ],
  [
    "    if (shouldUseFinanceSandbox()) return requestSandboxCompletionFlow(normalizedOrderId, payload);\n    assertLocalFinancialFixtureAllowed('solicitar conclusão financeira');",
    "    if (shouldUseFinanceSandbox()) return requestSandboxCompletionFlow(normalizedOrderId, payload);\n    try { assertLocalFinancialFixtureAllowed('solicitar conclusão financeira'); }\n    catch (error) { return Promise.reject(error); }"
  ],
  [
    "    if (shouldUseFinanceSandbox()) return releaseSandboxCompletionFlow(normalizedOrderId, payload);\n    assertLocalFinancialFixtureAllowed('confirmar conclusão e liberar pagamento');",
    "    if (shouldUseFinanceSandbox()) return releaseSandboxCompletionFlow(normalizedOrderId, payload);\n    try { assertLocalFinancialFixtureAllowed('confirmar conclusão e liberar pagamento'); }\n    catch (error) { return Promise.reject(error); }"
  ]
];

for (const [before, after] of replacements) {
  if (!source.includes(before)) throw new Error('PAY-A02 async fix target missing');
  source = source.replace(before, after);
}

fs.writeFileSync(target, source);
console.log('PAY-A02 public commands now reject asynchronously.');

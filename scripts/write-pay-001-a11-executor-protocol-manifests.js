'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  buildProtocolManifest,
  COMMAND_KINDS
} = require('../backend/modules/payments/payment-reconciliation-executor-protocol');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'config/pay-a11-executor-protocol-manifests');
const checkOnly = process.argv.includes('--check');

const filenames = {
  read_only_preflight: 'read-only-preflight.json',
  migration_application: 'migration-application.json',
  post_migration_verification: 'post-migration-verification.json',
  rollback: 'rollback.json',
  cleanup: 'cleanup.json'
};

fs.mkdirSync(outputDir, { recursive: true });
for (const operation of Object.keys(COMMAND_KINDS)) {
  const content = JSON.stringify(buildProtocolManifest(operation), null, 2) + '\n';
  const target = path.join(outputDir, filenames[operation]);
  if (checkOnly) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content) {
      throw new Error('PAY-A11 manifest is stale: ' + path.relative(root, target));
    }
  } else {
    fs.writeFileSync(target, content, 'utf8');
  }
}
console.log(checkOnly ? 'PAY-A11 protocol manifests are current.' : 'PAY-A11 protocol manifests written.');

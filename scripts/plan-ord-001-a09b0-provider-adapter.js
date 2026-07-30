#!/usr/bin/env node
'use strict';

const {
  buildProviderNeutralPlan,
  evaluateProviderSelection
} = require('../backend/runtime/staging/provider-adapter-contract');

function parseMode(argv) {
  const args = new Set(argv || []);
  if (args.has('--check-env')) return 'check-env';
  return 'dry-run';
}

function main() {
  const mode = parseMode(process.argv.slice(2));

  if (mode === 'check-env') {
    const selection = evaluateProviderSelection(process.env);
    console.log(JSON.stringify({
      mode,
      status: selection.providerSelected
        ? 'selection_validated_provider_specific_adapter_required'
        : 'selection_blocked',
      selection
    }, null, 2));
    if (!selection.providerSelected) process.exitCode = 2;
    return;
  }

  console.log(JSON.stringify(buildProviderNeutralPlan({}), null, 2));
}

if (require.main === module) main();

module.exports = Object.freeze({ parseMode, main });

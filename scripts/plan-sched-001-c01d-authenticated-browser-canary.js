#!/usr/bin/env node
'use strict';

const fs = require('fs');

const CONFIG_PATH = 'config/sched-001-c01d-authenticated-browser-canary-readiness.json';
const args = new Set(process.argv.slice(2));

if (!args.has('--dry-run') || args.size !== 1) {
  console.error('SCHED-C01D readiness planner is inert. Only --dry-run is available; authenticated browser execution requires a separate authorized package.');
  process.exit(2);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

const report = {
  contractVersion: config.contractVersion,
  mode: 'dry-run',
  status: 'authenticated_browser_execution_blocked',
  environment: config.environment,
  projectRef: config.projectRef,
  requiredExactPhrase: config.authorization.requiredExactPhrase,
  genericNextAllowed: config.authorization.genericNextAllowed,
  browserContextsRequired: config.runtimeGate.browserContexts,
  postLoginAllowedMethods: config.runtimeGate.allowedPostLoginMethods,
  surfaces: config.surfaces,
  requiredAssertions: config.requiredAssertions,
  externalInputsRequiredLater: [
    'staging_target_url',
    'client_credentials',
    'professional_credentials',
    'authorization_envelope',
    'read_only_case_manifest'
  ],
  capabilities: config.capabilities,
  effects: config.effects
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

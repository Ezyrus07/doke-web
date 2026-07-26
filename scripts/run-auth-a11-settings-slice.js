#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { execFileSync } = require('child_process');

const codemodPath = 'scripts/apply-auth-a11-settings-slice.js';
const originalCodemod = fs.readFileSync(codemodPath, 'utf8');
const ambiguous = "  source = replaceOnce(source, '    updateCurrentUser,\\n', '', 'session authority API updateCurrentUser');\n  source = replaceOnce(source, '      updateCurrentUser,\\n', '', 'session facade updateCurrentUser');";
const contextual = `  source = replaceOnce(\n    source,\n    '    resetPassword,\\n    updateCurrentUser,\\n    getPublicState,',\n    '    resetPassword,\\n    getPublicState,',\n    'session authority API updateCurrentUser'\n  );\n  source = replaceOnce(\n    source,\n    '      resetPassword,\\n      updateCurrentUser,\\n      sessionAuthority: api',\n    '      resetPassword,\\n      sessionAuthority: api',\n    'session facade updateCurrentUser'\n  );`;

if (!originalCodemod.includes(ambiguous)) {
  throw new Error('AUTH_A11_SETTINGS_CODEMOD_SELECTOR_SOURCE_MISSING');
}

fs.writeFileSync(codemodPath, originalCodemod.replace(ambiguous, contextual));

try {
  require('./apply-auth-a11-settings-slice.js');
  fs.writeFileSync(codemodPath, originalCodemod);
} catch (error) {
  fs.writeFileSync(codemodPath, originalCodemod);
  const message = 'AUTH_A11_SETTINGS_CODEMOD_ERROR: ' + (error && error.stack || error);
  console.error(message);
  fs.writeFileSync('.github/auth-a11-settings-error.txt', message + '\n');
  try {
    execFileSync('git', ['config', 'user.name', 'github-actions[bot]']);
    execFileSync('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
    execFileSync('git', ['add', '.github/auth-a11-settings-error.txt']);
    execFileSync('git', ['commit', '-m', 'Capture AUTH-A11 settings codemod error']);
    execFileSync('git', ['push', 'origin', 'HEAD:auth/auth-001-baseline-audit'], { stdio: 'inherit' });
  } catch (publishError) {
    console.error('AUTH_A11_SETTINGS_DIAGNOSTIC_PUBLISH_ERROR: ' + (publishError && publishError.message || publishError));
  }
  process.exit(1);
}

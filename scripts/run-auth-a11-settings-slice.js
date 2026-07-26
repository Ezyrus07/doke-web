#!/usr/bin/env node
'use strict';

try {
  require('./apply-auth-a11-settings-slice.js');
} catch (error) {
  console.error('AUTH_A11_SETTINGS_CODEMOD_ERROR: ' + (error && error.message || error));
  process.exit(1);
}

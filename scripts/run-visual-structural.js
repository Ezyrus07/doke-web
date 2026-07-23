#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const manifest = require('../tests/visual/visual-regression.manifest.json');

const expectedTests = 105;
const actualTests = (manifest.pages || []).length * (manifest.viewports || []).length;

if (actualTests !== expectedTests) {
  console.error(`Visual structural matrix must contain ${expectedTests} tests; found ${actualTests}.`);
  process.exit(1);
}

const cli = path.join(
  process.cwd(),
  'node_modules',
  '@playwright',
  'test',
  'cli.js'
);
const result = spawnSync(
  process.execPath,
  [cli, 'test', 'tests/visual/doke-visual-regression.spec.js'],
  {
    cwd: process.cwd(),
    env: Object.assign({}, process.env, { DOKE_VISUAL_MODE: 'structural' }),
    stdio: 'inherit',
    windowsHide: true,
  }
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(Number.isInteger(result.status) ? result.status : 1);

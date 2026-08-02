#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');

const workflowPath = '.github/workflows/sched-001-c01d-canonical-runtime-reconcile-temporary.yml';
const previousWorkflow = execFileSync(
  'git',
  ['show', `HEAD^:${workflowPath}`],
  { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }
);

const startMarker = "          node <<'NODE'\n";
const endMarker = '\n          NODE\n';
const start = previousWorkflow.indexOf(startMarker);
if (start < 0) throw new Error('Previous workflow does not contain the reconciliation source start marker.');
const end = previousWorkflow.indexOf(endMarker, start + startMarker.length);
if (end < 0) throw new Error('Previous workflow does not contain the reconciliation source end marker.');

const embedded = previousWorkflow
  .slice(start + startMarker.length, end)
  .split('\n')
  .map((line) => line.startsWith('          ') ? line.slice(10) : line)
  .join('\n');

const execute = new Function('require', 'process', '__dirname', '__filename', embedded);
execute(require, process, __dirname, __filename);

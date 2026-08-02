#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');

const workflowPath = '.github/workflows/sched-001-c01d-canonical-runtime-reconcile-temporary.yml';
const gitOptions = { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 };
const startMarker = "          node <<'NODE'\n";
const endMarker = '\n          NODE\n';

execFileSync(
  'git',
  ['fetch', 'origin', 'ord/ord-001-baseline-audit', '--deepen=20'],
  { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }
);

const commits = execFileSync(
  'git',
  ['log', '--format=%H', '--', workflowPath],
  gitOptions
).trim().split(/\s+/).filter(Boolean);

let sourceWorkflow = '';
let sourceCommit = '';
for (const commit of commits) {
  let candidate = '';
  try {
    candidate = execFileSync('git', ['show', `${commit}:${workflowPath}`], gitOptions);
  } catch {
    continue;
  }
  if (candidate.includes(startMarker) && candidate.includes(endMarker)) {
    sourceWorkflow = candidate;
    sourceCommit = commit;
    break;
  }
}

if (!sourceWorkflow) {
  throw new Error('No historical workflow revision contains the canonical reconciliation source.');
}

const start = sourceWorkflow.indexOf(startMarker);
const end = sourceWorkflow.indexOf(endMarker, start + startMarker.length);
const embedded = sourceWorkflow
  .slice(start + startMarker.length, end)
  .split('\n')
  .map((line) => line.startsWith('          ') ? line.slice(10) : line)
  .join('\n');

process.stdout.write(`Using canonical reconciliation source from ${sourceCommit}.\n`);
const execute = new Function('require', 'process', '__dirname', '__filename', embedded);
execute(require, process, __dirname, __filename);

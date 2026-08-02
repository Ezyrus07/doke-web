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
let embedded = sourceWorkflow
  .slice(start + startMarker.length, end)
  .split('\n')
  .map((line) => line.startsWith('          ') ? line.slice(10) : line)
  .join('\n');

const syntaxRepairs = new Map([
  [
    "].forEach((fragment) => assert(executorSource.includes(fragment), `Canonical executor missing ${fragment}`));",
    "].forEach((fragment) => assert(executorSource.includes(fragment), 'Canonical executor missing ' + fragment));"
  ],
  [
    "].forEach((fragment) => assert(!runnerSource.includes(fragment), `Runner retains source rewriting: ${fragment}`));",
    "].forEach((fragment) => assert(!runnerSource.includes(fragment), 'Runner retains source rewriting: ' + fragment));"
  ],
  [
    "removedPreparers.forEach((file) => assert(!fs.existsSync(file), `Legacy runtime preparer still exists: ${file}`));",
    "removedPreparers.forEach((file) => assert(!fs.existsSync(file), 'Legacy runtime preparer still exists: ' + file));"
  ],
  [
    "].forEach((fragment) => assert(source.includes(fragment), `Canonical bootstrap contract missing ${fragment}`));",
    "].forEach((fragment) => assert(source.includes(fragment), 'Canonical bootstrap contract missing ' + fragment));"
  ]
]);

for (const [before, after] of syntaxRepairs) {
  const count = embedded.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one nested template repair target, found ${count}: ${before}`);
  embedded = embedded.replace(before, after);
}

process.stdout.write(`Using canonical reconciliation source from ${sourceCommit}.\n`);
const execute = new Function('require', 'process', '__dirname', '__filename', embedded);
execute(require, process, __dirname, __filename);

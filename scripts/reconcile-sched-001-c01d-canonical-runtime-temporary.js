#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { execFileSync } = require('child_process');

const workflowPath = '.github/workflows/sched-001-c01d-canonical-runtime-reconcile-temporary.yml';
const executorPath = 'scripts/execute-sched-001-c01d-authenticated-browser-read-only-canary.js';
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

let executor = fs.readFileSync(executorPath, 'utf8');
const escapedBackticks = (executor.match(/\\`/g) || []).length;
const escapedInterpolations = (executor.match(/\\\$\{/g) || []).length;
if (escapedBackticks === 0 || escapedInterpolations === 0) {
  throw new Error(
    `Expected generated executor template escapes, found backticks=${escapedBackticks}, interpolations=${escapedInterpolations}.`
  );
}
executor = executor
  .replace(/\\`/g, '`')
  .replace(/\\\$\{/g, '${');

const regexRepairs = new Map([
  [
    "page.waitForURL(/\\\\/pedidos\\\\.html(?:[?#].*)?$/",
    "page.waitForURL(/\\/pedidos\\.html(?:[?#].*)?$/"
  ],
  [
    "/supabase\\\\.co/.test(entry.url)",
    "/supabase\\.co/.test(entry.url)"
  ]
]);
for (const [before, after] of regexRepairs) {
  const count = executor.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one generated regex repair target, found ${count}: ${before}`);
  executor = executor.replace(before, after);
}

fs.writeFileSync(executorPath, executor);
execFileSync(process.execPath, ['--check', executorPath], { stdio: 'inherit' });
process.stdout.write(
  `Materialized canonical executor templates: backticks=${escapedBackticks}, interpolations=${escapedInterpolations}; regexes=2.\n`
);

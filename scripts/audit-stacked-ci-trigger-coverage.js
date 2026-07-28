#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const workflows = [
  {
    file: '.github/workflows/quality.yml',
    pullRequestBranches: ['auth/**', 'prof/**', 'cat/**'],
    pushBranches: ['cat/**']
  },
  {
    file: '.github/workflows/staging-edge-http-canary.yml',
    pullRequestBranches: ['auth/**', 'prof/**', 'cat/**'],
    pushBranches: ['prof/**', 'cat/**']
  },
  {
    file: '.github/workflows/e2e-diagnostic.yml',
    pullRequestBranches: ['auth/**', 'prof/**', 'cat/**'],
    pushBranches: ['prof/**', 'cat/**']
  }
];

function extractSection(text, key, followingKeys) {
  const escaped = followingKeys.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const pattern = new RegExp(`(?:^|\\n)  ${key}:\\s*\\n([\\s\\S]*?)(?=\\n  (?:${escaped}):|$)`);
  const match = text.match(pattern);
  return match ? match[1] : '';
}

function hasBranch(section, branch) {
  return section.includes(`'${branch}'`) || section.includes(`\"${branch}\"`) || new RegExp(`-\\s+${branch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`).test(section);
}

for (const workflow of workflows) {
  const absolute = path.join(root, workflow.file);
  assert(fs.existsSync(absolute), `Required workflow is missing: ${workflow.file}`);
  if (!fs.existsSync(absolute)) continue;

  const text = read(workflow.file);
  const pullRequest = extractSection(text, 'pull_request', ['push', 'workflow_dispatch', 'permissions']);
  const push = extractSection(text, 'push', ['workflow_dispatch', 'permissions']);

  assert(pullRequest, `${workflow.file} must define a pull_request trigger.`);
  assert(push, `${workflow.file} must define a push trigger.`);
  assert(/workflow_dispatch:\s*(?:\n|$)/.test(text), `${workflow.file} must retain workflow_dispatch.`);

  for (const branch of workflow.pullRequestBranches) {
    assert(hasBranch(pullRequest, branch), `${workflow.file} pull_request trigger must cover ${branch}.`);
  }
  for (const branch of workflow.pushBranches) {
    assert(hasBranch(push, branch), `${workflow.file} push trigger must cover ${branch}.`);
  }
}

const quality = read('.github/workflows/quality.yml');
assert(quality.includes('Blocking deterministic E2E lane'), 'Quality must retain the blocking E2E lane.');
assert(quality.includes('105 visual structural guards'), 'Quality must retain the 105 visual structural guards lane.');

if (errors.length) {
  console.error('[STACKED-CI] Trigger coverage audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[STACKED-CI] Stacked pull-request trigger coverage is valid.');
console.log('[STACKED-CI] AUTH, PROF and CAT bases are observable through PR runs.');
console.log('[STACKED-CI] CAT pushes execute Quality, Canary and Diagnostic coverage.');

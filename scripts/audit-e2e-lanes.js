const fs = require('fs');
const path = require('path');

const root = process.cwd();
const configPath = path.join(root, 'config', 'e2e-lanes.json');
const specsRoot = path.join(root, 'tests', 'e2e');

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function listSpecs(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSpecs(absolute);
    return entry.isFile() && entry.name.endsWith('.spec.js')
      ? [toPosix(path.relative(root, absolute))]
      : [];
  });
}

function fail(messages) {
  for (const message of messages) console.error(`- ${message}`);
  process.exitCode = 1;
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const activeSpecs = listSpecs(specsRoot).sort();
const errors = [];
const assignments = new Map();

for (const laneName of ['blocking', 'diagnostic']) {
  const entries = config.lanes?.[laneName];
  if (!Array.isArray(entries)) {
    errors.push(`Lane "${laneName}" must be an array.`);
    continue;
  }

  for (const entry of entries) {
    if (!entry || typeof entry.spec !== 'string') {
      errors.push(`Lane "${laneName}" contains an entry without a spec path.`);
      continue;
    }
    if (!entry.owner || !entry.reason) {
      errors.push(`${entry.spec} must declare owner and reason.`);
    }
    if (laneName === 'diagnostic' && !entry.promotionCriteria) {
      errors.push(`${entry.spec} must declare promotionCriteria.`);
    }
    const existing = assignments.get(entry.spec) || [];
    existing.push(laneName);
    assignments.set(entry.spec, existing);
  }
}

const exclusions = Array.isArray(config.exclusions) ? config.exclusions : [];
for (const exclusion of exclusions) {
  if (!exclusion?.spec || !exclusion?.owner || !exclusion?.justification) {
    errors.push('Every exclusion must declare spec, owner, and justification.');
    continue;
  }
  const existing = assignments.get(exclusion.spec) || [];
  existing.push('excluded');
  assignments.set(exclusion.spec, existing);
}

for (const spec of activeSpecs) {
  const lanes = assignments.get(spec) || [];
  if (lanes.length === 0) errors.push(`${spec} is active but unclassified.`);
  if (lanes.length > 1) errors.push(`${spec} is assigned more than once: ${lanes.join(', ')}.`);
}

for (const [spec, lanes] of assignments) {
  if (!activeSpecs.includes(spec)) {
    errors.push(`${spec} is classified as ${lanes.join(', ')} but is not an active spec.`);
  }
}

if (errors.length) {
  console.error('E2E lane partition audit failed:');
  fail(errors);
} else {
  console.log('E2E lane partition audit passed.');
  console.log(`Active specs: ${activeSpecs.length}`);
  console.log(`Blocking: ${config.lanes.blocking.length}`);
  console.log(`Diagnostic: ${config.lanes.diagnostic.length}`);
  console.log(`Excluded: ${exclusions.length}`);
}

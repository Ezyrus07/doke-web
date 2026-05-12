const fs = require('fs');
const path = require('path');

const root = process.cwd();
const reports = [
  'docs/validation/global-cycle-149-native-navigation-perception-report.json',
  'docs/validation/global-cycle-150-native-navigation-prefetch-report.json'
];
const errors = [];
const statuses = {};

reports.forEach((file) => {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) {
    errors.push(`Missing report: ${file}`);
    return;
  }
  try {
    const report = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    statuses[file] = report.status;
    if (report.status !== 'passed') errors.push(`${file} status is ${report.status}`);
  } catch (error) {
    errors.push(`Invalid report JSON: ${file}`);
  }
});

const report = {
  cycle: 'global-cycle-151-native-navigation-experience-gate',
  status: errors.length ? 'failed' : 'passed',
  checkedAt: new Date().toISOString(),
  statuses,
  errors,
  knownTradeoff: 'Full-document navigation remains active for stability; feedback and prefetch improve perceived speed without partial route swapping.'
};

const output = path.join(root, 'docs/validation/global-cycle-151-native-navigation-experience-gate-report.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');

if (errors.length) {
  console.error('[audit:native-navigation-experience-gate] failed');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[audit:native-navigation-experience-gate] passed');

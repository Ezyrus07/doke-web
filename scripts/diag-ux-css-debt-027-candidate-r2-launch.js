const fs = require('fs');

const sourcePath = 'scripts/diag-ux-css-debt-027-candidate-r2.js';
const runtimePath = '/tmp/diag-ux-css-debt-027-candidate-r2-runtime.js';
const source = fs.readFileSync(sourcePath, 'utf8');
const exactHeadGuard = "assert(cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===TARGET_SHA,'parent SHA drift');";
const ancestryGuard = "assert(cp.execFileSync('git',['merge-base','HEAD',TARGET_SHA],{encoding:'utf8'}).trim()===TARGET_SHA,'parent ancestry drift');";
if (!source.includes(exactHeadGuard)) throw new Error('R2 harness guard drift');
fs.writeFileSync(runtimePath, source.replace(exactHeadGuard, ancestryGuard), 'utf8');
require(runtimePath);

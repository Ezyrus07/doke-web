#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');

const ROOT = process.cwd();
const TARGET = 'assets/css/components/shell/mobile-app-shell.css';
const RESULT = '.diagnostics/ux-css-important-036-responsive-baseline-r4c.json';
const BASELINE = 'reports/responsive-index-baseline.json';
const PARENT = '483d49d5f59c2eb24be0169f3d7ed6aec9703679';
const PARENT_BLOB = 'af6fd982517f2bc821435e633d70237e95ee11a8';
const BLOCKERS = new Set([106,139,141,142,147,275]);
const EXPECTED_SHA256 = '8fb0e7919197559b37a2d2b3c348766cff38729792c13cfffcdcb9bada8ad097';
const EXPECTED_BLOB = '14fb64c93777d606b07c0abbf2c6532aed134cc4';
const targetPath = path.join(ROOT, TARGET);
const resultPath = path.join(ROOT, RESULT);
const baselinePath = path.join(ROOT, BASELINE);
const original = fs.readFileSync(targetPath, 'utf8');
const countImportant = s => (s.match(/!important\b/gi) || []).length;
const sha256 = s => crypto.createHash('sha256').update(Buffer.from(s)).digest('hex');
const gitBlob = s => { const b=Buffer.from(s); return crypto.createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex'); };
let idx = -1;
const candidate = original.replace(/\s*!important\b/gi, m => { idx++; return BLOCKERS.has(idx) ? m : ''; });
const out = {
  boundary: 'UX-CSS-IMPORTANT-036',
  proof: 'responsive-baseline-r4c',
  certified035Head: PARENT,
  target: TARGET,
  parentBlob: PARENT_BLOB,
  parentImportant: countImportant(original),
  blockerIndexes: [...BLOCKERS],
  candidateImportant: countImportant(candidate),
  removedMarkers: countImportant(original)-countImportant(candidate),
  candidateSha256: sha256(candidate),
  candidateGitBlob: gitBlob(candidate),
  baselineGeneratedFromParent: false,
  baselineSha256: null,
  responsiveContract: null,
  mutationAuthorityGranted: false,
  status: 'RUNNING'
};
function write(){ fs.mkdirSync(path.dirname(resultPath), {recursive:true}); fs.writeFileSync(resultPath, JSON.stringify(out,null,2)+'\n'); }
function run(cmd,args){ return cp.spawnSync(cmd,args,{cwd:ROOT,encoding:'utf8',env:process.env}); }
try {
  if (out.parentImportant !== 314) throw new Error(`parent important mismatch ${out.parentImportant}`);
  if (idx+1 !== 314) throw new Error(`marker enumeration mismatch ${idx+1}`);
  if (out.candidateImportant !== 6 || out.removedMarkers !== 308) throw new Error('narrow candidate marker counts mismatch');
  if (out.candidateSha256 !== EXPECTED_SHA256 || out.candidateGitBlob !== EXPECTED_BLOB) throw new Error('narrow candidate identity mismatch');
  const currentBlob = run('git',['hash-object',TARGET]);
  if (currentBlob.status !== 0 || currentBlob.stdout.trim() !== PARENT_BLOB) throw new Error(`parent blob mismatch ${currentBlob.stdout.trim()}`);

  fs.rmSync(baselinePath,{force:true});
  const base = run('node',['scripts/generate-responsive-index-baseline.js']);
  out.baselineGeneration = {status:base.status,stdout:base.stdout,stderr:base.stderr};
  if (base.status !== 0 || !fs.existsSync(baselinePath)) throw new Error('baseline generation failed');
  const baselineBytes = fs.readFileSync(baselinePath);
  out.baselineSha256 = crypto.createHash('sha256').update(baselineBytes).digest('hex');
  out.baselineGeneratedFromParent = true;

  fs.writeFileSync(targetPath,candidate);
  const candidateBlobCheck = run('git',['hash-object',TARGET]);
  if (candidateBlobCheck.status !== 0 || candidateBlobCheck.stdout.trim() !== EXPECTED_BLOB) throw new Error('candidate blob drift after write');

  const test = run('node',['scripts/test-responsive-contract.js']);
  out.responsiveContract = {status:test.status,stdout:test.stdout,stderr:test.stderr};
  if (test.status !== 0) throw new Error('responsive contract failed against parent baseline');
  out.status = 'PASS';
} catch (e) {
  out.status = 'FAIL';
  out.error = String(e && e.stack || e);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(targetPath,original);
  const restored = run('git',['hash-object',TARGET]);
  out.restoredParentBlob = restored.stdout.trim();
  out.restorePass = restored.status === 0 && out.restoredParentBlob === PARENT_BLOB;
  if (!out.restorePass) { out.status='FAIL'; process.exitCode=1; out.error=(out.error||'')+'; restore failed'; }
  write();
}

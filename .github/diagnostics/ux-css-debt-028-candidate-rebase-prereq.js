const fs = require('fs');
const cp = require('child_process');

const TARGET_SHA = process.env.TARGET_SHA;
const INDEX_BLOB = process.env.INDEX_BLOB;
const RESULTS_BLOB = process.env.RESULTS_BLOB;
const HARNESS_SHA = process.env.HARNESS_SHA;
const EXPECTED = process.env.EXPECTED_CANDIDATE_SHA256;
const WORKFLOW = '.github/workflows/diag-ux-css-debt-028-workers-feed-reach.yml';
const OUT = '/tmp/ux-css-debt-028-candidate.js';

for (const [k, v] of Object.entries({ TARGET_SHA, INDEX_BLOB, RESULTS_BLOB, HARNESS_SHA, EXPECTED })) {
  if (!v) throw new Error(`missing env ${k}`);
}

cp.execFileSync('git', ['fetch', '--no-tags', 'origin', HARNESS_SHA], { stdio: 'inherit' });
cp.execFileSync('git', ['cat-file', '-e', `${HARNESS_SHA}^{commit}`], { stdio: 'inherit' });
const src = cp.execFileSync('git', ['show', `${HARNESS_SHA}:${WORKFLOW}`], { encoding: 'utf8' });
const start = "          cat > /tmp/ux-css-debt-028-candidate.js <<'JS'\n";
const end = '\n          JS\n';
const a = src.indexOf(start);
const b = src.indexOf(end, a + start.length);
if (a < 0 || b < 0) throw new Error('R17 candidate heredoc not found');
const body = src.slice(a + start.length, b);
let script = body
  .split(/\r?\n/)
  .map((line) => (line.startsWith('          ') ? line.slice(10) : line))
  .join('\n') + '\n';

function one(oldText, newText, label) {
  const n = script.split(oldText).length - 1;
  if (n !== 1) throw new Error(`${label}: expected one match, got ${n}`);
  script = script.replace(oldText, newText);
}

one(
  "const TARGET_SHA='e648173f3f98966e3f5bf15413bec3c08f97aab1';",
  `const TARGET_SHA='${TARGET_SHA}';`,
  'target sha'
);
one(
  "const INDEX_BLOB='266e4323115909cf174bafb361a33b19dd7d5433';",
  `const INDEX_BLOB='${INDEX_BLOB}';`,
  'index blob'
);
one(
  "const RESULTS_BLOB='fc9833984725957829311d31037a2e3dad86c4f7';",
  `const RESULTS_BLOB='${RESULTS_BLOB}';`,
  'results blob'
);

one(
  "if(!root||!root.classList.contains('doke-worker-card'))throw new Error('ownership fixture precondition missing');\n                  root.classList.remove('doke-worker-card');",
  "if(!root)throw new Error('worker preview root missing');\n                  if(root.classList.contains('doke-worker-card'))throw new Error('certified ownership prerequisite regressed');",
  'runtime ownership precondition'
);

const fixtureMarkers = script.split('ownershipFixture=dom-only').length - 1;
if (fixtureMarkers !== 2) throw new Error(`ownership fixture marker count ${fixtureMarkers}`);
script = script.replaceAll('ownershipFixture=dom-only', 'ownershipPrerequisite=certified-parent');
one('ownershipPrerequisite=external', 'ownershipPrerequisite=certified-parent-exact', 'final ownership marker');

one(
  'const build=buildCandidate();',
  `const build=buildCandidate();assert(build.hash==='${EXPECTED}','candidate hash drift '+build.hash);`,
  'candidate hash guard'
);

one(
  "assert(cp.execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim()===TARGET,'post-audit product scope drift');",
  "const productScope=cp.execFileSync('git',['diff','--name-only','--','assets','index.html','resultados.html'],{encoding:'utf8'}).trim();assert(productScope===TARGET,`post-audit product scope drift: ${productScope}`);const finalNum=cp.execFileSync('git',['diff','--numstat','--',TARGET],{encoding:'utf8'}).trim().split(/\\s+/);assert(finalNum[0]==='0'&&finalNum[1]==='6',`post-audit target delta ${finalNum.join('/')}`);assert(cp.spawnSync('git',['diff','--quiet','--','index.html','resultados.html']).status===0,'certified prerequisite HTML drift');assert(crypto.createHash('sha256').update(fs.readFileSync(TARGET)).digest('hex')===build.hash,'post-audit target hash drift');",
  'post-audit product scope'
);

fs.writeFileSync(OUT, script);
cp.execFileSync(process.execPath, ['--check', OUT], { stdio: 'inherit' });
console.log(`HARNESS REBASE PASS|source=${HARNESS_SHA}|parent=${TARGET_SHA}|candidateHash=${EXPECTED}|ownershipFixture=removed|output=${OUT}`);

'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const source = path.resolve(__dirname, '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'doke-first-paint-'));
for (const dir of ['assets/css', 'assets/js']) {
  fs.cpSync(path.join(source, dir), path.join(fixture, dir), { recursive: true });
}
const proof = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/first-paint-context-proof.json'), 'utf8'));
for (const file of Object.keys(proof.inputs)) {
  const target = path.join(fixture, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(source, file), target);
}
const guard = path.join(fixture, 'scripts/test-first-paint-loading-contract.js');
fs.mkdirSync(path.join(fixture, 'scripts/fixtures'), { recursive: true });
fs.copyFileSync(path.join(__dirname, 'test-first-paint-loading-contract.js'), guard);
fs.copyFileSync(path.join(__dirname, 'fixtures/first-paint-context-proof.json'), path.join(fixture, 'scripts/fixtures/first-paint-context-proof.json'));
const results = [];
function check(name, exit, needle, file, update) {
  const target = file && path.join(fixture, file);
  const before = target && fs.existsSync(target) ? fs.readFileSync(target) : null;
  try {
    if (target) {
      const original = before?.toString('utf8') || '';
      const normalized = original.replace(/\r\n/g, '\n');
      const updated = update(normalized);
      assert.notEqual(updated, normalized, `${name}: mutation did not land`);
      fs.writeFileSync(target, original.includes('\r\n') ? updated.replace(/\n/g, '\r\n') : updated);
    }
    const run = spawnSync(process.execPath, [guard], { cwd: fixture, encoding: 'utf8' });
    assert.equal(run.status, exit, `${name}: ${run.stdout}${run.stderr}`);
    if (needle) assert.ok(run.stderr.includes(needle), `${name}: ${run.stderr}`);
    results.push({ name, status: 'PASS' });
  } catch (error) {
    results.push({ name, status: 'FAIL', reason: error.message });
  } finally {
    if (target && before) fs.writeFileSync(target, before);
    else if (target) fs.unlinkSync(target);
  }
}
check('Certified unchanged contexts pass', 0);
check('Unrelated Messages edit does not expire card proofs', 0, '', 'assets/js/pages/mensagens.js', text => text + '\n// Unrelated conversation change.\n');
const ad = 'assets/css/components/cards/ad-card.css';
const owner = 'assets/css/components/cards/profile-service-owner-card.css';
for (const [state, prop, value] of [
  ['loading', 'width', '900px'], ['ready', 'height', '900px'],
  ['skeleton', 'padding', '90px'], ['pending', 'position', 'fixed'],
  ['hydrated', 'display', 'none'], ['loading', 'margin', '90px'],
  ['ready', 'top', '90px'], ['skeleton', 'inset', '90px'],
  ['loading', 'grid-template-columns', '1fr 1fr'], ['ready', 'flex-basis', '900px'],
  ['skeleton', 'transform', 'translateY(90px)'], ['loading', 'overflow', 'visible']
]) {
  check(`Detect ${state} ${prop} on card`, 1, prop, 'assets/css/guard-fixture.css', () => `.doke-ad-card.is-${state} { ${prop}: ${value}; }`);
}
for (const [prop, value] of [['width', '900px'], ['height', '900px'], ['padding', '90px'], ['display', 'block'], ['position', 'relative'], ['inset', '9px']]) {
  check(`Skeleton overlay mutation ${prop}`, 1, prop, ad, text => text.replace('  content: "";\n  position: absolute;\n  inset: 0;', `  content: "";\n  position: absolute;\n  inset: 0;\n  ${prop}: ${value};`));
}
for (const [prop, value] of [['width', '900px'], ['height', '900px'], ['padding', '90px'], ['display', 'none'], ['position', 'fixed'], ['overflow', 'visible']]) {
  check(`Moderation mutation ${prop}`, 1, prop, owner, text => text.replace('.profile-service-card--owner.is-moderation-pending-review {', `.profile-service-card--owner.is-moderation-pending-review {\n  ${prop}: ${value};`));
}
check('Base containing block drift expires proof', 1, ad, ad, text => text.replace('.doke-ad-card__media {\n  position: relative;', '.doke-ad-card__media {\n  position: static;'));
check('Dependency variable drift expires proof', 1, owner, owner, text => text.replace('--doke-ad-card-min-height: 238px;', '--doke-ad-card-min-height: 900px;'));
check('Consumer DOM drift expires proof', 1, owner, 'perfil-profissional.html', text => text.replace('<body', '<body data-guard-fixture="changed"'));
check('Imported cascade drift expires proof', 1, ad, ad, text => text + '\n@import "unsafe-geometry.css";\n');
check('Unproved pseudo remains protected', 1, 'position', 'assets/css/guard-fixture.css', () => '.worker-card.is-loading::before { position: relative; width: 900px; }');
check('Exact subject in another file is not exempt', 1, 'position', 'assets/css/guard-fixture.css', () => '.doke-ad-card.is-media-skeleton .doke-ad-card__media::before { position: absolute; inset: 0; }');
check('Malformed proof fails closed', 1, ad, 'scripts/fixtures/first-paint-context-proof.json', () => '{');
check('Empty proof fails closed', 1, owner, 'scripts/fixtures/first-paint-context-proof.json', () => '{"inputs":{}}');
check('Partial proof cannot silently omit dependencies', 1, owner, 'scripts/fixtures/first-paint-context-proof.json', text => {
  const changed = JSON.parse(text);
  delete changed.inputs['assets/css/components/cards/ad-card.css'];
  return JSON.stringify(changed);
});
check('JS loading-class mutation remains protected', 1, 'JS adds/toggles', 'assets/js/guard-fixture.js', () => 'const card = document.querySelector(".doke-ad-card"); card.classList.add("is-loading");');
for (const token of ['preserveLayout', "root.dataset.loadingContract === 'preserve-layout'", "root.setAttribute('aria-busy', 'true')", "root.dataset.viewState = 'loading'"]) {
  check(`Renderer still requires ${token}`, 1, 'missing', 'assets/js/renderers/render-loading-state.js', text => text.replaceAll(token, 'removedContract'));
}
console.log(JSON.stringify({ fixture, results }, null, 2));
if (results.some(result => result.status === 'FAIL')) process.exitCode = 1;

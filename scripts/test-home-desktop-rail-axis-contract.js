const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const failures = [];

const homeShell = read('assets/css/pages/home-shell.css');
const workspaceSelector = 'body.shell-home:not(.internal-shell-page) .page__content-inner.shell-home__workspace--clean';
const workspaceBlockMatch = homeShell.match(new RegExp(`${workspaceSelector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([\\s\\S]*?)\\n\\}`));

if (!workspaceBlockMatch) {
  failures.push(`Missing workspace selector: ${workspaceSelector}`);
} else {
  const block = workspaceBlockMatch[1];
  if (!/padding-inline\s*:\s*0\s*;/.test(block)) {
    failures.push('Home desktop/tablet workspace must not add inline padding; the page rail owns the gutter.');
  }
  if (/padding-inline\s*:\s*(?:[1-9]|clamp|min|max|calc)/.test(block)) {
    failures.push('Home workspace block still contains a non-zero padding-inline declaration.');
  }
}

const pageRail = read('assets/css/layout/page-rail-authority.css');
if (!/body\[data-page\]\.has-global-header\s*>\s*\.app-shell\s*>\s*\.page\s*>\s*\.app-header/.test(pageRail)) {
  failures.push('Global header rail selector is missing from page-rail-authority.css.');
}
if (!/\.page__content-inner/.test(pageRail) || !/inline-size\s*:\s*var\(--doke-page-rail\)/.test(pageRail)) {
  failures.push('Page content rail must remain tied to --doke-page-rail.');
}

const homeRuntime = read('assets/css/pages/home-runtime.css');
if (!/home-shell\.css\?v=20260614-home-desktop-rail-axis-v1/.test(homeRuntime)) {
  failures.push('home-runtime.css must cache-bust the changed home-shell.css import.');
}

const index = read('index.html');
if (!/home-foundation\.css\?v=20260614-home-desktop-rail-axis-v1/.test(index)) {
  failures.push('index.html must cache-bust the home foundation entry after rail-axis changes.');
}

if (failures.length) {
  console.error('Home desktop rail axis contract: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Home desktop rail axis contract: PASS');

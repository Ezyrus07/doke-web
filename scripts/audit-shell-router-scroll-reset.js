const fs = require('fs');
const path = require('path');

const root = process.cwd();
const routerPath = path.join(root, 'assets/js/core/stable-shell-router.js');
const lifecyclePath = path.join(root, 'assets/js/core/navigation-lifecycle.js');
const routerSource = fs.readFileSync(routerPath, 'utf8');
const lifecycleSource = fs.readFileSync(lifecyclePath, 'utf8');

const popstateRestoreContract = /window\.addEventListener\(\s*['"]popstate['"][\s\S]{0,1000}?go\(window\.location\.href,\s*\{[\s\S]{0,600}?restoreScroll\s*:\s*true[\s\S]{0,300}?captureScroll\s*:\s*false/.test(lifecycleSource);

const checks = {
  routerDefinesResetScroll: /function\s+resetScroll\s*\(\s*\)/.test(routerSource),
  resetClearsTransientRouteState: routerSource.includes('clearTransientRouteState();'),
  resetClearsWindowPosition: /window\.scrollTo\s*\(\s*0\s*,\s*0\s*\)/.test(routerSource),
  resetClearsSurfaceOffsets: routerSource.includes('node.scrollTop = 0; node.scrollLeft = 0;'),
  transientStateClearsScrollLocks: routerSource.includes('clearRouteScrollSurfaces();')
    && routerSource.includes('clearInlineScrollLocks(document.documentElement);')
    && routerSource.includes('clearInlineScrollLocks(document.body);'),
  navigationCapturesCurrentScroll: routerSource.includes('lifecycle.scroll.capture(window.location.href);'),
  navigationResetsAfterCommit: routerSource.includes('await resetScroll();'),
  navigationSupportsRestoreAfterCommit: routerSource.includes('await restoreScrollWithFallback(url.href);'),
  restoreDelegatesToLifecycle: routerSource.includes('lifecycle.scroll.restore(href)'),
  routerOwnsShellCommit: /function\s+replaceShell\s*\(\s*nextDoc\s*,\s*path\s*\)/.test(routerSource)
    && routerSource.includes('replaceShell(nextDoc, path);'),
  lifecycleDefinesCaptureScroll: /function\s+captureScroll\s*\(/.test(lifecycleSource),
  lifecycleDefinesRestoreScroll: /function\s+restoreScroll\s*\(/.test(lifecycleSource),
  popstateRequestsScrollRestore: popstateRestoreContract
};

const failures = Object.entries(checks)
  .filter(([, passed]) => !passed)
  .map(([name]) => `current scroll authority check failed: ${name}`);

const report = {
  status: failures.length ? 'failed' : 'passed',
  authority: {
    router: 'assets/js/core/stable-shell-router.js',
    lifecycle: 'assets/js/core/navigation-lifecycle.js'
  },
  checks,
  failures
};

const outDir = path.join(root, 'docs/validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'global-cycle-167-shell-router-scroll-reset-report.json'),
  JSON.stringify(report, null, 2)
);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Current stable-shell scroll authority audit passed.');

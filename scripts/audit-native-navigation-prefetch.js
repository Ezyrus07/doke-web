const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appFile = 'assets/js/core/app.js';
const appPath = path.join(root, appFile);
const errors = [];

if (!fs.existsSync(appPath)) {
  errors.push(`${appFile} missing.`);
}

const app = fs.existsSync(appPath) ? fs.readFileSync(appPath, 'utf8') : '';

const required = [
  'nativePrefetchedViewHrefs',
  'getNativeNavigationHref',
  'prefetchNativeViewDocument',
  'data-doke-native-prefetch',
  'isNativeNavigationPrefetchEnabled',
  'prefetchNativeViewDocument(link.href)',
  'prefetchNativeViewDocument(href)'
];

required.forEach((token) => {
  if (!app.includes(token)) errors.push(`Missing native prefetch token: ${token}`);
});

if (/headers:\s*\{\s*["']X-Requested-With["']:\s*["']doke-shell["']\s*\}/.test(app)) {
  // This is still allowed for the disabled partial router code path, but native prefetch must not depend on it.
  if (!/link\.rel\s*=\s*["']prefetch["']/.test(app)) {
    errors.push('Native prefetch must use browser link rel=prefetch instead of relying on shell fetch.');
  }
}

if (!/if \(shouldBypassShellSwap\(link\.href\)\) \{\s*prefetchNativeViewDocument\(link\.href\);\s*return;\s*\}/s.test(app)) {
  errors.push('Bypassed/native links must still get safe prefetch hints.');
}

const report = {
  cycle: 'global-cycle-150-native-navigation-prefetch',
  status: errors.length ? 'failed' : 'passed',
  checkedAt: new Date().toISOString(),
  errors,
  appFile
};

const output = path.join(root, 'docs/validation/global-cycle-150-native-navigation-prefetch-report.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');

if (errors.length) {
  console.error('[audit:native-navigation-prefetch] failed');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[audit:native-navigation-prefetch] passed');

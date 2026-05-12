const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const files = {
  runtime: 'assets/js/core/runtime-config.js',
  flags: 'assets/js/core/feature-flags.js',
  app: 'assets/js/core/app.js',
  css: 'assets/css/components/navigation/native-navigation-feedback.css',
  cssManifest: 'assets/css/core/components.css',
  contract: 'docs/NATIVE-NAVIGATION-PERCEPTION-CONTRACT.md'
};

const errors = [];
const warnings = [];
Object.entries(files).forEach(([key, file]) => {
  if (!exists(file)) errors.push(`${key} missing: ${file}`);
});

const runtime = exists(files.runtime) ? read(files.runtime) : '';
const flags = exists(files.flags) ? read(files.flags) : '';
const app = exists(files.app) ? read(files.app) : '';
const css = exists(files.css) ? read(files.css) : '';
const cssManifest = exists(files.cssManifest) ? read(files.cssManifest) : '';

if (!/instantShellNavigation:\s*false/.test(runtime)) errors.push('instantShellNavigation must stay disabled by default.');
if (!/nativeNavigationFeedback:\s*true/.test(runtime)) errors.push('nativeNavigationFeedback default flag missing.');
if (!/nativeNavigationPrefetch:\s*true/.test(runtime)) errors.push('nativeNavigationPrefetch default flag missing.');
if (!/nativeNavigation:\s*['"]nativeNavigationFeedback['"]/.test(flags)) errors.push('nativeNavigation alias missing.');
if (!/navigationPrefetch:\s*['"]nativeNavigationPrefetch['"]/.test(flags)) errors.push('navigationPrefetch alias missing.');
if (!/isInstantShellNavigationEnabled/.test(app)) errors.push('app.js must gate shell swap through isInstantShellNavigationEnabled.');
if (!/if \(!isInstantShellNavigationEnabled\(\)\) return true;/.test(app)) errors.push('shouldBypassShellSwap must bypass shell swap when instant navigation is disabled.');
if (!/markNativeNavigationStart/.test(app)) errors.push('native navigation feedback starter missing.');
if (!/is-native-navigating/.test(app)) errors.push('app.js must toggle is-native-navigating.');
if (!/data-doke-navigation-state/.test(app)) errors.push('app.js must set data-doke-navigation-state.');
if (!/prefetchNativeViewDocument/.test(app)) errors.push('native document prefetch function missing.');
if (!/rel\s*=\s*["']prefetch["']/.test(app) && !/link\.rel\s*=\s*["']prefetch["']/.test(app)) errors.push('native document prefetch must use rel=prefetch.');
if (!/as\s*=\s*["']document["']/.test(app) && !/link\.as\s*=\s*["']document["']/.test(app)) warnings.push('native prefetch should mark as=document.');
if (!/native-navigation-feedback\.css/.test(cssManifest)) errors.push('core components manifest must import native-navigation-feedback.css.');
if (!/prefers-reduced-motion/.test(css)) errors.push('navigation feedback CSS must respect prefers-reduced-motion.');
if (/!important/.test(css)) errors.push('navigation feedback CSS must not introduce !important.');
if (!/is-native-navigating/.test(css)) errors.push('navigation feedback CSS must style is-native-navigating.');

const report = {
  cycle: 'global-cycle-149-native-navigation-perception',
  status: errors.length ? 'failed' : 'passed',
  checkedAt: new Date().toISOString(),
  errors,
  warnings,
  files
};

const output = path.join(root, 'docs/validation/global-cycle-149-native-navigation-perception-report.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');

if (errors.length) {
  console.error('[audit:native-navigation-perception] failed');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[audit:native-navigation-perception] passed');

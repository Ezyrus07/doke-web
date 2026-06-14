#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const routerPath = path.join(rootDir, 'assets/js/core/stable-shell-router.js');
const source = fs.readFileSync(routerPath, 'utf8');
const failures = [];

if (!source.includes("function projectRouteUrl(route)")) {
  failures.push('stable shell router must resolve routes against the current project directory');
}

if (source.includes("warm('/index.html')")) {
  failures.push('home warm-up must not request the origin-root /index.html');
}

if (!source.includes("warm(projectRouteUrl('/index.html'))")) {
  failures.push('home warm-up must use the project-aware route URL');
}

if (failures.length) {
  console.error('Stable shell project base contract: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Stable shell project base contract: PASS');

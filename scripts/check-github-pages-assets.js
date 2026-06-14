#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.resolve(__dirname, '..');
const baseUrl = process.argv[2] || 'https://ezyrus07.github.io/doke-web/';
const { getLoadedCssAssets } = require('./lib/css-assets');

function head(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'HEAD' }, (res) => {
      res.resume();
      resolve(res.statusCode || 0);
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
    req.end();
  });
}

async function main() {
  const htmlPath = path.join(root, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const cssFiles = getLoadedCssAssets(html, root);
  const jsFiles = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js[^"']*)["']/gi)].map((m) => m[1].split('?')[0]);
  const assets = [...new Set([...cssFiles, ...jsFiles])].filter((asset) => !/^(https?:)?\/\//.test(asset));

  const failures = [];
  for (const asset of assets) {
    const url = new URL(asset, baseUrl).href;
    const status = await head(url);
    if (status !== 200) failures.push({ asset, url, status });
  }

  console.log(`Checked ${assets.length} assets against ${baseUrl}`);
  if (failures.length) {
    console.error('GitHub Pages asset check: FAIL');
    failures.forEach((item) => console.error(`- ${item.status} ${item.asset}`));
    process.exit(1);
  }
  console.log('GitHub Pages asset check: PASS');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

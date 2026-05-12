const fs = require('fs');
const path = require('path');

function normalizeAsset(assetPath) {
  return assetPath.replace(/\\/g, '/').replace(/^\.\//, '').split('?')[0];
}

function collectCssImports(assetPath, root, seen = new Set()) {
  const normalized = normalizeAsset(assetPath);
  if (seen.has(normalized)) return [];
  seen.add(normalized);

  const absolute = path.join(root, normalized);
  if (!fs.existsSync(absolute)) return [normalized];

  const source = fs.readFileSync(absolute, 'utf8');
  const imports = [];
  const importPattern = /@import\s+(?:url\()?['"]?([^"')\s]+)['"]?\)?/g;
  let match;

  while ((match = importPattern.exec(source))) {
    const imported = normalizeAsset(path.join(path.dirname(normalized), match[1]));
    imports.push(...collectCssImports(imported, root, seen));
  }

  return [normalized, ...imports];
}

function extractAttribute(tag, attributeName) {
  const pattern = new RegExp(`${attributeName}\\s*=\\s*(["'])(.*?)\\1`, 'i');
  const match = tag.match(pattern);
  return match ? match[2] : '';
}

function getLoadedCssAssets(html, root = process.cwd()) {
  const assets = [];
  const linkPattern = /<link\b[^>]*>/gi;
  let match;

  while ((match = linkPattern.exec(html))) {
    const tag = match[0];
    const rel = extractAttribute(tag, 'rel').toLowerCase();
    const href = extractAttribute(tag, 'href');

    if (!href) continue;
    if (!rel.split(/\s+/).includes('stylesheet')) continue;

    assets.push(...collectCssImports(href, root));
  }

  return assets;
}

module.exports = {
  getLoadedCssAssets,
};

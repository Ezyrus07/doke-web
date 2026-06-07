#!/usr/bin/env node
/**
 * Doke Component Contract Audit
 * Scans CSS pages for selectors that redefine shared component anatomy.
 * This script is read-only and produces a JSON report.
 */

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const cssRoot = path.join(root, "assets", "css");
const outDir = path.join(root, "reports");
const outFile = path.join(outDir, "component-contract-audit.json");

const groups = {
  "ad/service cards": [".doke-ad-card", ".doke-ad-card__", ".service-card", ".service-card__"],
  "publication cards": [".publication-card", ".publication-card__"],
  "worker/video cards": [".video-card", ".video-card__", ".worker-card", ".short-videos", ".profile-workers-rail"],
  "profile/toolbars": [".profile-services-toolbar", ".profile-services-toolbar__"],
  "tabs": [".profile-tabs", ".profile-tab"],
  "avatars": [".profile-avatar", ".profile-avatar-frame", ".doke-avatar"]
};

const riskyProps = [
  "width", "min-width", "max-width",
  "height", "min-height", "max-height",
  "aspect-ratio",
  "padding", "padding-inline", "padding-block",
  "border", "border-radius",
  "box-shadow", "font-size", "line-height",
  "display", "grid-template-columns", "flex", "flex-basis"
];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.isFile() && entry.name.endsWith(".css")) acc.push(full);
  }
  return acc;
}

function lineOf(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

const results = [];
const ruleRe = /([^{}]+)\{([^{}]+)\}/gs;

for (const file of walk(cssRoot)) {
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  if (!rel.includes("/pages/")) continue;

  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(ruleRe)) {
    const selector = match[1].trim().replace(/\s+/g, " ");
    const body = match[2];
    const hitGroups = Object.entries(groups)
      .filter(([, selectors]) => selectors.some((sel) => selector.includes(sel)))
      .map(([name]) => name);

    if (!hitGroups.length) continue;

    const props = riskyProps.filter((prop) => new RegExp(`(^|[;\\s])${prop}\\s*:`).test(body));
    const importantCount = (body.match(/!important/g) || []).length;

    if (props.length || importantCount) {
      results.push({
        file: rel,
        line: lineOf(text, match.index),
        groups: hitGroups,
        selector,
        props,
        importantCount
      });
    }
  }
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
console.log(`Component contract audit: ${results.length} suspicious page-level rules found.`);
console.log(`Report written to ${path.relative(root, outFile)}`);

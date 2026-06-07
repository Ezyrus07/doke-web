#!/usr/bin/env node
/**
 * Doke Component Contract Boundary Audit
 *
 * Read-only audit.
 * Validates whether CSS under assets/css/pages is redefining anatomy of shared components.
 *
 * Usage:
 *   node tools/audits/component-contract-boundaries.js
 */

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const configPath = path.join(root, "config", "component-contract-map.json");
const cssRoot = path.join(root, "assets", "css");
const reportsDir = path.join(root, "reports");
const reportPath = path.join(reportsDir, "component-contract-boundaries.json");

if (!fs.existsSync(configPath)) {
  console.error("Missing config/component-contract-map.json");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

const selectorMap = {
  "publication-card": [".publication-card", ".publication-card__"],
  "ad-service-card": [".doke-ad-card", ".doke-ad-card__", ".service-card", ".service-card__"],
  "worker-video-card": [".video-card", ".video-card__", ".worker-card", ".worker-card__", ".short-videos"],
  "section-toolbar": [".profile-services-toolbar", ".profile-services-toolbar__"],
  "tabs": [".profile-tabs", ".profile-tab"],
  "avatars": [".profile-avatar", ".profile-avatar-frame", ".doke-avatar"],
  "buttons": [".doke-btn", ".btn", ".profile-action", ".profile-services-toolbar__action"]
};

const anatomyProps = [
  "height", "min-height", "max-height",
  "aspect-ratio",
  "padding", "padding-inline", "padding-block",
  "border", "border-radius",
  "box-shadow",
  "font-size", "line-height", "font-weight",
  "object-fit",
  "background",
  "color"
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

function propExists(body, prop) {
  return new RegExp(`(^|[;\\s])${prop}\\s*:`, "m").test(body);
}

const ruleRe = /([^{}]+)\{([^{}]+)\}/gs;
const violations = [];

for (const file of walk(cssRoot)) {
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  if (!rel.includes("/pages/")) continue;

  const text = fs.readFileSync(file, "utf8");

  for (const match of text.matchAll(ruleRe)) {
    const selector = match[1].trim().replace(/\s+/g, " ");
    const body = match[2];

    for (const component of config.shared_components) {
      const selectors = selectorMap[component.id] || [];
      if (!selectors.some((item) => selector.includes(item))) continue;

      const props = anatomyProps.filter((prop) => propExists(body, prop));
      const importantCount = (body.match(/!important/g) || []).length;

      if (props.length || importantCount) {
        violations.push({
          file: rel,
          line: lineOf(text, match.index),
          component: component.id,
          owner: component.owner,
          selector,
          props,
          importantCount,
          recommendation: "Move anatomy to component owner or reduce page rule to layout-only grid/gap/rail/overflow."
        });
      }
    }
  }
}

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  principle: config.principle,
  violations
}, null, 2));

console.log(`Component boundary audit finished.`);
console.log(`Violations found: ${violations.length}`);
console.log(`Report: ${path.relative(root, reportPath)}`);

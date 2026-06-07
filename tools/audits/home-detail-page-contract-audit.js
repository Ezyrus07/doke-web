#!/usr/bin/env node
/**
 * Doke Home/Detail Page Contract Audit
 * Read-only check: flags shared component anatomy inside home/index and detalhe-anuncio page CSS.
 */

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const cssRoot = path.join(root, "assets", "css");

const scopeExact = new Set([
  "assets/css/pages/home-runtime.css",
  "assets/css/pages/home-sections.css",
  "assets/css/pages/home-tablet-v2.css",
  "assets/css/pages/detalhe-anuncio.css"
]);

const scopeContains = [
  "assets/css/pages/home/",
  "assets/css/pages/home-refresh/",
  "assets/css/pages/detalhe-anuncio/"
];

const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".css")) {
      const rel = path.relative(root, full).replaceAll(path.sep, "/");
      if (scopeExact.has(rel) || scopeContains.some((part) => rel.includes(part))) files.push(full);
    }
  }
}
walk(cssRoot);

const groups = {
  "publication-card": [".publication-card", ".publication-card__"],
  "ad-service-card": [".doke-ad-card", ".doke-ad-card__", ".service-card", ".service-card__"],
  "worker-video-card": [".video-card", ".video-card__", ".worker-card", ".worker-card__", ".short-video-card", ".short-video-card__"],
  "buttons-actions": [".doke-btn", ".doke-button", ".profile-action", ".profile-services-toolbar__action", ".app-action", ".section-action", ".card-action", ".primary-action", ".secondary-action"],
  "toolbars": [".profile-services-toolbar", ".profile-services-toolbar__", ".section-toolbar", ".section-toolbar__", ".doke-toolbar", ".doke-toolbar__", ".toolbar-actions", ".toolbar-action", ".profile-publications-toolbar", ".profile-workers-toolbar"],
  "tabs": [".profile-tabs", ".profile-tab"],
  "avatar-metrics": [".profile-avatar", ".profile-avatar-frame", ".profile-avatar-column", ".doke-avatar", ".avatar", ".profile-stats", ".profile-stats-row", ".profile-stat", ".profile-metric", ".profile-metrics"]
};

const forbiddenProps = [
  "height", "min-height", "max-height", "width", "min-width", "max-width",
  "aspect-ratio", "padding", "padding-inline", "padding-block", "border",
  "border-radius", "box-shadow", "font-size", "line-height", "font-weight",
  "background", "background-color", "color", "object-fit", "display",
  "align-items", "justify-content", "gap", "flex", "grid-template-columns",
  "overflow", "position", "transform"
];

const ruleRe = /([^{}]+)\{([^{}]+)\}/gs;

function lineOf(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function hitsGroup(selector) {
  return Object.entries(groups)
    .filter(([, selectors]) => selectors.some((item) => selector.includes(item)))
    .map(([name]) => name);
}

function hasForbidden(body) {
  if (body.includes("!important")) return true;
  return forbiddenProps.some((prop) => new RegExp(`(^|[;\\s])${prop}\\s*:`, "m").test(body));
}

const violations = [];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file).replaceAll(path.sep, "/");

  for (const match of text.matchAll(ruleRe)) {
    const selector = match[1].trim().replace(/\s+/g, " ");
    const body = match[2];
    const componentGroups = hitsGroup(selector);

    if (componentGroups.length && hasForbidden(body)) {
      violations.push({
        file: rel,
        line: lineOf(text, match.index),
        groups: componentGroups,
        selector,
        importantCount: (body.match(/!important/g) || []).length
      });
    }
  }
}

const reportsDir = path.join(root, "reports");
fs.mkdirSync(reportsDir, { recursive: true });
const output = path.join(reportsDir, "home-detail-page-contract-audit.json");
fs.writeFileSync(output, JSON.stringify({ generatedAt: new Date().toISOString(), violations }, null, 2));

console.log(`Home/detail page contract audit: ${violations.length} violations found.`);
console.log(`Report: ${path.relative(root, output)}`);

if (process.env.DOKE_AUDIT_STRICT === "1" && violations.length) {
  process.exit(1);
}

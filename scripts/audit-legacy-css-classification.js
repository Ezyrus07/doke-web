#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const suspectTerms = ['stage','final','hotfix','fix','refinement','parity','normalization','redesign','reference','legacy','override'];
const blockUntilBaseline = ['perfil','mensagens','comunidade-interna','channel','desktop-redesign','reference-hero','mobile-public-profile'];
const migrateFirst = ['home','search-results','results','pedidos','service','card','shell','contract','normalization'];
const compatibilityKeep = ['contract','shell','bridge','runtime','responsive','boundary'];

function walk(dir, out=[]) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}
function rel(p){return path.relative(root,p).replace(/\\/g,'/');}
function read(p){return fs.readFileSync(p,'utf8');}
function count(re, s){return (s.match(re)||[]).length;}
function hasAny(s, arr){s=s.toLowerCase(); return arr.some(x=>s.includes(x));}

const cssFiles = walk(path.join(root,'assets','css')).filter(f=>f.endsWith('.css'));
const htmlFiles = walk(root).filter(f=>f.endsWith('.html') && !rel(f).startsWith('node_modules/'));
const htmlUsage = {};
for (const html of htmlFiles) {
  const htmlText = read(html);
  const hrefs = [...htmlText.matchAll(/<link\b[^>]*href=["']([^"']+\.css)["'][^>]*>/gi)].map(m=>m[1].split('?')[0].replace(/^\.\//,''));
  for (const href of hrefs) {
    const normalized = href.replace(/^\/+/,'');
    htmlUsage[normalized] ||= [];
    htmlUsage[normalized].push(rel(html));
  }
}

const records = [];
for (const file of cssFiles) {
  const r = rel(file);
  const lower = r.toLowerCase();
  const matchedTerms = suspectTerms.filter(t=>lower.includes(t));
  if (!matchedTerms.length) continue;
  const text = read(file);
  const usage = htmlUsage[r] || [];
  const important = count(/!important/g, text);
  const selectors = count(/\{[^}]*\}/g, text);
  const bytes = Buffer.byteLength(text);
  let classification = 'review-before-change';
  let reason = 'Suspect name; needs inspection before removal.';
  if (usage.length === 0 && important === 0 && bytes < 20000) {
    classification = 'candidate-simple-validation';
    reason = 'Not directly linked by HTML, no !important, small file; validate dependency/import graph before removal.';
  } else if (hasAny(lower, blockUntilBaseline)) {
    classification = 'block-until-visual-baseline';
    reason = 'Touches high-risk page/contract; needs screenshot baseline before removal or merge.';
  } else if (hasAny(lower, migrateFirst)) {
    classification = 'migrate-before-removal';
    reason = 'Likely contains active rules for page/component; migrate responsibilities before removing.';
  } else if (hasAny(lower, compatibilityKeep)) {
    classification = 'keep-for-compatibility-now';
    reason = 'Appears to be compatibility/contract layer; keep until callers are migrated.';
  }
  if (important > 500 || bytes > 70000) {
    classification = 'block-until-visual-baseline';
    reason = 'Large or high-specificity CSS with many !important declarations; high regression risk.';
  }
  records.push({path:r, matchedTerms, classification, reason, usedByHtml:usage, bytes, important, selectors});
}
records.sort((a,b)=>{
  const order = {'block-until-visual-baseline':0,'migrate-before-removal':1,'keep-for-compatibility-now':2,'review-before-change':3,'candidate-simple-validation':4};
  return (order[a.classification]-order[b.classification]) || (b.important-a.important) || (b.bytes-a.bytes);
});
const summary = records.reduce((acc,r)=>{acc[r.classification]=(acc[r.classification]||0)+1; return acc;},{});
const out = {generatedAt:new Date().toISOString(), totalCss:cssFiles.length, totalHtml:htmlFiles.length, suspectCss:records.length, summary, records};
fs.mkdirSync(path.join(root,'docs','validation'),{recursive:true});
fs.writeFileSync(path.join(root,'docs','validation','global-cycle-47-legacy-css-classification.json'), JSON.stringify(out,null,2));
if (records.length === 0) process.exit(0);
console.log(`Legacy CSS classification audit completed: ${records.length} suspicious CSS files classified.`);
console.log(summary);

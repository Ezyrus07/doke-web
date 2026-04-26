const fs = require('fs');
const path = require('path');
const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html')).sort();
const cssLinkMap = {};
const surfaceFinalRefs = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const links = [...html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)["'][^>]*>/gi)].map(m => m[1]);
  cssLinkMap[file] = links;
  if (links.some(h => h.includes('surface-contract-final.css'))) surfaceFinalRefs.push(file);
}
const cssFiles = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (p.endsWith('.css')) cssFiles.push(p);
  }
}
walk('assets/css');
const conflictTerms = /(modal|popover|drawer|dropdown|card|btn|button|close|input|select|textarea|filter|lightbox)/i;
const hotFiles = cssFiles.map(file => {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  return { file, matches: lines.filter(l => conflictTerms.test(l)).length, lines: lines.length };
}).filter(x => x.matches).sort((a,b) => b.matches - a.matches);
const canonical = fs.readFileSync('assets/css/components/ui-surface-system.css','utf8');
const checks = {
  canonicalLoadedLastInMainHtml: htmlFiles.filter(f => !['teste.html'].includes(f)).every(f => {
    const links = cssLinkMap[f];
    if (!links.includes('assets/css/components/ui-surface-system.css?v=20260426-ui-surface-system')) return true;
    return links[links.length - 1].includes('ui-surface-system.css');
  }),
  noSurfaceFinalHtmlRefs: surfaceFinalRefs.length === 0,
  noGenericCardInSurfaceContract: !/\.card(?![-_a-zA-Z0-9])/.test(canonical),
  hasSurfaceContract: /Surface contract/.test(canonical),
  hasButtonContract: /Buttons and form controls/.test(canonical),
  hasCardContract: /Reusable page cards/.test(canonical),
  hasMobileContract: /Responsive contract/.test(canonical),
  surfaceContractLineCount: canonical.split(/\r?\n/).length,
};
fs.mkdirSync('docs/validation', { recursive: true });
fs.writeFileSync('docs/validation/css-contract-static-report.json', JSON.stringify({ cssLinkMap, checks, hotFiles: hotFiles.slice(0,40) }, null, 2));
console.log(JSON.stringify(checks, null, 2));
console.log('\nTop conflict files:');
for (const x of hotFiles.slice(0,15)) console.log(`${x.matches}\t${x.lines}\t${x.file}`);
process.exit(Object.values(checks).some(v => v === false) ? 1 : 0);

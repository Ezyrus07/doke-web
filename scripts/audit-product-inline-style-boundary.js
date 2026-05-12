const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT = path.join(ROOT, 'docs/validation/global-cycle-101-product-inline-style-boundary-report.json');
const PAGES = ['perfil.html', 'pedidos.html', 'carteira.html'];
const REQUIRED = {
  'perfil.html': ['data-progress-value="20"'],
  'pedidos.html': ['data-progress-value="52"', 'data-progress-value="100"'],
  'carteira.html': ['data-progress-value="52"', 'data-progress-value="28"', 'data-progress-value="20"'],
};

function lineOf(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

const pageReports = PAGES.map((file) => {
  const filePath = path.join(ROOT, file);
  const text = fs.readFileSync(filePath, 'utf8');
  const inlineMatches = [...text.matchAll(/\sstyle\s*=\s*"[^"]*"/g)].map((match) => ({
    line: lineOf(text, match.index),
    value: match[0].trim(),
  }));
  const missingRequiredHooks = REQUIRED[file].filter((token) => !text.includes(token));
  return {
    file,
    inlineStyleCount: inlineMatches.length,
    inlineStyles: inlineMatches,
    requiredProgressTokens: REQUIRED[file],
    missingRequiredHooks,
    status: inlineMatches.length === 0 && missingRequiredHooks.length === 0 ? 'passed' : 'failed',
  };
});

const cssContracts = [
  'assets/css/pages/perfil-budget-modal/quote-flow.css',
  'assets/css/components/cards/card-system.css',
  'assets/css/pages/carteira.css',
].map((file) => {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const tokenCount = (text.match(/data-progress-value/g) || []).length;
  return { file, tokenCount, status: tokenCount > 0 ? 'passed' : 'failed' };
});

const report = {
  cycle: 101,
  title: 'Product inline style boundary',
  goal: 'Remove inline width styles from selected product pages without changing layout intent.',
  visualContract: 'preserved-no-redesign',
  pages: pageReports,
  cssContracts,
  summary: {
    pageCount: pageReports.length,
    inlineStyleCount: pageReports.reduce((sum, page) => sum + page.inlineStyleCount, 0),
    failedPages: pageReports.filter((page) => page.status !== 'passed').map((page) => page.file),
    failedCssContracts: cssContracts.filter((item) => item.status !== 'passed').map((item) => item.file),
  },
};
report.status = report.summary.failedPages.length === 0 && report.summary.failedCssContracts.length === 0 ? 'passed' : 'failed';
fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
console.log(`[global-cycle-101] inline style boundary: ${report.status}`);
if (report.status !== 'passed') process.exit(1);

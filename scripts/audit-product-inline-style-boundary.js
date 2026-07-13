const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT = path.join(ROOT, 'docs/validation/global-cycle-101-product-inline-style-boundary-report.json');
const HTML_FILES = [
  'perfil.html',
  'pedidos.html',
  'carteira.html',
  'anunciar-servico.html',
  'tornar-profissional.html',
  'verificacao-profissional.html',
  'orcamento.html',
];

const FLOW_PAGE_INITIAL_PROGRESS = Object.freeze({
  'anunciar-servico.html': 25,
  'orcamento.html': 25,
});

const FLOW_PAGES = Object.keys(FLOW_PAGE_INITIAL_PROGRESS);

const FLOW_SCRIPTS = [
  'assets/js/pages/anunciar-servico.js',
  'assets/js/pages/orcamento.js',
];

const CSS_CONTRACTS = [
  {
    file: 'assets/css/components/forms/form-page-top-contract.css',
    requiredTokens: [
      'data-step-progress-value="25"',
      'data-step-progress-value="50"',
      'data-step-progress-value="75"',
      'data-step-progress-value="100"',
    ],
  },
  {
    file: 'assets/css/components/cards/card-system.css',
    requiredTokens: [
      'data-progress-value="52"',
      'data-progress-value="100"',
    ],
  },
  {
    file: 'assets/css/pages/carteira.css',
    requiredTokens: [
      'wallet-progress-meter',
    ],
  },
];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function lineOf(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function findInlineStyles(text) {
  return [...text.matchAll(/\sstyle\s*=\s*"[^"]*"/g)].map((match) => ({
    line: lineOf(text, match.index),
    value: match[0].trim(),
  }));
}

const pageReports = HTML_FILES.map((file) => {
  const text = read(file);
  const inlineStyles = findInlineStyles(text);
  const initialProgress = FLOW_PAGE_INITIAL_PROGRESS[file];
  const requiredProgressTokens = initialProgress ? ['data-step-progress-fill', `data-step-progress-value="${initialProgress}"`] : [];
  const missingRequiredHooks = requiredProgressTokens.filter((token) => !text.includes(token));
  return {
    file,
    inlineStyleCount: inlineStyles.length,
    inlineStyles,
    requiredProgressTokens,
    missingRequiredHooks,
    status: inlineStyles.length === 0 && missingRequiredHooks.length === 0 ? 'passed' : 'failed',
  };
});

const scriptReports = FLOW_SCRIPTS.map((file) => {
  const text = read(file);
  const forbiddenPatterns = [
    'progressFill.style.width',
    '.style.width =',
  ].filter((token) => text.includes(token));
  const requiredTokens = ['dataset.stepProgressValue'];
  const missingRequiredHooks = requiredTokens.filter((token) => !text.includes(token));
  return {
    file,
    forbiddenPatterns,
    requiredTokens,
    missingRequiredHooks,
    status: forbiddenPatterns.length === 0 && missingRequiredHooks.length === 0 ? 'passed' : 'failed',
  };
});

const cssContracts = CSS_CONTRACTS.map((contract) => {
  if (!exists(contract.file)) {
    return {
      file: contract.file,
      exists: false,
      requiredTokens: contract.requiredTokens,
      missingTokens: contract.requiredTokens,
      status: 'failed',
    };
  }
  const text = read(contract.file);
  const missingTokens = contract.requiredTokens.filter((token) => !text.includes(token));
  return {
    file: contract.file,
    exists: true,
    requiredTokens: contract.requiredTokens,
    missingTokens,
    status: missingTokens.length === 0 ? 'passed' : 'failed',
  };
});

const report = {
  cycle: 101,
  title: 'Product inline style boundary',
  goal: 'Keep product pages free of HTML inline styles and keep flow progress controlled by data attributes instead of JS style.width writes.',
  visualContract: 'preserved-no-redesign',
  pages: pageReports,
  scripts: scriptReports,
  cssContracts,
};

report.summary = {
  pageCount: pageReports.length,
  inlineStyleCount: pageReports.reduce((sum, page) => sum + page.inlineStyleCount, 0),
  failedPages: pageReports.filter((page) => page.status !== 'passed').map((page) => page.file),
  failedScripts: scriptReports.filter((item) => item.status !== 'passed').map((item) => item.file),
  failedCssContracts: cssContracts.filter((item) => item.status !== 'passed').map((item) => item.file),
};

report.status = report.summary.failedPages.length === 0
  && report.summary.failedScripts.length === 0
  && report.summary.failedCssContracts.length === 0
  ? 'passed'
  : 'failed';

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
console.log(`[global-cycle-101] inline style boundary: ${report.status}`);
if (report.status !== 'passed') process.exit(1);

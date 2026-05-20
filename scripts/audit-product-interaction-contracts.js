#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = 'docs/validation/global-cycle-87-product-interaction-contracts-report.json';

const contracts = {
  'mensagens.html': {
    pageRoot: ['data-messages-page'],
    requiredHooks: ['data-thread-body', 'data-messages-composer', 'data-messages-composer-input'],
    interactionGroups: {
      search: ['data-messages-search-form', 'data-messages-search-input'],
      filters: ['data-messages-filter-toggle', 'data-messages-filter'],
      threadMenus: ['data-thread-more-toggle', 'data-thread-more-menu']
    }
  },
  'comunidade-interna.html': {
    pageRoot: ['data-community-room'],
    requiredHooks: ['data-community-room-messages', 'data-community-room-form', 'data-community-room-input'],
    interactionGroups: {
      search: ['data-community-search-toggle', 'data-community-search-form'],
      members: ['data-community-members-toggle', 'data-community-members-panel'],
      contextPanels: ['data-community-room-sidebar', 'data-community-summary-region']
    }
  },
  'pagamento-profissional.html': {
    pageRoot: ['data-payment-page'],
    requiredHooks: ['data-payment-page'],
    interactionGroups: {
      paymentMethods: ['data-payment-method', 'data-payment-method-option'],
      paymentSubmit: ['data-payment-submit', 'data-pay-submit']
    },
    allowMissingGroups: ['paymentMethods', 'paymentSubmit']
  },
  'avaliacao.html': {
    pageRoot: ['data-review-page'],
    requiredHooks: ['data-review-page', 'data-review-star', 'data-review-submit'],
    interactionGroups: {
      rating: ['data-review-star'],
      criteria: ['data-competency'],
      notes: ['data-review-note']
    }
  }
};

const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));
const hasAny = (html, needles) => needles.some((needle) => html.includes(needle));
const present = (html, needles) => needles.filter((needle) => html.includes(needle));

const pages = Object.entries(contracts).map(([page, contract]) => {
  const html = exists(page) ? read(page) : '';
  const requiredMissing = contract.requiredHooks.filter((hook) => !html.includes(hook));
  const rootPresent = hasAny(html, contract.pageRoot);
  const groups = Object.fromEntries(Object.entries(contract.interactionGroups || {}).map(([groupName, hooks]) => {
    const matches = present(html, hooks);
    const allowedMissing = (contract.allowMissingGroups || []).includes(groupName);
    return [groupName, {
      hooks,
      present: matches,
      status: matches.length > 0 ? 'present' : (allowedMissing ? 'missing-allowed-provisional-layout' : 'missing')
    }];
  }));
  const missingGroups = Object.values(groups).filter((group) => group.status === 'missing').length;

  return {
    page,
    exists: exists(page),
    rootPresent,
    requiredHooks: contract.requiredHooks,
    requiredMissing,
    groups,
    visualContract: 'provisional-layout-preserved',
    status: exists(page) && rootPresent && requiredMissing.length === 0 && missingGroups === 0 ? 'passed' : 'failed'
  };
});

const summary = {
  pageCount: pages.length,
  passedPages: pages.filter((page) => page.status === 'passed').length,
  failedPages: pages.filter((page) => page.status !== 'passed').length,
  provisionalLayoutPreserved: true
};

const report = {
  cycle: 87,
  name: 'product-interaction-contracts',
  generatedAt: new Date().toISOString(),
  scope: {
    purpose: 'Minimum interaction-surface contracts for product pages without freezing provisional HTML/CSS.',
    visualChanges: false
  },
  summary,
  pages
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);

if (summary.failedPages > 0) {
  console.error(`[cycle-87] Interaction contract failed for ${summary.failedPages} page(s).`);
  process.exit(1);
}

console.log(`[cycle-87] Interaction contracts passed for ${summary.passedPages}/${summary.pageCount} pages.`);

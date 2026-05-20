#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pages = [
  {
    file: 'mensagens.html',
    key: 'mensagens',
    expected: {
      roots: ['data-messages-page', 'data-messages-thread'],
      lists: ['data-messages-orders-list', 'data-messages-contacts-list'],
      items: ['data-message-id'],
      states: ['data-messages-empty'],
      inputs: ['data-messages-search-input']
    },
    futureResources: ['conversations', 'messages', 'orders', 'contacts', 'attachments', 'presence']
  },
  {
    file: 'comunidade.html',
    key: 'comunidade',
    expected: {
      roots: ['data-community-page', 'data-community-root', 'data-page="comunidade"'],
      lists: ['data-community-list', 'data-community-grid', 'data-community-feed'],
      items: ['data-community-card', 'data-community-id'],
      states: ['data-community-empty', 'data-list-empty'],
      inputs: ['data-community-search', 'data-community-filter']
    },
    futureResources: ['communities', 'communityHighlights', 'rankings', 'filters', 'joinRequests']
  }
];

function read(file) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, 'utf8');
}

function countMatches(content, pattern) {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'g');
  return (content.match(re) || []).length;
}

function getAssets(content, type) {
  if (type === 'css') {
    return [...content.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>|<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi)]
      .map((m) => (m[1] || m[2] || '').split('?')[0])
      .filter(Boolean);
  }
  return [...content.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)]
    .map((m) => m[1].split('?')[0])
    .filter(Boolean);
}

function findMissingAssets(assets) {
  return assets.filter((asset) => !/^https?:\/\//.test(asset) && !fs.existsSync(path.join(root, asset)));
}

const report = {
  generatedAt: new Date().toISOString(),
  cycle: 'global-39-communication-data-readiness-map',
  pages: [],
  summary: {
    auditedPages: pages.length,
    blockingIssues: 0,
    totalFindings: 0
  }
};

for (const page of pages) {
  const content = read(page.file);
  const pageReport = {
    file: page.file,
    key: page.key,
    exists: Boolean(content),
    futureResources: page.futureResources,
    cssImports: 0,
    jsImports: 0,
    missingAssets: [],
    existingHooks: {},
    missingHookGroups: [],
    findings: [],
    recommendation: ''
  };

  if (!content) {
    pageReport.findings.push({ severity: 'high', message: 'HTML não encontrado.' });
    report.summary.blockingIssues += 1;
    report.pages.push(pageReport);
    continue;
  }

  const css = getAssets(content, 'css');
  const js = getAssets(content, 'js');
  pageReport.cssImports = css.length;
  pageReport.jsImports = js.length;
  pageReport.missingAssets = [...findMissingAssets(css), ...findMissingAssets(js)];
  if (pageReport.missingAssets.length) {
    pageReport.findings.push({ severity: 'high', message: `Imports ausentes: ${pageReport.missingAssets.join(', ')}` });
    report.summary.blockingIssues += pageReport.missingAssets.length;
  }

  for (const [group, hooks] of Object.entries(page.expected)) {
    pageReport.existingHooks[group] = hooks
      .map((hook) => ({ hook, count: countMatches(content, hook) }))
      .filter((entry) => entry.count > 0);
    if (!pageReport.existingHooks[group].length) {
      pageReport.missingHookGroups.push(group);
    }
  }

  if (pageReport.cssImports > 35) {
    pageReport.findings.push({ severity: 'medium', message: `Muitos CSS carregados (${pageReport.cssImports}). Precisa de limpeza controlada depois.` });
  }
  if (pageReport.jsImports > 30) {
    pageReport.findings.push({ severity: 'medium', message: `Muitos JS carregados (${pageReport.jsImports}). Precisa mapear ownership antes de integração.` });
  }
  if (pageReport.missingHookGroups.length) {
    pageReport.findings.push({ severity: 'medium', message: `Grupos de hooks ausentes/insuficientes: ${pageReport.missingHookGroups.join(', ')}.` });
  }

  pageReport.recommendation = page.key === 'mensagens'
    ? 'Não alterar visual agora. Primeiro estabilizar contrato de conversations/messages: lista, thread, composer, anexos e presença.'
    : page.key === 'comunidade'
      ? 'Adicionar hooks mínimos de descoberta de comunidades antes de qualquer redesign: lista, cards, ranking, busca/filtro e entrar por código.'
      : 'Mapear canais, membros, mensagens/posts e composer antes de mexer em layout; alto risco de regressão por similaridade com mensagens.';

  report.summary.totalFindings += pageReport.findings.length;
  report.pages.push(pageReport);
}

const outDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'global-cycle-39-communication-data-readiness-report.json'), JSON.stringify(report, null, 2));

if (report.summary.blockingIssues > 0) {
  console.error(`Communication data-readiness audit found ${report.summary.blockingIssues} blocking issue(s).`);
  process.exit(1);
}

console.log('Communication data-readiness map audit passed.');
console.log(`${report.summary.auditedPages} pages mapped, ${report.summary.totalFindings} non-blocking finding(s).`);

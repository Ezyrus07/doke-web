#!/usr/bin/env node
/*
 * Doke global script order audit.
 *
 * Purpose: protect the JS/data-ready loading chain before deeper data integration.
 * This audit is intentionally conservative: it blocks only unsafe ordering or missing
 * files in pages that already use the controller/service pipeline. Pages still in
 * transition are reported as notes instead of being auto-rewritten.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const HTML_DIRS = ['.'];
const REPORT_PATH = path.join(ROOT, 'docs/validation/global-cycle-42-script-order-report.json');

const PAGE_CONTROLLER_BY_HTML = {
  'index.html': 'assets/js/controllers/index-controller.js',
  'resultados.html': 'assets/js/controllers/resultados-controller.js',
  'perfil.html': 'assets/js/controllers/perfil-controller.js',
  'pedidos.html': 'assets/js/controllers/pedidos-controller.js',
  'mensagens.html': 'assets/js/controllers/mensagens-controller.js',
  'comunidade.html': 'assets/js/controllers/comunidade-controller.js',
  'notificacoes.html': 'assets/js/controllers/notificacoes-controller.js',
  'carteira.html': 'assets/js/controllers/wallet-controller.js',
  'configuracoes.html': 'assets/js/controllers/configuracoes-controller.js'
};

const FOUNDATIONAL_ORDER = [
  'assets/js/controllers/controller-data.js',
  'assets/js/core/dom.js',
  'assets/js/core/events.js',
  'assets/js/core/view-state.js',
  'assets/js/core/page-bootstrap.js',
  'assets/js/controllers/page-controller-registry.js'
];

const SERVICE_ORDER = [
  'assets/js/services/mock-data-service.js',
  'assets/js/services/profile-service.js',
  'assets/js/services/search-service.js',
  'assets/js/services/order-service.js',
  'assets/js/services/message-service.js',
  'assets/js/services/community-service.js',
  'assets/js/services/notification-service.js',
  'assets/js/services/wallet-service.js',
  'assets/js/services/domain-data-service.js'
];

const DATA_READY_CHAIN = [
  'assets/js/services/mock-data-boundary.js',
  'assets/js/services/repository-boundary.js',
  'assets/js/services/mock-repository-provider.js',
  'assets/js/services/page-data-orchestrator.js',
  'assets/js/core/list-state.js'
];

function normalizeSrc(src) {
  return src.split('?')[0].replace(/^\.\//, '');
}

function htmlFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || ['node_modules', 'archive', 'test-results'].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.html')) out.push(path.relative(ROOT, full).replace(/\\/g, '/'));
    }
  };
  HTML_DIRS.forEach((dir) => walk(path.join(ROOT, dir)));
  return out.sort();
}

function extractScripts(html) {
  const scripts = [];
  const rx = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = rx.exec(html))) scripts.push(normalizeSrc(match[1]));
  return scripts;
}

function indexOf(scripts, src) {
  return scripts.indexOf(src);
}

function ensureBefore(page, scripts, first, second, issues, severity = 'error') {
  const a = indexOf(scripts, first);
  const b = indexOf(scripts, second);
  if (a !== -1 && b !== -1 && a > b) {
    issues.push({ severity, page, type: 'script-order', message: `${first} deve carregar antes de ${second}.`, first, second });
  }
}

function ensureExisting(page, scripts, issues) {
  for (const src of scripts) {
    if (/^(https?:)?\/\//.test(src)) continue;
    if (!src.startsWith('assets/') && !src.startsWith('backend/') && !src.startsWith('src/')) continue;
    const fp = path.join(ROOT, src);
    if (!fs.existsSync(fp)) {
      issues.push({ severity: 'error', page, type: 'missing-script-file', message: `Script referenciado não existe: ${src}`, src });
    }
  }
}

function audit() {
  const pages = [];
  const issues = [];
  const notes = [];

  for (const page of htmlFiles()) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const scripts = extractScripts(html);
    const usesControllerPipeline = scripts.includes('assets/js/controllers/controller-bootstrap.js') || scripts.includes('assets/js/controllers/page-controller-registry.js');
    const expectedController = PAGE_CONTROLLER_BY_HTML[page];
    const dataReadyScripts = scripts.filter((src) => DATA_READY_CHAIN.includes(src) || /data-controller\.js$/.test(src));

    ensureExisting(page, scripts, issues);

    if (usesControllerPipeline) {
      for (let i = 0; i < FOUNDATIONAL_ORDER.length - 1; i += 1) {
        ensureBefore(page, scripts, FOUNDATIONAL_ORDER[i], FOUNDATIONAL_ORDER[i + 1], issues);
      }

      if (expectedController) {
        if (!scripts.includes(expectedController)) {
          issues.push({ severity: 'error', page, type: 'missing-page-controller', message: `Página usa pipeline, mas não carrega controller esperado: ${expectedController}`, expectedController });
        } else {
          ensureBefore(page, scripts, 'assets/js/controllers/page-controller-registry.js', expectedController, issues);
          ensureBefore(page, scripts, expectedController, 'assets/js/controllers/controller-bootstrap.js', issues);
        }
      }

      ensureBefore(page, scripts, 'assets/js/core/page-bootstrap.js', 'assets/js/controllers/controller-bootstrap.js', issues);
      ensureBefore(page, scripts, 'assets/js/controllers/controller-data.js', 'assets/js/controllers/controller-bootstrap.js', issues);

      // Domain data service must load after domain-specific services when both are present.
      for (const svc of SERVICE_ORDER.slice(0, -1)) {
        ensureBefore(page, scripts, svc, 'assets/js/services/domain-data-service.js', issues);
      }
    }

    if (dataReadyScripts.length > 0) {
      for (let i = 0; i < DATA_READY_CHAIN.length - 1; i += 1) {
        ensureBefore(page, scripts, DATA_READY_CHAIN[i], DATA_READY_CHAIN[i + 1], issues);
      }
      for (const src of scripts.filter((s) => /data-controller\.js$/.test(s))) {
        ensureBefore(page, scripts, 'assets/js/services/page-data-orchestrator.js', src, issues);
        ensureBefore(page, scripts, 'assets/js/core/list-state.js', src, issues, 'warning');
      }
    } else if (['index.html', 'resultados.html', 'perfil.html', 'pedidos.html', 'comunidade.html', 'comunidade.html', 'carteira.html', 'configuracoes.html', 'notificacoes.html', 'detalhe-anuncio.html'].includes(page)) {
      notes.push({ page, type: 'data-ready-chain-not-installed', message: 'Página relevante ainda não carrega a cadeia data-ready nova; tratar em ciclo próprio antes de renderização dinâmica.' });
    }

    pages.push({
      page,
      scriptCount: scripts.length,
      usesControllerPipeline,
      expectedController: expectedController || null,
      hasExpectedController: expectedController ? scripts.includes(expectedController) : null,
      dataReadyScriptCount: dataReadyScripts.length
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      htmlPages: pages.length,
      controllerPipelinePages: pages.filter((p) => p.usesControllerPipeline).length,
      pagesWithDataReadyChain: pages.filter((p) => p.dataReadyScriptCount > 0).length,
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      notes: notes.length
    },
    pages,
    issues,
    notes
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  if (report.summary.errors > 0) {
    console.error(`Global script order audit failed with ${report.summary.errors} error(s).`);
    console.error(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
    process.exit(1);
  }

  console.log('Global script order audit passed.');
  console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
}

audit();

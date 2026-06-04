#!/usr/bin/env node
/**
 * Stage 63A — Critical CSS Important Inventory
 *
 * Static audit only. It does not modify runtime files.
 * Scans CSS files, ranks remaining !important debt, classifies risk/domain,
 * and suggests the next safe strategy per file.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const cssRoot = path.join(root, 'assets', 'css');
const outDir = path.join(root, 'reports', 'generated');
const outMd = path.join(outDir, 'stage63a-critical-important-inventory.md');
const outJson = path.join(outDir, 'stage63a-critical-important-inventory.json');

const EXCLUDED_PARTS = new Set(['node_modules', '.git', 'archive', 'reports', 'docs', 'test-results']);

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function relative(filePath) {
  return toPosix(path.relative(root, filePath));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_PARTS.has(entry.name)) walk(full, acc);
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      acc.push(full);
    }
  }
  return acc;
}

function countImportant(content) {
  const matches = content.match(/!important\b/g);
  return matches ? matches.length : 0;
}

function countLines(content) {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}

function getDomain(rel) {
  const p = rel.replace(/^assets\/css\//, '');
  if (p.startsWith('components/shell/') || p.includes('/shell/')) return 'shell-global';
  if (p.startsWith('components/navigation/') || p.includes('/navigation/')) return 'navigation-global';
  if (p.startsWith('core/')) return 'core-css';
  if (p.startsWith('components/cards/')) return 'cards-components';
  if (p.startsWith('components/before-after-workers-preview')) return 'workers-publications-viewer';
  if (p.startsWith('components/internal/')) return 'internal-shared-components';
  if (p.startsWith('components/overlays/') || p.includes('modal') || p.includes('lightbox')) return 'overlays-modals';
  if (p.startsWith('components/')) return 'components';
  if (p.startsWith('patterns/')) return 'patterns';
  if (p.startsWith('pages/home') || p.includes('/home-')) return 'home';
  if (p.startsWith('pages/search-results') || p.includes('resultados')) return 'search-results';
  if (p.startsWith('pages/mensagens')) return 'mensagens-chat';
  if (p.startsWith('pages/perfil') || p.includes('profile')) return 'perfil';
  if (p.startsWith('pages/detalhe-anuncio') || p.includes('detail') || p.includes('ad-detail')) return 'detalhe-anuncio';
  if (p.startsWith('pages/pedidos') || p.includes('orders')) return 'pedidos';
  if (p.startsWith('pages/carteira') || p.includes('wallet')) return 'carteira';
  if (p.startsWith('pages/comunidade') || p.includes('community')) return 'comunidade';
  if (p.startsWith('pages/notificacoes')) return 'notificacoes';
  if (p.startsWith('pages/')) return 'pages-other';
  return 'unclassified';
}

function getRisk(rel, domain, importantCount) {
  if (domain === 'shell-global' || domain === 'navigation-global' || domain === 'core-css') return 'critical';
  if (domain === 'home' || domain === 'search-results') return 'critical';
  if (domain === 'detalhe-anuncio' || domain === 'mensagens-chat' || domain === 'perfil') return 'high';
  if (importantCount >= 500) return 'high';
  if (domain === 'workers-publications-viewer' || domain === 'cards-components' || domain === 'internal-shared-components') return 'high';
  if (domain === 'patterns' || domain === 'overlays-modals' || domain === 'carteira' || domain === 'pedidos') return 'medium';
  return 'medium-low';
}

function getStrategy(rel, domain, risk) {
  if (risk === 'critical') {
    return 'nao remover; reduzir internamente com screenshot/Playwright e autoridade unica de importacao';
  }
  if (risk === 'high') {
    return 'nao remover em lote; editar internamente por blocos pequenos, validando paginas afetadas';
  }
  if (risk === 'medium') {
    return 'pode virar microetapa; primeiro mapear links HTML e dependencias de classes';
  }
  return 'candidato a reducao controlada ou consolidacao simples';
}

function affectedPages(domain) {
  const map = {
    'shell-global': ['todas as paginas internas', 'index.html'],
    'navigation-global': ['todas as paginas com header/sidebar/bottom-nav'],
    'core-css': ['todo o site'],
    'home': ['index.html'],
    'search-results': ['resultados.html', 'resultado/resultados.html', 'detalhe-anuncio.html', 'perfil.html', 'mensagens.html'],
    'mensagens-chat': ['mensagens.html', 'comunidade-interna.html'],
    'perfil': ['perfil.html'],
    'detalhe-anuncio': ['detalhe-anuncio.html'],
    'pedidos': ['pedidos.html'],
    'carteira': ['carteira.html'],
    'comunidade': ['comunidade.html', 'comunidade-interna.html'],
    'notificacoes': ['notificacoes.html'],
    'workers-publications-viewer': ['index.html', 'perfil.html', 'detalhe-anuncio.html'],
    'cards-components': ['index.html', 'resultados.html', 'perfil.html', 'detalhe-anuncio.html'],
    'internal-shared-components': ['pedidos.html', 'notificacoes.html', 'mensagens.html'],
    'patterns': ['paginas que usam composicoes compartilhadas'],
    'overlays-modals': ['paginas com modal/lightbox'],
  };
  return map[domain] || ['conferencia por link/import necessario'];
}

function summarizeBy(items, key) {
  const grouped = new Map();
  for (const item of items) {
    const id = item[key];
    if (!grouped.has(id)) grouped.set(id, { count: 0, important: 0, files: [] });
    const bucket = grouped.get(id);
    bucket.count += 1;
    bucket.important += item.importantCount;
    bucket.files.push(item.rel);
  }
  return Array.from(grouped.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.important - a.important || b.count - a.count);
}

function table(rows, headers) {
  if (!rows.length) return '_Nenhum item._\n';
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${headers.map((h) => String(row[h] ?? '').replace(/\n/g, '<br>')).join(' | ')} |`);
  return [head, sep, ...body].join('\n') + '\n';
}

function main() {
  if (!fs.existsSync(cssRoot)) {
    console.error('ERRO: assets/css nao encontrado. Rode na raiz do projeto.');
    process.exit(1);
  }

  const files = walk(cssRoot);
  const items = files.map((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const rel = relative(file);
    const importantCount = countImportant(content);
    const domain = getDomain(rel);
    const risk = getRisk(rel, domain, importantCount);
    return {
      rel,
      domain,
      risk,
      importantCount,
      lines: countLines(content),
      affectedPages: affectedPages(domain),
      strategy: getStrategy(rel, domain, risk),
    };
  }).filter((item) => item.importantCount > 0)
    .sort((a, b) => b.importantCount - a.importantCount || a.rel.localeCompare(b.rel));

  const totalImportant = items.reduce((sum, item) => sum + item.importantCount, 0);
  const byDomain = summarizeBy(items, 'domain');
  const byRisk = summarizeBy(items, 'risk');
  const top = items.slice(0, 40);

  ensureDir(outDir);
  const payload = {
    generatedAt: new Date().toISOString(),
    totals: {
      cssFilesWithImportant: items.length,
      importantOccurrences: totalImportant,
      scannedCssFiles: files.length,
    },
    byRisk,
    byDomain,
    topHotspots: top,
    items,
  };
  fs.writeFileSync(outJson, JSON.stringify(payload, null, 2));

  const md = [];
  md.push('# Stage 63A — Critical CSS Important Inventory');
  md.push('');
  md.push('Auditoria estatica. Esta etapa **nao remove arquivos** e **nao altera CSS runtime**.');
  md.push('');
  md.push(`Gerado em: ${payload.generatedAt}`);
  md.push('');
  md.push('## Totais');
  md.push('');
  md.push(`- CSS files scanned: ${payload.totals.scannedCssFiles}`);
  md.push(`- arquivos com \`!important\`: ${payload.totals.cssFilesWithImportant}`);
  md.push(`- ocorrencias de \`!important\`: ${payload.totals.importantOccurrences}`);
  md.push('');
  md.push('## Resumo por risco');
  md.push('');
  md.push(table(byRisk.map((x) => ({ risco: x.name, arquivos: x.count, important: x.important })), ['risco', 'arquivos', 'important']));
  md.push('## Resumo por dominio');
  md.push('');
  md.push(table(byDomain.map((x) => ({ dominio: x.name, arquivos: x.count, important: x.important })), ['dominio', 'arquivos', 'important']));
  md.push('## Top 40 hotspots');
  md.push('');
  md.push(table(top.map((x) => ({
    arquivo: `\`${x.rel}\``,
    important: x.importantCount,
    risco: x.risk,
    dominio: x.domain,
    estrategia: x.strategy,
  })), ['arquivo', 'important', 'risco', 'dominio', 'estrategia']));
  md.push('## Proxima decisao recomendada');
  md.push('');
  md.push('- Nao remover arquivos classificados como `critical` por delecao direta.');
  md.push('- Para `home` e `search-results`, fazer refatoracao interna com screenshot antes/depois; essas areas ja provaram dependencia visual indireta.');
  md.push('- Priorizar arquivos `high` com muitos `!important`, mas reduzindo regras por bloco, nao removendo o arquivo inteiro.');
  md.push('- Candidatos `medium` podem virar microetapas se nao forem autoridade compartilhada.');
  md.push('');
  md.push('## Inventario completo');
  md.push('');
  for (const item of items) {
    md.push(`### \`${item.rel}\``);
    md.push('');
    md.push(`- dominio: ${item.domain}`);
    md.push(`- risco: ${item.risk}`);
    md.push(`- !important: ${item.importantCount}`);
    md.push(`- linhas: ${item.lines}`);
    md.push(`- paginas para conferir: ${item.affectedPages.join(', ')}`);
    md.push(`- estrategia: ${item.strategy}`);
    md.push('');
  }
  fs.writeFileSync(outMd, md.join('\n'));

  console.log('[Stage 63A] Critical CSS Important Inventory');
  console.log(`CSS files scanned: ${payload.totals.scannedCssFiles}`);
  console.log(`Files with !important: ${payload.totals.cssFilesWithImportant}`);
  console.log(`Important occurrences: ${payload.totals.importantOccurrences}`);
  console.log(`Report: ${relative(outMd)}`);
  console.log(`JSON: ${relative(outJson)}`);
}

main();

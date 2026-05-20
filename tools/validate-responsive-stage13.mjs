#!/usr/bin/env node
/**
 * Stage 13 — safe responsive validation manifest generator.
 *
 * This script intentionally does not open Chromium and does not mutate production files.
 * It verifies that priority HTML files exist and regenerates the Stage 13 matrix used
 * by the visual QA dashboard.
 *
 * For visual checks, run:
 *   node tools/serve-stage13.mjs
 * and open:
 *   http://127.0.0.1:5173/tools/responsive-stage13-dashboard.html
 */
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const pages = [
  'index.html',
  'resultados.html',
  'perfil.html',
  'comunidade.html',
  'comunidade-interna.html',
  'pedidos.html',
  'mensagens.html',
  'notificacoes.html',
  'carteira.html',
  'configuracoes.html',
  'detalhe-anuncio.html',
  'pagamento-profissional.html',
  'avaliacao.html',
  'auth/login.html',
  'auth/cadastro.html',
  'auth/esqueci-senha.html',
];

const breakpoints = [320, 342, 360, 375, 390, 414, 768, 1024, 1366];
const checks = [
  'overflow-x',
  'wide-elements',
  'bottom-nav-overlap',
  'topbar-overlap',
  'small-touch-targets',
  'desktop-regression',
];

function statusFor(page) {
  return fss.existsSync(path.join(rootDir, page)) ? 'pending-dashboard-check' : 'missing-file';
}

const matrix = {
  stage: 13,
  generatedAt: new Date().toISOString(),
  purpose: 'Responsive visual validation before risky cleanup or fine patches.',
  productionFilesChanged: false,
  dashboard: 'tools/responsive-stage13-dashboard.html',
  localServerCommand: 'node tools/serve-stage13.mjs',
  pages,
  breakpoints,
  checks,
  matrix: pages.flatMap((page) => breakpoints.map((breakpoint) => ({
    page,
    breakpoint,
    status: statusFor(page),
  }))),
};

await fs.mkdir(path.join(rootDir, 'docs/validation'), { recursive: true });
await fs.writeFile(
  path.join(rootDir, 'docs/validation/responsive-stage13-matrix.json'),
  JSON.stringify(matrix, null, 2),
  'utf8'
);

const missing = matrix.matrix.filter((item) => item.status === 'missing-file');
const md = [
  '# Stage 13 — Resultado da Matriz Responsiva',
  '',
  `Gerado em: ${matrix.generatedAt}`,
  '',
  `- Páginas previstas: ${pages.length}`,
  `- Breakpoints: ${breakpoints.join(', ')}`,
  `- Combinações de QA: ${pages.length * breakpoints.length}`,
  `- Arquivos ausentes: ${missing.length}`,
  '',
  '## Próximo comando',
  '',
  '```bash',
  'node tools/serve-stage13.mjs',
  '```',
  '',
  'Abrir: `http://127.0.0.1:5173/tools/responsive-stage13-dashboard.html`',
  '',
  '## Observação técnica',
  '',
  'Esta etapa não altera visual de produção. O dashboard deve orientar a Etapa 14 com correções pontuais e escopo controlado.',
  '',
].join('\n');

await fs.writeFile(path.join(rootDir, 'docs/validation/responsive-stage13-result.md'), md, 'utf8');

console.log(`Stage 13 matrix generated: ${pages.length} pages × ${breakpoints.length} breakpoints.`);
if (missing.length) {
  console.warn(`Missing files: ${missing.map((item) => item.page).join(', ')}`);
  process.exitCode = 1;
}

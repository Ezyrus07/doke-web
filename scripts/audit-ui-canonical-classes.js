#!/usr/bin/env node
/*
  Audita se elementos HTML com função visual recorrente declaram classes canônicas .doke-*.
  Não substitui validação visual; serve para impedir regressão estrutural.
*/
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const strict = process.argv.includes('--strict');
const pages = ['index.html','resultados.html','pedidos.html','mensagens.html','comunidade.html','comunidade.html','perfil.html','carteira.html','notificacoes.html','configuracoes.html'];

const issues = [];
const stats = { dokeBtn: 0, dokeIconBtn: 0, dokeCard: 0, dokeField: 0, dokeInput: 0, dokeModal: 0, dokeAvatar: 0, dokeChipBadge: 0 };

function addIssue(file, message) { issues.push({ file, message }); }
function classTokens(cls) { return (cls || '').trim().split(/\s+/).filter(Boolean); }
function has(tokens, name) { return tokens.includes(name); }

for (const page of pages) {
  const file = path.join(root, page);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const re = /<([a-zA-Z][\w:-]*)([^>]*?)\sclass="([^"]*)"/g;
  let match;
  while ((match = re.exec(html))) {
    const tag = match[1].toLowerCase();
    const attrs = match[2] || '';
    const tokens = classTokens(match[3]);
    const cls = tokens.join(' ');

    if (has(tokens, 'doke-btn')) stats.dokeBtn++;
    if (has(tokens, 'doke-icon-btn')) stats.dokeIconBtn++;
    if (has(tokens, 'doke-card')) stats.dokeCard++;
    if (has(tokens, 'doke-field')) stats.dokeField++;
    if (has(tokens, 'doke-input') || has(tokens, 'doke-select') || has(tokens, 'doke-textarea')) stats.dokeInput++;
    if (has(tokens, 'doke-modal') || has(tokens, 'doke-drawer') || has(tokens, 'doke-popover')) stats.dokeModal++;
    if (has(tokens, 'doke-avatar')) stats.dokeAvatar++;
    if (has(tokens, 'doke-chip') || has(tokens, 'doke-badge')) stats.dokeChipBadge++;

    const isActionElement = tag === 'button' || tag === 'a';
    const actionLike = /button|btn|action|cta|toggle|close|dismiss|open|submit|clear/.test(cls);
    if (isActionElement && actionLike && !tokens.some(t => t === 'doke-btn' || t === 'doke-icon-btn' || t === 'doke-chip')) {
      addIssue(page, `Elemento de ação sem contrato canônico: <${tag} class="${cls}">`);
    }

    const cardLike = tokens.some(t => /^[a-z0-9-]+-card(?:--[a-z0-9-]+)?$/.test(t) || ['service-card','worker-card','order-card','profile-card','community-card','wallet-summary-card','wallet-bank-card'].includes(t));
    if (cardLike && !tokens.some(t => t === 'doke-card' || t === 'doke-modal' || t === 'doke-drawer' || t === 'doke-popover')) {
      addIssue(page, `Card/surface sem contrato canônico: class="${cls}"`);
    }

    if ((tag === 'input' || tag === 'select' || tag === 'textarea') && !tokens.some(t => t === 'doke-input' || t === 'doke-select' || t === 'doke-textarea')) {
      addIssue(page, `Controle de formulário sem contrato canônico: <${tag} class="${cls}">`);
    }
  }
}

const lines = [];
lines.push('# Auditoria de classes canônicas UI');
lines.push('');
lines.push(`Gerado em: ${new Date().toISOString()}`);
lines.push('');
lines.push('## Cobertura `.doke-*`');
lines.push('');
for (const [key, value] of Object.entries(stats)) {
  lines.push(`- ${key}: ${value}`);
}
lines.push('');
lines.push(`Violações: ${issues.length}`);
lines.push('');
if (!issues.length) lines.push('Nenhuma violação encontrada.');
else for (const item of issues) lines.push(`- **${item.file}** — ${item.message}`);

const outDir = path.join(root, 'docs/validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'ui-canonical-classes-audit-report.md'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
if (strict && issues.length > 0) process.exit(1);

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const htmlPath = path.join(root, 'perfil.html');
const outDir = path.join(root, 'docs', 'validation');
const outJson = path.join(outDir, 'global-cycle-35-perfil-data-readiness-report.json');
const outMd = path.join(root, 'docs', 'PERFIL-DATA-READINESS-MAP.md');

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

function extractCss(html) {
  const links = [];
  const regex = /<link\b[^>]*>/gi;
  const hrefRe = /href=["']([^"']+)["']/i;
  const relRe = /rel=["']([^"']+)["']/i;
  let m;
  while ((m = regex.exec(html))) {
    const tag = m[0];
    const href = tag.match(hrefRe)?.[1];
    const rel = tag.match(relRe)?.[1] || '';
    if (href && /stylesheet/i.test(rel)) links.push(href.replace(/\?.*$/, ''));
  }
  return links;
}

function extractScripts(html) {
  return [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1].replace(/\?.*$/, ''));
}

function count(regex, text) {
  return (text.match(regex) || []).length;
}

function classifyCss(css) {
  return css.map((href) => {
    let bucket = 'other';
    if (href.includes('/core/')) bucket = 'core';
    else if (href.includes('/components/')) bucket = 'components';
    else if (href.includes('/patterns/')) bucket = 'patterns';
    else if (href.includes('/pages/')) bucket = 'pages';
    const suspicious = /(hotfix|fix|final|stage|refinement|parity|reference|adjustments|redesign)/i.test(href);
    return { href, bucket, suspicious };
  });
}

function getClasses(html, prefix) {
  const classes = [];
  const classRe = /class=["']([^"']+)["']/gi;
  let m;
  while ((m = classRe.exec(html))) {
    m[1].split(/\s+/).forEach((cls) => {
      if (cls.startsWith(prefix)) classes.push(cls);
    });
  }
  return unique(classes).sort();
}

function getDataHooks(html) {
  return unique([...html.matchAll(/\b(data-[a-z0-9-]+)(?:=|\s|>)/gi)].map((m) => m[1])).sort();
}

const html = read(htmlPath);
if (!html) {
  console.error('perfil.html not found.');
  process.exit(1);
}

const css = extractCss(html);
const scripts = extractScripts(html);
const cssClassified = classifyCss(css);
const dataHooks = getDataHooks(html);
const profileClasses = getClasses(html, 'profile-');
const dokeClasses = getClasses(html, 'doke-');

const cssStats = cssClassified.reduce((acc, item) => {
  acc[item.bucket] = (acc[item.bucket] || 0) + 1;
  if (item.suspicious) acc.suspicious += 1;
  return acc;
}, { core: 0, components: 0, patterns: 0, pages: 0, other: 0, suspicious: 0 });

const dataAreas = [
  { key: 'identity', label: 'Identidade do perfil', current: /profile-name|profile-avatar|profile-meta/.test(html), needs: ['userId', 'displayName', 'avatarUrl', 'headline', 'category', 'location', 'verified'] },
  { key: 'stats', label: 'Métricas do perfil', current: /profile-stats|followers|following|rating/.test(html), needs: ['rating', 'reviewCount', 'followersCount', 'servicesCount', 'completedOrders'] },
  { key: 'tabs', label: 'Abas/áreas do perfil', current: /profile-tabs|profile-panel/.test(html), needs: ['activeTab', 'availableTabs', 'visibilityByRole'] },
  { key: 'services', label: 'Serviços/anúncios', current: /service-card|ad-card/.test(html), needs: ['services[]', 'favoriteState', 'price', 'availability', 'category'] },
  { key: 'workers', label: 'Workers/vídeos curtos', current: /worker-card|worker-preview|before-after/.test(html), needs: ['workers[]', 'videoUrl', 'thumbnail', 'likes', 'comments', 'duration'] },
  { key: 'publications', label: 'Publicações', current: /publication|post-card/.test(html), needs: ['publications[]', 'type', 'media', 'author', 'engagement'] },
  { key: 'reviews', label: 'Avaliações', current: /review|rating/.test(html), needs: ['reviews[]', 'scoreBreakdown', 'verifiedClient', 'createdAt'] },
  { key: 'ownerActions', label: 'Ações owner/visitor/client', current: /profile-actions|profile-options|data-profile/.test(html), needs: ['viewerRole', 'permissions', 'canEdit', 'canMessage', 'canRequestBudget'] },
  { key: 'modals', label: 'Modais do perfil', current: /profile-edit-modal|followers-modal|budget-modal/.test(html), needs: ['modalState', 'formDraft', 'validationErrors', 'submitStatus'] },
];

const jsAreas = scripts.map((src) => ({
  src,
  role: src.includes('/core/') ? 'core' : src.includes('/services/') ? 'service' : src.includes('/controllers/') ? 'controller' : src.includes('/features/profile/') ? 'feature/profile' : src.includes('/pages/perfil') ? 'page/perfil' : src.includes('/pages/home/') ? 'cross-page-home' : 'other',
  suspiciousCrossPage: src.includes('/pages/home/') || src.includes('/pages/search-data'),
}));

const report = {
  page: 'perfil.html',
  status: 'map-only-no-visual-change',
  summary: {
    cssCount: css.length,
    jsCount: scripts.length,
    inlineStyleCount: count(/\bstyle=["']/gi, html),
    dataHookCount: dataHooks.length,
    profileClassCount: profileClasses.length,
    dokeClassCount: dokeClasses.length,
    suspiciousCssCount: cssStats.suspicious,
  },
  cssStats,
  css: cssClassified,
  js: jsAreas,
  dataHooks,
  dataAreas,
  recommendations: [
    'Não refatorar visual do perfil antes de congelar baseline por modo: owner, visitor e client.',
    'Preparar data-hooks por área antes de renderização real via JS/backend.',
    'Separar controller de página de renderers de cards, workers, publicações e avaliações.',
    'Evitar transformar regras atuais de mobile/public-profile em contrato global antes da validação visual.',
    'Reduzir dependência cruzada de scripts de home dentro do perfil apenas depois de mapear Workers/publicações compartilhados.'
  ]
};

const md = `# Perfil — Data-readiness Map\n\n` +
`Este relatório mapeia o \`perfil.html\` para futura integração com dados reais, sem alterar visual, HTML ou CSS da página.\n\n` +
`## Resumo\n\n` +
`- CSS carregados: **${report.summary.cssCount}**\n` +
`- JS carregados: **${report.summary.jsCount}**\n` +
`- \`style=\"\"\` inline: **${report.summary.inlineStyleCount}**\n` +
`- Data-hooks atuais: **${report.summary.dataHookCount}**\n` +
`- Classes \`profile-*\`: **${report.summary.profileClassCount}**\n` +
`- CSS com nomes sensíveis/legados: **${report.summary.suspiciousCssCount}**\n\n` +
`## Leitura técnica\n\n` +
`O perfil é uma das páginas mais críticas do Doke. Ele combina identidade, owner/visitor/client, abas, serviços, Workers, publicações, avaliações, modais e ações de orçamento/mensagem. Por isso, a integração com dados deve ser feita por camadas e sem redesenho acidental.\n\n` +
`## Áreas de dados esperadas\n\n` +
report.dataAreas.map((area) => `### ${area.label}\n- Detectado no HTML atual: **${area.current ? 'sim' : 'não'}**\n- Dados futuros: ${area.needs.map((x) => `\`${x}\``).join(', ')}\n`).join('\n') +
`\n## JS atual por responsabilidade\n\n` +
report.js.map((item) => `- \`${item.src}\` — ${item.role}${item.suspiciousCrossPage ? ' ⚠️ dependência cruzada a revisar' : ''}`).join('\n') +
`\n\n## CSS por camada\n\n` +
`- Core: **${cssStats.core}**\n` +
`- Components: **${cssStats.components}**\n` +
`- Patterns: **${cssStats.patterns}**\n` +
`- Pages: **${cssStats.pages}**\n` +
`- Outros: **${cssStats.other}**\n` +
`- Suspeitos/legados: **${cssStats.suspicious}**\n\n` +
`## Recomendações\n\n` +
report.recommendations.map((x) => `- ${x}`).join('\n') +
`\n\n## Critérios para próxima fase\n\n` +
`- Não alterar aparência do perfil sem baseline visual aprovado.\n` +
`- Adicionar data-hooks somente onde não alteram CSS nem layout.\n` +
`- Não remover scripts de home usados por Workers/publicações antes de criar componente compartilhado.\n` +
`- Não consolidar o CSS mobile atual como contrato definitivo sem validação de screenshots.\n` +
`- Separar renderização de dados do comportamento de UI.\n`;

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.dirname(outMd), { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(outMd, md);
console.log('Perfil data-readiness audit passed.');
console.log(`Report: ${path.relative(root, outJson)}`);

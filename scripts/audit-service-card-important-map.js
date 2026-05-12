#!/usr/bin/env node
/*
 * Maps the remaining !important usage in the service card contract.
 * This is intentionally an audit/map, not an automatic remover.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const cssPath = path.join(root, 'assets/css/components/cards/service-card.css');
const outJson = path.join(root, 'docs/validation/global-cycle-20-service-card-important-map.json');
const outMd = path.join(root, 'docs/GLOBAL-CYCLE-20-SERVICE-CARD-IMPORTANT-MAP.md');

if (!fs.existsSync(cssPath)) {
  console.error(`Missing ${path.relative(root, cssPath)}`);
  process.exit(1);
}

const css = fs.readFileSync(cssPath, 'utf8');
const lines = css.split(/\r?\n/);

function nearestSelector(index) {
  for (let i = index; i >= 0; i -= 1) {
    const line = lines[i].trim();
    if (!line || line.startsWith('/*')) continue;
    if (line.endsWith('{')) return line.slice(0, -1).trim();
  }
  return 'unknown';
}

function propName(line) {
  const m = line.trim().match(/^([\w-]+)\s*:/);
  return m ? m[1] : 'unknown';
}

function classify(selector, property, line) {
  const full = `${selector} ${property} ${line}`;
  if (full.includes('service-card__avatar')) {
    return {
      bucket: 'avatar-lock',
      risk: 'medium',
      recommendation: 'Do not remove blindly. First migrate avatar sizing to the global .doke-avatar contract or confirm no legacy avatar.css override wins.'
    };
  }
  if (full.includes('@media') || full.includes('grid-template') || full.includes('grid-template-areas')) {
    return {
      bucket: 'layout-grid',
      risk: 'high',
      recommendation: 'Keep until page-level card grids are verified in index, resultados and perfil with screenshots.'
    };
  }
  if (selector.includes('.service-card__media') || ['height', 'min-height', 'width', 'padding', 'border-radius', 'background-size', 'background-position'].includes(property)) {
    return {
      bucket: 'media-sizing',
      risk: 'high',
      recommendation: 'Keep until service media dimensions are owned by the component contract and tested in all card contexts.'
    };
  }
  if (selector.includes('.service-card__body') || selector.includes('.service-card__footer')) {
    return {
      bucket: 'body-footer-rhythm',
      risk: 'medium-high',
      recommendation: 'Remove only after confirming the card body/footer rhythm is not overridden by home/search/profile CSS.'
    };
  }
  if (selector.includes('.service-card__rating') || selector.includes('.service-card__meta-row') || selector.includes('.service-card__tags')) {
    return {
      bucket: 'micro-layout',
      risk: 'medium',
      recommendation: 'Candidate for next controlled removal if visual parity is validated.'
    };
  }
  return {
    bucket: 'unclassified',
    risk: 'medium',
    recommendation: 'Review manually before removal.'
  };
}

const items = [];
lines.forEach((line, index) => {
  if (!line.includes('!important')) return;
  const selector = nearestSelector(index);
  const property = propName(line);
  const meta = classify(selector, property, line);
  items.push({
    line: index + 1,
    selector,
    property,
    declaration: line.trim(),
    ...meta
  });
});

const byBucket = items.reduce((acc, item) => {
  acc[item.bucket] = (acc[item.bucket] || 0) + 1;
  return acc;
}, {});

const byRisk = items.reduce((acc, item) => {
  acc[item.risk] = (acc[item.risk] || 0) + 1;
  return acc;
}, {});

const report = {
  file: 'assets/css/components/cards/service-card.css',
  totalImportant: items.length,
  byBucket,
  byRisk,
  nextSafeRecommendation: 'Do not remove another large group yet. The remaining declarations mostly protect avatar locks and desktop/mobile layout. Next safe action is to migrate avatar sizing into the global avatar contract or validate screenshots before removing micro-layout declarations.',
  items
};

fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);

const rows = items.map((item) => `| ${item.line} | \`${item.property}\` | ${item.bucket} | ${item.risk} | \`${item.selector.replace(/\|/g, '\\|')}\` |`).join('\n');
const md = `# Ciclo Global 20 — Mapa dos \`!important\` restantes no service-card

Este ciclo não removeu CSS. O objetivo foi mapear os próximos riscos antes de mexer novamente no card de serviço.

## Resultado

- Arquivo auditado: \`${report.file}\`
- \`!important\` restantes: **${report.totalImportant}**

## Distribuição por bucket

${Object.entries(byBucket).map(([bucket, count]) => `- ${bucket}: ${count}`).join('\n')}

## Distribuição por risco

${Object.entries(byRisk).map(([risk, count]) => `- ${risk}: ${count}`).join('\n')}

## Decisão técnica

Não é seguro remover em massa os próximos \`!important\` do \`service-card.css\` sem validação visual. A maior parte restante protege:

- travas de avatar;
- altura/largura da mídia;
- grid desktop/mobile;
- ritmo do body/footer.

## Próximo passo recomendado

1. Migrar sizing de avatar para o contrato global \`.doke-avatar\`, ou validar que \`avatar.css\` legado não compete mais.
2. Depois, remover um pequeno grupo de \`!important\` de micro-layout com screenshot antes/depois.
3. Não mexer ainda nos grids desktop/mobile do service-card sem validação de \`index\`, \`resultados\` e \`perfil\`.

## Itens mapeados

| Linha | Propriedade | Bucket | Risco | Seletor |
|---:|---|---|---|---|
${rows}
`;
fs.writeFileSync(outMd, md);

console.log(`Service-card important map generated: ${items.length} declarations.`);

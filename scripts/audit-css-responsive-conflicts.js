#!/usr/bin/env node
/*
 * Doke CSS responsive conflict mapper.
 * Static audit: finds repeated selectors for shared responsive/card/header rails
 * with conflicting geometry/anatomy properties across CSS layers.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CSS_ROOT = path.join(ROOT, 'assets', 'css');
const REPORT_DIR = path.join(ROOT, 'reports');

const TARGETS = [
  '.app-header',
  '.app-header__inner',
  '.home-side-meta__profile',
  '.home-side-meta__location',
  '.publication-card',
  '.doke-ad-card',
  '.video-card',
  '.service-card',
  '.doke-reviews-panel',
  '.page__content-inner',
  '.shell-home__workspace',
  '.ad-detail-shell',
  '.profile-shell-content'
];

const CANONICAL = {
  '.app-header': 'assets/css/components/shell/app-header-canonical-contract.css',
  '.app-header__inner': 'assets/css/components/shell/app-header-canonical-contract.css',
  '.home-side-meta__profile': 'assets/css/components/shell/app-header-canonical-contract.css',
  '.home-side-meta__location': 'assets/css/components/shell/app-header-canonical-contract.css',
  '.publication-card': 'assets/css/components/cards/publication-card.css + assets/css/components/cards/marketplace-card-contract.css',
  '.doke-ad-card': 'assets/css/components/cards/ad-card.css + assets/css/components/cards/marketplace-card-contract.css',
  '.video-card': 'assets/css/components/cards/worker-card.css + assets/css/components/cards/marketplace-card-contract.css',
  '.service-card': 'assets/css/components/cards/service-card.css + assets/css/components/cards/marketplace-card-contract.css',
  '.doke-reviews-panel': 'assets/css/components/cards/review-card.css ou assets/css/patterns/reviews-section.css se for composição de seção',
  '.page__content-inner': 'assets/css/components/shell/shared-page-width-contract.css',
  '.shell-home__workspace': 'assets/css/components/shell/shared-page-width-contract.css',
  '.ad-detail-shell': 'assets/css/components/shell/shared-page-width-contract.css',
  '.profile-shell-content': 'assets/css/components/shell/shared-page-width-contract.css'
};

const RESPONSIVE_PROPS = new Set([
  'display','position','inset','top','right','bottom','left','z-index',
  'width','inline-size','min-width','max-width','min-inline-size','max-inline-size',
  'height','block-size','min-height','max-height','min-block-size','max-block-size',
  'aspect-ratio','padding','padding-top','padding-right','padding-bottom','padding-left','padding-inline','padding-block',
  'margin','margin-top','margin-right','margin-bottom','margin-left','margin-inline','margin-block',
  'gap','row-gap','column-gap','grid-template-columns','grid-template-rows','grid-auto-columns','grid-auto-rows',
  'flex','flex-basis','flex-grow','flex-shrink','align-items','justify-content','place-items',
  'border','border-radius','box-shadow','overflow','overflow-x','overflow-y',
  'font','font-size','font-weight','line-height','letter-spacing','white-space','text-overflow',
  'object-fit','object-position','background','background-color','transform'
]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.css')) out.push(full);
  }
  return out;
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, m => ' '.repeat(m.length));
}

function lineOf(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function parseDeclarations(block) {
  const decls = [];
  const re = /([\w-]+)\s*:\s*([^;{}]+);/g;
  let m;
  while ((m = re.exec(block))) {
    const prop = m[1].trim().toLowerCase();
    const value = m[2].trim().replace(/\s+/g, ' ');
    if (RESPONSIVE_PROPS.has(prop)) decls.push({ prop, value });
  }
  return decls;
}

function parseRules(css, relFile) {
  const stripped = stripComments(css);
  const rules = [];
  const stack = [];
  let i = 0;
  while (i < stripped.length) {
    const open = stripped.indexOf('{', i);
    if (open === -1) break;
    const pre = stripped.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < stripped.length && depth > 0) {
      if (stripped[j] === '{') depth++;
      else if (stripped[j] === '}') depth--;
      j++;
    }
    const body = stripped.slice(open + 1, j - 1);
    const selector = pre.split('}').pop().trim();
    if (!selector) { i = j; continue; }
    if (selector.startsWith('@')) {
      // Shallow parse nested rules inside at-rules with context label.
      const inner = parseRules(body, relFile).map(r => ({ ...r, context: [selector, r.context].filter(Boolean).join(' / ') }));
      rules.push(...inner);
    } else {
      const decls = parseDeclarations(body);
      if (decls.length) {
        rules.push({ selector, declarations: decls, line: lineOf(stripped, open), file: relFile, context: '' });
      }
    }
    i = j;
  }
  return rules;
}

function selectorTargets(selector) {
  return TARGETS.filter(target => selector.includes(target));
}

function normalizeValue(value) {
  return value.replace(/\s*!important\s*$/i, '').trim().replace(/\s+/g, ' ');
}

function layerOf(file) {
  if (file.startsWith('assets/css/pages/')) return 'pages';
  if (file.startsWith('assets/css/patterns/')) return 'patterns';
  if (file.startsWith('assets/css/components/shell/')) return 'components/shell';
  if (file.startsWith('assets/css/components/cards/')) return 'components/cards';
  if (file.startsWith('assets/css/components/')) return 'components';
  if (file.startsWith('assets/css/core/')) return 'core';
  return 'other';
}

function recommendation(target, file, prop) {
  const layer = layerOf(file);
  const canonical = CANONICAL[target] || 'componente canônico correspondente';
  if (layer === 'pages') {
    return `Remover/neutralizar ${prop} de ${file}; página deve consumir tokens/contrato em ${canonical}.`;
  }
  if (layer === 'patterns') {
    return `Manter só composição externa em ${file}; mover anatomia ${prop} para ${canonical}.`;
  }
  if (layer === 'components/shell' && !canonical.includes(file)) {
    return `Consolidar ${prop} em ${canonical}; ${file} deve parar de redefinir contrato equivalente.`;
  }
  if (layer === 'components/cards' && !canonical.includes(file)) {
    return `Revisar duplicação de ${prop}; anatomia compartilhada deve ficar em ${canonical}.`;
  }
  return `Verificar se ${prop} é contrato primário; se não for, remover duplicação.`;
}

function ensureReports() { fs.mkdirSync(REPORT_DIR, { recursive: true }); }

const files = walk(CSS_ROOT).map(f => path.relative(ROOT, f).replace(/\\/g, '/')).sort();
const records = [];

for (const rel of files) {
  const full = path.join(ROOT, rel);
  const css = fs.readFileSync(full, 'utf8');
  const rules = parseRules(css, rel);
  for (const rule of rules) {
    const targets = selectorTargets(rule.selector);
    if (!targets.length) continue;
    for (const target of targets) {
      for (const decl of rule.declarations) {
        records.push({
          class: target,
          file: rel,
          layer: layerOf(rel),
          line: rule.line,
          context: rule.context,
          selector: rule.selector.replace(/\s+/g, ' '),
          property: decl.prop,
          value: decl.value,
          normalizedValue: normalizeValue(decl.value),
          canonicalFile: CANONICAL[target] || '',
          recommendation: recommendation(target, rel, decl.prop)
        });
      }
    }
  }
}

const conflicts = [];
for (const target of TARGETS) {
  const targetRecords = records.filter(r => r.class === target);
  const props = [...new Set(targetRecords.map(r => r.property))].sort();
  for (const prop of props) {
    const propRecords = targetRecords.filter(r => r.property === prop);
    const values = [...new Set(propRecords.map(r => r.normalizedValue))];
    const filesForProp = [...new Set(propRecords.map(r => r.file))];
    if (values.length > 1 && filesForProp.length > 1) {
      conflicts.push({
        class: target,
        property: prop,
        canonicalFile: CANONICAL[target] || '',
        filesCount: filesForProp.length,
        valuesCount: values.length,
        files: filesForProp,
        values: values.map(value => ({
          value,
          files: [...new Set(propRecords.filter(r => r.normalizedValue === value).map(r => r.file))]
        })),
        pageSpecificRecords: propRecords.filter(r => r.layer === 'pages'),
        patternRecords: propRecords.filter(r => r.layer === 'patterns'),
        removableOrNeutralizable: propRecords
          .filter(r => ['pages', 'patterns'].includes(r.layer) || (r.layer === 'components/shell' && !r.canonicalFile.includes(r.file)))
          .slice(0, 20)
          .map(r => ({ file: r.file, line: r.line, selector: r.selector, value: r.value, recommendation: r.recommendation }))
      });
    }
  }
}

const byClass = TARGETS.map(target => {
  const targetRecords = records.filter(r => r.class === target);
  return {
    class: target,
    canonicalFile: CANONICAL[target] || '',
    definitions: targetRecords.length,
    files: [...new Set(targetRecords.map(r => r.file))].sort(),
    properties: [...new Set(targetRecords.map(r => r.property))].sort(),
    conflicts: conflicts.filter(c => c.class === target).length
  };
});

const topFiles = Object.entries(records.reduce((acc, r) => {
  acc[r.file] = (acc[r.file] || 0) + 1;
  return acc;
}, {})).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([file, count]) => ({ file, count, layer: layerOf(file) }));

const payload = {
  generatedAt: new Date().toISOString(),
  scannedCssFiles: files.length,
  targetClasses: TARGETS,
  totalDefinitions: records.length,
  totalConflictingClassProperties: conflicts.length,
  byClass,
  topFiles,
  conflicts,
  records
};

function csvEscape(v) { return `"${String(v ?? '').replace(/"/g, '""')}"`; }
function writeCsv(file, rows) {
  const headers = ['class','property','canonicalFile','filesCount','valuesCount','files','conflictingValues','removableOrNeutralizable'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      r.class,
      r.property,
      r.canonicalFile,
      r.filesCount,
      r.valuesCount,
      r.files.join(' | '),
      r.values.map(v => `${v.value} => ${v.files.join(' | ')}`).join('\n'),
      r.removableOrNeutralizable.map(x => `${x.file}:${x.line} ${x.recommendation}`).join('\n')
    ].map(csvEscape).join(','));
  }
  fs.writeFileSync(path.join(REPORT_DIR, file), lines.join('\n'));
}

function mdTable(rows, headers) {
  const lines = [];
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of rows) lines.push(`| ${headers.map(h => String(row[h] ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>')).join(' | ')} |`);
  return lines.join('\n');
}

function writeMd() {
  const summaryRows = byClass.map(c => ({
    classe: c.class,
    arquivos: c.files.length,
    definicoes: c.definitions,
    conflitos: c.conflicts,
    canonico: c.canonicalFile
  }));
  const topConflictRows = conflicts.slice(0, 120).map(c => ({
    classe: c.class,
    propriedade: c.property,
    arquivos: c.filesCount,
    valores: c.valuesCount,
    canonico: c.canonicalFile,
    remover_ou_neutralizar: c.removableOrNeutralizable.slice(0, 4).map(x => `${x.file}:${x.line}`).join('<br>')
  }));
  const topFileRows = topFiles.map(f => ({ arquivo: f.file, camada: f.layer, definicoes: f.count }));
  const content = `# Doke — Relatório de conflitos CSS responsivos\n\n` +
    `Gerado em: ${payload.generatedAt}\n\n` +
    `## Resumo\n\n` +
    `- Arquivos CSS varridos: **${payload.scannedCssFiles}**\n` +
    `- Definições encontradas nas classes alvo: **${payload.totalDefinitions}**\n` +
    `- Pares classe/propriedade com valores conflitantes: **${payload.totalConflictingClassProperties}**\n\n` +
    `## Classes e arquivos canônicos\n\n${mdTable(summaryRows, ['classe','arquivos','definicoes','conflitos','canonico'])}\n\n` +
    `## Arquivos com mais redefinições nas classes alvo\n\n${mdTable(topFileRows, ['arquivo','camada','definicoes'])}\n\n` +
    `## Principais conflitos\n\n${mdTable(topConflictRows, ['classe','propriedade','arquivos','valores','canonico','remover_ou_neutralizar'])}\n\n` +
    `## Regra de decisão\n\n` +
    `- Header compartilhado pertence a \`components/shell/app-header-canonical-contract.css\`.\n` +
    `- Cards compartilhados pertencem a \`components/cards/*\` e ao contrato \`marketplace-card-contract.css\`.\n` +
    `- Rails/containers pertencem a \`components/shell/shared-page-width-contract.css\`.\n` +
    `- CSS em \`pages\` pode controlar composição externa, mas não deve redefinir anatomia/rail compartilhado.\n`;
  fs.writeFileSync(path.join(REPORT_DIR, 'css-responsive-conflicts-report.md'), content);
}

ensureReports();
fs.writeFileSync(path.join(REPORT_DIR, 'css-responsive-conflicts-report.json'), JSON.stringify(payload, null, 2));
writeCsv('css-responsive-conflicts-report.csv', conflicts);
writeMd();

console.log(`CSS responsive conflicts audit complete.`);
console.log(`CSS files scanned: ${payload.scannedCssFiles}`);
console.log(`Definitions: ${payload.totalDefinitions}`);
console.log(`Conflicting class/property pairs: ${payload.totalConflictingClassProperties}`);
console.log(`Reports: reports/css-responsive-conflicts-report.{md,csv,json}`);

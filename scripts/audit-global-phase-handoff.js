#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, 'docs/validation/global-cycle-144-global-phase-handoff-report.json');
const handoffPath = path.join(ROOT, 'docs/GLOBAL-PHASE-FINAL-HANDOFF.md');
const requiredSections = [
  '## Status',
  '## O que está pronto',
  '## Pendências globais conhecidas',
  '## Guardrails para a Fase Desktop',
  '## Próximo passo recomendado'
];

const exists = fs.existsSync(handoffPath);
const text = exists ? fs.readFileSync(handoffPath, 'utf8') : '';
const missingSections = requiredSections.filter((section) => !text.includes(section));
const forbiddenClaims = [
  'responsivo concluído',
  'desktop concluído',
  'sem dívida técnica',
  'globais 100% concluídos'
];
const forbiddenHits = forbiddenClaims.filter((claim) => text.toLowerCase().includes(claim));

const report = {
  cycle: 144,
  name: 'global phase handoff',
  generatedAt: new Date().toISOString(),
  handoffPath: 'docs/GLOBAL-PHASE-FINAL-HANDOFF.md',
  exists,
  missingSections,
  forbiddenHits,
  status: !exists || missingSections.length || forbiddenHits.length ? 'failed' : 'passed',
  note: 'Ensures the final handoff is explicit and does not overclaim completion.'
};

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
if (report.status !== 'passed') {
  console.error('[global-phase-handoff] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[global-phase-handoff] passed');
